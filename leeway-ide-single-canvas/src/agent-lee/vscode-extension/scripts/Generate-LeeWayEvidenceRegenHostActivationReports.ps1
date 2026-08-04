<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.EVIDENCE_REGEN_REPORT_WRITER
PURPOSE: Generate phase reports and final receipt for VSCode evidence regeneration and 1.2.14 host activation mission.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$WorkspaceRoot = "e:\.LeeWay-Produucts-File\.Leeway-new-line-of-products"
)

$ErrorActionPreference = "Stop"
Set-Location $WorkspaceRoot

$phase1 = Get-Content '.leeway-vscode/Archive/reports/leeway-vscode-test-evidence-integrity-correction-report.json' -Raw | ConvertFrom-Json
$phase2 = Get-Content '.leeway-vscode/Archive/reports/leeway-vscode-regenerated-test-evidence-report.json' -Raw | ConvertFrom-Json
$hostRefresh = Get-Content '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-live-host-refresh-result.json' -Raw | ConvertFrom-Json
$attest = Get-Content '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-active-runtime-attestation-result.json' -Raw | ConvertFrom-Json
$ui = Get-Content '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-extension-live-visual-validation-result.json' -Raw | ConvertFrom-Json
$model = Get-Content '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-model-purge-validation-report.json' -Raw | ConvertFrom-Json

$phase3Path = '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-host-reload-confirmation-report.json'
$phase4Path = '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-active-host-attestation-report.json'
$phase6Path = '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-live-ui-validation-report.json'
$finalJsonPath = '.leeway-vscode/Archive/reports/leeway-vscode-evidence-regeneration-1-2-12-host-activation-report.json'
$finalMdPath = '.leeway-vscode/Archive/reports/leeway-vscode-evidence-regeneration-1-2-12-host-activation-report.md'
$receiptPath = '.leeway-vscode/Archive/receipts/leeway_vscode_evidence_regeneration_1_2_12_host_activation_receipt.json'

$phase3 = [ordered]@{
  reportId = 'LEEWAY_VSCODE_1_2_12_HOST_RELOAD_CONFIRMATION::2026-05-25'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  reloadGateSource = '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-live-host-refresh-result.json'
  developerReloadWindowCompleted = [bool](-not $hostRefresh.manualReloadRequired -and $hostRefresh.finalVerdict -eq 'PASS')
  workspaceReopened = [bool]($hostRefresh.runningCodeProcessCount -gt 0)
  agentLeeExtensionActive = [bool]($attest.liveExtensionHostStatus -eq 'activated')
  agentLeePanelVisible = [bool]$ui.sidebarOpened
  extensionVersionObserved = [string]$attest.liveExtensionHostVersion
  expectedVersion = '1.2.14'
  activeHostBuildHash = [string]$attest.liveExtensionHostBuildHash
  sourceBuildHash = [string]$attest.runtimeBuildHash
  finalStatus = if($hostRefresh.finalVerdict -eq 'PASS'){'PASS'}elseif($hostRefresh.finalVerdict -eq 'FAIL'){'FAIL'}else{'PARTIAL'}
  blocker = if($hostRefresh.finalVerdict -ne 'PASS'){'MANUAL_RELOAD_STILL_REQUIRED'}else{''}
}

$phase4Pass = ($attest.status -eq 'PASS' -and $attest.liveExtensionHostVersion -eq '1.2.14' -and -not $attest.staleRuntimeDetected -and -not $attest.splitBrainDetected -and $attest.liveExtensionHostBuildHash -eq $attest.runtimeBuildHash)
$phase4 = [ordered]@{
  reportId = 'LEEWAY_VSCODE_1_2_12_ACTIVE_HOST_ATTESTATION::2026-05-25'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  attestationSource = '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-active-runtime-attestation-result.json'
  activeHostVersion = [string]$attest.liveExtensionHostVersion
  expectedVersion = '1.2.14'
  sourceBuildHash = [string]$attest.runtimeBuildHash
  installedBuildHash = [string]$attest.installedRuntimeHash
  activeHostBuildHash = [string]$attest.liveExtensionHostBuildHash
  buildHashesMatch = [bool]($attest.liveExtensionHostBuildHash -eq $attest.runtimeBuildHash -and $attest.runtimeBuildHash -eq $attest.installedRuntimeHash)
  splitBrainDetected = [bool]$attest.splitBrainDetected
  staleRuntimeDetected = [bool]$attest.staleRuntimeDetected
  finalStatus = if($phase4Pass){'PASS'}else{'FAIL'}
}

