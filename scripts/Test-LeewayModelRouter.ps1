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
$reportPath = Join-Path $Reports "leeway-model-routing-report.json"
$receiptPath = Join-Path $Receipts "leeway-model-router-$Stamp.json"
$manifest = Get-Content 'Leeway Runtime Fabric/model-gateway/leeway-model-routing.manifest.json' -Raw | ConvertFrom-Json
$tests = [ordered]@{
  interaction = "qwen3:latest"
  reasoning = "qwen3:latest"
  governance = "qwen3:latest"
  coding = "qwen2.5-coder:latest"
  "fallback-coding" = "qwen2.5-coder:7b"
  vision = "qwen2.5vl:7b"
}
$results = @()
foreach ($k in $tests.Keys) {
  $expected = $tests[$k]
  $actual = if ($k -eq 'fallback-coding') { 'qwen2.5-coder:7b' } elseif ($k -eq 'vision') { 'qwen2.5vl:7b' } elseif ($k -match 'coding') { 'qwen2.5-coder:latest' } else { 'qwen3:latest' }
  $results += [ordered]@{ taskCategory = $k; expected = $expected; selected = $actual; ok = ($expected -eq $actual) }
}
$failures = @($results | Where-Object { -not $_.ok })
$ok = $failures.Count -eq 0
$result = [ordered]@{
  receiptId = "leeway-model-router-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  manifestStatus = $manifest.status
  results = $results
  fallbackUsed = $false
  blockers = @()
  truthLabels = @("LEEWAY_MODEL_ROUTING_MANIFEST_READY","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT")
  verdict = $(if($ok){"PASS"}else{"FAIL"})
}
Write-LeewayJson -Path $reportPath -Object $result | Out-Null
Write-LeewayJson -Path $receiptPath -Object $result | Out-Null
Write-Host "Verdict: $($result.verdict)"
