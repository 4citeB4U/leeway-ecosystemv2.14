[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReceiptsRoot = Join-Path $Root "Archive\receipts\agent-lee-live-embodiment"
New-LeewayDirectory -Path $ReceiptsRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptsRoot "agent-lee-live-embodiment-restart-$Stamp.json"

$stop = & (Join-Path $PSScriptRoot "Stop-AgentLeeLiveEmbodiment.ps1")
$start = & (Join-Path $PSScriptRoot "Start-AgentLeeLiveEmbodiment.ps1") -NoExitOnFail

$receipt = [ordered]@{
  startedAt = (Get-Date).ToUniversalTime().ToString("o")
  finishedAt = (Get-Date).ToUniversalTime().ToString("o")
  action = "restart-live-embodiment"
  stopVerdict = $stop.verdict
  startVerdict = $start.verdict
  receiptPath = $ReceiptPath
  verdict = "RESTART_ATTEMPTED"
}

Write-LeewayJson -Path $ReceiptPath -Object $receipt | Out-Null
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
return $receipt

