import base64
import json
import os
import re
import time
import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, List

import requests
import torch
from diffusers import DiffusionPipeline
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field


APP_NAME = "agent-lee-tiny-sd-image-lane"
MODEL_ID = os.environ.get("AGENT_LEE_IMAGE_MODEL", "segmind/tiny-sd")
ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
HF_HOME = os.environ.get("HF_HOME", "/models/huggingface")
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://leeway_ollama:11434")
QWEN_BRAIN_MODEL = os.environ.get("AGENT_LEE_QWEN_BRAIN_MODEL", "qwen3:latest")
QWEN_VISION_MODEL = os.environ.get("AGENT_LEE_QWEN_VISION_MODEL", "qwen2.5vl:7b")
QWEN_MODEL = QWEN_VISION_MODEL
ENABLE_QWEN_REFINE = os.environ.get("AGENT_LEE_ENABLE_QWEN_REFINE", "1") == "1"
ENABLE_QWEN_REVIEW = os.environ.get("AGENT_LEE_ENABLE_QWEN_REVIEW", "1") == "1"

ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME, version="1.1.0-anatomy-contract")

PIPE = None
PIPE_LOADED_AT = None
LOAD_ERROR = None



AGENT_LEE_TINY_SD_HELPER_POLICY = """
I am Agent Lee. I speak in first person.

When planning for Tiny-SD:
- I help Tiny-SD first instead of only rejecting it.
- I convert complex subjects into simple visual anchors.
- I use concrete visual words, not poetic abstract language.
- I prefer known visual forms Tiny-SD can understand, such as:
  anthropomorphic dog-headed warrior,
  werewolf warrior,
  bat-like dragon wings,
  visible dragon tail,
  front-facing character sheet,
  plain background,
  full body visible.
- I separate roles:
  Tiny-SD can produce a draft or thumbnail.
  A stronger model is needed for final complex anatomy if Tiny-SD fails.
- I must be honest about risk.
- I must never claim a weak image is correct if it lacks the required body, dog head, dragon wings, or dragon tail.
"""

DEFAULT_NEGATIVE_PROMPT = (
    "blurry, low quality, low resolution, distorted, malformed, bad anatomy, extra limbs, "
    "missing limbs, fused limbs, missing torso, missing arms, missing legs, no visible body, "
    "amorphous monster, vague beast, creature blob, pile of scales, hunched shapeless creature, "
    "unclear silhouette, cropped body, close up only, head only, no face, hidden face, "
    "watermark, text, logo, duplicate body, multiple characters"
)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    negative_prompt: str = DEFAULT_NEGATIVE_PROMPT
    width: int = 512
    height: int = 512
    steps: int = 12
    guidance_scale: float = 8.0
    seed: Optional[int] = None
    use_qwen_refine: bool = True
    use_qwen_review: bool = True
    retry_if_weak: bool = True
    candidates: int = 2
    job_id: Optional[str] = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def cuda_status() -> Dict[str, Any]:
    data = {
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cuda_device_name": None,
    }

    if torch.cuda.is_available():
        try:
            data["cuda_device_name"] = torch.cuda.get_device_name(0)
            data["cuda_memory_allocated_mb"] = round(torch.cuda.memory_allocated(0) / 1024 / 1024, 2)
            data["cuda_memory_reserved_mb"] = round(torch.cuda.memory_reserved(0) / 1024 / 1024, 2)
        except Exception as exc:
            data["cuda_device_name"] = f"ERROR: {exc}"

    return data


def resolve_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


def clamp_generation_request(req: GenerateRequest) -> GenerateRequest:
    req.width = int(max(384, min(req.width, 768)))
    req.height = int(max(384, min(req.height, 768)))
    req.steps = int(max(4, min(req.steps, 30)))
    req.guidance_scale = float(max(1.0, min(req.guidance_scale, 14.0)))
    req.candidates = int(max(1, min(req.candidates, 4)))
    return req


def load_pipe():
    global PIPE, PIPE_LOADED_AT, LOAD_ERROR

    if PIPE is not None:
        return PIPE

    LOAD_ERROR = None
    device = resolve_device()

    try:
        dtype = torch.float16 if device == "cuda" else torch.float32

        pipe = DiffusionPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            cache_dir=HF_HOME,
            safety_checker=None,
            requires_safety_checker=False,
        )

        if device == "cuda":
            pipe = pipe.to("cuda")

            try:
                pipe.enable_attention_slicing()
            except Exception:
                pass

            try:
                pipe.enable_vae_slicing()
            except Exception:
                pass
        else:
            pipe = pipe.to("cpu")

        PIPE = pipe
        PIPE_LOADED_AT = now_iso()
        return PIPE

    except Exception as exc:
        LOAD_ERROR = str(exc)
        raise


