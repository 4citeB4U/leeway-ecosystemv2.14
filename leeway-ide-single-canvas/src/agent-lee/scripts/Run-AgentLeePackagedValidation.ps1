<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SCRIPTS.RUN_AGENTLEEPACKAGEDVALIDATION
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$WorkspaceDir = (Join-Path $PSScriptRoot "..\.."),
  [string]$ExtensionDir,
  [string]$CodeCmdPath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
  [string]$UserDataDir = (Join-Path $env:TEMP "agent-lee-vscode-profile"),
  [string]$ExtensionsDir = (Join-Path $env:TEMP "agent-lee-vscode-extensions"),
  [switch]$SkipBuild,
  [switch]$KeepOpen
)

$ErrorActionPreference = "Stop"

$resolvedExtensionDir = & (Join-Path $PSScriptRoot "Resolve-AgentLeeExtension.ps1") -ExtensionDir $ExtensionDir

if (-not $SkipBuild) {
  & (Join-Path $PSScriptRoot "Build-AgentLeeVSIX.ps1") -ExtensionDir $resolvedExtensionDir | Out-Null
}

$package = Get-Content (Join-Path $resolvedExtensionDir "package.json") -Raw | ConvertFrom-Json
$vsixPath = Join-Path $resolvedExtensionDir "$($package.name)-$($package.version).vsix"

& (Join-Path $PSScriptRoot "Install-AgentLeeVSIX.ps1") `
  -VsixPath $vsixPath `
  -CodeCmdPath $CodeCmdPath `
  -UserDataDir $UserDataDir `
  -ExtensionsDir $ExtensionsDir | Out-Null

$uiRun = $null
try {
  $uiRun = & (Join-Path $PSScriptRoot "Invoke-AgentLeeUIClickthrough.ps1") `
    -WorkspaceDir $WorkspaceDir `
    -CodeCmdPath $CodeCmdPath `
    -UserDataDir $UserDataDir `
    -ExtensionsDir $ExtensionsDir `
    -KeepOpen:$KeepOpen
} catch {
  Write-Warning "Isolated UI click-through did not complete: $($_.Exception.Message)"
  $uiRun = [pscustomobject]@{
    status = "isolated-ui-window-not-activated"
    message = $_.Exception.Message
  }
}

$evidence = & (Join-Path $PSScriptRoot "Collect-AgentLeeEvidence.ps1") `
  -RootDir $WorkspaceDir `
  -VsixPath $vsixPath `
  -CodeCmdPath $CodeCmdPath `
  -UserDataDir $UserDataDir `
  -ExtensionsDir $ExtensionsDir

[pscustomobject]@{
  uiRun = $uiRun
  evidence = $evidence
}

