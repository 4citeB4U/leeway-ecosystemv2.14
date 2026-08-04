<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.INSTALL_CURRENT
PURPOSE: Install the newest verified local Agent Lee VSIX, verify the installed package on disk, and report whether the live VS Code window still needs reload.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Compare-Version {
  param([string]$Left, [string]$Right)
  $leftParts = $Left.Split(".") | ForEach-Object { [int]($_) }
  $rightParts = $Right.Split(".") | ForEach-Object { [int]($_) }
  $max = [Math]::Max($leftParts.Count, $rightParts.Count)
  for ($i = 0; $i -lt $max; $i++) {
    $l = if ($i -lt $leftParts.Count) { $leftParts[$i] } else { 0 }
    $r = if ($i -lt $rightParts.Count) { $rightParts[$i] } else { 0 }
    if ($l -gt $r) { return 1 }
    if ($l -lt $r) { return -1 }
  }
  return 0
}

function Get-LatestVsix {
  param([string]$ExtensionPath)
  $files = @(Get-ChildItem -LiteralPath $ExtensionPath -Filter "agent-lee-leeway-coding-system-*.vsix" -ErrorAction SilentlyContinue)
  if (-not $files.Count) { return $null }
  return $files | ForEach-Object {
    $match = [regex]::Match($_.Name, '(\d+\.\d+\.\d+)\.vsix$')
    [pscustomobject]@{
      Path = $_.FullName
      Version = if ($match.Success) { $match.Groups[1].Value } else { "" }
      Name = $_.Name
      VersionObject = if ($match.Success) { [version]$match.Groups[1].Value } else { [version]"0.0.0" }
    }
  } | Sort-Object VersionObject -Descending | Select-Object -First 1
}

function Get-InstalledCandidates {
  param([string]$ExtensionsRoot)

  if (-not (Test-Path -LiteralPath $ExtensionsRoot)) {
    return @()
  }

  return @(Get-ChildItem -LiteralPath $ExtensionsRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "leeway.agent-lee-leeway-coding-system-*" } |
    ForEach-Object {
      $package = Read-JsonFile -Path (Join-Path $_.FullName "package.json")
      [pscustomobject]@{
        Directory = $_
        Name = $_.Name
        Version = if ($package) { [version]([string]$package.version) } else { [version]"0.0.0" }
      }
    } |
    Sort-Object Version -Descending)
}

function Resolve-CodeCli {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"),
    (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code Insiders\bin\code-insiders.cmd")
  )
  try {
    $command = Get-Command code -ErrorAction Stop
    if ($command.Path) {
      if ($command.Path -match '\.cmd$') {
        $candidates += $command.Path
      }
      if ($command.Path -match 'Code\.exe$') {
        $binCandidate = Join-Path (Split-Path (Split-Path $command.Path -Parent) -Parent) "bin\code.cmd"
        $candidates += $binCandidate
      }
    }
  } catch {}
  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }
  return ""
}

