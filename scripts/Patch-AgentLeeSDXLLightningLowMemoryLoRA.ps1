$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$Dockerfile = Join-Path $ServiceRoot "Dockerfile"
$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$ContainerName = "agent-lee-sdxl-lightning-image-lane"
$NetworkName = "leeway-ecosystemv214_leeway-net"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

if (-not (Test-Path $Dockerfile)) {
  throw "Dockerfile not found: $Dockerfile"
}

Write-Host ""
Write-Host "Patching SDXL-Lightning lane to low-memory LoRA mode..." -ForegroundColor Cyan

$Text = Get-Content $MainPy -Raw

# Remove imports we no longer need for full UNet checkpoint mode.
$Text = $Text.Replace(
  "from diffusers import StableDiffusionXLPipeline, UNet2DConditionModel, EulerDiscreteScheduler",
  "from diffusers import StableDiffusionXLPipeline, EulerDiscreteScheduler"
)

$Text = $Text.Replace(
  "from huggingface_hub import hf_hub_download`nfrom pydantic import BaseModel, Field`nfrom safetensors.torch import load_file",
  "from pydantic import BaseModel, Field"
)

$Text = $Text.Replace(
  "from huggingface_hub import hf_hub_download`r`nfrom pydantic import BaseModel, Field`r`nfrom safetensors.torch import load_file",
  "from pydantic import BaseModel, Field"
)

# Replace checkpoint envs with LoRA envs.
$Text = [regex]::Replace(
  $Text,
  'LIGHTNING_CKPT = os\.environ\.get\("AGENT_LEE_LIGHTNING_CKPT",\s*"[^"]+"\)',
  'LIGHTNING_LORA = os.environ.get("AGENT_LEE_LIGHTNING_LORA", "sdxl_lightning_4step_lora.safetensors")'
)

# Replace health/status references.
$Text = $Text.Replace('"lightning_ckpt": LIGHTNING_CKPT,', '"lightning_lora": LIGHTNING_LORA,')
$Text = $Text.Replace('"lightning_ckpt": LIGHTNING_CKPT,', '"lightning_lora": LIGHTNING_LORA,')
$Text = $Text.Replace('"image_generator": "sdxl_lightning_4step_unet"', '"image_generator": "sdxl_lightning_4step_lora_low_memory"')
$Text = $Text.Replace('"lightning_ckpt": LIGHTNING_CKPT,', '"lightning_lora": LIGHTNING_LORA,')

# Keep sizes lower for first working pass.
$Text = $Text.Replace(
  "width: int = 1024",
  "width: int = 768"
)

$Text = $Text.Replace(
  "height: int = 1024",
  "height: int = 768"
)

$Text = $Text.Replace(
  "def normalize_size(value: int, fallback: int = 1024) -> int:",
  "def normalize_size(value: int, fallback: int = 768) -> int:"
)

# Replace load_pipe with low-memory LoRA pipeline.
$Pattern = 'def load_pipe\(\):\s+global PIPE, PIPE_LOADED_AT, LOAD_ERROR(?s).*?def generate_one\('

$Replacement = @'
def load_pipe():
    global PIPE, PIPE_LOADED_AT, LOAD_ERROR

    if PIPE is not None:
        return PIPE

    try:
        if DEVICE != "cuda":
            raise RuntimeError("SDXL-Lightning lane requires CUDA for practical local use.")

        pipe = StableDiffusionXLPipeline.from_pretrained(
            SDXL_BASE_MODEL,
            torch_dtype=DTYPE,
            variant="fp16",
            use_safetensors=True,
            low_cpu_mem_usage=True,
        )

        pipe.scheduler = EulerDiscreteScheduler.from_config(
            pipe.scheduler.config,
            timestep_spacing="trailing",
        )

        # Low-memory mode: use SDXL-Lightning LoRA instead of full UNet checkpoint.
        pipe.load_lora_weights(
            LIGHTNING_REPO,
            weight_name=LIGHTNING_LORA,
        )

        pipe.fuse_lora()

        # Put model on GPU after LoRA load/fuse.
        pipe = pipe.to(DEVICE)

        pipe.enable_vae_slicing()
        pipe.enable_attention_slicing()

        PIPE = pipe
        PIPE_LOADED_AT = now_iso()
        LOAD_ERROR = None
        return PIPE

    except Exception as e:
        LOAD_ERROR = str(e)
        raise


