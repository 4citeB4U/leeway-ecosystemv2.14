<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.ASSET_CHECK
PURPOSE: Verifies LeeWay extension branding asset wiring across package.json, README, webview runtime assets, ignore rules, and packaged VSIX contents.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function Expand-Vsix {
  param(
    [string]$VsixPath,
    [string]$DestinationRoot
  )

  if (Test-Path -LiteralPath $DestinationRoot) {
    Remove-Item -LiteralPath $DestinationRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
  $zipPath = Join-Path $DestinationRoot "package.zip"
  Copy-Item -LiteralPath $VsixPath -Destination $zipPath -Force
  Expand-Archive -LiteralPath $zipPath -DestinationPath $DestinationRoot -Force
  Remove-Item -LiteralPath $zipPath -Force
}

function Get-ReadmeAssetPaths {
  param([string]$ReadmePath)

  $content = Get-Content -LiteralPath $ReadmePath -Raw
  return @([regex]::Matches($content, '(?:\./)?(media/[A-Za-z0-9._-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
}

function Get-SvgReport {
  param([string]$SvgPath)

  if (-not (Test-Path -LiteralPath $SvgPath)) {
    return [pscustomobject]@{
      exists = $false
      isValid = $false
      viewBox = ""
      usesCurrentColor = $false
      hasExternalReferences = $false
      detail = "File not found."
    }
  }

  $raw = Get-Content -LiteralPath $SvgPath -Raw
  $viewBoxMatch = [regex]::Match($raw, 'viewBox\s*=\s*"([^"]+)"')
  $hasCurrentColor = $raw -match 'currentColor'
  $hasExternalReferences = $raw -match '(?:xlink:href|href\s*=\s*"(?!(?:#|data:))|@import|url\(|file://)'
  $isValid = $raw -match '<svg' -and $viewBoxMatch.Success

  [pscustomobject]@{
    exists = $true
    isValid = $isValid
    viewBox = if ($viewBoxMatch.Success) { $viewBoxMatch.Groups[1].Value } else { "" }
    usesCurrentColor = $hasCurrentColor
    hasExternalReferences = $hasExternalReferences
    detail = if ($isValid) { "SVG parsed with viewBox $($viewBoxMatch.Groups[1].Value)." } else { "Missing <svg> root or viewBox." }
  }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$packageJsonPath = Join-Path $resolvedExtensionDir "package.json"
$readmePath = Join-Path $resolvedExtensionDir "README.md"
$ignorePath = Join-Path $resolvedExtensionDir ".vscodeignore"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-extension-asset-check-result.json" }
$packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
$ignoreText = Get-Content -LiteralPath $ignorePath -Raw
$readmeImagePaths = Get-ReadmeAssetPaths -ReadmePath $readmePath
$packageJsonIconPath = [string]$packageJson.contributes.viewsContainers.activitybar[0].icon
$activityBarIconFullPath = Join-Path $resolvedExtensionDir $packageJsonIconPath
$extensionLogoPath = [string]$packageJson.icon
$requiredAssets = @(
  "media/agent-lee-activitybar-icon.svg",
  "media/leeway-activity.svg",
  "media/agent-lee-chat-avatar.svg",
  "media/leeway-logo.svg",
  "media/top-right-button-new.png",
  "media/bottom-button-for-agent-lee.png",
  "media/leeway-standards-button.png",
  "media/leeway-standards-logo.png",
  "media/readme-header.png",
  "media/readme-system-flow.png",
  "media/brand-sources/README.md"
)
$webviewAssetPaths = @(
  "media/agent-lee-chat-avatar.svg",
  "media/leeway-logo.svg",
  "media/top-right-button-new.png",
  "media/bottom-button-for-agent-lee.png",
  "media/leeway-standards-button.png",
  "media/leeway-standards-logo.png"
)
$missingAssets = @($requiredAssets | Where-Object { -not (Test-Path -LiteralPath (Join-Path $resolvedExtensionDir $_)) })
$ignoredAssets = @($requiredAssets + @("README.md", "package.json") | Where-Object {
  $pattern = [regex]::Escape($_).Replace('/', '[\\/]')
  $ignoreText -match "(?m)^$pattern$"
})

$svgReport = Get-SvgReport -SvgPath $activityBarIconFullPath
$vsixPath = Join-Path $resolvedExtensionDir ("{0}-{1}.vsix" -f $packageJson.name, $packageJson.version)
$packagedAssetsPresent = [ordered]@{}
$installedAssetsPresent = [ordered]@{}

if (Test-Path -LiteralPath $vsixPath) {
  $scanRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("leeway-asset-check-" + [guid]::NewGuid().ToString("N"))
  Expand-Vsix -VsixPath $vsixPath -DestinationRoot $scanRoot
  $vsixRoot = Join-Path $scanRoot "extension"
  foreach ($asset in $requiredAssets + @("README.md", "package.json")) {
    $packagedAssetsPresent[$asset] = Test-Path -LiteralPath (Join-Path $vsixRoot $asset)
  }
  Remove-Item -LiteralPath $scanRoot -Recurse -Force -ErrorAction SilentlyContinue
}

$extensionsRoot = Join-Path $env:USERPROFILE ".vscode\extensions"
$installedDir = if (Test-Path -LiteralPath $extensionsRoot) {
  @(Get-ChildItem -LiteralPath $extensionsRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "leeway.$($packageJson.name)-*" } |
    Sort-Object Name -Descending |
    Select-Object -First 1)
} else {
  @()
}

if ($installedDir.Count -gt 0) {
  $installedRoot = $installedDir[0].FullName
  foreach ($asset in $requiredAssets + @("README.md", "package.json")) {
    $installedAssetsPresent[$asset] = Test-Path -LiteralPath (Join-Path $installedRoot $asset)
  }
}

$missingPackagedAssets = @($packagedAssetsPresent.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
$missingInstalledAssets = @($installedAssetsPresent.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
$finalVerdict = if ($missingAssets.Count -gt 0 -or $ignoredAssets.Count -gt 0 -or -not $svgReport.isValid -or $svgReport.hasExternalReferences -or ($packagedAssetsPresent.Count -gt 0 -and $missingPackagedAssets.Count -gt 0)) {
  "FAIL"
} elseif ($installedAssetsPresent.Count -gt 0 -and $missingInstalledAssets.Count -gt 0) {
  "PARTIAL"
} else {
  "PASS"
}

$result = [pscustomobject]@{
  timestamp = (Get-Date).ToString("o")
  extensionDir = $resolvedExtensionDir
  packageVersion = [string]$packageJson.version
  requiredAssets = $requiredAssets
  packageJsonIconPath = $packageJsonIconPath
  extensionLogoPath = $extensionLogoPath
  readmeImagePaths = $readmeImagePaths
  webviewAssetPaths = $webviewAssetPaths
  activityBarSvg = $svgReport
  missingAssets = $missingAssets
  ignoredAssets = $ignoredAssets
  packagedAssetsPresent = [pscustomobject]$packagedAssetsPresent
  installedAssetsPresent = [pscustomobject]$installedAssetsPresent
  finalVerdict = $finalVerdict
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Asset check evidence written to $resultPath" -ForegroundColor Green

if ($finalVerdict -eq "FAIL") {
  exit 1
}