function New-ManualSteps {
  param([string]$VsixPath)
  @(
    "1. Open VS Code.",
    "2. Run: Extensions: Uninstall Extension for 'leeway.agent-lee-leeway-coding-system'.",
    "3. Run in a terminal: code --install-extension `"$VsixPath`" --force",
    "4. Reload VS Code.",
    "5. Re-run Invoke-LeeWayInstalledExtensionCheck.ps1."
  )
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$evidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
$resultPath = Join-Path $evidenceDir "leeway-extension-install-current-result.json"
$reportPath = Join-Path (Join-Path (Split-Path $resolvedExtensionDir -Parent) "receipts") "leeway_extension_install_current_report.md"
$latestVsix = Get-LatestVsix -ExtensionPath $resolvedExtensionDir
$codeCli = Resolve-CodeCli
$extensionsRoot = Join-Path $env:USERPROFILE ".vscode\extensions"
$installedBefore = @(Get-InstalledCandidates -ExtensionsRoot $extensionsRoot | Select-Object -ExpandProperty Name)
$manualSteps = @()
$uninstallAttempted = $false
$installAttempted = $false
$installSucceeded = $false
$caveats = New-Object System.Collections.Generic.List[string]

if (-not $latestVsix) {
  throw "No local Agent Lee VSIX was found in $resolvedExtensionDir."
}

if (-not $codeCli) {
  $manualSteps = New-ManualSteps -VsixPath $latestVsix.Path
  $caveats.Add("VS Code CLI was not found. No uninstall or install was attempted.")
  $result = [pscustomobject]@{
    timestamp = (Get-Date).ToString("o")
    latestVsixPath = $latestVsix.Path
    latestVsixVersion = $latestVsix.Version
    installedBefore = $installedBefore
    uninstallAttempted = $false
    installAttempted = $false
    installedAfter = @()
    commandContributionPresent = $false
    activationEventPresent = $false
    mediaAssetsPresent = $false
    readmeAssetsPresent = $false
    readmeContainsPairedAdminOS = $false
    readmeContainsCurrentVersion = $false
    adapterCrashRisk = $true
    finalVerdict = "MANUAL_REQUIRED"
    caveats = @($caveats)
    manualSteps = $manualSteps
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
  $result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
  $report = @"
<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.INSTALL_CURRENT.REPORT
PURPOSE: Manual-required result for current local Agent Lee VSIX installation.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# LeeWay Extension Install Current Report

Final verdict: MANUAL_REQUIRED

The newest verified local VSIX is `$($latestVsix.Name)` (`$($latestVsix.Version)`), but VS Code CLI was not found, so the install was not attempted.

Manual steps:
$($manualSteps | ForEach-Object { "- $_" } | Out-String)
"@
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportPath) | Out-Null
  $report | Out-File -LiteralPath $reportPath -Encoding utf8
  exit 0
}

& $codeCli --uninstall-extension leeway.agent-lee-leeway-coding-system 2>&1 | Out-Null
$uninstallAttempted = $true

try {
  & $codeCli --install-extension $latestVsix.Path --force 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $installSucceeded = $true
  }
} catch {
  $caveats.Add($_.Exception.Message)
}
$installAttempted = $true

$installedAfter = @(Get-InstalledCandidates -ExtensionsRoot $extensionsRoot)
$installedDir = $installedAfter | Select-Object -First 1
$installedDirPath = if ($installedDir) { $installedDir.Directory.FullName } else { "" }
$installedPackage = if ($installedDirPath) { Read-JsonFile -Path (Join-Path $installedDirPath "package.json") } else { $null }
$installedReadmePath = if ($installedDirPath) { Join-Path $installedDirPath "README.md" } else { "" }
$installedReadmeText = if ($installedReadmePath -and (Test-Path -LiteralPath $installedReadmePath)) { Get-Content -LiteralPath $installedReadmePath -Raw } else { "" }
$mediaAssets = @(
  "media/leeway-activity.svg",
  "media/agent-lee-chat-avatar.svg",
  "media/leeway-logo.svg",
  "media/leeway-standards-logo.png",
  "media/top-right-button-new.png",
  "media/bottom-button-for-agent-lee.png",
  "media/leeway-standards-button.png",
  "media/readme-header.png",
  "media/readme-system-flow.png"
)
$adapterAssets = @(
  "out/plugins/adapters/gmail.adapter.js",
  "out/plugins/adapters/vercel.adapter.js"
)
$mediaAssetsPresent = $installedDirPath -and (@($mediaAssets | Where-Object { -not (Test-Path -LiteralPath (Join-Path $installedDirPath $_)) }).Count -eq 0)
$readmeAssets = @([regex]::Matches($installedReadmeText, '(?:\./)?(media/[A-Za-z0-9._-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
$readmeAssetsPresent = $installedDirPath -and (@($readmeAssets | Where-Object { -not (Test-Path -LiteralPath (Join-Path $installedDirPath $_)) }).Count -eq 0)
$commandContributionPresent = [bool]($installedPackage -and (@($installedPackage.contributes.commands | ForEach-Object { $_.command }) -contains "agentLee.openSidebar"))
$activationEventPresent = [bool]($installedPackage -and (@($installedPackage.activationEvents) -contains "onCommand:agentLee.openSidebar"))
$adapterCrashRisk = $installedDirPath -and (@($adapterAssets | Where-Object { -not (Test-Path -LiteralPath (Join-Path $installedDirPath $_)) }).Count -gt 0)

if ($installSucceeded) {
  $caveats.Add("VS Code must reload before the live extension host can switch to the newly installed version.")
}

$finalVerdict = if (-not $installSucceeded) { "FAIL" } elseif (-not $installedDir) { "FAIL" } elseif (-not $commandContributionPresent -or -not $activationEventPresent -or -not $mediaAssetsPresent -or -not $readmeAssetsPresent -or $adapterCrashRisk) { "FAIL" } else { "PASS" }

$result = [pscustomobject]@{
  timestamp = (Get-Date).ToString("o")
  latestVsixPath = $latestVsix.Path
  latestVsixVersion = $latestVsix.Version
  installedBefore = $installedBefore
  uninstallAttempted = $uninstallAttempted
  installAttempted = $installAttempted
  installedAfter = @($installedAfter | ForEach-Object { $_.Name })
  installedVersionAfter = if ($installedPackage) { [string]$installedPackage.version } else { "" }
  commandContributionPresent = $commandContributionPresent
  activationEventPresent = $activationEventPresent
  mediaAssetsPresent = $mediaAssetsPresent
  readmeAssetsPresent = $readmeAssetsPresent
  readmeContainsPairedAdminOS = $installedReadmeText -match "Paired AdminOS"
  readmeContainsCurrentVersion = $installedReadmeText -match [regex]::Escape($latestVsix.Version)
  adapterCrashRisk = [bool]$adapterCrashRisk
  finalVerdict = $finalVerdict
  caveats = @($caveats)
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8

$report = @"
<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.INSTALL_CURRENT.REPORT
PURPOSE: Result of installing the current local Agent Lee VSIX.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# LeeWay Extension Install Current Report

Final verdict: $finalVerdict

Latest VSIX: `$($latestVsix.Name)`
Installed before: $((@($installedBefore) -join ", "))
Installed after: $((@($installedAfter | ForEach-Object { $_.Name }) -join ", "))
Command contribution present: $commandContributionPresent
Activation event present: $activationEventPresent
Media assets present: $mediaAssetsPresent
README assets present: $readmeAssetsPresent
Adapter crash risk: $adapterCrashRisk

Caveats:
$((@($caveats) | ForEach-Object { "- $_" }) -join "`n")
"@

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportPath) | Out-Null
$report | Out-File -LiteralPath $reportPath -Encoding utf8

if ($finalVerdict -eq "FAIL") {
  exit 1
}
