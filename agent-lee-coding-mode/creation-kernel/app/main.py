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

# === AGENT LEE CREATION KERNEL 3D EXTENSION V13.2 ===
# This extension makes 3D asset support part of the existing Creation Kernel.
# It does not claim neural 3D readiness unless a real backend is installed and wired.

from typing import Optional as _AgentLeeOptional
from pathlib import Path as _AgentLeePath
import traceback as _agentlee_traceback

try:
    import trimesh as _agentlee_trimesh
    _AGENTLEE_TRIMESH_READY = True
    _AGENTLEE_TRIMESH_ERROR = ""
except Exception as _e:
    _agentlee_trimesh = None
    _AGENTLEE_TRIMESH_READY = False
    _AGENTLEE_TRIMESH_ERROR = str(_e)

class AgentLee3DReconstructRequest(BaseModel):
    input_image: _AgentLeeOptional[str] = None
    prompt: _AgentLeeOptional[str] = None
    output_name: _AgentLeeOptional[str] = None
    export_format: str = "glb"
    target_profile: str = "game_engine_general"
    target_poly_count: int = 50000
    remesh: bool = True

class AgentLee3DValidateRequest(BaseModel):
    asset_path: str
    target_profile: str = "game_engine_general"

def _agentlee_3d_backend_status():
    markers = {
        "triposr": ["/models/TripoSR", "/models/triposr", "/opt/TripoSR", "/app/TripoSR"],
        "instantmesh": ["/models/InstantMesh", "/models/instantmesh", "/opt/InstantMesh", "/app/InstantMesh"],
        "unique3d": ["/models/Unique3D", "/models/unique3d", "/opt/Unique3D", "/app/Unique3D"]
    }

    found = {}
    for name, paths in markers.items():
        found[name] = any(_AgentLeePath(p).exists() for p in paths)

    neural_ready = found["triposr"] or found["instantmesh"] or found["unique3d"]

    return {
        "trimesh_ready": _AGENTLEE_TRIMESH_READY,
        "trimesh_error": _AGENTLEE_TRIMESH_ERROR,
        "triposr_present": found["triposr"],
        "instantmesh_present": found["instantmesh"],
        "unique3d_present": found["unique3d"],
        "neural_backend_ready": neural_ready,
        "truth": "3D is part of Creation Kernel. Neural reconstruction requires a real local backend; no fake GLB/OBJ is returned."
    }

def _agentlee_validate_asset_file(path: str, target_profile: str):
    if not _AGENTLEE_TRIMESH_READY:
        return {
            "status": "BLOCKED",
            "error": "trimesh is not available",
            "detail": _AGENTLEE_TRIMESH_ERROR
        }

    p = _AgentLeePath(path)

    if not p.exists():
        return {
            "status": "BLOCKED",
            "error": f"asset does not exist: {path}"
        }

    try:
        mesh_or_scene = _agentlee_trimesh.load(str(p), force=None)

        vertex_count = 0
        face_count = 0
        geometry_count = 0

        if isinstance(mesh_or_scene, _agentlee_trimesh.Scene):
            geometry_count = len(mesh_or_scene.geometry)
            for g in mesh_or_scene.geometry.values():
                if hasattr(g, "vertices"):
                    vertex_count += len(g.vertices)
                if hasattr(g, "faces"):
                    face_count += len(g.faces)
        else:
            geometry_count = 1
            vertex_count = len(mesh_or_scene.vertices) if hasattr(mesh_or_scene, "vertices") else 0
            face_count = len(mesh_or_scene.faces) if hasattr(mesh_or_scene, "faces") else 0

        file_size = p.stat().st_size

        status = "READY" if file_size > 1000 and (vertex_count > 0 or geometry_count > 0) else "BLOCKED"

        return {
            "status": status,
            "asset_path": str(p),
            "target_profile": target_profile,
            "file_size_bytes": file_size,
            "geometry_count": geometry_count,
            "vertex_count": vertex_count,
            "face_count": face_count,
            "truth": "Validated as a loadable 3D asset if READY. This is separate from neural reconstruction proof."
        }
    except Exception as e:
        return {
            "status": "BLOCKED",
            "asset_path": str(p),
            "target_profile": target_profile,
            "error": str(e),
            "detail": _agentlee_traceback.format_exc()
        }

@app.get("/3d/status")
def agentlee_3d_status():
    return {
        "status": "READY",
        "kernel": "agent-lee-creation-kernel",
        "lane": "3d_assets_inside_creation_kernel",
        "port": 8094,
        "backend": _agentlee_3d_backend_status(),
        "profiles": ["roblox", "unity", "unreal", "webxr", "game_engine_general"],
        "truth": "3D routes are merged into the Creation Kernel. Neural 3D is READY only when a real backend is installed and wired."
    }

@app.get("/3d/profiles")
def agentlee_3d_profiles():
    return {
        "status": "READY",
        "profiles": {
            "roblox": {
                "preferred_assets": ["obj", "fbx", "glb via conversion/import workflow"],
                "requirements": ["clean scale", "separate textures/materials where possible", "validate in Roblox Studio"]
            },
            "unity": {
                "preferred_assets": ["fbx", "glb", "obj"],
                "requirements": ["PBR materials", "reasonable polygon count", "normalized scale"]
            },
            "unreal": {
                "preferred_assets": ["fbx", "glb"],
                "requirements": ["PBR materials", "collision/LOD recommended", "clean normals"]
            },
            "webxr": {
                "preferred_assets": ["glb", "gltf"],
                "requirements": ["small file size", "optimized mesh", "embedded textures"]
            },
            "game_engine_general": {
                "preferred_assets": ["glb", "obj", "fbx"],
                "requirements": ["valid geometry", "validated scale", "receipt-backed output"]
            }
        }
    }

@app.post("/3d/validate-game-asset")
def agentlee_3d_validate_game_asset(req: AgentLee3DValidateRequest):
    return _agentlee_validate_asset_file(req.asset_path, req.target_profile)

@app.post("/3d/reconstruct")
def agentlee_3d_reconstruct(req: AgentLee3DReconstructRequest):
    backend = _agentlee_3d_backend_status()

    if not backend["neural_backend_ready"]:
        return JSONResponse(
            status_code=501,
            content={
                "status": "BLOCKED",
                "kernel": "agent-lee-creation-kernel",
                "lane": "3d_assets_inside_creation_kernel",
                "message": "No neural image-to-3D backend installed/wired inside Creation Kernel.",
                "backend": backend,
                "input_image": req.input_image,
                "prompt": req.prompt,
                "target_profile": req.target_profile,
                "truth": "No fake neural 3D asset returned. Install/wire TripoSR, InstantMesh, Unique3D, or another backend inside Creation Kernel."
            }
        )

    return JSONResponse(
        status_code=501,
        content={
            "status": "BLOCKED",
            "kernel": "agent-lee-creation-kernel",
            "lane": "3d_assets_inside_creation_kernel",
            "message": "Neural backend marker detected but runner is not wired yet.",
            "backend": backend,
            "truth": "Backend runner must write a real GLB/OBJ/FBX before 3D reconstruction can be marked READY."
        }
    )

# === END AGENT LEE CREATION KERNEL 3D EXTENSION V13.2 ===
