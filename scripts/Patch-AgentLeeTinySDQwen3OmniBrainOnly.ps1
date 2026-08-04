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
Write-Host "Patching Agent Lee Tiny-SD lane: Qwen3-Omni brain only, no image generation..." -ForegroundColor Cyan

# ------------------------------------------------------------
# Check local Ollama model tags.
# ------------------------------------------------------------
$OllamaTagsRaw = ""
$OllamaTags = @()

try {
  $OllamaTagsRaw = docker exec leeway_ollama ollama list 2>&1 | Out-String
  $OllamaTags = $OllamaTagsRaw -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}
catch {
  $OllamaTagsRaw = "ERROR: $($_.Exception.Message)"
}

$PossibleOmniTags = @(
  "qwen3-omni:latest",
  "qwen3-omni:30b-a3b",
  "qwen3-omni-30b-a3b:latest",
  "qwen3-omni-30b-a3b-instruct:latest",
  "qwen3omni:latest",
  "qwen3:omni"
)

$DetectedOmniTag = $null

foreach ($Tag in $PossibleOmniTags) {
  $NameOnly = $Tag.Split(":")[0]
  if ($OllamaTagsRaw -match [regex]::Escape($Tag) -or $OllamaTagsRaw -match [regex]::Escape($NameOnly)) {
    $DetectedOmniTag = $Tag
    break
  }
}

$BrainModel = "qwen3:latest"

if ($DetectedOmniTag) {
  $BrainModel = $DetectedOmniTag
}

Write-Host "Detected brain model to use: $BrainModel" -ForegroundColor Green

# ------------------------------------------------------------
# Patch app/main.py.
# ------------------------------------------------------------
$Text = Get-Content $MainPy -Raw

# Normalize any earlier Qwen model declarations.
if ($Text -match 'QWEN_BRAIN_MODEL = os\.environ\.get\("AGENT_LEE_QWEN_BRAIN_MODEL"') {
  $Text = [regex]::Replace(
    $Text,
    'QWEN_BRAIN_MODEL = os\.environ\.get\("AGENT_LEE_QWEN_BRAIN_MODEL",\s*"[^"]+"\)',
    'QWEN_BRAIN_MODEL = os.environ.get("AGENT_LEE_QWEN_BRAIN_MODEL", "qwen3:latest")'
  )
}
else {
  $Text = $Text.Replace(
    'QWEN_MODEL = os.environ.get("AGENT_LEE_QWEN_VL_MODEL", "qwen2.5vl:7b")',
    'QWEN_BRAIN_MODEL = os.environ.get("AGENT_LEE_QWEN_BRAIN_MODEL", "qwen3:latest")
QWEN_VISION_MODEL = os.environ.get("AGENT_LEE_QWEN_VISION_MODEL", "qwen2.5vl:7b")
QWEN_MODEL = QWEN_VISION_MODEL'
  )
}

if ($Text -notmatch 'QWEN_VISION_MODEL = os\.environ\.get\("AGENT_LEE_QWEN_VISION_MODEL"') {
  $Text = $Text.Replace(
    'QWEN_MODEL = QWEN_VISION_MODEL',
    'QWEN_VISION_MODEL = os.environ.get("AGENT_LEE_QWEN_VISION_MODEL", "qwen2.5vl:7b")
QWEN_MODEL = QWEN_VISION_MODEL'
  )
}

# Text prompt calls should use Qwen3-Omni brain.
$Text = $Text.Replace(
  '"model": QWEN_MODEL,
            "prompt": prompt,',
  '"model": QWEN_BRAIN_MODEL,
            "prompt": prompt,'
)

# Image review calls should keep vision model unless later proven Qwen3-Omni tag supports image input through Ollama.
$Text = $Text.Replace(
  '"model": QWEN_BRAIN_MODEL,
            "prompt": review_prompt,',
  '"model": QWEN_VISION_MODEL,
            "prompt": review_prompt,'
)

# Make status show both brain and vision roles.
if ($Text -notmatch '"qwen_brain_model": QWEN_BRAIN_MODEL') {
  $Text = $Text.Replace(
    '"qwen_model": QWEN_MODEL,',
    '"qwen_brain_model": QWEN_BRAIN_MODEL,
        "qwen_vision_model": QWEN_VISION_MODEL,
        "qwen_model": QWEN_VISION_MODEL,'
  )
}

# Make receipts show both roles.
if ($Text -notmatch '"qwen_brain_role"') {
  $Text = $Text.Replace(
    '"qwen_role": "brain_prompt_refiner_and_strict_visual_reviewer_only",',
    '"qwen_role": "qwen3_omni_brain_planner_plus_vision_reviewer",
        "qwen_brain_role": "prompt_planner_router_anatomy_contract_writer",
        "qwen_vision_role": "generated_image_visual_reviewer",'
  )
}

# Tighten prompt-engineer identity.
$Text = $Text.Replace(
  "You are Agent Lee's image prompt engineer.",
  "You are Agent Lee's Qwen3-Omni brain. You plan the image request, write literal anatomy-safe prompts for Tiny-SD, and decide whether a prompt is too complex for Tiny-SD. Do not generate pixels."
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

# ------------------------------------------------------------
# Patch Dockerfile default envs.
# ------------------------------------------------------------
$Docker = Get-Content $Dockerfile -Raw

if ($Docker -notmatch "AGENT_LEE_QWEN_BRAIN_MODEL") {
  $Docker = $Docker.Replace(
    'ENV AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b',
    'ENV AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest
ENV AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b
ENV AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b'
  )
}

Set-Content -Path $Dockerfile -Value $Docker -Encoding UTF8

# ------------------------------------------------------------
# Build and restart only. No generation.
# ------------------------------------------------------------
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
  -e "AGENT_LEE_QWEN_BRAIN_MODEL=$BrainModel" `
  -e "AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b" `
  -e "AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b" `
  -e "AGENT_LEE_ENABLE_QWEN_REFINE=1" `
  -e "AGENT_LEE_ENABLE_QWEN_REVIEW=1" `
  $ImageName | Out-Null

Start-Sleep -Seconds 5

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8098/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_TINY_SD_QWEN3_OMNI_BRAIN_ONLY_PATCHED"
  no_image_generation_performed = $true
  detected_omni_tag = $DetectedOmniTag
  selected_brain_model = $BrainModel
  fallback_if_no_omni_tag = "qwen3:latest"
  pixel_generator = "segmind/tiny-sd"
  vision_reviewer = "qwen2.5vl:7b"
  note = "Qwen3-Omni is used as brain only if installed in Ollama. Tiny-SD remains the only pixel generator. This script does not create images."
  ollama_tags_raw = $OllamaTagsRaw
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TINY_SD_QWEN3_OMNI_BRAIN_ONLY_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched and restarted: Qwen3-Omni brain only, Tiny-SD pixel tool preserved." -ForegroundColor Green
Write-Host "No image generation was performed." -ForegroundColor Yellow
Write-Host "Selected brain model: $BrainModel" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan