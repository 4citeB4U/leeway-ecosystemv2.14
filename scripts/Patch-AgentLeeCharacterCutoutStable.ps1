$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-character-cutout-lane"
$AppRoot = Join-Path $ServiceRoot "app"
$MainPy = Join-Path $AppRoot "main.py"
$Requirements = Join-Path $ServiceRoot "requirements.txt"

$ImageName = "agent-lee-character-cutout-lane:local"
$ContainerName = "agent-lee-character-cutout-lane"
$NetworkName = "leeway-ecosystemv214_leeway-net"

$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane"
$Models = Join-Path $Root "models"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $AppRoot | Out-Null
New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null
New-Item -ItemType Directory -Force -Path $Models | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

@'
fastapi
uvicorn[standard]
pillow
numpy
requests
rembg
onnxruntime
'@ | Set-Content -Path $Requirements -Encoding UTF8

@'
import io
import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import numpy as np
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image
from pydantic import BaseModel, Field


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-character-cutout-lane")
ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

LATEST_FILE = ARTIFACT_ROOT / "latest_character_cutout.json"

app = FastAPI(title=APP_NAME)

_rembg_session = None


class CutoutFromPathRequest(BaseModel):
    image_path: str = Field(..., min_length=1)
    character_id: str = "agent_lee_dragon_dog_warrior_v1"
    canvas_size: int = 768
    alpha_threshold: int = 8
    model_name: str = "u2netp"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_rembg_session(model_name: str = "u2netp"):
    global _rembg_session

    if _rembg_session is None:
        from rembg import new_session
        _rembg_session = new_session(model_name)

    return _rembg_session


def write_receipt(job_dir: Path, receipt: Dict[str, Any]):
    path = job_dir / "receipt.json"
    path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    return path


def resolve_image_path(path_text: str) -> Path:
    p = Path(path_text)

    if p.exists():
        return p

    alt = ARTIFACT_ROOT / path_text.lstrip("/").replace("\\", "/")
    if alt.exists():
        return alt

    raise FileNotFoundError(f"Image not found: {path_text}")


def trim_alpha(img: Image.Image, threshold: int = 8) -> Image.Image:
    rgba = img.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda px: 255 if px > threshold else 0)
    bbox = mask.getbbox()

    if not bbox:
        return rgba

    return rgba.crop(bbox)


def fit_on_canvas(img: Image.Image, canvas_size: int = 768) -> Image.Image:
    canvas_size = max(512, min(1024, int(canvas_size)))

    rgba = img.convert("RGBA")
    rgba.thumbnail((int(canvas_size * 0.94), int(canvas_size * 0.94)), Image.LANCZOS)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - rgba.width) // 2
    y = (canvas_size - rgba.height) // 2
    canvas.alpha_composite(rgba, (x, y))
    return canvas


