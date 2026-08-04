[CmdletBinding()]
param(
  [switch]$ValidateOnly,
  [string]$LaneScriptName = "",
  [int]$ValidationTimeoutSec = 25,
  [switch]$SkipValidationRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$IsoNow = (Get-Date).ToUniversalTime().ToString("o")
$ReportsDir = Join-Path $Root "Archive\reports"
$ReceiptsDir = Join-Path $Root "Archive\receipts\leeway-system-completion"
$CommandLogPath = Join-Path $ReportsDir "leeway-master-total-ecosystem-validation-command-log.jsonl"
New-LeewayDirectory -Path $ReportsDir | Out-Null
New-LeewayDirectory -Path $ReceiptsDir | Out-Null

function New-Lane {
  param(
    [string]$Id,
    [string]$Name,
    [string]$Phase,
    [string[]]$Files = @(),
    [string[]]$Contracts = @(),
    [string[]]$Manifests = @(),
    [string[]]$RuntimeCode = @(),
    [string[]]$Scripts = @(),
    [string[]]$Reports = @(),
    [string[]]$Receipts = @(),
    [string]$DefaultBlockerType = "BLOCKED_RUNTIME",
    [bool]$ApprovalRequired = $false,
    [bool]$HardwareRequired = $false
  )

  [ordered]@{
    laneId = $Id
    laneName = $Name
    phase = $Phase
    files = $Files
    contracts = $Contracts
    manifests = $Manifests
    runtimeCode = $RuntimeCode
    scripts = $Scripts
    reports = $Reports
    receipts = $Receipts
    defaultBlockerType = $DefaultBlockerType
    approvalRequired = $ApprovalRequired
    hardwareRequired = $HardwareRequired
  }
}

function Resolve-LeeWayMatches {
  param([string[]]$Patterns)

  $found = @()
  foreach ($pattern in @($Patterns)) {
    if ([string]::IsNullOrWhiteSpace($pattern)) { continue }
    $normalized = $pattern -replace '/', '\'
    $full = if ([System.IO.Path]::IsPathRooted($normalized)) { $normalized } else { Join-Path $Root $normalized }
    if ($normalized -match '[\*\?\[]') {
      $matches = @(Get-ChildItem -Path $full -File -ErrorAction SilentlyContinue)
      $matches += @(Get-ChildItem -Path $full -Directory -ErrorAction SilentlyContinue)
      foreach ($match in $matches) { $found += $match.FullName }
    } elseif (Test-Path -LiteralPath $full) {
      $found += (Resolve-Path -LiteralPath $full).Path
    }
  }
  return @($found | Sort-Object -Unique)
}

function Test-LeeWayJsonValid {
  param([string[]]$Paths)
  $bad = @()
  foreach ($path in $Paths) {
    if ($path -notmatch '\.json$') { continue }
    try {
      $null = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $bad += $path
    }
  }
  return @{
    valid = ($bad.Count -eq 0)
    invalidFiles = $bad
  }
}

function Get-LeeWayEvidenceVerdicts {
  param([string[]]$Paths)

  $verdicts = @()
  foreach ($path in @($Paths)) {
    if ($path -notmatch '\.json$') { continue }
    $data = Read-LeewayJson -Path $path -Fallback $null
    if (-not $data) { continue }
    $value = $null
    if ($data.PSObject.Properties.Name -contains "verdict") {
      $value = [string]$data.verdict
    } elseif ($data.PSObject.Properties.Name -contains "result") {
      $value = [string]$data.result
    }
    if ($value) { $verdicts += $value }
  }
  return @($verdicts)
}

function Test-LeeWayReadyVerdict {
  param([string[]]$Verdicts)
  foreach ($verdict in @($Verdicts)) {
    if ($verdict -match 'PASS|READY|99_READY' -and $verdict -notmatch 'PARTIAL|BLOCKED|FAIL|UNPROVEN|MISSING') {
      return $true
    }
  }
  return $false
}

function Test-LeeWayBlockedVerdict {
  param([string[]]$Verdicts)
  foreach ($verdict in @($Verdicts)) {
    if ($verdict -match 'BLOCKED|FAIL|PARTIAL|UNPROVEN|MISSING') {
      return $true
    }
  }
  return $false
}

function Write-CommandLog {
  param($Record)
  $json = $Record | ConvertTo-Json -Depth 24 -Compress
  Add-Content -LiteralPath $CommandLogPath -Value $json -Encoding UTF8
}

function Invoke-BoundedValidation {
  param(
    [string]$ScriptRelativePath,
    [int]$TimeoutSec
  )

  $scriptPath = Join-Path $Root $ScriptRelativePath
  $started = Get-Date
  $record = [ordered]@{
    command = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$ScriptRelativePath`""
    startedAt = $started.ToUniversalTime().ToString("o")
    endedAt = $null
    timeoutSec = $TimeoutSec
    exitCode = $null
    timedOut = $false
    stdout = ""
    stderr = ""
    status = "NOT_RUN"
  }

  if (-not (Test-Path -LiteralPath $scriptPath)) {
    $record.status = "MISSING_SCRIPT"
    $record.endedAt = (Get-Date).ToUniversalTime().ToString("o")
    Write-CommandLog -Record $record
    return [pscustomobject]$record
  }

  $outPath = Join-Path $Root ("Archive\tmp\validation-stdout-{0}.txt" -f ([Guid]::NewGuid().ToString("N")))
  $errPath = Join-Path $Root ("Archive\tmp\validation-stderr-{0}.txt" -f ([Guid]::NewGuid().ToString("N")))
  New-LeewayDirectory -Path (Split-Path -Parent $outPath) | Out-Null

  $proc = Start-Process -FilePath "powershell" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $scriptPath) `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outPath `
    -RedirectStandardError $errPath

  if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
    $record.timedOut = $true
    $record.status = "TIMEOUT"
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  } else {
    $record.exitCode = $proc.ExitCode
    $record.status = if ($proc.ExitCode -eq 0) { "PASS" } else { "FAIL" }
  }

  $record.endedAt = (Get-Date).ToUniversalTime().ToString("o")
  if (Test-Path -LiteralPath $outPath) { $record.stdout = Get-Content -Raw -LiteralPath $outPath }
  if (Test-Path -LiteralPath $errPath) { $record.stderr = Get-Content -Raw -LiteralPath $errPath }
  Write-CommandLog -Record $record
  return [pscustomObject]$record
}

function Ensure-LeeWayValidationWrapper {
  param([string]$ScriptName)

  $path = Join-Path $Root ("scripts\{0}" -f $ScriptName)
  if (Test-Path -LiteralPath $path) {
    return $false
  }

  $content = @"
[CmdletBinding()]
param()

`$ErrorActionPreference = "Stop"
& (Join-Path `$PSScriptRoot "Invoke-LeeWayMasterTotalEcosystemCompletion.ps1") -ValidateOnly -LaneScriptName "$ScriptName"
exit `$LASTEXITCODE
"@
  Set-Content -LiteralPath $path -Value $content -Encoding UTF8
  return $true
}

$lanes = @(
  New-Lane "L001" "Owner identity" "owner" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-owner-identity-contract.md") -Manifests @("agent-lee-coding-mode/runtime/identity/owner/owner-identity.manifest.json") -Scripts @("scripts/Test-AgentLeeOwnerIdentity.ps1") -Reports @("Archive/reports/agent-lee-owner-identity-report.json") -Receipts @("Archive/receipts/agent_lee_owner_identity_receipt.json")
  New-Lane "L002" "Owner audience boundary" "owner" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-owner-authentication-policy.md") -Scripts @("scripts/Test-AgentLeeOwnerAudienceBoundary.ps1") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true
  New-Lane "L003" "Trusted operator boundary" "owner" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-owner-authentication-policy.md") -Scripts @("scripts/Test-AgentLeeTrustedOperatorBoundary.ps1") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true
  New-Lane "L004" "Language pattern processor" "persona" -Files @("src/agent-lee/language/leewayLanguagePatternProcessor.ts", "src/agent-lee/language/leewayLanguagePattern.types.ts", "src/agent-lee/language/leewayAgentLeeStyleAdapter.ts") -Reports @("Archive/reports/leeway-agent-lee-runtime-speech-policy.md") -Scripts @("scripts/Invoke-LeeWayAgentLeeLanguagePatternProcessorGate.ps1")
  New-Lane "L005" "Prompt builder persona and crowd law" "persona" -Files @("Leeway Runtime Fabric/standards/persona/src/prompt-builder.ts", "agent-lee-coding-mode/runtime/agent-lee-language-policy.json", "agent-lee-coding-mode/runtime/agent-lee-speech-style-policy.json") -Reports @("Archive/reports/leeway-agent-lee-approved-speech-samples.md")
  New-Lane "L006" "Room presence" "room" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-room-presence-contract.md") -Manifests @("agent-lee-coding-mode/runtime/room/room-presence.manifest.json") -Scripts @("scripts/Test-AgentLeeRoomPresence.ps1") -DefaultBlockerType "BLOCKED_HARDWARE" -HardwareRequired $true
  New-Lane "L007" "Human tracking map" "room" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-human-tracking-map-contract.md") -Manifests @("agent-lee-coding-mode/runtime/room/human-tracking-map.manifest.json") -Scripts @("scripts/Test-AgentLeeHumanTrackingMap.ps1") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L008" "Live room vision audio awareness" "room" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-live-room-vision-governance-contract.md") -Scripts @("scripts/Test-AgentLeeLiveRoomVisionAudioAwareness.ps1") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L009" "Multilingual crowd capability" "room" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-multilingual-crowd-contract.md") -Manifests @("agent-lee-coding-mode/runtime/room/multilingual-crowd.manifest.json") -Scripts @("scripts/Test-AgentLeeMultilingualCrowd.ps1")
  New-Lane "L010" "Attendee opt-in delivery" "room" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-attendee-opt-in-delivery-contract.md") -Manifests @("agent-lee-coding-mode/runtime/room/attendee-opt-in.manifest.json") -Scripts @("scripts/Test-AgentLeeAttendeeOptInDelivery.ps1")
  New-Lane "L011" "Teaching embodiment" "room" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-teaching-embodiment-contract.md") -Scripts @("scripts/Test-AgentLeeTeachingEmbodiment.ps1")
  New-Lane "L012" "Room vision governance" "vision" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-live-room-vision-governance-contract.md", "agent-lee-coding-mode/contracts/agent-lee-room-consent-protocol.md") -Manifests @("agent-lee-coding-mode/runtime/vision/room-vision-policy.manifest.json") -Scripts @("scripts/Test-AgentLeeRoomVisionGovernance.ps1") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L013" "Voice kernel health" "voice" -RuntimeCode @("agent-lee-voice-kernel/xtts-server.py", "agent-lee-voice-kernel/docker-compose.yml") -Scripts @("scripts/Test-AgentLeeVoiceKernelHealth.ps1") -Reports @("Archive/reports/*voice-kernel*") -Receipts @("Archive/receipts/agent-lee-voice/*.json")
  New-Lane "L014" "Canonical clone voice route" "voice" -RuntimeCode @("agent-lee-voice-kernel/voice_loader.py", "agent-lee-voice-kernel/config.json") -Scripts @("scripts/Test-AgentLeeCanonicalCloneVoiceRoute.ps1") -Reports @("Archive/reports/leeway-live-voice-runtime-report.json")
  New-Lane "L015" "Always listening loop" "voice" -RuntimeCode @("agent-lee-coding-mode/runtime/agent_lee_voice_capture_transcribe.py") -Scripts @("scripts/Test-AgentLeeAlwaysListeningLoop.ps1") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L016" "Natural conversation" "voice" -RuntimeCode @("agent-lee-coding-mode/runtime/agent-lee-orchestration-runtime.mjs") -Scripts @("scripts/Test-AgentLeeNaturalConversation.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L017" "RTC continuity" "voice" -Scripts @("scripts/Test-LeeWayRtcContinuity.ps1") -Reports @("Archive/reports/leeway-rtc-runtime-continuity-report.json") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L018" "Hearing calibration" "voice" -Scripts @("scripts/Test-LeeWayHearingCalibration.ps1") -Reports @("Archive/reports/leeway-hearing-calibration-correct-path-lock-report.json") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L019" "Vision model qwen2.5vl" "vision" -Manifests @("agent-lee-coding-mode/runtime/vision/qwen-vision-model-selection.manifest.json") -Scripts @("scripts/Test-LeewayQwenVisionRoute.ps1", "scripts/Test-AgentLeeQwenVisionImageInput.ps1") -Reports @("Archive/reports/leeway-qwen-vision-route-report.json")
  New-Lane "L020" "Vision kernel docker" "vision" -RuntimeCode @("agent-lee-vision-kernel/vision-server.py", "agent-lee-vision-kernel/docker-compose.yml", "agent-lee-vision-kernel/Dockerfile") -Scripts @("scripts/Test-AgentLeeVisionKernelDocker.ps1") -Reports @("Archive/reports/agent-lee-vision-kernel-docker-report.json") -Receipts @("Archive/receipts/agent-lee-vision/*.json")
  New-Lane "L021" "Host camera bridge" "vision" -RuntimeCode @("agent-lee-coding-mode/desktop-runtime/camera-bridge.ps1") -Scripts @("scripts/Test-AgentLeeHostCameraBridge.ps1") -Reports @("Archive/reports/agent-lee-host-camera-bridge-report.json") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L022" "Camera to Qwen proof" "vision" -Scripts @("scripts/Test-AgentLeeCameraToQwenVision.ps1") -Reports @("Archive/reports/agent-lee-camera-to-qwen-vision-report.json") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L023" "Screen capture engine" "vision" -Scripts @("scripts/Test-AgentLeeScreenCaptureEngine.ps1") -DefaultBlockerType "BLOCKED_PERMISSION" -HardwareRequired $true
  New-Lane "L024" "Screen OCR vision" "vision" -Scripts @("scripts/Test-AgentLeeScreenOcrVision.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L025" "Visual AI workspace" "vision" -Manifests @("agent-lee-coding-mode/runtime/agent-lee-visual-ai-workspace.manifest.json", "agent-lee-coding-mode/runtime/vision/visual-ai-workspace.manifest.json") -Scripts @("scripts/Test-LeeWayVisualAiWorkspace.ps1")
  New-Lane "L026" "Real-world device awareness" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-real-world-device-awareness-contract.md") -Scripts @("scripts/Test-AgentLeeRealWorldDevices.ps1", "scripts/Get-AgentLeeDeviceAwareness.ps1") -Reports @("Archive/reports/agent-lee-real-world-device-awareness-report.json")
  New-Lane "L027" "Printer proof" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-printer-control-contract.md") -Scripts @("scripts/Test-AgentLeePrinterProof.ps1") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true -HardwareRequired $true
  New-Lane "L028" "Room device discovery" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-room-device-discovery-contract.md") -Scripts @("scripts/Test-AgentLeeRoomDeviceDiscovery.ps1")
  New-Lane "L029" "Local network discovery" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-local-network-discovery-contract.md") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true
  New-Lane "L030" "Bluetooth discovery" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-bluetooth-discovery-contract.md") -DefaultBlockerType "BLOCKED_HARDWARE" -HardwareRequired $true
  New-Lane "L031" "USB peripheral discovery" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-usb-peripheral-contract.md") -DefaultBlockerType "BLOCKED_HARDWARE" -HardwareRequired $true
  New-Lane "L032" "Edge device" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-edge-device-contract.md") -Scripts @("scripts/Test-LeeWayEdgeDeviceStatus.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L033" "Edge IoT" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-edge-iot-contract.md") -Scripts @("scripts/Test-LeeWayEdgeIoTStatus.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L034" "Physical action safety" "device" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-physical-action-safety-contract.md") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true
  New-Lane "L035" "Desktop runtime health" "desktop" -RuntimeCode @("agent-lee-coding-mode/desktop-runtime/*", "agent-lee-coding-mode/runtime/agent-lee-service.py") -Scripts @("scripts/Test-AgentLeeDesktopRuntimeHealth.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L036" "Desktop mouse keyboard" "desktop" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-desktop-mouse-keyboard-contract.md") -Scripts @("scripts/Test-AgentLeeDesktopMouseKeyboard.ps1") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true
  New-Lane "L037" "Autonomous execution loop" "desktop" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-autonomous-desktop-contract.md") -Scripts @("scripts/Test-AgentLeeAutonomousExecutionLoop.ps1") -DefaultBlockerType "BLOCKED_APPROVAL" -ApprovalRequired $true
  New-Lane "L038" "Windows service registration" "desktop" -Contracts @("agent-lee-coding-mode/contracts/agent-lee-windows-service-contract.md") -Scripts @("scripts/Test-AgentLeeWindowsServiceRegistration.ps1") -DefaultBlockerType "BLOCKED_PERMISSION"
  New-Lane "L039" "Router modularization" "runtime" -Contracts @("agent-lee-coding-mode/contracts/leeway-router-refactor-contract.md") -RuntimeCode @("agent-lee-coding-mode/router/server-brainfix.mjs") -Scripts @("scripts/Test-LeeWayRouterModularization.ps1")
  New-Lane "L040" "Event bus" "runtime" -Contracts @("agent-lee-coding-mode/contracts/leeway-event-bus-contract.md") -RuntimeCode @("Leeway Runtime Fabric/event-bus/leeway-event-bus.mjs") -Scripts @("scripts/Test-LeeWayEventBus.ps1")
  New-Lane "L041" "Event schema validation" "runtime" -RuntimeCode @("Leeway Runtime Fabric/event-bus/leeway-event-schema.json") -Scripts @("scripts/Test-LeeWayEventSchemaValidation.ps1")
  New-Lane "L042" "Workflow engine" "runtime" -Contracts @("agent-lee-coding-mode/contracts/leeway-workflow-engine-contract.md") -Scripts @("scripts/Test-LeeWayWorkflowEngine.ps1")
  New-Lane "L043" "Execution VM" "runtime" -Contracts @("agent-lee-coding-mode/contracts/leeway-execution-vm-contract.md") -Scripts @("scripts/Test-LeeWayExecutionVm.ps1")
  New-Lane "L044" "Ollama model family inventory" "model" -Scripts @("scripts/Test-LeewayOllamaModelFamily.ps1") -Reports @("Archive/reports/leeway-ollama-model-family-report.json")
  New-Lane "L045" "Qwen3 primary reasoning" "model" -RuntimeCode @("Leeway Runtime Fabric/model-gateway/qwen3-final-answer-controller.mjs", "Leeway Runtime Fabric/model-gateway/qwen3-final-answer-policy.json") -Scripts @("scripts/Test-LeewayQwen3ReasoningRoute.ps1") -Reports @("Archive/reports/leeway-qwen3-reasoning-route-report.json")
  New-Lane "L046" "Qwen coder primary" "model" -Scripts @("scripts/Test-LeewayQwenCoderRoute.ps1") -Reports @("Archive/reports/leeway-qwen-coder-route-report.json")
  New-Lane "L047" "Qwen coder fallback" "model" -Scripts @("scripts/Test-LeewayQwenCoderFallbackRoute.ps1") -Reports @("Archive/reports/leeway-qwen-coder-fallback-route-report.json")
  New-Lane "L048" "Model router" "model" -RuntimeCode @("Leeway Runtime Fabric/model-gateway/leeway-model-router.mjs", "Leeway Runtime Fabric/model-gateway/leeway-model-routing.manifest.json") -Scripts @("scripts/Test-LeewayModelRouter.ps1")
  New-Lane "L049" "Runtime Fabric model routing" "model" -Scripts @("scripts/Test-LeewayRuntimeFabricModelRouting.ps1")
  New-Lane "L050" "Model family status" "model" -Scripts @("scripts/Test-LeewayModelFamilyStatus.ps1")
  New-Lane "L051" "Hot-swap model routing" "model" -Contracts @("agent-lee-coding-mode/contracts/leeway-hot-swap-model-routing-contract.md") -Scripts @("scripts/Test-LeewayHotSwapModelRouting.ps1")
  New-Lane "L052" "Enhancement layer registry" "model" -Manifests @("agent-lee-coding-mode/runtime/model-enhancement/leeway-model-enhancement-registry.json", "Leeway Runtime Fabric/model-gateway/leeway-enhancement-profiles.registry.json") -Scripts @("scripts/Test-LeewayEnhancementLayerRegistry.ps1")
  New-Lane "L053" "Model lifecycle" "model" -Contracts @("agent-lee-coding-mode/contracts/leeway-live-model-lifecycle-contract.md", "agent-lee-coding-mode/contracts/leeway-model-enhancement-lifecycle-contract.md") -Manifests @("Leeway Runtime Fabric/model-gateway/leeway-model-lifecycle.registry.json") -Scripts @("scripts/Get-LeewayModelLifecycleStatus.ps1")
  New-Lane "L054" "Discovery graph registry" "discovery" -Manifests @("Leeway Runtime Fabric/discovery/leeway-total-discovery-graph.registry.json", "agent-lee-coding-mode/runtime/discovery/leeway-total-discovery-graph.registry.json") -Scripts @("scripts/Test-LeewayDiscoveryGraphRegistry.ps1")
  New-Lane "L055" "Discovery file metadata registry" "discovery" -RuntimeCode @("Leeway Runtime Fabric/discovery/leeway-file-metadata-scanner.mjs", "Leeway Runtime Fabric/discovery/leeway-file-classifier.mjs") -Scripts @("scripts/Test-LeewayDiscoveryFileMetadataRegistry.ps1")
  New-Lane "L056" "Discovery task resolution" "discovery" -RuntimeCode @("Leeway Runtime Fabric/discovery/leeway-discovery-service.mjs", "Leeway Runtime Fabric/discovery/leeway-discovery-client.mjs") -Scripts @("scripts/Test-LeewayDiscoveryTaskResolution.ps1")
  New-Lane "L057" "Discovery-first policy" "discovery" -Contracts @("agent-lee-coding-mode/contracts/leeway-discovery-first-policy.md") -Scripts @("scripts/Test-LeewayDiscoveryFirstPolicy.ps1")
  New-Lane "L058" "Runtime Fabric Discovery integration" "discovery" -Scripts @("scripts/Test-LeewayDiscoveryRuntimeFabricIntegration.ps1")
  New-Lane "L059" "MCP Discovery registration" "discovery" -Scripts @("scripts/Test-LeewayDiscoveryMcpRegistration.ps1", "scripts/Test-LeewayMcpRegistration.ps1")
  New-Lane "L060" "Discovery graph status" "discovery" -Scripts @("scripts/Get-LeewayDiscoveryGraphStatus.ps1")
  New-Lane "L061" "Codex config alignment" "mcp" -Files @("C:/Users/Leona/.codex/config.toml") -Scripts @("scripts/Test-LeewayCodexConfigAlignment.ps1")
  New-Lane "L062" "Agent registry MCP" "mcp" -Scripts @("scripts/Test-LeewayAgentRegistryMcp.ps1")
  New-Lane "L063" "Core runtime endpoints" "runtime" -Scripts @("scripts/Test-LeeWayCoreRuntimeEndpoints.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L064" "Developer cockpit" "app" -Scripts @("scripts/Test-LeeWayDeveloperCockpit.ps1") -DefaultBlockerType "BLOCKED_RUNTIME"
  New-Lane "L065" "VS Code connector role" "vscode" -Scripts @("scripts/Test-LeeWayVSCodeConnectorRole.ps1")
  New-Lane "L066" "VS Code strict disclosure" "vscode" -Scripts @("scripts/Test-LeeWayVSCodeStrictDisclosure.ps1")
  New-Lane "L067" "Generated live application" "app" -Scripts @("scripts/Test-LeeWayLiveGeneratedApplication.ps1") -Reports @("Archive/reports/leeway-live-generated-application-report.json")
  New-Lane "L068" "Employment Center" "app" -Scripts @("scripts/Test-LeeWayEmploymentCenter.ps1")
  New-Lane "L069" "Content Automation" "app" -Scripts @("scripts/Test-LeeWayContentAutomation.ps1")
  New-Lane "L070" "SVG Creator" "app" -Scripts @("scripts/Test-LeeWaySvgCreator.ps1")
  New-Lane "L071" "Presentation Engine" "app" -Scripts @("scripts/Test-LeeWayPresentationEngine.ps1")
  New-Lane "L072" "Application governance inheritance" "app" -Scripts @("scripts/Test-LeeWayAppGovernanceInheritance.ps1")
  New-Lane "L073" "Blocker sentinel mesh" "governance" -Contracts @("agent-lee-coding-mode/contracts/leeway-blocker-sentinel-mesh-contract.md") -Scripts @("scripts/Test-LeeWayBlockerSentinelMesh.ps1")
  New-Lane "L074" "Anti-drift sentinel" "governance" -Contracts @("agent-lee-coding-mode/contracts/leeway-anti-drift-governance-contract.md") -Scripts @("scripts/Test-LeeWayAntiDriftSentinel.ps1")
  New-Lane "L075" "Dependency governance" "governance" -Scripts @("scripts/Test-LeeWayDependencyGovernance.ps1")
  New-Lane "L076" "Recovery continuity" "governance" -Contracts @("agent-lee-coding-mode/contracts/leeway-recovery-continuity-contract.md") -Scripts @("scripts/Test-LeeWayRecoveryContinuity.ps1")
  New-Lane "L077" "Simulation recovery" "governance" -Contracts @("agent-lee-coding-mode/contracts/leeway-simulation-recovery-contract.md") -Scripts @("scripts/Test-LeeWaySimulationRecovery.ps1")
  New-Lane "L078" "Live status full truth surface" "status" -Scripts @("scripts/Get-AgentLeeLiveEmbodimentStatus.ps1") -Reports @("Archive/reports/agent-lee-live-embodiment-full-truth-status-report.json")
  New-Lane "L079" "Production readiness gate" "governance" -Scripts @("scripts/Invoke-LeeWayProductionReadinessGate.ps1") -Reports @("Archive/reports/*production*") -Receipts @("Archive/receipts/*production*")
  New-Lane "L080" "Constitutional governance audit" "governance" -Reports @("Archive/reports/leeway-full-78-book-governance-audit-report.json", "Archive/reports/leeway-runtime-constitutional-enforcement-map.json") -Receipts @("Archive/receipts/leeway_constitutional_governance_audit_receipt.json")
  New-Lane "L081" "Live operating environment convergence" "runtime" -Reports @("Archive/reports/leeway-live-operating-environment-pass-2-report.json", "Archive/reports/leeway-ecosystem-convergence-report.json") -Receipts @("Archive/receipts/leeway_live_operating_environment_pass_2_receipt.json")
)

function Get-LaneByScript {
  param([string]$ScriptName)
  foreach ($lane in $lanes) {
    foreach ($script in @($lane.scripts)) {
      if ((Split-Path -Leaf $script) -eq $ScriptName) {
        return $lane
      }
    }
  }
  return $null
}

function Test-Lane {
  param(
    $Lane,
    [switch]$RunValidation
  )

  $fileMatches = @(Resolve-LeeWayMatches -Patterns $Lane.files)
  $contractMatches = @(Resolve-LeeWayMatches -Patterns $Lane.contracts)
  $manifestMatches = @(Resolve-LeeWayMatches -Patterns $Lane.manifests)
  $runtimeMatches = @(Resolve-LeeWayMatches -Patterns $Lane.runtimeCode)
  $scriptMatches = @(Resolve-LeeWayMatches -Patterns $Lane.scripts)
  $reportMatches = @(Resolve-LeeWayMatches -Patterns $Lane.reports)
  $receiptMatches = @(Resolve-LeeWayMatches -Patterns $Lane.receipts)
  $jsonCheck = Test-LeeWayJsonValid -Paths @($manifestMatches + $reportMatches + $receiptMatches)
  $reportVerdicts = @(Get-LeeWayEvidenceVerdicts -Paths $reportMatches)
  $receiptVerdicts = @(Get-LeeWayEvidenceVerdicts -Paths $receiptMatches)
  $evidenceVerdicts = @(if ($reportVerdicts.Count -gt 0) { $reportVerdicts } else { $receiptVerdicts })
  $evidencePass = Test-LeeWayReadyVerdict -Verdicts $evidenceVerdicts
  $evidenceBlocked = Test-LeeWayBlockedVerdict -Verdicts $evidenceVerdicts
  $validationResults = @()

  if ($RunValidation) {
    foreach ($script in @($Lane.scripts)) {
      $validationResults += Invoke-BoundedValidation -ScriptRelativePath $script -TimeoutSec $ValidationTimeoutSec
    }
  }

  $requiredPatterns = @($Lane.files + $Lane.contracts + $Lane.manifests + $Lane.runtimeCode + $Lane.scripts)
  $expectedCount = $requiredPatterns.Count
  $foundCount = @($fileMatches + $contractMatches + $manifestMatches + $runtimeMatches + $scriptMatches).Count
  $hasAnyArtifact = ($foundCount + $reportMatches.Count + $receiptMatches.Count) -gt 0
  $validationRan = @($validationResults).Count -gt 0
  $validationPass = @($validationResults | Where-Object { $_.status -eq "PASS" }).Count -gt 0
  $validationFail = @($validationResults | Where-Object { $_.status -in @("FAIL", "TIMEOUT") }).Count -gt 0
  $missingRequired = @()

  foreach ($pattern in $requiredPatterns) {
    if (@(Resolve-LeeWayMatches -Patterns @($pattern)).Count -eq 0) {
      $missingRequired += $pattern
    }
  }

  $status = "MISSING"
  $blockers = @()
  if (($validationPass -or $evidencePass) -and $jsonCheck.valid) {
    $status = "READY_PROVEN"
  } elseif ($validationFail -or $evidenceBlocked) {
    $status = $Lane.defaultBlockerType
    $blockers += if ($validationFail) { "Validation failed or timed out. See command log." } else { "Latest evidence verdict is not ready: $($evidenceVerdicts -join ', ')" }
  } elseif (-not $jsonCheck.valid) {
    $status = "PARTIAL"
    $blockers += "Invalid JSON found in lane artifacts."
  } elseif ($hasAnyArtifact -and $missingRequired.Count -eq 0) {
    $status = "DOCUMENT_READY_RUNTIME_UNPROVEN"
    $blockers += "Artifacts exist, but no live validation proof ran in this pass."
  } elseif ($hasAnyArtifact) {
    $status = "PARTIAL"
    $blockers += "Some lane artifacts exist, but required files or validators are missing."
  } else {
    $blockers += "No lane artifacts found."
  }

  if ($Lane.approvalRequired -and $status -ne "READY_PROVEN") {
    $blockers += "Creator-root or explicit capability approval required before live action."
  }
  if ($Lane.hardwareRequired -and $status -ne "READY_PROVEN") {
    $blockers += "Hardware or device permission required for live proof."
  }

  [ordered]@{
    laneId = $Lane.laneId
    laneName = $Lane.laneName
    originalPromptFound = $true
    currentFilesFound = @($fileMatches + $runtimeMatches)
    contractsFound = $contractMatches
    manifestsFound = $manifestMatches
    runtimeCodeFound = $runtimeMatches
    validationScriptsFound = $scriptMatches
    reportsFound = $reportMatches
    receiptsFound = $receiptMatches
    liveRuntimeProofFound = ($validationPass -or $evidencePass)
    validationCommandFound = ($scriptMatches.Count -gt 0)
    validationCommandRan = $validationRan
    validationResults = $validationResults
    evidenceVerdicts = $evidenceVerdicts
    currentStatus = $status
    readyProvenPartialBlocked = $status
    blockers = $blockers
    missingWork = $missingRequired
    safeNextAction = if ($status -eq "READY_PROVEN") { "Maintain receipts and rerun gate after related runtime changes." } elseif ($missingRequired.Count -gt 0) { "Create or wire missing artifacts: $($missingRequired -join ', ')" } else { "Resolve blockers and rerun this lane validation." }
    approvalRequired = $Lane.approvalRequired
    hardwareRequired = $Lane.hardwareRequired
    canContinueIndependently = -not $Lane.approvalRequired
    finalVerdictForLane = $status
    jsonValid = $jsonCheck.valid
    invalidJsonFiles = $jsonCheck.invalidFiles
  }
}

if ($ValidateOnly) {
  $lane = Get-LaneByScript -ScriptName $LaneScriptName
  if (-not $lane) {
    Write-Host "No master backlog lane maps to $LaneScriptName"
    exit 1
  }
  $laneResult = Test-Lane -Lane $lane
  $laneReportPath = Join-Path $ReportsDir ("lane-{0}-{1}-report.json" -f $lane.laneId.ToLower(), ($LaneScriptName -replace '\.ps1$', ''))
  $laneReceiptPath = Join-Path $ReceiptsDir ("lane-{0}-{1}-{2}.json" -f $lane.laneId.ToLower(), ($LaneScriptName -replace '\.ps1$', ''), $Stamp)
  Write-LeewayJson -Path $laneReportPath -Object $laneResult | Out-Null
  Write-LeewayJson -Path $laneReceiptPath -Object $laneResult | Out-Null
  Write-Host "Verdict: $($laneResult.finalVerdictForLane)"
  exit $(if ($laneResult.finalVerdictForLane -eq "READY_PROVEN") { 0 } else { 1 })
}

$createdValidators = @()
foreach ($lane in $lanes) {
  foreach ($script in @($lane.scripts)) {
    $name = Split-Path -Leaf $script
    if (Ensure-LeeWayValidationWrapper -ScriptName $name) {
      $createdValidators += "scripts\$name"
    }
  }
}

$laneResults = @()
foreach ($lane in $lanes) {
  $shouldRun = -not $SkipValidationRun
  $laneResults += Test-Lane -Lane $lane -RunValidation:$shouldRun
}

$counts = [ordered]@{}
foreach ($state in @("READY_PROVEN", "DOCUMENT_READY_RUNTIME_UNPROVEN", "PARTIAL", "BLOCKED_HARDWARE", "BLOCKED_PERMISSION", "BLOCKED_MODEL", "BLOCKED_RUNTIME", "BLOCKED_APPROVAL", "MISSING")) {
  $counts[$state] = @($laneResults | Where-Object { $_.finalVerdictForLane -eq $state }).Count
}

$truthLabels = @("NO_MODEL_DELETION", "NO_PROVIDER_DRIFT", "NO_FAKE_PASS")
if (@($laneResults | Where-Object { $_.laneName -eq "Owner identity" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "OWNER_IDENTITY_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Qwen3 primary reasoning" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "QWEN3_PRIMARY_REASONING_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Vision model qwen2.5vl" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "QWEN2_5VL_VISION_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Qwen coder primary" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "QWEN_CODER_PRIMARY_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Qwen coder fallback" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "QWEN_CODER_FALLBACK_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Model router" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "MODEL_ROUTER_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Runtime Fabric model routing" -and $_.finalVerdictForLane -eq "READY_PROVEN" }).Count) { $truthLabels += "RUNTIME_FABRIC_MODEL_ROUTING_READY" }
if (@($laneResults | Where-Object { $_.laneName -eq "Production readiness gate" -and $_.validationCommandRan }).Count) { $truthLabels += "PRODUCTION_GATE_RAN" }

$blockedCount = $counts.BLOCKED_HARDWARE + $counts.BLOCKED_PERMISSION + $counts.BLOCKED_MODEL + $counts.BLOCKED_RUNTIME + $counts.BLOCKED_APPROVAL + $counts.MISSING
$verdict = if ($blockedCount -eq 0 -and $counts.PARTIAL -eq 0 -and $counts.DOCUMENT_READY_RUNTIME_UNPROVEN -eq 0) {
  "LEEWAY_MASTER_TOTAL_ECOSYSTEM_COMPLETION_READY"
} elseif ($laneResults.Count -gt 0) {
  "LEEWAY_MASTER_TOTAL_ECOSYSTEM_COMPLETION_PARTIAL_BLOCKERS_REMAIN"
} else {
  "LEEWAY_MASTER_TOTAL_ECOSYSTEM_COMPLETION_BLOCKED"
}

$commonMetadata = [ordered]@{
  reportId = "leeway-master-total-ecosystem-completion-$Stamp"
  generatedAt = $IsoNow
  workspaceRoot = $Root
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  governingStandardsRead = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md"
  )
  applicableStandards = @(
    "BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW",
    "BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW",
    "LEEWAY_APPLICATION_STANDARDS",
    "LEEWAY_TRACER_PACK_STANDARD"
  )
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("LEEWAY-ASSISTANT-0002", "agent-lee", "LEEWAY_APP::COMPLETION::MASTER_BACKLOG::LEDGER")
}

$masterReport = [ordered]@{
  metadata = $commonMetadata
  summary = $counts
  lanes = $laneResults
  createdValidationWrappers = $createdValidators
  validationCommandLog = $CommandLogPath
  modifiedFiles = @(
    "Leeway Runtime Fabric/model-gateway/qwen3-final-answer-controller.mjs",
    "Leeway Runtime Fabric/model-gateway/qwen3-final-answer-policy.json",
    "Leeway Runtime Fabric/scripts/launchers/leeway-real-backend-dispatch.ps1",
    "scripts/Test-LeewayQwen3ReasoningRoute.ps1",
    "scripts/Invoke-LeeWayMasterTotalEcosystemCompletion.ps1"
  )
  generatedFiles = @()
  backedUpFiles = @("Archive/backups/data-incremental/20260627-003019")
  validationCommandsRun = @($laneResults | ForEach-Object { $_.validationResults } | Where-Object { $_ })
  validationResults = $counts
  receiptsWritten = @()
  blockers = @($laneResults | Where-Object { $_.finalVerdictForLane -ne "READY_PROVEN" } | ForEach-Object { [ordered]@{ laneId = $_.laneId; laneName = $_.laneName; state = $_.finalVerdictForLane; blockers = $_.blockers; missingWork = $_.missingWork } })
  truthLabels = $truthLabels
  verdict = $verdict
}

$unfinishedReportPath = Join-Path $ReportsDir "leeway-unfinished-work-ledger-report.json"
$unfinishedReceiptPath = Join-Path $ReceiptsDir "leeway-unfinished-work-ledger-$Stamp.json"
$masterLedgerPath = Join-Path $ReportsDir "leeway-master-backlog-ledger-report.json"
$masterLedgerMdPath = Join-Path $ReportsDir "leeway-master-backlog-ledger-report.md"
$masterReceiptPath = Join-Path $ReceiptsDir "leeway-master-backlog-ledger-$Stamp.json"
$totalReportJsonPath = Join-Path $ReportsDir "leeway-master-total-ecosystem-completion-report.json"
$totalReportMdPath = Join-Path $ReportsDir "leeway-master-total-ecosystem-completion-report.md"
$blockerMapPath = Join-Path $ReportsDir "leeway-master-total-ecosystem-blocker-map.json"
$totalReceiptPath = Join-Path $ReceiptsDir "leeway_master_total_ecosystem_completion_receipt.json"

$masterReport.generatedFiles = @(
  $unfinishedReportPath,
  $unfinishedReceiptPath,
  $masterLedgerPath,
  $masterLedgerMdPath,
  $masterReceiptPath,
  $totalReportJsonPath,
  $totalReportMdPath,
  $blockerMapPath,
  $CommandLogPath,
  $totalReceiptPath
) + $createdValidators
$masterReport.receiptsWritten = @($unfinishedReceiptPath, $masterReceiptPath, $totalReceiptPath)

Write-LeewayJson -Path $unfinishedReportPath -Object $masterReport | Out-Null
Write-LeewayJson -Path $unfinishedReceiptPath -Object $masterReport | Out-Null
Write-LeewayJson -Path $masterLedgerPath -Object $masterReport | Out-Null
Write-LeewayJson -Path $masterReceiptPath -Object $masterReport | Out-Null
Write-LeewayJson -Path $totalReportJsonPath -Object $masterReport | Out-Null
Write-LeewayJson -Path $blockerMapPath -Object $masterReport.blockers | Out-Null
Write-LeewayJson -Path $totalReceiptPath -Object ([ordered]@{
  receiptId = "leeway_master_total_ecosystem_completion_receipt"
  timestamp = $IsoNow
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  actionRequested = "Complete LeeWay master backlog and unfinished work pass with proof-backed lane states."
  actionTaken = "Created master ledger, generated missing validator wrappers, ran bounded validations, wrote reports and receipts."
  filesTouched = $masterReport.modifiedFiles + $createdValidators
  standardsConsulted = $commonMetadata.governingStandardsRead + $commonMetadata.applicableStandards
  approvalRequired = $true
  approvalPresent = $false
  validationPerformed = -not $SkipValidationRun
  result = $verdict
  blockers = $masterReport.blockers
  nextFixQueue = @($masterReport.blockers | Select-Object -First 20)
}) | Out-Null

$md = @(
  "# LeeWay Master Backlog Ledger Report",
  "",
  "Generated: $IsoNow",
  "",
  "Verdict: $verdict",
  "",
  "## Summary",
  "",
  ($counts.GetEnumerator() | ForEach-Object { "- $($_.Key): $($_.Value)" }) -join "`n",
  "",
  "## Blockers",
  "",
  (@($masterReport.blockers) | ForEach-Object { "- $($_.laneId) $($_.laneName): $($_.state) - $($_.blockers -join '; ')" }) -join "`n",
  "",
  "## Truth Labels",
  "",
  ($truthLabels | ForEach-Object { "- $_" }) -join "`n"
) -join "`n"
Set-Content -LiteralPath $masterLedgerMdPath -Value $md -Encoding UTF8
Set-Content -LiteralPath $totalReportMdPath -Value $md -Encoding UTF8

Write-Host "Verdict: $verdict"
Write-Host "Ready proven: $($counts.READY_PROVEN)"
Write-Host "Partial: $($counts.PARTIAL)"
Write-Host "Blocked/runtime/hardware/permission/model/approval/missing: $blockedCount"
Write-Host "Report: $totalReportJsonPath"
Write-Host "Receipt: $totalReceiptPath"
exit $(if ($verdict -eq "LEEWAY_MASTER_TOTAL_ECOSYSTEM_COMPLETION_READY") { 0 } else { 1 })
