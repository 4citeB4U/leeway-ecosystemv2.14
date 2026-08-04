$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-tiny-sd-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$Dockerfile = Join-Path $ServiceRoot "Dockerfile"
$ImageName = "agent-lee-tiny-sd-image-lane:local"
$ContainerName = "agent-lee-tiny-sd-image-lane"
$NetworkName = "leeway-ecosystemv214_leeway-net"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\tiny-sd-image-lane"
$Proof = Join-Path $Root "Archive\proofs\tiny-sd-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

if (-not (Test-Path $Dockerfile)) {
  throw "Dockerfile not found: $Dockerfile"
}

Write-Host ""
Write-Host "Fixing Agent Lee brain model to installed local Ollama model..." -ForegroundColor Cyan

$OllamaRaw = docker exec leeway_ollama ollama list 2>&1 | Out-String

$InstalledModels = @()
$OllamaRaw -split "`n" | ForEach-Object {
  $Line = $_.Trim()
  if ($Line -and $Line -notmatch "^NAME\s+") {
    $Parts = $Line -split "\s+"
    if ($Parts.Count -gt 0) {
      $InstalledModels += $Parts[0]
    }
  }
}

$PreferredBrain = "qwen3:latest"
$PreferredVision = "qwen2.5vl:7b"

if ($InstalledModels -notcontains $PreferredBrain) {
  throw "Required brain model is not installed in leeway_ollama: $PreferredBrain. Installed: $($InstalledModels -join ', ')"
}

if ($InstalledModels -notcontains $PreferredVision) {
  throw "Required vision reviewer model is not installed in leeway_ollama: $PreferredVision. Installed: $($InstalledModels -join ', ')"
}

$Text = Get-Content $MainPy -Raw

# Force default brain model to qwen3:latest.
$Text = [regex]::Replace(
  $Text,
  'QWEN_BRAIN_MODEL = os\.environ\.get\("AGENT_LEE_QWEN_BRAIN_MODEL",\s*"[^"]+"\)',
  'QWEN_BRAIN_MODEL = os.environ.get("AGENT_LEE_QWEN_BRAIN_MODEL", "qwen3:latest")'
)

# Force default vision model to qwen2.5vl:7b.
$Text = [regex]::Replace(
  $Text,
  'QWEN_VISION_MODEL = os\.environ\.get\("AGENT_LEE_QWEN_VISION_MODEL",\s*"[^"]+"\)',
  'QWEN_VISION_MODEL = os.environ.get("AGENT_LEE_QWEN_VISION_MODEL", "qwen2.5vl:7b")'
)

# Avoid saying omni if the installed model is not omni.
$Text = $Text.Replace(
  '"qwen_role": "qwen3_omni_brain_planner_plus_vision_reviewer"',
  '"qwen_role": "qwen3_brain_planner_plus_qwen25vl_vision_reviewer"'
)

$Text = $Text.Replace(
  "You are Agent Lee's Qwen3-Omni brain.",
  "You are Agent Lee's Qwen3 reasoning brain."
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

$Docker = Get-Content $Dockerfile -Raw

$Docker = [regex]::Replace(
  $Docker,
  'ENV AGENT_LEE_QWEN_BRAIN_MODEL=.*',
  'ENV AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest'
)

$Docker = [regex]::Replace(
  $Docker,
  'ENV AGENT_LEE_QWEN_VISION_MODEL=.*',
  'ENV AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b'
)

Set-Content -Path $Dockerfile -Value $Docker -Encoding UTF8

docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }
if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

docker run -d `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "8098:8094" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=segmind/tiny-sd" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest" `
  -e "AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b" `
  -e "AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b" `
  -e "AGENT_LEE_ENABLE_QWEN_REFINE=1" `
  -e "AGENT_LEE_ENABLE_QWEN_REVIEW=1" `
  $ImageName | Out-Null

Start-Sleep -Seconds 5

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_TINY_SD_BRAIN_FIXED_TO_INSTALLED_QWEN3"
  no_image_generation_performed = $true
  selected_brain_model = "qwen3:latest"
  selected_vision_model = "qwen2.5vl:7b"
  pixel_generator = "segmind/tiny-sd"
  installed_ollama_models = $InstalledModels
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TINY_SD_BRAIN_FIXED_TO_INSTALLED_QWEN3_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Fixed brain model to installed qwen3:latest." -ForegroundColor Green
Write-Host "No image generation was performed." -ForegroundColor Yellow
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan