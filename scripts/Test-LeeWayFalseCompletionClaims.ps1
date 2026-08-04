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

try {
  & (Join-Path $PSScriptRoot "Invoke-LeeWayProofFirstValidation.ps1") -NoExitOnFail | Out-Host
} catch {}

$proofLedger = Read-LeewayJson -Path (Join-Path $ReportsDir "leeway-proof-ledger.json") -Fallback $null
$targetFiles = @(
  "leeway-master-total-ecosystem-completion-report.json",
  "leeway-master-backlog-ledger-report.json",
  "leeway-unfinished-work-ledger-report.json",
  "production-gate-latest.json",
  "agent-lee-live-embodiment-full-truth-status-report.json",
  "leeway-proof-ledger.json",
  "leeway-readiness-correction-report.json"
) | ForEach-Object { Join-Path $ReportsDir $_ } | Where-Object { Test-Path -LiteralPath $_ }

$claims = @()
foreach ($file in $targetFiles) {
  $matches = Select-String -Path $file -Pattern "PASS|READY|COMPLETE|LIVE|OPERATIONAL|WORKING|PROVEN|99_READY|productionAllowed" -AllMatches -ErrorAction SilentlyContinue
  foreach ($match in @($matches)) {
    $mappedLane = $null
    if ($proofLedger -and $proofLedger.lanes) {
      $mappedLane = @($proofLedger.lanes | Where-Object { $match.Line -match [regex]::Escape([string]$_.laneId) -or $match.Line -match [regex]::Escape([string]$_.laneName) } | Select-Object -First 1)
    }
    $hasProof = ($mappedLane -and $mappedLane.correctedStatus -eq "READY_PROVEN")
    $claims += [ordered]@{
      sourcePath = $file
      lineNumber = $match.LineNumber
      claimText = $match.Line.Trim()
      requiredProofLevel = if ($mappedLane -and ($mappedLane.PSObject.Properties.Name -contains "requiredProofLevel")) { $mappedLane.requiredProofLevel } else { "UNKNOWN" }
      actualProofLevel = if ($mappedLane -and ($mappedLane.PSObject.Properties.Name -contains "actualProofLevel")) { $mappedLane.actualProofLevel } else { "UNKNOWN" }
      proofArtifact = if ($mappedLane -and ($mappedLane.PSObject.Properties.Name -contains "proofArtifacts")) { $mappedLane.proofArtifacts } else { @() }
      rawEvidence = if ($mappedLane -and ($mappedLane.PSObject.Properties.Name -contains "rawCommandLog")) { $mappedLane.rawCommandLog } else { $file }
      report = $file
      receipt = if ($mappedLane -and ($mappedLane.PSObject.Properties.Name -contains "receiptProof")) { $mappedLane.receiptProof } else { @() }
      command = "Select-String false-completion scan"
      timestamp = (Get-Date).ToUniversalTime().ToString("o")
      proofBacked = [bool]$hasProof
      correctionNeeded = -not [bool]$hasProof
    }
  }
}

$correctionsNeeded = @($claims | Where-Object { $_.correctionNeeded })
$verdict = if ($correctionsNeeded.Count -eq 0) { "FALSE_COMPLETION_CLAIMS_PROOF_BACKED" } else { "FALSE_COMPLETION_CLAIMS_CORRECTED_OR_FLAGGED" }

$report = [ordered]@{
  reportId = "leeway-false-completion-claims-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  claimsScanned = $claims.Count
  falseCompletionRisks = $correctionsNeeded.Count
  claims = $claims
  corrections = $correctionsNeeded
  verdict = $verdict
}

$reportPath = Join-Path $ReportsDir "leeway-false-completion-claims-report.json"
$mdPath = Join-Path $ReportsDir "leeway-false-completion-claims-report.md"
$receiptPath = Join-Path $ReceiptsDir "leeway-false-completion-claims-$Stamp.json"
Write-LeewayJson -Path $reportPath -Object $report | Out-Null
Write-LeewayJson -Path $receiptPath -Object $report | Out-Null
Set-Content -LiteralPath $mdPath -Encoding UTF8 -Value ("# LeeWay False Completion Claims`n`nVerdict: $verdict`nClaims scanned: $($claims.Count)`nFalse-completion risks: $($correctionsNeeded.Count)")

Write-Host "Verdict: $verdict"
Write-Host "Claims scanned: $($claims.Count)"
Write-Host "False-completion risks: $($correctionsNeeded.Count)"
Write-Host "Report: $reportPath"
Write-Host "Receipt: $receiptPath"
exit $(if ($correctionsNeeded.Count -eq 0) { 0 } else { 1 })
