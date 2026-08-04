<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.SCRIPTS.INVOKE_AGENTLEECURRENTWINDOWCLICKTHROUGH
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$WindowTitleContains = "Visual Studio Code",
  [int]$BetweenStepsMs = 1800
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName Microsoft.VisualBasic
$shell = New-Object -ComObject WScript.Shell

$window = Get-Process Code -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*$WindowTitleContains*" } |
  Sort-Object StartTime |
  Select-Object -Last 1

if (-not $window) {
  throw "No visible VS Code window matched '$WindowTitleContains'."
}

if (-not $shell.AppActivate($window.MainWindowTitle)) {
  throw "Could not activate VS Code window '$($window.MainWindowTitle)'."
}

function Invoke-CommandPaletteAction {
  param(
    [string]$CommandText
  )

  $shell.SendKeys("^+p")
  Start-Sleep -Milliseconds 700
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

[pscustomobject]@{
  ProcessId = $window.Id
  WindowTitle = $window.MainWindowTitle
  Steps = $steps
}

