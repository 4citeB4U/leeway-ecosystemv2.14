$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$SourcePack = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\source-pack-v1"
$Rejected = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\rejected-sources"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $SourcePack | Out-Null
New-Item -ItemType Directory -Force -Path $Rejected | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$Required = @(
  "front_view_full_body_plain_background.png",
  "left_side_view_full_body_plain_background.png",
  "right_side_view_full_body_plain_background.png",
  "back_view_full_body_plain_background.png"
)

# Move the failed separate-character files out of the source pack.
$RejectRun = Join-Path $Rejected "different_character_turnaround_rejected_$Stamp"
New-Item -ItemType Directory -Force -Path $RejectRun | Out-Null

foreach ($Name in $Required) {
  $Path = Join-Path $SourcePack $Name
  if (Test-Path $Path) {
    Move-Item -Force $Path (Join-Path $RejectRun $Name)
  }
}

$OldContact = Join-Path $SourcePack "turnaround_contact_sheet.png"
if (Test-Path $OldContact) {
  Copy-Item -Force $OldContact (Join-Path $RejectRun "turnaround_contact_sheet_REJECTED_different_characters.png")
}

Write-Host ""
Write-Host "Rejected old source-pack images because they are different characters." -ForegroundColor Yellow
Write-Host "Rejected folder: $RejectRun" -ForegroundColor Cyan

$ImageLaneBase = "http://127.0.0.1:8099"

try {
  $Status = Invoke-RestMethod -Method Get -Uri "$ImageLaneBase/status" -TimeoutSec 60
  $Status | ConvertTo-Json -Depth 80 | Out-Host
} catch {
  throw "SDXL image lane is not reachable at $ImageLaneBase"
}

$SheetPath = Join-Path $SourcePack "agent_lee_single_turnaround_sheet.png"

$Prompt = @"
single character turnaround sheet, same exact character repeated four times, front view, left side view, right side view, back view, Agent Lee dragon dog man warrior, red dragon head, curved horns, red leathery bat dragon wings, long reptile dragon tail, black and dark blue scaled armor, red armor plates, visible sword, clawed feet, full body, plain gray background, 3D game character model sheet, clean studio lighting, consistent design
"@

$Negative = @"
different characters, multiple designs, inconsistent armor, inconsistent face, inconsistent horns, inconsistent wings, feather wings, bird wings, angel wings, feather tail, missing sword, missing tail, missing wings, cropped body, cropped feet, castle, archway, scenery, cinematic poster, action pose, fog, smoke, floor shadow, text, logo, watermark, block, blob, relief card
"@

$Body = @{
  prompt = $Prompt
  negative_prompt = $Negative
  width = 1536
  height = 768
  candidates = 1
  num_images = 1
  steps = 4
  guidance_scale = 0.0
} | ConvertTo-Json -Depth 30

$Result = $null
$CallError = $null

