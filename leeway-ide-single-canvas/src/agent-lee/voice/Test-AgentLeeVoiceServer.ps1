<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: AI
TAG: CORE.AGENT_LEE.VOICE.TEST_SERVER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Checks the supported local Agent Lee voice service health endpoint without relying on archived runtime paths.
#>

param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "voice-runtime.json"),
  [string]$Url = ""
)

if ([string]::IsNullOrWhiteSpace($Url)) {
  if (-not (Test-Path $ConfigPath)) {
    throw "Voice runtime config was not found at $ConfigPath"
  }

  $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  $Url = if ($config.cloneServerUrl) { [string]$config.cloneServerUrl } else { "http://127.0.0.1:8766" }
}

try {
  $response = Invoke-RestMethod -Uri ($Url.TrimEnd("/") + "/health") -Method Get -TimeoutSec 5
  $response | ConvertTo-Json -Depth 5
  exit 0
} catch {
  Write-Error $_
  exit 1
}
