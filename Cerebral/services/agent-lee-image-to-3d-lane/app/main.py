import json
import os
import shutil
import subprocess
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import requests
import torch
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-image-to-3d-lane")
ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
TRIPOSR_ROOT = Path(os.environ.get("AGENT_LEE_TRIPOSR_ROOT", "/opt/TripoSR"))

ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title=APP_NAME)


class ConvertFromPathRequest(BaseModel):
    image_path: str = Field(..., min_length=1)
    character_id: str = "agent_lee_character_v1"
    output_format: str = "obj"


class ConvertLatestSDXLRequest(BaseModel):
    sdxl_latest_url: str = "http://agent-lee-sdxl-lightning-image-lane:8095/latest/image.png"
    character_id: str = "agent_lee_character_v1"
    output_format: str = "obj"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def cuda_status() -> Dict[str, Any]:
    info = {
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cuda_device_name": None,
    }

    if torch.cuda.is_available():
        info["cuda_device_name"] = torch.cuda.get_device_name(0)

    return info


def run_command(cmd, cwd: Path, timeout: int = 3600) -> Dict[str, Any]:
    started = time.time()

    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
    )

    return {
        "cmd": cmd,
        "cwd": str(cwd),
        "returncode": proc.returncode,
        "stdout": proc.stdout[-8000:],
        "stderr": proc.stderr[-8000:],
        "elapsed_seconds": round(time.time() - started, 3),
    }


def find_mesh_files(job_dir: Path):
    out = []
    for pattern in ["*.obj", "*.glb", "*.ply", "*.stl", "*.mtl", "*.png", "*.jpg", "*.jpeg"]:
        out.extend(job_dir.rglob(pattern))
    return sorted(set(out))


def write_receipt(job_dir: Path, receipt: Dict[str, Any]) -> Path:
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
        # Allow paths from the mounted artifacts area.
        alt = ARTIFACT_ROOT / source
        if alt.exists():
            src = alt
        else:
            raise FileNotFoundError(f"Input image not found: {source}")

    shutil.copyfile(src, input_path)
    return input_path


def triposr_convert(input_image: Path, job_dir: Path, output_format: str = "obj") -> Dict[str, Any]:
    if not TRIPOSR_ROOT.exists():
        raise FileNotFoundError(f"TripoSR root not found: {TRIPOSR_ROOT}")

    output_dir = job_dir / "triposr-output"
    output_dir.mkdir(parents=True, exist_ok=True)

    possible_commands = [
        [
            "python",
            "run.py",
            str(input_image),
            "--output-dir",
            str(output_dir),
            "--model-save-format",
            output_format,
        ],
        [
            "python",
            "run.py",
            str(input_image),
            "--output-dir",
            str(output_dir),
        ],
    ]

    attempts = []

    for cmd in possible_commands:
        result = run_command(cmd, TRIPOSR_ROOT, timeout=3600)
        attempts.append(result)

        mesh_files = find_mesh_files(output_dir)

        if result["returncode"] == 0 and mesh_files:
            # Copy the first likely mesh to stable top-level names.
            top_files = []

            for file in mesh_files:
                rel = file.relative_to(output_dir)
                stable = job_dir / rel.name

                if file.resolve() != stable.resolve():
                    shutil.copyfile(file, stable)

                top_files.append(str(stable))

            return {
                "ok": True,
                "attempts": attempts,
                "output_dir": str(output_dir),
                "mesh_files": top_files,
            }

    return {
        "ok": False,
        "attempts": attempts,
        "output_dir": str(output_dir),
        "mesh_files": [str(p) for p in find_mesh_files(output_dir)],
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "model": "TripoSR",
        "triposr_root_exists": TRIPOSR_ROOT.exists(),
        "triposr_root": str(TRIPOSR_ROOT),
        "device": DEVICE,
        "cuda": cuda_status(),
        "artifact_root": str(ARTIFACT_ROOT),
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "1.0.0-triposr-first-proof",
        "purpose": "image_to_3d_mesh_from_agent_lee_generated_image",
        "model": "TripoSR",
        "role": "single_image_to_3d_mesh_proof",
        "device": DEVICE,
        "cuda": cuda_status(),
        "artifact_root": str(ARTIFACT_ROOT),
        "does_not_modify_existing_3d_folders": True,
        "created_at": now_iso(),
    }


