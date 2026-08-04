[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-desktop-runtime-host-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-desktop-runtime\agent-lee-desktop-runtime-host-$Stamp.json"
$BaseUrl = "http://127.0.0.1:8091"
$StatePath = Join-Path $Root "agent-lee-coding-mode\runtime\desktop-runtime\agent-lee-desktop-runtime-state.json"
$ReceiptDir = Join-Path $Root "Archive\receipts\agent-lee-desktop-runtime"
$RequiredRoutes = @(
  "GET /runtime/status",
  "GET /runtime/health",
  "GET /runtime/voice/status",
  "POST /runtime/voice/listen",
  "POST /runtime/voice/conversation/once",
  "POST /runtime/voice/speak",
  "POST /runtime/speak",
  "GET /runtime/vision/camera/status",
  "POST /runtime/vision/camera/open",
  "POST /runtime/vision/camera/snapshot",
  "POST /runtime/vision/camera/analyze-snapshot",
  "POST /runtime/vision/camera/stop",
  "POST /runtime/vision/camera/look-now",
  "POST /runtime/desktop/move-cursor",
  "POST /runtime/desktop/click",
  "POST /runtime/desktop/open-app",
  "POST /runtime/desktop/type-text",
  "POST /runtime/desktop/open-browser",
  "POST /runtime/desktop/search-web",
  "POST /runtime/desktop/scroll",
  "POST /runtime/desktop/capture-screen",
  "POST /runtime/desktop/print",
  "POST /runtime/telegram/send",
  "POST /runtime/receipt/write"
)

function Test-PortListening {
  param([int]$Port)
  $raw = netstat -ano 2>$null | Select-String ":$Port\s.*LISTENING"
  if (-not $raw) {
    return [ordered]@{ ok = $false; pid = $null; raw = $null }
  }
  $line = ($raw | Select-Object -First 1).ToString()
  $pid = $null
  $match = [regex]::Match($line, '\s+(\d+)\s*$')
  if ($match.Success) { $pid = [int]$match.Groups[1].Value }
  return [ordered]@{ ok = $true; pid = $pid; raw = $line }
}

$validationCommandsRun = @(
  "Invoke-LeewayHttp -> GET /runtime/status",
  "Invoke-LeewayHttp -> GET /runtime/health",
  "netstat -ano | Select-String :8091",
  "Test-Path runtime state and receipt dir"
)

$portInfo = Test-PortListening -Port 8091
$statusProbe = Invoke-LeewayHttp -Url "$BaseUrl/runtime/status" -TimeoutSec 15
$healthProbe = Invoke-LeewayHttp -Url "$BaseUrl/runtime/health" -TimeoutSec 20

$status = $statusProbe.parsed
$health = $healthProbe.parsed
$routes = @()
if ($status -and $status.routes) { $routes = @($status.routes) }

$blockers = @()
if (-not $portInfo.ok) { $blockers += "Port 8091 is not listening." }
if (-not $statusProbe.ok) { $blockers += "GET /runtime/status failed." }
if (-not $healthProbe.ok) { $blockers += "GET /runtime/health failed." }
if (-not (Test-Path -LiteralPath $StatePath)) { $blockers += "State file is missing: $StatePath" }
if (-not (Test-Path -LiteralPath $ReceiptDir)) { $blockers += "Receipt directory is missing: $ReceiptDir" }

$missingRoutes = @($RequiredRoutes | Where-Object { $routes -notcontains $_ })
if ($missingRoutes.Count -gt 0) {
  $blockers += "Required routes missing: $($missingRoutes -join ', ')"
}

$owner = if ($status -and $status.ownerIdentity) { $status.ownerIdentity } else { $null }
if (-not $owner) {
  $blockers += "Owner identity is missing from /runtime/status."
} else {
  if ($owner.ownerId -ne "LEONARD_J_LEE") { $blockers += "Owner id is not LEONARD_J_LEE." }
  if ($owner.ownerName -ne "Leonard J Lee") { $blockers += "Owner name is not Leonard J Lee." }
  if ($owner.creatorRootAuthority -ne $true) { $blockers += "Creator root authority is not true." }
  if ($owner.vscodeAuthorityRole -ne "none") { $blockers += "VS Code authority role is not none." }
}

if ($status -and $status.hostStatus -eq "READY" -and $blockers.Count -gt 0) {
  $blockers += "No fake READY: /runtime/status reported READY while blockers were present."
}
if ($health -and $health.hostStatus -eq "READY" -and $health.ok -ne $true) {
  $blockers += "No fake READY: /runtime/health reported READY while health was not ok."
}

$ready = $blockers.Count -eq 0
if ($ready) {
  $truthLabels = @("DESKTOP_RUNTIME_HOST_READY", "OWNER_IDENTITY_LIVE_RUNTIME_READY", "RUNTIME_RECEIPTS_READY", "NO_FAKE_PASS")
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_READY"
} elseif ($statusProbe.ok -or $healthProbe.ok) {
  $truthLabels = @("NO_FAKE_PASS", "RUNTIME_RECEIPTS_READY")
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_CHECK_REQUIRED"
} else {
  $truthLabels = @("NO_FAKE_PASS")
  $verdict = "AGENT_LEE_DESKTOP_RUNTIME_HOST_BLOCKED"
}

$result = [ordered]@{
  reportId = "agent-lee-desktop-runtime-host-$Stamp"
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
  applicableStandards = @("NO_FAKE_PASS", "RUNTIME_RECEIPTS_READY", "OWNER_IDENTITY_LIVE_RUNTIME_READY")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-desktop-runtime-host", "agent-lee-desktop-runtime-state")
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @(
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\runtime.ps1"),
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs")
  )
  validationCommandsRun = $validationCommandsRun
  validationResults = @(
    [ordered]@{ name = "port_8091"; ok = $portInfo.ok; pid = $portInfo.pid },
    [ordered]@{ name = "runtime_status"; ok = $statusProbe.ok; hostStatus = if ($status) { $status.hostStatus } else { $null } },
    [ordered]@{ name = "runtime_health"; ok = $healthProbe.ok; hostStatus = if ($health) { $health.hostStatus } else { $null } },
    [ordered]@{ name = "state_file"; ok = (Test-Path -LiteralPath $StatePath) },
    [ordered]@{ name = "receipt_dir"; ok = (Test-Path -LiteralPath $ReceiptDir) },
    [ordered]@{ name = "routes_count"; ok = ($routes.Count -ge $RequiredRoutes.Count) }
  )
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = $truthLabels
  verdict = $verdict
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
