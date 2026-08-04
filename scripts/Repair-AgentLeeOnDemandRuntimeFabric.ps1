$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-on-demand-runtime"
$ComposePath = Join-Path $Root "docker-compose.agent-lee-on-demand.override.yml"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
Set-Location $Root

Write-Host "Repairing Agent Lee on-demand Docker override..." -ForegroundColor Cyan

@"
services:
  runtime-fabric:
    env_file:
      - .env.local
    environment:
      LEEWAY_AGENT_ENTRYPOINT: http://0.0.0.0:4001
      LEEWAY_MODEL_REGISTRY: /leeway-config/agent-lee-on-demand-model-registry.json
      LEEWAY_DISCOVERY_ENDPOINTS: /leeway-config/leeway-discovery-endpoints.agent-lee.json
      AGENT_LEE_BRAIN_SERVICE: http://ollama:11434
      AGENT_LEE_BRAIN_MODEL: qwen3:latest
      AGENT_LEE_VOICE_SERVICE: http://agent-lee-qwen-voice:8097
      AGENT_LEE_VOICE_MODE: clone
      AGENT_LEE_MODEL_POLICY: qwen-only-on-demand
    volumes:
      - "./config:/leeway-config:ro"

  agent-lee:
    env_file:
      - .env.local
    environment:
      LEEWAY_AGENT_ENTRYPOINT: http://runtime-fabric:4001
      LEEWAY_MODEL_REGISTRY: /leeway-config/agent-lee-on-demand-model-registry.json
      LEEWAY_DISCOVERY_ENDPOINTS: /leeway-config/leeway-discovery-endpoints.agent-lee.json
      AGENT_LEE_BRAIN_SERVICE: http://ollama:11434
      AGENT_LEE_BRAIN_MODEL: qwen3:latest
      AGENT_LEE_VOICE_SERVICE: http://agent-lee-qwen-voice:8097
      AGENT_LEE_MODEL_POLICY: qwen-only-on-demand
    volumes:
      - "./config:/leeway-config:ro"
"@ | Set-Content -Path $ComposePath -Encoding UTF8

Write-Host "Starting base Leeway stack with repaired override..." -ForegroundColor Cyan

docker compose `
  -f ".\docker-compose.leeway.yml" `
  -f ".\docker-compose.leeway.gpu.override.yml" `
  -f ".\docker-compose.agent-lee-on-demand.override.yml" `
  up -d

Write-Host "Starting Qwen voice as durable always-ready mouth lane..." -ForegroundColor Cyan

$ExistingVoice = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq "agent-lee-qwen-voice" }

if ($ExistingVoice) {
  docker rm -f agent-lee-qwen-voice | Out-Null
}
else {
  Write-Host "No existing agent-lee-qwen-voice container to remove." -ForegroundColor DarkGray
}

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

Start-Sleep -Seconds 12

$Checks = @{}

function Check-Http {
  param([string]$Name, [string]$Uri)

  try {
    $Result = Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 30
    $Checks[$Name] = @{
      ok = $true
      uri = $Uri
      result = $Result
    }
  }
  catch {
    $Checks[$Name] = @{
      ok = $false
      uri = $Uri
      error = $_.Exception.Message
    }
  }
}

Check-Http -Name "runtime_fabric" -Uri "http://127.0.0.1:4001/health"
Check-Http -Name "qwen_brain_ollama" -Uri "http://127.0.0.1:11434/api/tags"
Check-Http -Name "qwen_voice" -Uri "http://127.0.0.1:8097/health"
Check-Http -Name "vision_kernel" -Uri "http://127.0.0.1:8093/health"
Check-Http -Name "ears_kernel" -Uri "http://127.0.0.1:8094/health"
Check-Http -Name "media_ingestion" -Uri "http://127.0.0.1:5300/health"
Check-Http -Name "media_router" -Uri "http://127.0.0.1:5301/health"

$Receipt = @{
  verdict = "AGENT_LEE_ON_DEMAND_RUNTIME_REPAIRED"
  repaired_compose_override = $ComposePath
  voice_start_mode = "docker run durable container with restart unless-stopped"
  single_entrypoint = "http://127.0.0.1:4001"
  qwen_voice = "http://127.0.0.1:8097"
  checks = $Checks
  running_containers = (docker ps --format "{{.Names}}")
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_ON_DEMAND_RUNTIME_REPAIRED.receipt.json"
$Receipt | ConvertTo-Json -Depth 30 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee on-demand runtime repaired." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan