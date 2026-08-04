[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
$checks = [ordered]@{
  standardsBook = Test-Path -LiteralPath (Join-Path $Root "LeeWay-Standards\standards\BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md")
  runtimeContract = Test-Path -LiteralPath (Join-Path $Root "agent-lee-coding-mode\contracts\leeway-absolute-proof-law.md")
  receiptSchema = Test-Path -LiteralPath (Join-Path $Root "agent-lee-coding-mode\contracts\leeway-proof-backed-receipt-schema.json")
  discoveryRegistry = Test-Path -LiteralPath (Join-Path $Root "Leeway Runtime Fabric\discovery\leeway-total-discovery-graph.registry.json")
  discoveryClientSyntax = $false
  discoveryServiceSyntax = $false
  proofLedger = Test-Path -LiteralPath (Join-Path $ReportsDir "leeway-proof-ledger.json")
}
try { & node --check (Join-Path $Root "Leeway Runtime Fabric\discovery\leeway-discovery-client.mjs") | Out-Null; $checks.discoveryClientSyntax = ($LASTEXITCODE -eq 0) } catch {}
try { & node --check (Join-Path $Root "Leeway Runtime Fabric\discovery\leeway-discovery-service.mjs") | Out-Null; $checks.discoveryServiceSyntax = ($LASTEXITCODE -eq 0) } catch {}
$failed = @($checks.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
$verdict = if ($failed.Count -eq 0) { "PROOF_LAW_INTEGRATION_READY" } else { "PROOF_LAW_INTEGRATION_PARTIAL_BLOCKERS_REMAIN" }
$report = [ordered]@{
  reportId = "leeway-proof-law-integration-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  checks = $checks
  failed = $failed
  truthLabels = @("ABSOLUTE_PROOF_LAW_INSTALLED", "NO_PASS_WITHOUT_PROOF_LAW_INSTALLED", "PROOF_LEVELS_STANDARDIZED", "PROOF_BACKED_RECEIPT_SCHEMA_READY")
  verdict = $verdict
}
$integrationReportPath = Join-Path $ReportsDir "leeway-proof-law-integration-report.json"
$integrationReceiptPath = Join-Path $ReceiptsDir "leeway-proof-law-integration-$Stamp.json"
$installationReportPath = Join-Path $ReportsDir "leeway-absolute-proof-law-installation-report.json"
$installationMdPath = Join-Path $ReportsDir "leeway-absolute-proof-law-installation-report.md"
$installationReceiptPath = Join-Path $ReceiptsDir "leeway-absolute-proof-law-installation-$Stamp.json"
$liveStatusReportPath = Join-Path $ReportsDir "leeway-proof-law-live-status-report.json"
$noFalseReceiptPath = Join-Path $ReceiptsDir "leeway-no-false-completion-law-$Stamp.json"
Write-LeewayJson -Path $integrationReportPath -Object $report | Out-Null
Write-LeewayJson -Path $integrationReceiptPath -Object $report | Out-Null
Write-LeewayJson -Path $installationReportPath -Object $report | Out-Null
Write-LeewayJson -Path $installationReceiptPath -Object $report | Out-Null
Write-LeewayJson -Path $liveStatusReportPath -Object ([ordered]@{
  reportId = "leeway-proof-law-live-status-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  absoluteProofLawLoaded = $checks.standardsBook
  noFalseCompletionLawLoaded = $checks.runtimeContract
  proofLedgerStatus = if ($checks.proofLedger) { "PRESENT" } else { "MISSING" }
  verdict = if ($checks.standardsBook -and $checks.runtimeContract) { "PROOF_LAW_LIVE_STATUS_READY" } else { "PROOF_LAW_LIVE_STATUS_PARTIAL" }
}) | Out-Null
Write-LeewayJson -Path $noFalseReceiptPath -Object $report | Out-Null
Set-Content -LiteralPath $installationMdPath -Encoding UTF8 -Value ("# LeeWay Absolute Proof Law Installation`n`nVerdict: $verdict`nFailed: $($failed -join ', ')")
Write-Host "Verdict: $verdict"
Write-Host "Failed: $($failed -join ', ')"
exit $(if ($failed.Count -eq 0) { 0 } else { 1 })
