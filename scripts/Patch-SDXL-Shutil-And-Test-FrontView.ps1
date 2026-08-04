$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$SourcePack = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\source-pack-v1"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Models = Join-Path $Root "models"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"

New-Item -ItemType Directory -Force -Path $SourcePack | Out-Null
New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null
New-Item -ItemType Directory -Force -Path $Models | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $ServiceRoot)) {
  throw "Missing SDXL service root: $ServiceRoot"
}

$MainPy = Join-Path $ServiceRoot "app\main.py"

if (-not (Test-Path $MainPy)) {
  $MainPy = Get-ChildItem $ServiceRoot -Recurse -Filter "main.py" | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $MainPy) {
  throw "Could not find SDXL app main.py under $ServiceRoot"
}

Write-Host "Patching SDXL main.py:" -ForegroundColor Cyan
Write-Host $MainPy -ForegroundColor Cyan

$Text = Get-Content $MainPy -Raw

if ($Text -notmatch "(?m)^import shutil\b") {
  if ($Text -match "(?m)^import os\b") {
    $Text = $Text -replace "(?m)^import os\b", "import os`r`nimport shutil"
  } else {
    $Text = "import shutil`r`n" + $Text
  }

  Set-Content -Path $MainPy -Value $Text -Encoding UTF8
  Write-Host "Added missing import shutil." -ForegroundColor Green
} else {
  Write-Host "import shutil already present." -ForegroundColor Green
}

Write-Host ""
Write-Host "Rebuilding existing SDXL image lane image..." -ForegroundColor Cyan

docker build -t agent-lee-sdxl-lightning-image-lane:local $ServiceRoot

Write-Host ""
Write-Host "Recreating only the SDXL image lane. Other live lanes stay up." -ForegroundColor Cyan

docker rm -f agent-lee-sdxl-lightning-image-lane 2>$null

docker run -d `
  --init `
  --name agent-lee-sdxl-lightning-image-lane `
  --gpus all `
  --network leeway-ecosystemv214_leeway-net `
  -p "8099:8095" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  --mount "type=bind,source=$Models,target=/models" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "TORCH_HOME=/models/torch" `
  agent-lee-sdxl-lightning-image-lane:local

Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Checking patched SDXL lane..." -ForegroundColor Cyan

Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 60 |
  ConvertTo-Json -Depth 100 |
  Out-Host

$Prompt = "front view full body Agent Lee dragon dog man warrior, black blue scaled armor, red dragon wings, curved horns, long tail, sword, clawed feet, plain gray background, centered, 3D character model sheet"
$Negative = "castle, archway, scenery, background dragon, cropped body, missing wings, missing sword, missing tail, missing feet, extra limbs, blurry, block, blob, relief card, poster"

$Body = @{
  prompt = $Prompt
  negative_prompt = $Negative
  width = 768
  height = 1024
  candidates = 1
  num_images = 1
  steps = 4
  guidance_scale = 0.0
} | ConvertTo-Json -Depth 30

$OutPath = Join-Path $SourcePack "front_view_full_body_plain_background.png"
$ReceiptPath = Join-Path $Proof ("SDXL_FRONT_VIEW_PATCH_TEST_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")

$Result = $null
$CallError = $null

try {
  Write-Host ""
  Write-Host "Requesting compact front-view source image..." -ForegroundColor Green

  $Result = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8099/image/generate-fast" `
    -Body $Body `
    -ContentType "application/json" `
    -TimeoutSec 1200

  $Result | ConvertTo-Json -Depth 100 | Out-Host
}
catch {
  $CallError = $_.Exception.Message
  Write-Host ""
  Write-Host "Generate endpoint returned an error, but we will still check artifacts." -ForegroundColor Yellow
  Write-Host $CallError -ForegroundColor Yellow
}

$CandidateUrls = @()

if ($Result) {
  if ($Result.image_url) { $CandidateUrls += $Result.image_url }
  if ($Result.url) { $CandidateUrls += $Result.url }
  if ($Result.output_url) { $CandidateUrls += $Result.output_url }

  if ($Result.links) {
    if ($Result.links.image) { $CandidateUrls += $Result.links.image }
    if ($Result.links.candidate_1) { $CandidateUrls += $Result.links.candidate_1 }
  }

  $JobId = $null
  if ($Result.job_id) { $JobId = $Result.job_id }
  if (-not $JobId -and $Result.jobId) { $JobId = $Result.jobId }
  if (-not $JobId -and $Result.id) { $JobId = $Result.id }

  if ($JobId) {
    $CandidateUrls += "http://127.0.0.1:8099/artifacts/$JobId/candidate_1.png"
    $CandidateUrls += "http://127.0.0.1:8099/artifacts/$JobId/image.png"
  }
}

$CandidateUrls += "http://127.0.0.1:8099/latest/candidate_1.png"
$CandidateUrls += "http://127.0.0.1:8099/latest/image.png"

$Saved = $false
$SavedFrom = $null
$DownloadErrors = @()

foreach ($Url in $CandidateUrls) {
  if (-not $Url) { continue }
  if ($Url.StartsWith("/")) { $Url = "http://127.0.0.1:8099$Url" }

  try {
    Write-Host "Trying artifact download: $Url" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $Url -OutFile $OutPath -TimeoutSec 300

    if ((Test-Path $OutPath) -and ((Get-Item $OutPath).Length -gt 10000)) {
      $Saved = $true
      $SavedFrom = $Url
      break
    }
  }
  catch {
    $DownloadErrors += @{
      url = $Url
      error = $_.Exception.Message
    }
  }
}

$LatestReceipt = $null
try {
  $LatestReceipt = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/latest/receipt.json" -TimeoutSec 60
} catch {}

$ContainerState = docker inspect agent-lee-sdxl-lightning-image-lane `
  --format "Status={{.State.Status}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}} Error={{.State.Error}}"

$Receipt = @{
  verdict = if ($Saved) { "SDXL_FRONT_VIEW_SOURCE_CREATED_ARTIFACT_TOLERANT" } else { "SDXL_FRONT_VIEW_SOURCE_FAILED" }
  patched_main_py = $MainPy
  added_shutil_import = $true
  endpoint_error = $CallError
  saved = $Saved
  saved_from = $SavedFrom
  out_path = $OutPath
  latest_receipt = $LatestReceipt
  download_errors = $DownloadErrors
  container_state = $ContainerState
  note = "This keeps full-live lanes up and only patches/recreates the SDXL image lane."
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
if ($Saved) {
  Write-Host "Front view source image created." -ForegroundColor Green
  Write-Host $OutPath -ForegroundColor Cyan
  Start-Process $OutPath
} else {
  Write-Host "Front view source image was not saved." -ForegroundColor Red
  docker logs agent-lee-sdxl-lightning-image-lane --tail 200
}

Write-Host ""
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
notepad $ReceiptPath