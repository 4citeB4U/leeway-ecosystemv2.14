$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Scripts = Join-Path $Root "scripts"
$Config = Join-Path $Root "config"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-on-demand-runtime"

New-Item -ItemType Directory -Force -Path $Scripts, $Config, $Proof | Out-Null

$RegistryPath = Join-Path $Config "agent-lee-on-demand-model-registry.json"
$DiscoveryPath = Join-Path $Config "leeway-discovery-endpoints.agent-lee.json"
$ComposePath = Join-Path $Root "docker-compose.agent-lee-on-demand.override.yml"
$EnvPath = Join-Path $Root ".env.local"

$Registry = @{
  schema = "leeway.agentlee.on_demand.registry.v1"
  verdict = "AGENT_LEE_ON_DEMAND_MODEL_ROLES_DECLARED"
  root = $Root
  single_entrypoint = @{
    service = "leeway_runtime_fabric"
    host_endpoint = "http://127.0.0.1:4001"
    docker_endpoint = "http://leeway_runtime_fabric:4001"
    purpose = "One access point for Agent Lee embodiment, model routing, discovery, tools, shells, and runtime status."
  }
  policy = @{
    no_bridge_sprawl = $true
    qwen_family_authority = $true
    all_models_loaded_at_once = $false
    load_strategy = "on-demand lanes with always-ready core"
    reason = "RTX laptop GPU and local RAM should not keep every large model hot. Runtime Fabric should route to the needed lane."
  }
  always_ready_core = @{
    brain = @{
      service = "leeway_ollama"
      endpoint = "http://127.0.0.1:11434"
      docker_endpoint = "http://ollama:11434"
      model = "qwen3:latest"
      purpose = "Agent Lee reasoning, planning, command interpretation, runtime thinking."
      local_path = "$Root\models\runtime\qwen3"
    }
    mouth = @{
      service = "agent-lee-qwen-voice"
      endpoint = "http://127.0.0.1:8097"
      docker_endpoint = "http://agent-lee-qwen-voice:8097"
      model_path = "$Root\models\voice\qwen3-tts"
      clone_assets = "$Root\models\voice\agent-lee-clone"
      reference_audio = "$Root\Agent_Voice_One.m4a"
      purpose = "Agent Lee cloned speech output."
    }
    telegram_shell = @{
      env_file = "$Root\.env.local"
      purpose = "Outside-world shell. Agent Lee must be able to send/receive through Telegram without desktop shells."
      required_keys = @("TELEGRAM_BOT_TOKEN","TELEGRAM_CHAT_ID")
    }
    discovery = @{
      service = "leeway_runtime_fabric"
      purpose = "Self-awareness, endpoint map, lane status, and system capability discovery."
    }
  }
  on_demand_lanes = @{
    eyes = @{
      service = "agent-lee-vision-kernel"
      endpoint = "http://127.0.0.1:8093"
      model = "qwen2.5-vl"
      ollama_model = "qwen2.5vl:7b"
      local_path = "$Root\models\vision\qwen2.5-vl"
      purpose = "Camera, screenshot, image, visual context, screen reading."
      wake_policy = "start when visual analysis is requested"
    }
    ears = @{
      service = "agent-lee-ears-kernel"
      endpoint = "http://127.0.0.1:8094"
      candidates = @("qwen2-audio","qwen2-omni","qwen2.5-omni")
      local_paths = @{
        qwen2_audio = "$Root\models\voice\qwen2-audio"
        qwen2_omni = "$Root\models\voice\qwen2-omni"
        qwen25_omni = "$Root\models\voice\qwen2.5-omni"
      }
      purpose = "Speech/audio understanding. This replaces Windows speech recognition."
      wake_policy = "start when microphone/audio transcription is requested"
    }
    memory_embeddings = @{
      service = "leeway-media-ingestion-layer"
      endpoint = "http://127.0.0.1:5300"
      model = "qwen3-vl-embedding"
      local_path = "$Root\models\embeddings\qwen3-vl-embedding"
      purpose = "Seafile discovery, media indexing, document/image/video retrieval, memory search."
      wake_policy = "start when indexing, search, or retrieval is requested"
    }
    media_router = @{
      service = "leeway-media-router"
      endpoint = "http://127.0.0.1:5301"
      purpose = "Routes media jobs to embedding, vision, voice, ingestion, or output lanes."
      wake_policy = "start when media job requested"
    }
    omni_runtime = @{
      primary = "qwen2.5-omni"
      backup = "qwen2-omni"
      local_paths = @{
        qwen25_omni = "$Root\models\voice\qwen2.5-omni"
        qwen2_omni = "$Root\models\voice\qwen2-omni"
      }
      purpose = "Multimodal runtime awareness backup. Use for audio/vision fusion and runtime orchestration when needed."
      wake_policy = "on-demand only"
    }
  }
  existing_containers = @{
    seafile = @("leeway-seafile","leeway-seafile-db","leeway-seafile-cache")
    qwen_voice = @("agent-lee-qwen-voice")
    qwen_brain = @("leeway_ollama")
    runtime = @("leeway_runtime_fabric","agent_lee_code_mode","leeway_hybrid_fabric")
    agent_centers = @("leeway_agent_center","leeway_worker_center","leeway_mcp_center","leeway_mcp_agent_center")
    media = @("leeway_media_ingestion_layer","leeway_media_router")
    kernels = @("agent-lee-ears-kernel","agent-lee-vision-kernel")
    communication = @("leeway-jitsi-meet","web-1","jicofo-1","jvb-1","prosody-1")
  }
  created_at = (Get-Date).ToString("o")
}

