# LeeWay Local Bridge Install - Layer 2
# Purpose: build and run the bridge container.

$ErrorActionPreference = "Stop"

$Root = "C:\LeeWay\local-assistant-bridge"
Set-Location $Root

Write-Host "Checking Docker..." -ForegroundColor Cyan
docker version | Out-Host

Write-Host "Checking Ollama endpoint on host..." -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 10 | ConvertTo-Json -Depth 6 | Out-Host
} catch {
  Write-Warning "Ollama did not respond at http://localhost:11434/api/tags. Make sure leeway_ollama is running."
}

Write-Host "Building and starting LeeWay Local Assistant Bridge..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "Waiting for bridge..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host "Testing bridge health..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8787/health" -Method GET -TimeoutSec 20 | ConvertTo-Json -Depth 8 | Out-Host

Write-Host "Layer 2 complete." -ForegroundColor Green
Write-Host "Local bridge URL: http://localhost:8787"
Write-Host "For phone same-WiFi use your PC IP: http://YOUR-PC-IP:8787"
Write-Host "Next: run 03-test-and-connect-crm.ps1"
