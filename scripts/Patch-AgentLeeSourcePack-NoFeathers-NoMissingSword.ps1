$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$SourcePack = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\source-pack-v1"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $SourcePack | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$PromptFile = Join-Path $SourcePack "PROMPT_create_clean_agent_lee_turnaround.txt"
$NegativeFile = Join-Path $SourcePack "NEGATIVE_create_clean_agent_lee_turnaround.txt"
$StandardFile = Join-Path $SourcePack "AGENT_LEE_TRUE_3D_SOURCE_STANDARD.json"

$Prompt = @"
Create a clean 3D character turnaround sheet for Agent Lee.

Agent Lee is a full-body hybrid dragon, dog, and man warrior.
He has a muscular humanoid torso, canine legs, clawed feet, curved horns, dragon face, dark black and blue scaled armor, large red leathery bat-like dragon wings, a long reptile dragon tail, and a visible sword.

Required files:
front_view_full_body_plain_background.png
left_side_view_full_body_plain_background.png
right_side_view_full_body_plain_background.png
back_view_full_body_plain_background.png

Strict visual rules:
- Full body from horns to feet.
- Plain neutral gray background.
- Clean studio lighting.
- No scenery.
- No castle.
- No archway.
- No floor shadow.
- No feather wings.
- No bird feathers.
- No feather tail.
- No missing sword.
- No missing tail.
- No cropped wings.
- No cropped feet.
- No poster composition.
- No red block/blob/relief-card output.

The wings must look like leathery dragon/bat wings, not bird wings.
The tail must look like a reptile dragon tail, not feathers.
The sword must be visible in every view where possible.
"@

$Negative = @"
castle, archway, city, scenery, cinematic poster, background dragon, floor shadow, fog, smoke, reflection, cropped body, cropped wings, cropped feet, missing sword, missing tail, missing feet, missing wings, feather wings, bird wings, angel wings, feather tail, bird tail, harpy, bird monster, extra wings, extra limbs, blob, block, cube, red rectangle, relief card, wall, background merged with wings, text, logo, watermark, blurry, low quality
"@

$Prompt | Set-Content -Path $PromptFile -Encoding UTF8
$Negative | Set-Content -Path $NegativeFile -Encoding UTF8

$Standard = @{
  verdict = "AGENT_LEE_SOURCE_PACK_STANDARD_PATCHED_NO_FEATHERS_NO_MISSING_SWORD"
  required_files = @(
    "front_view_full_body_plain_background.png",
    "left_side_view_full_body_plain_background.png",
    "right_side_view_full_body_plain_background.png",
    "back_view_full_body_plain_background.png"
  )
  reject_if = @(
    "feather wings",
    "bird wings",
    "feather tail",
    "missing sword",
    "missing tail",
    "cropped feet",
    "castle background",
    "cinematic scene",
    "single poster image",
    "red block blob",
    "relief card"
  )
  accepted = @(
    "full body",
    "plain gray background",
    "leathery dragon wings",
    "visible sword",
    "reptile tail",
    "horns",
    "dark scaled armor",
    "consistent character"
  )
  next_backend = "Hunyuan3D or TRELLIS preferred. TripoSR only proof."
  source_pack_folder = $SourcePack
  prompt_file = $PromptFile
  negative_prompt_file = $NegativeFile
  created_at = (Get-Date).ToString("o")
}

$Standard | ConvertTo-Json -Depth 80 | Set-Content -Path $StandardFile -Encoding UTF8

$Required = @(
  "front_view_full_body_plain_background.png",
  "left_side_view_full_body_plain_background.png",
  "right_side_view_full_body_plain_background.png",
  "back_view_full_body_plain_background.png"
)

$Found = @()
$Missing = @()

foreach ($Name in $Required) {
  $Path = Join-Path $SourcePack $Name
  if (Test-Path $Path) {
    $Found += $Name
  } else {
    $Missing += $Name
  }
}

$Receipt = @{
  verdict = "AGENT_LEE_SOURCE_PACK_PATCHED_AND_AUDITED"
  found = $Found
  missing = $Missing
  can_run_final_3d = ($Missing.Count -eq 0)
  warning = "A single front image is not enough for final clean 3D. Missing side/back views must be generated before final 3D."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SOURCE_PACK_NO_FEATHERS_NO_MISSING_SWORD_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee source-pack standard patched." -ForegroundColor Green
Write-Host "Prompt: $PromptFile" -ForegroundColor Cyan
Write-Host "Negative: $NegativeFile" -ForegroundColor Cyan
Write-Host "Standard: $StandardFile" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

if ($Missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Still missing required 3D source views:" -ForegroundColor Yellow
  $Missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
}

explorer $SourcePack
notepad $ReceiptPath