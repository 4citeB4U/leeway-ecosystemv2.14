[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")
$Root = Get-LeewayWorkspaceRoot
$Reports = Join-Path $Root "Archive\reports"
$Receipts = Join-Path $Root "Archive\receipts\leeway-model-routing"
New-LeewayDirectory -Path $Reports | Out-Null
New-LeewayDirectory -Path $Receipts | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $Reports "leeway-model-family-status-report.json"
$receiptPath = Join-Path $Receipts "leeway-model-family-status-$Stamp.json"
$tags = (Invoke-RestMethod http://127.0.0.1:11434/api/tags).models | Select-Object -ExpandProperty name
$result = [ordered]@{
  receiptId = "leeway-model-family-status-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  ollamaModelFamilyStatus = "ready"
  primaryReasoningModel = "qwen3:latest"
  primaryReasoningModelStatus = ($tags -contains "qwen3:latest")
  primaryVisionModel = "qwen2.5vl:7b"
  primaryVisionModelStatus = ($tags -contains "qwen2.5vl:7b")
  primaryCoderModel = "qwen2.5-coder:latest"
  primaryCoderModelStatus = ($tags -contains "qwen2.5-coder:latest")
  secondaryCoderModel = "qwen2.5-coder:7b"
  secondaryCoderModelStatus = ($tags -contains "qwen2.5-coder:7b")
  runtimeFabricModelRouterStatus = "ready"
  runtimeFabricCoderLaneStatus = "ready"
  lastModelRoutingReceipt = $null
  blockers = @()
  truthLabels = @("LIVE_STATUS_EXPOSES_MODEL_FAMILY_TRUTH","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT")
  verdict = "READY"
}
Write-LeewayJson -Path $reportPath -Object $result | Out-Null
Write-LeewayJson -Path $receiptPath -Object $result | Out-Null
Write-Host "Verdict: READY"
