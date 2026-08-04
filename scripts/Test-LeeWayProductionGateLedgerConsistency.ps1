[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
New-LeewayDirectory -Path $ReportsDir | Out-Null
New-LeewayDirectory -Path $ReceiptsDir | Out-Null

$productionGatePath = Join-Path $ReportsDir "production-gate-latest.json"
$masterPath = Join-Path $ReportsDir "leeway-master-total-ecosystem-completion-report.json"
$proofLedgerPath = Join-Path $ReportsDir "leeway-proof-ledger.json"

$productionGate = Read-LeewayJson -Path $productionGatePath -Fallback $null
$master = Read-LeewayJson -Path $masterPath -Fallback $null
$proof = Read-LeewayJson -Path $proofLedgerPath -Fallback $null

$proofGaps = if ($proof -and $proof.lanes) { @($proof.lanes | Where-Object { $_.correctedStatus -ne "READY_PROVEN" }) } else { @() }
$masterNotReady = if ($master -and $master.lanes) { @($master.lanes | Where-Object { $_.finalVerdictForLane -ne "READY_PROVEN" }) } else { @() }
$gateClaimsFullReady = $false
if ($productionGate) {
  $gateClaimsFullReady = (($productionGate.verdict -match "99_READY|FULL_SYSTEM_99_READY|PROOF_BACKED_READY") -or ($productionGate.productionAllowed -eq $true))
}

$inconsistent = $gateClaimsFullReady -and (($proofGaps.Count -gt 0) -or ($masterNotReady.Count -gt 0))
$verdict = if (-not $productionGate) {
  "PRODUCTION_GATE_LEDGER_CONSISTENCY_BLOCKED"
} elseif ($inconsistent) {
  "PRODUCTION_GATE_LEDGER_CONSISTENCY_FAIL_WEIGHTED_PASS_WITH_BLOCKERS"
} else {
  "PRODUCTION_GATE_LEDGER_CONSISTENCY_READY"
}

$report = [ordered]@{
  reportId = "leeway-production-gate-ledger-consistency-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  productionGatePath = $productionGatePath
  masterLedgerPath = $masterPath
  proofLedgerPath = $proofLedgerPath
  gateVerdict = if ($productionGate) { $productionGate.verdict } else { $null }
  gateProductionAllowed = if ($productionGate) { $productionGate.productionAllowed } else { $null }
  gateClaimsFullReady = $gateClaimsFullReady
  proofGaps = $proofGaps
  masterNotReadyCount = $masterNotReady.Count
  weightedPassCannotOverrideProofLedger = $true
  blockers = @(
    if (-not $productionGate) { "Production gate report missing." }
    if (-not $proof) { "Proof ledger missing." }
    if ($inconsistent) { "Production gate claims full readiness while proof/master ledger has unproven lanes." }
  )
  truthLabels = @("WEIGHTED_GATE_CANNOT_OVERRIDE_PROOF_LEDGER", "NO_FAKE_PASS")
  verdict = $verdict
}

$reportPath = Join-Path $ReportsDir "leeway-production-gate-ledger-consistency-report.json"
$receiptPath = Join-Path $ReceiptsDir "leeway-production-gate-ledger-consistency-$Stamp.json"
Write-LeewayJson -Path $reportPath -Object $report | Out-Null
Write-LeewayJson -Path $receiptPath -Object $report | Out-Null
Write-Host "Verdict: $verdict"
Write-Host "Gate verdict: $($report.gateVerdict)"
Write-Host "Proof gaps: $($proofGaps.Count)"
Write-Host "Master not ready: $($masterNotReady.Count)"
Write-Host "Report: $reportPath"
Write-Host "Receipt: $receiptPath"
exit $(if ($verdict -eq "PRODUCTION_GATE_LEDGER_CONSISTENCY_READY") { 0 } else { 1 })
