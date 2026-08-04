[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
& (Join-Path $PSScriptRoot "Invoke-LeeWayMasterTotalEcosystemCompletion.ps1") -ValidateOnly -LaneScriptName "Test-LeewayCodexConfigAlignment.ps1"
exit $LASTEXITCODE
