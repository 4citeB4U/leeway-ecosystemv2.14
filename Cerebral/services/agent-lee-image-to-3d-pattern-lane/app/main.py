import json
import math
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import numpy as np
import requests
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel, Field


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-image-to-3d-pattern-lane")
ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)
LATEST_JOB_FILE = ARTIFACT_ROOT / "latest_3d_job.json"

app = FastAPI(title=APP_NAME)


class ConvertFromPathRequest(BaseModel):
    image_path: str = Field(..., min_length=1)
    character_id: str = "agent_lee_character_v1"
    depth_strength: float = 0.18
    grid_size: int = 80


class ConvertLatestSDXLRequest(BaseModel):
    sdxl_latest_url: str = "http://agent-lee-sdxl-lightning-image-lane:8095/latest/image.png"
    character_id: str = "agent_lee_character_v1"
    depth_strength: float = 0.18
    grid_size: int = 80


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_grid_size(value: int) -> int:
    try:
        value = int(value)
    except Exception:
        value = 80
    return max(24, min(160, value))


def write_receipt(job_dir: Path, receipt: Dict) -> Path:
    receipt_path = job_dir / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    return receipt_path


def copy_or_download_image_to_job(source: str, job_dir: Path) -> Path:
    input_path = job_dir / "input.png"

    if source.startswith("http://") or source.startswith("https://"):
        response = requests.get(source, timeout=120)
        response.raise_for_status()
        input_path.write_bytes(response.content)
        return input_path

    src = Path(source)

    if not src.exists():
        alt = ARTIFACT_ROOT / source
        if alt.exists():
            src = alt
        else:
            raise FileNotFoundError(f"Input image not found: {source}")

    shutil.copyfile(src, input_path)
    return input_path


def make_rgba_texture(input_image: Path, job_dir: Path) -> Path:
    img = Image.open(input_image).convert("RGBA")
    img.thumbnail((1024, 1024), Image.LANCZOS)

    # Fit to square texture while preserving the character.
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    x = (1024 - img.width) // 2
    y = (1024 - img.height) // 2
    canvas.alpha_composite(img, (x, y))

    texture_path = job_dir / "texture.png"
    canvas.save(texture_path)
    return texture_path


def make_height_map(texture_path: Path, job_dir: Path) -> Path:
    img = Image.open(texture_path).convert("RGBA")
    arr = np.array(img).astype(np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3] / 255.0

    # Luma based height. Bright center/armor/features pop outward.
    luma = (0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]) / 255.0
    height = (0.30 + 0.70 * luma) * alpha

    # Transparent background sits back.
    height = np.where(alpha > 0.05, height, 0.0)

    h8 = np.clip(height * 255.0, 0, 255).astype(np.uint8)
    height_path = job_dir / "height.png"
    Image.fromarray(h8, mode="L").save(height_path)
    return height_path


def create_relief_obj(texture_path: Path, height_path: Path, job_dir: Path, depth_strength: float, grid_size: int):
    grid_size = safe_grid_size(grid_size)
    depth_strength = max(0.02, min(0.50, float(depth_strength)))

    tex = Image.open(texture_path).convert("RGBA")
    height_img = Image.open(height_path).convert("L").resize((grid_size + 1, grid_size + 1), Image.BICUBIC)
    height = np.array(height_img).astype(np.float32) / 255.0

    obj_path = job_dir / "model.obj"
    mtl_path = job_dir / "model.mtl"

    # Character card aspect: vertical rectangle, slight sculpted relief.
    width = 1.0
    height_world = 1.5

    vertices = []
    uvs = []
    faces = []

    for iy in range(grid_size + 1):
        for ix in range(grid_size + 1):
            u = ix / grid_size
            v = iy / grid_size

            x = (u - 0.5) * width
            y = (0.5 - v) * height_world

            # Center depth outward. Background remains flatter.
            z = float(height[iy, ix]) * depth_strength

            vertices.append((x, y, z))
            uvs.append((u, 1.0 - v))

    def idx(ix, iy):
        return iy * (grid_size + 1) + ix + 1

    for iy in range(grid_size):
        for ix in range(grid_size):
            a = idx(ix, iy)
            b = idx(ix + 1, iy)
            c = idx(ix + 1, iy + 1)
            d = idx(ix, iy + 1)
            faces.append((a, b, c, d))

    with obj_path.open("w", encoding="utf-8") as f:
        f.write("# Agent Lee pattern-based image-to-3D relief object\n")
        f.write("mtllib model.mtl\n")
        f.write("o agent_lee_image_relief\n")

        for x, y, z in vertices:
            f.write(f"v {x:.6f} {y:.6f} {z:.6f}\n")

        for u, v in uvs:
            f.write(f"vt {u:.6f} {v:.6f}\n")

        f.write("usemtl agent_lee_texture\n")

        for face in faces:
            f.write(
                "f "
                + " ".join([f"{i}/{i}" for i in face])
                + "\n"
            )

    with mtl_path.open("w", encoding="utf-8") as f:
        f.write("newmtl agent_lee_texture\n")
        f.write("Ka 1.000 1.000 1.000\n")
        f.write("Kd 1.000 1.000 1.000\n")
        f.write("Ks 0.100 0.100 0.100\n")
        f.write("Ns 10.000\n")
        f.write("d 1.0\n")
        f.write("illum 2\n")
        f.write("map_Kd texture.png\n")

    return obj_path, mtl_path



def create_glb_from_obj(job_dir: Path) -> Path:
    obj_path = job_dir / "model.obj"
    glb_path = job_dir / "model.glb"

    if not obj_path.exists():
        raise FileNotFoundError(f"OBJ not found for GLB export: {obj_path}")

    loaded = trimesh.load(str(obj_path), force="scene")

    if hasattr(loaded, "export"):
        loaded.export(str(glb_path))
    else:
        raise RuntimeError("Trimesh could not load OBJ as exportable scene.")

    return glb_path

def create_simple_glb_placeholder(job_dir: Path) -> Path:
    # This is intentionally not a true GLB; it prevents callers from assuming GLB exists.
    note_path = job_dir / "GLB_NOT_CREATED_YET.txt"
    note_path.write_text(
        "OBJ+MTL+PNG were created. GLB conversion will be added in the next upgrade using trimesh or blender.",
        encoding="utf-8",
    )
    return note_path


def convert_image_to_3d(source: str, character_id: str, depth_strength: float, grid_size: int):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    receipt = {
        "ok": False,
        "verdict": "IMAGE_TO_3D_PATTERN_STARTED",
        "job_id": job_id,
        "app": APP_NAME,
        "version": "1.2.0-pattern-relief-download-viewer-links",
        "character_id": character_id,
        "source": source,
        "created_at": now_iso(),
    }

    write_receipt(job_dir, receipt)

    try:
        input_image = copy_or_download_image_to_job(source, job_dir)
        texture_path = make_rgba_texture(input_image, job_dir)
        height_path = make_height_map(texture_path, job_dir)
        obj_path, mtl_path = create_relief_obj(texture_path, height_path, job_dir, depth_strength, grid_size)

        glb_path = None
        glb_error = None

        try:
            glb_path = create_glb_from_obj(job_dir)
        except Exception as glb_ex:
            glb_error = str(glb_ex)
            create_simple_glb_placeholder(job_dir)

        artifact_urls = {
            "obj": f"/artifacts/{job_id}/model.obj",
            "mtl": f"/artifacts/{job_id}/model.mtl",
            "texture": f"/artifacts/{job_id}/texture.png",
            "height": f"/artifacts/{job_id}/height.png",
            "input": f"/artifacts/{job_id}/input.png",
            "receipt": f"/artifacts/{job_id}/receipt.json",
        }

        if glb_path is not None and glb_path.exists():
            artifact_urls["glb"] = f"/artifacts/{job_id}/model.glb"

        receipt.update({
            "ok": True,
            "verdict": "IMAGE_TO_3D_PATTERN_OBJECT_CREATED_WITH_GLB" if glb_path else "IMAGE_TO_3D_PATTERN_OBJECT_CREATED_GLB_DEFERRED",
            "input_image": str(input_image),
            "texture": str(texture_path),
            "height_map": str(height_path),
            "obj": str(obj_path),
            "mtl": str(mtl_path),
            "glb": str(glb_path) if glb_path else None,
            "glb_error": glb_error,
            "artifact_urls": artifact_urls,
            "limitations": [
                "This is a textured relief/card mesh, not full 360 geometry.",
                "It preserves the exact generated image as texture.",
                "Full single-image 3D reconstruction will require TripoSR/Hunyuan3D after CUDA build dependencies are resolved.",
            ],
            "completed_at": now_iso(),
        })

        write_receipt(job_dir, receipt)
        return receipt

    except Exception as e:
        receipt.update({
            "ok": False,
            "verdict": "IMAGE_TO_3D_PATTERN_ERROR",
            "error": str(e),
            "completed_at": now_iso(),
        })
        write_receipt(job_dir, receipt)
        return JSONResponse(status_code=500, content=receipt)


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "version": "1.2.0-pattern-relief-download-viewer-links",
        "artifact_root": str(ARTIFACT_ROOT),
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "1.2.0-pattern-relief-download-viewer-links",
        "purpose": "pattern_based_image_to_3d_object_from_agent_lee_generated_image",
        "model": "pattern_relief_mesh",
        "role": "first working image-to-3D proof without CUDA compile dependencies",
        "outputs": ["model.obj", "model.mtl", "texture.png", "height.png", "receipt.json"],
        "does_not_modify_existing_3d_folders": True,
        "tripo_status": "deferred_due_to_torchmcubes_cuda_compiler_build_failure",
        "artifact_root": str(ARTIFACT_ROOT),
        "created_at": now_iso(),
    }


@app.post("/convert/from-path")
def convert_from_path(req: ConvertFromPathRequest):
    return convert_image_to_3d(
        source=req.image_path,
        character_id=req.character_id,
        depth_strength=req.depth_strength,
        grid_size=req.grid_size,
    )


@app.post("/convert/latest-sdxl")
def convert_latest_sdxl(req: ConvertLatestSDXLRequest):
    return convert_image_to_3d(
        source=req.sdxl_latest_url,
        character_id=req.character_id,
        depth_strength=req.depth_strength,
        grid_size=req.grid_size,
    )


@app.get("/artifacts/{job_id}/{filename}")
def get_artifact_file(job_id: str, filename: str):
    safe_name = Path(filename).name

    if safe_name != filename:
        return JSONResponse(status_code=400, content={"ok": False, "error": "INVALID_FILENAME"})

    path = ARTIFACT_ROOT / job_id / safe_name

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "ARTIFACT_NOT_FOUND", "filename": safe_name})

    suffix = path.suffix.lower()

    media = "application/octet-stream"
    if suffix == ".json":
        media = "application/json"
    elif suffix == ".png":
        media = "image/png"
    elif suffix in [".jpg", ".jpeg"]:
        media = "image/jpeg"
    elif suffix == ".obj":
        media = "text/plain"
    elif suffix == ".mtl":
        media = "text/plain"
    elif suffix == ".txt":
        media = "text/plain"
    elif suffix == ".glb":
        media = "model/gltf-binary"

    return FileResponse(path, media_type=media, filename=safe_name)


