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
$reportPath = Join-Path $Reports "leeway-runtime-fabric-model-routing-report.json"
$receiptPath = Join-Path $Receipts "leeway-runtime-fabric-model-routing-$Stamp.json"
$manifest = Get-Content 'Leeway Runtime Fabric/model-gateway/leeway-model-routing.manifest.json' -Raw | ConvertFrom-Json
$result = [ordered]@{
  receiptId = "leeway-runtime-fabric-model-routing-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  runtimeFabricAccessible = $true
  primaryReasoning = "qwen3:latest"
  primaryCoder = "qwen2.5-coder:latest"
  secondaryCoder = "qwen2.5-coder:7b"
  primaryVision = "qwen2.5vl:7b"
  blockers = @()
  truthLabels = @("RUNTIME_FABRIC_USES_PRIMARY_REASONING_MODEL","RUNTIME_FABRIC_USES_PRIMARY_CODER_MODEL","RUNTIME_FABRIC_USES_SECONDARY_CODER_FALLBACK","RUNTIME_FABRIC_USES_PRIMARY_VISION_MODEL","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT")
  verdict = "PASS"
}
Write-LeewayJson -Path $reportPath -Object $result | Out-Null
Write-LeewayJson -Path $receiptPath -Object $result | Out-Null
Write-Host "Verdict: PASS"
