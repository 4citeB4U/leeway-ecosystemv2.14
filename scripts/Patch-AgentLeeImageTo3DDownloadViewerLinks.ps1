$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-image-to-3d-pattern-lane"
$Requirements = Join-Path $ServiceRoot "requirements.txt"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-image-to-3d-pattern-lane:local"
$ContainerName = "agent-lee-image-to-3d-pattern-lane"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\image-to-3d-lane"
$Proof = Join-Path $Root "Archive\proofs\image-to-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

if (-not (Test-Path $Requirements)) {
  throw "requirements.txt not found: $Requirements"
}

$Req = Get-Content $Requirements -Raw
foreach ($pkg in @("trimesh")) {
  if ($Req -notmatch "(?m)^$pkg\s*$") {
    Add-Content -Path $Requirements -Value $pkg
  }
}

$Text = Get-Content $MainPy -Raw

# Ensure imports.
if ($Text -notmatch "(?m)^import zipfile$") {
  $Text = $Text.Replace("import uuid`n", "import uuid`nimport zipfile`n")
}

if ($Text -notmatch "(?m)^import trimesh$") {
  $Text = $Text.Replace("import requests`n", "import requests`nimport trimesh`n")
}

if ($Text -notmatch "from fastapi import FastAPI, Request") {
  $Text = $Text.Replace("from fastapi import FastAPI", "from fastapi import FastAPI, Request")
}

# Add latest job file.
if ($Text -notmatch "LATEST_JOB_FILE") {
  $Text = $Text.Replace(
    "ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)",
    "ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)`nLATEST_JOB_FILE = ARTIFACT_ROOT / `"latest_3d_job.json`""
  )
}

# Add helpers before health endpoint.
if ($Text -notmatch "def public_base_url") {
  $Helpers = @'

def public_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def write_latest_job(job_id: str, job_dir: Path) -> None:
    data = {
        "job_id": job_id,
        "job_dir": str(job_dir),
        "updated_at": now_iso(),
    }
    LATEST_JOB_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_latest_job() -> Dict:
    if not LATEST_JOB_FILE.exists():
        return {}
    try:
        return json.loads(LATEST_JOB_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def create_object_zip(job_dir: Path) -> Path:
    zip_path = job_dir / "agent_lee_3d_object_package.zip"

    include_names = [
        "model.obj",
        "model.mtl",
        "model.glb",
        "texture.png",
        "height.png",
        "input.png",
        "receipt.json",
        "viewer.html",
        "GLB_NOT_CREATED_YET.txt",
    ]

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name in include_names:
            p = job_dir / name
            if p.exists():
                z.write(p, arcname=name)

    return zip_path


def create_viewer_html(job_dir: Path, job_id: str) -> Path:
    viewer_path = job_dir / "viewer.html"

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agent Lee 3D Object - {job_id}</title>
  <style>
    body {{
      margin: 0;
      background: #090909;
      color: #f4f4f4;
      font-family: Arial, sans-serif;
    }}
    header {{
      padding: 16px;
      background: #111;
      border-bottom: 1px solid #333;
    }}
    main {{
      padding: 16px;
      display: grid;
      grid-template-columns: 420px 1fr;
      gap: 18px;
    }}
    img {{
      max-width: 100%;
      border: 1px solid #333;
      border-radius: 10px;
      background: #000;
    }}
    a {{
      color: #7cc7ff;
      display: block;
      margin: 8px 0;
      font-size: 16px;
    }}
    .card {{
      background: #141414;
      border: 1px solid #303030;
      border-radius: 12px;
      padding: 16px;
    }}
    code {{
      color: #d6ff7c;
      word-break: break-all;
    }}
  </style>
</head>
<body>
  <header>
    <h1>Agent Lee 3D Object</h1>
    <div>Job ID: <code>{job_id}</code></div>
  </header>
  <main>
    <section class="card">
      <h2>Texture / Source Preview</h2>
      <img src="./texture.png" alt="Agent Lee 3D object texture" />
    </section>
    <section class="card">
      <h2>Downloads</h2>
      <a href="./agent_lee_3d_object_package.zip" download>Download full 3D package ZIP</a>
      <a href="./model.obj" download>Download model.obj</a>
      <a href="./model.mtl" download>Download model.mtl</a>
      <a href="./texture.png" download>Download texture.png</a>
      <a href="./height.png" download>Download height.png</a>
      <a href="./input.png" download>Download source input.png</a>
      <a href="./receipt.json" download>Download receipt.json</a>
      <p>This is the current Agent Lee pattern-based 3D relief object. OBJ + MTL + texture can be opened in Blender, Windows 3D Viewer, Three.js tooling, and many 3D apps.</p>
    </section>
  </main>
</body>
</html>
"""

    viewer_path.write_text(html, encoding="utf-8")
    return viewer_path


def create_glb_from_obj(job_dir: Path) -> Path:
    obj_path = job_dir / "model.obj"
    glb_path = job_dir / "model.glb"

    if not obj_path.exists():
        raise FileNotFoundError(f"OBJ not found for GLB export: {obj_path}")

    loaded = trimesh.load(str(obj_path), force="scene")
    loaded.export(str(glb_path))
    return glb_path


def enrich_receipt_links(receipt: Dict, request: Request, job_id: str, job_dir: Path) -> Dict:
    base = public_base_url(request)

    create_viewer_html(job_dir, job_id)
    create_object_zip(job_dir)

    receipt["links"] = {
        "viewer": f"{base}/artifacts/{job_id}/viewer.html",
        "download_zip": f"{base}/artifacts/{job_id}/agent_lee_3d_object_package.zip",
        "obj": f"{base}/artifacts/{job_id}/model.obj",
        "mtl": f"{base}/artifacts/{job_id}/model.mtl",
        "texture": f"{base}/artifacts/{job_id}/texture.png",
        "height": f"{base}/artifacts/{job_id}/height.png",
        "input": f"{base}/artifacts/{job_id}/input.png",
        "receipt": f"{base}/artifacts/{job_id}/receipt.json",
        "latest_viewer": f"{base}/latest/viewer.html",
        "latest_zip": f"{base}/latest/object.zip",
        "latest_obj": f"{base}/latest/model.obj",
        "latest_texture": f"{base}/latest/texture.png",
    }

    glb = job_dir / "model.glb"
    if glb.exists():
        receipt["links"]["glb"] = f"{base}/artifacts/{job_id}/model.glb"
        receipt["links"]["latest_glb"] = f"{base}/latest/model.glb"

    receipt["telegram_ready"] = {
        "message": "Agent Lee 3D object is ready.",
        "send_files": [
            str(job_dir / "agent_lee_3d_object_package.zip"),
            str(job_dir / "model.obj"),
            str(job_dir / "model.mtl"),
            str(job_dir / "texture.png"),
            str(job_dir / "viewer.html"),
        ],
        "note": "For phone access outside this PC, Telegram should upload the files directly or use a LAN/ngrok/public URL.",
    }

    return receipt

'@

  $Text = $Text.Replace("@app.get(`"/health`")", $Helpers + "`n@app.get(`"/health`")")
}

# Replace duplicate/old create_glb_from_obj definition if it appears later and references undefined import is now fixed by import.
$Text = $Text.Replace(
  '"version": "1.1.0-pattern-relief-object-glb"',
  '"version": "1.2.0-pattern-relief-download-viewer-links"'
)
$Text = $Text.Replace(
  '"version": "1.0.0-pattern-relief-object"',
  '"version": "1.2.0-pattern-relief-download-viewer-links"'
)

# Change endpoint signatures to accept Request.
$Text = $Text.Replace(
  'def convert_from_path(req: ConvertFromPathRequest):',
  'def convert_from_path(req: ConvertFromPathRequest, request: Request):'
)
$Text = $Text.Replace(
  'def convert_latest_sdxl(req: ConvertLatestSDXLRequest):',
  'def convert_latest_sdxl(req: ConvertLatestSDXLRequest, request: Request):'
)

# Update calls to convert_image_to_3d to pass request.
$Text = $Text.Replace(
  'return convert_image_to_3d(
        source=req.image_path,
        character_id=req.character_id,
        depth_strength=req.depth_strength,
        grid_size=req.grid_size,
    )',
  'return convert_image_to_3d(
        source=req.image_path,
        character_id=req.character_id,
        depth_strength=req.depth_strength,
        grid_size=req.grid_size,
        request=request,
    )'
)

$Text = $Text.Replace(
  'return convert_image_to_3d(
        source=req.sdxl_latest_url,
        character_id=req.character_id,
        depth_strength=req.depth_strength,
        grid_size=req.grid_size,
    )',
  'return convert_image_to_3d(
        source=req.sdxl_latest_url,
        character_id=req.character_id,
        depth_strength=req.depth_strength,
        grid_size=req.grid_size,
        request=request,
    )'
)

# Change convert_image_to_3d signature.
$Text = $Text.Replace(
  'def convert_image_to_3d(source: str, character_id: str, depth_strength: float, grid_size: int):',
  'def convert_image_to_3d(source: str, character_id: str, depth_strength: float, grid_size: int, request: Request):'
)