def call_ollama_text(prompt: str, timeout: int = 75) -> Optional[str]:
    try:
        payload = {
            "model": QWEN_BRAIN_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.15,
                "num_predict": 600
            }
        }

        r = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=timeout)

        if r.status_code != 200:
            return None

        data = r.json()
        return (data.get("response") or "").strip()
    except Exception:
        return None


def call_ollama_image_review(original_prompt: str, final_prompt: str, image_path: Path, timeout: int = 120) -> Optional[str]:
    try:
        b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")

        review_prompt = f"""
You are Agent Lee's STRICT visual quality inspector.

Original user request:
{original_prompt}

Final image prompt used:
{final_prompt}

Inspect the attached generated image.

Grade against this checklist:
1. Is there one clear full-body humanoid male figure?
2. Is the figure upright or heroically posed?
3. Are the torso, arms, and legs visible?
4. Is there a clear dog/canine head or dog facial identity?
5. Are dragon traits clear, such as wings, horns, scales, claws, or tail?
6. Is the subject NOT just a vague monster, beast pile, amorphous shape, or dark creature blob?
7. Does the result visibly combine man + dog + dragon?

Return JSON only. No markdown fences.

Required JSON:
{{
  "score": 0-10,
  "matches_request": true/false,
  "has_full_humanoid_body": true/false,
  "has_visible_torso_arms_legs": true/false,
  "has_dog_head_or_face": true/false,
  "has_dragon_wings_or_tail": true/false,
  "is_vague_monster_blob": true/false,
  "main_issues": ["..."],
  "retry_prompt": "A stricter improved prompt if score is under 8.5, otherwise empty"
}}
"""

        payload = {
            "model": QWEN_MODEL,
            "prompt": review_prompt,
            "images": [b64],
            "stream": False,
            "options": {
                "temperature": 0.05,
                "num_predict": 700
            }
        }

        r = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=timeout)

        if r.status_code != 200:
            return None

        data = r.json()
        return (data.get("response") or "").strip()
    except Exception:
        return None


def extract_json_object(text: Optional[str]) -> Optional[Dict[str, Any]]:
    if not text:
        return None

    cleaned = text.strip()
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start >= 0 and end > start:
            return json.loads(cleaned[start:end+1])
    except Exception:
        return None

    return None


def parse_review_score(review: Optional[str]) -> Optional[float]:
    obj = extract_json_object(review)

    if not obj:
        return None

    score = obj.get("score")

    if isinstance(score, (int, float)):
        return float(score)

    return None


def parse_retry_prompt(review: Optional[str]) -> Optional[str]:
    obj = extract_json_object(review)

    if not obj:
        return None

    retry_prompt = obj.get("retry_prompt")

    if isinstance(retry_prompt, str) and len(retry_prompt.strip()) > 30:
        return retry_prompt.strip()

    return None


def request_mentions_specific_hybrid(prompt: str) -> bool:
    p = prompt.lower()

    has_human = any(x in p for x in [
        "man", "male", "human", "humanoid", "warrior", "body", "torso", "arms", "legs", "feet"
    ])

    has_dog = any(x in p for x in [
        "dog", "canine", "muzzle", "dog head", "dog face", "ears"
    ])

    has_dragon = any(x in p for x in [
        "dragon", "wings", "dragon wings", "scales", "horns", "claws", "tail"
    ])

    wants_full_body = any(x in p for x in [
        "full-body", "full body", "upright", "standing", "visible torso", "arms", "legs", "feet"
    ])

    return has_human and has_dog and has_dragon and wants_full_body


def build_hard_subject_contract(user_prompt: str) -> str:
    if request_mentions_specific_hybrid(user_prompt):
        return (
            "single character only, full-body front-facing fantasy character design sheet, "
            "anthropomorphic dog-headed human male warrior, standing upright like a man, "
            "human male body with clear torso, chest, waist, two arms, two hands, two legs, and two feet, "
            "head is unmistakably canine: long dog muzzle, black dog nose, dog ears, wolfhound or German shepherd facial identity, "
            "large bat-like dragon wings spread wide from the back, not feather angel wings, "
            "visible dragon tail behind the legs, dragon horns, dragon scales on shoulders and forearms, clawed gauntlets, "
            "plain light gray background, bright rim lighting, full body visible from head to feet, not cropped, "
            "readable silhouette, symmetrical standing pose, concept art character turnaround style"
        )

    return ""


