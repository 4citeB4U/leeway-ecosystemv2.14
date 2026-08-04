$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-tiny-sd-image-lane"
$AppDir = Join-Path $ServiceRoot "app"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\tiny-sd-image-lane"
$Proof = Join-Path $Root "Archive\proofs\tiny-sd-image-lane"
$ModelsRoot = Join-Path $Root "models"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$ImageName = "agent-lee-tiny-sd-image-lane:local"
$ContainerName = "agent-lee-tiny-sd-image-lane"
$OldContainerName = "agent-lee-creation-kernel"
$BaseImage = "agent-lee-creation-kernel:local"
$NetworkName = "leeway-ecosystemv214_leeway-net"
$HostPort = 8098
$ContainerPort = 8094

New-Item -ItemType Directory -Force -Path $ServiceRoot, $AppDir, $Artifacts, $Proof, $ModelsRoot | Out-Null

Write-Host ""
Write-Host "Building Agent Lee Tiny-SD Image Lane - Anatomy Contract Upgrade..." -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor DarkCyan
Write-Host "Service: $ServiceRoot" -ForegroundColor DarkCyan
Write-Host "Artifacts: $Artifacts" -ForegroundColor DarkCyan
Write-Host "Model: segmind/tiny-sd" -ForegroundColor DarkCyan
Write-Host "Qwen role: brain, prompt refiner, strict visual reviewer only" -ForegroundColor DarkCyan
Write-Host "SDXL-Turbo live lane: disabled" -ForegroundColor DarkCyan

function Test-DockerImage {
  param([string]$Name)
  $found = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -eq $Name }
  return [bool]$found
}

function Test-DockerContainer {
  param([string]$Name)
  $found = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Name }
  return [bool]$found
}

function Remove-DockerContainerIfExists {
  param([string]$Name)

  if (Test-DockerContainer -Name $Name) {
    Write-Host "Removing existing container: $Name" -ForegroundColor Yellow
    docker rm -f $Name | Out-Null
  }
  else {
    Write-Host "Container not present, skipping removal: $Name" -ForegroundColor DarkGray
  }
}

function Assert-DockerNetwork {
  param([string]$Name)
  $found = docker network ls --format "{{.Name}}" | Where-Object { $_ -eq $Name }

  if (-not $found) {
    throw "Docker network not found: $Name"
  }
}

function Wait-ForHttp {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $lastError = $null

  while ((Get-Date) -lt $deadline) {
    try {
      return Invoke-RestMethod -Method Get -Uri $Url -TimeoutSec 10
    }
    catch {
      $lastError = $_.Exception.Message
      Start-Sleep -Seconds 2
    }
  }

  throw "Timed out waiting for $Url. Last error: $lastError"
}

if (-not (Test-DockerImage -Name $BaseImage)) {
  throw "Base Docker image not found: $BaseImage"
}

Assert-DockerNetwork -Name $NetworkName

@'
import base64
import json
import os
import re
import time
import uuid
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
QWEN_MODEL = os.environ.get("AGENT_LEE_QWEN_VL_MODEL", "qwen2.5vl:7b")
ENABLE_QWEN_REFINE = os.environ.get("AGENT_LEE_ENABLE_QWEN_REFINE", "1") == "1"
ENABLE_QWEN_REVIEW = os.environ.get("AGENT_LEE_ENABLE_QWEN_REVIEW", "1") == "1"

ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME, version="1.1.0-anatomy-contract")

PIPE = None
PIPE_LOADED_AT = None
LOAD_ERROR = None


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
            "model": QWEN_MODEL,
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
    return ("hybrid" in p and "man" in p and "dog" in p and "dragon" in p)


def build_hard_subject_contract(user_prompt: str) -> str:
    if request_mentions_specific_hybrid(user_prompt):
        return (
            "ONE clear full-body humanoid male warrior standing upright in heroic pose, "
            "human male torso with visible chest, shoulders, arms, hands, waist, legs, and feet, "
            "a distinct dog head with canine muzzle, dog ears, and expressive eyes, "
            "large dragon wings spread from his back, dragon horns, dragon scales on shoulders and arms, "
            "dragon tail visible behind him, claws, fantasy armor details, "
            "clear readable silhouette, centered character, full body visible from head to feet, "
            "cinematic fantasy concept art, dramatic lighting, detailed anatomy, sharp focus"
        )

    return ""


