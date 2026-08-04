<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.README_LIVE_PROOF
PURPOSE: Verifies README source/package/install/live proof alignment, media order, and current version truth for the Agent Lee extension.
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

function Read-TextFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return Get-Content -LiteralPath $Path -Raw
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$evidenceDir = Join-Path $resolvedExtensionDir "test-evidence"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $evidenceDir "leeway-readme-live-proof-result.json" }
$buildInfo = Read-JsonFile -Path (Join-Path $resolvedExtensionDir "build\runtime-build-info.json")
$installedCheck = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-installed-extension-check-result.json")
$liveVisual = Read-JsonFile -Path (Join-Path $evidenceDir "leeway-extension-live-visual-validation-result.json")
$readme = Read-TextFile -Path (Join-Path $resolvedExtensionDir "README.md")

$logoIndex = $readme.IndexOf("![LeeWay Logo](./media/leeway-logo.svg)")
$headerIndex = $readme.IndexOf("![Agent Lee LeeWay Coding System](./media/readme-header.png)")
$flowIndex = $readme.IndexOf("![Agent Lee System Flow](./media/readme-system-flow.png)")
$expectedVersionLine = "Current packaged release in this workspace: ``$([string]$buildInfo.packageVersion)``."
$sourceVersionOk = $readme.Contains($expectedVersionLine)

$sourceStatus = if ($logoIndex -ge 0 -and $headerIndex -gt $logoIndex -and $flowIndex -gt $headerIndex -and $sourceVersionOk) { "PASS" } else { "FAIL" }
$packageStatus = if ([bool]$installedCheck.readmeContainsBrandingText -and [bool]$installedCheck.readmeContainsRuntimeTruth) { "PASS" } else { "PARTIAL" }
$installedStatus = if ($installedCheck -and $installedCheck.readmeAssetPaths.Count -ge 3) { "PASS" } else { "FAIL" }
$liveRenderStatus = if ([string]$liveVisual.finalVerdict -eq "PASS" -and [bool]$liveVisual.readmeHeaderVisible -and [bool]$liveVisual.readmeSystemFlowVisible) { "PASS" } elseif ([string]$liveVisual.finalVerdict -eq "FAIL") { "FAIL" } else { "PARTIAL" }

$finalVerdict = if ($sourceStatus -eq "PASS" -and $packageStatus -eq "PASS" -and $installedStatus -eq "PASS" -and $liveRenderStatus -eq "PASS") {
  "PASS"
} elseif ($sourceStatus -eq "FAIL" -or $installedStatus -eq "FAIL" -or $liveRenderStatus -eq "FAIL") {
  "FAIL"
} else {
  "PARTIAL"
}

$result = [pscustomobject]@{
  gate = "LEEWAY_README_LIVE_PROOF"
  generatedAt = (Get-Date).ToString("o")
  finalVerdict = $finalVerdict
  sourceStatus = $sourceStatus
  packageStatus = $packageStatus
  installedStatus = $installedStatus
  liveRenderStatus = $liveRenderStatus
  versionExpected = [string]$buildInfo.packageVersion
  versionPresent = [bool]$sourceVersionOk
  imageOrder = [pscustomobject]@{
    logoIndex = $logoIndex
    headerIndex = $headerIndex
    systemFlowIndex = $flowIndex
    correctOrder = ($logoIndex -ge 0 -and $headerIndex -gt $logoIndex -and $flowIndex -gt $headerIndex)
  }
  liveEvidencePath = (Join-Path $evidenceDir "leeway-extension-live-visual-validation-result.json")
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "README live proof written to $resultPath" -ForegroundColor Green

if ($finalVerdict -eq "FAIL") { exit 1 }
