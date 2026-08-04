import base64
import gc
import json
import os
import shutil
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
import torch
from diffusers import StableDiffusionXLPipeline, EulerDiscreteScheduler
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-sdxl-lightning-image-lane")

ACTIVE_MODEL = os.environ.get("AGENT_LEE_IMAGE_MODEL", "ByteDance/SDXL-Lightning-LoRA-UltraLowMemory")
SDXL_BASE_MODEL = os.environ.get("AGENT_LEE_SDXL_BASE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
LIGHTNING_REPO = os.environ.get("AGENT_LEE_LIGHTNING_REPO", "ByteDance/SDXL-Lightning")
LIGHTNING_LORA = os.environ.get("AGENT_LEE_LIGHTNING_LORA", "sdxl_lightning_4step_lora.safetensors")
LIGHTNING_STEPS = int(os.environ.get("AGENT_LEE_LIGHTNING_STEPS", "4"))

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://leeway_ollama:11434").rstrip("/")
QWEN_BRAIN_MODEL = os.environ.get("AGENT_LEE_QWEN_BRAIN_MODEL", "qwen3:latest")
QWEN_VISION_MODEL = os.environ.get("AGENT_LEE_QWEN_VISION_MODEL", "qwen2.5vl:7b")

ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
LATEST_JOB_FILE = ARTIFACT_ROOT / "latest_job.json"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

PIPE = None
PIPE_LOADED_AT = None
LOAD_ERROR = None

app = FastAPI(title=APP_NAME)


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    width: int = 512
    height: int = 768
    candidates: int = 1
    seed: Optional[int] = None
    use_qwen_brain: bool = True
    use_qwen_review: bool = True
    strict_review: bool = True


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def cuda_status() -> Dict[str, Any]:
    info = {
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cuda_device_name": None,
        "cuda_memory_allocated_mb": 0.0,
        "cuda_memory_reserved_mb": 0.0,
    }

    if torch.cuda.is_available():
        info["cuda_device_name"] = torch.cuda.get_device_name(0)
        info["cuda_memory_allocated_mb"] = round(torch.cuda.memory_allocated(0) / 1024 / 1024, 2)
        info["cuda_memory_reserved_mb"] = round(torch.cuda.memory_reserved(0) / 1024 / 1024, 2)

    return info


def normalize_size(value: int, fallback: int) -> int:
    try:
        value = int(value)
    except Exception:
        value = fallback

    if value < 512:
        value = 512

    if value > 768:
        value = 768

    value = int(round(value / 64) * 64)
    return max(512, min(768, value))


def compact_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def build_negative_prompt() -> str:
    return compact_spaces(
        "bad anatomy, malformed body, extra limbs, missing limbs, fused limbs, cropped, out of frame, "
        "toy, mascot, plush, chibi, cartoon, helmet, mask, human head, feather wings, angel wings, "
        "bird wings, missing tail, no wings, blurry, low quality, watermark, text, logo"
    )


def handcrafted_compact_prompt(user_prompt: str) -> str:
    lower = user_prompt.lower()

    if ("dog" in lower or "wolf" in lower) and ("dragon" in lower or "wing" in lower):
        return compact_spaces(
            "full body upright dog headed human male warrior, muscular human torso, canine muzzle, dog ears, "
            "fur, two arms and two legs, red leathery dragon wings, visible dragon tail, horns, dark scales, "
            "clawed hands, fantasy armor, plain neutral gray background, clean 3D character model sheet, studio lighting"
        )

    return compact_spaces(
        user_prompt
        + ", full subject visible, clear silhouette, sharp focus, cinematic lighting, premium concept art, highly detailed"
    )


def ollama_generate(model: str, prompt: str, images: Optional[List[str]] = None, timeout: int = 240) -> str:
    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
    }

    if images:
        payload["images"] = images

    response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=timeout)
    response.raise_for_status()
    data = response.json()
    return data.get("response", "")


def extract_json_object(text: str) -> Dict[str, Any]:
    if not text:
        return {}

    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z0-9_-]*", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)

    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return {}

    return {}


def qwen3_plan_prompt(user_prompt: str) -> Dict[str, Any]:
    planner_prompt = f"""
I am Agent Lee. I am the Qwen3 brain for my SDXL-Lightning image lane.

Important SDXL rule:
The final image prompt must be short enough for CLIP. Keep it under 65 words.
Put the most important anatomy first.
Do not write a long cinematic paragraph.
Do not include a long camera list.
Do not include Tiny-SD settings.

For man dog dragon hybrid, preserve:
upright human male body, dog or wolf head, long canine muzzle, dog ears, fur,
red leathery bat-like dragon wings, visible dragon tail, horns, dark scales,
two arms, two legs, full body visible.

Return JSON only:
{{
  "route": "sdxl_lightning",
  "final_prompt_short": "under 65 words, most important anatomy first",
  "negative_prompt_additions": "short comma separated negatives",
  "quality_contract": {{
    "requires_human_male_body": true,
    "requires_dog_or_wolf_head": true,
    "requires_long_canine_muzzle": true,
    "requires_bat_like_dragon_wings": true,
    "requires_visible_dragon_tail": true,
    "reject_toy_or_mascot_style": true,
    "reject_feather_wings": true,
    "reject_helmet_or_mask": true
  }}
}}

User request:
{user_prompt}
"""

    try:
        raw = ollama_generate(QWEN_BRAIN_MODEL, planner_prompt, timeout=240)
        parsed = extract_json_object(raw)
    except Exception as e:
        raw = ""
        parsed = {"brain_error": str(e)}

    final_prompt_short = parsed.get("final_prompt_short") or parsed.get("final_prompt") or ""

    if not final_prompt_short:
        final_prompt_short = handcrafted_compact_prompt(user_prompt)

    parsed["route"] = "sdxl_lightning"
    parsed["raw_brain_response"] = raw
    parsed["final_prompt_short"] = final_prompt_short

    return parsed



