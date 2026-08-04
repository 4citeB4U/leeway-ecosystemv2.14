import json
import os
import shutil
import subprocess
import time
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import requests
import torch
import trimesh
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-true-character-mesh-lane")
ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
TRIPOSR_ROOT = Path(os.environ.get("AGENT_LEE_TRIPOSR_ROOT", "/opt/TripoSR"))
ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)

LATEST_FILE = ARTIFACT_ROOT / "latest_true_character_mesh.json"

app = FastAPI(title=APP_NAME)


class MeshFromPathRequest(BaseModel):
    image_path: str = Field(..., min_length=1)
    character_id: str = "agent_lee_dragon_dog_warrior_v1"
    output_format: str = "obj"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def cuda_status() -> Dict[str, Any]:
    info = {
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "cuda_device_name": None,
        "cuda_memory_allocated_mb": None,
        "cuda_memory_reserved_mb": None,
    }

    if torch.cuda.is_available():
        info["cuda_device_name"] = torch.cuda.get_device_name(0)
        info["cuda_memory_allocated_mb"] = round(torch.cuda.memory_allocated(0) / 1024 / 1024, 2)
        info["cuda_memory_reserved_mb"] = round(torch.cuda.memory_reserved(0) / 1024 / 1024, 2)

    return info


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def write_receipt(job_dir: Path, receipt: Dict[str, Any]) -> Path:
    path = job_dir / "receipt.json"
    write_json(path, receipt)
    return path


def save_latest(job_id: str, job_dir: Path) -> None:
    data = {
        "job_id": job_id,
        "job_dir": str(job_dir),
        "viewer_url": f"/artifacts/{job_id}/viewer.html",
        "package_url": f"/artifacts/{job_id}/agent_lee_true_character_mesh_package.zip",
        "receipt_url": f"/artifacts/{job_id}/receipt.json",
        "updated_at": now_iso(),
    }
    write_json(LATEST_FILE, data)


def resolve_image_path(path_text: str) -> Path:
    if path_text.startswith("http://") or path_text.startswith("https://"):
        raise ValueError("Use copy_or_download_image for URLs.")

    p = Path(path_text)
    if p.exists():
        return p

    alt = ARTIFACT_ROOT / path_text.lstrip("/").replace("\\", "/")
    if alt.exists():
        return alt

    raise FileNotFoundError(f"Input image not found: {path_text}")


def copy_or_download_image(source: str, job_dir: Path) -> Path:
    out = job_dir / "input.png"

    if source.startswith("http://") or source.startswith("https://"):
        response = requests.get(source, timeout=180)
        response.raise_for_status()
        out.write_bytes(response.content)
        return out

    src = resolve_image_path(source)
    shutil.copyfile(src, out)
    return out


def run_cmd(cmd, cwd: Path, timeout: int = 3600) -> Dict[str, Any]:
    started = time.time()

    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        env={
            **os.environ.copy(),
            "CUDA_VISIBLE_DEVICES": "" if os.environ.get("AGENT_LEE_FORCE_CPU_TRIPOSR", "false").lower() == "true" else os.environ.get("CUDA_VISIBLE_DEVICES", ""),
        },
    )

    return {
        "cmd": cmd,
        "cwd": str(cwd),
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-12000:],
        "stderr_tail": proc.stderr[-12000:],
        "elapsed_seconds": round(time.time() - started, 2),
    }


def find_files(job_dir: Path):
    out = []
    for pattern in ["*.obj", "*.glb", "*.ply", "*.stl", "*.mtl", "*.png", "*.jpg", "*.jpeg"]:
        out.extend(job_dir.rglob(pattern))
    return sorted(set(out))


def copy_outputs_to_top(job_dir: Path, output_dir: Path) -> Dict[str, Any]:
    files = find_files(output_dir)
    copied = []

    for p in files:
        # Skip hidden/temp files.
        if p.name.startswith("."):
            continue

        dst = job_dir / p.name

        # Avoid overwriting input unless same name not desired.
        if dst.exists() and dst.name == "input.png":
            continue

        try:
            shutil.copyfile(p, dst)
            copied.append(str(dst))
        except Exception:
            pass

    return {
        "found": [str(p) for p in files],
        "copied": copied,
    }


def try_convert_obj_to_glb(job_dir: Path) -> Dict[str, Any]:
    obj_candidates = list(job_dir.glob("*.obj"))

    if not obj_candidates:
        return {"ok": False, "error": "No OBJ found for GLB conversion."}

    obj_path = obj_candidates[0]
    glb_path = job_dir / "model.glb"

    try:
        scene = trimesh.load(str(obj_path), force="scene")
        scene.export(str(glb_path))
        return {
            "ok": True,
            "obj": str(obj_path),
            "glb": str(glb_path),
        }
    except Exception as e:
        return {
            "ok": False,
            "obj": str(obj_path),
            "error": str(e),
        }


def create_viewer(job_dir: Path, job_id: str) -> Path:
    viewer = job_dir / "viewer.html"

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agent Lee True Character Mesh</title>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  <style>
    html, body {{
      margin: 0;
      width: 100%;
      height: 100%;
      background: #080808;
      color: white;
      font-family: Arial, sans-serif;
    }}
    header {{
      padding: 14px 18px;
      background: #111;
      border-bottom: 1px solid #333;
    }}
    main {{
      height: calc(100vh - 74px);
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 14px;
      padding: 14px;
      box-sizing: border-box;
    }}
    model-viewer {{
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, #222, #050505);
      border: 1px solid #333;
      border-radius: 14px;
    }}
    .panel {{
      background: #141414;
      border: 1px solid #333;
      border-radius: 14px;
      padding: 14px;
      overflow: auto;
    }}
    a {{
      color: #8fd3ff;
      display: block;
      margin: 9px 0;
    }}
    code {{
      color: #ffe08a;
      word-break: break-all;
    }}
  </style>
</head>
<body>
  <header>
    <b>Agent Lee True Character Mesh</b>
    <div>Job ID: <code>{job_id}</code></div>
  </header>
  <main>
    <model-viewer
      src="./model.glb"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      exposure="1"
      ar
      ar-modes="webxr scene-viewer quick-look">
      <div slot="poster">Loading Agent Lee 3D mesh...</div>
    </model-viewer>
    <section class="panel">
      <h2>Downloads</h2>
      <a href="./agent_lee_true_character_mesh_package.zip" download>Download full mesh package ZIP</a>
      <a href="./model.glb" download>Download model.glb</a>
      <a href="./model.obj" download>Download model.obj</a>
      <a href="./model.mtl" download>Download model.mtl</a>
      <a href="./input.png" download>Download input image</a>
      <a href="./receipt.json" download>Download receipt</a>
      <p>This is the real neural image-to-3D mesh lane output. Use mouse/touch to rotate, zoom, and inspect the character.</p>
    </section>
  </main>
</body>
</html>"""

    viewer.write_text(html, encoding="utf-8")
    return viewer


def create_package(job_dir: Path) -> Path:
    package = job_dir / "agent_lee_true_character_mesh_package.zip"

    include = [
        "viewer.html",
        "model.glb",
        "model.obj",
        "model.mtl",
        "input.png",
        "receipt.json",
    ]

    with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name in include:
            p = job_dir / name
            if p.exists():
                z.write(p, arcname=name)

    return package


def run_triposr(input_image: Path, job_dir: Path, output_format: str) -> Dict[str, Any]:
    output_dir = job_dir / "triposr-output"
    output_dir.mkdir(parents=True, exist_ok=True)

    attempts = []

    commands = [
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

    for cmd in commands:
        result = run_cmd(cmd, TRIPOSR_ROOT, timeout=3600)
        attempts.append(result)

        if result["returncode"] == 0:
            copied = copy_outputs_to_top(job_dir, output_dir)
            files = find_files(job_dir)

            if any(p.suffix.lower() in [".obj", ".glb", ".ply"] for p in files):
                return {
                    "ok": True,
                    "attempts": attempts,
                    "copied_outputs": copied,
                    "files": [str(p) for p in files],
                }

    copied = copy_outputs_to_top(job_dir, output_dir)

    return {
        "ok": False,
        "attempts": attempts,
        "copied_outputs": copied,
        "files": [str(p) for p in find_files(job_dir)],
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "version": "1.0.0-triposr-cuda-devel-true-mesh",
        "triposr_root": str(TRIPOSR_ROOT),
        "triposr_root_exists": TRIPOSR_ROOT.exists(),
        "artifact_root": str(ARTIFACT_ROOT),
        "cuda": cuda_status(),
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "1.0.0-triposr-cuda-devel-true-mesh",
        "purpose": "true_neural_character_mesh_from_image",
        "backend": "TripoSR",
        "not_shell_mesh": True,
        "not_relief_card": True,
        "outputs": [
            "model.obj",
            "model.glb",
            "viewer.html",
            "agent_lee_true_character_mesh_package.zip",
            "receipt.json",
        ],
        "cuda": cuda_status(),
        "created_at": now_iso(),
    }


@app.post("/mesh/from-path")
def mesh_from_path(req: MeshFromPathRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / "true-mesh" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    save_latest(job_id, job_dir)

    receipt = {
        "ok": False,
        "verdict": "TRUE_CHARACTER_MESH_STARTED",
        "job_id": job_id,
        "app": APP_NAME,
        "version": "1.0.0-triposr-cuda-devel-true-mesh",
        "backend": "TripoSR",
        "character_id": req.character_id,
        "source": req.image_path,
        "not_shell_mesh": True,
        "not_relief_card": True,
        "started_at": now_iso(),
        "cuda_start": cuda_status(),
    }

    write_receipt(job_dir, receipt)

    try:
        input_image = copy_or_download_image(req.image_path, job_dir)

        result = run_triposr(
            input_image=input_image,
            job_dir=job_dir,
            output_format=req.output_format,
        )

        glb_result = try_convert_obj_to_glb(job_dir)

        viewer = None
        if (job_dir / "model.glb").exists():
            viewer = create_viewer(job_dir, job_id)

        package = create_package(job_dir)

        files = find_files(job_dir)

        receipt.update({
            "ok": bool(result.get("ok")),
            "verdict": "TRUE_CHARACTER_MESH_CREATED" if result.get("ok") else "TRUE_CHARACTER_MESH_FAILED",
            "input_image": str(input_image),
            "triposr_result": result,
            "glb_result": glb_result,
            "files": [str(p) for p in files],
            "links": {
                "viewer": f"http://127.0.0.1:8103/artifacts/true-mesh/{job_id}/viewer.html",
                "package": f"http://127.0.0.1:8103/artifacts/true-mesh/{job_id}/agent_lee_true_character_mesh_package.zip",
                "glb": f"http://127.0.0.1:8103/artifacts/true-mesh/{job_id}/model.glb",
                "obj": f"http://127.0.0.1:8103/artifacts/true-mesh/{job_id}/model.obj",
                "receipt": f"http://127.0.0.1:8103/artifacts/true-mesh/{job_id}/receipt.json",
            },
            "viewer": str(viewer) if viewer else None,
            "package": str(package),
            "completed_at": now_iso(),
            "cuda_end": cuda_status(),
        })

        write_receipt(job_dir, receipt)
        save_latest(job_id, job_dir)
        return receipt

    except Exception as e:
        receipt.update({
            "ok": False,
            "verdict": "TRUE_CHARACTER_MESH_ERROR",
            "error": str(e),
            "completed_at": now_iso(),
            "cuda_end": cuda_status(),
        })
        write_receipt(job_dir, receipt)
        return JSONResponse(status_code=500, content=receipt)


@app.get("/latest")
def latest():
    if not LATEST_FILE.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_TRUE_MESH"})
    return json.loads(LATEST_FILE.read_text(encoding="utf-8"))


@app.get("/latest/viewer.html")
def latest_viewer():
    data = json.loads(LATEST_FILE.read_text(encoding="utf-8"))
    path = Path(data["job_dir"]) / "viewer.html"
    return FileResponse(path, media_type="text/html", filename="viewer.html")


@app.get("/latest/package.zip")
def latest_package():
    data = json.loads(LATEST_FILE.read_text(encoding="utf-8"))
    path = Path(data["job_dir"]) / "agent_lee_true_character_mesh_package.zip"
    return FileResponse(path, media_type="application/zip", filename="agent_lee_true_character_mesh_package.zip")


@app.get("/latest/model.glb")
def latest_glb():
    data = json.loads(LATEST_FILE.read_text(encoding="utf-8"))
    path = Path(data["job_dir"]) / "model.glb"
    return FileResponse(path, media_type="model/gltf-binary", filename="model.glb")


@app.get("/artifacts/{path:path}")
def artifact(path: str):
    target = ARTIFACT_ROOT / path

    if not target.exists() or not target.is_file():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NOT_FOUND", "path": path})

    suffix = target.suffix.lower()
    media = "application/octet-stream"

    if suffix == ".html":
        media = "text/html"
    elif suffix == ".json":
        media = "application/json"
    elif suffix == ".png":
        media = "image/png"
    elif suffix == ".jpg" or suffix == ".jpeg":
        media = "image/jpeg"
    elif suffix == ".obj":
        media = "text/plain"
    elif suffix == ".mtl":
        media = "text/plain"
    elif suffix == ".glb":
        media = "model/gltf-binary"
    elif suffix == ".zip":
        media = "application/zip"

    return FileResponse(target, media_type=media, filename=target.name)

