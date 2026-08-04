[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "Invoke-LeeWayProofFirstValidation.ps1") -NoExitOnFail
$reportPath = Join-Path (Split-Path -Parent $PSScriptRoot) "Archive\reports\leeway-proof-ledger.json"
$report = Get-Content -Raw -LiteralPath $reportPath | ConvertFrom-Json
Write-Host "Verdict: $($report.verdict)"
exit $(if ($report.verdict -eq "LEEWAY_PROOF_FIRST_READY") { 0 } else { 1 })

