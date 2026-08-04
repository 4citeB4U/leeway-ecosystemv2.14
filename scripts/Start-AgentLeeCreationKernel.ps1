$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-creation-kernel"
$Artifacts = Join-Path $Root "Archive\creation-kernel"
$Models = Join-Path $Root "models"

New-Item -ItemType Directory -Force -Path $Proof, $Artifacts | Out-Null

Write-Host "Starting Agent Lee Creation Kernel..." -ForegroundColor Cyan

$ImageExists = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -eq "agent-lee-creation-kernel:local" }

if (-not $ImageExists) {
  throw "Missing Docker image: agent-lee-creation-kernel:local"
}

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq "agent-lee-creation-kernel" }

if ($Existing) {
  docker rm -f agent-lee-creation-kernel | Out-Null
}

$DockerArgs = @(
  "run",
  "-d",
  "--name", "agent-lee-creation-kernel",
  "--restart", "unless-stopped",
  "--network", "leeway-ecosystemv214_leeway-net",
  "-p", "8098:8094",
  "-e", "HF_HOME=/models/huggingface",
  "-e", "TRANSFORMERS_CACHE=/models/huggingface",
  "-e", "DIFFUSERS_CACHE=/models/huggingface",
  "-e", "AGENT_LEE_CREATION_OUTPUT_DIR=/creation-output",
  "--mount", "type=bind,source=$Artifacts,target=/creation-output",
  "--mount", "type=bind,source=$Models,target=/models",
  "agent-lee-creation-kernel:local"
)

docker @DockerArgs | Out-Null

Start-Sleep -Seconds 10

$Checks = @{}

function Check-Uri {
  param(
    [string]$Name,
    [string]$Uri
  )

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

Check-Uri -Name "root" -Uri "http://127.0.0.1:8098/"
Check-Uri -Name "health" -Uri "http://127.0.0.1:8098/health"
Check-Uri -Name "docs" -Uri "http://127.0.0.1:8098/docs"
Check-Uri -Name "openapi" -Uri "http://127.0.0.1:8098/openapi.json"

$DockerPs = docker ps -a --filter "name=agent-lee-creation-kernel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" | Out-String -Width 4096
$Logs = ""

try {
  $Logs = (& docker logs --tail 180 agent-lee-creation-kernel 2>&1) | Out-String -Width 4096
}
catch {
  $Logs = "docker logs capture warning: $($_.Exception.Message)"
}

$Receipt = @{
  verdict = "AGENT_LEE_CREATION_KERNEL_STARTED"
  image = "agent-lee-creation-kernel:local"
  container = "agent-lee-creation-kernel"
  host_url = "http://127.0.0.1:8098"
  docker_url = "http://agent-lee-creation-kernel:8094"
  host_port = 8098
  container_port = 8094
  reason_for_host_port_8098 = "agent-lee-ears-kernel already uses host port 8094"
  output_dir = $Artifacts
  models_dir = $Models
  docker_ps = $DockerPs
  checks = $Checks
  logs_tail = $Logs
  running_containers = (docker ps --format "{{.Names}}")
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_CREATION_KERNEL_STARTED.receipt.json"
$Receipt | ConvertTo-Json -Depth 30 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee Creation Kernel start attempted." -ForegroundColor Green
Write-Host "Host URL: http://127.0.0.1:8098" -ForegroundColor Cyan
Write-Host "Docker URL: http://agent-lee-creation-kernel:8094" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan