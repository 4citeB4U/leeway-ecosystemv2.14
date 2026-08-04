[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-senses-runtime-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-desktop-runtime\agent-lee-senses-runtime-$Stamp.json"
$DesktopUrl = "http://127.0.0.1:8091"
$ConfirmDesktop = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
$ConfirmCamera = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"

$validationCommandsRun = @(
  "Invoke-LeewayHttp -> GET /runtime/voice/status",
  "Invoke-LeewayHttp -> POST /runtime/voice/speak",
  "Invoke-LeewayHttp -> POST /runtime/voice/listen",
  "Invoke-LeewayHttp -> GET /runtime/vision/camera/status",
  "Invoke-LeewayHttp -> POST /runtime/vision/camera/look-now",
  "Invoke-LeewayHttp -> POST /runtime/desktop/capture-screen"
)

$voiceStatusProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/voice/status" -TimeoutSec 20
$voiceSpeakProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/voice/speak" -Method POST -Body @{
  text = "Agent Lee senses proof voice lane check."
  voice = "andrew"
} -TimeoutSec 180
$voiceListenProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/voice/listen" -Method POST -Body @{
  durationMs = 1500
  prompt = "Agent Lee senses proof mic lane check."
} -TimeoutSec 60
$cameraStatusProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/vision/camera/status" -TimeoutSec 20
$cameraLookProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/vision/camera/look-now" -Method POST -Body @{
  confirm = $ConfirmCamera
  controlSurface = "vscode_chat"
  prompt = "Describe visible facts only."
  visionBackend = "qwen2.5vl:7b"
} -TimeoutSec 300
$screenCaptureProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/desktop/capture-screen" -Method POST -Body @{
  confirm = $ConfirmDesktop
  dryRun = $false
} -TimeoutSec 120

$blockers = @()

if (-not $voiceStatusProbe.ok) { $blockers += "Voice status route failed." }
if (-not $voiceSpeakProbe.ok) { $blockers += "Clone voice speak route failed." }
if (-not $voiceListenProbe.ok) { $blockers += "Mic listen route failed or was blocked." }
if (-not $cameraStatusProbe.ok) { $blockers += "Camera status route failed." }
if (-not $cameraLookProbe.ok) { $blockers += "Camera look-now route failed or was blocked." }
if (-not $screenCaptureProbe.ok) { $blockers += "Screen capture route failed." }

$voiceSpeakReceipt = if ($voiceSpeakProbe.parsed) { $voiceSpeakProbe.parsed.receiptPath } else { $null }
$voiceListenReceipt = if ($voiceListenProbe.parsed) { $voiceListenProbe.parsed.receiptPath } else { $null }
$cameraLookReceipt = if ($cameraLookProbe.parsed) { $cameraLookProbe.parsed.receiptPath } else { $null }
$screenReceipt = if ($screenCaptureProbe.parsed) { $screenCaptureProbe.parsed.receiptPath } else { $null }

if ($voiceSpeakProbe.parsed -and $voiceSpeakProbe.parsed.ok -ne $true) { $blockers += "Voice speak route did not report ok." }
if ($voiceSpeakReceipt -and -not (Test-Path -LiteralPath $voiceSpeakReceipt)) { $blockers += "Voice speak receipt path does not exist." }
if ($voiceListenProbe.parsed -and $voiceListenProbe.parsed.ok -ne $true) {
  $blockers += "Mic listen route reported a blocker."
}
if ($cameraLookProbe.parsed -and $cameraLookProbe.parsed.ok -ne $true) {
  $blockers += "Camera look-now route reported a blocker."
}
if ($cameraLookReceipt -and -not (Test-Path -LiteralPath $cameraLookReceipt)) { $blockers += "Camera receipt path does not exist." }
if ($screenCaptureProbe.parsed -and $screenCaptureProbe.parsed.ok -ne $true) {
  $blockers += "Screen capture route reported a blocker."
}
if ($screenReceipt -and -not (Test-Path -LiteralPath $screenReceipt)) { $blockers += "Screen capture receipt path does not exist." }

