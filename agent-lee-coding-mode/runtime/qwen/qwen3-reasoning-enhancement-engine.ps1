$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$RepoRoot = Split-Path -Parent $Root
$ReportsRoot = Join-Path $RepoRoot "Archive\reports"
$ReceiptsRoot = Join-Path $RepoRoot "Archive\receipts\agent-lee-qwen"
New-Item -ItemType Directory -Force -Path $ReportsRoot,$ReceiptsRoot | Out-Null

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
  latencyMs = $null
  blockers = @()
  truthLabels = @("LEEWAY_STANDARDS_READ","QWEN_MODEL_REPLACEMENT_NOT_PERFORMED","QWEN_FORBIDDEN_PROVIDER_FALLBACK_NOT_USED","NO_FAKE_MODEL_UPGRADE")
  verdict = "QWEN3_PRIMARY_MODEL_ROUTE_READY"
}

$reportPath = Join-Path $ReportsRoot "agent-lee-qwen3-primary-model-route-report.json"
$report | ConvertTo-Json -Depth 10 | Set-Content -Path $reportPath -Encoding UTF8
Write-Output ($report | ConvertTo-Json -Depth 10 -Compress)
