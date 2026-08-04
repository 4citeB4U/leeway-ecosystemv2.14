[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-embodiment-pointer-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-desktop-runtime\agent-lee-embodiment-pointer-$Stamp.json"

$PointerScripts = @(
  (Join-Path $Root "scripts\Start-AgentLeeRealPointerAutoLive.ps1"),
  (Join-Path $Root "scripts\Start-AgentLeeUIBubble.ps1"),
  (Join-Path $Root "scripts\Start-AgentLeeLiveEmbodiment.ps1")
)

$validationCommandsRun = @(
  "Test-Path Start-AgentLeeRealPointerAutoLive.ps1",
  "Get-CimInstance Win32_Process | search for pointer/bubble command lines",
  "Invoke-LeewayHttp -> GET /runtime/status"
)

$scriptEvidence = @()
foreach ($scriptPath in $PointerScripts) {
  $scriptEvidence += [ordered]@{
    path = $scriptPath
    exists = Test-Path -LiteralPath $scriptPath
  }
}

$processHits = @()
try {
  $processHits = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match 'Start-AgentLeeRealPointerAutoLive|Start-AgentLeeUIBubble|Start-AgentLeeLiveEmbodiment|pointer|bubble'
  } | Select-Object ProcessId, Name, CommandLine)
} catch {}

$statusProbe = Invoke-LeewayHttp -Url "http://127.0.0.1:8091/runtime/status" -TimeoutSec 15
$status = $statusProbe.parsed

$blockers = @()
if (($scriptEvidence | Where-Object { $_.exists }).Count -eq 0) {
  $blockers += "No pointer or bubble launcher scripts were found."
}
if ($processHits.Count -eq 0) {
  $blockers += "No live pointer or bubble process was detected."
}
if (-not $statusProbe.ok) {
  $blockers += "Desktop runtime status route was not reachable."
}

$pointerStateVisible = $false
if ($statusProbe.ok -and $status) {
  $pointerStateVisible = [bool]($status.pointerState -or $status.presenceUiStatus -or $status.miniUiUrl)
}
if (-not $pointerStateVisible) {
  $blockers += "Pointer state was not visible in desktop runtime status."
}

$ready = $blockers.Count -eq 0
if ($ready) {
  $truthLabels = @("POINTER_EMBODIMENT_READY", "NO_FAKE_PASS")
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_READY"
} elseif ($processHits.Count -gt 0 -or $scriptEvidence | Where-Object { $_.exists }) {
  $truthLabels = @("POINTER_EMBODIMENT_CHECK_REQUIRED", "NO_FAKE_PASS")
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_CHECK_REQUIRED"
} else {
  $truthLabels = @("NO_FAKE_PASS")
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_BLOCKED"
}

$result = [ordered]@{
  reportId = "agent-lee-embodiment-pointer-$Stamp"
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
  applicableStandards = @("POINTER_EMBODIMENT_READY", "POINTER_EMBODIMENT_CHECK_REQUIRED", "NO_FAKE_PASS")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-pointer", "agent-lee-ui-bubble")
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @()
  validationCommandsRun = $validationCommandsRun
  validationResults = @(
    [ordered]@{ name = "pointer_scripts"; ok = (($scriptEvidence | Where-Object { $_.exists }).Count -gt 0); evidence = $scriptEvidence },
    [ordered]@{ name = "pointer_process"; ok = ($processHits.Count -gt 0); processCount = $processHits.Count },
    [ordered]@{ name = "runtime_status"; ok = $statusProbe.ok; pointerStateVisible = $pointerStateVisible }
  )
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = $truthLabels
  verdict = $verdict
  processHits = $processHits
  runtimeStatus = $status
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
