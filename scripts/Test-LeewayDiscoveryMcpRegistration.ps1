[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "Invoke-LeeWayMasterTotalEcosystemCompletion.ps1") -ValidateOnly -LaneScriptName "Test-LeewayDiscoveryMcpRegistration.ps1"
exit $LASTEXITCODE
