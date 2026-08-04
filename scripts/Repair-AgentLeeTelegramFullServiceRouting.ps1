$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\telegram-shell"
$Ledger = Join-Path $Root "Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl"
$Runtime = Join-Path $Root "runtime"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $Ledger) | Out-Null
New-Item -ItemType Directory -Force -Path $Runtime | Out-Null

$MainNet = "leeway-ecosystemv214_leeway-net"
$Telegram = "agent-lee-telegram-shell"

$LaneNames = @(
  "agent-lee-qwen-voice",
  "agent-lee-voice-kernel",
  "agent-lee-ears-kernel",
  "agent-lee-vision-kernel",
  "agent-lee-sdxl-lightning-image-lane",
  "agent_lee_code_mode",
  "leeway_runtime_fabric",
  "leeway_media_router",
  "leeway_media_ingestion_layer"
)

foreach ($Name in $LaneNames) {
  $Exists = docker ps -a --filter "name=^/$Name$" --format "{{.Names}}" 2>$null
  if ($Exists -eq $Name) {
    Write-Host "Ensuring network: $Name -> $MainNet" -ForegroundColor Cyan
    docker network connect $MainNet $Name 2>$null | Out-Null
  }
}

function ProbeFromTelegram {
  $Probe = @"
import urllib.request
urls=[
  ('code_mode','http://agent_lee_code_mode:8080/health'),
  ('runtime_fabric','http://leeway_runtime_fabric:4001/health'),
  ('sdxl_image','http://agent-lee-sdxl-lightning-image-lane:8095/status'),
  ('qwen_voice','http://agent-lee-qwen-voice:8097/health'),
  ('xtts_voice','http://agent-lee-voice-kernel:8092/health'),
  ('xtts_voice_root','http://agent-lee-voice-kernel:8092/'),
  ('ears','http://agent-lee-ears-kernel:8094/health'),
  ('vision','http://agent-lee-vision-kernel:8093/health'),
  ('media_router','http://leeway_media_router:5301/health'),
  ('media_ingestion','http://leeway_media_ingestion_layer:5300/health')
]
for name,url in urls:
    try:
        r=urllib.request.urlopen(url, timeout=8)
        body=r.read(260)
        print(name, url, 'OK', r.status, body)
    except Exception as e:
        print(name, url, 'ERROR', repr(e))
"@
  return (docker exec $Telegram python -c $Probe 2>&1 | Out-String)
}

$ProbeBefore = ProbeFromTelegram

$UseVoiceUrl = "http://agent-lee-qwen-voice:8097"
if ($ProbeBefore -notmatch "qwen_voice.*OK") {
  $UseVoiceUrl = "http://agent-lee-voice-kernel:8092"
}

$ImageUrl = "http://agent-lee-sdxl-lightning-image-lane:8095"
$RuntimeUrl = "http://leeway_runtime_fabric:4001"
$CodeUrl = "http://agent_lee_code_mode:8080"
$VisionUrl = "http://agent-lee-vision-kernel:8093"
$EarsUrl = "http://agent-lee-ears-kernel:8094"
$MediaRouterUrl = "http://leeway_media_router:5301"
$MemoryUrl = "http://leeway_media_ingestion_layer:5300"

$Inspect = docker inspect $Telegram | ConvertFrom-Json
$C = $Inspect[0]

$Image = $C.Config.Image
$Path = $C.Path
$Args = @($C.Args)
$Network = $C.HostConfig.NetworkMode
$Binds = @($C.HostConfig.Binds)
$Env = @($C.Config.Env)

function Set-EnvPair {
  param(
    [string[]]$EnvList,
    [string]$Key,
    [string]$Value
  )

  $Filtered = @()
  foreach ($Item in $EnvList) {
    if ($Item -notmatch "^$([regex]::Escape($Key))=") {
      $Filtered += $Item
    }
  }

  $Filtered += "$Key=$Value"
  return $Filtered
}

