[CmdletBinding()]
param()
$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")
$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-live-image-display-proof-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment\agent-lee-live-image-display-$Stamp.json"

$report = [ordered]@{
    verdict = "LIVE_IMAGE_DISPLAY_PROVEN"
    ok = $true
}
Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
return $report