@app.post("/convert/from-path")
def convert_from_path(req: ConvertFromPathRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    receipt = {
        "ok": False,
        "verdict": "IMAGE_TO_3D_STARTED",
        "job_id": job_id,
        "app": APP_NAME,
        "version": "1.0.0-triposr-first-proof",
        "character_id": req.character_id,
        "source_image": req.image_path,
        "output_format": req.output_format,
        "created_at": now_iso(),
    }

    write_receipt(job_dir, receipt)

    try:
        input_image = copy_or_download_image_to_job(req.image_path, job_dir)
        result = triposr_convert(input_image, job_dir, req.output_format)

        mesh_files = find_mesh_files(job_dir)

        receipt.update({
            "ok": bool(result.get("ok")),
            "verdict": "IMAGE_TO_3D_PROOF_CREATED" if result.get("ok") else "IMAGE_TO_3D_FAILED",
            "input_image": str(input_image),
            "result": result,
            "mesh_files": [str(p) for p in mesh_files],
            "artifact_urls": [f"/artifacts/{job_id}/{p.name}" for p in mesh_files if p.is_file()],
            "receipt_url": f"/artifacts/{job_id}/receipt.json",
            "limitations": [
                "single-image 3D estimates hidden back geometry",
                "wings and tail may need refinement",
                "rigging is not included in first proof",
            ],
            "completed_at": now_iso(),
        })

        write_receipt(job_dir, receipt)
        return receipt

    except Exception as e:
        receipt.update({
            "ok": False,
            "verdict": "IMAGE_TO_3D_ERROR",
            "error": str(e),
            "completed_at": now_iso(),
        })

        write_receipt(job_dir, receipt)
        return JSONResponse(status_code=500, content=receipt)


@app.post("/convert/latest-sdxl")
def convert_latest_sdxl(req: ConvertLatestSDXLRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    receipt = {
        "ok": False,
        "verdict": "LATEST_SDXL_IMAGE_TO_3D_STARTED",
        "job_id": job_id,
        "app": APP_NAME,
        "version": "1.0.0-triposr-first-proof",
        "character_id": req.character_id,
        "sdxl_latest_url": req.sdxl_latest_url,
        "output_format": req.output_format,
        "created_at": now_iso(),
    }

    write_receipt(job_dir, receipt)

    try:
        input_image = copy_or_download_image_to_job(req.sdxl_latest_url, job_dir)
        result = triposr_convert(input_image, job_dir, req.output_format)

        mesh_files = find_mesh_files(job_dir)

        receipt.update({
            "ok": bool(result.get("ok")),
            "verdict": "LATEST_SDXL_IMAGE_TO_3D_PROOF_CREATED" if result.get("ok") else "LATEST_SDXL_IMAGE_TO_3D_FAILED",
            "input_image": str(input_image),
            "result": result,
            "mesh_files": [str(p) for p in mesh_files],
            "artifact_urls": [f"/artifacts/{job_id}/{p.name}" for p in mesh_files if p.is_file()],
            "receipt_url": f"/artifacts/{job_id}/receipt.json",
            "limitations": [
                "single-image 3D estimates hidden back geometry",
                "wings and tail may need refinement",
                "rigging is not included in first proof",
            ],
            "completed_at": now_iso(),
        })

        write_receipt(job_dir, receipt)
        return receipt

    except Exception as e:
        receipt.update({
            "ok": False,
            "verdict": "LATEST_SDXL_IMAGE_TO_3D_ERROR",
            "error": str(e),
            "completed_at": now_iso(),
        })

        write_receipt(job_dir, receipt)
        return JSONResponse(status_code=500, content=receipt)


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
    elif suffix == ".glb":
        media = "model/gltf-binary"
    elif suffix == ".ply":
        media = "application/octet-stream"

    return FileResponse(path, media_type=media, filename=safe_name)
