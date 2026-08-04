<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.DEV_RELOAD
PURPOSE: Makes source-driven Extension Development Host the normal Agent Lee workflow and records evidence for dev reload readiness.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [switch]$SkipLaunch,
  [string]$EvidencePath
)

$ErrorActionPreference = "Stop"
$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$repoRoot = (Resolve-Path (Join-Path $resolvedExtensionDir "..\..")).Path
$codeCli = Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-extension-dev-reload-result.json" }

Push-Location $resolvedExtensionDir
try {
  & npm.cmd run compile
  if ($LASTEXITCODE -ne 0) { throw "Compile failed." }

  $launched = $false
  if (-not $SkipLaunch -and (Test-Path -LiteralPath $codeCli)) {
    Start-Process -FilePath $codeCli -ArgumentList @("--extensionDevelopmentPath=$resolvedExtensionDir", $repoRoot)
    $launched = $true
  }

  $result = [pscustomobject]@{
    timestamp = (Get-Date).ToString("o")
    extensionDir = $resolvedExtensionDir
    repoRoot = $repoRoot
    compilePassed = $true
    launchedExtensionDevelopmentHost = $launched
    codeCli = $codeCli
    recommendedLoop = "F5 / Extension Development Host from .vscode/launch.json"
    skipLaunch = [bool]$SkipLaunch
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
  $result | ConvertTo-Json -Depth 6 | Out-File -LiteralPath $resultPath -Encoding utf8
  Write-Host "Dev reload evidence written to $resultPath" -ForegroundColor Green
} finally {
  Pop-Location
}
