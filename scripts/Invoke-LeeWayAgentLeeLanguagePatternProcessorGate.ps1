param(
  [string]$WorkspaceRoot = $(Split-Path -Parent $PSScriptRoot),
  [switch]$VernacularAuthority
)

$standardsGate = Join-Path $WorkspaceRoot 'LeeWay-Standards\scripts\Invoke-LeeWayAgentLeeLanguagePatternProcessorGate.ps1'
if (-not (Test-Path -LiteralPath $standardsGate)) {
  Write-Error "Standards gate not found: $standardsGate"
  exit 1
}

$argsList = @('-ExecutionPolicy', 'Bypass', '-File', $standardsGate, '-WorkspaceRoot', $WorkspaceRoot)
if ($VernacularAuthority) {
  $argsList += '-VernacularAuthority'
}

& powershell.exe @argsList
exit $LASTEXITCODE