$voiceReady = $voiceSpeakProbe.ok -and $voiceSpeakProbe.parsed -and $voiceSpeakProbe.parsed.ok -eq $true -and $voiceSpeakReceipt
$micReady = $voiceListenProbe.ok -and $voiceListenProbe.parsed -and $voiceListenProbe.parsed.ok -eq $true
$cameraReady = $cameraLookProbe.ok -and $cameraLookProbe.parsed -and $cameraLookProbe.parsed.ok -eq $true
$screenReady = $screenCaptureProbe.ok -and $screenCaptureProbe.parsed -and $screenCaptureProbe.parsed.ok -eq $true
$visionReady = $cameraReady -and ($cameraLookProbe.parsed.analysisText -or $cameraLookProbe.parsed.snapshotPath)

$truthLabels = @("NO_FAKE_PASS")
if ($voiceReady) { $truthLabels += "XTTS_CLONE_VOICE_READY" }
if ($micReady) { $truthLabels += "MIC_CAPTURE_READY" } else { $truthLabels += "MIC_CAPTURE_BLOCKED" }
if ($cameraReady) { $truthLabels += "CAMERA_CAPTURE_READY" } else { $truthLabels += "CAMERA_CAPTURE_BLOCKED" }
if ($visionReady) { $truthLabels += "VISION_ANALYSIS_READY" } else { $truthLabels += "VISION_ANALYSIS_BLOCKED" }
if ($screenReady) { $truthLabels += "SCREEN_CAPTURE_READY" }
if ($screenReady -and $screenCaptureProbe.parsed.tool -ne "browser.visible.search") { $truthLabels += "NO_BROWSER_ONLY_DESKTOP_PROOF" }

$ready = $voiceReady -and $cameraReady -and $screenReady -and $visionReady
if ($ready) {
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_READY"
} elseif ($voiceReady -or $cameraReady -or $screenReady) {
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_DEGRADED"
} else {
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_CHECK_REQUIRED"
}

$result = [ordered]@{
  reportId = "agent-lee-senses-runtime-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
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
  applicableStandards = @("XTTS_CLONE_VOICE_READY", "CAMERA_CAPTURE_READY", "MIC_CAPTURE_READY", "VISION_ANALYSIS_READY", "SCREEN_CAPTURE_READY", "NO_FAKE_PASS")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-desktop-runtime-host", "agent-lee-voice-loop", "agent-lee-camera-bridge")
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @(
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\runtime.ps1"),
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs")
  )
  validationCommandsRun = $validationCommandsRun
  validationResults = @(
    [ordered]@{ name = "voice_status"; ok = $voiceStatusProbe.ok },
    [ordered]@{ name = "voice_speak"; ok = [bool]$voiceReady; receiptPath = $voiceSpeakReceipt },
    [ordered]@{ name = "voice_listen"; ok = [bool]$micReady; receiptPath = $voiceListenReceipt },
    [ordered]@{ name = "camera_status"; ok = $cameraStatusProbe.ok },
    [ordered]@{ name = "camera_look_now"; ok = [bool]$cameraReady; receiptPath = $cameraLookReceipt },
    [ordered]@{ name = "screen_capture"; ok = [bool]$screenReady; receiptPath = $screenReceipt }
  )
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = @($truthLabels | Select-Object -Unique)
  verdict = $verdict
  voiceSpeak = $voiceSpeakProbe.parsed
  voiceListen = $voiceListenProbe.parsed
  cameraLook = $cameraLookProbe.parsed
  screenCapture = $screenCaptureProbe.parsed
}

Write-LeewayJson -Path $ReportPath -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

Write-Host "Verdict: $verdict"
Write-Host "Receipt: $ReceiptPath"
Write-Host "Report: $ReportPath"

if ($NoExitOnFail.IsPresent) {
  return $result
}

if (-not $ready) {
  exit 1
}

return $result
