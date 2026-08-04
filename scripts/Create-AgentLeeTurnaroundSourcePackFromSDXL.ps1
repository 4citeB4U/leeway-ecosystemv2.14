$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"

$SourcePack = Join-Path $Root "Archive\agent-lee-artifacts\true-character-3d-lane\source-pack-v1"
$PromptFile = Join-Path $SourcePack "PROMPT_create_clean_agent_lee_turnaround.txt"
$NegativeFile = Join-Path $SourcePack "NEGATIVE_create_clean_agent_lee_turnaround.txt"
$Proof = Join-Path $Root "Archive\proofs\true-character-3d-lane"

$ImageLaneBase = "http://127.0.0.1:8099"

New-Item -ItemType Directory -Force -Path $SourcePack | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $PromptFile)) {
  throw "Prompt file not found: $PromptFile"
}

if (-not (Test-Path $NegativeFile)) {
  throw "Negative prompt file not found: $NegativeFile"
}

$BasePrompt = Get-Content $PromptFile -Raw
$NegativePrompt = Get-Content $NegativeFile -Raw

Write-Host ""
Write-Host "Checking SDXL image lane..." -ForegroundColor Cyan

try {
  $Status = Invoke-RestMethod -Method Get -Uri "$ImageLaneBase/status" -TimeoutSec 30
  $Status | ConvertTo-Json -Depth 80 | Out-Host
} catch {
  throw "SDXL image lane is not reachable at $ImageLaneBase. Start agent-lee-sdxl-lightning-image-lane first."
}

$Views = @(
  @{
    name = "front_view_full_body_plain_background.png"
    view = "FRONT VIEW ONLY. The character faces directly forward. Full body from horns to feet. Both wings fully visible behind him. Sword fully visible. Tail visible."
  },
  @{
    name = "left_side_view_full_body_plain_background.png"
    view = "LEFT SIDE VIEW ONLY. The exact same character in clean left profile. Full body from horns to feet. Wing shape visible from the side. Sword and tail visible."
  },
  @{
    name = "right_side_view_full_body_plain_background.png"
    view = "RIGHT SIDE VIEW ONLY. The exact same character in clean right profile. Full body from horns to feet. Wing shape visible from the side. Sword and tail visible."
  },
  @{
    name = "back_view_full_body_plain_background.png"
    view = "BACK VIEW ONLY. The exact same character from behind. Full body from horns to feet. Red wings fully visible. Tail fully visible. Armor back plates visible."
  }
)

function Save-ImageFromUrl {
  param(
    [string]$Url,
    [string]$OutPath
  )

  Invoke-WebRequest -Uri $Url -OutFile $OutPath -TimeoutSec 300
  if (-not (Test-Path $OutPath)) {
    throw "Failed to save image: $OutPath"
  }

  $Size = (Get-Item $OutPath).Length
  if ($Size -lt 10000) {
    throw "Saved image is too small and likely invalid: $OutPath size=$Size"
  }
}