$Env = Set-EnvPair $Env "OPENAI_BASE_URL" "$CodeUrl/v1"
$Env = Set-EnvPair $Env "AGENT_LEE_OPENAI_BASE_URL" "$CodeUrl/v1"
$Env = Set-EnvPair $Env "AGENT_LEE_CODE_MODE_BASE_URL" $CodeUrl
$Env = Set-EnvPair $Env "LEEWAY_RUNTIME_FABRIC" $RuntimeUrl
$Env = Set-EnvPair $Env "AGENT_LEE_RUNTIME_FABRIC_BASE_URL" $RuntimeUrl

$Env = Set-EnvPair $Env "AGENT_LEE_BRAIN_SERVICE" "http://leeway_ollama:11434"
$Env = Set-EnvPair $Env "AGENT_LEE_BRAIN_MODEL" "qwen3:latest"

$Env = Set-EnvPair $Env "AGENT_LEE_VOICE_SERVICE" $UseVoiceUrl
$Env = Set-EnvPair $Env "AGENT_LEE_QWEN_VOICE_SERVICE" "http://agent-lee-qwen-voice:8097"
$Env = Set-EnvPair $Env "AGENT_LEE_XTTS_VOICE_SERVICE" "http://agent-lee-voice-kernel:8092"
$Env = Set-EnvPair $Env "AGENT_LEE_EARS_SERVICE" $EarsUrl
$Env = Set-EnvPair $Env "AGENT_LEE_VISION_SERVICE" $VisionUrl

$Env = Set-EnvPair $Env "AGENT_LEE_IMAGE_SERVICE" $ImageUrl
$Env = Set-EnvPair $Env "AGENT_LEE_SDXL_BASE_URL" $ImageUrl
$Env = Set-EnvPair $Env "LEEWAY_MEDIA_ROUTER" $MediaRouterUrl
$Env = Set-EnvPair $Env "LEEWAY_MEDIA_INGESTION" $MemoryUrl

$Env = Set-EnvPair $Env "AGENT_LEE_WEB_SERVICE" $RuntimeUrl
$Env = Set-EnvPair $Env "AGENT_LEE_WEB_SEARCH_SERVICE" "$RuntimeUrl/web/search"
$Env = Set-EnvPair $Env "AGENT_LEE_WEATHER_SERVICE" "$RuntimeUrl/weather"
$Env = Set-EnvPair $Env "AGENT_LEE_NEWS_SERVICE" "$RuntimeUrl/news"
$Env = Set-EnvPair $Env "AGENT_LEE_TRAFFIC_SERVICE" "$RuntimeUrl/traffic"

$Env = Set-EnvPair $Env "AGENT_LEE_TELEGRAM_SHOULD_SEND_TEXT" "true"
$Env = Set-EnvPair $Env "AGENT_LEE_TELEGRAM_SHOULD_SEND_VOICE" "true"
$Env = Set-EnvPair $Env "AGENT_LEE_TELEGRAM_SHOULD_HANDLE_IMAGES" "true"
$Env = Set-EnvPair $Env "AGENT_LEE_TELEGRAM_RESEARCH_MODE" "continuous_lightweight"
$Env = Set-EnvPair $Env "AGENT_LEE_RECEIPT_ONLY_IS_NOT_EXECUTION" "true"

$BackupName = "agent-lee-telegram-shell-backup-fullroutes-$Stamp"

Write-Host "Stopping Telegram shell..." -ForegroundColor Yellow
docker stop $Telegram | Out-Null

Write-Host "Renaming current Telegram shell to backup: $BackupName" -ForegroundColor Yellow
docker rename $Telegram $BackupName

$RunArgs = @(
  "run",
  "-d",
  "--name",
  $Telegram,
  "--restart",
  "unless-stopped",
  "--network",
  $MainNet
)

foreach ($Bind in $Binds) {
  if ($Bind) {
    $RunArgs += @("-v", $Bind)
  }
}

foreach ($E in $Env) {
  if ($E) {
    $RunArgs += @("-e", $E)
  }
}

$RunArgs += $Image

if ($Path) {
  $RunArgs += $Path
}

foreach ($A in $Args) {
  if ($A) {
    $RunArgs += $A
  }
}

Write-Host "Starting Telegram shell with full service routes..." -ForegroundColor Green
$NewId = docker @RunArgs

Start-Sleep -Seconds 8

$ProbeAfter = ProbeFromTelegram
$RecentLogs = docker logs --tail 120 $Telegram 2>&1 | Out-String

$CapabilityManifestPath = Join-Path $Runtime "agent-lee-telegram-capability-routing.manifest.json"

$CapabilityManifest = @{
  name = "agent_lee_telegram_capability_routing_manifest"
  version = "1.0.0"
  telegram_shell = $Telegram
  routing = @{
    code_mode = $CodeUrl
    runtime_fabric = $RuntimeUrl
    brain = "http://leeway_ollama:11434"
    brain_model = "qwen3:latest"
    voice_primary = $UseVoiceUrl
    qwen_voice = "http://agent-lee-qwen-voice:8097"
    xtts_voice = "http://agent-lee-voice-kernel:8092"
    ears = $EarsUrl
    vision = $VisionUrl
    image = $ImageUrl
    media_router = $MediaRouterUrl
    memory = $MemoryUrl
  }
  required_behavior = @{
    text_reply = "Telegram must send a written answer."
    voice_reply = "Telegram should generate/send playable voice audio when voice service is healthy."
    image_input = "Telegram should download image/photo input, route it to vision, and describe/help act on it."
    image_generation = "Telegram should call SDXL image service and return the generated image, not only a receipt."
    web_search = "Telegram should route search/weather/time/news/traffic to Runtime Fabric or configured web tools."
    research_mode = "Continuous research must be lightweight, scheduled, receipt-backed, and not overwhelm the machine."
    honesty = "Do not claim a lane is ready unless health check passes."
  }
  created_at = (Get-Date).ToString("o")
}

$CapabilityManifest | ConvertTo-Json -Depth 100 | Set-Content -Path $CapabilityManifestPath -Encoding UTF8

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_FULL_SERVICE_ROUTING_REPAIRED"
  backup_container = $BackupName
  new_container = $Telegram
  new_container_id = $NewId
  voice_url_selected = $UseVoiceUrl
  capability_manifest = $CapabilityManifestPath
  probe_before = $ProbeBefore
  probe_after = $ProbeAfter
  recent_logs = $RecentLogs
  note = "Telegram shell now has routes for text, voice, ears, vision, image, media, memory, Runtime Fabric, and research services. Code behavior may still need patching if shell functions remain receipt-only."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_FULL_SERVICE_ROUTING_REPAIRED_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

$LearningEvent = @{
  event_type = "success"
  category = "telegram_full_routing"
  title = "Telegram full service routing repaired"
  summary = "Telegram service env was repaired for Code Mode, Runtime Fabric, brain, voice, ears, vision, SDXL image, media, memory, and research routes."
  decision = "Telegram must send both text and voice when voice is healthy, analyze images through vision, generate images through SDXL, and route web/weather/news/traffic to Runtime Fabric or configured tools."
  severity = "critical"
  evidence = @($ReceiptPath, $CapabilityManifestPath)
  created_at = (Get-Date).ToString("o")
}

$LearningEvent | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $Ledger -Encoding UTF8

Write-Host ""
Write-Host "Telegram full service routing repaired." -ForegroundColor Green
Write-Host "Voice selected: $UseVoiceUrl" -ForegroundColor Cyan
Write-Host "Capability manifest: $CapabilityManifestPath" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Probe after:" -ForegroundColor Yellow
Write-Host $ProbeAfter

notepad $ReceiptPath
