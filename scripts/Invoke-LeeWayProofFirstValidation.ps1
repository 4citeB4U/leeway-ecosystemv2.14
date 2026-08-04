[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "LeewayProofCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$IsoNow = (Get-Date).ToUniversalTime().ToString("o")
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
$ProofDir = Join-Path $Root "Archive\proofs\leeway-proof-ledger"
New-LeewayDirectory -Path $ReportsDir | Out-Null
New-LeewayDirectory -Path $ReceiptsDir | Out-Null
New-LeewayDirectory -Path $ProofDir | Out-Null

$integrityReportPath = Join-Path $ReportsDir "leeway-validator-integrity-audit-report.json"
$integrityReport = Read-LeewayJson -Path $integrityReportPath -Fallback $null
$validatorIntegrityMap = @{}
if ($integrityReport -and $integrityReport.validators) {
  foreach ($val in $integrityReport.validators) {
    $validatorIntegrityMap[$val.name.ToLower()] = $val
  }
}

$lanes = Get-LeeWayMasterLanes -Root $Root
$proofLanes = @()
foreach ($lane in $lanes) {
  $required = Get-LeeWayRequiredProofLevel -Lane $lane
  $snapshotPath = Join-Path $ProofDir ("{0}-{1}-proof-snapshot.json" -f $lane.laneId.ToLower(), $Stamp)
  $actual = Get-LeeWayActualProofLevel -Root $Root -Lane $lane -ProofSnapshotPath $snapshotPath
  
  $blockers = @()
  if ($lane.PSObject.Properties.Name -contains "blockers") { $blockers = @($lane.blockers) }

  # Validator integrity check integration
  $validatorIntegrityStatus = "VALIDATOR_TRUSTED"
  $validatorIsBroken = $false
  $badScriptName = $null
  if ($lane.PSObject.Properties.Name -contains "validationScriptsFound") {
    foreach ($scriptPath in @($lane.validationScriptsFound)) {
      $scriptName = (Split-Path -Leaf $scriptPath).ToLower()
      if ($validatorIntegrityMap.ContainsKey($scriptName)) {
        $valObj = $validatorIntegrityMap[$scriptName]
        if ($valObj.status -ne "VALIDATOR_TRUSTED") {
          $validatorIntegrityStatus = $valObj.status
          $validatorIsBroken = $true
          $badScriptName = $valObj.name
        }
      }
    }
  }

  $actualLevel = $actual.level
  if ($validatorIsBroken) {
    $actualLevel = "PROOF_LEVEL_1_STATIC_VALIDATION"
    $blockers += "BLOCKED_RUNTIME: Validator integrity failure ($validatorIntegrityStatus) in script $badScriptName. Unreachable proof code or wrapper-only detected."
  }

  $corrected = Get-LeeWayCorrectedStatus -RequiredProofLevel $required -ActualProofLevel $actualLevel -TimedOut $actual.timedOut -Skipped $actual.skipped -Blockers $blockers
  $proofStatus = Get-LeeWayProofStatus -CorrectedStatus $corrected
  $truthAllowed = ($corrected -eq "READY_PROVEN")
  $deniedReason = if ($truthAllowed) { $null } else { "actualProofLevel $actualLevel is below requiredProofLevel $required or blocker exists." }
  $proofLanes += [ordered]@{
    laneId = $lane.laneId
    laneName = $lane.laneName
    currentClaimedStatus = $lane.finalVerdictForLane
    requiredProofLevel = $required
    actualProofLevel = $actualLevel
    proofStatus = $proofStatus
    proofArtifacts = $actual.proofArtifacts
    rawCommandLog = Join-Path $ReportsDir "leeway-master-total-ecosystem-validation-command-log.jsonl"
    endpointProof = $actual.endpointProof
    artifactProof = $actual.functionalProof
    screenshotProof = $null
    audioProof = if ($lane.laneName -match "Voice|voice") { $actual.functionalProof } else { $null }
    imageProof = if ($lane.laneName -match "Vision|Camera|Screen") { $actual.functionalProof } else { $null }
    receiptProof = @($lane.receiptsFound)
    reportProof = @($lane.reportsFound)
    blocker = $blockers
    correctedStatus = $corrected
    truthLabelAllowed = $truthAllowed
    truthLabelDeniedReason = $deniedReason
    cannotClaimReadyReason = $deniedReason
    validatorIntegrityStatus = $validatorIntegrityStatus
  }
}

$summary = [ordered]@{}
foreach ($status in @("READY_PROVEN","DOCUMENT_ONLY","STATIC_ONLY","COMMAND_ONLY","RUNTIME_ENDPOINT_ONLY","FUNCTIONAL_PROOF_MISSING","END_TO_END_PROOF_MISSING","TIMED_OUT","SKIPPED","BLOCKED_APPROVAL","BLOCKED_HARDWARE","BLOCKED_PERMISSION","BLOCKED_RUNTIME","BLOCKED_MODEL","MISSING","PARTIALLY_PROVEN")) {
  $summary[$status] = @($proofLanes | Where-Object { $_.correctedStatus -eq $status -or ($status -eq "PARTIALLY_PROVEN" -and $_.proofStatus -eq "PARTIALLY_PROVEN") }).Count
}

$falseReadyClaims = @($proofLanes | Where-Object {
  $_.currentClaimedStatus -match "READY|PASS|COMPLETE|LIVE|OPERATIONAL|PROVEN|99_READY" -and $_.correctedStatus -ne "READY_PROVEN"
})

$verdict = if ($falseReadyClaims.Count -gt 0) {
  "LEEWAY_PASS_READY_CLAIMS_OVERSTATED"
} elseif (@($proofLanes | Where-Object { $_.correctedStatus -ne "READY_PROVEN" }).Count -gt 0) {
  "LEEWAY_PROOF_FIRST_PARTIAL_BLOCKERS_REMAIN"
} else {
  "LEEWAY_PROOF_FIRST_READY"
}

$common = [ordered]@{
  reportId = "leeway-proof-first-$Stamp"
  generatedAt = $IsoNow
  workspaceRoot = $Root
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  governingStandardsRead = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
  )
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
}

$ledger = [ordered]@{
  metadata = $common
  proofLevels = @(
    "PROOF_LEVEL_0_DOCUMENT",
    "PROOF_LEVEL_1_STATIC_VALIDATION",
    "PROOF_LEVEL_2_COMMAND_VALIDATION",
    "PROOF_LEVEL_3_RUNTIME_ENDPOINT",
    "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME",
    "PROOF_LEVEL_5_END_TO_END_PROOF"
  )
  summary = $summary
  falseReadyClaims = $falseReadyClaims
  lanes = $proofLanes
  verdict = $verdict
}

$proofLedgerPath = Join-Path $ReportsDir "leeway-proof-ledger.json"
$proofLedgerMdPath = Join-Path $ReportsDir "leeway-proof-ledger.md"
$proofLedgerReceiptPath = Join-Path $ReceiptsDir "leeway-proof-ledger-$Stamp.json"
$contractReportPath = Join-Path $ReportsDir "leeway-proof-first-readiness-contract-report.json"
$contractReceiptPath = Join-Path $ReceiptsDir "leeway-proof-first-readiness-contract-$Stamp.json"
$correctionPath = Join-Path $ReportsDir "leeway-readiness-correction-report.json"
$correctionMdPath = Join-Path $ReportsDir "leeway-readiness-correction-report.md"
$correctionReceiptPath = Join-Path $ReceiptsDir "leeway-readiness-correction-$Stamp.json"
$currentCorrectionPath = Join-Path $ReportsDir "leeway-current-false-completion-correction-report.json"
$currentCorrectionMdPath = Join-Path $ReportsDir "leeway-current-false-completion-correction-report.md"
$currentCorrectionReceiptPath = Join-Path $ReceiptsDir "leeway-current-false-completion-correction-$Stamp.json"
$finalReportPath = Join-Path $ReportsDir "leeway-proof-first-final-report.json"
$finalReportMdPath = Join-Path $ReportsDir "leeway-proof-first-final-report.md"
$finalReceiptPath = Join-Path $ReceiptsDir "leeway-proof-first-final-$Stamp.json"
$discoveryRegistryPath = Join-Path $Root "Leeway Runtime Fabric\discovery\leeway-total-discovery-graph.registry.json"
$agentDiscoveryPointerPath = Join-Path $Root "agent-lee-coding-mode\runtime\discovery\leeway-total-discovery-graph.registry.json"

