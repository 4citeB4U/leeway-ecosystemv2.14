$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-on-demand-runtime"
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

Set-Location $Root

Write-Host "Starting Agent Lee on-demand runtime fabric..." -ForegroundColor Cyan

docker compose `
  -f ".\docker-compose.leeway.yml" `
  -f ".\docker-compose.leeway.gpu.override.yml" `
  -f ".\docker-compose.agent-lee-on-demand.override.yml" `
  up -d

Start-Sleep -Seconds 10

$Checks = @{}

function Check-Http {
  param([string]$Name, [string]$Uri)

  try {
    $Result = Invoke-RestMethod -Method Get -Uri $Uri -TimeoutSec 20
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
Check-Http -Name "qwen_voice" -Uri "http://127.0.0.1:8097/health"
Check-Http -Name "qwen_brain_ollama" -Uri "http://127.0.0.1:11434/api/tags"
Check-Http -Name "media_ingestion" -Uri "http://127.0.0.1:5300/health"
Check-Http -Name "media_router" -Uri "http://127.0.0.1:5301/health"
Check-Http -Name "vision_kernel" -Uri "http://127.0.0.1:8093/health"
Check-Http -Name "ears_kernel" -Uri "http://127.0.0.1:8094/health"

$Running = docker ps --format "{{.Names}}"

$Receipt = @{
  verdict = "AGENT_LEE_ON_DEMAND_RUNTIME_STARTED"
  single_entrypoint = "http://127.0.0.1:4001"
  checks = $Checks
  running_containers = $Running
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_ON_DEMAND_RUNTIME_STARTED.receipt.json"
$Receipt | ConvertTo-Json -Depth 30 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee on-demand runtime start complete." -ForegroundColor Green
Write-Host "Single entry point target: http://127.0.0.1:4001" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan