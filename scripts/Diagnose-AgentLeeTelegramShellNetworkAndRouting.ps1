$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Proof = Join-Path $Root "Archive\proofs\telegram-shell"
$LearningProof = Join-Path $Root "Archive\proofs\agent-lee-learning"
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $Proof | Out-Null
New-Item -ItemType Directory -Force -Path $LearningProof | Out-Null

$Container = "agent-lee-telegram-shell"

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

function Run-Cmd {
  param(
    [string]$Name,
    [scriptblock]$Block
  )

  try {
    $Value = & $Block 2>&1 | Out-String
    return @{
      ok = $true
      name = $Name
      output = (Redact-Text $Value)
    }
  } catch {
    return @{
      ok = $false
      name = $Name
      error = (Redact-Text $_.Exception.Message)
    }
  }
}

$Checks = @{}

$Checks.container_ps = Run-Cmd "docker ps" {
  docker ps --filter "name=$Container" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Networks}}"
}

$Checks.container_inspect_summary = Run-Cmd "docker inspect summary" {
  docker inspect $Container --format "Name={{.Name}} Status={{.State.Status}} Running={{.State.Running}} RestartCount={{.RestartCount}} NetworkMode={{.HostConfig.NetworkMode}} Path={{.Path}} Args={{json .Args}}"
}

$Checks.container_dns_config = Run-Cmd "container dns config" {
  docker exec $Container sh -lc "cat /etc/resolv.conf && echo ---HOSTS--- && cat /etc/hosts"
}

$Checks.container_dns_lookup = Run-Cmd "container api.telegram.org dns lookup" {
  docker exec $Container python -c "import socket; import traceback; 
try:
    print('DNS_OK', socket.gethostbyname_ex('api.telegram.org'))
except Exception as e:
    print('DNS_ERROR', repr(e))"
}

$Checks.container_telegram_https = Run-Cmd "container telegram https probe" {
  docker exec $Container python -c "import urllib.request;
try:
    r=urllib.request.urlopen('https://api.telegram.org', timeout=20)
    print('HTTPS_OK', r.status)
except Exception as e:
    print('HTTPS_ERROR', repr(e))"
}

$Checks.host_telegram_dns = Run-Cmd "host api.telegram.org dns lookup" {
  Resolve-DnsName api.telegram.org -ErrorAction Stop | Format-Table -AutoSize | Out-String
}

$Checks.host_telegram_https = Run-Cmd "host telegram https probe" {
  Invoke-WebRequest -Uri "https://api.telegram.org" -TimeoutSec 20 -UseBasicParsing | Select-Object StatusCode, StatusDescription | Format-List | Out-String
}

$Checks.internal_127_agent = Run-Cmd "container 127.0.0.1 agent route" {
  docker exec $Container python -c "import urllib.request;
urls=['http://127.0.0.1:8080/health','http://127.0.0.1:4001/health'];
for url in urls:
    try:
        r=urllib.request.urlopen(url, timeout=5)
        print(url, 'OK', r.status, r.read(200))
    except Exception as e:
        print(url, 'ERROR', repr(e))"
}

$Checks.internal_host_docker_agent = Run-Cmd "container host.docker.internal routes" {
  docker exec $Container python -c "import urllib.request;
urls=['http://host.docker.internal:8080/health','http://host.docker.internal:4001/health','http://host.docker.internal:8099/status','http://host.docker.internal:8104/status'];
for url in urls:
    try:
        r=urllib.request.urlopen(url, timeout=8)
        print(url, 'OK', r.status, r.read(300))
    except Exception as e:
        print(url, 'ERROR', repr(e))"
}

$Checks.internal_container_names = Run-Cmd "container name route probes" {
  docker exec $Container python -c "import urllib.request;
urls=['http://agent_lee_code_mode:8080/health','http://agent-lee-code-mode:8080/health','http://leeway_runtime_fabric:4001/health','http://leeway-runtime-fabric:4001/health','http://agent-lee-sdxl-lightning-image-lane:8095/status','http://agent-lee-telegram-vision-lane:8104/status'];
for url in urls:
    try:
        r=urllib.request.urlopen(url, timeout=8)
        print(url, 'OK', r.status, r.read(300))
    except Exception as e:
        print(url, 'ERROR', repr(e))"
}

$Checks.recent_logs = Run-Cmd "recent docker logs" {
  docker logs --tail 120 $Container
}

$Decision = @()
$Decision += "If host Telegram DNS/HTTPS works but container DNS fails, repair Docker Desktop DNS/network."
$Decision += "If container can reach host.docker.internal routes, recreate Telegram shell env to use host.docker.internal instead of 127.0.0.1."
$Decision += "If container-name routes work, use Docker service/container names instead of 127.0.0.1."
$Decision += "If Telegram HTTPS fails on both host and container, fix host internet/VPN/firewall before patching Agent Lee."
$Decision += "Do not claim Telegram is connected until api.telegram.org polling is stable and Agent Lee routes are reachable from inside the container."

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_NETWORK_AND_ROUTING_DIAGNOSTIC_COMPLETE"
  container = $Container
  checks = $Checks
  decision = $Decision
  warning = "Telegram bot token appeared in logs/config. Rotate it with BotFather."
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_NETWORK_AND_ROUTING_DIAGNOSTIC_$Stamp.receipt.json"
$Receipt | ConvertTo-Json -Depth 100 | Set-Content -Path $ReceiptPath -Encoding UTF8

$LearningEvent = @{
  event_type = "failure"
  category = "telegram_network"
  title = "Telegram shell polling failed from container"
  summary = "Telegram shell logs showed DNS failures, network unreachable, and read timeouts while polling api.telegram.org."
  decision = "Fix Docker container external network/DNS and internal Agent Lee routing before claiming Telegram is truly connected."
  severity = "critical"
  evidence = @($ReceiptPath)
  created_at = (Get-Date).ToString("o")
}

$Ledger = Join-Path $Root "Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl"
New-Item -ItemType Directory -Force -Path (Split-Path $Ledger) | Out-Null
$LearningEvent | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $Ledger -Encoding UTF8

Write-Host ""
Write-Host "Telegram diagnostic complete." -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host "Learning ledger updated: $Ledger" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open the receipt and look for:" -ForegroundColor Yellow
Write-Host " - container_dns_lookup" -ForegroundColor Yellow
Write-Host " - container_telegram_https" -ForegroundColor Yellow
Write-Host " - internal_host_docker_agent" -ForegroundColor Yellow
Write-Host " - internal_container_names" -ForegroundColor Yellow

notepad $ReceiptPath
