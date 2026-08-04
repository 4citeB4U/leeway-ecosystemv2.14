$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-creation-kernel"
$Artifacts = Join-Path $Root "Archive\creation-kernel"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof, $Artifacts | Out-Null

$Prompt = "hybrid man, dog, dragon, fantasy concept art, cinematic creature design, heroic stance"
$Base = "http://127.0.0.1:8098"

$ReceiptPath = Join-Path $Proof "AGENT_LEE_CREATION_IMAGE_ON_DEMAND_$Stamp.receipt.json"
$RawResponsePath = Join-Path $Proof "AGENT_LEE_CREATION_IMAGE_RAW_RESPONSE_$Stamp.bin"
$TextResponsePath = Join-Path $Proof "AGENT_LEE_CREATION_IMAGE_RESPONSE_$Stamp.txt"
$ImageOutPath = Join-Path $Artifacts "agent_lee_hybrid_man_dog_dragon_$Stamp.png"

function Add-Step {
  param(
    [string]$Name,
    [object]$Data
  )

  $script:Steps += [pscustomobject]@{
    name = $Name
    data = $Data
    at = (Get-Date).ToString("o")
  }
}

$Steps = @()

Write-Host ""
Write-Host "Agent Lee Creation Image On-Demand Run" -ForegroundColor Cyan
Write-Host "Prompt: $Prompt" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. Capture GPU before
# ------------------------------------------------------------
$GpuBefore = cmd /c "nvidia-smi 2>&1"
Add-Step "gpu_before" $GpuBefore

# ------------------------------------------------------------
# 2. Ask Ollama to unload common heavy models from VRAM.
# This keeps the container alive but frees GPU memory if Ollama honors keep_alive=0.
# ------------------------------------------------------------
$UnloadResults = @()
$ModelsToUnload = @(
  "qwen3:latest",
  "qwen2.5vl:7b",
  "qwen2.5-coder:latest",
  "deepseek-coder:latest",
  "gemma4:latest"
)