def generate_one(
'@

$Text = [regex]::Replace($Text, $Pattern, $Replacement)

# Make receipt say LoRA not full UNet.
$Text = $Text.Replace(
  '"image_generator": "ByteDance/SDXL-Lightning"',
  '"image_generator": "ByteDance/SDXL-Lightning LoRA"'
)

$Text = $Text.Replace(
  '"lightning_ckpt": LIGHTNING_CKPT,',
  '"lightning_lora": LIGHTNING_LORA,'
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

$Docker = Get-Content $Dockerfile -Raw

$Docker = $Docker.Replace(
  "ENV AGENT_LEE_LIGHTNING_CKPT=sdxl_lightning_4step_unet.safetensors",
  "ENV AGENT_LEE_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors"
)

$Docker = $Docker.Replace(
  "ENV AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning",
  "ENV AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA"
)

Set-Content -Path $Dockerfile -Value $Docker -Encoding UTF8

Write-Host "Rebuilding image..." -ForegroundColor Cyan
docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

if ($Existing) {
  docker rm -f $ContainerName | Out-Null
}

Write-Host "Starting SDXL-Lightning LoRA low-memory lane..." -ForegroundColor Cyan

docker run -d `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "8099:8095" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA" `
  -e "AGENT_LEE_SDXL_BASE_MODEL=stabilityai/stable-diffusion-xl-base-1.0" `
  -e "AGENT_LEE_LIGHTNING_REPO=ByteDance/SDXL-Lightning" `
  -e "AGENT_LEE_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors" `
  -e "AGENT_LEE_LIGHTNING_STEPS=4" `
  -e "AGENT_LEE_ARTIFACT_ROOT=/artifacts" `
  -e "HF_HOME=/models/huggingface" `
  -e "HF_HUB_CACHE=/models/huggingface/hub" `
  -e "TRANSFORMERS_CACHE=/models/huggingface" `
  -e "DIFFUSERS_CACHE=/models/huggingface" `
  -e "OLLAMA_BASE_URL=http://leeway_ollama:11434" `
  -e "AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest" `
  -e "AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b" `
  $ImageName | Out-Null

Start-Sleep -Seconds 8

$Status = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8099/status" -TimeoutSec 30

$Receipt = @{
  verdict = "AGENT_LEE_SDXL_LIGHTNING_LOW_MEMORY_LORA_PATCHED"
  no_image_generation_performed = $true
  reason = "Previous full UNet SDXL-Lightning lane was OOMKilled with ExitCode 137. This patch switches to SDXL-Lightning 4-step LoRA and 768 default size."
  container = $ContainerName
  image = $ImageName
  host_port = 8099
  container_port = 8095
  image_generator = "ByteDance/SDXL-Lightning 4-step LoRA"
  sdxl_base = "stabilityai/stable-diffusion-xl-base-1.0"
  qwen_brain = "qwen3:latest"
  qwen_vision = "qwen2.5vl:7b"
  three_d_lanes_touched = $false
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SDXL_LIGHTNING_LOW_MEMORY_LORA_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched SDXL-Lightning lane to low-memory LoRA mode." -ForegroundColor Green
Write-Host "No image generation was performed." -ForegroundColor Yellow
Write-Host "Status:  http://127.0.0.1:8099/status" -ForegroundColor Cyan
Write-Host "Warmup:  http://127.0.0.1:8099/warmup" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan