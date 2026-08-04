$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$AppRoot = Join-Path $ServiceRoot "app"
$MainPy = Join-Path $AppRoot "main.py"
$Requirements = Join-Path $ServiceRoot "requirements.txt"
$Dockerfile = Join-Path $ServiceRoot "Dockerfile"

$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$ContainerName = "agent-lee-sdxl-lightning-image-lane"

$OldTinyContainer = "agent-lee-tiny-sd-image-lane"

$NetworkName = "leeway-ecosystemv214_leeway-net"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $ServiceRoot | Out-Null
New-Item -ItemType Directory -Force -Path $AppRoot | Out-Null
New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

Write-Host ""
Write-Host "Building Agent Lee SDXL-Lightning Image Lane..." -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Service: $ServiceRoot"
Write-Host "Artifacts: $Artifacts"
Write-Host "Model: ByteDance/SDXL-Lightning 4-step UNet"
Write-Host "Brain: qwen3:latest"
Write-Host "Vision reviewer: qwen2.5vl:7b"
Write-Host "3D lanes: untouched"
Write-Host ""

$RequirementsText = @'
fastapi
uvicorn[standard]
pillow
diffusers
transformers
accelerate
safetensors
huggingface_hub
requests
'@

Set-Content -Path $Requirements -Value $RequirementsText -Encoding UTF8

$DockerfileText = @'
FROM agent-lee-creation-kernel:local

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

COPY app /app/app

ENV AGENT_LEE_APP_NAME=agent-lee-sdxl-lightning-image-lane
ENV AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning
ENV AGENT_LEE_SDXL_BASE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
ENV AGENT_LEE_LIGHTNING_REPO=ByteDance/SDXL-Lightning
ENV AGENT_LEE_LIGHTNING_CKPT=sdxl_lightning_4step_unet.safetensors
ENV AGENT_LEE_LIGHTNING_STEPS=4
ENV AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest
ENV AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts

EXPOSE 8095

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8095"]
'@

Set-Content -Path $Dockerfile -Value $DockerfileText -Encoding UTF8

$MainPyText = @'
import base64
import gc
import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
import torch
from diffusers import StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from huggingface_hub import hf_hub_download
from pydantic import BaseModel, Field
from safetensors.torch import load_file


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-sdxl-lightning-image-lane")

ACTIVE_MODEL = os.environ.get("AGENT_LEE_IMAGE_MODEL", "ByteDance/SDXL-Lightning")
SDXL_BASE_MODEL = os.environ.get("AGENT_LEE_SDXL_BASE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
LIGHTNING_REPO = os.environ.get("AGENT_LEE_LIGHTNING_REPO", "ByteDance/SDXL-Lightning")
LIGHTNING_CKPT = os.environ.get("AGENT_LEE_LIGHTNING_CKPT", "sdxl_lightning_4step_unet.safetensors")
LIGHTNING_STEPS = int(os.environ.get("AGENT_LEE_LIGHTNING_STEPS", "4"))

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://leeway_ollama:11434").rstrip("/")
QWEN_BRAIN_MODEL = os.environ.get("AGENT_LEE_QWEN_BRAIN_MODEL", "qwen3:latest")
QWEN_VISION_MODEL = os.environ.get("AGENT_LEE_QWEN_VISION_MODEL", "qwen2.5vl:7b")

ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

PIPE = None
PIPE_LOADED_AT = None
LOAD_ERROR = None

app = FastAPI(title=APP_NAME)


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    width: int = 1024
    height: int = 1024
    steps: int = 4
    guidance_scale: float = 0.0
    candidates: int = 2
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


def normalize_size(value: int, fallback: int = 1024) -> int:
    try:
        value = int(value)
    except Exception:
        value = fallback

    if value < 512:
        value = 512

    if value > 1024:
        value = 1024

    # SDXL prefers multiples of 64.
    value = int(round(value / 64) * 64)
    return max(512, min(1024, value))


def build_negative_prompt() -> str:
    return (
        "low quality, blurry, low resolution, distorted anatomy, malformed body, "
        "toy, mascot, plush, cartoon toy, chibi, helmeted human, human helmet, "
        "bird wings, feather wings, angel wings, missing dog muzzle, missing canine head, "
        "missing tail, hidden tail, no dragon tail, no wings, extra limbs, fused limbs, "
        "cropped body, head only, torso only, multiple characters, text, watermark, logo"
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
I speak as "I". I do not talk about Agent Lee as another person.

My image generator is SDXL-Lightning 4-step, not Tiny-SD.
My job is to rewrite the user's request into a literal, visual, SDXL-friendly image prompt.

For hybrid creature requests, I must preserve exact anatomy:
- upright human male body
- dog or wolf head with long canine muzzle, black dog nose, dog ears, fur
- dragon wings must be bat-like or leathery, not feather wings
- visible dragon tail behind the legs
- dragon horns, scales, claws
- full body visible

Return JSON only:
{{
  "route": "sdxl_lightning",
  "complexity": "low|medium|high",
  "final_prompt": "...",
  "negative_prompt_additions": "...",
  "quality_contract": {{
    "requires_human_male_body": true,
    "requires_dog_or_wolf_head": true,
    "requires_bat_like_dragon_wings": true,
    "requires_visible_dragon_tail": true,
    "reject_toy_or_mascot_style": true,
    "reject_feather_wings": true
  }}
}}

User request:
{user_prompt}
"""

    raw = ollama_generate(QWEN_BRAIN_MODEL, planner_prompt, timeout=240)
    parsed = extract_json_object(raw)

    if not parsed.get("final_prompt"):
        parsed = {
            "route": "sdxl_lightning",
            "complexity": "high",
            "final_prompt": user_prompt,
            "negative_prompt_additions": "",
            "quality_contract": {
                "requires_human_male_body": True,
                "requires_dog_or_wolf_head": True,
                "requires_bat_like_dragon_wings": True,
                "requires_visible_dragon_tail": True,
                "reject_toy_or_mascot_style": True,
                "reject_feather_wings": True,
            },
            "raw_brain_response": raw,
        }

    return parsed


def image_to_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def qwen25vl_review(original_prompt: str, final_prompt: str, image_path: Path) -> Dict[str, Any]:
    review_prompt = f"""
You are Agent Lee's strict visual quality gate.
Review the generated image against the user's request.

Be strict. Do not pass a weak image.
A pass requires all of these:
1. clear upright human male body
2. clear dog or wolf head, not helmet, not mask, with canine muzzle/dog ears
3. clear bat-like or leathery dragon wings, not feather/angel/bird wings
4. visible dragon tail
5. final image is not toy, mascot, plush, chibi, or childish
6. full body is visible

Return JSON only:
{{
  "score": 0,
  "matches_request": false,
  "has_human_male_body": false,
  "has_dog_or_wolf_head": false,
  "has_bat_like_dragon_wings": false,
  "has_visible_dragon_tail": false,
  "is_toy_or_mascot_style": false,
  "is_feather_wing_style": false,
  "main_issues": [],
  "verdict": "QUALITY_PASS_OR_QUALITY_FAIL"
}}

Original user request:
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

    required_booleans = [
        "matches_request",
        "has_human_male_body",
        "has_dog_or_wolf_head",
        "has_bat_like_dragon_wings",
        "has_visible_dragon_tail",
    ]

    for key in required_booleans:
        if review.get(key) is not True:
            return False

    if review.get("is_toy_or_mascot_style") is True:
        return False

    if review.get("is_feather_wing_style") is True:
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

    if review.get("matches_request") is not True:
        score -= 4

    if review.get("has_human_male_body") is not True:
        score -= 2

    if review.get("has_dog_or_wolf_head") is not True:
        score -= 2

    if review.get("has_bat_like_dragon_wings") is not True:
        score -= 2

    if review.get("has_visible_dragon_tail") is not True:
        score -= 2

    if review.get("is_toy_or_mascot_style") is True:
        score -= 3

    if review.get("is_feather_wing_style") is True:
        score -= 3

    return score


def load_pipe():
    global PIPE, PIPE_LOADED_AT, LOAD_ERROR

    if PIPE is not None:
        return PIPE

    try:
        if DEVICE != "cuda":
            raise RuntimeError("SDXL-Lightning lane requires CUDA for practical local use.")

        unet = UNet2DConditionModel.from_config(SDXL_BASE_MODEL, subfolder="unet").to(DEVICE, DTYPE)
        ckpt_path = hf_hub_download(LIGHTNING_REPO, LIGHTNING_CKPT)
        unet.load_state_dict(load_file(ckpt_path, device=DEVICE))

        pipe = StableDiffusionXLPipeline.from_pretrained(
            SDXL_BASE_MODEL,
            unet=unet,
            torch_dtype=DTYPE,
            variant="fp16",
            use_safetensors=True,
        ).to(DEVICE)

        pipe.scheduler = EulerDiscreteScheduler.from_config(
            pipe.scheduler.config,
            timestep_spacing="trailing",
        )

        pipe.enable_vae_slicing()
        pipe.enable_attention_slicing()

        PIPE = pipe
        PIPE_LOADED_AT = now_iso()
        LOAD_ERROR = None
        return PIPE

    except Exception as e:
        LOAD_ERROR = str(e)
        raise


def generate_one(prompt: str, negative_prompt: str, out_path: Path, width: int, height: int, steps: int, guidance_scale: float, seed: Optional[int]) -> Dict[str, Any]:
    pipe = load_pipe()

    generator = None

    if seed is not None:
        generator = torch.Generator(device=DEVICE).manual_seed(int(seed))

    start = time.time()

    with torch.inference_mode():
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
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
        "steps": steps,
        "guidance_scale": guidance_scale,
    }


@app.get("/health")
def health():
    return {
        "ok": LOAD_ERROR is None,
        "app": APP_NAME,
        "model": ACTIVE_MODEL,
        "base_model": SDXL_BASE_MODEL,
        "lightning_repo": LIGHTNING_REPO,
        "lightning_ckpt": LIGHTNING_CKPT,
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
        "version": "2.0.0-sdxl-lightning",
        "active_live_model": ACTIVE_MODEL,
        "image_generator": "sdxl_lightning_4step_unet",
        "tiny_sd_live": False,
        "sdxl_lightning_live": True,
        "sdxl_turbo_live": False,
        "qwen_image_live": False,
        "qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_brain_role": "first_person_agent_lee_prompt_planner_router",
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


@app.post("/image/generate")
def image_generate(req: ImageGenerateRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    width = normalize_size(req.width, 1024)
    height = normalize_size(req.height, 1024)

    # SDXL-Lightning 4-step checkpoint should use 4 steps and CFG 0.
    steps = LIGHTNING_STEPS
    guidance_scale = 0.0

    brain = qwen3_plan_prompt(req.prompt) if req.use_qwen_brain else {
        "route": "sdxl_lightning",
        "complexity": "unknown",
        "final_prompt": req.prompt,
        "negative_prompt_additions": "",
    }

    final_prompt = brain.get("final_prompt") or req.prompt

    negative_prompt = build_negative_prompt()
    additions = brain.get("negative_prompt_additions") or ""

    if additions:
        negative_prompt = negative_prompt + ", " + additions

    candidates_count = max(1, min(int(req.candidates), 4))
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
            steps=steps,
            guidance_scale=guidance_scale,
            seed=seed,
        )

        review = qwen25vl_review(req.prompt, final_prompt, out_path) if req.use_qwen_review else {
            "score": 0,
            "matches_request": None,
            "verdict": "REVIEW_DISABLED",
        }

        score = candidate_score(review) if req.use_qwen_review else 0

        candidate = {
            "index": index,
            "path": str(out_path),
            "url": f"/artifacts/{job_id}/candidate_{index}.png",
            "prompt": final_prompt,
            "generation": generation,
            "review": review,
            "strict_score": score,
            "quality_pass": review_passes(review) if req.use_qwen_review else None,
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
        "version": "2.0.0-sdxl-lightning",
        "active_live_model": ACTIVE_MODEL,
        "image_generator": "ByteDance/SDXL-Lightning",
        "sdxl_base_model": SDXL_BASE_MODEL,
        "lightning_ckpt": LIGHTNING_CKPT,
        "tiny_sd_live": False,
        "sdxl_turbo_live": False,
        "qwen_image_live": False,
        "qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_vision_model": QWEN_VISION_MODEL,
        "original_prompt": req.prompt,
        "brain_plan": brain,
        "final_prompt": final_prompt,
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
                "clear upright human male body",
                "clear dog or wolf head with canine muzzle",
                "bat-like or leathery dragon wings, not feather wings",
                "visible dragon tail",
                "not toy or mascot style",
                "full body visible",
            ],
            "final_review": final_review,
        },
        "three_d_lanes_touched": False,
        "created_at": now_iso(),
    }

    receipt_file = job_dir / "receipt.json"
    receipt_file.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    # Free transient CUDA cache; keep model loaded.
    gc.collect()

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    return receipt


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
'@