foreach ($Model in $ModelsToUnload) {
  try {
    $Body = @{
      model = $Model
      prompt = ""
      stream = $false
      keep_alive = 0
    } | ConvertTo-Json -Depth 10

    $Resp = Invoke-RestMethod `
      -Method Post `
      -Uri "http://127.0.0.1:11434/api/generate" `
      -Body $Body `
      -ContentType "application/json" `
      -TimeoutSec 60

    $UnloadResults += @{
      model = $Model
      ok = $true
      response = $Resp
    }
  }
  catch {
    $UnloadResults += @{
      model = $Model
      ok = $false
      error = $_.Exception.Message
    }
  }
}

Add-Step "ollama_unload_attempts" $UnloadResults

Start-Sleep -Seconds 6

$GpuAfterUnload = cmd /c "nvidia-smi 2>&1"
Add-Step "gpu_after_ollama_unload" $GpuAfterUnload

# ------------------------------------------------------------
# 3. Check Creation Kernel status
# ------------------------------------------------------------
$StatusBeforeWarmup = $null
try {
  $StatusBeforeWarmup = Invoke-RestMethod -Method Get -Uri "$Base/status" -TimeoutSec 30
}
catch {
  $StatusBeforeWarmup = @{ error = $_.Exception.Message }
}

Add-Step "status_before_warmup" $StatusBeforeWarmup

# ------------------------------------------------------------
# 4. Warmup in a controlled background job.
#    This avoids blind freezing.
# ------------------------------------------------------------
Write-Host "Starting controlled warmup..." -ForegroundColor Cyan

$WarmupJob = Start-Job -ScriptBlock {
  param($BaseUrl)

  Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/warmup" `
    -Body "{}" `
    -ContentType "application/json" `
    -TimeoutSec 900
} -ArgumentList $Base

$WarmupResult = $null
$WarmupTimedOut = $false
$WarmupMaxSeconds = 420
$WarmupStart = Get-Date

while ($true) {
  Start-Sleep -Seconds 15

  $Elapsed = [int]((Get-Date) - $WarmupStart).TotalSeconds

  try {
    $StatusNow = Invoke-RestMethod -Method Get -Uri "$Base/status" -TimeoutSec 20
  }
  catch {
    $StatusNow = @{ error = $_.Exception.Message }
  }

  Write-Host "Warmup elapsed: $Elapsed seconds | status: $($StatusNow.status) | pipe_loaded: $($StatusNow.pipe_loaded) | device: $($StatusNow.resolved_device)" -ForegroundColor DarkCyan

  $LogsNow = cmd /c "docker logs --tail 40 agent-lee-creation-kernel 2>&1"

  Add-Step "warmup_poll_$Elapsed" @{
    elapsed_seconds = $Elapsed
    status = $StatusNow
    logs_tail = $LogsNow
  }

  if ($WarmupJob.State -eq "Completed") {
    try {
      $WarmupResult = Receive-Job $WarmupJob
    }
    catch {
      $WarmupResult = @{ error = $_.Exception.Message }
    }
    break
  }

  if ($WarmupJob.State -eq "Failed") {
    try {
      $WarmupResult = Receive-Job $WarmupJob
    }
    catch {
      $WarmupResult = @{ error = $_.Exception.Message }
    }
    break
  }

  if ($Elapsed -ge $WarmupMaxSeconds) {
    $WarmupTimedOut = $true
    Stop-Job $WarmupJob -Force
    break
  }
}

Remove-Job $WarmupJob -Force -ErrorAction SilentlyContinue

Add-Step "warmup_result" @{
  timed_out = $WarmupTimedOut
  result = $WarmupResult
}

# ------------------------------------------------------------
# 5. Status after warmup
# ------------------------------------------------------------
$StatusAfterWarmup = $null
try {
  $StatusAfterWarmup = Invoke-RestMethod -Method Get -Uri "$Base/status" -TimeoutSec 30
}
catch {
  $StatusAfterWarmup = @{ error = $_.Exception.Message }
}

Add-Step "status_after_warmup" $StatusAfterWarmup

if ($WarmupTimedOut -or $StatusAfterWarmup.pipe_loaded -ne $true) {
  Write-Host "Warmup did not complete cleanly. Capturing proof and stopping before generation." -ForegroundColor Yellow

  $Receipt = @{
    verdict = "AGENT_LEE_CREATION_WARMUP_NOT_READY"
    prompt = $Prompt
    base = $Base
    steps = $Steps
    gpu_final = (cmd /c "nvidia-smi 2>&1")
    docker_logs_tail = (cmd /c "docker logs --tail 220 agent-lee-creation-kernel 2>&1")
    artifact_files = @(Get-ChildItem -Recurse -File $Artifacts -ErrorAction SilentlyContinue | Select-Object FullName, Length, LastWriteTime)
    created_at = (Get-Date).ToString("o")
  }

  $Receipt | ConvertTo-Json -Depth 60 | Set-Content -Path $ReceiptPath -Encoding UTF8
  notepad $ReceiptPath

  Write-Host ""
  Write-Host "Warmup not ready. Receipt: $ReceiptPath" -ForegroundColor Yellow
  exit 2
}

# ------------------------------------------------------------
# 6. Generate image without assuming response type
# ------------------------------------------------------------
Write-Host "Warmup complete. Generating image..." -ForegroundColor Green

$Payload = @{
  prompt = $Prompt
  width = 512
  height = 512
  num_inference_steps = 4
  guidance_scale = 0.0
  seed = 42
} | ConvertTo-Json -Depth 10

$GenerateOk = $false
$GenerateError = $null
$GenerateResponseHeaders = $null
$GenerateContentType = $null
$GenerateText = $null
$ParsedJson = $null
$SavedImage = $null

try {
  $Resp = Invoke-WebRequest `
    -Method Post `
    -Uri "$Base/image/generate" `
    -Body $Payload `
    -ContentType "application/json" `
    -TimeoutSec 600 `
    -UseBasicParsing

  $GenerateResponseHeaders = $Resp.Headers
  $GenerateContentType = $Resp.Headers["Content-Type"]

  # Save raw response for proof.
  [System.IO.File]::WriteAllBytes($RawResponsePath, $Resp.RawContentStream.ToArray())

  if ($GenerateContentType -match "image") {
    Copy-Item $RawResponsePath $ImageOutPath -Force
    $SavedImage = $ImageOutPath
    $GenerateOk = $true
  }
  else {
    $GenerateText = $Resp.Content
    $GenerateText | Set-Content -Path $TextResponsePath -Encoding UTF8

    try {
      $ParsedJson = $GenerateText | ConvertFrom-Json -Depth 50
    }
    catch {
      $ParsedJson = $null
    }

    if ($ParsedJson) {
      # Common JSON base64 fields.
      $Base64Candidates = @(
        $ParsedJson.image_base64,
        $ParsedJson.base64,
        $ParsedJson.image,
        $ParsedJson.result.image_base64,
        $ParsedJson.result.base64,
        $ParsedJson.result.image
      ) | Where-Object { $_ }

      if ($Base64Candidates.Count -gt 0) {
        $B64 = $Base64Candidates[0]

        # Strip data URL prefix if present.
        if ($B64 -match "^data:image/[^;]+;base64,") {
          $B64 = $B64 -replace "^data:image/[^;]+;base64,", ""
        }

        [System.IO.File]::WriteAllBytes($ImageOutPath, [Convert]::FromBase64String($B64))
        $SavedImage = $ImageOutPath
        $GenerateOk = $true
      }

      # Common JSON file path fields.
      $PathCandidates = @(
        $ParsedJson.path,
        $ParsedJson.file,
        $ParsedJson.output,
        $ParsedJson.image_path,
        $ParsedJson.artifact_path,
        $ParsedJson.result.path,
        $ParsedJson.result.file,
        $ParsedJson.result.output,
        $ParsedJson.result.image_path,
        $ParsedJson.result.artifact_path
      ) | Where-Object { $_ }

      foreach ($P in $PathCandidates) {
        if ($P -like "/creation-output/*") {
          $Relative = $P.Substring("/creation-output/".Length)
          $HostCandidate = Join-Path $Artifacts $Relative
          if (Test-Path $HostCandidate) {
            $SavedImage = $HostCandidate
            $GenerateOk = $true
            break
          }
        }
        elseif (Test-Path $P) {
          $SavedImage = $P
          $GenerateOk = $true
          break
        }
      }
    }
  }
}
catch {
  $GenerateError = $_.Exception.Message
}

Add-Step "generate_result" @{
  ok = $GenerateOk
  error = $GenerateError
  content_type = $GenerateContentType
  headers = $GenerateResponseHeaders
  parsed_json = $ParsedJson
  saved_image = $SavedImage
  raw_response_path = $RawResponsePath
  text_response_path = $TextResponsePath
}

# ------------------------------------------------------------
# 7. Final receipt
# ------------------------------------------------------------
$ArtifactFiles = @(Get-ChildItem -Recurse -File $Artifacts -ErrorAction SilentlyContinue | Select-Object FullName, Length, LastWriteTime)

$Receipt = @{
  verdict = if ($GenerateOk) { "AGENT_LEE_CREATION_IMAGE_GENERATED" } else { "AGENT_LEE_CREATION_IMAGE_GENERATION_NEEDS_PATCH" }
  prompt = $Prompt
  base = $Base
  saved_image = $SavedImage
  raw_response_path = $RawResponsePath
  text_response_path = $TextResponsePath
  steps = $Steps
  status_final = (Invoke-RestMethod -Method Get -Uri "$Base/status" -TimeoutSec 30)
  gpu_final = (cmd /c "nvidia-smi 2>&1")
  docker_logs_tail = (cmd /c "docker logs --tail 220 agent-lee-creation-kernel 2>&1")
  artifact_files = $ArtifactFiles
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

if ($GenerateOk -and $SavedImage) {
  Write-Host ""
  Write-Host "Image generated." -ForegroundColor Green
  Write-Host "Image: $SavedImage" -ForegroundColor Cyan

  try {
    Start-Process $SavedImage
  }
  catch {
    Write-Host "Could not auto-open image. Path: $SavedImage" -ForegroundColor Yellow
  }
}
else {
  Write-Host ""
  Write-Host "Image generation did not return a usable image yet." -ForegroundColor Yellow
  Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
}