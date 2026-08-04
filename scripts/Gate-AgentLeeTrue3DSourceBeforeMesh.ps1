$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$ReferenceImage = Join-Path $Root "Archive\agent-lee-artifacts\image-to-3d-lane\sources\agent_lee_red_dragon_warrior_reference_v1.png"

$SourcePack = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\source-pack-v1"
$Rejected = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\rejected-sources"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $SourcePack | Out-Null
New-Item -ItemType Directory -Force -Path $Rejected | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $ReferenceImage)) {
  throw "Reference image not found: $ReferenceImage"
}

$RejectedCopy = Join-Path $Rejected ("agent_lee_red_dragon_warrior_reference_v1_REJECTED_FOR_FINAL_3D_$Stamp.png")
Copy-Item -Force $ReferenceImage $RejectedCopy

$PromptPath = Join-Path $SourcePack "PROMPT_create_clean_agent_lee_turnaround.txt"
$NegativePath = Join-Path $SourcePack "NEGATIVE_create_clean_agent_lee_turnaround.txt"
$StandardPath = Join-Path $SourcePack "AGENT_LEE_TRUE_3D_SOURCE_STANDARD.json"
$ReadmePath = Join-Path $SourcePack "README_NEXT_REQUIRED_SOURCE.md"

@"
Create a clean 3D character turnaround sheet for Agent Lee.

Character:
Agent Lee is a full-body hybrid dragon, dog, and man warrior.
He has a muscular humanoid body, canine legs and clawed feet, black and dark blue scaled armor, curved horns, a long tail, large red dragon wings fully visible, and a sword.

Required layout:
Four separate full-body views of the exact same character:
1. Front view
2. Left side view
3. Right side view
4. Back view

Style:
3D game character model sheet, sculpt reference, clean neutral studio lighting, sharp silhouette, high detail, plain neutral gray background.

Important:
The character must be centered.
The entire body must be visible from horns to feet.
The wings must be fully visible.
The sword must be fully visible.
The tail must be fully visible.
No castle.
No archway.
No scenery.
No cinematic background.
No floor shadow.
No background dragon.
No extra characters.
No cropped body.
"@ | Set-Content -Path $PromptPath -Encoding UTF8

@"
castle, archway, city, scenery, cinematic poster, background dragon, floor shadow, heavy backlight, dramatic fog, smoke, reflection, cropped body, cropped wings, missing sword, missing tail, missing feet, merged wings, hidden arms, hidden legs, distorted anatomy, extra limbs, action pose, perspective scene, low detail, blurry, red rectangle, blocky object, relief card, background wall, silhouette merged with background
"@ | Set-Content -Path $NegativePath -Encoding UTF8

$Standard = @{
  verdict = "CURRENT_REFERENCE_REJECTED_FOR_FINAL_TRUE_3D_MESH"
  reason = "The current image is a cinematic poster/reference scene. TripoSR already turned this kind of source into a distorted block/blob instead of a recognizable Agent Lee statue."
  current_reference = $ReferenceImage
  rejected_copy = $RejectedCopy
  do_not_run_final_mesh_on = @(
    "agent_lee_red_dragon_warrior_reference_v1.png",
    "cinematic background scene",
    "castle archway scene",
    "single dramatic poster image",
    "manual red/wing mask source",
    "blocky cutout source"
  )
  required_final_source_files = @(
    "front_view_full_body_plain_background.png",
    "left_side_view_full_body_plain_background.png",
    "right_side_view_full_body_plain_background.png",
    "back_view_full_body_plain_background.png"
  )
  required_character_features = @(
    "recognizable dragon/dog/man warrior",
    "large red dragon wings fully visible",
    "sword fully visible",
    "curved horns",
    "dark scaled armor",
    "long tail",
    "canine legs and clawed feet",
    "full body from head to feet",
    "plain neutral background",
    "consistent design across views"
  )
  accepted_backend_order = @(
    "Hunyuan3D or TRELLIS for final textured asset",
    "TripoSR only for fast proof after clean source exists"
  )
  source_pack_folder = $SourcePack
  prompt_file = $PromptPath
  negative_prompt_file = $NegativePath
  created_at = (Get-Date).ToString("o")
}

$Standard | ConvertTo-Json -Depth 80 | Set-Content -Path $StandardPath -Encoding UTF8

@"
# Agent Lee True 3D Source Pack Required

The previous TripoSR pass created a visible GLB, but it failed the Agent Lee character standard.

## Rejected input

The current reference image is rejected for final mesh generation:

$ReferenceImage

Reason: it is a cinematic background scene, not a clean 3D character source.

## Required files before running final 3D

Place these files in this folder:

$SourcePack

Required:

- front_view_full_body_plain_background.png
- left_side_view_full_body_plain_background.png
- right_side_view_full_body_plain_background.png
- back_view_full_body_plain_background.png

Optional:

- closeup_head_horns_armor.png
- closeup_wings_tail_sword.png

## Do not run final 3D until these exist

The next script should check these files before starting any mesh generation. If they are missing, it must stop instead of creating another blob.

## Backend

Use Hunyuan3D or TRELLIS for the final textured character. Use TripoSR only as a fast proof after the clean source exists.
"@ | Set-Content -Path $ReadmePath -Encoding UTF8

$Required = @(
  "front_view_full_body_plain_background.png",
  "left_side_view_full_body_plain_background.png",
  "right_side_view_full_body_plain_background.png",
  "back_view_full_body_plain_background.png"
)

$Missing = @()
foreach ($Name in $Required) {
  $Path = Join-Path $SourcePack $Name
  if (-not (Test-Path $Path)) {
    $Missing += $Name
  }
}

$GateReceipt = @{
  verdict = "AGENT_LEE_TRUE_3D_SOURCE_GATE_ENFORCED"
  current_reference_rejected = $true
  rejected_reference_copy = $RejectedCopy
  source_pack_folder = $SourcePack
  missing_required_files = $Missing
  can_run_final_mesh = ($Missing.Count -eq 0)
  next_action = if ($Missing.Count -eq 0) {
    "Run final mesh backend."
  } else {
    "Create clean character turnaround source files before any more final mesh attempts."
  }
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof ("AGENT_LEE_TRUE_3D_SOURCE_GATE_ENFORCED_$Stamp.receipt.json")
$GateReceipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Agent Lee true 3D source gate enforced." -ForegroundColor Green
Write-Host "Current cinematic reference rejected for final mesh." -ForegroundColor Yellow
Write-Host "Source pack folder: $SourcePack" -ForegroundColor Cyan
Write-Host "Prompt: $PromptPath" -ForegroundColor Cyan
Write-Host "Negative prompt: $NegativePath" -ForegroundColor Cyan
Write-Host "Standard: $StandardPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

if ($Missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Missing required clean source files:" -ForegroundColor Yellow
  $Missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
}

notepad $ReadmePath
notepad $PromptPath
notepad $NegativePath
explorer $SourcePack