def refine_prompt(user_prompt: str) -> str:
    hard_contract = build_hard_subject_contract(user_prompt)

    if hard_contract:
        base_instruction = f"""
I am Agent Lee. I am the Qwen3 reasoning brain for my local Tiny-SD image lane. I speak as Agent Lee in first person. I do not talk about Agent Lee as a separate person. I plan the image request, write literal anatomy-safe prompts for Tiny-SD, and decide how to help Tiny-SD succeed. I do not generate pixels. I do not give up immediately. If a request is complex, I simplify it into Tiny-SD-friendly visual anchors, then mark whether the result should be treated as draft-only or final-quality.

The user wants a specific hybrid. You must preserve exact anatomy.
Do NOT turn it into a vague monster, beast pile, shadow creature, or ambiguous creature.
The final prompt must make the following visual requirements explicit:

{hard_contract}

User request:
{user_prompt}

Return only one compact image prompt. No explanation. Do not remove any required anatomy. Keep these exact visual anchors explicit: anthropomorphic dog-headed human male warrior, long canine muzzle, dog ears, human torso, arms, hands, legs, feet, bat-like dragon wings, visible dragon tail, dragon scales, horns, clawed gauntlets, front-facing full-body character sheet.
"""
    else:
        base_instruction = f"""
I am Agent Lee. I am the Qwen3 reasoning brain for my local Tiny-SD image lane. I speak as Agent Lee in first person. I do not talk about Agent Lee as a separate person. I plan the image request, write literal anatomy-safe prompts for Tiny-SD, and decide how to help Tiny-SD succeed. I do not generate pixels. I do not give up immediately. If a request is complex, I simplify it into Tiny-SD-friendly visual anchors, then mark whether the result should be treated as draft-only or final-quality.

Rewrite the user's image request into one strong compact prompt for segmind/tiny-sd.
Keep the subject literal and easy to visualize.
Use vivid subject detail, composition, lighting, style, scene, camera angle, and texture.
Avoid vague abstractions.
Return only the final image prompt. No explanation.

User request:
{user_prompt}
"""

    refined = call_ollama_text(base_instruction, timeout=60)

    if refined:
        refined = refined.strip().strip('"').strip("'")
        refined = refined.replace("\n", " ")
        refined = re.sub(r"\s+", " ", refined).strip()

        if len(refined) > 20:
            if hard_contract and "full-body" not in refined.lower():
                refined = hard_contract + ", " + refined
            return refined

    if hard_contract:
        return hard_contract

    return user_prompt


def build_negative_prompt(user_negative: str, original_prompt: str) -> str:
    extra = ""

    if request_mentions_specific_hybrid(original_prompt):
        extra = (
            ", quadruped only, animal only, dragon only, dog only, no human body, "
            "monster mound, giant beast crouching, unclear anatomy, hidden legs, hidden arms, "
            "faceless creature, body obscured by shadows, only head visible, non-humanoid"
        )

    combined = (user_negative or DEFAULT_NEGATIVE_PROMPT) + extra
    return combined

def build_deterministic_retry_prompt(original_prompt: str, previous_prompt: str) -> str:
    hard_contract = build_hard_subject_contract(original_prompt)

    if hard_contract:
        return (
            hard_contract
            + ", make it look like a clear anthropomorphic dog-headed man, not a helmeted human, "
            + "dog muzzle must protrude clearly from the face, dog ears visible, "
            + "dragon wings must be bat-like leather wings, wide and visible on both sides, not bird feathers, "
            + "dragon tail must be visible behind the legs, "
            + "arms and hands must be visible and separated from the wings, "
            + "front view, standing pose, light background, full body not cropped"
        )

    return (
        previous_prompt
        + ", clearer subject, full body visible, readable anatomy, bright lighting, centered composition, sharp silhouette"
    )


