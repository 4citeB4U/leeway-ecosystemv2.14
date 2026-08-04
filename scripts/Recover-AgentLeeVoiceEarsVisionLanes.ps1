$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\telegram-shell"
$Ledger = Join-Path $Root "Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $Ledger) | Out-Null

$MainNet = "leeway-ecosystemv214_leeway-net"

$Wanted = @(
  "agent-lee-qwen-voice",
  "agent-lee-voice-kernel",
  "agent-lee-ears-kernel",
  "agent-lee-vision-kernel"
)

function Run-Text {
  param([scriptblock]$Block)
  try {
    return (& $Block 2>&1 | Out-String)
  } catch {
    return $_.Exception.Message
  }
}

function Try-ConnectNetwork {
  param([string]$Name)
  try {
    docker network connect $MainNet $Name 2>$null | Out-Null
  } catch {}
}

function Probe-FromTelegram {
  $Probe = @"
import urllib.request
urls=[
 'http://agent-lee-qwen-voice:8097/health',
 'http://agent-lee-voice-kernel:8092/',
 'http://agent-lee-voice-kernel:8092/health',
 'http://agent-lee-ears-kernel:8094/health',
 'http://agent-lee-vision-kernel:8093/health',
 'http://host.docker.internal:8092/',
 'http://host.docker.internal:8092/health',
 'http://host.docker.internal:8094/health'
]
for url in urls:
    try:
        r=urllib.request.urlopen(url, timeout=8)
        print(url, 'OK', r.status, r.read(250))
    except Exception as e:
        print(url, 'ERROR', repr(e))
"@
  return (docker exec agent-lee-telegram-shell python -c $Probe 2>&1 | Out-String)
}

$BeforePs = Run-Text { docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Networks}}\t{{.Ports}}" }

$Existing = @()
foreach ($Name in $Wanted) {
  $Found = docker ps -a --filter "name=^/$Name$" --format "{{.Names}}" 2>$null
  if ($Found -eq $Name) {
    $Existing += $Name
  }
}

$Started = @()
$Missing = @()

foreach ($Name in $Wanted) {
  if ($Existing -contains $Name) {
    Write-Host "Recovering existing container: $Name" -ForegroundColor Yellow
    Try-ConnectNetwork $Name
    docker start $Name 2>$null | Out-Null
    Start-Sleep -Seconds 3
    Try-ConnectNetwork $Name
    $Started += $Name
  } else {
    $Missing += $Name
  }
}

# Always ensure vision is on the main network if present.
if ($Existing -contains "agent-lee-vision-kernel") {
  Try-ConnectNetwork "agent-lee-vision-kernel"
}

$AfterPs = Run-Text { docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Networks}}\t{{.Ports}}" }

$ComposeMatches = Run-Text {
  Get-ChildItem $Root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match "docker-compose|compose|yml|yaml|ps1|py|mjs|js" -and
      $_.FullName -notmatch "\\Archive\\telegram-shell\\source-extract\\"
    } |
    Select-String -Pattern "agent-lee-qwen-voice|agent-lee-voice-kernel|agent-lee-ears-kernel|8097|8092|8094|CerebralDaemon|faster-whisper|edge-tts|voice-kernel|ears-kernel" -SimpleMatch -ErrorAction SilentlyContinue |
    Select-Object Path, LineNumber, Line |
    Format-List | Out-String
}

$Probe = Probe-FromTelegram

$Receipt = @{
  verdict = "AGENT_LEE_VOICE_EARS_VISION_RECOVERY_ATTEMPTED"
  wanted = $Wanted
  existing_found = $Existing
  started_or_reconnected = $Started
  missing = $Missing
  before_docker_ps = $BeforePs
  after_docker_ps = $AfterPs
  telegram_probe = $Probe
  compose_and_script_matches = $ComposeMatches
  next_step = if ($Missing.Count -gt 0) {
    "Use compose_and_script_matches to start the missing voice/ears services from their original source. Do not create a new bridge."
  } else {
    "Patch Telegram status/service env to the reachable voice/ears/vision URLs."
  }
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_VOICE_EARS_VISION_RECOVERY_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

$LearningEvent = @{
  event_type = "lesson"
  category = "voice_ears_recovery"
  title = "Voice ears vision recovery attempted"
  summary = "Attempted to recover existing voice, ears, and vision containers without creating a new bridge."
  decision = "Prefer recovering original containers and original Cerebral/runtime lanes. Do not create bridge sprawl."
  severity = "critical"
  evidence = @($ReceiptPath)
  created_at = (Get-Date).ToString("o")
}

$LearningEvent | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $Ledger -Encoding UTF8

Write-Host ""
Write-Host "Voice/Ears/Vision recovery attempted." -ForegroundColor Green
Write-Host "Started/reconnected:" -ForegroundColor Cyan
$Started | ForEach-Object { Write-Host " - $_" -ForegroundColor Cyan }
Write-Host "Missing:" -ForegroundColor Yellow
$Missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
Write-Host ""
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Telegram probe:" -ForegroundColor Yellow
Write-Host $Probe

notepad $ReceiptPath
