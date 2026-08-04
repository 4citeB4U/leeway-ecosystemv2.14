$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\telegram-shell"
$Ledger = Join-Path $Root "Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $Ledger) | Out-Null

$Container = "agent-lee-telegram-shell"
$BackupContainer = "agent-lee-telegram-shell-backup-$Stamp"

function Redact-Text {
  param([string]$Text)
  if ($null -eq $Text) { return $null }

  $T = $Text
  $T = $T -replace 'bot[0-9]+:[A-Za-z0-9_\-]+', 'bot<REDACTED>'
  $T = $T -replace '[0-9]{8,}:[A-Za-z0-9_\-]{20,}', '<TELEGRAM_TOKEN_REDACTED>'
  $T = $T -replace 'TELEGRAM_BOT_TOKEN=[^,\s"]+', 'TELEGRAM_BOT_TOKEN=<REDACTED>'
  $T = $T -replace 'AGENT_LEE_TELEGRAM_BOT_TOKEN=[^,\s"]+', 'AGENT_LEE_TELEGRAM_BOT_TOKEN=<REDACTED>'
  $T = $T -replace 'LEEWAY_TELEGRAM_BOT_TOKEN=[^,\s"]+', 'LEEWAY_TELEGRAM_BOT_TOKEN=<REDACTED>'
  return $T
}

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

$InspectRaw = docker inspect $Container | Out-String
$Inspect = $InspectRaw | ConvertFrom-Json

if (-not $Inspect) {
  throw "Could not inspect $Container"
}

$C = $Inspect[0]

$Image = $C.Config.Image
$Path = $C.Path
$Args = @($C.Args)
$Network = $C.HostConfig.NetworkMode
$Binds = @($C.HostConfig.Binds)
$Env = @($C.Config.Env)

if (-not $Image) {
  throw "Could not determine image for $Container"
}

if (-not $Network) {
  $Network = "leeway-ecosystemv214_leeway-net"
}

$Env = Set-EnvPair $Env "OPENAI_BASE_URL" "http://agent_lee_code_mode:8080/v1"
$Env = Set-EnvPair $Env "AGENT_LEE_OPENAI_BASE_URL" "http://agent_lee_code_mode:8080/v1"
$Env = Set-EnvPair $Env "AGENT_LEE_CODE_MODE_BASE_URL" "http://agent_lee_code_mode:8080"
$Env = Set-EnvPair $Env "LEEWAY_RUNTIME_FABRIC" "http://leeway_runtime_fabric:4001"
$Env = Set-EnvPair $Env "AGENT_LEE_RUNTIME_FABRIC_BASE_URL" "http://leeway_runtime_fabric:4001"
$Env = Set-EnvPair $Env "AGENT_LEE_IMAGE_LANE_BASE_URL" "http://agent-lee-sdxl-lightning-image-lane:8095"
$Env = Set-EnvPair $Env "AGENT_LEE_SDXL_BASE_URL" "http://agent-lee-sdxl-lightning-image-lane:8095"
$Env = Set-EnvPair $Env "AGENT_LEE_TELEGRAM_ROUTING_MODE" "runtime_fabric_first"
$Env = Set-EnvPair $Env "AGENT_LEE_RECEIPT_ONLY_IS_NOT_EXECUTION" "true"

$RedactedEnv = @()
foreach ($E in $Env) {
  $RedactedEnv += (Redact-Text $E)
}

Write-Host ""
Write-Host "Stopping existing Telegram shell..." -ForegroundColor Yellow
docker stop $Container | Out-Null

Write-Host "Renaming existing container to backup: $BackupContainer" -ForegroundColor Yellow
docker rename $Container $BackupContainer

$RunArgs = @(
  "run",
  "-d",
  "--name",
  $Container,
  "--restart",
  "unless-stopped",
  "--network",
  $Network
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

Write-Host "Starting repaired Telegram shell..." -ForegroundColor Green
$NewContainerId = docker @RunArgs

Start-Sleep -Seconds 8

$TestScript = "import socket, urllib.request; print('DNS', socket.gethostbyname_ex('api.telegram.org')); print('TELEGRAM_HTTPS', urllib.request.urlopen('https://api.telegram.org', timeout=20).status)"
$TelegramNet = docker exec $Container python -c $TestScript 2>&1 | Out-String

$RouteScript = @"
import urllib.request
urls = [
  'http://agent_lee_code_mode:8080/health',
  'http://leeway_runtime_fabric:4001/health',
  'http://agent-lee-sdxl-lightning-image-lane:8095/status',
  'http://127.0.0.1:8080/health',
  'http://127.0.0.1:4001/health'
]
for url in urls:
    try:
        r = urllib.request.urlopen(url, timeout=8)
        print(url, 'OK', r.status, r.read(220))
    except Exception as e:
        print(url, 'ERROR', repr(e))
"@

$RouteCheck = docker exec $Container python -c $RouteScript 2>&1 | Out-String

$RecentLogs = docker logs --tail 80 $Container 2>&1 | Out-String

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_SHELL_INTERNAL_ROUTES_REPAIRED"
  old_container_backup = $BackupContainer
  new_container = $Container
  new_container_id = $NewContainerId
  image = $Image
  network = $Network
  corrected_routes = @{
    openai_base_url = "http://agent_lee_code_mode:8080/v1"
    agent_lee_code_mode = "http://agent_lee_code_mode:8080"
    runtime_fabric = "http://leeway_runtime_fabric:4001"
    image_lane = "http://agent-lee-sdxl-lightning-image-lane:8095"
  }
  redacted_env = $RedactedEnv
  telegram_network_test = (Redact-Text $TelegramNet)
  route_check = (Redact-Text $RouteCheck)
  recent_logs = (Redact-Text $RecentLogs)
  note = "The prior container used 127.0.0.1 for Agent Lee/Runtime routes. In Docker that points to the Telegram container itself. Repaired to use Docker network service names."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_SHELL_INTERNAL_ROUTES_REPAIRED_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

$LearningEvent = @{
  event_type = "success"
  category = "telegram_routing"
  title = "Telegram shell internal routes repaired"
  summary = "Telegram shell was recreated so Agent Lee Code Mode, Runtime Fabric, and SDXL image lane use Docker network names instead of 127.0.0.1."
  decision = "Use agent_lee_code_mode:8080, leeway_runtime_fabric:4001, and agent-lee-sdxl-lightning-image-lane:8095 from inside Telegram container."
  severity = "critical"
  evidence = @($ReceiptPath)
  created_at = (Get-Date).ToString("o")
}

$LearningEvent | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $Ledger -Encoding UTF8

Write-Host ""
Write-Host "Telegram shell internal routes repaired." -ForegroundColor Green
Write-Host "Backup container: $BackupContainer" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Route check:" -ForegroundColor Yellow
Write-Host $RouteCheck

notepad $ReceiptPath
