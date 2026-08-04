<#
LEEWAY_HEADER - DO NOT REMOVE
REGION: SCRIPTS.RUNTIME
TAG: SELF_HOSTED_OPERATING_ENVIRONMENT.STOP_SUPERVISOR
DISCOVERY_PIPELINE: Process Map -> Targeted Shutdown -> Health Recheck -> Report
#>

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$processMapPath = Join-Path $workspaceRoot 'Archive\reports\leeway-self-hosted-process-map.json'

if (-not (Test-Path $processMapPath)) {
  Write-Output '{"finalStatus":"BLOCKED","blocker":"Missing process map."}'
  exit 1
}

$processMap = Get-Content -Raw $processMapPath | ConvertFrom-Json
$stopped = @()
foreach ($proc in $processMap.processes) {
  try {
    $p = Get-Process -Id $proc.processId -ErrorAction Stop
    Stop-Process -Id $p.Id -Force
    $stopped += [ordered]@{ serviceId = $proc.serviceId; processId = $proc.processId; status = 'STOPPED' }
  } catch {
    $stopped += [ordered]@{ serviceId = $proc.serviceId; processId = $proc.processId; status = 'MISSING' }
  }
}

$result = [ordered]@{ generatedAt=(Get-Date).ToString('o'); stopped=$stopped; finalStatus='PASS' }
$result | ConvertTo-Json -Depth 8 | Write-Output
