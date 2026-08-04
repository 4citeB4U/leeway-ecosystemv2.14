<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SCRIPTS.BUILD_AGENTLEEVSIX
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir,
  [string]$OutputName
)

$ErrorActionPreference = "Stop"

$resolvedExtensionDir = & (Join-Path $PSScriptRoot "Resolve-AgentLeeExtension.ps1") -ExtensionDir $ExtensionDir
$packageJsonPath = Join-Path $resolvedExtensionDir "package.json"
$package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
if (-not $OutputName) {
  $OutputName = "$($package.name)-$($package.version).vsix"
}
$outputPath = Join-Path $resolvedExtensionDir $OutputName

Write-Host "Compiling extension in $resolvedExtensionDir" -ForegroundColor Cyan
Push-Location $resolvedExtensionDir
try {
  & node.exe .\scripts\sync-release-metadata.mjs
  if ($LASTEXITCODE -ne 0) {
    throw "Release metadata sync failed."
  }

  if (-not (Test-Path "node_modules")) {
    if (Test-Path "package-lock.json") {
      & npm.cmd ci
    } else {
      & npm.cmd install
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Dependency install failed."
    }
  }

  & npm.cmd run compile
  if ($LASTEXITCODE -ne 0) {
    throw "TypeScript compile failed."
  }

  if (-not (Test-Path "dist\extension.js")) {
    throw "Compile finished, but dist\extension.js was not created."
  }

  & node.exe .\scripts\package-release.mjs $OutputName
  if ($LASTEXITCODE -ne 0) {
    throw "VSIX packaging failed."
  }
}
finally {
  Pop-Location
}

Write-Host "Built VSIX: $outputPath" -ForegroundColor Green
$outputPath

