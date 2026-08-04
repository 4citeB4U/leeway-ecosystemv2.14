<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: AI
TAG: CORE.AGENT_LEE.VOICE.START_SERVER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Starts the supported local Agent Lee voice service from the owned agent-lee/voice runtime without relying on archived backups.
#>

param(
  [switch]$Foreground,
  [int]$Port = 8765,
  [string]$ConfigPath = (Join-Path $PSScriptRoot "voice-runtime.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
  throw "Voice runtime config was not found at $ConfigPath."
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$serverUrl = if ($config.cloneServerUrl) { [string]$config.cloneServerUrl } else { "http://127.0.0.1:8766" }
$resolvedUri = [Uri]$serverUrl
$effectiveUrl = if ($PSBoundParameters.ContainsKey("Port") -and $Port -ne $resolvedUri.Port) {
  "http://127.0.0.1:$Port"
} else {
  $serverUrl
}
$effectiveUri = [Uri]$effectiveUrl
$launcherScript = Join-Path $PSScriptRoot "Start-AgentLeeCloneVoiceServer.ps1"

if (-not (Test-Path $launcherScript)) {
  throw "Owned voice server launcher was not found at $launcherScript."
}

function Start-CloneVoiceServerForeground {
  param(
    [pscustomobject]$RuntimeConfig,
    [string]$Url
  )

  $pythonExe = [string]$RuntimeConfig.clonePythonPath
  $serverScript = [string]$RuntimeConfig.cloneServerScriptPath
  $device = if ($RuntimeConfig.cloneDevice) { [string]$RuntimeConfig.cloneDevice } else { "cpu" }
  $uri = [Uri]$Url

  if (-not (Test-Path $pythonExe)) {
    throw "Clone voice Python runtime was not found at $pythonExe."
  }
  if (-not (Test-Path $serverScript)) {
    throw "Clone voice server script was not found at $serverScript."
  }

  Push-Location $PSScriptRoot
  try {
    & $pythonExe $serverScript --host $uri.Host --port ([string]$uri.Port) --device $device
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
}

function Test-CloneVoiceServerHealth {
  param([string]$Url)
  try {
    $health = Invoke-RestMethod -Uri ($Url.TrimEnd("/") + "/health") -TimeoutSec 3
    return [bool]$health.ready
  } catch {
    return $false
  }
}

if (Test-CloneVoiceServerHealth -Url $effectiveUrl) {
  Write-Output "Agent Lee voice server already appears to be listening at $effectiveUrl."
  exit 0
}

if ($Foreground) {
  Start-CloneVoiceServerForeground -RuntimeConfig $config -Url $effectiveUrl
}

if ($effectiveUri.Port -eq $resolvedUri.Port) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcherScript -ConfigPath $ConfigPath
  exit $LASTEXITCODE
}

$tempConfigPath = Join-Path $env:TEMP ("agent-lee-voice-runtime-" + [guid]::NewGuid().ToString() + ".json")

try {
  $override = [ordered]@{}
  foreach ($property in $config.PSObject.Properties) {
    $override[$property.Name] = $property.Value
  }
  $override.cloneServerUrl = $effectiveUrl
  [System.IO.File]::WriteAllText($tempConfigPath, ($override | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false))

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcherScript -ConfigPath $tempConfigPath
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tempConfigPath -Force -ErrorAction SilentlyContinue
}