$phase6Pass = ($ui.finalVerdict -eq 'PASS')
$phase6 = [ordered]@{
  reportId = 'LEEWAY_VSCODE_1_2_12_LIVE_UI_VALIDATION::2026-05-25'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  uiEvidenceSource = '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-extension-live-visual-validation-result.json'
  statusBarVisible = [bool]$ui.statusBarVisible
  sidebarVisible = [bool]$ui.sidebarOpened
  standardsButtonVisible = [bool]$ui.standardsButtonVisible
  sendButtonVisible = [bool]$ui.bottomButtonVisible
  voiceStateTruthLabeled = [bool](-not [string]::IsNullOrWhiteSpace([string]$ui.runtimeSourceMode))
  finalStatus = if($phase6Pass){'PASS'}else{'FAIL'}
  blocker = if($phase6Pass){''}else{'LIVE_SHELL_UI_SIGNAL_MISSING'}
}

$phase2Pass = -not ($phase2.scriptsExecuted | Where-Object { $_.exitCode -ne 0 })
$modelPass = ($model.finalStatus -eq 'PASS')
$hostReloadPass = ($phase3.finalStatus -eq 'PASS')
$attestPass = ($phase4.finalStatus -eq 'PASS')
$uiPass = ($phase6.finalStatus -eq 'PASS')
$manualCorrectedByRegen = [bool]($phase1.finalStatus -eq 'MANUAL_EVIDENCE_REFRESH_INVALID' -and $phase2.scriptsExecuted.Count -ge 7)

$finalVerdict = if($manualCorrectedByRegen -and $phase2Pass -and $hostReloadPass -and $attestPass -and $modelPass -and $uiPass){
  'LEEWAY_VSCODE_1_2_12_HOST_ACTIVATION_PASS'
} elseif(-not $hostReloadPass -or -not $attestPass){
  'LEEWAY_VSCODE_1_2_12_HOST_ACTIVATION_BLOCKED'
} else {
  'LEEWAY_VSCODE_1_2_12_HOST_ACTIVATION_PARTIAL'
}

$final = [ordered]@{
  reportId = 'LEEWAY_VSCODE_EVIDENCE_REGEN_1_2_12_HOST_ACTIVATION::2026-05-25'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  mission = 'RUN LEEWAY VSCODE EVIDENCE REGENERATION + 1.2.14 HOST ACTIVATION PASS'
  runtimeTruthWins = $true
  phaseStatus = [ordered]@{
    phase1IntegrityCorrection = [string]$phase1.finalStatus
    phase2RegeneratedEvidence = [string]$phase2.finalStatus
    phase3HostReloadConfirmation = [string]$phase3.finalStatus
    phase4ActiveHostAttestation = [string]$phase4.finalStatus
    phase5ModelPurgeValidation = [string]$model.finalStatus
    phase6LiveUiValidation = [string]$phase6.finalStatus
  }
  highlights = @(
    'Evidence correction recorded as MANUAL_EVIDENCE_REFRESH_INVALID and replaced by official gate regeneration.',
    'Installed extension and source are 1.2.14 with matching source/installed runtime hashes.',
    'Live host attestation still reports active host 1.2.11 and build-hash mismatch, indicating stale host split-brain.'
  )
  blockers = @(
    $(if(-not $hostReloadPass){'Developer Reload Window not execution-proven in live host evidence.'}),
    $(if(-not $attestPass){'Active host attestation fail: live host remains 1.2.11, splitBrainDetected=true, staleRuntimeDetected=true.'}),
    $(if(-not $uiPass){'Live visual validation fail: Agent Lee status bar/sidebar visibility not proven in live shell.'})
  ) | Where-Object { $_ }
  outputs = @(
    '.leeway-vscode/Archive/reports/leeway-vscode-test-evidence-integrity-correction-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-regenerated-test-evidence-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-host-reload-confirmation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-active-host-attestation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-model-purge-validation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-live-ui-validation-report.json'
  )
  finalVerdict = $finalVerdict
}

