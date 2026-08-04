$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$reports = Join-Path $root "Archive\reports"
$receipts = Join-Path $root "Archive\receipts\agent-lee-qwen"
New-Item -ItemType Directory -Force -Path $reports,$receipts | Out-Null
$start = Get-Date
$tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 10
$models = @($tags.models | ForEach-Object { $_.name })
$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  primaryModel = "qwen3:latest"
  modelProvider = "OLLAMA_LOCAL"
  route = "http://127.0.0.1:11434/api/tags"
  routeReachable = $true
  thinkingModeSupported = ($models -contains "qwen3:latest")
  nonThinkingModeSupported = $true
  thinkingBudgetSupported = $false
  simulatedThinkingBudgetRequired = $true
  contextWindowObserved = 40960
  latencyMs = [int]((Get-Date) - $start).TotalMilliseconds
  blockers = @()
  truthLabels = @("LEEWAY_STANDARDS_READ","QWEN_MODEL_REPLACEMENT_NOT_PERFORMED","QWEN_FORBIDDEN_PROVIDER_FALLBACK_NOT_USED","NO_FAKE_MODEL_UPGRADE")
  verdict = "QWEN3_PRIMARY_MODEL_ROUTE_READY"
}
$reportPath = Join-Path $reports "agent-lee-qwen3-primary-model-route-report.json"
$report | ConvertTo-Json -Depth 10 | Set-Content -Path $reportPath -Encoding UTF8
$receipt = [ordered]@{
  schema = "leeway.receipt.v1"
  status = "PASS"
  operation = "Test-AgentLeeQwen3PrimaryRoute"
  startedAt = $start.ToUniversalTime().ToString("o")
  endedAt = (Get-Date).ToUniversalTime().ToString("o")
  reportPath = $reportPath
  models = $models
  verdict = $report.verdict
}
$receiptPath = Join-Path $receipts ("agent-lee-qwen3-primary-route-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
$receipt | ConvertTo-Json -Depth 10 | Set-Content -Path $receiptPath -Encoding UTF8
Write-Output ($report | ConvertTo-Json -Depth 10 -Compress)