Set-Content -Path $MainPy -Value $MainPyText -Encoding UTF8

Write-Host "Retiring Tiny-SD live container if present..." -ForegroundColor Yellow

$TinyExisting = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $OldTinyContainer }

if ($TinyExisting) {
  docker rm -f $OldTinyContainer | Out-Null
  Write-Host "Retired container: $OldTinyContainer" -ForegroundColor Green
}
else {
  Write-Host "Tiny-SD container not present. Nothing to retire." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "Building Docker image: $ImageName" -ForegroundColor Cyan
docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

Write-Host ""
Write-Host "Starting SDXL-Lightning image lane..." -ForegroundColor Cyan

docker run -d `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "8099:8095" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning" `
  -e "AGENT_LEE_SDXL_BASE_MODEL=stabilityai/stable-diffusion-xl-base-1.0" `
  -e "AGENT_LEE_LIGHTNING_REPO=ByteDance/SDXL-Lightning" `
  -e "AGENT_LEE_LIGHTNING_CKPT=sdxl_lightning_4step_unet.safetensors" `
  -e "AGENT_LEE_LIGHTNING_STEPS=4" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest" `
  -e "AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b" `
  $ImageName | Out-Null

Start-Sleep -Seconds 5

$Health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/health" -TimeoutSec 30
$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_SDXL_LIGHTNING_IMAGE_LANE_BUILT_AND_RUNNING"
  no_image_generation_performed_during_setup = $true
  old_tiny_sd_container_retired = [bool]$TinyExisting
  service_root = $ServiceRoot
  artifact_root = $Artifacts
  container = $ContainerName
  image = $ImageName
  host_port = 8099
  container_port = 8095
  agent_lee_image_system = @{
    brain = "qwen3:latest"
    router = "image router inside SDXL-Lightning lane"
    generator = "ByteDance/SDXL-Lightning 4-step UNet"
    visual_review = "qwen2.5vl:7b"
    output = "final image or quality-fail receipt"
  }
  three_d_lanes_touched = $false
  health = $Health
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SDXL_LIGHTNING_IMAGE_LANE_BUILD_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee SDXL-Lightning image lane is running." -ForegroundColor Green
Write-Host "Health:   http://127.0.0.1:8099/health" -ForegroundColor Cyan
Write-Host "Status:   http://127.0.0.1:8099/status" -ForegroundColor Cyan
Write-Host "Generate: http://127.0.0.1:8099/image/generate" -ForegroundColor Cyan
Write-Host "Receipt:  $ReceiptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "3D lanes were not touched." -ForegroundColor Yellow