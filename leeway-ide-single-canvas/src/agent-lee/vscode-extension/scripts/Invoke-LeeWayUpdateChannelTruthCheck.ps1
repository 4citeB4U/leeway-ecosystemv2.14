<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.UPDATE_CHANNEL_TRUTH
PURPOSE: Truthfully classifies the Agent Lee update channel and explains when automatic updates are unavailable for local VSIX installs.
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
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json } catch { return $null }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$evidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $evidenceDir "leeway-update-channel-truth-result.json" }
$runtimeCheck = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-extension-runtime-check-result.json")
$installedCheck = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-installed-extension-check-result.json")
$installCurrent = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-extension-install-current-result.json")
$buildInfo = Read-JsonFile -Path (Join-Path $resolvedExtensionDir "build\runtime-build-info.json")

$updateChannel = if (
  $installCurrent -and
  [bool]$installCurrent.installAttempted -and
  [string]$installCurrent.latestVsixVersion -and
  [string]$installedCheck.installedVersion -eq [string]$installCurrent.latestVsixVersion
) {
  "UPDATE_CHANNEL_MANUAL_LOCAL_VSIX"
} else {
  "UPDATE_CHANNEL_UNKNOWN"
}

$autoUpdateTruth = if ($updateChannel -eq "UPDATE_CHANNEL_MANUAL_LOCAL_VSIX") {
  "AUTO_UPDATE_NOT_AVAILABLE_FOR_LOCAL_VSIX"
} else {
  "UNKNOWN_UPDATE_PATH"
}

$finalVerdict = if ($updateChannel -eq "UPDATE_CHANNEL_MANUAL_LOCAL_VSIX") { "PASS" } else { "PARTIAL" }

$result = [pscustomobject]@{
  gate = "LEEWAY_UPDATE_CHANNEL_TRUTH"
  generatedAt = (Get-Date).ToString("o")
  currentInstalledVersion = [string]$installedCheck.installedVersion
  latestPackageVersion = [string]$buildInfo.packageVersion
  updateChannel = $updateChannel
  autoUpdateTruth = $autoUpdateTruth
  manualUpdatePath = "Agent Lee: Install Current Build"
  sourceEvidence = (Join-Path $evidenceDir "leeway-extension-install-current-result.json")
  finalVerdict = $finalVerdict
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Update channel truth written to $resultPath" -ForegroundColor Green

if ($finalVerdict -eq "FAIL") { exit 1 }
