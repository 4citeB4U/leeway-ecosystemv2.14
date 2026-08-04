<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.INSTALLED_CHECK
PURPOSE: Verifies installed Agent Lee branding assets, README branding text, Activity Bar icon wiring, and source-package-install drift truthfully.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-HashSafe {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash } catch { return "" }
}

function Get-LatestActivationEvidence {
  $logsRoot = Join-Path $env:APPDATA "Code\logs"
  if (-not (Test-Path -LiteralPath $logsRoot)) {
    return [pscustomobject]@{
      liveRuntimeVersion = ""
      liveRuntimePath = ""
      liveRuntimeStatus = "unknown"
      liveRuntimeError = "VS Code logs root not found."
      logPath = ""
    }
  }

  $logFile = Get-ChildItem -LiteralPath $logsRoot -Recurse -Filter "exthost.log" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $logFile) {
    return [pscustomobject]@{
      liveRuntimeVersion = ""
      liveRuntimePath = ""
      liveRuntimeStatus = "unknown"
      liveRuntimeError = "No exthost.log file found."
      logPath = ""
    }
  }

  $content = Get-Content -LiteralPath $logFile.FullName -Raw
  $versionMatch = [regex]::Matches($content, 'leeway\.agent-lee-leeway-coding-system-(\d+\.\d+\.\d+)\\out\\extension\.js') | Select-Object -Last 1
  $pathMatch = [regex]::Matches($content, '([A-Za-z]:\\Users\\Leona\\\.vscode\\extensions\\leeway\.agent-lee-leeway-coding-system-\d+\.\d+\.\d+\\out\\extension\.js)') | Select-Object -Last 1
  $errorMatch = [regex]::Matches($content, 'Activating extension leeway\.agent-lee-leeway-coding-system failed due to an error:\s*[\r\n]+[^\r\n]+') | Select-Object -Last 1

  [pscustomobject]@{
    liveRuntimeVersion = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "" }
    liveRuntimePath = if ($pathMatch.Success) { $pathMatch.Groups[1].Value } else { "" }
    liveRuntimeStatus = if ($errorMatch.Success) { "failed" } elseif ($versionMatch.Success) { "activated" } else { "unknown" }
    liveRuntimeError = if ($errorMatch.Success) { $errorMatch.Value.Trim() } else { "" }
    logPath = $logFile.FullName
  }
}

function Get-LatestInstalledDir {
  param([string]$ExtensionsRoot, [string]$PackageName)

  if (-not (Test-Path -LiteralPath $ExtensionsRoot)) {
    return $null
  }

  return Get-ChildItem -LiteralPath $ExtensionsRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "leeway.$PackageName-*" } |
    ForEach-Object {
      $package = Read-JsonFile -Path (Join-Path $_.FullName "package.json")
      [pscustomobject]@{
        Directory = $_
        Version = if ($package) { [version]([string]$package.version) } else { [version]"0.0.0" }
      }
    } |
    Sort-Object Version -Descending |
    Select-Object -First 1
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$packageJson = Read-JsonFile -Path (Join-Path $resolvedExtensionDir "package.json")
$repoBuildInfo = Read-JsonFile -Path (Join-Path $resolvedExtensionDir "build\runtime-build-info.json")
$repoVersion = if ($repoBuildInfo) { [string]$repoBuildInfo.packageVersion } else { [string]$packageJson.version }
$repoRuntimeHash = Get-HashSafe -Path (Join-Path $resolvedExtensionDir "out\extension.js")
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-installed-extension-check-result.json" }
$extensionsRoot = Join-Path $env:USERPROFILE ".vscode\extensions"
$installedCandidate = Get-LatestInstalledDir -ExtensionsRoot $extensionsRoot -PackageName $packageJson.name
$installedDir = if ($installedCandidate) { $installedCandidate.Directory } else { $null }

if (-not $installedDir) {
  $result = [pscustomobject]@{
    timestamp = (Get-Date).ToString("o")
    sourceVersion = $repoVersion
    installedVersion = ""
    installedPath = ""
    staleDetected = $true
    staleReason = "INSTALLED_EXTENSION_NOT_FOUND"
    finalVerdict = "FAIL"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
  $result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
  exit 1
}

$installedPath = $installedDir.FullName
$installedPackage = Read-JsonFile -Path (Join-Path $installedPath "package.json")
$installedVersion = [string]$installedPackage.version
$installedRuntimeHash = Get-HashSafe -Path (Join-Path $installedPath "out\extension.js")
$installedReadmePath = Join-Path $installedPath "README.md"
$installedReadmeText = if (Test-Path -LiteralPath $installedReadmePath) { Get-Content -LiteralPath $installedReadmePath -Raw } else { "" }
$requiredAssets = @(
  "media/leeway-activity.svg",
  "media/agent-lee-chat-avatar.svg",
  "media/leeway-logo.svg",
  "media/top-right-button-new.png",
  "media/bottom-button-for-agent-lee.png",
  "media/leeway-standards-button.png",
  "media/leeway-standards-logo.png",
  "media/readme-header.png",
  "media/readme-system-flow.png"
)
$installedAssetsPresent = [ordered]@{}
foreach ($asset in $requiredAssets) {
  $installedAssetsPresent[$asset] = Test-Path -LiteralPath (Join-Path $installedPath $asset)
}
$missingInstalledAssets = @($installedAssetsPresent.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
$readmeAssetPaths = @([regex]::Matches($installedReadmeText, '(?:\./)?(media/[A-Za-z0-9._-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
$packageJsonIconPath = [string]$installedPackage.contributes.viewsContainers.activitybar[0].icon
$packageIconPath = [string]$installedPackage.icon
$liveRuntime = Get-LatestActivationEvidence
$versionMatches = ($repoVersion -eq $installedVersion)
$hashMatches = ($repoRuntimeHash -and $installedRuntimeHash -and $repoRuntimeHash -eq $installedRuntimeHash)
$liveRuntimeMatches = ($liveRuntime.liveRuntimeVersion -eq $installedVersion)

$staleReason = @()
if (-not $versionMatches) { $staleReason += "STALE_LOCAL_PACKAGE" }
if (-not $hashMatches) { $staleReason += "INSTALLED_RUNTIME_HASH_MISMATCH" }
if ($liveRuntime.liveRuntimeVersion -and -not $liveRuntimeMatches) { $staleReason += "LIVE_RUNTIME_VERSION_MISMATCH" }
if ($liveRuntime.liveRuntimeStatus -eq "failed") { $staleReason += "LIVE_RUNTIME_FAILED" }
if ($missingInstalledAssets.Count -gt 0) { $staleReason += "MISSING_INSTALLED_BRANDING_ASSETS" }

$finalVerdict = if ($missingInstalledAssets.Count -gt 0 -and $versionMatches -and $hashMatches) {
  "FAIL"
} elseif ($staleReason.Count -gt 0) {
  "PARTIAL"
} else {
  "PASS"
}

$result = [pscustomobject]@{
  timestamp = (Get-Date).ToString("o")
  sourceVersion = $repoVersion
  installedVersion = $installedVersion
  installedPath = $installedPath
  packageJsonIconPath = $packageJsonIconPath
  packageIconPath = $packageIconPath
  readmeAssetPaths = $readmeAssetPaths
  installedAssetsPresent = [pscustomobject]$installedAssetsPresent
  missingInstalledAssets = $missingInstalledAssets
  readmeContainsBrandingText = ($installedReadmeText -match "Agent Lee LeeWay Coding System")
  readmeContainsPairedAdminOS = ($installedReadmeText -match "Paired AdminOS")
  readmeContainsRuntimeTruth = ($installedReadmeText -match "Runtime truth")
  repoRuntimeHash = $repoRuntimeHash
  installedRuntimeHash = $installedRuntimeHash
  staleDetected = ($staleReason.Count -gt 0)
  staleReason = $staleReason
  liveRuntime = [pscustomobject]@{
    version = $liveRuntime.liveRuntimeVersion
    path = $liveRuntime.liveRuntimePath
    status = $liveRuntime.liveRuntimeStatus
    error = $liveRuntime.liveRuntimeError
    logPath = $liveRuntime.logPath
  }
  finalVerdict = $finalVerdict
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Installed extension evidence written to $resultPath" -ForegroundColor Green

if ($finalVerdict -eq "FAIL") {
  exit 1
}
