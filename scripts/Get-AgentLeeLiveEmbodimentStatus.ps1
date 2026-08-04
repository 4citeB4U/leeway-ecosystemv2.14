[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$LiveReportPath = Join-Path $Root "Archive\reports\agent-lee-live-embodiment-device-status-report.json"
$DeviceReportPath = Join-Path $Root "Archive\reports\agent-lee-real-world-device-awareness-report.json"
$ReceiptDir = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment"
$ModelFamilyReportPath = Join-Path $Root "Archive\reports\leeway-ollama-model-family-report.json"
$ModelFamilyReport = Read-LeewayJson -Path $ModelFamilyReportPath -Fallback $null
$MasterCompletionReportPath = Join-Path $Root "Archive\reports\leeway-master-total-ecosystem-completion-report.json"
$MasterCompletionReport = Read-LeewayJson -Path $MasterCompletionReportPath -Fallback $null
$ProofLedgerPath = Join-Path $Root "Archive\reports\leeway-proof-ledger.json"
$ProofLedger = Read-LeewayJson -Path $ProofLedgerPath -Fallback $null
$FalseCompletionCorrectionPath = Join-Path $Root "Archive\reports\leeway-current-false-completion-correction-report.json"
$FalseCompletionCorrection = Read-LeewayJson -Path $FalseCompletionCorrectionPath -Fallback $null

$live = Read-LeewayJson -Path $LiveReportPath -Fallback $null
$devices = Read-LeewayJson -Path $DeviceReportPath -Fallback $null
$latestReceiptFile = Get-LeewayLatestJsonFile -Path $ReceiptDir
$latestReceipt = if ($latestReceiptFile) { Read-LeewayJson -Path $latestReceiptFile.FullName -Fallback $null } else { $null }
$latestReceiptPath = if ($latestReceiptFile) { $latestReceiptFile.FullName } else { "<none>" }
$ownerName = if ($live -and $live.ownerIdentity) { $live.ownerIdentity.ownerName } else { $null }
$ownerBoundary = if ($live -and $live.audienceBoundary) {
  $live.audienceBoundary
} elseif ($live -and $live.ownerIdentity -and $live.ownerIdentity.audienceBoundary) {
  $live.ownerIdentity.audienceBoundary
} else {
  "Leonard J Lee is creator-root authority. Other room participants are audience members unless explicitly enrolled and verified."
}
$blockers = if ($live) { @($live.blockers) } else { @() }
$modelFamilyStatus = if ($ModelFamilyReport) { $ModelFamilyReport.verdict } else { "UNKNOWN" }
$primaryReasoningModel = "qwen3:latest"
$primaryReasoningModelStatus = $false
$primaryVisionModel = "qwen2.5vl:7b"
$primaryVisionModelStatus = $false
$primaryCoderModel = "qwen2.5-coder:latest"
$primaryCoderModelStatus = $false
$secondaryCoderModel = "qwen2.5-coder:7b"
$secondaryCoderModelStatus = $false
try {
  $tags = (Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags").models | Select-Object -ExpandProperty name
  $primaryReasoningModelStatus = $tags -contains $primaryReasoningModel
  $primaryVisionModelStatus = $tags -contains $primaryVisionModel
  $primaryCoderModelStatus = $tags -contains $primaryCoderModel
  $secondaryCoderModelStatus = $tags -contains $secondaryCoderModel
} catch {}

Write-Host "Agent Lee Live Status" -ForegroundColor Cyan
Write-Host "Mind / core runtime: $($live.coreRuntimeReady)"
Write-Host "Voice / speaker: $($live.voiceTtsReady) / $($live.speakerPlaybackReady)"
Write-Host "Ears / mic: $($live.microphoneDeviceStatus) / $($live.microphoneListenerStatus)"
Write-Host "Eyes / camera: $($live.cameraDeviceStatus) / $($live.cameraRuntimeStatus)"
Write-Host "Eyes / screen: $($live.screenVisionStatus)"
Write-Host "Hands / mouse and keyboard: $($live.mouseKeyboardStatus)"
Write-Host "Body / presence UI: $($live.presenceUiStatus)"
Write-Host "Optional clients / VS Code: $($live.vscodeOptionalStatus)"
Write-Host "Model family status: $modelFamilyStatus"
Write-Host "Reasoning / vision / coder: $primaryReasoningModelStatus / $primaryVisionModelStatus / $primaryCoderModelStatus"
Write-Host "Secondary coder: $secondaryCoderModelStatus"
Write-Host "Owner / creator: $ownerName"
Write-Host "Owner boundary: $ownerBoundary"
if ($devices) {
  $devVerdict = if ($devices.PSObject.Properties.Name -contains "verdict") { $devices.verdict } else { "UNKNOWN" }
  Write-Host "Device awareness: $devVerdict"
  $printersCount = if ($devices.PSObject.Properties.Name -contains "printers") { @($devices.printers).Count } else { 0 }
  $usbCount = if ($devices.PSObject.Properties.Name -contains "usbDevices") { @($devices.usbDevices).Count } else { 0 }
  $btCount = if ($devices.PSObject.Properties.Name -contains "bluetoothDevices") { @($devices.bluetoothDevices).Count } else { 0 }
  Write-Host "Printers: $printersCount | USB: $usbCount | Bluetooth: $btCount"
}
Write-Host "Current blockers:"
$blockers | ForEach-Object { Write-Host " - $_" }
if ($ProofLedger) {
  $proofGapsForConsole = @($ProofLedger.lanes | Where-Object { $_.correctedStatus -ne "READY_PROVEN" })
  Write-Host "Proof ledger: loaded"
  Write-Host "Proof-backed ready lanes: $(@($ProofLedger.lanes | Where-Object { $_.correctedStatus -eq 'READY_PROVEN' }).Count)"
  Write-Host "Proof gaps: $($proofGapsForConsole.Count)"
} else {
  Write-Host "Proof ledger: missing"
}
Write-Host "Latest live receipt: $latestReceiptPath"
if ($latestReceipt) {
  $latestVerdict = if ($latestReceipt.PSObject.Properties.Name -contains "verdict") { $latestReceipt.verdict } else { "UNKNOWN" }
  Write-Host "Latest verdict: $latestVerdict"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fullTruthReportPath = Join-Path $Root "Archive\reports\agent-lee-live-embodiment-full-truth-status-report.json"
$fullTruthReceiptPath = Join-Path $ReceiptDir "agent-lee-live-full-truth-status-$stamp.json"
$laneSummary = if ($MasterCompletionReport -and $MasterCompletionReport.summary) { $MasterCompletionReport.summary } else { $null }
$laneBlockers = if ($MasterCompletionReport -and $MasterCompletionReport.blockers) { @($MasterCompletionReport.blockers) } else { @() }
$latestVoiceReceiptFile = Get-LeewayLatestJsonFile -Path (Join-Path $Root "Archive\receipts\agent-lee-voice")
$latestVisionReceiptFile = Get-LeewayLatestJsonFile -Path (Join-Path $Root "Archive\receipts\agent-lee-vision")
$proofLanes = if ($ProofLedger -and $ProofLedger.lanes) { @($ProofLedger.lanes) } else { @() }
$proofGaps = @($proofLanes | Where-Object { $_.correctedStatus -ne "READY_PROVEN" })
$falseReadyClaims = if ($ProofLedger -and $ProofLedger.falseReadyClaims) { @($ProofLedger.falseReadyClaims) } else { @() }
$requiredProofLevelByLane = @($proofLanes | ForEach-Object { [ordered]@{ laneId = $_.laneId; laneName = $_.laneName; requiredProofLevel = $_.requiredProofLevel } })
$actualProofLevelByLane = @($proofLanes | ForEach-Object { [ordered]@{ laneId = $_.laneId; laneName = $_.laneName; actualProofLevel = $_.actualProofLevel; correctedStatus = $_.correctedStatus } })
$cannotClaimReadyReasons = @($proofLanes | Where-Object { $_.cannotClaimReadyReason } | ForEach-Object { [ordered]@{ laneId = $_.laneId; laneName = $_.laneName; reason = $_.cannotClaimReadyReason } })
$weightedGateWarnings = @()
if ($ProofLedger -and $proofGaps.Count -gt 0) {
  $weightedGateWarnings += "WEIGHTED_GATE_CANNOT_OVERRIDE_PROOF_LEDGER"
}
$compactLaneBlockers = @($laneBlockers | Select-Object -First 40 | ForEach-Object {
  [ordered]@{
    laneId = $_.laneId
    laneName = $_.laneName
    state = $_.state
    blockers = @($_.blockers)
    missingWork = @($_.missingWork)
  }
})
$fullTruth = [ordered]@{
  reportId = "agent-lee-live-full-truth-status-$stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  absoluteProofLawLoaded = (Test-Path -LiteralPath (Join-Path $Root "LeeWay-Standards\standards\BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"))
  noFalseCompletionLawLoaded = (Test-Path -LiteralPath (Join-Path $Root "agent-lee-coding-mode\contracts\leeway-no-false-completion-law.md"))
  proofLedgerStatus = if ($ProofLedger) { "LOADED" } else { "MISSING" }
  falseReadyClaims = $falseReadyClaims
  stalePassClaims = $falseReadyClaims
  weightedGateWarnings = $weightedGateWarnings
  documentReadyRuntimeUnprovenCount = if ($MasterCompletionReport -and $MasterCompletionReport.PSObject.Properties.Name -contains "summary" -and $MasterCompletionReport.summary.PSObject.Properties.Name -contains "DOCUMENT_READY_RUNTIME_UNPROVEN") { $MasterCompletionReport.summary.DOCUMENT_READY_RUNTIME_UNPROVEN } else { $null }
  partialLaneCount = if ($MasterCompletionReport -and $MasterCompletionReport.PSObject.Properties.Name -contains "summary" -and $MasterCompletionReport.summary.PSObject.Properties.Name -contains "PARTIAL") { $MasterCompletionReport.summary.PARTIAL } else { $null }
  blockedLaneCount = if ($proofGaps) { @($proofGaps | Where-Object { $_.correctedStatus -match '^BLOCKED_' }).Count } else { $null }
  missingLaneCount = if ($proofGaps) { @($proofGaps | Where-Object { $_.correctedStatus -eq 'MISSING' }).Count } else { $null }
  proofBackedReadyCount = @($proofLanes | Where-Object { $_.correctedStatus -eq "READY_PROVEN" }).Count
  proofGaps = $proofGaps
  requiredProofLevelByLane = $requiredProofLevelByLane
  actualProofLevelByLane = $actualProofLevelByLane
  lastProofReceipt = if ($ProofLedger -and $ProofLedger.metadata) { "Archive/receipts/leeway-system-completion/leeway-proof-ledger-*.json" } else { $null }
  lastFalseCompletionCorrection = if ($FalseCompletionCorrection) { $FalseCompletionCorrectionPath } else { $null }
  cannotClaimReadyReasons = $cannotClaimReadyReasons
  finalTruthVerdict = if ($proofGaps.Count -gt 0) { "LIVE_AGENT_PARTIAL_PROOF_BLOCKERS_REMAIN" } else { "LIVE_AGENT_READY_PROOF_BACKED" }
  owner = [ordered]@{
    ownerCreatorRootAuthority = $true
    ownerIdentityStatus = if ($ownerName) { "PRESENT" } else { "UNKNOWN" }
    biometricEnrollmentStatus = "UNPROVEN_UNLESS_CAMERA_MIC_MODEL_ENROLLMENT_RECEIPT_EXISTS"
    audienceBoundaryStatus = $ownerBoundary
    trustedOperatorStatus = "CREATOR_ROOT_APPROVAL_REQUIRED"
  }
  voice = [ordered]@{
    voiceKernelStatus = if ($laneSummary) { "SEE_MASTER_LEDGER" } else { "UNKNOWN" }
    voiceKernelPort = 8092
    voiceKernelHealth = "SEE_ARCHIVE_REPORTS_AGENT_LEE_VOICE_KERNEL_HEALTH"
    canonicalCloneVoiceRouteStatus = "SEE_MASTER_LEDGER"
    alwaysListeningStatus = "EXPLICIT_SESSION_REQUIRED"
    naturalConversationStatus = "SEE_MASTER_LEDGER"
    rtcVoiceStatus = "SEE_MASTER_LEDGER"
    lastVoiceReceipt = if ($latestVoiceReceiptFile) { $latestVoiceReceiptFile.FullName } else { $null }
  }
  vision = [ordered]@{
    visionKernelStatus = "SEE_MASTER_LEDGER"
    visionKernelPort = 8093
    selectedVisionModel = $primaryVisionModel
    hostCameraBridgeStatus = "SEE_MASTER_LEDGER"
    cameraFrameCaptureStatus = "EXPLICIT_CAMERA_PERMISSION_REQUIRED"
    cameraToQwenStatus = "SEE_MASTER_LEDGER"
    screenOcrVisionStatus = "SEE_MASTER_LEDGER"
    visualAiWorkspaceStatus = "SEE_MASTER_LEDGER"
    roomVisionGovernanceStatus = "SEE_MASTER_LEDGER"
    lastVisionReceipt = if ($latestVisionReceiptFile) { $latestVisionReceiptFile.FullName } else { $null }
  }
  models = [ordered]@{
    primaryReasoningModel = $primaryReasoningModel
    primaryReasoningModelStatus = $primaryReasoningModelStatus
    qwen3FailureClass = "SEE_LEEWAY_QWEN3_REASONING_ROUTE_REPORT"
    primaryVisionModel = $primaryVisionModel
    primaryVisionModelStatus = $primaryVisionModelStatus
    primaryCoderModel = $primaryCoderModel
    primaryCoderModelStatus = $primaryCoderModelStatus
    secondaryCoderModel = $secondaryCoderModel
    secondaryCoderModelStatus = $secondaryCoderModelStatus
    audioHearingModelStatus = "SEE_MASTER_LEDGER"
    ttsModelStatus = "SEE_MASTER_LEDGER"
  }
  discovery = [ordered]@{
    discoveryGraphStatus = "SEE_MASTER_LEDGER"
    discoveryGraphEntityCount = $null
    discoveryGraphFileCount = $null
    discoveryGraphDirectoryCount = $null
    discoveryGaps = @()
    discoveryFirstPolicyStatus = "SEE_MASTER_LEDGER"
  }
  lifecycle = [ordered]@{
    liveModelLifecycleStatus = "SEE_MASTER_LEDGER"
    hotSwapEnabled = "SEE_MASTER_LEDGER"
    activeModelRoutes = @($primaryReasoningModel, $primaryVisionModel, $primaryCoderModel, $secondaryCoderModel)
    candidateModelRoutes = @()
    rollbackRoutes = @()
    enhancementLayerRegistryStatus = "SEE_MASTER_LEDGER"
  }
  device = [ordered]@{
    deviceAwarenessStatus = if ($devices -and $devices.PSObject.Properties.Name -contains "verdict") { $devices.verdict } else { "UNKNOWN" }
    roomDeviceDiscoveryStatus = "SEE_MASTER_LEDGER"
    printerProofStatus = "APPROVAL_REQUIRED_FOR_PRINT_ACTION"
    localNetworkStatus = "SEE_MASTER_LEDGER"
    bluetoothStatus = "SEE_MASTER_LEDGER"
    usbPeripheralStatus = "SEE_MASTER_LEDGER"
    edgeDeviceStatus = "SEE_MASTER_LEDGER"
    edgeIotStatus = "SEE_MASTER_LEDGER"
    edgeGpuStatus = "SEE_MASTER_LEDGER"
    edgeRtcStatus = "SEE_MASTER_LEDGER"
    physicalActionSafetyStatus = "APPROVAL_REQUIRED_FOR_CONTROL"
  }
  runtime = [ordered]@{
    bridgeRuntimeStatus = if ($live -and $live.PSObject.Properties.Name -contains "coreRuntimeReady") { $live.coreRuntimeReady } else { "UNKNOWN" }
    runtimeFabricStatus = "SEE_MASTER_LEDGER"
    coreRuntimeStatus = if ($live -and $live.PSObject.Properties.Name -contains "coreRuntimeReady") { $live.coreRuntimeReady } else { "UNKNOWN" }
    desktopRuntimeStatus = "SEE_MASTER_LEDGER"
    autonomousExecutionStatus = "APPROVAL_REQUIRED"
    mouseKeyboardStatus = if ($live -and $live.PSObject.Properties.Name -contains "mouseKeyboardStatus") { $live.mouseKeyboardStatus } else { "UNKNOWN" }
    windowsServiceStatus = "SEE_MASTER_LEDGER"
    routerModularizationStatus = "SEE_MASTER_LEDGER"
    eventBusStatus = "SEE_MASTER_LEDGER"
    workflowEngineStatus = "SEE_MASTER_LEDGER"
    executionVmStatus = "SEE_MASTER_LEDGER"
  }
  applications = [ordered]@{
    employmentCenterStatus = "SEE_MASTER_LEDGER"
    contentAutomationStatus = "SEE_MASTER_LEDGER"
    svgCreatorStatus = "SEE_MASTER_LEDGER"
    presentationEngineStatus = "SEE_MASTER_LEDGER"
    generatedApplicationStatus = "SEE_MASTER_LEDGER"
    appGovernanceInheritanceStatus = "SEE_MASTER_LEDGER"
  }
  governance = [ordered]@{
    constitutionalGovernanceStatus = "SEE_MASTER_LEDGER"
    standardsBookCoverage = "SEE_MASTER_LEDGER"
    lawResolutionStatus = "SEE_MASTER_LEDGER"
    receiptsSystemStatus = "ACTIVE"
    gatesSystemStatus = "SEE_MASTER_LEDGER"
    telemetryStatus = "SEE_MASTER_LEDGER"
    identityGraphStatus = "SEE_MASTER_LEDGER"
    blockerSentinelStatus = "SEE_MASTER_LEDGER"
    antiDriftStatus = "SEE_MASTER_LEDGER"
    recoveryContinuityStatus = "SEE_MASTER_LEDGER"
    simulationRecoveryStatus = "SEE_MASTER_LEDGER"
  }
  reports = @($LiveReportPath, $ModelFamilyReportPath, $MasterCompletionReportPath, $fullTruthReportPath)
  receipts = @($latestReceiptPath, $fullTruthReceiptPath)
  blockers = @($blockers) + $compactLaneBlockers
  truthLabels = @("LIVE_STATUS_EXPOSES_FULL_SYSTEM_TRUTH", "LIVE_STATUS_EXPOSES_PROOF_GAPS", "NO_FAKE_PASS")
  verdict = if ($proofGaps.Count -gt 0) { "LIVE_AGENT_PARTIAL_PROOF_BLOCKERS_REMAIN" } elseif ($MasterCompletionReport -and $MasterCompletionReport.PSObject.Properties.Name -contains "verdict") { $MasterCompletionReport.verdict } else { "LIVE_STATUS_PARTIAL_MASTER_LEDGER_MISSING" }
}

Write-LeewayJson -Path $fullTruthReportPath -Object $fullTruth | Out-Null
Write-LeewayJson -Path $fullTruthReceiptPath -Object $fullTruth | Out-Null
Write-Host "Full truth report: $fullTruthReportPath"
Write-Host "Full truth receipt: $fullTruthReceiptPath"
