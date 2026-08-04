import base64
import io
import json
import os
import platform
import time
import traceback
from pathlib import Path
from typing import Optional

import torch
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image

APP_STARTED_AT = time.time()

MODEL_ID = os.environ.get("MODEL_ID", "stabilityai/sdxl-turbo")
DEVICE_MODE = os.environ.get("DEVICE", "auto").lower()
OPTIMIZATION_PROFILE = os.environ.get("OPTIMIZATION_PROFILE", "PI_SAFE").upper()
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/outputs"))
MODEL_CACHE_DIR = Path(os.environ.get("MODEL_CACHE_DIR", "/models"))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Agent Lee Creation Kernel", version="1.0.0")

pipe = None
pipe_loaded = False
pipe_error = ""
resolved_device = "unknown"
resolved_dtype = "unknown"

def choose_device():
    if DEVICE_MODE == "cuda":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if DEVICE_MODE == "cpu":
        return "cpu"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"

def optimize_settings(width: int, height: int, steps: int):
    if OPTIMIZATION_PROFILE == "PI_SAFE":
        width = min(width, 512)
        height = min(height, 512)
        steps = min(max(steps, 1), 1)
    else:
        width = min(width, 768)
        height = min(height, 768)
        steps = min(max(steps, 1), 4)
    return width, height, steps

def load_pipeline():
    global pipe, pipe_loaded, pipe_error, resolved_device, resolved_dtype

    if pipe_loaded and pipe is not None:
        return pipe

    try:
        from diffusers import AutoPipelineForText2Image

        resolved_device = choose_device()

        if resolved_device == "cuda":
            dtype = torch.float16
            resolved_dtype = "float16"
        else:
            dtype = torch.float32
            resolved_dtype = "float32"

        pipe = AutoPipelineForText2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
            cache_dir=str(MODEL_CACHE_DIR),
            local_files_only=False
        )

        pipe = pipe.to(resolved_device)

        try:
            pipe.set_progress_bar_config(disable=True)
        except Exception:
            pass

        pipe_loaded = True
        pipe_error = ""
        return pipe

    except Exception as e:
        pipe_loaded = False
        pipe_error = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        raise

class GenerateRequest(BaseModel):
    prompt: str
    outputPath: Optional[str] = None
    width: int = 512
    height: int = 512
    steps: int = 1
    guidance_scale: float = 0.0
    seed: Optional[int] = None
    return_base64: bool = False

@app.get("/health")
def health():
    return {
        "status": "READY",
        "kernel": "agent-lee-creation-kernel",
        "model_id": MODEL_ID,
        "device_mode": DEVICE_MODE,
        "resolved_device": choose_device(),
        "optimization_profile": OPTIMIZATION_PROFILE,
        "uptime_seconds": round(time.time() - APP_STARTED_AT, 3),
    }

@app.get("/status")
def status():
    return {
        "status": "READY" if pipe_loaded else "MODEL_NOT_LOADED_YET",
        "kernel": "agent-lee-creation-kernel",
        "model_id": MODEL_ID,
        "device_mode": DEVICE_MODE,
        "resolved_device": resolved_device if resolved_device != "unknown" else choose_device(),
        "resolved_dtype": resolved_dtype,
        "pipe_loaded": pipe_loaded,
        "pipe_error": pipe_error,
        "optimization_profile": OPTIMIZATION_PROFILE,
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "python": platform.python_version(),
    }

@app.post("/warmup")
def warmup():
    start = time.time()
    try:
        load_pipeline()
        return {
            "status": "READY",
            "message": "pipeline_loaded",
            "elapsed_seconds": round(time.time() - start, 3),
            "model_id": MODEL_ID,
            "device": resolved_device,
            "dtype": resolved_dtype,
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "BLOCKED",
                "message": "pipeline_load_failed",
                "error": str(e),
                "detail": pipe_error,
                "elapsed_seconds": round(time.time() - start, 3),
            },
        )

@app.post("/image/generate")
def image_generate(req: GenerateRequest):
    start = time.time()

    if not req.prompt or not req.prompt.strip():
        return JSONResponse(
            status_code=400,
            content={"status": "BLOCKED", "error": "prompt_required"},
        )

    width, height, steps = optimize_settings(req.width, req.height, req.steps)

    try:
        p = load_pipeline()

        generator = None
        if req.seed is not None:
            generator = torch.Generator(device=resolved_device).manual_seed(int(req.seed))

        image = p(
            prompt=req.prompt,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=req.guidance_scale,
            generator=generator,
        ).images[0]

        stamp = time.strftime("%Y%m%d-%H%M%S")
        out_path = req.outputPath

        if not out_path:
            safe_name = f"agent-lee-image-{stamp}.png"
            out_path = str(OUTPUT_DIR / safe_name)

        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        image.save(str(out))

        payload = {
            "status": "READY",
            "kernel": "agent-lee-creation-kernel",
            "model_id": MODEL_ID,
            "prompt": req.prompt,
            "path": str(out),
            "outputPath": str(out),
            "width": width,
            "height": height,
            "steps": steps,
            "guidance_scale": req.guidance_scale,
            "device": resolved_device,
            "dtype": resolved_dtype,
            "elapsed_seconds": round(time.time() - start, 3),
            "truth": "real pixels generated by local creation kernel",
        }

        if req.return_base64:
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            payload["image_base64"] = base64.b64encode(buf.getvalue()).decode("utf-8")

        return payload

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "BLOCKED",
                "kernel": "agent-lee-creation-kernel",
                "model_id": MODEL_ID,
                "prompt": req.prompt,
                "error": str(e),
                "detail": traceback.format_exc(),
                "elapsed_seconds": round(time.time() - start, 3),
                "truth": "no fake image returned",
            },
        )

@app.post("/generate")
def generate_alias(req: GenerateRequest):
    return image_generate(req)

@app.post("/image/img2img")
def image_to_image_not_enabled():
    return JSONResponse(
        status_code=501,
        content={
            "status": "BLOCKED",
            "message": "img2img not enabled in v1",
            "truth": "text-to-image kernel is active; Qwen3-VL director-to-prompt integration should call /image/generate first",
        },
    )
