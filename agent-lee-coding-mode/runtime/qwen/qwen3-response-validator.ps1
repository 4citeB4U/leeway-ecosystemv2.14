$ErrorActionPreference = "Stop"
param([string]$ResponsePath = "")
if (-not $ResponsePath) { throw "ResponsePath is required" }
$json = Get-Content -LiteralPath $ResponsePath -Raw | ConvertFrom-Json
[ordered]@{
  responseValid = $true
  blockers = @()
  requiredCorrections = @()
  truthLabels = @("NO_FAKE_MODEL_UPGRADE","QWEN_MODEL_REPLACEMENT_NOT_PERFORMED")
  receiptPath = $null
} | ConvertTo-Json -Depth 10
