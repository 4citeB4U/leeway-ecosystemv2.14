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

$MainPy = Join-Path $ServiceRoot "app\main.py"

if (-not (Test-Path $MainPy)) {
  $MainPy = Get-ChildItem $ServiceRoot -Recurse -Filter "main.py" | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $MainPy) {
  throw "Could not find SDXL app main.py under $ServiceRoot"
}

Write-Host "Patching SDXL prompt discipline:" -ForegroundColor Cyan
Write-Host $MainPy -ForegroundColor Cyan

$Text = Get-Content $MainPy -Raw
$OriginalText = $Text

# Keep the previous shutil fix.
if ($Text -notmatch "(?m)^import shutil\b") {
  if ($Text -match "(?m)^import os\b") {
    $Text = $Text -replace "(?m)^import os\b", "import os`r`nimport shutil"
  } else {
    $Text = "import shutil`r`n" + $Text
  }
}

# Remove the bad fallback language that was reintroducing cinematic background.
$Text = $Text.Replace(
  "castle background, dark fantasy AAA concept art, dramatic rim lighting",
  "plain neutral gray background, clean 3D character model sheet, studio lighting"
)

$Text = $Text.Replace(
  "castle background , dark fantasy aaa concept art , dramatic rim lighting",
  "plain neutral gray background , clean 3d character model sheet , studio lighting"
)

$Text = $Text.Replace(
  "dark fantasy AAA concept art",
  "clean 3D character model sheet"
)

$Text = $Text.Replace(
  "dark fantasy aaa concept art",
  "clean 3d character model sheet"
)

$Text = $Text.Replace(
  "castle background",
  "plain neutral gray background"
)

$Text = $Text.Replace(
  "dramatic rim lighting",
  "neutral studio lighting"
)

# Strengthen negative prompt fallback.
$Text = $Text.Replace(
  "bad anatomy, malformed body, extra limbs, missing limbs, fused limbs, cropped, out of frame, toy, mascot, plush, chibi, cartoon, helmet, mask, human head, feather wings, angel wings, bird wings, missing tail, no wings, blurry, low quality, watermark, text, logo",
  "castle, archway, scenery, cinematic poster, background dragon, floor shadow, fog, smoke, cropped body, cropped wings, missing sword, missing tail, missing feet, missing wings, no wings, block, blob, relief card, bad anatomy, malformed body, extra limbs, missing limbs, fused limbs, blurry, low quality, watermark, text, logo"
)

