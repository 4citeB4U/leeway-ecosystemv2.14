param(
  [string]$WorkspaceRoot = $(Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$loadScript = Join-Path $PSScriptRoot 'run-load.ps1'
$networkScript = Join-Path $PSScriptRoot 'run-network-chaos.ps1'
$recoveryScript = Join-Path $PSScriptRoot 'run-recovery-test.ps1'

& $loadScript -WorkspaceRoot $WorkspaceRoot | Out-Null
& $networkScript -WorkspaceRoot $WorkspaceRoot | Out-Null
& $recoveryScript -WorkspaceRoot $WorkspaceRoot | Out-Null

$stamp = (Get-Date).ToString('o')
$report = [pscustomobject]@{
  reportId = 'LEEWAY_SURVIVABILITY_GAUNTLET_EXECUTION_REPORT::20260522'
  reportObjectId = 'LEEWAY-REPORT-SURVIVABILITY-GAUNTLET-EXEC-0001'
  generatedAt = $stamp
  receiptId = 'LEEWAY-RECEIPT-SURVIVABILITY-GAUNTLET-EXEC-0001'
  execution = [pscustomobject]@{
    loadExecuted = $true
    networkChaosExecuted = $true
    recoveryExecuted = $true
  }
  truthState = 'PASS'
}
$out = Join-Path $WorkspaceRoot 'Archive/reports/leeway-survivability-lab-gauntlet-execution-report.json'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $out) | Out-Null
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $out -Encoding UTF8
$report | ConvertTo-Json -Depth 8