def write_latest_job(job_id: str, job_dir: Path) -> None:
    data = {
        "job_id": job_id,
        "job_dir": str(job_dir),
        "image_url": f"/artifacts/{job_id}/image.png",
        "candidate_url": f"/artifacts/{job_id}/candidate_1.png",
        "receipt_url": f"/artifacts/{job_id}/receipt.json",
        "updated_at": now_iso(),
    }
    LATEST_JOB_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_latest_job() -> Dict[str, Any]:
    if not LATEST_JOB_FILE.exists():
        return {}
    try:
        return json.loads(LATEST_JOB_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

def load_pipe():
    global PIPE, PIPE_LOADED_AT, LOAD_ERROR

    if PIPE is not None:
        return PIPE

    try:
        if DEVICE != "cuda":
            raise RuntimeError("SDXL-Lightning lane requires CUDA for practical local use.")

        pipe = StableDiffusionXLPipeline.from_pretrained(
            SDXL_BASE_MODEL,
            torch_dtype=DTYPE,
            variant="fp16",
            use_safetensors=True,
            low_cpu_mem_usage=True,
        )

        pipe.scheduler = EulerDiscreteScheduler.from_config(
            pipe.scheduler.config,
            timestep_spacing="trailing",
        )

        pipe.load_lora_weights(
            LIGHTNING_REPO,
            weight_name=LIGHTNING_LORA,
        )

        pipe.enable_attention_slicing()

        try:
            pipe.vae.enable_slicing()
        except Exception:
            pipe.enable_vae_slicing()

        pipe.enable_model_cpu_offload()

        PIPE = pipe
        PIPE_LOADED_AT = now_iso()
        LOAD_ERROR = None
        return PIPE

    except Exception as e:
        LOAD_ERROR = str(e)
        raise


def fit_prompt_to_tokenizers(pipe, prompt: str, max_length: int = 77) -> str:
    prompt = compact_spaces(prompt)

    tokenizers = []
    if getattr(pipe, "tokenizer", None) is not None:
        tokenizers.append(pipe.tokenizer)
    if getattr(pipe, "tokenizer_2", None) is not None:
        tokenizers.append(pipe.tokenizer_2)

    if not tokenizers:
        words = prompt.split()
        return " ".join(words[:60])

    fitted = prompt

    for tokenizer in tokenizers:
        try:
            ids = tokenizer(
                fitted,
                truncation=True,
                max_length=max_length,
                return_tensors=None,
            )["input_ids"]

            if ids and isinstance(ids[0], list):
                ids = ids[0]

            fitted = tokenizer.decode(
                ids,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )

            fitted = compact_spaces(fitted)
        except Exception:
            words = fitted.split()
            fitted = " ".join(words[:60])

    return fitted


def image_to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def qwen25vl_review(original_prompt: str, final_prompt: str, image_path: Path) -> Dict[str, Any]:
    review_prompt = f"""
You are Agent Lee's strict visual quality gate.

Review the image. Be severe. A weak partial match is a fail.

Pass requires:
1. upright human male body
2. dog or wolf head, not helmet or mask
3. long canine muzzle
4. red or dark leathery dragon wings, not feather wings
5. visible dragon tail
6. full body visible
7. not toy, mascot, plush, or chibi

Return JSON only:
{{
  "score": 0,
  "matches_request": false,
  "has_human_male_body": false,
  "has_dog_or_wolf_head": false,
  "has_long_canine_muzzle": false,
  "has_bat_like_dragon_wings": false,
  "has_visible_dragon_tail": false,
  "is_toy_or_mascot_style": false,
  "is_feather_wing_style": false,
  "is_helmet_or_mask_instead_of_dog_head": false,
  "is_body_cropped_or_hidden": false,
  "main_issues": [],
  "verdict": "QUALITY_PASS_OR_QUALITY_FAIL"
}}

Original request:
{original_prompt}

Generator prompt:
{final_prompt}
"""

    try:
        raw = ollama_generate(QWEN_VISION_MODEL, review_prompt, images=[image_to_base64(image_path)], timeout=360)
        parsed = extract_json_object(raw)

        if not parsed:
            return {
                "score": 0,
                "matches_request": False,
                "verdict": "QUALITY_REVIEW_PARSE_FAIL",
                "raw_review": raw,
            }

        parsed["raw_review"] = raw
        return parsed

    except Exception as e:
        return {
            "score": 0,
            "matches_request": False,
            "verdict": "QUALITY_REVIEW_ERROR",
            "error": str(e),
        }


def review_passes(review: Dict[str, Any]) -> bool:
    if not review:
        return False

    required_true = [
        "matches_request",
        "has_human_male_body",
        "has_dog_or_wolf_head",
        "has_long_canine_muzzle",
        "has_bat_like_dragon_wings",
        "has_visible_dragon_tail",
    ]

    for key in required_true:
        if review.get(key) is not True:
            return False

    if review.get("is_toy_or_mascot_style") is True:
        return False

    if review.get("is_feather_wing_style") is True:
        return False

    if review.get("is_helmet_or_mask_instead_of_dog_head") is True:
        return False

    if review.get("is_body_cropped_or_hidden") is True:
        return False

    try:
        if float(review.get("score", 0)) < 8.0:
            return False
    except Exception:
        return False

    return True


def candidate_score(review: Dict[str, Any]) -> float:
    try:
        score = float(review.get("score", 0))
    except Exception:
        score = 0.0

    penalties = [
        ("matches_request", 4),
        ("has_human_male_body", 2),
        ("has_dog_or_wolf_head", 2),
        ("has_long_canine_muzzle", 2),
        ("has_bat_like_dragon_wings", 2),
        ("has_visible_dragon_tail", 2),
    ]

    for key, penalty in penalties:
        if review.get(key) is not True:
            score -= penalty

    if review.get("is_toy_or_mascot_style") is True:
        score -= 3

    if review.get("is_feather_wing_style") is True:
        score -= 3

    if review.get("is_helmet_or_mask_instead_of_dog_head") is True:
        score -= 3

    if review.get("is_body_cropped_or_hidden") is True:
        score -= 2

    return score


def generate_one(prompt: str, negative_prompt: str, out_path: Path, width: int, height: int, seed: Optional[int]) -> Dict[str, Any]:
    pipe = load_pipe()

    prompt_used = fit_prompt_to_tokenizers(pipe, prompt, 77)
    negative_used = fit_prompt_to_tokenizers(pipe, negative_prompt, 77)

    generator = None
    if seed is not None:
        generator = torch.Generator(device="cpu").manual_seed(int(seed))

    start = time.time()

    with torch.inference_mode():
        image = pipe(
            prompt=prompt_used,
            negative_prompt=negative_used,
            width=width,
            height=height,
            num_inference_steps=LIGHTNING_STEPS,
            guidance_scale=0.0,
            generator=generator,
        ).images[0]

    image.save(out_path)

    elapsed = round(time.time() - start, 3)

    return {
        "path": str(out_path),
        "seed": seed,
        "elapsed_seconds": elapsed,
        "device": DEVICE,
        "width": width,
        "height": height,
        "steps": LIGHTNING_STEPS,
        "guidance_scale": 0.0,
        "prompt_used": prompt_used,
        "negative_prompt_used": negative_used,
    }


@app.get("/health")
def health():
    return {
        "ok": LOAD_ERROR is None,
        "app": APP_NAME,
        "model": ACTIVE_MODEL,
        "base_model": SDXL_BASE_MODEL,
        "lightning_repo": LIGHTNING_REPO,
        "lightning_lora": LIGHTNING_LORA,
        "device": DEVICE,
        "cuda": cuda_status(),
        "pipe_loaded": PIPE is not None,
        "pipe_loaded_at": PIPE_LOADED_AT,
        "load_error": LOAD_ERROR,
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "2.1.2-sdxl-lightning-fast-links",
        "prompt_doctrine": "agent_lee_sdxl_lightning_compact_clip_safe_prompt_doctrine_v2",
        "active_live_model": ACTIVE_MODEL,
        "memory_mode": "ultra_low_memory_cpu_offload",
        "lora_fused": False,
        "whole_pipeline_to_cuda": False,
        "image_generator": "sdxl_lightning_4step_lora_ultra_low_memory_cpu_offload",
        "clip_prompt_limit": "77 tokens per encoder",
        "tiny_sd_live": False,
        "sdxl_lightning_live": True,
        "sdxl_turbo_live": False,
        "qwen_image_live": False,
        "qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_brain_role": "first_person_agent_lee_compact_prompt_planner_router",
        "qwen_vision_model": QWEN_VISION_MODEL,
        "qwen_vision_role": "strict_visual_quality_gate",
        "device": DEVICE,
        "cuda": cuda_status(),
        "pipe_loaded": PIPE is not None,
        "pipe_loaded_at": PIPE_LOADED_AT,
        "load_error": LOAD_ERROR,
        "artifact_root": str(ARTIFACT_ROOT),
        "three_d_lanes_touched": False,
        "created_at": now_iso(),
    }


@app.post("/warmup")
def warmup():
    try:
        load_pipe()
        return {
            "ok": True,
            "app": APP_NAME,
            "pipe_loaded": PIPE is not None,
            "pipe_loaded_at": PIPE_LOADED_AT,
            "cuda": cuda_status(),
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "app": APP_NAME,
                "error": str(e),
                "cuda": cuda_status(),
            },
        )



