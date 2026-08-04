<#
LEEWAY_HEADER - DO NOT REMOVE

TAG: UTIL.SCRIPT.STANDALONE.MIGRATION
REGION: 🟠 UTIL
PURPOSE: Safely archives, verifies, and optionally deletes the external LeeWay-Standards folder after standalone migration.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
#>

param(
  [string]$WorkspaceRoot = "C:\Users\Leona\.leeway-vscode"
)

$ErrorActionPreference = "Stop"

$agentLeeRoot = Join-Path $WorkspaceRoot "agent-lee"
$externalRoot = Join-Path $WorkspaceRoot "LeeWay-Standards"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveRoot = Join-Path $WorkspaceRoot "_archive"
$backupPath = Join-Path $archiveRoot "LeeWay-Standards-pre-standalone-$timestamp"
$reportDir = Join-Path $WorkspaceRoot "reports\standalone-migration\$timestamp"
$reportPath = Join-Path $reportDir "STANDALONE_MIGRATION.md"
$extensionDir = Join-Path $agentLeeRoot "vscode-extension"
$doctorScript = Join-Path $agentLeeRoot "scripts\Invoke-AgentLeeDoctor.ps1"
$doctorReportDir = Join-Path $reportDir "doctor"

function Copy-IfExists {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path $Source)) {
    return $false
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Copy-Item $Source $Destination -Recurse -Force
  return $true
}

New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$inventory = @()
if (Test-Path $externalRoot) {
  $inventory = Get-ChildItem -Path $externalRoot -Recurse -File -ErrorAction SilentlyContinue
  Copy-Item $externalRoot $backupPath -Recurse -Force

  Copy-IfExists (Join-Path $externalRoot "schemas") (Join-Path $agentLeeRoot "sdk\schemas") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "src\collaboration") (Join-Path $agentLeeRoot "governance\law") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "adapters\mcp\vscode-mcp-tooling") (Join-Path $agentLeeRoot "mcp\adapters") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "leeway-sdk\package.json") (Join-Path $agentLeeRoot "sdk\leeway-sdk\package.json") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "leeway-sdk\tsconfig.json") (Join-Path $agentLeeRoot "sdk\leeway-sdk\tsconfig.json") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "standards\AGENT_REGISTRY.md") (Join-Path $agentLeeRoot "sdk\standards\AGENT_REGISTRY.md") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "scripts\audit.mjs") (Join-Path $agentLeeRoot "sdk\validators\audit.mjs") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "scripts\compliance-check.mjs") (Join-Path $agentLeeRoot "sdk\validators\compliance-check.mjs") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "scripts\enforce.mjs") (Join-Path $agentLeeRoot "sdk\validators\enforce.mjs") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "scripts\generate-mcps.mjs") (Join-Path $agentLeeRoot "sdk\validators\generate-mcps.mjs") | Out-Null
  Copy-IfExists (Join-Path $externalRoot "leeway-pycharm-tools.xml") (Join-Path $agentLeeRoot "sdk\standards\leeway-pycharm-tools.xml") | Out-Null
}

$compileOutput = ""
$packageOutput = ""
$doctorOutput = ""
$doctorFailedChecks = -1
$canDelete = $false
$deleteReason = ""

Push-Location $extensionDir
try {
  $compileOutput = (& npm.cmd run compile | Out-String)
  $packageOutput = (& npx.cmd @vscode/vsce package -o agent-lee-leeway-coding-system.verify.vsix | Out-String)
} finally {
  Pop-Location
}

$doctorOutput = (& powershell.exe -ExecutionPolicy Bypass -File $doctorScript -OutputDir $doctorReportDir | Out-String)
$doctorJsonPath = Join-Path $doctorReportDir "agent-lee-doctor.json"
if (Test-Path $doctorJsonPath) {
  $doctorJson = Get-Content $doctorJsonPath -Raw | ConvertFrom-Json
  $doctorFailedChecks = @($doctorJson.checks | Where-Object { -not $_.pass }).Count
}
$remainingExternalRefs = @()
foreach ($target in @(
  (Join-Path $agentLeeRoot "vscode-extension\src"),
  (Join-Path $agentLeeRoot "voice\voice-runtime.json"),
  (Join-Path $agentLeeRoot "vscode-extension\package.json")
)) {
  if (-not (Test-Path $target)) { continue }
  if ((Get-Item $target).PSIsContainer) {
    $remainingExternalRefs += @(& rg -n "LeeWay-Standards|\.leeway-vscode\\LeeWay-Standards|\.leeway-vscode/LeeWay-Standards" $target 2>$null)
  } else {
    $content = Get-Content $target -Raw
    if ($content -match "LeeWay-Standards|\.leeway-vscode\\LeeWay-Standards|\.leeway-vscode/LeeWay-Standards") {
      $remainingExternalRefs += $target
    }
  }
}
$backupFileCount = if (Test-Path $backupPath) { @(Get-ChildItem -Path $backupPath -Recurse -File -ErrorAction SilentlyContinue).Count } else { 0 }

if (-not (Test-Path $backupPath)) {
  $deleteReason = "Backup path was not created."
} elseif ($backupFileCount -le 0) {
  $deleteReason = "Backup exists but contains zero files."
} elseif ($doctorFailedChecks -ne 0) {
  $deleteReason = "Doctor still reports failing checks."
} elseif ($remainingExternalRefs.Count -gt 0) {
  $deleteReason = "Runtime or repo references to external LeeWay-Standards still remain."
} else {
  $canDelete = Test-Path $externalRoot
}

if ($canDelete) {
  Remove-Item -LiteralPath $externalRoot -Recurse -Force
} elseif (-not $deleteReason) {
  $deleteReason = "Deletion gates did not all pass."
}

$lines = @(
  "# Agent Lee Standalone Migration",
  "",
  "- Generated: $(Get-Date -Format o)",
  "- Workspace: $WorkspaceRoot",
  "- External root: $externalRoot",
  "- Backup path: $backupPath",
  "- Backup file count: $backupFileCount",
  "- Compile executed: yes",
  "- Package executed: yes",
  "- Doctor executed: yes",
  "- Doctor failed checks: $doctorFailedChecks",
  "- Remaining external references: $($remainingExternalRefs.Count)",
  "- Deleted external folder: $(if ($canDelete) { 'yes' } else { 'no' })",
  "- Delete blocking reason: $(if ($deleteReason) { $deleteReason } else { 'none' })",
  "",
  "## Inventory",
  "",
  "- External file count: $(@($inventory).Count)",
  "",
  "## Compile",
  "",
  '```text',
  $compileOutput.Trim(),
  '```',
  "",
  "## Package",
  "",
  '```text',
  $packageOutput.Trim(),
  '```',
  "",
  "## Doctor",
  "",
  '```text',
  $doctorOutput.Trim(),
  '```',
  "",
  "## Remaining External References",
  ""
)

if ($remainingExternalRefs.Count -gt 0) {
  $lines += $remainingExternalRefs
} else {
  $lines += "- none"
}

$lines | Out-File -FilePath $reportPath -Encoding utf8
Write-Output "Standalone migration report: $reportPath"