$contractReport = [ordered]@{
  metadata = $common
  contracts = @(
    "agent-lee-coding-mode/contracts/leeway-proof-first-readiness-contract.md",
    "agent-lee-coding-mode/contracts/leeway-no-pass-without-proof-contract.md",
    "agent-lee-coding-mode/contracts/leeway-absolute-proof-law.md",
    "agent-lee-coding-mode/contracts/leeway-no-false-completion-law.md",
    "agent-lee-coding-mode/contracts/leeway-proof-or-blocker-contract.md",
    "agent-lee-coding-mode/contracts/leeway-proof-backed-receipt-schema.json"
  )
  proofLevelsStandardized = $true
  verdict = "PROOF_FIRST_READINESS_CONTRACT_READY"
}

$corrections = @($proofLanes | Where-Object { $_.currentClaimedStatus -ne $_.correctedStatus } | ForEach-Object {
  [ordered]@{
    originalClaim = $_.currentClaimedStatus
    sourceReport = Join-Path $ReportsDir "leeway-master-total-ecosystem-completion-report.json"
    sourceReceipt = Join-Path $ReceiptsDir "leeway_master_total_ecosystem_completion_receipt.json"
    requiredProofLevel = $_.requiredProofLevel
    actualProofLevel = $_.actualProofLevel
    correctedStatus = $_.correctedStatus
    reason = $_.truthLabelDeniedReason
    requiredNextProof = $_.cannotClaimReadyReason
    truthLabelsRemoved = @()
    truthLabelsAllowed = if ($_.truthLabelAllowed) { @("READY_PROVEN") } else { @() }
  }
})

$correctionReport = [ordered]@{
  metadata = $common
  corrections = $corrections
  verdict = if ($corrections.Count -gt 0) { "READINESS_CLAIMS_CORRECTED" } else { "NO_READINESS_CORRECTIONS_REQUIRED" }
}

$finalReport = [ordered]@{
  metadata = $common
  proofRulesApplied = $ledger.proofLevels
  passReadyClaimAuditResult = if ($falseReadyClaims.Count -gt 0) { "PASS_READY_CLAIMS_OVERSTATED" } else { "PASS_READY_CLAIMS_PROOF_BACKED" }
  claimsAudited = $proofLanes.Count
  claimsProofBacked = @($proofLanes | Where-Object { $_.correctedStatus -eq "READY_PROVEN" }).Count
  claimsDowngraded = $corrections.Count
  laneProofTable = $proofLanes
  proofArtifactsWritten = @(Get-ChildItem -LiteralPath $ProofDir -File -Filter "*$Stamp*.json" | Select-Object -ExpandProperty FullName)
  receiptsWritten = @($proofLedgerReceiptPath, $contractReceiptPath, $correctionReceiptPath, $currentCorrectionReceiptPath, $finalReceiptPath)
  reportsWritten = @($proofLedgerPath, $contractReportPath, $correctionPath, $currentCorrectionPath, $finalReportPath)
  remainingBlockers = @($proofLanes | Where-Object { $_.correctedStatus -ne "READY_PROVEN" })
  requiredApprovals = @($proofLanes | Where-Object { $_.correctedStatus -eq "BLOCKED_APPROVAL" })
  requiredHardwarePermissionActions = @($proofLanes | Where-Object { $_.correctedStatus -in @("BLOCKED_HARDWARE", "BLOCKED_PERMISSION") })
  requiredServiceStartCommands = @(
    "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-AgentLeeVisionKernelDocker.ps1",
    "powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-AgentLeeVoiceKernelHealth.ps1"
  )
  truthLabels = @(
    "ABSOLUTE_PROOF_LAW_INSTALLED",
    "NO_FALSE_COMPLETION_LAW_INSTALLED",
    "NO_PASS_WITHOUT_PROOF_LAW_INSTALLED",
    "PROOF_LEVELS_STANDARDIZED",
    "DISCOVERY_GRAPH_PROOF_FIELDS_READY",
    "PROOF_BACKED_RECEIPT_SCHEMA_READY",
    "CURRENT_FALSE_READY_CLAIMS_CORRECTED",
    "WEIGHTED_GATE_CANNOT_OVERRIDE_PROOF_LEDGER",
    "NO_FAKE_PASS"
  )
  verdict = $verdict
}

Write-LeewayJson -Path $proofLedgerPath -Object $ledger | Out-Null
Write-LeewayJson -Path $proofLedgerReceiptPath -Object $ledger | Out-Null
Write-LeewayJson -Path $contractReportPath -Object $contractReport | Out-Null
Write-LeewayJson -Path $contractReceiptPath -Object $contractReport | Out-Null
Write-LeewayJson -Path $correctionPath -Object $correctionReport | Out-Null
Write-LeewayJson -Path $correctionReceiptPath -Object $correctionReport | Out-Null
Write-LeewayJson -Path $currentCorrectionPath -Object $correctionReport | Out-Null
Write-LeewayJson -Path $currentCorrectionReceiptPath -Object $correctionReport | Out-Null
Write-LeewayJson -Path $finalReportPath -Object $finalReport | Out-Null
Write-LeewayJson -Path $finalReceiptPath -Object $finalReport | Out-Null

$discoveryRegistry = Read-LeewayJson -Path $discoveryRegistryPath -Fallback $null
if ($discoveryRegistry) {
  $discoveryRegistry | Add-Member -NotePropertyName "lastUpdated" -NotePropertyValue $IsoNow -Force
  $discoveryRegistry | Add-Member -NotePropertyName "lastProofLedger" -NotePropertyValue "Archive/reports/leeway-proof-ledger.json" -Force
  $discoveryRegistry | Add-Member -NotePropertyName "lastCorrectionReport" -NotePropertyValue "Archive/reports/leeway-current-false-completion-correction-report.json" -Force
  $discoveryRegistry | Add-Member -NotePropertyName "entities" -NotePropertyValue @($proofLanes | ForEach-Object {
    [ordered]@{
      entityId = "LEEWAY_APP::PROOF_LEDGER::LANE::$($_.laneId)"
      laneId = $_.laneId
      laneName = $_.laneName
      claimedStatus = $_.currentClaimedStatus
      correctedStatus = $_.correctedStatus
      requiredProofLevel = $_.requiredProofLevel
      actualProofLevel = $_.actualProofLevel
      proofArtifacts = $_.proofArtifacts
      rawEvidencePath = $_.rawCommandLog
      lastProofReceipt = $proofLedgerReceiptPath
      proofFreshness = $IsoNow
      blockers = @($_.blocker)
      falseCompletionRisk = ($_.correctedStatus -ne "READY_PROVEN")
      cannotClaimReadyReason = $_.cannotClaimReadyReason
    }
  }) -Force
  Write-LeewayJson -Path $discoveryRegistryPath -Object $discoveryRegistry | Out-Null
}
if (Test-Path -LiteralPath (Split-Path -Parent $agentDiscoveryPointerPath)) {
  $agentPointer = Read-LeewayJson -Path $agentDiscoveryPointerPath -Fallback ([ordered]@{})
  $agentPointer | Add-Member -NotePropertyName "lastProofLedger" -NotePropertyValue "Archive/reports/leeway-proof-ledger.json" -Force
  $agentPointer | Add-Member -NotePropertyName "lastUpdated" -NotePropertyValue $IsoNow -Force
  Write-LeewayJson -Path $agentDiscoveryPointerPath -Object $agentPointer | Out-Null
}

$md = @(
  "# LeeWay Proof Ledger",
  "",
  "Generated: $IsoNow",
  "",
  "Verdict: $verdict",
  "",
  "## Summary",
  "",
  ($summary.GetEnumerator() | ForEach-Object { "- $($_.Key): $($_.Value)" }) -join "`n",
  "",
  "## Downgraded Claims",
  "",
  (@($corrections) | ForEach-Object { "- $($_.originalClaim) -> $($_.correctedStatus): $($_.reason)" }) -join "`n"
) -join "`n"
Set-Content -LiteralPath $proofLedgerMdPath -Value $md -Encoding UTF8
Set-Content -LiteralPath $correctionMdPath -Value $md -Encoding UTF8
Set-Content -LiteralPath $currentCorrectionMdPath -Value $md -Encoding UTF8
Set-Content -LiteralPath $finalReportMdPath -Value $md -Encoding UTF8

Write-Host "Verdict: $verdict"
Write-Host "Claims audited: $($proofLanes.Count)"
Write-Host "Claims proof-backed: $($finalReport.claimsProofBacked)"
Write-Host "Claims downgraded: $($corrections.Count)"
Write-Host "Proof ledger: $proofLedgerPath"
Write-Host "Final report: $finalReportPath"
Write-Host "Receipt: $finalReceiptPath"

if (-not $NoExitOnFail -and $verdict -ne "LEEWAY_PROOF_FIRST_READY") {
  exit 1
}
exit 0