def generate_png(
    prompt: str,
    negative_prompt: str,
    width: int,
    height: int,
    steps: int,
    guidance_scale: float,
    seed: Optional[int],
    out_path: Path,
) -> Dict[str, Any]:
    pipe = load_pipe()
    device = resolve_device()

    actual_seed = seed

    if actual_seed is None:
        actual_seed = int(time.time() * 1000) % 2147483647

    if device == "cuda":
        generator = torch.Generator(device="cuda").manual_seed(actual_seed)
    else:
        generator = torch.Generator(device="cpu").manual_seed(actual_seed)

    start = time.time()

    with torch.inference_mode():
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            generator=generator,
        )

    image = result.images[0]
    image.save(out_path)

    elapsed = round(time.time() - start, 3)

    return {
        "path": str(out_path),
        "seed": actual_seed,
        "elapsed_seconds": elapsed,
        "device": device,
        "width": width,
        "height": height,
        "steps": steps,
        "guidance_scale": guidance_scale,
    }


def score_candidate(review: Optional[str]) -> float:
    score = parse_review_score(review)

    if score is None:
        return 0.0

    obj = extract_json_object(review) or {}

    penalty = 0.0

    if obj.get("is_vague_monster_blob") is True:
        penalty += 4.0
    if obj.get("has_full_humanoid_body") is False:
        penalty += 2.0
    if obj.get("has_visible_torso_arms_legs") is False:
        penalty += 2.0
    if obj.get("has_dog_head_or_face") is False:
        penalty += 2.0
    if obj.get("has_dragon_wings_or_tail") is False:
        penalty += 2.0

    return max(0.0, float(score) - penalty)


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "model": MODEL_ID,
        "device": resolve_device(),
        "cuda": cuda_status(),
        "pipe_loaded": PIPE is not None,
        "load_error": LOAD_ERROR,
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "1.1.0-anatomy-contract",
        "model": MODEL_ID,
        "active_live_model": "segmind/tiny-sd",
        "sdxl_turbo_live": False,
        "qwen_image_live": False,
        "qwen_role": "qwen3_brain_planner_plus_qwen25vl_vision_reviewer",
        "qwen_brain_role": "first_person_agent_lee_prompt_planner_tiny_sd_helper_router",
        "qwen_vision_role": "generated_image_visual_reviewer",
        "qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_vision_model": QWEN_VISION_MODEL,
        "qwen_model": QWEN_VISION_MODEL,
        "qwen_refine_enabled": ENABLE_QWEN_REFINE,
        "qwen_review_enabled": ENABLE_QWEN_REVIEW,
        "device": resolve_device(),
        "cuda": cuda_status(),
        "pipe_loaded": PIPE is not None,
        "pipe_loaded_at": PIPE_LOADED_AT,
        "load_error": LOAD_ERROR,
        "artifact_root": str(ARTIFACT_ROOT),
        "created_at": now_iso(),
    }


@app.post("/warmup")
def warmup():
    start = time.time()

    try:
        load_pipe()

        return {
            "ok": True,
            "status": "READY",
            "model": MODEL_ID,
            "active_live_model": "segmind/tiny-sd",
            "sdxl_turbo_live": False,
            "device": resolve_device(),
            "elapsed_seconds": round(time.time() - start, 3),
            "created_at": now_iso(),
        }
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "status": "LOAD_FAILED",
                "error": str(exc),
                "device": resolve_device(),
                "created_at": now_iso(),
            }
        )