$Registry | ConvertTo-Json -Depth 30 | Set-Content -Path $RegistryPath -Encoding UTF8

$Discovery = @{
  schema = "leeway.discovery.agentlee.endpoints.v1"
  authority = "leeway_runtime_fabric"
  one_entrypoint = "http://127.0.0.1:4001"
  public_contract = @{
    agent_alive = "/agent-lee/alive"
    agent_chat = "/agent-lee/chat"
    agent_voice = "/agent-lee/voice"
    discovery = "/discovery"
    model_registry = "/models"
    health = "/health"
    tools = "/tools"
    media = "/media"
    telegram = "/telegram"
  }
  internal_services = @{
    qwen_brain = @{
      service = "leeway_ollama"
      host = "http://127.0.0.1:11434"
      docker = "http://ollama:11434"
      models = @("qwen3:latest","qwen2.5vl:7b","qwen2.5-coder:7b")
    }
    qwen_voice = @{
      service = "agent-lee-qwen-voice"
      host = "http://127.0.0.1:8097"
      docker = "http://agent-lee-qwen-voice:8097"
      health = "/health"
      speak = "/speak"
      speak_file = "/speak-file"
    }
    vision_kernel = @{
      service = "agent-lee-vision-kernel"
      host = "http://127.0.0.1:8093"
      mode = "on-demand"
    }
    ears_kernel = @{
      service = "agent-lee-ears-kernel"
      host = "http://127.0.0.1:8094"
      mode = "on-demand"
    }
    media_ingestion = @{
      service = "leeway_media_ingestion_layer"
      host = "http://127.0.0.1:5300"
      mode = "on-demand"
    }
    media_router = @{
      service = "leeway_media_router"
      host = "http://127.0.0.1:5301"
      mode = "on-demand"
    }
    seafile = @{
      service = "leeway-seafile"
      host = "http://127.0.0.1:8082"
      purpose = "SEA file / Seafile knowledge and file base"
    }
  }
  model_policy = @{
    qwen_only_runtime_authority = $true
    non_qwen_models = "temporary wrappers only; not Agent Lee runtime authority"
    on_demand = $true
    always_ready = @("runtime-fabric","leeway_ollama","agent-lee-qwen-voice","telegram-shell")
  }
  created_at = (Get-Date).ToString("o")
}

$Discovery | ConvertTo-Json -Depth 30 | Set-Content -Path $DiscoveryPath -Encoding UTF8

