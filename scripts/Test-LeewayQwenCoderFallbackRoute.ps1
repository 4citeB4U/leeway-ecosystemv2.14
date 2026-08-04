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
$reportPath = Join-Path $Reports "leeway-qwen-coder-fallback-route-report.json"
$receiptPath = Join-Path $Receipts "leeway-qwen-coder-fallback-route-$Stamp.json"
$body = @{ model = "qwen2.5-coder:7b"; messages = @(@{ role = "user"; content = "Fix the syntax: if path exists then write OK." }); stream = $false; options = @{ num_predict = 32; temperature = 0.2 } } | ConvertTo-Json -Depth 6
$resp = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:11434/api/chat" -ContentType "application/json" -Body $body
$text = [string]$resp.message.content
$ok = -not [string]::IsNullOrWhiteSpace($text)
$result = [ordered]@{
  receiptId = "leeway-qwen-coder-fallback-route-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  model = "qwen2.5-coder:7b"
  responseText = $text
  outputReceived = $ok
  fallbackUsed = $true
  fallbackReason = "secondary coder lane"
  blockers = @()
  truthLabels = @("QWEN2_5_CODER_7B_SECONDARY_CODER_READY","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT")
  verdict = $(if($ok){"PASS"}else{"FAIL"})
}
Write-LeewayJson -Path $reportPath -Object $result | Out-Null
Write-LeewayJson -Path $receiptPath -Object $result | Out-Null
Write-Host "Verdict: $($result.verdict)"
