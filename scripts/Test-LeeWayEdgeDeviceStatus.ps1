[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "Invoke-LeeWayMasterTotalEcosystemCompletion.ps1") -ValidateOnly -LaneScriptName "Test-LeeWayEdgeDeviceStatus.ps1"
exit $LASTEXITCODE
