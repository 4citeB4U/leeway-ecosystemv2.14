import json
import os
import platform
import time
import traceback
from pathlib import Path
from typing import Optional

import trimesh
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

APP_STARTED_AT = time.time()

OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "/outputs"))
INPUT_DIR = Path(os.environ.get("INPUT_DIR", "/inputs"))
MODEL_DIR = Path(os.environ.get("MODEL_DIR", "/models"))
BACKEND_MODE = os.environ.get("BACKEND_MODE", "AUTO")

for d in [OUTPUT_DIR, INPUT_DIR, MODEL_DIR]:
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Agent Lee 3D Game Asset Kernel", version="1.0.0")

class ReconstructRequest(BaseModel):
    input_image: Optional[str] = None
    prompt: Optional[str] = None
    output_name: Optional[str] = None
    export_format: str = "glb"
    target_profile: str = "game_engine_general"
    target_poly_count: int = 50000
    remesh: bool = True

class ValidateRequest(BaseModel):
    asset_path: str
    target_profile: str = "game_engine_general"

def backend_status():
    triposr_markers = [
        "/models/TripoSR",
        "/models/triposr",
        "/opt/TripoSR",
        "/app/TripoSR"
    ]

    instantmesh_markers = [
        "/models/InstantMesh",
        "/models/instantmesh",
        "/opt/InstantMesh",
        "/app/InstantMesh"
    ]

    triposr_present = any(Path(p).exists() for p in triposr_markers)
    instantmesh_present = any(Path(p).exists() for p in instantmesh_markers)

    return {
        "backend_mode": BACKEND_MODE,
        "triposr_present": triposr_present,
        "instantmesh_present": instantmesh_present,
        "neural_backend_ready": triposr_present or instantmesh_present,
        "truth": "Neural Reconstruction READY requires installed TripoSR, InstantMesh, Unique3D, or another real image-to-3D backend. This kernel will not fake neural readiness."
    }

def validate_asset_file(path: str, target_profile: str):
    p = Path(path)

    if not p.exists():
        return {
            "status": "BLOCKED",
            "error": f"asset does not exist: {path}"
        }

    try:
        mesh_or_scene = trimesh.load(str(p), force=None)

        vertex_count = 0
        face_count = 0
        geometry_count = 0

        if isinstance(mesh_or_scene, trimesh.Scene):
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

        game_profile = {
            "roblox": {
                "recommended": "Use FBX/OBJ import path or GLB conversion through Roblox Studio workflow.",
                "note": "Roblox import limits vary by workflow; validate in Studio before publishing."
            },
            "unity": {
                "recommended": "GLB/FBX with PBR material workflow.",
                "note": "Unity accepts FBX natively and GLB through packages or conversion."
            },
            "unreal": {
                "recommended": "FBX/glTF pipeline with collision/LOD setup.",
                "note": "Unreal import should verify scale, normals, and materials."
            },
            "webxr": {
                "recommended": "GLB/glTF 2.0 preferred.",
                "note": "Keep texture and polygon count optimized."
            }
        }

        status = "READY" if file_size > 1000 and (vertex_count > 0 or geometry_count > 0) else "BLOCKED"

        return {
            "status": status,
            "asset_path": str(p),
            "target_profile": target_profile,
            "file_size_bytes": file_size,
            "geometry_count": geometry_count,
            "vertex_count": vertex_count,
            "face_count": face_count,
            "game_profile_guidance": game_profile.get(target_profile.lower(), game_profile["webxr"]),
            "truth": "This validates that the asset is a real loadable 3D asset. It does not claim neural reconstruction unless /reconstruct produced it from a neural backend."
        }
    except Exception as e:
        return {
            "status": "BLOCKED",
            "asset_path": str(p),
            "target_profile": target_profile,
            "error": str(e),
            "detail": traceback.format_exc()
        }

@app.get("/health")
def health():
    return {
        "status": "READY",
        "kernel": "agent-lee-3d-kernel",
        "port": 8095,
        "uptime_seconds": round(time.time() - APP_STARTED_AT, 3),
        "backend": backend_status(),
    }

@app.get("/status")
def status():
    return {
        "status": "READY",
        "kernel": "agent-lee-3d-kernel",
        "role": "3D game asset reconstruction, validation, and export lane",
        "python": platform.python_version(),
        "output_dir": str(OUTPUT_DIR),
        "input_dir": str(INPUT_DIR),
        "model_dir": str(MODEL_DIR),
        "backend": backend_status(),
        "profiles": ["roblox", "unity", "unreal", "webxr", "game_engine_general"],
        "truth": "Kernel is alive. Neural reconstruction is READY only when backend.neural_backend_ready is true and /reconstruct returns a generated asset."
    }

@app.get("/profiles")
def profiles():
    return {
        "status": "READY",
        "profiles": {
            "roblox": {
                "preferred_assets": ["obj", "fbx", "glb via conversion/import workflow"],
                "requirements": ["low poly optional", "clean scale", "separate textures/materials where possible"]
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
            }
        }
    }

@app.post("/validate-game-asset")
def validate_game_asset(req: ValidateRequest):
    return validate_asset_file(req.asset_path, req.target_profile)

@app.post("/reconstruct")
def reconstruct(req: ReconstructRequest):
    start = time.time()
    b = backend_status()

    if not b["neural_backend_ready"]:
        return JSONResponse(
            status_code=501,
            content={
                "status": "BLOCKED",
                "kernel": "agent-lee-3d-kernel",
                "message": "No neural image-to-3D backend installed in this container.",
                "backend": b,
                "input_image": req.input_image,
                "prompt": req.prompt,
                "target_profile": req.target_profile,
                "truth": "No fake neural GLB/OBJ was generated. Install TripoSR, InstantMesh, Unique3D, or another local backend to unlock REAL neural 3D."
            }
        )

    # Placeholder dispatch point for real backend integration.
    # This kernel does not fake output. A real integration must write the GLB/OBJ to /outputs.
    return JSONResponse(
        status_code=501,
        content={
            "status": "BLOCKED",
            "kernel": "agent-lee-3d-kernel",
            "message": "Neural backend marker found, but backend runner is not wired yet.",
            "elapsed_seconds": round(time.time() - start, 3),
            "backend": b,
            "truth": "A real backend runner must be wired here before Neural Reconstruction can be marked READY."
        }
    )
