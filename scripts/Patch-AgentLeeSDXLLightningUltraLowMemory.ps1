$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Cerebral\services\agent-lee-sdxl-lightning-image-lane"
$MainPy = Join-Path $ServiceRoot "app\main.py"
$ImageName = "agent-lee-sdxl-lightning-image-lane:local"
$ContainerName = "agent-lee-sdxl-lightning-image-lane"
$NetworkName = "leeway-ecosystemv214_leeway-net"
$ModelsRoot = Join-Path $Root "models"
$Artifacts = Join-Path $Root "Archive\agent-lee-artifacts\sdxl-lightning-image-lane"
$Proof = Join-Path $Root "Archive\proofs\sdxl-lightning-image-lane"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null

if (-not (Test-Path $MainPy)) {
  throw "main.py not found: $MainPy"
}

Write-Host ""
Write-Host "Patching SDXL-Lightning lane to ULTRA low-memory mode..." -ForegroundColor Cyan
Write-Host "This does not touch 3D lanes." -ForegroundColor Yellow

$Text = Get-Content $MainPy -Raw

# Make sure defaults are safer for first load/test.
$Text = $Text.Replace("width: int = 768", "width: int = 512")
$Text = $Text.Replace("height: int = 768", "height: int = 768")
$Text = $Text.Replace("def normalize_size(value: int, fallback: int = 768) -> int:", "def normalize_size(value: int, fallback: int = 512) -> int:")

# Allow 512 minimum, 768 max for first stable pass.
$Text = [regex]::Replace(
  $Text,
  'if value > 1024:\s+value = 1024',
  'if value > 768:
        value = 768'
)

$Text = $Text.Replace("return max(512, min(1024, value))", "return max(512, min(768, value))")

# Replace current load_pipe with an ultra-low-memory loader.
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

        # Ultra-low-memory mode:
        # Load SDXL-Lightning as LoRA, do NOT fuse LoRA, and do NOT move the whole pipeline to CUDA at once.
        pipe.load_lora_weights(
            LIGHTNING_REPO,
            weight_name=LIGHTNING_LORA,
        )

        pipe.enable_vae_slicing()
        pipe.enable_attention_slicing()

        # This requires accelerate. It keeps parts on CPU and moves modules to GPU only when needed.
        pipe.enable_model_cpu_offload()

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

# Make receipt/status more explicit.
$Text = $Text.Replace(
  '"image_generator": "sdxl_lightning_4step_lora_low_memory"',
  '"image_generator": "sdxl_lightning_4step_lora_ultra_low_memory_cpu_offload"'
)

$Text = $Text.Replace(
  '"active_live_model": ACTIVE_MODEL,',
  '"active_live_model": ACTIVE_MODEL,
        "memory_mode": "ultra_low_memory_cpu_offload",
        "lora_fused": false,
        "whole_pipeline_to_cuda": false,'
)

$Text = $Text.Replace(
  '"image_generator": "ByteDance/SDXL-Lightning LoRA"',
  '"image_generator": "ByteDance/SDXL-Lightning LoRA ultra-low-memory CPU offload"'
)

Set-Content -Path $MainPy -Value $Text -Encoding UTF8

Write-Host "Rebuilding image..." -ForegroundColor Cyan
docker build -t $ImageName $ServiceRoot

$Existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $ContainerName }

if ($Existing) {
  Write-Host "Removing existing container..." -ForegroundColor Yellow
  docker rm -f $ContainerName | Out-Null
}

Write-Host "Starting container with --init..." -ForegroundColor Cyan

docker run -d `
  --init `
  --name $ContainerName `
  --gpus all `
  --network $NetworkName `
  -p "8099:8095" `
  --mount "type=bind,source=$ModelsRoot,target=/models" `
  --mount "type=bind,source=$Artifacts,target=/artifacts" `
  -e "AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA-UltraLowMemory" `
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
$InitState = docker inspect $ContainerName --format "Init={{.HostConfig.Init}} Status={{.State.Status}} OOMKilled={{.State.OOMKilled}}"

$Receipt = @{
  verdict = "AGENT_LEE_SDXL_LIGHTNING_ULTRA_LOW_MEMORY_PATCHED"
  no_image_generation_performed = $true
  reason = "Previous SDXL-Lightning loads OOMKilled under Docker. This patch uses LoRA without fuse_lora, avoids full pipeline CUDA load, enables model CPU offload, and starts container with --init."
  container = $ContainerName
  image = $ImageName
  host_port = 8099
  container_port = 8095
  init_state = $InitState
  image_generator = "ByteDance/SDXL-Lightning 4-step LoRA ultra-low-memory CPU offload"
  default_first_test_resolution = "512x768"
  qwen_brain = "qwen3:latest"
  qwen_vision = "qwen2.5vl:7b"
  three_d_lanes_touched = $false
  status = $Status
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_SDXL_LIGHTNING_ULTRA_LOW_MEMORY_PATCH_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Patched SDXL-Lightning to ultra-low-memory CPU offload mode." -ForegroundColor Green
Write-Host "No image generation was performed." -ForegroundColor Yellow
Write-Host "3D lanes were not touched." -ForegroundColor Yellow
Write-Host "Status:  http://127.0.0.1:8099/status" -ForegroundColor Cyan
Write-Host "Warmup:  http://127.0.0.1:8099/warmup" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan