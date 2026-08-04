# LeeWay Local Bridge Install - Layer 3
# Purpose: test model calls and print CRM connection settings.

$ErrorActionPreference = "Stop"

$AdapterIp = $null

try {
  $AdapterIp = (Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4Address -and $_.IPv4Address.IPAddress -notmatch '^169\.254\.' -and $_.IPv4Address.IPAddress -ne '127.0.0.1' } |
    Select-Object -ExpandProperty IPv4Address -First 1 | Select-Object -ExpandProperty IPAddress)
} catch {
  $AdapterIp = $null
}

if (-not $AdapterIp) {
  try {
    $AdapterIp = (ipconfig | Select-String 'IPv4 Address' | Select-Object -First 1).ToString().Split(':')[-1].Trim()
  } catch {
    $AdapterIp = $null
  }
}

if (-not $AdapterIp -or $AdapterIp -eq '127.0.0.1') {
  $AdapterIp = "YOUR-PC-IP"
}

Write-Host "Testing local model through bridge..." -ForegroundColor Cyan

$Body = @{
  task = "extract_lead"
  model = "qwen3:latest"
  note = "I just walked into Ballers Club Barbershop. I spoke with Marcus the manager. They care about no-shows, memberships, reviews, and social media. I pitched the $250 AI Tune-Up. Follow up tomorrow."
  leewayStandard = $true
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Uri "http://localhost:8787/assistant" `
  -Method POST `
  -ContentType "application/json" `
  -Body $Body `
  -TimeoutSec 120 | ConvertTo-Json -Depth 10 | Out-Host

Write-Host "Getting available Ollama models..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8787/models" -Method GET -TimeoutSec 30 | ConvertTo-Json -Depth 8 | Out-Host

Write-Host ""
Write-Host "CRM settings to enter in the GitHub Pages app:" -ForegroundColor Green
Write-Host "Connection Mode: LeeWay Bridge"
Write-Host "Bridge URL on this PC: http://localhost:8787"
Write-Host "Bridge URL from Android on same Wi-Fi: http://$AdapterIp:8787"
Write-Host "Default Model: qwen3:latest"
Write-Host "Vision Model: qwen2.5vl:7b"
Write-Host ""
Write-Host "Phone note:" -ForegroundColor Yellow
Write-Host "Open http://$AdapterIp:8787/health in your Android browser first. If it loads, the bridge is reachable from your phone."
Write-Host "If your phone cannot reach it, allow inbound TCP 8787 in Windows Defender Firewall or use Tailscale."
Write-Host ""
Write-Host "Layer 3 complete." -ForegroundColor Green
