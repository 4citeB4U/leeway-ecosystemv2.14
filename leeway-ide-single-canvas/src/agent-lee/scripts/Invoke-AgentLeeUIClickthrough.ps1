<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SCRIPTS.INVOKE_AGENTLEEUICLICKTHROUGH
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$WorkspaceDir = (Join-Path $PSScriptRoot ".."),
  [string]$CodeCmdPath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
  [string]$UserDataDir = (Join-Path $env:TEMP "agent-lee-vscode-profile"),
  [string]$ExtensionsDir = (Join-Path $env:TEMP "agent-lee-vscode-extensions"),
  [int]$StartupSeconds = 10,
  [int]$BetweenStepsMs = 1800,
  [switch]$KeepOpen
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName Microsoft.VisualBasic
$shell = New-Object -ComObject WScript.Shell
$resolvedWorkspace = (Resolve-Path $WorkspaceDir).Path
$launchStart = Get-Date

$proc = Start-Process -FilePath $CodeCmdPath -ArgumentList @(
  $resolvedWorkspace,
  "--new-window",
  "--user-data-dir", $UserDataDir,
  "--extensions-dir", $ExtensionsDir,
  "--log", "trace"
) -PassThru

Write-Host "Started VS Code PID $($proc.Id) for UI click-through" -ForegroundColor Cyan
Start-Sleep -Seconds $StartupSeconds

for ($i = 0; $i -lt 20 -and ($proc.MainWindowHandle -eq 0); $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $proc.Refresh()
  } catch {
  }
}

$windowProc = $proc
if ($windowProc.MainWindowHandle -eq 0) {
  $windowProc = Get-Process Code -ErrorAction SilentlyContinue |
    Where-Object { $_.StartTime -ge $launchStart -and $_.MainWindowHandle -ne 0 } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1
}

if (-not $windowProc) {
  throw "No VS Code window process was found after launch."
}

$activated = $false
if ($windowProc.MainWindowTitle) {
  $activated = $shell.AppActivate($windowProc.MainWindowTitle)
}
if (-not $activated) {
  $activated = $shell.AppActivate($windowProc.Id)
}
if (-not $activated) {
  throw "Could not activate the VS Code window for PID $($windowProc.Id)."
}

function Invoke-CommandPaletteAction {
  param(
    [string]$CommandText
  )

  $shell.SendKeys("^+p")
  Start-Sleep -Milliseconds 600
  $shell.SendKeys($CommandText)
  Start-Sleep -Milliseconds 250
  $shell.SendKeys("~")
  Start-Sleep -Milliseconds $BetweenStepsMs
}

$steps = @(
  "Agent Lee: Open Sidebar",
  "Agent Lee: New Chat",
  "Agent Lee: Stop Voice",
  "Agent Lee: Open Chat"
)

foreach ($step in $steps) {
  Invoke-CommandPaletteAction -CommandText $step
}

if (-not $KeepOpen) {
  Start-Sleep -Seconds 6
  try {
    Stop-Process -Id $windowProc.Id -Force -ErrorAction Stop
  } catch {
  }
}

[pscustomobject]@{
  ProcessId = $windowProc.Id
  WorkspaceDir = $resolvedWorkspace
  UserDataDir = $UserDataDir
  ExtensionsDir = $ExtensionsDir
  Steps = $steps
  KeptOpen = [bool]$KeepOpen
}

