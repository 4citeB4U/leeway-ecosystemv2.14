[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
$receiptFiles = @(Get-ChildItem -LiteralPath (Join-Path $Root "Archive\receipts") -Recurse -File -Filter "*.json" -ErrorAction SilentlyContinue | Select-Object -First 500)
$audited = @()
foreach ($file in $receiptFiles) {
  $json = Read-LeewayJson -Path $file.FullName -Fallback $null
  if (-not $json) { continue }
  $text = Get-Content -Raw -LiteralPath $file.FullName
  $claimsReady = $text -match "READY|PASS|COMPLETE|LIVE|OPERATIONAL|PROVEN|99_READY"
  $hasProofPointer = $text -match "rawStdoutPath|rawStderrPath|rawEndpointResponsePath|artifactPaths|audioProofPath|imageProofPath|screenshotProofPath|proofArtifacts|rawOutput|rawResponse"
  $audited += [ordered]@{
    receiptPath = $file.FullName
    claimsReady = $claimsReady
    hasProofPointer = $hasProofPointer
    supportsReadyProven = ($claimsReady -and $hasProofPointer)
    violation = ($claimsReady -and -not $hasProofPointer)
  }
}
$violations = @($audited | Where-Object { $_.violation })
$verdict = if ($violations.Count -eq 0) { "PROOF_BACKED_RECEIPTS_PASS" } else { "PROOF_BACKED_RECEIPTS_PARTIAL_BLOCKERS_REMAIN" }
$report = [ordered]@{
  reportId = "leeway-proof-backed-receipts-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  receiptsAudited = $audited.Count
  violations = $violations
  verdict = $verdict
}
Write-LeewayJson -Path (Join-Path $ReportsDir "leeway-proof-backed-receipts-report.json") -Object $report | Out-Null
Write-LeewayJson -Path (Join-Path $ReceiptsDir "leeway-proof-backed-receipts-$Stamp.json") -Object $report | Out-Null
Write-Host "Verdict: $verdict"
Write-Host "Receipts audited: $($audited.Count)"
Write-Host "Violations: $($violations.Count)"
exit $(if ($violations.Count -eq 0) { 0 } else { 1 })