function Invoke-AgentLeeImageGeneration {
  param(
    [string]$Prompt,
    [string]$NegativePrompt,
    [string]$OutPath
  )

  $Body = @{
    prompt = $Prompt
    negative_prompt = $NegativePrompt
    width = 1024
    height = 1024
    candidates = 1
    num_images = 1
    steps = 4
    guidance_scale = 0.0
  } | ConvertTo-Json -Depth 30

  $Endpoints = @(
    "$ImageLaneBase/image/generate-fast",
    "$ImageLaneBase/image/generate"
  )

  $LastError = $null

  foreach ($Endpoint in $Endpoints) {
    Write-Host ""
    Write-Host "Trying endpoint: $Endpoint" -ForegroundColor Cyan

    try {
      $Result = Invoke-RestMethod `
        -Method Post `
        -Uri $Endpoint `
        -Body $Body `
        -ContentType "application/json" `
        -TimeoutSec 900

      $Result | ConvertTo-Json -Depth 100 | Out-Host

      $JobId = $null
      if ($Result.job_id) { $JobId = $Result.job_id }
      if (-not $JobId -and $Result.jobId) { $JobId = $Result.jobId }
      if (-not $JobId -and $Result.id) { $JobId = $Result.id }

      $PossibleUrls = @()

      if ($Result.image_url) { $PossibleUrls += $Result.image_url }
      if ($Result.url) { $PossibleUrls += $Result.url }
      if ($Result.output_url) { $PossibleUrls += $Result.output_url }
      if ($Result.artifact_url) { $PossibleUrls += $Result.artifact_url }
      if ($Result.links -and $Result.links.image) { $PossibleUrls += $Result.links.image }
      if ($Result.links -and $Result.links.candidate_1) { $PossibleUrls += $Result.links.candidate_1 }

      if ($JobId) {
        $PossibleUrls += "$ImageLaneBase/artifacts/$JobId/candidate_1.png"
        $PossibleUrls += "$ImageLaneBase/artifacts/$JobId/image.png"
      }

      $PossibleUrls += "$ImageLaneBase/latest/candidate_1.png"
      $PossibleUrls += "$ImageLaneBase/latest/image.png"

      foreach ($Url in $PossibleUrls) {
        if (-not $Url) { continue }

        if ($Url.StartsWith("/")) {
          $Url = "$ImageLaneBase$Url"
        }

        try {
          Write-Host "Downloading candidate from: $Url" -ForegroundColor Cyan
          Save-ImageFromUrl -Url $Url -OutPath $OutPath
          return @{
            ok = $true
            endpoint = $Endpoint
            job_id = $JobId
            image_url = $Url
            out_path = $OutPath
            raw_result = $Result
          }
        } catch {
          $LastError = $_.Exception.Message
        }
      }

      throw "Image generation returned but no usable artifact URL worked. LastError=$LastError"
    } catch {
      $LastError = $_.Exception.Message
      Write-Host "Endpoint failed: $LastError" -ForegroundColor Yellow
    }
  }

  throw "All image generation endpoints failed. LastError=$LastError"
}

$Outputs = @()

foreach ($View in $Views) {
  $OutPath = Join-Path $SourcePack $View.name

  $Prompt = @"
$($View.view)

$BasePrompt

STRICT REQUIREMENTS:
- Generate only one view in this image.
- Plain neutral gray background.
- Full body centered.
- No castle.
- No archway.
- No floor.
- No background.
- No second character.
- No cropped wings.
- No missing sword.
- No missing tail.
- No missing feet.
- Clear silhouette for image-to-3D reconstruction.
"@

  Write-Host ""
  Write-Host "Generating $($View.name)..." -ForegroundColor Green

  $Gen = Invoke-AgentLeeImageGeneration `
    -Prompt $Prompt `
    -NegativePrompt $NegativePrompt `
    -OutPath $OutPath

  $Outputs += $Gen

  Start-Process $OutPath
}

$Missing = @()
foreach ($View in $Views) {
  $Path = Join-Path $SourcePack $View.name
  if (-not (Test-Path $Path)) {
    $Missing += $View.name
  }
}

$Receipt = @{
  verdict = if ($Missing.Count -eq 0) { "AGENT_LEE_TURNAROUND_SOURCE_PACK_CREATED" } else { "AGENT_LEE_TURNAROUND_SOURCE_PACK_INCOMPLETE" }
  source_pack_folder = $SourcePack
  required_files_created = ($Missing.Count -eq 0)
  missing = $Missing
  outputs = $Outputs
  next_step = if ($Missing.Count -eq 0) {
    "Run source gate again, then run 3D mesh generation on the clean front view or final backend."
  } else {
    "Regenerate missing required source files."
  }
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof ("AGENT_LEE_TURNAROUND_SOURCE_PACK_CREATED_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Turnaround source pack generation complete." -ForegroundColor Green
Write-Host "Source pack: $SourcePack" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan

explorer $SourcePack
notepad $ReceiptPath