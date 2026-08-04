# LeeWay Private Meetings - Layer 6
# Tests private LeeWay Bridge and prints a Jitsi meeting link over Tailscale.

$ErrorActionPreference = "Stop"

function Find-Tailscale {
  $cmd = Get-Command tailscale.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $paths = @("$env:ProgramFiles\Tailscale\tailscale.exe", "$env:LOCALAPPDATA\Tailscale\tailscale.exe")
  foreach ($p in $paths) { if (Test-Path $p) { return $p } }
  return $null
}

$tailscale = Find-Tailscale
if (-not $tailscale) { throw "Tailscale not found. Run scripts/04-install-tailscale-and-print-leeway-urls.ps1 first." }
$ip = (& $tailscale ip -4 2>$null | Select-Object -First 1).Trim()
if (-not $ip) { throw "No Tailscale IP found. Run tailscale up first." }

$RoomSlug = "LeeWay-Test-Meeting-" + (Get-Date -Format "yyyyMMdd-HHmm")
$BridgeUrl = "http://$ip:8787"
$JitsiHttp = "http://$ip:8008/$RoomSlug"
$JitsiHttps = "https://$ip:8443/$RoomSlug"

Write-Host "=== LeeWay Private Meeting Test ===" -ForegroundColor Cyan
Write-Host "Tailscale IP: $ip"
Write-Host "Bridge URL: $BridgeUrl"
Write-Host "Jitsi HTTP:  $JitsiHttp"
Write-Host "Jitsi HTTPS: $JitsiHttps"
Write-Host ""

Write-Host "Testing LeeWay Bridge..." -ForegroundColor Cyan
try {
  $BridgeHealth = Invoke-RestMethod -Uri "$BridgeUrl/health" -Method GET -TimeoutSec 15
  $BridgeHealth | ConvertTo-Json -Depth 8 | Out-Host
} catch {
  Write-Warning "Bridge test failed. Make sure scripts 01, 02, and 03 were completed."
  Write-Warning $_.Exception.Message
}

Write-Host "Testing Jitsi HTTP endpoint..." -ForegroundColor Cyan
try {
  $Response = Invoke-WebRequest -Uri "http://$ip:8008" -UseBasicParsing -TimeoutSec 15
  Write-Host "Jitsi HTTP status: $($Response.StatusCode)" -ForegroundColor Green
} catch {
  Write-Warning "Jitsi HTTP test failed. Make sure script 05 completed."
  Write-Warning $_.Exception.Message
}

Write-Host ""
Write-Host "Copy this private meeting invite:" -ForegroundColor Green
Write-Host "LeeWay Private Meeting"
Write-Host "Join link: $JitsiHttps"
Write-Host "Purpose: Private LeeWay Standards meeting over Tailscale and Jitsi."
Write-Host "Agenda: Confirm intent, review context, discuss solution, validate next step, approve decision."
Write-Host ""
Write-Host "Open the link manually in your browser or phone while connected to Tailscale."
Write-Host "Layer 6 complete." -ForegroundColor Green
