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

$proofLedger = Read-LeewayJson -Path (Join-Path $ReportsDir "leeway-proof-ledger.json") -Fallback $null
if (-not $proofLedger) {
  & (Join-Path $PSScriptRoot "Invoke-LeeWayProofFirstValidation.ps1") -NoExitOnFail
  $proofLedger = Read-LeewayJson -Path (Join-Path $ReportsDir "leeway-proof-ledger.json") -Fallback $null
}

$targetFiles = @(
  "leeway-master-total-ecosystem-completion-report.json",
  "leeway-master-backlog-ledger-report.json",
  "leeway-unfinished-work-ledger-report.json",
  "production-gate-latest.json",
  "agent-lee-live-embodiment-full-truth-status-report.json",
  "leeway-master-total-ecosystem-blocker-map.json",
  "leeway-master-total-ecosystem-validation-command-log.jsonl"
) | ForEach-Object { Join-Path $ReportsDir $_ } | Where-Object { Test-Path -LiteralPath $_ }

$claims = @()
foreach ($file in $targetFiles) {
  $matches = Select-String -Path $file -Pattern "READY|PASS|99_READY|COMPLETE|LIVE|OPERATIONAL|PROVEN|ENABLED|RUNNING" -AllMatches -ErrorAction SilentlyContinue
  foreach ($match in @($matches)) {
    $proofBacked = $false
    $reason = "No direct proof artifact mapped to this raw claim line."
    if ($proofLedger -and $proofLedger.lanes) {
      foreach ($lane in @($proofLedger.lanes)) {
        if ($match.Line -match [regex]::Escape([string]$lane.laneId) -or $match.Line -match [regex]::Escape([string]$lane.laneName)) {
          $proofBacked = ($lane.correctedStatus -eq "READY_PROVEN")
          $reason = if ($proofBacked) { "Mapped lane is READY_PROVEN in proof ledger." } else { "Mapped lane downgraded to $($lane.correctedStatus)." }
          break
        }
      }
    }
    $claims += [ordered]@{
      sourceReport = $file
      lineNumber = $match.LineNumber
      claimText = $match.Line.Trim()
      command = "Select-String PASS/READY audit"
      reportPath = $file
      receiptPath = $null
      rawEvidencePath = $file
      proofLevel = if ($proofBacked) { "PROOF_LEVEL_REQUIRED_SATISFIED" } else { "PROOF_LEVEL_UNMAPPED_OR_UNSATISFIED" }
      proofBacked = $proofBacked
      staleOrDocumentOnlyRisk = -not $proofBacked
      reason = $reason
    }
  }
}

$overstated = @($claims | Where-Object { -not $_.proofBacked })
$verdict = if ($claims.Count -eq 0) {
  "PASS_READY_CLAIMS_PARTIALLY_PROOF_BACKED"
} elseif ($overstated.Count -eq 0) {
  "PASS_READY_CLAIMS_PROOF_BACKED"
} elseif ($overstated.Count -lt $claims.Count) {
  "PASS_READY_CLAIMS_PARTIALLY_PROOF_BACKED"
} else {
  "PASS_READY_CLAIMS_OVERSTATED"
}

$report = [ordered]@{
  reportId = "leeway-pass-ready-claim-audit-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  claimsAudited = $claims.Count
  claimsProofBacked = @($claims | Where-Object { $_.proofBacked }).Count
  claimsOverstated = $overstated.Count
  claims = $claims
  verdict = $verdict
}

$reportPath = Join-Path $ReportsDir "leeway-pass-ready-claim-audit-report.json"
$mdPath = Join-Path $ReportsDir "leeway-pass-ready-claim-audit-report.md"
$receiptPath = Join-Path $ReceiptsDir "leeway-pass-ready-claim-audit-$Stamp.json"
Write-LeewayJson -Path $reportPath -Object $report | Out-Null
Write-LeewayJson -Path $receiptPath -Object $report | Out-Null
Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ("# LeeWay PASS/READY Claim Audit`n`nVerdict: $verdict`n`nClaims audited: $($claims.Count)`nClaims overstated: $($overstated.Count)")

Write-Host "Verdict: $verdict"
Write-Host "Claims audited: $($claims.Count)"
Write-Host "Claims overstated: $($overstated.Count)"
Write-Host "Report: $reportPath"
Write-Host "Receipt: $receiptPath"
exit $(if ($verdict -eq "PASS_READY_CLAIMS_PROOF_BACKED") { 0 } else { 1 })

