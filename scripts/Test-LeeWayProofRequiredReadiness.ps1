[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "Invoke-LeeWayProofFirstValidation.ps1") -NoExitOnFail
$root = Split-Path -Parent $PSScriptRoot
$report = Get-Content -Raw -LiteralPath (Join-Path $root "Archive\reports\leeway-proof-ledger.json") | ConvertFrom-Json
$bad = @($report.lanes | Where-Object { $_.correctedStatus -eq "READY_PROVEN" -and $_.proofStatus -ne "PROVEN" })
Write-Host "Ready without proof: $($bad.Count)"
exit $(if ($bad.Count -eq 0) { 0 } else { 1 })

