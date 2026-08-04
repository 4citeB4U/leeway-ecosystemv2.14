<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.RUNTIME.EXTENSION.LIVE_VISUAL_VALIDATION
PURPOSE: Launches a real VS Code window, validates Agent Lee branding in the installed runtime, and records truthful live visual evidence.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
#>

param(
  [string]$ExtensionDir = (Join-Path $PSScriptRoot ".."),
  [string]$WorkspaceDir = (Join-Path $PSScriptRoot "..\.."),
  [string]$EvidencePath,
  [int]$RemoteDebuggingPort = 9335
)

$ErrorActionPreference = "Stop"

function Resolve-CodeCliPath {
  $command = Get-Command code.cmd -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\bin\code.cmd"),
    "C:\Program Files\Microsoft VS Code\bin\code.cmd",
    "C:\Program Files (x86)\Microsoft VS Code\bin\code.cmd"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "Unable to locate code.cmd for live VS Code validation."
}

function Stop-CodeProcessesForUserDataDir {
  param([string]$UserDataDir)

  $processes = Get-CimInstance Win32_Process -Filter "Name = 'Code.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*$UserDataDir*" }

  foreach ($process in $processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
    } catch {
      Write-Warning "Unable to stop Code.exe process $($process.ProcessId): $($_.Exception.Message)"
    }
  }
}

$resolvedExtensionDir = (Resolve-Path $ExtensionDir).Path
$resolvedWorkspaceDir = (Resolve-Path $WorkspaceDir).Path
$resultPath = if ($EvidencePath) { $EvidencePath } else { Join-Path $resolvedExtensionDir "test-evidence\leeway-extension-live-visual-validation-result.json" }
$screenshotsDir = Join-Path $resolvedExtensionDir "test-evidence"
$userDataDir = Join-Path $env:TEMP "leeway-vscode-live-validation"
$codeCliPath = Resolve-CodeCliPath
$runnerPath = Join-Path $resolvedExtensionDir "scripts\run-live-visual-validation.cjs"
$installedCheckPath = Join-Path $resolvedExtensionDir "test-evidence\leeway-installed-extension-check-result.json"

if (-not (Test-Path -LiteralPath $installedCheckPath)) {
  throw "Installed extension evidence is missing at $installedCheckPath. Run Invoke-LeeWayInstalledExtensionCheck.ps1 first."
}

if (Test-Path -LiteralPath $userDataDir) {
  Remove-Item -LiteralPath $userDataDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resultPath) | Out-Null
New-Item -ItemType Directory -Force -Path $screenshotsDir | Out-Null

$launchArgs = @(
  "--new-window"
  "--disable-workspace-trust"
  "--user-data-dir", $userDataDir
  "--remote-debugging-port=$RemoteDebuggingPort"
  $resolvedWorkspaceDir
)

$launchProcess = Start-Process -FilePath $codeCliPath -ArgumentList $launchArgs -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8

$env:LEEWAY_LIVE_VISUAL_EVIDENCE_PATH = $resultPath
$env:LEEWAY_LIVE_VISUAL_SCREENSHOTS_DIR = $screenshotsDir
$env:LEEWAY_LIVE_VISUAL_CDP_PORT = [string]$RemoteDebuggingPort
$env:LEEWAY_LIVE_VISUAL_EXTENSION_DIR = $resolvedExtensionDir
$env:LEEWAY_LIVE_VISUAL_INSTALLED_CHECK_PATH = $installedCheckPath

try {
  & node $runnerPath
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Stop-CodeProcessesForUserDataDir -UserDataDir $userDataDir
  if (Test-Path -LiteralPath $userDataDir) {
    Remove-Item -LiteralPath $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  $env:LEEWAY_LIVE_VISUAL_EVIDENCE_PATH = $null
  $env:LEEWAY_LIVE_VISUAL_SCREENSHOTS_DIR = $null
  $env:LEEWAY_LIVE_VISUAL_CDP_PORT = $null
  $env:LEEWAY_LIVE_VISUAL_EXTENSION_DIR = $null
  $env:LEEWAY_LIVE_VISUAL_INSTALLED_CHECK_PATH = $null
}

Write-Host "Live VS Code validation evidence written to $resultPath" -ForegroundColor Green