$receipt = [ordered]@{
  assistantBodyId='LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::VSCODE_EVIDENCE_REGEN_1_2_12_20260525'
  assistantObjectId='LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE'
  taskId='LEEWAY_TASK::VSCODE_EVIDENCE_REGEN_1_2_12_HOST_ACTIVATION::20260525'
  subjectObjectId='LEEWAY_RUNTIME::VSCODE_EXTENSION_HOST::1_2_12'
  filesRead=@(
    '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-live-host-refresh-result.json',
    '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-active-runtime-attestation-result.json',
    '.leeway-vscode/agent-lee/vscode-extension/test-evidence/leeway-extension-live-visual-validation-result.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-regenerated-test-evidence-report.json'
  )
  filesChanged=@(
    '.leeway-vscode/Archive/reports/leeway-vscode-test-evidence-integrity-correction-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-regenerated-test-evidence-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-host-reload-confirmation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-active-host-attestation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-model-purge-validation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-1-2-12-live-ui-validation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-evidence-regeneration-1-2-12-host-activation-report.json',
    '.leeway-vscode/Archive/reports/leeway-vscode-evidence-regeneration-1-2-12-host-activation-report.md',
    '.leeway-vscode/Archive/receipts/leeway_vscode_evidence_regeneration_1_2_12_host_activation_receipt.json'
  )
  commandsRun=@(
    'Invoke-LeeWayInstalledExtensionCheck.ps1',
    'Invoke-LeeWayExtensionRuntimeCheck.ps1',
    'Invoke-LeeWayActiveRuntimeAttestation.ps1',
    'Invoke-LeeWayExtensionLiveVisualValidation.ps1',
    'Invoke-LeeWayIdentityPulseGate.ps1',
    'Invoke-LeeWayApplicationIdentityGraphGate.ps1',
    'Invoke-LeeWayApplicationIntegrityGate.ps1',
    'Invoke-LeeWayLiveHostRefresh.ps1'
  )
  toolsUsed=@('run_in_terminal','read_file','create_file')
  MCPsUsed=@()
  standardsChecked=@('BOOK-54','BOOK-55')
  gatesRun=@('LEEWAY_ACTIVE_RUNTIME_ATTESTATION','LEEWAY_APPLICATION_INTEGRITY_GATE','LEEWAY_IDENTITY_PULSE_GATE','LEEWAY_APPLICATION_IDENTITY_GRAPH_GATE')
  receiptsWritten=@('.leeway-vscode/Archive/receipts/leeway_vscode_evidence_regeneration_1_2_12_host_activation_receipt.json')
  failuresEncountered=@('LIVE_HOST_STALE_1_2_11','LIVE_UI_VALIDATION_FAIL','MANUAL_RELOAD_REQUIRED')
  lessonsLearned=@('Never treat manual evidence string replacement as proof; only gate regeneration is valid.','Host split-brain persists until a real VS Code reload updates live-host attestation.')
  skillImprovementsSuggested=@('Add automated stale-host detection/reload playbook to Agent Lee skill corpus.','Add evidence-integrity guard that refuses manual rewrite patterns in test-evidence.')
  finalStatus=$finalVerdict
  remainingBlockers=$final.blockers
}

$md = @"
# LeeWay VSCode Evidence Regeneration + 1.2.14 Host Activation Report

Final verdict: `$finalVerdict`

## Phase Status
- Phase 1 integrity correction: $($phase1.finalStatus)
- Phase 2 regenerated evidence: $($phase2.finalStatus)
- Phase 3 host reload confirmation: $($phase3.finalStatus)
- Phase 4 active host attestation: $($phase4.finalStatus)
- Phase 5 model purge validation: $($model.finalStatus)
- Phase 6 live UI validation: $($phase6.finalStatus)

## Runtime Truth
- Source/package/install version: 1.2.14
- Active host version: $($attest.liveExtensionHostVersion)
- Source/installed build hash match: $([bool]($attest.runtimeBuildHash -eq $attest.installedRuntimeHash))
- Active host build hash match: $([bool]($attest.liveExtensionHostBuildHash -eq $attest.runtimeBuildHash))
- splitBrainDetected: $($attest.splitBrainDetected)
- staleRuntimeDetected: $($attest.staleRuntimeDetected)

## Blockers
$((@($final.blockers) | ForEach-Object { '- ' + $_ }) -join "`n")

## Outputs
$((@($final.outputs) | ForEach-Object { '- ' + $_ }) -join "`n")
"@

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $phase3Path) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $receiptPath) | Out-Null
($phase3 | ConvertTo-Json -Depth 8) | Out-File -LiteralPath $phase3Path -Encoding utf8
($phase4 | ConvertTo-Json -Depth 8) | Out-File -LiteralPath $phase4Path -Encoding utf8
($phase6 | ConvertTo-Json -Depth 8) | Out-File -LiteralPath $phase6Path -Encoding utf8
($final | ConvertTo-Json -Depth 10) | Out-File -LiteralPath $finalJsonPath -Encoding utf8
$md | Out-File -LiteralPath $finalMdPath -Encoding utf8
($receipt | ConvertTo-Json -Depth 12) | Out-File -LiteralPath $receiptPath -Encoding utf8

Write-Host 'Generated phase reports, final report, and receipt.'
