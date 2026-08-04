$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-creation-kernel"
$Artifacts = Join-Path $Root "Archive\creation-kernel"
$Models = Join-Path $Root "models"
$EnvPath = Join-Path $Root ".env.local"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof, $Artifacts, $Models | Out-Null

Write-Host ""
Write-Host "Restarting Agent Lee Creation Kernel with GPU + Hugging Face token support..." -ForegroundColor Cyan

# -----------------------------
# Verify image exists
# -----------------------------
$ImageExists = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -eq "agent-lee-creation-kernel:local" }

if (-not $ImageExists) {
  throw "Missing Docker image: agent-lee-creation-kernel:local"
}

# -----------------------------
# Read .env.local safely
# -----------------------------
$EnvPairs = @{}

if (Test-Path $EnvPath) {
  Get-Content $EnvPath | ForEach-Object {
    $Line = $_.Trim()

    if ($Line -eq "") { return }
    if ($Line.StartsWith("#")) { return }
    if ($Line -notmatch "=") { return }

    $Parts = $Line.Split("=", 2)
    $Key = $Parts[0].Trim()
    $Value = $Parts[1].Trim().Trim('"').Trim("'")

    if ($Key) {
      $EnvPairs[$Key] = $Value
    }
  }
}
else {
  Write-Host ".env.local not found at $EnvPath" -ForegroundColor Yellow
}

# -----------------------------
# Locate Hugging Face token
# Do NOT print token value.
# -----------------------------
$HfTokenKeys = @(
  "HF_TOKEN",
  "HUGGINGFACE_TOKEN",
  "HUGGING_FACE_HUB_TOKEN",
  "HF_HUB_TOKEN"
)

$HfTokenKey = $HfTokenKeys |
  Where-Object { $EnvPairs.ContainsKey($_) -and $EnvPairs[$_] } |
  Select-Object -First 1

$HfToken = ""

if ($HfTokenKey) {
  $HfToken = $EnvPairs[$HfTokenKey]
  Write-Host "Using Hugging Face token key from .env.local: $HfTokenKey" -ForegroundColor Green
}
else {
  Write-Host "No Hugging Face token found in .env.local under HF_TOKEN / HUGGINGFACE_TOKEN / HUGGING_FACE_HUB_TOKEN / HF_HUB_TOKEN." -ForegroundColor Yellow
}

# -----------------------------
# Stop old container
# -----------------------------
$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq "agent-lee-creation-kernel" }

if ($Existing) {
  Write-Host "Removing existing agent-lee-creation-kernel container..." -ForegroundColor DarkGray
  docker rm -f agent-lee-creation-kernel | Out-Null
}
else {
  Write-Host "No existing agent-lee-creation-kernel container to remove." -ForegroundColor DarkGray
}

# -----------------------------
# Start with GPU and token
# Internal app port is 8094.
# Host port is 8098 to avoid conflict with ears kernel on 8094.
# -----------------------------
$DockerArgs = @(
  "run",
  "-d",
  "--name", "agent-lee-creation-kernel",
  "--restart", "unless-stopped",
  "--gpus", "all",
  "--network", "leeway-ecosystemv214_leeway-net",
  "-p", "8098:8094",

  "-e", "NVIDIA_VISIBLE_DEVICES=all",
  "-e", "NVIDIA_DRIVER_CAPABILITIES=compute,utility",
  "-e", "CUDA_VISIBLE_DEVICES=0",

  "-e", "HF_HOME=/models/huggingface",
  "-e", "TRANSFORMERS_CACHE=/models/huggingface",
  "-e", "DIFFUSERS_CACHE=/models/huggingface",
  "-e", "HF_HUB_DISABLE_SYMLINKS_WARNING=1",

  "-e", "HF_TOKEN=$HfToken",
  "-e", "HUGGINGFACE_TOKEN=$HfToken",
  "-e", "HUGGING_FACE_HUB_TOKEN=$HfToken",
  "-e", "HF_HUB_TOKEN=$HfToken",

  "-e", "AGENT_LEE_CREATION_OUTPUT_DIR=/creation-output",
  "-e", "AGENT_LEE_CREATION_DEVICE_MODE=cuda",
  "-e", "CREATION_DEVICE_MODE=cuda",
  "-e", "DEVICE_MODE=cuda",
  "-e", "FORCE_CUDA=1",

  "-e", "AGENT_LEE_CREATION_OPTIMIZATION_PROFILE=GPU_FAST",
  "-e", "CREATION_OPTIMIZATION_PROFILE=GPU_FAST",
  "-e", "OPTIMIZATION_PROFILE=GPU_FAST",
  "-e", "AGENT_LEE_CREATION_PROFILE=GPU_FAST",

  "-e", "PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True",

  "--mount", "type=bind,source=$Artifacts,target=/creation-output",
  "--mount", "type=bind,source=$Models,target=/models",

  "agent-lee-creation-kernel:local"
)

