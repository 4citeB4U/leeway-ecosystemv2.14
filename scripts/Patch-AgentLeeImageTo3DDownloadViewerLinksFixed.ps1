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
if ($Req -notmatch "(?m)^trimesh\s*$") {
  Add-Content -Path $Requirements -Value "trimesh"
}

$Text = Get-Content $MainPy -Raw

# Required imports.
if ($Text -notmatch "(?m)^import zipfile$") {
  $Text = $Text.Replace("import uuid`n", "import uuid`nimport zipfile`n")
}

if ($Text -notmatch "(?m)^import trimesh$") {
  $Text = $Text.Replace("import requests`n", "import requests`nimport trimesh`n")
}

# Replace FastAPI import cleanly.
$Text = $Text.Replace("from fastapi import FastAPI, Request, Request", "from fastapi import FastAPI, Request")
$Text = $Text.Replace("from fastapi import FastAPI, Request", "from fastapi import FastAPI, Request")
$Text = $Text.Replace("from fastapi import FastAPI`n", "from fastapi import FastAPI, Request`n")

# Add latest job pointer.
if ($Text -notmatch "LATEST_JOB_FILE") {
  $Text = $Text.Replace(
    "ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)",
    "ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)`nLATEST_JOB_FILE = ARTIFACT_ROOT / `"latest_3d_job.json`""
  )
}

# Upgrade version labels.
$Text = $Text.Replace("1.0.0-pattern-relief-object", "1.2.0-pattern-relief-download-viewer-links")
$Text = $Text.Replace("1.1.0-pattern-relief-object-glb", "1.2.0-pattern-relief-download-viewer-links")

# Add helper functions and latest routes once.
if ($Text -notmatch "def create_object_zip") {
$Append = @'

# ---------------------------------------------------------------------
# Agent Lee download/viewer/latest-link helpers
# ---------------------------------------------------------------------

def _agent_lee_public_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _agent_lee_write_latest_job(job_id: str, job_dir: Path) -> None:
    data = {
        "job_id": job_id,
        "job_dir": str(job_dir),
        "updated_at": now_iso(),
    }
    LATEST_JOB_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _agent_lee_read_latest_job() -> Dict:
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


def _agent_lee_media_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".json":
        return "application/json"
    if suffix == ".png":
        return "image/png"
    if suffix in [".jpg", ".jpeg"]:
        return "image/jpeg"
    if suffix == ".obj":
        return "text/plain"
    if suffix == ".mtl":
        return "text/plain"
    if suffix == ".html":
        return "text/html"
    if suffix == ".zip":
        return "application/zip"
    if suffix == ".glb":
        return "model/gltf-binary"
    if suffix == ".txt":
        return "text/plain"
    return "application/octet-stream"


def _agent_lee_file_response(path: Path):
    return FileResponse(path, media_type=_agent_lee_media_type(path), filename=path.name)


@app.get("/latest")
def agent_lee_latest_job(request: Request):
    data = _agent_lee_read_latest_job()
    if not data:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_3D_JOB"})

    base = _agent_lee_public_base_url(request)
    data["links"] = {
        "viewer": f"{base}/latest/viewer.html",
        "download_zip": f"{base}/latest/object.zip",
        "obj": f"{base}/latest/model.obj",
        "mtl": f"{base}/latest/model.mtl",
        "texture": f"{base}/latest/texture.png",
        "height": f"{base}/latest/height.png",
        "input": f"{base}/latest/input.png",
        "receipt": f"{base}/latest/receipt.json",
    }
    return data


def _agent_lee_latest_file(filename: str):
    data = _agent_lee_read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_3D_JOB"})

    job_dir = ARTIFACT_ROOT / job_id
    actual = "agent_lee_3d_object_package.zip" if filename == "object.zip" else filename
    path = job_dir / actual

    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_FILE_NOT_FOUND", "filename": filename, "job_id": job_id})

    return _agent_lee_file_response(path)


@app.get("/latest/viewer.html")
def agent_lee_latest_viewer():
    return _agent_lee_latest_file("viewer.html")


@app.get("/latest/object.zip")
def agent_lee_latest_zip():
    return _agent_lee_latest_file("object.zip")


@app.get("/latest/model.obj")
def agent_lee_latest_obj():
    return _agent_lee_latest_file("model.obj")


@app.get("/latest/model.mtl")
def agent_lee_latest_mtl():
    return _agent_lee_latest_file("model.mtl")


@app.get("/latest/model.glb")
def agent_lee_latest_glb():
    return _agent_lee_latest_file("model.glb")


@app.get("/latest/texture.png")
def agent_lee_latest_texture():
    return _agent_lee_latest_file("texture.png")


@app.get("/latest/height.png")
def agent_lee_latest_height():
    return _agent_lee_latest_file("height.png")


@app.get("/latest/input.png")
def agent_lee_latest_input():
    return _agent_lee_latest_file("input.png")


@app.get("/latest/receipt.json")
def agent_lee_latest_receipt():
    return _agent_lee_latest_file("receipt.json")

'@

  Add-Content -Path $MainPy -Value $Append -Encoding UTF8
}

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
  verdict = "AGENT_LEE_IMAGE_TO_3D_DOWNLOAD_VIEWER_LINKS_FIXED_PATCHED"
  no_conversion_performed = $true
  fixes = @(
    "removed invalid three-argument PowerShell Replace",
    "added viewer HTML creator",
    "added ZIP package creator",
    "added latest routes",
    "fixed trimesh import",
    "prepared latest downloadable object links"
  )
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_IMAGE_TO_3D_DOWNLOAD_VIEWER_LINKS_FIXED_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Download/viewer fixed patch applied." -ForegroundColor Green
Write-Host "Status: http://127.0.0.1:8101/status" -ForegroundColor Cyan
Write-Host "Latest viewer: http://127.0.0.1:8101/latest/viewer.html" -ForegroundColor Cyan
Write-Host "Latest ZIP: http://127.0.0.1:8101/latest/object.zip" -ForegroundColor Cyan