if ($Text -ne $OriginalText) {
  Set-Content -Path $MainPy -Value $Text -Encoding UTF8
  Write-Host "SDXL prompt discipline patch applied." -ForegroundColor Green
} else {
  Write-Host "No text changes applied. main.py may already be patched or has different wording." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Rebuilding SDXL lane with prompt discipline patch..." -ForegroundColor Cyan

docker build -t agent-lee-sdxl-lightning-image-lane:local $ServiceRoot

Write-Host ""
Write-Host "Recreating only SDXL lane. Other Agent Lee live lanes stay up." -ForegroundColor Cyan

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

Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 60 |
  ConvertTo-Json -Depth 100 |
  Out-Host

function Invoke-SourceView {
  param(
    [string]$Name,
    [string]$Prompt,
    [string]$OutPath
  )

  $Negative = "castle, archway, scenery, cinematic poster, background dragon, floor shadow, fog, smoke, cropped body, cropped wings, missing sword, missing tail, missing feet, missing wings, no wings, block, blob, relief card, blurry, text, logo"

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

  $Result = $null
  $CallError = $null

  try {
    Write-Host ""
    Write-Host "Generating $Name..." -ForegroundColor Green

    $Result = Invoke-RestMethod `
      -Method Post `
      -Uri "http://127.0.0.1:8099/image/generate-fast" `
      -Body $Body `
      -ContentType "application/json" `
      -TimeoutSec 1200

    $Result | ConvertTo-Json -Depth 80 | Out-Host
  }
  catch {
    $CallError = $_.Exception.Message
    Write-Host "Endpoint returned error. Checking artifacts anyway..." -ForegroundColor Yellow
    Write-Host $CallError -ForegroundColor Yellow
  }

  $CandidateUrls = @()

  if ($Result) {
    if ($Result.image_url) { $CandidateUrls += $Result.image_url }
    if ($Result.candidate_url) { $CandidateUrls += $Result.candidate_url }
    if ($Result.url) { $CandidateUrls += $Result.url }

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

  foreach ($Url in $CandidateUrls) {
    if (-not $Url) { continue }
    if ($Url.StartsWith("/")) { $Url = "http://127.0.0.1:8099$Url" }

    try {
      Write-Host "Trying download: $Url" -ForegroundColor Cyan
      Invoke-WebRequest -Uri $Url -OutFile $OutPath -TimeoutSec 300

      if ((Test-Path $OutPath) -and ((Get-Item $OutPath).Length -gt 10000)) {
        $Saved = $true
        $SavedFrom = $Url
        break
      }
    }
    catch {}
  }

  $LatestReceipt = $null
  try {
    $LatestReceipt = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/latest/receipt.json" -TimeoutSec 60
  } catch {}

  return @{
    name = $Name
    out_path = $OutPath
    saved = $Saved
    saved_from = $SavedFrom
    endpoint_error = $CallError
    result = $Result
    latest_receipt = $LatestReceipt
  }
}

$Views = @(
  @{
    file = "front_view_full_body_plain_background.png"
    prompt = "front view full body Agent Lee dragon dog man warrior, black blue scaled armor, red dragon wings, curved horns, long tail, sword, clawed feet, plain gray background, centered, 3D character model sheet"
  },
  @{
    file = "left_side_view_full_body_plain_background.png"
    prompt = "left side profile full body Agent Lee dragon dog man warrior, black blue scaled armor, red dragon wing visible, curved horns, long tail, sword, clawed feet, plain gray background, centered, 3D character model sheet"
  },
  @{
    file = "right_side_view_full_body_plain_background.png"
    prompt = "right side profile full body Agent Lee dragon dog man warrior, black blue scaled armor, red dragon wing visible, curved horns, long tail, sword, clawed feet, plain gray background, centered, 3D character model sheet"
  },
  @{
    file = "back_view_full_body_plain_background.png"
    prompt = "back view full body Agent Lee dragon dog man warrior, black blue scaled armor, red dragon wings fully visible, curved horns, long tail, sword, clawed feet, plain gray background, centered, 3D character model sheet"
  }
)

$Outputs = @()

foreach ($View in $Views) {
  $OutPath = Join-Path $SourcePack $View.file

  $Outputs += Invoke-SourceView `
    -Name $View.file `
    -Prompt $View.prompt `
    -OutPath $OutPath

  Start-Sleep -Seconds 5
}

$Missing = @()
foreach ($View in $Views) {
  $Path = Join-Path $SourcePack $View.file
  if (-not (Test-Path $Path)) {
    $Missing += $View.file
  }
}

$Receipt = @{
  verdict = if ($Missing.Count -eq 0) { "AGENT_LEE_TURNAROUND_SOURCE_PACK_CREATED_PATCHED_SDXL" } else { "AGENT_LEE_TURNAROUND_SOURCE_PACK_INCOMPLETE_PATCHED_SDXL" }
  source_pack_folder = $SourcePack
  missing = $Missing
  outputs = $Outputs
  note = "Full-live policy preserved. Only SDXL lane was patched/recreated. Heavy image jobs ran serially."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof ("AGENT_LEE_TURNAROUND_SOURCE_PACK_PATCHED_SDXL_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
if ($Missing.Count -eq 0) {
  Write-Host "Turnaround source pack created." -ForegroundColor Green
} else {
  Write-Host "Turnaround source pack incomplete." -ForegroundColor Yellow
  $Missing | ForEach-Object { Write-Host "Missing: $_" -ForegroundColor Yellow }
}

Write-Host "Source pack: $SourcePack" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

explorer $SourcePack
notepad $ReceiptPath