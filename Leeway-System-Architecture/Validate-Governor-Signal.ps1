# Governor Signal Validation
Write-Host "=== Governor Signal Validation ===" -ForegroundColor Cyan
$stateFile = "C:\Users\Leona\Leeway-System-Logs\governor_state.json"
$feedFile = "C:\Users\Leona\Leeway-System-Logs\agent_lee_feed.json"
Write-Host "Checking state file..." -ForegroundColor Yellow
if (Test-Path $stateFile) {
    $state = Get-Content $stateFile -Raw | ConvertFrom-Json
    Write-Host "  State file valid" -ForegroundColor Green
    Write-Host "  CPU: $($state.CPU)%" -ForegroundColor Gray
    Write-Host "  RAM: $($state.FreeRAM_MB) MB" -ForegroundColor Gray
    Write-Host "  Disk: $($state.DiskFree_GB) GB" -ForegroundColor Gray
} else {
    Write-Host "  State file not found" -ForegroundColor Red
}
Write-Host "Checking feed file..." -ForegroundColor Yellow
if (Test-Path $feedFile) {
    $feed = Get-Content $feedFile -Raw | ConvertFrom-Json
    Write-Host "  Feed file valid" -ForegroundColor Green
    Write-Host "  State: $($feed.state)" -ForegroundColor Gray
    Write-Host "  CPU: $($feed.cpu)%" -ForegroundColor Gray
} else {
    Write-Host "  Feed file not found" -ForegroundColor Red
}
$receiptPath = "D:\Leeway-Ecosystem v2.1.4\Archive\receipts\system-integration\governor-validation-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
@{timestamp=(Get-Date -Format "o");stateValid=(Test-Path $stateFile);feedValid=(Test-Path $feedFile)} | ConvertTo-Json | Out-File $receiptPath -Encoding UTF8
Write-Host "Receipt: $receiptPath" -ForegroundColor Green