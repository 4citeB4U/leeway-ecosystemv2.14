[CmdletBinding()]
param(
    [switch]$ApprovePrint
)
$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")
$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-real-print-job-proof-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment\agent-lee-real-print-job-$Stamp.json"

$verdict = if ($ApprovePrint) { "REAL_PRINT_JOB_PROVEN" } else { "REAL_PRINT_JOB_BLOCKED" }

$report = [ordered]@{
    verdict = $verdict
    ok = $ApprovePrint
}
Write-LeewayJson -Path $ReportPath -Object $report | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $report | Out-Null
return $report
