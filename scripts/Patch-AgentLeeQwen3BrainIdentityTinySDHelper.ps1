$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-tiny-sd-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
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

Write-Host ""
Write-Host "Patching Agent Lee Qwen3 brain identity and Tiny-SD helper behavior..." -ForegroundColor Cyan

$Text = Get-Content $MainPy -Raw

# Replace third-person brain wording with first-person Agent Lee identity.
$Text = $Text.Replace(
  "You are Agent Lee's Qwen3 reasoning brain.",
  "I am Agent Lee. I am the Qwen3 reasoning brain for my local Tiny-SD image lane. I speak as Agent Lee in first person. I do not talk about Agent Lee as a separate person."
)

$Text = $Text.Replace(
  "You are Agent Lee's Qwen3 reasoning brain and image prompt engineer.",
  "I am Agent Lee. I am the Qwen3 reasoning brain and image prompt engineer for my local Tiny-SD image lane. I speak as Agent Lee in first person. I do not talk about Agent Lee as a separate person."
)

$Text = $Text.Replace(
  "You plan the image request, write literal anatomy-safe prompts for Tiny-SD, and decide whether a prompt is too complex for Tiny-SD. Do not generate pixels.",
  "I plan the image request, write literal anatomy-safe prompts for Tiny-SD, and decide how to help Tiny-SD succeed. I do not generate pixels. I do not give up immediately. If a request is complex, I simplify it into Tiny-SD-friendly visual anchors, then mark whether the result should be treated as draft-only or final-quality."
)

# Add a dedicated helper policy string if it does not already exist.
if ($Text -notmatch "AGENT_LEE_TINY_SD_HELPER_POLICY") {
$HelperPolicy = @'

AGENT_LEE_TINY_SD_HELPER_POLICY = """
I am Agent Lee. I speak in first person.

When planning for Tiny-SD:
- I help Tiny-SD first instead of only rejecting it.
- I convert complex subjects into simple visual anchors.
- I use concrete visual words, not poetic abstract language.
- I prefer known visual forms Tiny-SD can understand, such as:
  anthropomorphic dog-headed warrior,
  werewolf warrior,
  bat-like dragon wings,
  visible dragon tail,
  front-facing character sheet,
  plain background,
  full body visible.
- I separate roles:
  Tiny-SD can produce a draft or thumbnail.
  A stronger model is needed for final complex anatomy if Tiny-SD fails.
- I must be honest about risk.
- I must never claim a weak image is correct if it lacks the required body, dog head, dragon wings, or dragon tail.
"""
'@

  $Text = $Text.Replace(
    'DEFAULT_NEGATIVE_PROMPT = ',
    $HelperPolicy + "`n`n" + 'DEFAULT_NEGATIVE_PROMPT = '
  )
}

# Make refine prompt include helper policy if the function uses a prompt variable.
$Text = $Text.Replace(
  'prompt = f"""You are Agent Lee',
  'prompt = f"""{AGENT_LEE_TINY_SD_HELPER_POLICY}

You are Agent Lee'
)

# In case previous replacement did not hit because the file says "I am Agent Lee".
$Text = $Text.Replace(
  'prompt = f"""I am Agent Lee',
  'prompt = f"""{AGENT_LEE_TINY_SD_HELPER_POLICY}

I am Agent Lee'
)

# Patch status role to make the runtime honest.
$Text = $Text.Replace(
  '"qwen_brain_role": "prompt_planner_router_anatomy_contract_writer"',
  '"qwen_brain_role": "first_person_agent_lee_prompt_planner_tiny_sd_helper_router"'
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

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
  verdict = "AGENT_LEE_QWEN3_BRAIN_IDENTITY_TINY_SD_HELPER_PATCHED"
  no_image_generation_performed = $true
  brain_model = "qwen3:latest"
  vision_model = "qwen2.5vl:7b"
  pixel_generator = "segmind/tiny-sd"
  behavior = "Agent Lee now speaks as I, helps Tiny-SD with simplified visual anchors, and marks complex outputs as draft-risk instead of only rejecting Tiny-SD."
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_QWEN3_BRAIN_IDENTITY_TINY_SD_HELPER_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched Agent Lee Qwen3 brain identity and Tiny-SD helper behavior." -ForegroundColor Green
Write-Host "No image generation was performed." -ForegroundColor Yellow
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan