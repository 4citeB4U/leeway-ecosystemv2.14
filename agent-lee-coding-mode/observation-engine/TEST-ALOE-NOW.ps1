# TEST-ALOE-NOW.ps1
# Quick validation test for ALOE bootstrap and observation

Write-Host "=== ALOE QUICK TEST ===" -ForegroundColor Cyan
Write-Host "This will test bootstrap and run 10 observations`n" -ForegroundColor Gray

$bootstrapPath = Join-Path $PSScriptRoot "agent-lee-bootstrap.ps1"

if (-not (Test-Path $bootstrapPath)) {
    Write-Error "Bootstrap file not found: $bootstrapPath"
    exit 1
}

Write-Host "Running bootstrap (no loop)..." -ForegroundColor Yellow
& $bootstrapPath -NoLoop -Verbose

if ($LASTEXITCODE -ne 0) {
    Write-Error "Bootstrap failed with exit code: $LASTEXITCODE"
    exit 1
}

Write-Host "`n[OK] Bootstrap test passed" -ForegroundColor Green
Write-Host "`nTo run continuous observation loop:" -ForegroundColor Cyan
Write-Host "  .\agent-lee-bootstrap.ps1" -ForegroundColor White
Write-Host "`nTo run with custom interval:" -ForegroundColor Cyan
Write-Host "  .\agent-lee-bootstrap.ps1 -IntervalMs 2000" -ForegroundColor White

# Made with Bob
