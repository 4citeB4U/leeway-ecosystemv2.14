$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-on-demand-runtime"
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$ContainerName = "agent-lee-qwen-voice"
$ReceiptPath = Join-Path $Proof "AGENT_LEE_QWEN_VOICE_DIAGNOSTIC.receipt.json"

Write-Host "Checking Agent Lee Qwen voice container..." -ForegroundColor Cyan

$ContainerExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
$ContainerRunning = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

$DockerPs = docker ps -a --filter "name=$ContainerName" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" | Out-String -Width 4096

$Inspect = $null
$LogsTail = $null
$Health = $null
$HealthError = $null
$Nvidia = $null

if ($ContainerExists) {
  try {
    $Inspect = docker inspect $ContainerName | ConvertFrom-Json
  }
  catch {
    $Inspect = @{
      error = $_.Exception.Message
    }
  }

  try {
    $LogsTail = docker logs --tail 120 $ContainerName 2>&1 | Out-String -Width 4096
  }
  catch {
    $LogsTail = $_.Exception.Message
  }
}

try {
  $Health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8097/health" -TimeoutSec 60
}
catch {
  $HealthError = $_.Exception.Message
}

try {
  $Nvidia = docker exec $ContainerName nvidia-smi 2>&1 | Out-String -Width 4096
}
catch {
  $Nvidia = $_.Exception.Message
}

$Receipt = @{
  verdict = "AGENT_LEE_QWEN_VOICE_DIAGNOSTIC"
  container_exists = [bool]$ContainerExists
  container_running = [bool]$ContainerRunning
  docker_ps = $DockerPs
  health = $Health
  health_error = $HealthError
  nvidia_smi = $Nvidia
  logs_tail = $LogsTail
  inspect_state = if ($Inspect -and $Inspect[0]) { $Inspect[0].State } else { $Inspect.State }
  inspect_config_env = if ($Inspect -and $Inspect[0]) { $Inspect[0].Config.Env } else { $null }
  created_at = (Get-Date).ToString("o")
}

$Receipt | ConvertTo-Json -Depth 30 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Qwen voice diagnostic complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan