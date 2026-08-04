<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟢 CORE
TAG: CORE.RECOVERY.QUARANTINE.MAIN
PURPOSE: Preserves historical evidence while moving dead or harmful artifacts out of compile, package, and context surfaces.

5WH:
WHAT = Quarantine recovery script for Agent Lee runtime-governance cleanup.
WHY = Establishes hard archive boundaries without deleting historical evidence.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/scripts/Invoke-AgentLeeQuarantineRecovery.ps1
WHEN = 2026
HOW = Moves known artifact clusters into a dated archive root and writes a recovery receipt.
#>

param(
  [string]$WorkspaceDir = (Join-Path $PSScriptRoot "..\.."),
  [string]$ArchiveRoot,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-CanonicalWorkspaceRoot {
  param([string]$RuntimeWorkspaceRoot)

  $runtimeRoot = [System.IO.Path]::GetFullPath($RuntimeWorkspaceRoot)
  if ([System.IO.Path]::GetFileName($runtimeRoot) -ieq '.leeway-vscode') {
    return [System.IO.Path]::GetFullPath((Split-Path -Parent $runtimeRoot))
  }

  return $runtimeRoot
}

function Add-MovePlan {
  param(
    [System.Collections.Generic.List[object]]$Plan,
    [string]$Source,
    [string]$Target
  )

  $Plan.Add([pscustomobject]@{
    source = $Source
    target = $Target
    exists = Test-Path -LiteralPath $Source
  }) | Out-Null
}

function Add-MovePlanFromPattern {
  param(
    [System.Collections.Generic.List[object]]$Plan,
    [string]$WorkspaceRoot,
    [string]$RelativePattern,
    [string]$ArchiveCategory,
    [switch]$IncludeDirectories
  )

  $candidatePath = Join-Path $WorkspaceRoot $RelativePattern
  $items = Get-ChildItem -Path $candidatePath -Force -ErrorAction SilentlyContinue
  foreach ($item in $items) {
    if (-not $IncludeDirectories -and $item.PSIsContainer) {
      continue
    }

    $relativePath = $item.FullName.Substring($WorkspaceRoot.Length).TrimStart('\')
    $target = Join-Path $ArchiveRoot (Join-Path $ArchiveCategory $relativePath)
    Add-MovePlan -Plan $Plan -Source $item.FullName -Target $target
  }
}

function Invoke-PlannedMove {
  param(
    [string]$Source,
    [string]$Target,
    [switch]$DryRun
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    return [pscustomobject]@{
      source = $Source
      target = $Target
      status = "missing"
    }
  }

  if ($DryRun) {
    return [pscustomobject]@{
      source = $Source
      target = $Target
      status = "planned"
    }
  }

  $targetDir = Split-Path -Parent $Target
  if (-not (Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  Move-Item -LiteralPath $Source -Destination $Target -Force
  return [pscustomobject]@{
    source = $Source
    target = $Target
    status = "moved"
  }
}

$resolvedWorkspace = (Resolve-Path $WorkspaceDir).Path
$canonicalWorkspaceRoot = Resolve-CanonicalWorkspaceRoot -RuntimeWorkspaceRoot $resolvedWorkspace
$canonicalArchiveRoot = Join-Path $canonicalWorkspaceRoot 'Archive'
if (-not $ArchiveRoot) {
  $ArchiveRoot = Join-Path $canonicalArchiveRoot 'quarantine-recovery\agent-lee-2026-05-11'
}

$requiredAuthorityPaths = @(
  (Join-Path $canonicalWorkspaceRoot 'LeeWay-Standards'),
  (Join-Path $canonicalWorkspaceRoot '.leeway-vscode'),
  $canonicalArchiveRoot
)

foreach ($requiredPath in $requiredAuthorityPaths) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Canonical LeeWay workspace root is invalid for quarantine recovery: missing '$requiredPath'."
  }
}

$plan = New-Object System.Collections.Generic.List[object]

$compiledBackupFiles = @(
  "agent-lee\vscode-extension\src\extension.backup-command-bootstrap-20260511-104453.ts",
  "agent-lee\vscode-extension\src\extension.backup-rightpanel-20260511-092038.ts",
  "agent-lee\vscode-extension\src\extension.broken-20260511-085621.ts",
  "agent-lee\vscode-extension\src\visual-intelligence\visualPanel.broken-20260511-085621.ts",
  "agent-lee\vscode-extension\out\extension.backup-command-bootstrap-20260511-104453.js",
  "agent-lee\vscode-extension\out\extension.backup-command-bootstrap-20260511-104453.js.map",
  "agent-lee\vscode-extension\out\extension.backup-rightpanel-20260511-092038.js",
  "agent-lee\vscode-extension\out\extension.backup-rightpanel-20260511-092038.js.map",
  "agent-lee\vscode-extension\out\extension.broken-20260511-085621.js",
  "agent-lee\vscode-extension\out\extension.broken-20260511-085621.js.map",
  "agent-lee\vscode-extension\out\visual-intelligence\visualPanel.broken-20260511-085621.js",
  "agent-lee\vscode-extension\out\visual-intelligence\visualPanel.broken-20260511-085621.js.map"
)
foreach ($relativePath in $compiledBackupFiles) {
  $source = Join-Path $resolvedWorkspace $relativePath
  $target = Join-Path $ArchiveRoot (Join-Path "compiled-backups" $relativePath)
  Add-MovePlan -Plan $plan -Source $source -Target $target
}

Add-MovePlanFromPattern -Plan $plan -WorkspaceRoot $resolvedWorkspace -RelativePattern "agent-lee\vscode-extension\*.vsix" -ArchiveCategory "release-artifacts"
Add-MovePlanFromPattern -Plan $plan -WorkspaceRoot $resolvedWorkspace -RelativePattern "agent-lee-leeway-coding-system-*.vsix" -ArchiveCategory "release-artifacts"
Add-MovePlan -Plan $plan -Source (Join-Path $resolvedWorkspace "agent-lee\vscode-extension\_vsix_inspect") -Target (Join-Path $ArchiveRoot "release-artifacts\agent-lee\vscode-extension\_vsix_inspect")

$historicalDocs = @(
  "AUTO_UPDATE_FIX_SUMMARY.md",
  "AUTO_UPDATE_IMPLEMENTATION_COMPLETE.md",
  "EXTENSION_INSTALL_REPORT.md",
  "agent-lee\vscode-extension\TEST_VERIFICATION_REPORT.md"
)
foreach ($relativePath in $historicalDocs) {
  $source = Join-Path $resolvedWorkspace $relativePath
  $target = Join-Path $ArchiveRoot (Join-Path "historical-docs" $relativePath)
  Add-MovePlan -Plan $plan -Source $source -Target $target
}

$duplicateMedia = @(
  "all buttons.png",
  "bottom button for agent lee .png",
  "top  right button .png",
  "readme.md-image-header.png",
  "readms.md-image-1.png",
  "leeway-standards-button.png",
  "LeeWayStandardslogo.png",
  "agent-lee\vscode-extension\media\test-extension.ps1"
)
foreach ($relativePath in $duplicateMedia) {
  $source = Join-Path $resolvedWorkspace $relativePath
  $target = Join-Path $ArchiveRoot (Join-Path "duplicate-media" $relativePath)
  Add-MovePlan -Plan $plan -Source $source -Target $target
}

$historicalReports = @(
  "reports\packaged-validation-2026-05-06T20-53-13",
  "reports\packaged-validation-2026-05-11T11-48-03",
  "reports\stable-release",
  "reports\standalone-migration",
  "reports\extension-pipeline",
  "reports\extension-repair",
  "reports\local-extension",
  "reports\truth-audit",
  "reports\vscode-visibility",
  "reports\hive-verify"
)
foreach ($relativePath in $historicalReports) {
  $source = Join-Path $resolvedWorkspace $relativePath
  $target = Join-Path $ArchiveRoot (Join-Path "historical-reports" $relativePath)
  Add-MovePlan -Plan $plan -Source $source -Target $target
}

$results = foreach ($item in $plan) {
  Invoke-PlannedMove -Source $item.source -Target $item.target -DryRun:$DryRun
}

$receiptDir = Join-Path $resolvedWorkspace "reports\engineering-runs"
New-Item -ItemType Directory -Force -Path $receiptDir | Out-Null
$receiptPath = Join-Path $receiptDir ("quarantine-recovery-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".md")

$lines = @(
  "# Quarantine Recovery Receipt",
  "",
  "- Generated: $(Get-Date -Format o)",
  "- Workspace: $resolvedWorkspace",
  "- Canonical workspace root: $canonicalWorkspaceRoot",
  "- Archive root: $ArchiveRoot",
  "- Mode: $(if ($DryRun) { 'dry-run' } else { 'apply' })",
  "",
  "## Results"
)

foreach ($result in $results) {
  $lines += "- [$($result.status)] $($result.source) -> $($result.target)"
}

$lines | Out-File -FilePath $receiptPath -Encoding utf8
Write-Host "Quarantine recovery receipt written to $receiptPath" -ForegroundColor Green
$results
