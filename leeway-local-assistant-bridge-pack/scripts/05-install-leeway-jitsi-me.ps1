# LeeWay Private Meetings - Layer 5
# Installs self-hosted Jitsi using the official docker-jitsi-meet project.
# Goal: low-cost private video meetings over Tailscale first, public domain later if needed.

$ErrorActionPreference = "Stop"
$Root = "C:\LeeWay\leeway-jitsi-meet"
$Repo = "https://github.com/jitsi/docker-jitsi-meet.git"

Write-Host "=== LeeWay Jitsi Meeting Install ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $Root | Out-Null
Set-Location $Root

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
  throw "Git is required for this installer. Install Git for Windows, then rerun."
}
if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
  throw "Docker is required. Start Docker Desktop, then rerun."
}

if (-not (Test-Path (Join-Path $Root ".git"))) {
  Write-Host "Cloning official docker-jitsi-meet project..." -ForegroundColor Cyan
  git clone $Repo .
} else {
  Write-Host "docker-jitsi-meet already exists. Pulling latest changes..." -ForegroundColor Cyan
  git pull
}

if (-not (Test-Path ".env")) {
  if (Test-Path "env.example") { Copy-Item "env.example" ".env" }
  elseif (Test-Path "sample.env") { Copy-Item "sample.env" ".env" }
  else { throw "Could not find env.example or sample.env in docker-jitsi-meet." }
}

$tailscale = Get-Command tailscale.exe -ErrorAction SilentlyContinue
$ip = ""
if ($tailscale) { $ip = (& $tailscale.Source ip -4 2>$null | Select-Object -First 1).Trim() }
if (-not $ip) { $ip = "127.0.0.1" }

$envText = Get-Content ".env" -Raw
$envText = $envText -replace '(?m)^#?HTTP_PORT=.*$', 'HTTP_PORT=8008'
$envText = $envText -replace '(?m)^#?HTTPS_PORT=.*$', 'HTTPS_PORT=8443'
$envText = $envText -replace '(?m)^#?TZ=.*$', 'TZ=America/Chicago'
$envText = $envText -replace '(?m)^#?PUBLIC_URL=.*$', "PUBLIC_URL=https://$ip:8443"
$envText = $envText -replace '(?m)^#?ENABLE_LETSENCRYPT=.*$', 'ENABLE_LETSENCRYPT=0'
Set-Content ".env" $envText -Encoding UTF8

Write-Host "Generating Jitsi passwords if helper script is available..." -ForegroundColor Cyan
if (Test-Path ".\gen-passwords.ps1") {
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\gen-passwords.ps1"
} elseif ((Get-Command bash.exe -ErrorAction SilentlyContinue) -and (Test-Path "./gen-passwords.sh")) {
  bash ./gen-passwords.sh
} else {
  Write-Warning "Password generation helper was not found. The official repo may prompt or require manual env secrets. Continue only for local testing."
}

Write-Host "Starting Jitsi containers..." -ForegroundColor Cyan
docker compose up -d

Write-Host "Waiting for services..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

docker compose ps | Out-Host

Write-Host "" 
Write-Host "Layer 5 complete." -ForegroundColor Green
Write-Host "Private Jitsi HTTP:  http://$ip:8008"
Write-Host "Private Jitsi HTTPS: https://$ip:8443"
Write-Host "Example LeeWay room: https://$ip:8443/LeeWay-Test-Meeting"
Write-Host "If your browser warns about certificate trust, continue only for private testing or add a proper cert later."
