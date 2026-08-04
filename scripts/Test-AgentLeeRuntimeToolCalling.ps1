[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-runtime-tool-calling-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-desktop-runtime\agent-lee-runtime-tool-calling-$Stamp.json"
$RouterUrl = "http://127.0.0.1:8080/runtime/official-embodiment-proof"
$Prompt = "Agent Lee, open Chrome and search Milwaukee Bucks latest trades."

$validationCommandsRun = @(
  "Invoke-LeewayHttp -> POST $RouterUrl",
  "Test-Path router/runtime receipt path from response"
)

$routerProbe = Invoke-LeewayHttp -Url $RouterUrl -Method POST -Body @{
  confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
  prompt = $Prompt
  controlSurface = "vscode_chat"
  adapterPort = 8787
  routerPort = 8080
  receiptDir = (Join-Path $Root "Archive\receipts")
} -TimeoutSec 300

$payload = $routerProbe.parsed
$browserResult = if ($payload -and $payload.browserResult) { $payload.browserResult } else { $null }
$receiptPath = if ($payload -and $payload.receiptPath) { [string]$payload.receiptPath } elseif ($browserResult -and $browserResult.receiptPath) { [string]$browserResult.receiptPath } else { $null }

$blockers = @()
if (-not $routerProbe.ok) { $blockers += "Router proof request failed." }
if (-not $payload) { $blockers += "Router response did not parse as JSON." }
if ($payload -and $payload.status -ne "PASS_MACHINE_ONLY" -and $payload.status -ne "PASS") {
  $blockers += "Router proof status was not PASS_MACHINE_ONLY or PASS."
}
if (-not $browserResult) { $blockers += "Router response did not include browserResult." }
if ($browserResult -and $browserResult.ok -ne $true) { $blockers += "Browser tool result was not ok." }
if (-not $receiptPath) { $blockers += "No receipt path was returned." }
if ($receiptPath -and -not (Test-Path -LiteralPath $receiptPath)) { $blockers += "Returned receipt path does not exist: $receiptPath" }

$ready = $blockers.Count -eq 0
if ($ready) {
  $truthLabels = @("AGENT_LEE_TOOL_CALLING_READY", "RUNTIME_RECEIPTS_READY", "NO_FAKE_PASS")
  $verdict = "AGENT_LEE_TOOL_CALLING_READY"
} elseif ($routerProbe.ok) {
  $truthLabels = @("CHECK_REQUIRED", "NO_FAKE_PASS")
  $verdict = "AGENT_LEE_TOOL_CALLING_CHECK_REQUIRED"
} else {
  $truthLabels = @("NO_FAKE_PASS")
  $verdict = "AGENT_LEE_TOOL_CALLING_BLOCKED"
}

$result = [ordered]@{
  reportId = "agent-lee-runtime-tool-calling-$Stamp"
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
  applicableStandards = @("AGENT_LEE_TOOL_CALLING_READY", "RUNTIME_RECEIPTS_READY", "NO_FAKE_PASS")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-router", "agent-lee-desktop-runtime-host")
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @(
    (Join-Path $Root "agent-lee-coding-mode\router\server-brainfix.mjs"),
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs"),
    (Join-Path $Root "agent-lee-coding-mode\desktop-runtime\runtime.ps1")
  )
  validationCommandsRun = $validationCommandsRun
  validationResults = @(
    [ordered]@{ name = "router_request"; ok = $routerProbe.ok; status = if ($payload) { $payload.status } else { $null } },
    [ordered]@{ name = "browser_result"; ok = if ($browserResult) { [bool]$browserResult.ok } else { $false } },
    [ordered]@{ name = "receipt_exists"; ok = if ($receiptPath) { Test-Path -LiteralPath $receiptPath } else { $false } }
  )
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = $truthLabels
  verdict = $verdict
  routerResponse = $payload
  browserResult = $browserResult
  receiptPath = $receiptPath
  prompt = $Prompt
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