@app.post("/image/generate")
@app.post("/generate")
def generate(req: GenerateRequest):
    req = clamp_generation_request(req)

    job_id = req.job_id or str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    receipt_path = job_dir / "receipt.json"
    final_path = job_dir / "image.png"

    original_prompt = req.prompt
    final_prompt = original_prompt

    if req.use_qwen_refine:
        final_prompt = refine_prompt(original_prompt)

    negative_prompt = build_negative_prompt(req.negative_prompt, original_prompt)

    candidates: List[Dict[str, Any]] = []

    for idx in range(req.candidates):
        candidate_path = job_dir / f"candidate_{idx + 1}.png"

        candidate_result = generate_png(
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            width=req.width,
            height=req.height,
            steps=req.steps,
            guidance_scale=req.guidance_scale,
            seed=req.seed if idx == 0 else None,
            out_path=candidate_path,
        )

        review = None
        review_score = None
        strict_score = 0.0

        if req.use_qwen_review and ENABLE_QWEN_REVIEW:
            review = call_ollama_image_review(original_prompt, final_prompt, candidate_path)
            review_score = parse_review_score(review)
            strict_score = score_candidate(review)
        else:
            strict_score = 5.0

        candidates.append({
            "index": idx + 1,
            "path": str(candidate_path),
            "prompt": final_prompt,
            "review": review,
            "review_score": review_score,
            "strict_score": strict_score,
            "generation": candidate_result,
        })

    best = sorted(candidates, key=lambda x: x.get("strict_score", 0.0), reverse=True)[0]
    best_path = Path(best["path"])
    shutil.copyfile(best_path, final_path)
    best["generation"]["path"] = str(final_path)

    used_retry = False
    retry_prompt = None
    best_review = best.get("review")
    best_score = best.get("strict_score", 0.0)

    if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 9.5:
        retry_prompt = parse_retry_prompt(best_review)

        if not retry_prompt:
            retry_prompt = build_deterministic_retry_prompt(original_prompt, final_prompt)

        retry_path = job_dir / "candidate_retry.png"

        retry_result = generate_png(
            prompt=retry_prompt,
            negative_prompt=negative_prompt,
            width=req.width,
            height=req.height,
            steps=max(req.steps, 18),
            guidance_scale=max(req.guidance_scale, 9.0),
            seed=None,
            out_path=retry_path,
        )

        retry_review = call_ollama_image_review(original_prompt, retry_prompt, retry_path)
        retry_review_score = parse_review_score(retry_review)
        retry_strict_score = score_candidate(retry_review)

        retry_candidate = {
            "index": "retry",
            "path": str(retry_path),
            "prompt": retry_prompt,
            "review": retry_review,
            "review_score": retry_review_score,
            "strict_score": retry_strict_score,
            "generation": retry_result,
        }

        candidates.append(retry_candidate)

        if retry_strict_score >= best_score:
            final_prompt = retry_prompt
            shutil.copyfile(retry_path, final_path)
            retry_result["path"] = str(final_path)
            best = retry_candidate
            used_retry = True

    receipt = {
        "ok": True,
        "job_id": job_id,
        "app": APP_NAME,
        "version": "1.1.0-anatomy-contract",
        "model": MODEL_ID,
        "active_live_model": "segmind/tiny-sd",
        "sdxl_turbo_live": False,
        "qwen_image_live": False,
        "qwen_role": "qwen3_brain_planner_plus_qwen25vl_vision_reviewer",
        "qwen_brain_role": "first_person_agent_lee_prompt_planner_tiny_sd_helper_router",
        "qwen_vision_role": "generated_image_visual_reviewer",
        "qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_vision_model": QWEN_VISION_MODEL,
        "qwen_model": QWEN_VISION_MODEL,
        "original_prompt": original_prompt,
        "final_prompt": final_prompt,
        "negative_prompt": negative_prompt,
        "required_subject_contract": build_hard_subject_contract(original_prompt),
        "used_qwen_refine": req.use_qwen_refine and ENABLE_QWEN_REFINE,
        "used_qwen_review": req.use_qwen_review and ENABLE_QWEN_REVIEW,
        "used_retry": used_retry,
        "retry_prompt": retry_prompt,
        "selected_candidate": best,
        "all_candidates": candidates,
        "candidate_urls": [f"/artifacts/{job_id}/" + Path(c["path"]).name for c in candidates],
        "image_path": str(final_path),
        "image_url": f"/artifacts/{job_id}/image.png",
        "receipt_path": str(receipt_path),
        "created_at": now_iso(),
    }

    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    return receipt


@app.get("/artifacts/{job_id}/image.png")
def get_image(job_id: str):
    path = ARTIFACT_ROOT / job_id / "image.png"

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "IMAGE_NOT_FOUND"})

    return FileResponse(path, media_type="image/png", filename="agent-lee-tiny-sd-image.png")


@app.get("/artifacts/{job_id}/receipt.json")
def get_receipt(job_id: str):
    path = ARTIFACT_ROOT / job_id / "receipt.json"

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "RECEIPT_NOT_FOUND"})

    return FileResponse(path, media_type="application/json", filename="receipt.json")




@app.get("/artifacts/{job_id}/{filename}")
def get_artifact_file(job_id: str, filename: str):
    safe_name = Path(filename).name

    if safe_name != filename:
        return JSONResponse(status_code=400, content={"ok": False, "error": "INVALID_FILENAME"})

    allowed = safe_name.endswith(".png") or safe_name.endswith(".json")

    if not allowed:
        return JSONResponse(status_code=400, content={"ok": False, "error": "UNSUPPORTED_FILE_TYPE"})

    path = ARTIFACT_ROOT / job_id / safe_name

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "ARTIFACT_NOT_FOUND", "filename": safe_name})

    if safe_name.endswith(".png"):
        return FileResponse(path, media_type="image/png", filename=safe_name)

    return FileResponse(path, media_type="application/json", filename=safe_name)





