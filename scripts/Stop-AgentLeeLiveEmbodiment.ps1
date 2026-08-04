[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReceiptsRoot = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment"
New-LeewayDirectory -Path $ReceiptsRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptsRoot "agent-lee-live-embodiment-stop-$Stamp.json"
$stopRoutes = @(
  "http://127.0.0.1:8080/agent-lee/listen/stop",
  "http://127.0.0.1:4001/agent-lee/listen/stop",
  "http://127.0.0.1:8765/api/local-voice/agent-lee-stop"
)

$results = @()
foreach ($route in $stopRoutes) {
  $probe = Invoke-LeewayHttp -Url $route -Method POST -Body @{} -TimeoutSec 8
  $results += [ordered]@{
    route = $route
    ok = $probe.ok
    statusCode = $probe.statusCode
    error = $probe.error
  }
}

$receipt = [ordered]@{
  startedAt = (Get-Date).ToUniversalTime().ToString("o")
  finishedAt = (Get-Date).ToUniversalTime().ToString("o")
  action = "stop-live-embodiment"
  results = $results
  receiptPath = $ReceiptPath
  verdict = "STOP_ATTEMPTED"
}

Write-LeewayJson -Path $ReceiptPath -Object $receipt | Out-Null
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
return $receipt