@"
services:
  agent-lee-qwen-voice:
    image: agent-lee-qwen-voice:cuda
    container_name: agent-lee-qwen-voice
    restart: unless-stopped
    gpus: all
    ipc: host
    shm_size: "8gb"
    ports:
      - "8097:8097"
    environment:
      QWEN_TTS_MODEL_PATH: /models/voice/qwen3-tts
      AGENT_LEE_VOICE_OUTPUT_DIR: /voice-output
      AGENT_LEE_VOICE_REFERENCE: /voice-seeds/Agent_Voice_One.m4a
      AGENT_LEE_VOICE_MODE: clone
      AGENT_LEE_CLONE_MODE: speaker_vector
      QWEN_TTS_LANGUAGE: English
      QWEN_TTS_ATTN: sdpa
      NVIDIA_VISIBLE_DEVICES: all
      NVIDIA_DRIVER_CAPABILITIES: compute,utility
    volumes:
      - "./models/voice/qwen3-tts:/models/voice/qwen3-tts"
      - "./Archive/voice-output:/voice-output"
      - ".:/voice-seeds"
      - "./config:/leeway-config:ro"
    networks:
      - leeway-net

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

  leeway-media-ingestion-layer:
    environment:
      LEEWAY_EMBEDDING_MODEL_PATH: /models/embeddings/qwen3-vl-embedding
      LEEWAY_DISCOVERY_ENDPOINTS: /leeway-config/leeway-discovery-endpoints.agent-lee.json
    volumes:
      - "./models/embeddings/qwen3-vl-embedding:/models/embeddings/qwen3-vl-embedding:ro"
      - "./config:/leeway-config:ro"

  leeway-media-router:
    environment:
      LEEWAY_DISCOVERY_ENDPOINTS: /leeway-config/leeway-discovery-endpoints.agent-lee.json
      LEEWAY_MODEL_REGISTRY: /leeway-config/agent-lee-on-demand-model-registry.json
    volumes:
      - "./config:/leeway-config:ro"

  agent-lee-vision-kernel:
    environment:
      LEEWAY_VISION_MODEL_PATH: /models/vision/qwen2.5-vl
      LEEWAY_VISION_MODEL: qwen2.5-vl
      LEEWAY_DISCOVERY_ENDPOINTS: /leeway-config/leeway-discovery-endpoints.agent-lee.json
    volumes:
      - "./models/vision/qwen2.5-vl:/models/vision/qwen2.5-vl:ro"
      - "./config:/leeway-config:ro"

  agent-lee-ears-kernel:
    environment:
      LEEWAY_AUDIO_MODEL_QWEN2_PATH: /models/voice/qwen2-audio
      LEEWAY_OMNI_MODEL_QWEN2_PATH: /models/voice/qwen2-omni
      LEEWAY_OMNI_MODEL_QWEN25_PATH: /models/voice/qwen2.5-omni
      LEEWAY_DISCOVERY_ENDPOINTS: /leeway-config/leeway-discovery-endpoints.agent-lee.json
    volumes:
      - "./models/voice/qwen2-audio:/models/voice/qwen2-audio:ro"
      - "./models/voice/qwen2-omni:/models/voice/qwen2-omni:ro"
      - "./models/voice/qwen2.5-omni:/models/voice/qwen2.5-omni:ro"
      - "./config:/leeway-config:ro"

networks:
  leeway-net:
    external: true
    name: leeway-ecosystemv214_leeway-net
"@ | Set-Content -Path $ComposePath -Encoding UTF8

function Add-EnvLineIfMissing {
  param(
    [string]$Path,
    [string]$Key,
    [string]$Value
  )

  if (-not (Test-Path $Path)) {
    New-Item -ItemType File -Force -Path $Path | Out-Null
  }

  $Content = Get-Content $Path -Raw

  if ($Content -notmatch "(?m)^$([regex]::Escape($Key))=") {
    Add-Content -Path $Path -Value "$Key=$Value"
  }
}

Add-EnvLineIfMissing -Path $EnvPath -Key "LEEWAY_AGENT_ENTRYPOINT" -Value "http://127.0.0.1:4001"
Add-EnvLineIfMissing -Path $EnvPath -Key "LEEWAY_MODEL_REGISTRY" -Value ".\config\agent-lee-on-demand-model-registry.json"
Add-EnvLineIfMissing -Path $EnvPath -Key "LEEWAY_DISCOVERY_ENDPOINTS" -Value ".\config\leeway-discovery-endpoints.agent-lee.json"
Add-EnvLineIfMissing -Path $EnvPath -Key "AGENT_LEE_BRAIN_MODEL" -Value "qwen3:latest"
Add-EnvLineIfMissing -Path $EnvPath -Key "AGENT_LEE_BRAIN_SERVICE" -Value "http://127.0.0.1:11434"
Add-EnvLineIfMissing -Path $EnvPath -Key "AGENT_LEE_VOICE_SERVICE" -Value "http://127.0.0.1:8097"
Add-EnvLineIfMissing -Path $EnvPath -Key "AGENT_LEE_MODEL_POLICY" -Value "qwen-only-on-demand"

$Receipt = @{
  verdict = "AGENT_LEE_ON_DEMAND_RUNTIME_INSTALLED"
  registry = $RegistryPath
  discovery = $DiscoveryPath
  compose_override = $ComposePath
  env_local = $EnvPath
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_ON_DEMAND_RUNTIME_INSTALLED.receipt.json"
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $RegistryPath
notepad $DiscoveryPath
notepad $ComposePath
notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee on-demand runtime fabric installed." -ForegroundColor Green
Write-Host "Registry: $RegistryPath" -ForegroundColor Cyan
Write-Host "Discovery: $DiscoveryPath" -ForegroundColor Cyan
Write-Host "Compose override: $ComposePath" -ForegroundColor Cyan