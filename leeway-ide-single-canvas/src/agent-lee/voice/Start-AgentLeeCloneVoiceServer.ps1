<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.VOICE.START_CLONE_SERVER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Starts the persistent local Agent Lee clone voice server for in-app developer voice cloning.
#>

param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "voice-runtime.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
  throw "Voice runtime config not found at $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$serverUrl = if ($config.cloneServerUrl) { [string]$config.cloneServerUrl } else { "http://127.0.0.1:8766" }
$uri = [Uri]$serverUrl
$pythonExe = [string]$config.clonePythonPath
$serverScript = [string]$config.cloneServerScriptPath
$device = if ($config.cloneDevice) { [string]$config.cloneDevice } else { "cpu" }

if (-not (Test-Path $pythonExe)) {
  throw "Clone voice Python runtime was not found at $pythonExe"
}
if (-not (Test-Path $serverScript)) {
  throw "Clone voice server script was not found at $serverScript"
}

try {
  $health = Invoke-RestMethod -Uri ($serverUrl.TrimEnd("/") + "/health") -TimeoutSec 3
  if ($health.ready) {
    Write-Output "Agent Lee clone voice server already appears to be listening at $serverUrl."
    return
  }
} catch {}

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdoutLog = Join-Path $logDir "clone-voice-server.stdout.log"
$stderrLog = Join-Path $logDir "clone-voice-server.stderr.log"

$arguments = @(
  $serverScript,
  "--host", $uri.Host,
  "--port", [string]$uri.Port,
  "--device", $device
)

$process = Start-Process `
  -FilePath $pythonExe `
  -ArgumentList $arguments `
  -WorkingDirectory $PSScriptRoot `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden `
  -PassThru

for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  try {
    $health = Invoke-RestMethod -Uri ($serverUrl.TrimEnd("/") + "/health") -TimeoutSec 3
    if ($health.ready) {
      Write-Output "Agent Lee clone voice server started at $serverUrl (PID $($process.Id))."
      return
    }
  } catch {}
}

throw "Agent Lee clone voice server did not start successfully at $serverUrl. Check $stdoutLog and $stderrLog."
