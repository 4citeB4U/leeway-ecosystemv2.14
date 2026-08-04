[CmdletBinding()]
param(
    [int]$Port = 8091
)
$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")
$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-crown-zone-vision-speech-proof-report.json"
$ReceiptDir = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-crown-zone-vision-speech-proof-$Stamp.json"

Write-Host "Checking port $Port..."
$netstat = netstat -ano | Select-String ":$Port\s.*LISTENING"
if (-not $netstat) {
    Write-Host "Port $Port is not listening."
    $report = [ordered]@{
        verdict = "CROWN_ZONE_BLOCKED_RUNTIME"
        blocker = "Port $Port is offline"
    }
    Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
    Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
    return $report
}

# Try to query /status to see if camera/ears routes exist
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/status" -TimeoutSec 5
    $hasCamera = $res.routes -contains "GET /camera/status"
    $hasEars = $res.routes -contains "GET /ears/status"
} catch {
    $hasCamera = $false
    $hasEars = $false
}

if (-not $hasCamera -or -not $hasEars) {
    Write-Host "Camera or ears routes missing on port $Port (old binary)."
    $report = [ordered]@{
        verdict = "CROWN_ZONE_BLOCKED_RUNTIME"
        blocker = "Camera/ears routes missing on port $Port. Production service needs admin restart."
    }
    Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
    Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
    return $report
}

Write-Host "Simultaneous Vision + Speech requires I_AUTHORIZE tokens."
$report = [ordered]@{
    verdict = "CROWN_ZONE_BLOCKED_APPROVAL"
    blocker = "Requires authorization tokens and live running updated service."
}
Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
return $report
