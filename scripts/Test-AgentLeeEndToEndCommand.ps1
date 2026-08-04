[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-end-to-end-command-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-desktop-runtime\agent-lee-end-to-end-command-$Stamp.json"
$RouterUrl = "http://127.0.0.1:8080/runtime/official-embodiment-proof"
$DesktopUrl = "http://127.0.0.1:8091"
$Prompt = "Agent Lee, open Chrome and search Milwaukee Bucks latest trades."

$validationCommandsRun = @(
  "Invoke-LeewayHttp -> POST $RouterUrl",
  "Invoke-LeewayHttp -> POST /runtime/voice/speak",
  "Invoke-LeewayHttp -> POST /runtime/desktop/move-cursor",
  "Invoke-LeewayHttp -> POST /runtime/desktop/capture-screen"
)

$routerProbe = Invoke-LeewayHttp -Url $RouterUrl -Method POST -Body @{
  confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
  prompt = $Prompt
  controlSurface = "vscode_chat"
  adapterPort = 8787
  routerPort = 8080
  receiptDir = (Join-Path $Root "Archive\receipts")
} -TimeoutSec 300

$voiceProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/voice/speak" -Method POST -Body @{
  text = "Aight Leonard, I opened Chrome and kicked off the search lane."
  voice = "agent-lee"
} -TimeoutSec 180

$pointerProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/desktop/move-cursor" -Method POST -Body @{
  confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
  x = 20
  y = 20
} -TimeoutSec 60

$screenProbe = Invoke-LeewayHttp -Url "$DesktopUrl/runtime/desktop/capture-screen" -Method POST -Body @{
  confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
  dryRun = $false
} -TimeoutSec 120

$router = $routerProbe.parsed
$voice = $voiceProbe.parsed
$pointer = $pointerProbe.parsed
$screen = $screenProbe.parsed
$browserResult = if ($router -and $router.browserResult) { $router.browserResult } else { $null }
$routerReceipt = if ($router -and $router.receiptPath) { [string]$router.receiptPath } else { $null }
$voiceReceipt = if ($voice -and $voice.receiptPath) { [string]$voice.receiptPath } else { $null }
$pointerReceipt = if ($pointer -and $pointer.receiptPath) { [string]$pointer.receiptPath } else { $null }
$screenReceipt = if ($screen -and $screen.receiptPath) { [string]$screen.receiptPath } else { $null }

$blockers = @()
if (-not $routerProbe.ok) { $blockers += "Router command lane failed." }
if (-not $router) { $blockers += "Router response did not parse as JSON." }
if ($router -and $router.status -ne "PASS_MACHINE_ONLY" -and $router.status -ne "PASS") {
  $blockers += "Router official proof did not report a passing machine status."
}
if (-not $browserResult -or $browserResult.ok -ne $true) { $blockers += "Browser tool result was not ok." }
if (-not $routerReceipt) { $blockers += "Router receipt path is missing." }
if ($routerReceipt -and -not (Test-Path -LiteralPath $routerReceipt)) { $blockers += "Router receipt file is missing." }
if (-not $voiceProbe.ok) { $blockers += "Narration lane failed." }
if (-not $voice -or $voice.ok -ne $true) { $blockers += "Narration result was not ok." }
if ($voiceReceipt -and -not (Test-Path -LiteralPath $voiceReceipt)) { $blockers += "Narration receipt file is missing." }
if (-not $pointerProbe.ok) { $blockers += "Pointer move lane failed." }
if (-not $pointer -or $pointer.ok -ne $true) { $blockers += "Pointer move result was not ok." }
if ($pointerReceipt -and -not (Test-Path -LiteralPath $pointerReceipt)) { $blockers += "Pointer receipt file is missing." }
if (-not $screenProbe.ok) { $blockers += "Screen capture lane failed." }
if (-not $screen -or $screen.ok -ne $true) { $blockers += "Screen capture result was not ok." }
if ($screenReceipt -and -not (Test-Path -LiteralPath $screenReceipt)) { $blockers += "Screen capture receipt file is missing." }

$stateChanged = $routerReceipt -or $voiceReceipt -or $pointerReceipt -or $screenReceipt
if (-not $stateChanged) {
  $blockers += "No receipt-backed state change was observed."
}

$voiceNarrationAttempted = [bool]($voiceProbe.ok -and $voice)
$pointerMoved = [bool]($pointerProbe.ok -and $pointer -and $pointer.ok -eq $true)
$screenCaptured = [bool]($screenProbe.ok -and $screen -and $screen.ok -eq $true)

$truthLabels = @("NO_FAKE_PASS")
if ($browserResult -and $browserResult.ok) { $truthLabels += "AGENT_LEE_TOOL_CALLING_READY" }
if ($voiceNarrationAttempted) { $truthLabels += "XTTS_CLONE_VOICE_READY" }
if ($pointerMoved) { $truthLabels += "POINTER_EMBODIMENT_READY" } else { $truthLabels += "POINTER_EMBODIMENT_CHECK_REQUIRED" }
if ($screenCaptured) { $truthLabels += "SCREEN_CAPTURE_READY" }
if ($stateChanged) { $truthLabels += "RUNTIME_RECEIPTS_READY" }

$ready = ($browserResult -and $browserResult.ok -eq $true -and $voiceNarrationAttempted -and $pointerMoved -and $screenCaptured -and $blockers.Count -eq 0)
if ($ready) {
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_READY"
} elseif ($browserResult -and $browserResult.ok -eq $true) {
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_DEGRADED"
} else {
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_CHECK_REQUIRED"
}

$result = [ordered]@{
  reportId = "agent-lee-end-to-end-command-$Stamp"
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
  applicableStandards = @("AGENT_LEE_TOOL_CALLING_READY", "XTTS_CLONE_VOICE_READY", "POINTER_EMBODIMENT_READY", "SCREEN_CAPTURE_READY", "RUNTIME_RECEIPTS_READY", "NO_FAKE_PASS")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-router", "agent-lee-desktop-runtime-host", "agent-lee-voice-loop")
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @(
    (Join-Path $Root "agent-lee-coding-mode\router\server-brainfix.mjs"),
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs"),
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\runtime.ps1")
  )
  validationCommandsRun = $validationCommandsRun
  validationResults = @(
    [ordered]@{ name = "router_command"; ok = $routerProbe.ok; status = if ($router) { $router.status } else { $null } },
    [ordered]@{ name = "voice_narration"; ok = $voiceNarrationAttempted; receiptPath = $voiceReceipt },
    [ordered]@{ name = "pointer_move"; ok = $pointerMoved; receiptPath = $pointerReceipt },
    [ordered]@{ name = "screen_capture"; ok = $screenCaptured; receiptPath = $screenReceipt }
  )
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = @($truthLabels | Select-Object -Unique)
  verdict = $verdict
  command = $Prompt
  routerResponse = $router
  voiceResponse = $voice
  pointerResponse = $pointer
  screenResponse = $screen
  browserResult = $browserResult
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