def refine_prompt(user_prompt: str) -> str:
    hard_contract = build_hard_subject_contract(user_prompt)

    if hard_contract:
        base_instruction = f"""
You are Agent Lee's image prompt engineer.

The user wants a specific hybrid. You must preserve exact anatomy.
Do NOT turn it into a vague monster, beast pile, shadow creature, or ambiguous creature.
The final prompt must make the following visual requirements explicit:

{hard_contract}

User request:
{user_prompt}

Return only one compact image prompt. No explanation.
"""
    else:
        base_instruction = f"""
You are Agent Lee's image prompt engineer.

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
        "qwen_role": "brain_prompt_refiner_and_strict_visual_reviewer_only",
        "qwen_model": QWEN_MODEL,
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
    best_path.replace(final_path)
    best["generation"]["path"] = str(final_path)

    used_retry = False
    retry_prompt = None
    best_review = best.get("review")
    best_score = best.get("strict_score", 0.0)

    if req.retry_if_weak and req.use_qwen_review and ENABLE_QWEN_REVIEW and best_score < 8.0:
        retry_prompt = parse_retry_prompt(best_review)

        if retry_prompt:
            retry_path = job_dir / "candidate_retry.png"

            retry_result = generate_png(
                prompt=retry_prompt,
                negative_prompt=negative_prompt,
                width=req.width,
                height=req.height,
                steps=max(req.steps, 12),
                guidance_scale=max(req.guidance_scale, 8.0),
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
                retry_path.replace(final_path)
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
        "qwen_role": "brain_prompt_refiner_and_strict_visual_reviewer_only",
        "qwen_model": QWEN_MODEL,
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
'@ | Set-Content -Path (Join-Path $AppDir "main.py") -Encoding UTF8

@'
fastapi==0.115.6
uvicorn[standard]==0.32.1
diffusers==0.31.0
transformers==4.47.1
accelerate==1.2.1
safetensors==0.4.5
pillow==11.0.0
requests==2.32.3
pydantic==2.10.4
sentencepiece==0.2.0
protobuf==5.29.2
'@ | Set-Content -Path (Join-Path $ServiceRoot "requirements.txt") -Encoding UTF8

@'
FROM agent-lee-creation-kernel:local

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

COPY app /app/app

ENV AGENT_LEE_IMAGE_MODEL=segmind/tiny-sd
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts
ENV HF_HOME=/models/huggingface
ENV TRANSFORMERS_CACHE=/models/huggingface
ENV DIFFUSERS_CACHE=/models/huggingface
ENV OLLAMA_BASE_URL=http://leeway_ollama:11434
ENV AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b
ENV AGENT_LEE_ENABLE_QWEN_REFINE=1
ENV AGENT_LEE_ENABLE_QWEN_REVIEW=1

EXPOSE 8094

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8094"]
'@ | Set-Content -Path (Join-Path $ServiceRoot "Dockerfile") -Encoding UTF8

Write-Host ""
Write-Host "Building Docker image: $ImageName" -ForegroundColor Cyan
docker build -t $ImageName $ServiceRoot

Write-Host ""
Write-Host "Removing old live containers safely..." -ForegroundColor Cyan
Remove-DockerContainerIfExists -Name $ContainerName
Remove-DockerContainerIfExists -Name $OldContainerName

Write-Host ""
Write-Host "Starting Tiny-SD image lane..." -ForegroundColor Cyan

docker run -d `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "${HostPort}:${ContainerPort}" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=segmind/tiny-sd" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b" `
  -e "AGENT_LEE_ENABLE_QWEN_REFINE=1" `
  -e "AGENT_LEE_ENABLE_QWEN_REVIEW=1" `
  $ImageName | Out-Null

$Health = Wait-ForHttp -Url "http://127.0.0.1:$HostPort/health" -TimeoutSeconds 90
$Status = Wait-ForHttp -Url "http://127.0.0.1:$HostPort/status" -TimeoutSeconds 90

$Receipt = @{
  verdict = "AGENT_LEE_TINY_SD_IMAGE_LANE_ANATOMY_CONTRACT_BUILT_AND_RUNNING"
  container = $ContainerName
  image = $ImageName
  base_image_used_for_cuda_runtime = $BaseImage
  host_port = $HostPort
  container_port = $ContainerPort
  model = "segmind/tiny-sd"
  active_live_model = "segmind/tiny-sd"
  qwen_role = "brain_prompt_refiner_and_strict_visual_reviewer_only"
  qwen_model = "qwen2.5vl:7b"
  sdxl_turbo_live = $false
  qwen_image_live = $false
  quality_change = "strict anatomy prompt contract, multi-candidate generation, strict Qwen visual checklist, retry if weak"
  health = $Health
  status = $Status
  artifact_root = $Artifacts
  service_root = $ServiceRoot
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TINY_SD_IMAGE_LANE_ANATOMY_CONTRACT_BUILD_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee Tiny-SD anatomy-contract image lane is running." -ForegroundColor Green
Write-Host "Health: http://127.0.0.1:$HostPort/health" -ForegroundColor Cyan
Write-Host "Status: http://127.0.0.1:$HostPort/status" -ForegroundColor Cyan
Write-Host "Generate: http://127.0.0.1:$HostPort/image/generate" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan