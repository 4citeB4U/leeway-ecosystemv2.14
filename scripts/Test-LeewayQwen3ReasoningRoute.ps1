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
$reportPath = Join-Path $Reports "leeway-qwen3-reasoning-route-report.json"
$receiptPath = Join-Path $Receipts "leeway-qwen3-reasoning-route-$Stamp.json"
$prompt = "Reply with one short sentence: qwen3 reasoning route is alive."
$controller = Join-Path $Root "Leeway Runtime Fabric\model-gateway\qwen3-final-answer-controller.mjs"
$rawOutput = & node $controller --profile FAST_FINAL --prompt $prompt --timeoutSec 45 2>&1 | Out-String
$controllerResult = $null
try {
  $controllerResult = $rawOutput | ConvertFrom-Json -ErrorAction Stop
} catch {}
$text = if ($controllerResult) { [string]$controllerResult.responseText } else { "" }
$ok = -not [string]::IsNullOrWhiteSpace($text)
$result = [ordered]@{
  receiptId = "leeway-qwen3-reasoning-route-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  model = "qwen3:latest"
  responseText = $text
  rawOutput = $rawOutput
  controllerResult = $controllerResult
  outputReceived = $ok
  fallbackUsed = $false
  qwen3FailureClass = if ($controllerResult) { $controllerResult.failureClass } else { "QWEN3_CONTROLLER_OUTPUT_UNPARSEABLE" }
  blockers = if ($controllerResult) { @($controllerResult.blockers) } else { @("qwen3 controller output could not be parsed.") }
  truthLabels = if ($ok) { @("QWEN3_PRIMARY_REASONING_READY","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT") } else { @("QWEN3_PRIMARY_REASONING_PARTIAL","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT") }
  verdict = $(if($ok){"PASS"}else{"PARTIAL"})
}
Write-LeewayJson -Path $reportPath -Object $result | Out-Null
Write-LeewayJson -Path $receiptPath -Object $result | Out-Null
Write-Host "Verdict: $($result.verdict)"
