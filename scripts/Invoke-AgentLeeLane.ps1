param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("brain","voice","vision","ears","memory","media","all-core","status")]
  [string]$Lane
)

$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-on-demand-runtime"
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

Set-Location $Root

function Try-Get {
  param([string]$Name, [string]$Uri)

  try {
    $Result = Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 25
    return @{
      name = $Name
      ok = $true
      uri = $Uri
      result = $Result
    }
  }
  catch {
    return @{
      name = $Name
      ok = $false
      uri = $Uri
      error = $_.Exception.Message
    }
  }
}

function Start-ExistingContainer {
  param([string]$Name)

  $Exists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Name }

  if ($Exists) {
    docker start $Name 2>$null | Out-Null
    return $true
  }

  return $false
}

function Start-QwenVoice {
  $Running = docker ps --format "{{.Names}}" | Where-Object { $_ -eq "agent-lee-qwen-voice" }

  if ($Running) {
    return
  }

  docker rm -f agent-lee-qwen-voice 2>$null | Out-Null

  docker run -d `
    --name agent-lee-qwen-voice `
    --restart unless-stopped `
    --gpus all `
    --ipc=host `
    --shm-size=8g `
    --network leeway-ecosystemv214_leeway-net `
    -p 8097:8097 `
    -e QWEN_TTS_MODEL_PATH="/models/voice/qwen3-tts" `
    -e AGENT_LEE_VOICE_OUTPUT_DIR="/voice-output" `
    -e AGENT_LEE_VOICE_REFERENCE="/voice-seeds/Agent_Voice_One.m4a" `
    -e AGENT_LEE_VOICE_MODE="clone" `
    -e AGENT_LEE_CLONE_MODE="speaker_vector" `
    -e QWEN_TTS_LANGUAGE="English" `
    -e QWEN_TTS_ATTN="sdpa" `
    -v "D:\Leeway-Ecosystem v2.1.4\models\voice\qwen3-tts:/models/voice/qwen3-tts" `
    -v "D:\Leeway-Ecosystem v2.1.4\Archive\voice-output:/voice-output" `
    -v "D:\Leeway-Ecosystem v2.1.4:/voice-seeds" `
    agent-lee-qwen-voice:cuda | Out-Null
}

$Results = @{}

switch ($Lane) {
  "brain" {
    Start-ExistingContainer "leeway_ollama" | Out-Null
    Start-Sleep -Seconds 3
    $Results["brain"] = Try-Get "qwen_brain_ollama" "http://127.0.0.1:11434/api/tags"
  }

  "voice" {
    Start-QwenVoice
    Start-Sleep -Seconds 12
    $Results["voice"] = Try-Get "qwen_voice" "http://127.0.0.1:8097/health"
  }

  "vision" {
    Start-ExistingContainer "agent-lee-vision-kernel" | Out-Null
    Start-Sleep -Seconds 4
    $Results["vision"] = Try-Get "vision_kernel" "http://127.0.0.1:8093/health"
  }

  "ears" {
    Start-ExistingContainer "agent-lee-ears-kernel" | Out-Null
    Start-Sleep -Seconds 4
    $Results["ears"] = Try-Get "ears_kernel" "http://127.0.0.1:8094/health"
  }

  "memory" {
    Start-ExistingContainer "leeway_media_ingestion_layer" | Out-Null
    Start-Sleep -Seconds 4
    $Results["memory"] = Try-Get "media_ingestion" "http://127.0.0.1:5300/health"
  }

  "media" {
    Start-ExistingContainer "leeway_media_router" | Out-Null
    Start-ExistingContainer "leeway_media_ingestion_layer" | Out-Null
    Start-Sleep -Seconds 4
    $Results["media_router"] = Try-Get "media_router" "http://127.0.0.1:5301/health"
    $Results["media_ingestion"] = Try-Get "media_ingestion" "http://127.0.0.1:5300/health"
  }

  "all-core" {
    Start-ExistingContainer "leeway_runtime_fabric" | Out-Null
    Start-ExistingContainer "agent_lee_code_mode" | Out-Null
    Start-ExistingContainer "leeway_ollama" | Out-Null
    Start-QwenVoice
    Start-Sleep -Seconds 12
    $Results["runtime"] = Try-Get "runtime_fabric" "http://127.0.0.1:4001/health"
    $Results["brain"] = Try-Get "qwen_brain_ollama" "http://127.0.0.1:11434/api/tags"
    $Results["voice"] = Try-Get "qwen_voice" "http://127.0.0.1:8097/health"
  }

  "status" {
    $Results["runtime"] = Try-Get "runtime_fabric" "http://127.0.0.1:4001/health"
    $Results["brain"] = Try-Get "qwen_brain_ollama" "http://127.0.0.1:11434/api/tags"
    $Results["voice"] = Try-Get "qwen_voice" "http://127.0.0.1:8097/health"
    $Results["vision"] = Try-Get "vision_kernel" "http://127.0.0.1:8093/health"
    $Results["ears"] = Try-Get "ears_kernel" "http://127.0.0.1:8094/health"
    $Results["media"] = Try-Get "media_router" "http://127.0.0.1:5301/health"
    $Results["memory"] = Try-Get "media_ingestion" "http://127.0.0.1:5300/health"
  }
}

$Receipt = @{
  verdict = "AGENT_LEE_LANE_INVOKED"
  lane = $Lane
  results = $Results
  running_containers = (docker ps --format "{{.Names}}")
  created_at = (Get-Date).ToString("o")
}

$SafeLane = $Lane.Replace("-","_")
$ReceiptPath = Join-Path $Proof "AGENT_LEE_LANE_$SafeLane.receipt.json"
$Receipt | ConvertTo-Json -Depth 30 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Lane invoked: $Lane" -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan