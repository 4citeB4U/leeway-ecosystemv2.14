<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.ASSET_REGISTRY_CHECK
PURPOSE: Verifies LeeWay asset registry coverage and ensures package icon, Activity Bar icon, README media, chat avatar, and sidebar button vocabulary remain distinct and aligned.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"

function Read-TextFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return "" }
  return Get-Content -LiteralPath $Path -Raw
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json } catch { return $null }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-asset-registry-check-result.json" }
$registryPath = Join-Path $resolvedExtensionDir "src\core\branding\leewayAssetRegistry.ts"
$packageJson = Read-JsonFile -Path (Join-Path $resolvedExtensionDir "package.json")
$readmeText = Read-TextFile -Path (Join-Path $resolvedExtensionDir "README.md")

$assets = @(
  @{ id = "LEEWAY_ASSET::PACKAGE_ICON"; path = "media/leeway-standards-logo.png"; target = "packageIcon" },
  @{ id = "LEEWAY_ASSET::ACTIVITY_BAR_ICON"; path = "media/leeway-activity.svg"; target = "activityBar" },
  @{ id = "LEEWAY_ASSET::CHAT_HEADER_AVATAR"; path = "media/agent-lee-chat-avatar.svg"; target = "chatAvatar" },
  @{ id = "LEEWAY_ASSET::README_PRIMARY_LOGO"; path = "media/leeway-logo.svg"; target = "readmePrimaryLogo" },
  @{ id = "LEEWAY_ASSET::README_HEADER_IMAGE"; path = "media/readme-header.png"; target = "readmeHeader" },
  @{ id = "LEEWAY_ASSET::README_SYSTEM_FLOW"; path = "media/readme-system-flow.png"; target = "readmeSystemFlow" },
  @{ id = "LEEWAY_ASSET::SIDEBAR_TOP_RIGHT_BUTTON"; path = "media/top-right-button-new.png"; target = "topRightButton" },
  @{ id = "LEEWAY_ASSET::SIDEBAR_BOTTOM_BUTTON"; path = "media/bottom-button-for-agent-lee.png"; target = "bottomButton" },
  @{ id = "LEEWAY_ASSET::LEEWAY_STANDARDS_BUTTON"; path = "media/leeway-standards-button.png"; target = "standardsButton" },
  @{ id = "LEEWAY_ASSET::STATUS_BAR_MARK"; path = "media/leeway-standards-button.png"; target = "statusBarMark" }
)

$checks = foreach ($asset in $assets) {
  [pscustomobject]@{
    assetId = $asset.id
    path = $asset.path
    exists = Test-Path -LiteralPath (Join-Path $resolvedExtensionDir $asset.path)
  }
}

$activityBarPath = [string]$packageJson.contributes.viewsContainers.activitybar[0].icon
$packageIconPath = [string]$packageJson.icon
$readmeHasLogo = $readmeText -match '!\[LeeWay Logo\]\(\./media/leeway-logo\.svg\)'
$readmeHasHeader = $readmeText -match '!\[Agent Lee LeeWay Coding System\]\(\./media/readme-header\.png\)'
$readmeHasFlow = $readmeText -match '!\[Agent Lee System Flow\]\(\./media/readme-system-flow\.png\)'

$status = if (
  (Test-Path -LiteralPath $registryPath) -and
  ($checks.Where({ -not $_.exists }).Count -eq 0) -and
  ($activityBarPath -eq "media/leeway-activity.svg") -and
  ($packageIconPath -eq "media/leeway-standards-logo.png") -and
  $readmeHasLogo -and $readmeHasHeader -and $readmeHasFlow
) { "PASS" } else { "FAIL" }

$result = [pscustomobject]@{
  gate = "LEEWAY_ASSET_REGISTRY_CHECK"
  generatedAt = (Get-Date).ToString("o")
  status = $status
  registryPath = $registryPath
  packageIconPath = $packageIconPath
  activityBarIconPath = $activityBarPath
  readmeLogoPresent = $readmeHasLogo
  readmeHeaderPresent = $readmeHasHeader
  readmeSystemFlowPresent = $readmeHasFlow
  assets = $checks
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
$result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
Write-Host "Asset registry check written to $resultPath" -ForegroundColor Green

if ($status -eq "FAIL") { exit 1 }

