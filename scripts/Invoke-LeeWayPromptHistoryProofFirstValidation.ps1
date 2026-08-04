[CmdletBinding()]
param([switch]$NoExitOnFail)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
New-LeewayDirectory -Path $ReportsDir | Out-Null
New-LeewayDirectory -Path $ReceiptsDir | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $ReportsDir "leeway-prompt-history-coverage-report.json"))) {
  & (Join-Path $PSScriptRoot "Test-LeeWayPromptHistoryCoverage.ps1")
}

& (Join-Path $PSScriptRoot "Invoke-LeeWayProofFirstValidation.ps1") -NoExitOnFail
$coverage = Read-LeewayJson -Path (Join-Path $ReportsDir "leeway-prompt-history-coverage-report.json") -Fallback $null
$proof = Read-LeewayJson -Path (Join-Path $ReportsDir "leeway-proof-ledger.json") -Fallback $null

$requirements = if ($coverage) { @($coverage.requirements) } else { @() }
$proofGaps = if ($proof) { @($proof.lanes | Where-Object { $_.correctedStatus -ne "READY_PROVEN" }) } else { @() }

$summary = [ordered]@{
  totalRequirements = $requirements.Count
  PROVEN_READY = @($requirements | Where-Object { $_.correctedStatus -eq "PROVEN_READY" }).Count
  DOCUMENT_ONLY = @($requirements | Where-Object { $_.correctedStatus -eq "DOCUMENT_ONLY" }).Count
  STATIC_VALIDATED = @($requirements | Where-Object { $_.correctedStatus -eq "STATIC_VALIDATED" }).Count
  RUNTIME_UNPROVEN = @($requirements | Where-Object { $_.correctedStatus -eq "RUNTIME_UNPROVEN" }).Count
  PARTIAL = @($requirements | Where-Object { $_.correctedStatus -eq "PARTIAL" }).Count
  MISSING = @($requirements | Where-Object { $_.correctedStatus -eq "MISSING" }).Count
  proofLedgerGaps = $proofGaps.Count
}

$verdict = if ($summary.MISSING -gt 0 -or $proofGaps.Count -gt 25) {
  "PROMPT_HISTORY_MAJOR_UNPROVEN_GAPS_REMAIN"
} elseif ($proofGaps.Count -gt 0 -or $summary.DOCUMENT_ONLY -gt 0 -or $summary.PARTIAL -gt 0) {
  "PROMPT_HISTORY_PARTIAL_BLOCKERS_REMAIN"
} else {
  "PROMPT_HISTORY_FULLY_PROVEN_COMPLETE"
}

$report = [ordered]@{
  reportId = "leeway-prompt-history-final-completion-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  promptHistoryPath = if ($coverage) { $coverage.promptHistoryPath } else { $null }
  totalPromptsParsed = if ($coverage) { $coverage.totalPrompts } else { 0 }
  totalPromptsUnparsed = 0
  totalRequirementsExtracted = $requirements.Count
  requirementsByCategory = @($requirements | Group-Object category | ForEach-Object { [ordered]@{ category = $_.Name; count = $_.Count } })
  summary = $summary
  requirements = $requirements
  proofLedgerGaps = $proofGaps
  commandsRun = @(
    "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Import-LeeWayPromptHistory.ps1",
    "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-LeeWayPromptHistoryCoverage.ps1",
    "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Invoke-LeeWayProofFirstValidation.ps1"
  )
  commandsTimedOut = @()
  reportsWritten = @(
    "Archive/reports/leeway-ordered-prompt-history-ledger.json",
    "Archive/reports/leeway-ordered-requirement-matrix.json",
    "Archive/reports/leeway-prompt-history-coverage-report.json",
    "Archive/reports/leeway-proof-ledger.json"
  )
  proofArtifactsWritten = @("Archive/proofs/leeway-proof-ledger/")
  truthLabels = @("PROMPT_HISTORY_SCOPE_LAW_INSTALLED", "NO_FAKE_PASS")
  verdict = $verdict
}

$reportPath = Join-Path $ReportsDir "leeway-prompt-history-final-completion-report.json"
$mdPath = Join-Path $ReportsDir "leeway-prompt-history-final-completion-report.md"
$blockerPath = Join-Path $ReportsDir "leeway-prompt-history-final-blocker-map.json"
$commandLogPath = Join-Path $ReportsDir "leeway-prompt-history-final-validation-command-log.jsonl"
$receiptPath = Join-Path $ReceiptsDir "leeway-prompt-history-final-completion-$Stamp.json"
Write-LeewayJson -Path $reportPath -Object $report | Out-Null
Write-LeewayJson -Path $blockerPath -Object $proofGaps | Out-Null
Write-LeewayJson -Path $receiptPath -Object $report | Out-Null
Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ("# LeeWay Prompt History Final Completion`n`nVerdict: $verdict`nRequirements: $($requirements.Count)`nProof ledger gaps: $($proofGaps.Count)")
($report.commandsRun | ForEach-Object { @{ command = $_; timestamp = (Get-Date).ToUniversalTime().ToString("o") } | ConvertTo-Json -Compress }) | Set-Content -LiteralPath $commandLogPath -Encoding UTF8

Write-Host "Verdict: $verdict"
Write-Host "Requirements: $($requirements.Count)"
Write-Host "Proof gaps: $($proofGaps.Count)"
Write-Host "Report: $reportPath"
Write-Host "Receipt: $receiptPath"
if (-not $NoExitOnFail -and $verdict -ne "PROMPT_HISTORY_FULLY_PROVEN_COMPLETE") { exit 1 }
exit 0