def make_checker_preview(cutout: Image.Image, size: int = 768) -> Image.Image:
    size = cutout.width
    checker = Image.new("RGB", (size, size), (35, 35, 35))
    block = 32

    arr = np.array(checker)

    for y in range(0, size, block):
        for x in range(0, size, block):
            if ((x // block) + (y // block)) % 2 == 0:
                arr[y:y+block, x:x+block] = [60, 60, 60]

    bg = Image.fromarray(arr, "RGB").convert("RGBA")
    bg.alpha_composite(cutout.convert("RGBA"))
    return bg.convert("RGB")


def save_latest(job_id: str, job_dir: Path):
    data = {
        "job_id": job_id,
        "job_dir": str(job_dir),
        "cutout_url": f"/artifacts/{job_id}/character_cutout.png",
        "preview_url": f"/artifacts/{job_id}/character_cutout_preview.png",
        "receipt_url": f"/artifacts/{job_id}/receipt.json",
        "updated_at": now_iso(),
    }
    LATEST_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "version": "1.1.0-character-only-cutout-stable",
        "artifact_root": str(ARTIFACT_ROOT),
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "1.1.0-character-only-cutout-stable",
        "purpose": "extract_actual_character_only_for_true_3d_mesh",
        "mode": "stable_light_u2netp_no_alpha_matting",
        "outputs": [
            "character_cutout.png",
            "character_cutout_preview.png",
            "source.png",
            "receipt.json"
        ],
        "not_background": True,
        "not_relief_card": True,
        "created_at": now_iso(),
    }


@app.post("/cutout/from-path")
def cutout_from_path(req: CutoutFromPathRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    receipt = {
        "ok": False,
        "verdict": "CHARACTER_CUTOUT_STARTED",
        "job_id": job_id,
        "app": APP_NAME,
        "version": "1.1.0-character-only-cutout-stable",
        "character_id": req.character_id,
        "source": req.image_path,
        "model_name": req.model_name,
        "not_background": True,
        "not_relief_card": True,
        "created_at": now_iso(),
    }

    write_receipt(job_dir, receipt)
    save_latest(job_id, job_dir)

    try:
        from rembg import remove

        src = resolve_image_path(req.image_path)
        source_copy = job_dir / "source.png"
        shutil.copyfile(src, source_copy)

        img = Image.open(src).convert("RGBA")

        # Downscale before rembg to reduce memory and avoid container crashes.
        max_side = 1280
        img.thumbnail((max_side, max_side), Image.LANCZOS)

        raw_bytes = io.BytesIO()
        img.save(raw_bytes, format="PNG")
        raw_bytes.seek(0)

        out_bytes = remove(
            raw_bytes.read(),
            session=get_rembg_session(req.model_name),
            alpha_matting=False
        )

        cutout = Image.open(io.BytesIO(out_bytes)).convert("RGBA")
        cutout = trim_alpha(cutout, req.alpha_threshold)
        cutout = fit_on_canvas(cutout, req.canvas_size)

        cutout_path = job_dir / "character_cutout.png"
        preview_path = job_dir / "character_cutout_preview.png"

        cutout.save(cutout_path)
        make_checker_preview(cutout).save(preview_path)

        receipt.update({
            "ok": True,
            "verdict": "CHARACTER_ONLY_CUTOUT_CREATED",
            "source_image": str(source_copy),
            "character_cutout": str(cutout_path),
            "character_cutout_preview": str(preview_path),
            "artifact_urls": {
                "cutout": f"/artifacts/{job_id}/character_cutout.png",
                "preview": f"/artifacts/{job_id}/character_cutout_preview.png",
                "source": f"/artifacts/{job_id}/source.png",
                "receipt": f"/artifacts/{job_id}/receipt.json",
            },
            "links": {
                "cutout": f"http://127.0.0.1:8102/artifacts/{job_id}/character_cutout.png",
                "preview": f"http://127.0.0.1:8102/artifacts/{job_id}/character_cutout_preview.png",
                "latest_cutout": "http://127.0.0.1:8102/latest/character_cutout.png",
                "latest_preview": "http://127.0.0.1:8102/latest/character_cutout_preview.png",
            },
            "next_step": "feed character_cutout.png into true mesh lane, not the full background image",
            "completed_at": now_iso(),
        })

        write_receipt(job_dir, receipt)
        save_latest(job_id, job_dir)
        return receipt

    except Exception as e:
        receipt.update({
            "ok": False,
            "verdict": "CHARACTER_CUTOUT_ERROR",
            "error": str(e),
            "completed_at": now_iso(),
        })
        write_receipt(job_dir, receipt)
        return JSONResponse(status_code=500, content=receipt)


@app.get("/latest")
def latest():
    if not LATEST_FILE.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_CUTOUT"})
    return json.loads(LATEST_FILE.read_text(encoding="utf-8"))


@app.get("/latest/character_cutout.png")
def latest_cutout():
    if not LATEST_FILE.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_CUTOUT"})
    data = json.loads(LATEST_FILE.read_text(encoding="utf-8"))
    path = ARTIFACT_ROOT / data["job_id"] / "character_cutout.png"
    return FileResponse(path, media_type="image/png", filename="character_cutout.png")


@app.get("/latest/character_cutout_preview.png")
def latest_preview():
    if not LATEST_FILE.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_CUTOUT"})
    data = json.loads(LATEST_FILE.read_text(encoding="utf-8"))
    path = ARTIFACT_ROOT / data["job_id"] / "character_cutout_preview.png"
    return FileResponse(path, media_type="image/png", filename="character_cutout_preview.png")


@app.get("/artifacts/{job_id}/{filename}")
def artifact(job_id: str, filename: str):
    safe = Path(filename).name

    if safe != filename:
        return JSONResponse(status_code=400, content={"ok": False, "error": "INVALID_FILENAME"})

    path = ARTIFACT_ROOT / job_id / safe

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NOT_FOUND", "filename": safe})

    media = "application/octet-stream"
    if path.suffix.lower() == ".png":
        media = "image/png"
    elif path.suffix.lower() == ".json":
        media = "application/json"

    return FileResponse(path, media_type=media, filename=safe)
'@ | Set-Content -Path $MainPy -Encoding UTF8

docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --init `
  --name $ContainerName `
  --network $NetworkName `
  -p "8102:8102" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  --mount "type=bind,source=$Models,target=/models" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "U2NET_HOME=/models/rembg" `
  $ImageName | Out-Null

Start-Sleep -Seconds 10

docker inspect $ContainerName `
  --format "Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}}"

docker logs $ContainerName --tail 80

Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8102/status" -TimeoutSec 60 |
  ConvertTo-Json -Depth 80