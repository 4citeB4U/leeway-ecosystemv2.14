<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SCRIPTS.INSTALL_AGENTLEEVSIX
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$VsixPath,
  [string]$ExtensionDir,
  [string]$CodeCmdPath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
  [string]$UserDataDir = (Join-Path $env:TEMP "agent-lee-vscode-profile"),
  [string]$ExtensionsDir = (Join-Path $env:TEMP "agent-lee-vscode-extensions"),
  [switch]$LiveProfile
)

$ErrorActionPreference = "Stop"

if (-not $VsixPath) {
  $resolvedExtensionDir = & (Join-Path $PSScriptRoot "Resolve-AgentLeeExtension.ps1") -ExtensionDir $ExtensionDir
  $buildOutput = & (Join-Path $PSScriptRoot "Build-AgentLeeVSIX.ps1") -ExtensionDir $resolvedExtensionDir
  $VsixPath = @($buildOutput | Where-Object { $_ })[-1]
  $package = Get-Content (Join-Path $resolvedExtensionDir "package.json") -Raw | ConvertFrom-Json
  if (-not $VsixPath) {
    $VsixPath = Join-Path $resolvedExtensionDir "$($package.name)-$($package.version).vsix"
  }
}

if (-not (Test-Path $CodeCmdPath)) {
  throw "VS Code CLI was not found at $CodeCmdPath"
}

$resolvedVsix = (Resolve-Path $VsixPath).Path
if ($LiveProfile) {
  Write-Host "Installing VSIX into the live VS Code profile" -ForegroundColor Yellow
  & $CodeCmdPath `
    --install-extension $resolvedVsix `
    --force
} else {
  New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null
  New-Item -ItemType Directory -Force -Path $ExtensionsDir | Out-Null

  Write-Host "Installing VSIX into isolated VS Code profile" -ForegroundColor Cyan
  & $CodeCmdPath `
    --user-data-dir $UserDataDir `
    --extensions-dir $ExtensionsDir `
    --install-extension $resolvedVsix `
    --force
}

if ($LASTEXITCODE -ne 0) {
  throw "VSIX install failed."
}

Write-Host "Installed VSIX: $resolvedVsix" -ForegroundColor Green

[pscustomobject]@{
  VsixPath = $resolvedVsix
  UserDataDir = if ($LiveProfile) { "" } else { $UserDataDir }
  ExtensionsDir = if ($LiveProfile) { "" } else { $ExtensionsDir }
  InstallMode = if ($LiveProfile) { "live-profile" } else { "isolated-profile" }
}

