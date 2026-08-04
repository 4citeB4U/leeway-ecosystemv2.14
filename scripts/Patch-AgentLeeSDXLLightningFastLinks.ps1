$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$ContainerName = "agent-lee-sdxl-lightning-image-lane"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

$Text = Get-Content $MainPy -Raw

if ($Text -notmatch "(?m)^import shutil$") {
  $Text = $Text.Replace("import re`n", "import re`nimport shutil`n")
}

if ($Text -notmatch "LATEST_JOB_FILE") {
  $Text = $Text.Replace(
    "ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)",
    "ARTIFACT_ROOT.mkdir(parents=True, exist_ok=True)`nLATEST_JOB_FILE = ARTIFACT_ROOT / `"latest_job.json`""
  )
}

if ($Text -notmatch "def write_latest_job") {
  $Insert = @'

def write_latest_job(job_id: str, job_dir: Path) -> None:
    data = {
        "job_id": job_id,
        "job_dir": str(job_dir),
        "image_url": f"/artifacts/{job_id}/image.png",
        "candidate_url": f"/artifacts/{job_id}/candidate_1.png",
        "receipt_url": f"/artifacts/{job_id}/receipt.json",
        "updated_at": now_iso(),
    }
    LATEST_JOB_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_latest_job() -> Dict[str, Any]:
    if not LATEST_JOB_FILE.exists():
        return {}
    try:
        return json.loads(LATEST_JOB_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

'@

  $Text = $Text.Replace("def load_pipe():", $Insert + "`ndef load_pipe():")
}

# Make version visible.
$Text = $Text.Replace(
  '"version": "2.1.1-sdxl-lightning-safe-receipt"',
  '"version": "2.1.2-sdxl-lightning-fast-links"'
)

# Add fast endpoint before the existing /image/generate endpoint.
if ($Text -notmatch '@app.post\("/image/generate-fast"\)') {
  $FastEndpoint = @'

@app.post("/image/generate-fast")
def image_generate_fast(req: ImageGenerateRequest):
    job_id = str(uuid.uuid4())
    job_dir = ARTIFACT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    write_latest_job(job_id, job_dir)

    width = normalize_size(req.width, 512)
    height = normalize_size(req.height, 768)

    final_prompt = handcrafted_compact_prompt(req.prompt)
    negative_prompt = build_negative_prompt()

    out_path = job_dir / "candidate_1.png"
    final_path = job_dir / "image.png"
    receipt_path = job_dir / "receipt.json"

    started_at = now_iso()

    try:
        generation = generate_one(
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            out_path=out_path,
            width=width,
            height=height,
            seed=req.seed,
        )

        shutil.copyfile(out_path, final_path)

        receipt = {
            "ok": True,
            "verdict": "IMAGE_GENERATED_FAST_MODE",
            "job_id": job_id,
            "app": APP_NAME,
            "version": "2.1.2-sdxl-lightning-fast-links",
            "mode": "fast_no_qwen_review",
            "active_live_model": ACTIVE_MODEL,
            "image_generator": "ByteDance/SDXL-Lightning 4-step LoRA",
            "original_prompt": req.prompt,
            "planned_prompt": final_prompt,
            "negative_prompt": negative_prompt,
            "generation": generation,
            "image_path": str(final_path),
            "candidate_path": str(out_path),
            "image_url": f"/artifacts/{job_id}/image.png",
            "candidate_url": f"/artifacts/{job_id}/candidate_1.png",
            "receipt_url": f"/artifacts/{job_id}/receipt.json",
            "latest_image_url": "/latest/image.png",
            "latest_receipt_url": "/latest/receipt.json",
            "qwen_review": "skipped_for_speed",
            "three_d_lanes_touched": False,
            "started_at": started_at,
            "created_at": now_iso(),
        }

        receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return receipt

    except Exception as e:
        error_receipt = {
            "ok": False,
            "verdict": "IMAGE_GENERATION_ERROR",
            "job_id": job_id,
            "app": APP_NAME,
            "version": "2.1.2-sdxl-lightning-fast-links",
            "mode": "fast_no_qwen_review",
            "error": str(e),
            "original_prompt": req.prompt,
            "planned_prompt": final_prompt,
            "image_url": f"/artifacts/{job_id}/image.png",
            "candidate_url": f"/artifacts/{job_id}/candidate_1.png",
            "receipt_url": f"/artifacts/{job_id}/receipt.json",
            "latest_image_url": "/latest/image.png",
            "latest_receipt_url": "/latest/receipt.json",
            "three_d_lanes_touched": False,
            "started_at": started_at,
            "created_at": now_iso(),
        }
        receipt_path.write_text(json.dumps(error_receipt, indent=2), encoding="utf-8")
        return JSONResponse(status_code=500, content=error_receipt)

'@

  $Text = $Text.Replace('@app.post("/image/generate")', $FastEndpoint + "`n@app.post(`"/image/generate`")")
}

# Add latest routes before artifact route.
if ($Text -notmatch '@app.get\("/latest/image.png"\)') {
  $LatestRoutes = @'

@app.get("/latest")
def latest_job():
    data = read_latest_job()
    if not data:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    return data


@app.get("/latest/image.png")
def latest_image():
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    path = ARTIFACT_ROOT / job_id / "image.png"
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_IMAGE_NOT_FOUND", "job_id": job_id})
    return FileResponse(path, media_type="image/png", filename="image.png")


@app.get("/latest/candidate_1.png")
def latest_candidate():
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    path = ARTIFACT_ROOT / job_id / "candidate_1.png"
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_CANDIDATE_NOT_FOUND", "job_id": job_id})
    return FileResponse(path, media_type="image/png", filename="candidate_1.png")


@app.get("/latest/receipt.json")
def latest_receipt():
    data = read_latest_job()
    job_id = data.get("job_id")
    if not job_id:
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_JOB"})
    path = ARTIFACT_ROOT / job_id / "receipt.json"
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "LATEST_RECEIPT_NOT_FOUND", "job_id": job_id})
    return FileResponse(path, media_type="application/json", filename="receipt.json")

'@

  $Text = $Text.Replace('@app.get("/artifacts/{job_id}/{filename}")', $LatestRoutes + "`n@app.get(`"/artifacts/{job_id}/{filename}`")")
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
  --gpus all `
  --network leeway-ecosystemv214_leeway-net `
  -p "8099:8095" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA-UltraLowMemory" `
  -e "AGENT_LEE_SDXL_BASE_MODEL=stabilityai/stable-diffusion-xl-base-1.0" `
  -e "AGENT_LEE_LIGHTNING_REPO=ByteDance/SDXL-Lightning" `
  -e "AGENT_LEE_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors" `
  -e "AGENT_LEE_LIGHTNING_STEPS=4" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "HF_HUB_CACHE=/models/huggingface/hub" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest" `
  -e "AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b" `
  $ImageName | Out-Null

Start-Sleep -Seconds 8

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_SDXL_LIGHTNING_FAST_LINKS_PATCHED"
  no_image_generation_performed = $true
  fixes = @(
    "added /image/generate-fast endpoint",
    "added /latest/image.png",
    "added /latest/candidate_1.png",
    "added /latest/receipt.json",
    "returns job_id before review",
    "skips Qwen review in fast mode",
    "writes image and receipt immediately"
  )
  target_speed = "under 2 minutes after warmup at 512x768"
  three_d_lanes_touched = $false
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SDXL_LIGHTNING_FAST_LINKS_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Fast links patch applied." -ForegroundColor Green
Write-Host "Status: http://127.0.0.1:8099/status" -ForegroundColor Cyan
Write-Host "Fast endpoint: http://127.0.0.1:8099/image/generate-fast" -ForegroundColor Cyan
Write-Host "Latest image: http://127.0.0.1:8099/latest/image.png" -ForegroundColor Cyan
Write-Host "3D lanes were not touched." -ForegroundColor Yellow