try {
  Write-Host ""
  Write-Host "Generating ONE single turnaround sheet instead of four separate characters..." -ForegroundColor Green

  $Result = Invoke-RestMethod `
    -Method Post `
    -Uri "$ImageLaneBase/image/generate-fast" `
    -Body $Body `
    -ContentType "application/json" `
    -TimeoutSec 1200

  $Result | ConvertTo-Json -Depth 100 | Out-Host
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

  $JobId = $null
  if ($Result.job_id) { $JobId = $Result.job_id }
  if (-not $JobId -and $Result.jobId) { $JobId = $Result.jobId }
  if (-not $JobId -and $Result.id) { $JobId = $Result.id }

  if ($JobId) {
    $CandidateUrls += "$ImageLaneBase/artifacts/$JobId/image.png"
    $CandidateUrls += "$ImageLaneBase/artifacts/$JobId/candidate_1.png"
  }
}

$CandidateUrls += "$ImageLaneBase/latest/image.png"
$CandidateUrls += "$ImageLaneBase/latest/candidate_1.png"

$Saved = $false
$SavedFrom = $null

foreach ($Url in $CandidateUrls) {
  if (-not $Url) { continue }
  if ($Url.StartsWith("/")) { $Url = "$ImageLaneBase$Url" }

  try {
    Write-Host "Trying download: $Url" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $Url -OutFile $SheetPath -TimeoutSec 300

    if ((Test-Path $SheetPath) -and ((Get-Item $SheetPath).Length -gt 10000)) {
      $Saved = $true
      $SavedFrom = $Url
      break
    }
  }
  catch {
    Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

if (-not $Saved) {
  throw "Single turnaround sheet was not saved."
}

$SplitPy = Join-Path $SourcePack "split_single_turnaround_sheet.py"

@'
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

source_pack = Path(sys.argv[1])
sheet_path = Path(sys.argv[2])

sheet = Image.open(sheet_path).convert("RGB")
w, h = sheet.size

names = [
    "front_view_full_body_plain_background.png",
    "left_side_view_full_body_plain_background.png",
    "right_side_view_full_body_plain_background.png",
    "back_view_full_body_plain_background.png",
]

# Split into four equal vertical panels.
panel_w = w // 4
outputs = []

for i, name in enumerate(names):
    left = i * panel_w
    right = (i + 1) * panel_w if i < 3 else w
    panel = sheet.crop((left, 0, right, h))

    # Normalize each panel to 768x1024 with gray background.
    target_w, target_h = 768, 1024
    panel = ImageOps.contain(panel, (target_w, target_h), Image.LANCZOS)

    canvas = Image.new("RGB", (target_w, target_h), (128, 128, 128))
    ox = (target_w - panel.width) // 2
    oy = (target_h - panel.height) // 2
    canvas.paste(panel, (ox, oy))

    out = source_pack / name
    canvas.save(out, quality=95)

    outputs.append({
        "name": name,
        "path": str(out),
        "exists": out.exists(),
        "size_bytes": out.stat().st_size if out.exists() else 0
    })

# Create a new contact sheet from the split files.
thumb_w, thumb_h = 384, 512
label_h = 56
contact = Image.new("RGB", (thumb_w * 4, thumb_h + label_h), (30, 30, 30))
draw = ImageDraw.Draw(contact)

for i, name in enumerate(names):
    img = Image.open(source_pack / name).convert("RGB")
    img.thumbnail((thumb_w, thumb_h), Image.LANCZOS)

    bg = Image.new("RGB", (thumb_w, thumb_h), (52, 52, 52))
    x = i * thumb_w
    ox = (thumb_w - img.width) // 2
    oy = (thumb_h - img.height) // 2
    bg.paste(img, (ox, oy))

    contact.paste(bg, (x, 0))
    draw.rectangle([x, thumb_h, x + thumb_w, thumb_h + label_h], fill=(10, 10, 10))
    draw.text((x + 8, thumb_h + 8), name.replace("_plain_background.png", ""), fill=(255, 255, 255))

contact_path = source_pack / "turnaround_contact_sheet_single_split.png"
contact.save(contact_path, quality=95)

report = {
    "verdict": "SINGLE_TURNAROUND_SHEET_SPLIT_INTO_REQUIRED_SOURCE_FILES",
    "sheet": str(sheet_path),
    "outputs": outputs,
    "contact_sheet": str(contact_path),
    "manual_acceptance_required": True,
    "accept_only_if": [
        "same character across all four panels",
        "front/left/right/back are distinguishable",
        "wings are leathery dragon wings",
        "tail is reptile tail, not feathers",
        "sword is visible or clearly carried",
        "full body visible",
        "plain background"
    ],
    "reject_if": [
        "four different characters",
        "all panels are front views",
        "missing sword everywhere",
        "feather wings or feather tail",
        "cropped body",
        "castle/background scene"
    ]
}

print(json.dumps(report, indent=2))
'@ | Set-Content -Path $SplitPy -Encoding UTF8

python -m pip install --quiet pillow

$SplitJson = python $SplitPy $SourcePack $SheetPath

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SINGLE_TURNAROUND_SHEET_SPLIT_$Stamp.receipt.json"
$SplitJson | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Single-sheet turnaround split complete." -ForegroundColor Green
Write-Host "Sheet: $SheetPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

Start-Process $SheetPath
Start-Process (Join-Path $SourcePack "turnaround_contact_sheet_single_split.png")
notepad $ReceiptPath
explorer $SourcePack