@app.post("/image/generate-fast")
def image_generate_fast(req: ImageGenerateRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    write_latest_job(job_id, job_dir)

    width = normalize_size(req.width, 512)
    height = normalize_size(req.height, 768)

    final_prompt = handcrafted_compact_prompt(req.prompt)
    negative_prompt = build_negative_prompt()

    out_path = job_dir / "candidate_1.png"
    final_path = job_dir / "image.png"
    receipt_path = job_dir / "receipt.json"

    started_at = now_iso()

    try:
        generation = generate_one(
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            out_path=out_path,
            width=width,
            height=height,
            seed=req.seed,
        )

        shutil.copyfile(out_path, final_path)

        receipt = {
            "ok": True,
            "verdict": "IMAGE_GENERATED_FAST_MODE",
            "job_id": job_id,
            "app": APP_NAME,
            "version": "2.1.2-sdxl-lightning-fast-links",
            "mode": "fast_no_qwen_review",
            "active_live_model": ACTIVE_MODEL,
            "image_generator": "ByteDance/SDXL-Lightning 4-step LoRA",
            "original_prompt": req.prompt,
            "planned_prompt": final_prompt,
            "negative_prompt": negative_prompt,
            "generation": generation,
            "image_path": str(final_path),
            "candidate_path": str(out_path),
            "image_url": f"/artifacts/{job_id}/image.png",
            "candidate_url": f"/artifacts/{job_id}/candidate_1.png",
            "receipt_url": f"/artifacts/{job_id}/receipt.json",
            "latest_image_url": "/latest/image.png",
            "latest_receipt_url": "/latest/receipt.json",
            "qwen_review": "skipped_for_speed",
            "three_d_lanes_touched": False,
            "started_at": started_at,
            "created_at": now_iso(),
        }

        receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return receipt

    except Exception as e:
        error_receipt = {
            "ok": False,
            "verdict": "IMAGE_GENERATION_ERROR",
            "job_id": job_id,
            "app": APP_NAME,
            "version": "2.1.2-sdxl-lightning-fast-links",
            "mode": "fast_no_qwen_review",
            "error": str(e),
            "original_prompt": req.prompt,
            "planned_prompt": final_prompt,
            "image_url": f"/artifacts/{job_id}/image.png",
            "candidate_url": f"/artifacts/{job_id}/candidate_1.png",
            "receipt_url": f"/artifacts/{job_id}/receipt.json",
            "latest_image_url": "/latest/image.png",
            "latest_receipt_url": "/latest/receipt.json",
            "three_d_lanes_touched": False,
            "started_at": started_at,
            "created_at": now_iso(),
        }
        receipt_path.write_text(json.dumps(error_receipt, indent=2), encoding="utf-8")
        return JSONResponse(status_code=500, content=error_receipt)

@app.post("/image/generate")
def image_generate(req: ImageGenerateRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    width = normalize_size(req.width, 512)
    height = normalize_size(req.height, 768)

    if req.use_qwen_brain:
        brain = qwen3_plan_prompt(req.prompt)
    else:
        brain = {
            "route": "sdxl_lightning",
            "final_prompt_short": handcrafted_compact_prompt(req.prompt),
            "negative_prompt_additions": "",
            "quality_contract": {},
        }

    final_prompt = brain.get("final_prompt_short") or handcrafted_compact_prompt(req.prompt)

    negative_prompt = build_negative_prompt()
    additions = brain.get("negative_prompt_additions") or ""
    if additions:
        negative_prompt = compact_spaces(negative_prompt + ", " + additions)

    candidates_count = max(1, min(int(req.candidates), 3))
    candidates: List[Dict[str, Any]] = []

    base_seed = int(req.seed) if req.seed is not None else int(time.time() * 1000) % 2147483647

    best = None
    best_score = -999.0

    for index in range(1, candidates_count + 1):
        seed = base_seed + (index * 9973)
        out_path = job_dir / f"candidate_{index}.png"

        generation = generate_one(
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            out_path=out_path,
            width=width,
            height=height,
            seed=seed,
        )

        # Safe write immediately after generation, before Qwen review.
        # This prevents losing the final image if review or memory fails.
        safe_final_path = job_dir / "image.png"
        shutil.copyfile(out_path, safe_final_path)

        early_receipt = {
            "ok": True,
            "verdict": "IMAGE_GENERATED_REVIEW_PENDING",
            "job_id": job_id,
            "app": APP_NAME,
            "version": "2.1.2-sdxl-lightning-fast-links",
            "active_live_model": ACTIVE_MODEL,
            "image_generator": "ByteDance/SDXL-Lightning 4-step LoRA",
            "original_prompt": req.prompt,
            "planned_prompt": final_prompt,
            "candidate_path": str(out_path),
            "image_path": str(safe_final_path),
            "image_url": f"/artifacts/{job_id}/image.png",
            "candidate_url": f"/artifacts/{job_id}/candidate_{index}.png",
            "generation": generation,
            "review_status": "pending",
            "three_d_lanes_touched": False,
            "created_at": now_iso(),
        }

        (job_dir / "receipt.json").write_text(json.dumps(early_receipt, indent=2), encoding="utf-8")

        prompt_used = generation.get("prompt_used", final_prompt)

        if req.use_qwen_review:
            review = qwen25vl_review(req.prompt, prompt_used, out_path)
            score = candidate_score(review)
            quality_pass = review_passes(review)
        else:
            review = {
                "score": 0,
                "matches_request": None,
                "verdict": "REVIEW_DISABLED",
            }
            score = 0
            quality_pass = None

        candidate = {
            "index": index,
            "path": str(out_path),
            "url": f"/artifacts/{job_id}/candidate_{index}.png",
            "planned_prompt": final_prompt,
            "generation": generation,
            "review": review,
            "strict_score": score,
            "quality_pass": quality_pass,
        }

        candidates.append(candidate)

        if score > best_score:
            best_score = score
            best = candidate

    final_path = job_dir / "image.png"

    if best:
        final_path.write_bytes(Path(best["path"]).read_bytes())

    final_review = best.get("review") if best else {}
    quality_pass = review_passes(final_review) if req.use_qwen_review else True
    verdict = "QUALITY_PASS" if quality_pass else "QUALITY_FAIL"

    receipt = {
        "ok": quality_pass,
        "verdict": verdict,
        "job_id": job_id,
        "app": APP_NAME,
        "version": "2.1.2-sdxl-lightning-fast-links",
        "prompt_doctrine": "agent_lee_sdxl_lightning_compact_clip_safe_prompt_doctrine_v2",
        "active_live_model": ACTIVE_MODEL,
        "memory_mode": "ultra_low_memory_cpu_offload",
        "image_generator": "ByteDance/SDXL-Lightning 4-step LoRA",
        "sdxl_base_model": SDXL_BASE_MODEL,
        "lightning_lora": LIGHTNING_LORA,
        "tiny_sd_live": False,
        "sdxl_turbo_live": False,
        "qwen_image_live": False,
        "qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_vision_model": QWEN_VISION_MODEL,
        "original_prompt": req.prompt,
        "brain_plan": brain,
        "planned_prompt": final_prompt,
        "negative_prompt": negative_prompt,
        "selected_candidate": best,
        "all_candidates": candidates,
        "image_path": str(final_path),
        "image_url": f"/artifacts/{job_id}/image.png",
        "receipt_path": str(job_dir / "receipt.json"),
        "receipt_url": f"/artifacts/{job_id}/receipt.json",
        "candidate_urls": [c["url"] for c in candidates],
        "quality_gate": {
            "required": [
                "upright human male body",
                "dog or wolf head",
                "long canine muzzle",
                "red or dark leathery dragon wings",
                "visible dragon tail",
                "not toy or mascot",
                "not feather wings",
            ],
            "final_review": final_review,
        },
        "three_d_lanes_touched": False,
        "created_at": now_iso(),
    }

    receipt_file = job_dir / "receipt.json"
    receipt_file.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return receipt



@app.get("/latest")
def latest_job():
    data = read_latest_job()
    if not data:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    return data


@app.get("/latest/image.png")
def latest_image():
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    path = ARTIFACT_ROOT / job_id / "image.png"
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_IMAGE_NOT_FOUND", "job_id": job_id})
    return FileResponse(path, media_type="image/png", filename="image.png")


@app.get("/latest/candidate_1.png")
def latest_candidate():
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    path = ARTIFACT_ROOT / job_id / "candidate_1.png"
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_CANDIDATE_NOT_FOUND", "job_id": job_id})
    return FileResponse(path, media_type="image/png", filename="candidate_1.png")


@app.get("/latest/receipt.json")
def latest_receipt():
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    path = ARTIFACT_ROOT / job_id / "receipt.json"
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_RECEIPT_NOT_FOUND", "job_id": job_id})
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