docker @DockerArgs | Out-Null

Start-Sleep -Seconds 10

# -----------------------------
# Collect proof
# -----------------------------
$DockerPs = docker ps -a --filter "name=agent-lee-creation-kernel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" | Out-String -Width 4096

$TorchCheck = ""
try {
  $TorchCheck = cmd /c "docker exec agent-lee-creation-kernel python -c ""import torch, json; print(json.dumps({'torch': torch.__version__, 'cuda_available': torch.cuda.is_available(), 'device_count': torch.cuda.device_count(), 'device_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}, indent=2))"""
}
catch {
  $TorchCheck = "Torch CUDA check failed: $($_.Exception.Message)"
}

$TokenCheck = ""
try {
  $TokenCheck = cmd /c "docker exec agent-lee-creation-kernel python -c ""import os, json; print(json.dumps({'HF_TOKEN_exists': bool(os.getenv('HF_TOKEN')), 'HUGGINGFACE_TOKEN_exists': bool(os.getenv('HUGGINGFACE_TOKEN')), 'HUGGING_FACE_HUB_TOKEN_exists': bool(os.getenv('HUGGING_FACE_HUB_TOKEN')), 'HF_HUB_TOKEN_exists': bool(os.getenv('HF_HUB_TOKEN'))}, indent=2))"""
}
catch {
  $TokenCheck = "Token check failed: $($_.Exception.Message)"
}

$NvidiaCheck = ""
try {
  $NvidiaCheck = cmd /c "docker exec agent-lee-creation-kernel sh -lc ""nvidia-smi || true"""
}
catch {
  $NvidiaCheck = "nvidia-smi check failed: $($_.Exception.Message)"
}

$Health = $null
$Status = $null
$OpenApi = $null

try {
  $Health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/health" -TimeoutSec 30
}
catch {
  $Health = @{ error = $_.Exception.Message }
}

try {
  $Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/status" -TimeoutSec 30
}
catch {
  $Status = @{ error = $_.Exception.Message }
}

try {
  $OpenApi = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/openapi.json" -TimeoutSec 30
}
catch {
  $OpenApi = @{ error = $_.Exception.Message }
}

$RouteSummary = @()

if ($OpenApi -and $OpenApi.paths) {
  foreach ($Prop in $OpenApi.paths.PSObject.Properties) {
    $Methods = ($Prop.Value.PSObject.Properties.Name -join ",")
    $RouteSummary += [pscustomobject]@{
      path = $Prop.Name
      methods = $Methods
    }
  }
}

$Logs = ""
try {
  $Logs = cmd /c "docker logs --tail 180 agent-lee-creation-kernel 2>&1"
}
catch {
  $Logs = "docker logs capture warning: $($_.Exception.Message)"
}

$Receipt = @{
  verdict = "AGENT_LEE_CREATION_KERNEL_GPU_HF_RESTART_ATTEMPTED"
  image = "agent-lee-creation-kernel:local"
  container = "agent-lee-creation-kernel"

  host_url = "http://127.0.0.1:8098"
  docker_url = "http://agent-lee-creation-kernel:8094"
  host_port = 8098
  container_port = 8094

  hf_token_key_detected = $HfTokenKey
  hf_token_present = [bool]$HfToken

  docker_ps = $DockerPs
  torch_cuda_check = $TorchCheck
  token_check = $TokenCheck
  nvidia_smi_check = $NvidiaCheck

  health = $Health
  status = $Status
  route_summary = $RouteSummary
  logs_tail = $Logs

  artifacts_dir = $Artifacts
  models_dir = $Models

  note = "Token value intentionally omitted from receipt."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_CREATION_KERNEL_GPU_HF_RESTART_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 40 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Creation Kernel GPU + Hugging Face restart attempted." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick checks:" -ForegroundColor Cyan
Write-Host "docker exec agent-lee-creation-kernel python -c `"import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else None)`""
Write-Host "docker exec agent-lee-creation-kernel python -c `"import os; print(bool(os.getenv('HF_TOKEN')))`""
Write-Host "Invoke-RestMethod -Method Get -Uri `"http://127.0.0.1:8098/status`" -TimeoutSec 30"