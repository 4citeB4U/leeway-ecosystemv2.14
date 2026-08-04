<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.RELEASE_WORKFLOW
PURPOSE: Runs the release-only VSIX workflow, verifies packaged assets and metadata, and writes deterministic packaging evidence.
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

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-extension-release-package-result.json" }
Push-Location $resolvedExtensionDir
try {
  & npm.cmd run compile
  if ($LASTEXITCODE -ne 0) { throw "Compile failed." }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $resolvedExtensionDir "scripts\Invoke-LeeWayGeneratedAppHarness.ps1")
  if ($LASTEXITCODE -ne 0) { throw "Generated app harness failed." }
  & npm.cmd run package
  if ($LASTEXITCODE -ne 0) { throw "Package creation failed." }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $resolvedExtensionDir "scripts\Invoke-LeeWayExtensionAssetCheck.ps1")
  if ($LASTEXITCODE -ne 0) { throw "Asset check failed." }

  $packageJson = Get-Content -LiteralPath (Join-Path $resolvedExtensionDir "package.json") -Raw | ConvertFrom-Json
  $vsixPath = Join-Path $resolvedExtensionDir ("{0}-{1}.vsix" -f $packageJson.name, $packageJson.version)
  $scanRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("leeway-release-package-" + [guid]::NewGuid().ToString("N"))
  Expand-Vsix -VsixPath $vsixPath -DestinationRoot $scanRoot
  $vsixRoot = Join-Path $scanRoot "extension"

  $requiredPaths = @(
    "README.md",
    "build/runtime-build-info.json",
    "media/leeway-activity.svg",
    "media/agent-lee-chat-avatar.svg",
    "media/leeway-logo.svg",
    "media/leeway-standards-logo.png",
    "media/top-right-button-new.png",
    "media/bottom-button-for-agent-lee.png",
    "media/leeway-standards-button.png",
    "media/readme-header.png",
    "media/readme-system-flow.png",
    "out/extension.js",
    "out/plugins/adapters/gmail.adapter.js",
    "out/plugins/adapters/vercel.adapter.js",
    "package.json"
  )
  $missingPaths = @($requiredPaths | Where-Object { -not (Test-Path -LiteralPath (Join-Path $vsixRoot $_)) })
  $releasePackage = Get-Content -LiteralPath (Join-Path $vsixRoot "package.json") -Raw | ConvertFrom-Json
  $result = [pscustomobject]@{
    timestamp = (Get-Date).ToString("o")
    packageVersion = $packageJson.version
    vsixPath = $vsixPath
    requiredPaths = $requiredPaths
    missingPaths = $missingPaths
    packageChecks = [pscustomobject]@{
      openSidebarContributed = @($releasePackage.contributes.commands | ForEach-Object { $_.command }) -contains "agentLee.openSidebar"
      activityBarIcon = [string]$releasePackage.contributes.viewsContainers.activitybar[0].icon
      readmeExists = Test-Path -LiteralPath (Join-Path $vsixRoot "README.md")
      compiledEntrypointExists = Test-Path -LiteralPath (Join-Path $vsixRoot "out\extension.js")
    }
    passed = ($missingPaths.Count -eq 0)
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
  $result | ConvertTo-Json -Depth 8 | Out-File -LiteralPath $resultPath -Encoding utf8
  Remove-Item -LiteralPath $scanRoot -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "Release packaging evidence written to $resultPath" -ForegroundColor Green

  if (-not $result.passed) {
    exit 1
  }
} finally {
  Pop-Location
}
