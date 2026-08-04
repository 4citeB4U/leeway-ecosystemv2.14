# Leeway Quick Integration Setup
$ErrorActionPreference = "Stop"
Write-Host "=== Leeway System Integration Setup ===" -ForegroundColor Cyan
$WorkspaceRoot = "D:\Leeway-Ecosystem v2.1.4"
$ArchiveRoot = Join-Path $WorkspaceRoot "Archive"
$BridgeRoot = Join-Path $WorkspaceRoot "Leeway-System-Architecture"
$ExternalGovernor = "C:\Users\Leona\Leeway-System-Governor"
$ExternalLogs = "C:\Users\Leona\Leeway-System-Logs"
$ExternalScripts = "C:\Users\Leona\Leeway-System-PowerShell-Scripts"
Write-Host "Creating Archive integration points..." -ForegroundColor Yellow
$archiveDirs = @("Archive\receipts\system-integration","Archive\ledgers\system-integration","Archive\manifests\system","Archive\runtime-state\system-governor")
foreach ($dir in $archiveDirs) {
    $fullPath = Join-Path $WorkspaceRoot $dir
    if (!(Test-Path $fullPath)) { New-Item -ItemType Directory -Path $fullPath -Force | Out-Null; Write-Host "  Created: $dir" -ForegroundColor Green }
}
Write-Host "Creating bridge structure..." -ForegroundColor Yellow
$bridgeDirs = @("Leeway-System-Architecture\governor","Leeway-System-Architecture\logs","Leeway-System-Architecture\scripts")
foreach ($dir in $bridgeDirs) {
    $fullPath = Join-Path $WorkspaceRoot $dir
    if (!(Test-Path $fullPath)) { New-Item -ItemType Directory -Path $fullPath -Force | Out-Null; Write-Host "  Created: $dir" -ForegroundColor Green }
}
if (!(Test-Path $ExternalScripts)) { New-Item -ItemType Directory -Path $ExternalScripts -Force | Out-Null; Write-Host "Created: $ExternalScripts" -ForegroundColor Green }
$manifest = @{version="1.0.0";created=(Get-Date -Format "o");externalDirectories=@{governor=$ExternalGovernor;logs=$ExternalLogs;scripts=$ExternalScripts};bridgeRoot=$BridgeRoot;archiveRoot=$ArchiveRoot}
$manifestPath = Join-Path $BridgeRoot "integration-manifest.json"
$manifest | ConvertTo-Json -Depth 10 | Out-File $manifestPath -Encoding UTF8
$receiptPath = Join-Path $WorkspaceRoot "Archive\receipts\system-integration\setup-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$receipt = @{schema="leeway-system-integration-receipt-v1";timestamp=(Get-Date -Format "o");action="quick-integration-setup";status="OK";manifestPath=$manifestPath}
$receipt | ConvertTo-Json -Depth 10 | Out-File $receiptPath -Encoding UTF8
Write-Host ""
Write-Host "=== Integration Complete ===" -ForegroundColor Green
Write-Host "Receipt: $receiptPath" -ForegroundColor Cyan