# Ensure latest job is written after job_dir is made.
if ($Text -notmatch "write_latest_job\(job_id, job_dir\)") {
  $Text = $Text.Replace(
    'job_dir.mkdir(parents=True, exist_ok=True)',
    'job_dir.mkdir(parents=True, exist_ok=True)
    write_latest_job(job_id, job_dir)',
    1
  )
}

# Patch success receipt to enrich links before writing final receipt.
if ($Text -notmatch "receipt = enrich_receipt_links\(receipt, request, job_id, job_dir\)") {
  $Text = $Text.Replace(
    'write_receipt(job_dir, receipt)
        return receipt

    except Exception as e:',
    'receipt = enrich_receipt_links(receipt, request, job_id, job_dir)
        write_receipt(job_dir, receipt)
        return receipt

    except Exception as e:'
  )
}

# Add latest routes before artifact route.
if ($Text -notmatch '@app.get\("/latest/viewer.html"\)') {
  $LatestRoutes = @'

@app.get("/latest")
def latest_job(request: Request):
    data = read_latest_job()
    if not data:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_3D_JOB"})

    job_id = data.get("job_id")
    base = public_base_url(request)
    data["links"] = {
        "viewer": f"{base}/latest/viewer.html",
        "zip": f"{base}/latest/object.zip",
        "obj": f"{base}/latest/model.obj",
        "mtl": f"{base}/latest/model.mtl",
        "texture": f"{base}/latest/texture.png",
        "height": f"{base}/latest/height.png",
        "input": f"{base}/latest/input.png",
        "receipt": f"{base}/latest/receipt.json",
    }

    glb = ARTIFACT_ROOT / job_id / "model.glb"
    if glb.exists():
        data["links"]["glb"] = f"{base}/latest/model.glb"

    return data


def latest_file_response(filename: str):
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_3D_JOB"})

    job_dir = ARTIFACT_ROOT / job_id

    if filename == "object.zip":
        path = job_dir / "agent_lee_3d_object_package.zip"
    else:
        path = job_dir / filename

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_FILE_NOT_FOUND", "filename": filename, "job_id": job_id})

    return serve_file(path)


@app.get("/latest/viewer.html")
def latest_viewer():
    return latest_file_response("viewer.html")


@app.get("/latest/object.zip")
def latest_zip():
    return latest_file_response("object.zip")


@app.get("/latest/model.obj")
def latest_obj():
    return latest_file_response("model.obj")


@app.get("/latest/model.mtl")
def latest_mtl():
    return latest_file_response("model.mtl")


@app.get("/latest/model.glb")
def latest_glb():
    return latest_file_response("model.glb")


@app.get("/latest/texture.png")
def latest_texture():
    return latest_file_response("texture.png")


@app.get("/latest/height.png")
def latest_height():
    return latest_file_response("height.png")


@app.get("/latest/input.png")
def latest_input():
    return latest_file_response("input.png")


@app.get("/latest/receipt.json")
def latest_receipt():
    return latest_file_response("receipt.json")


def serve_file(path: Path):
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
    elif suffix == ".html":
        media = "text/html"
    elif suffix == ".zip":
        media = "application/zip"
    elif suffix == ".glb":
        media = "model/gltf-binary"

    return FileResponse(path, media_type=media, filename=path.name)

'@

  $Text = $Text.Replace('@app.get("/artifacts/{job_id}/{filename}")', $LatestRoutes + "`n@app.get(`"/artifacts/{job_id}/{filename}`")")
}

# Replace artifact route body return with serve_file when possible.
$Text = $Text.Replace(
  '    suffix = path.suffix.lower()

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

    return FileResponse(path, media_type=media, filename=safe_name)',
  '    return serve_file(path)'
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --init `
  --name $ContainerName `
  --network leeway-ecosystemv214_leeway-net `
  -p "8101:8101" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  $ImageName | Out-Null

Start-Sleep -Seconds 6

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8101/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_IMAGE_TO_3D_DOWNLOAD_VIEWER_LINKS_PATCHED"
  no_conversion_performed = $true
  fixes = @(
    "full clickable links in receipt",
    "latest viewer link",
    "latest downloadable zip",
    "artifact zip package",
    "Telegram-ready send file paths",
    "fixed trimesh import for GLB attempt"
  )
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_IMAGE_TO_3D_DOWNLOAD_VIEWER_LINKS_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Download/viewer links patch applied." -ForegroundColor Green
Write-Host "Status: http://127.0.0.1:8101/status" -ForegroundColor Cyan
Write-Host "Latest viewer: http://127.0.0.1:8101/latest/viewer.html" -ForegroundColor Cyan
Write-Host "Latest ZIP: http://127.0.0.1:8101/latest/object.zip" -ForegroundColor Cyan