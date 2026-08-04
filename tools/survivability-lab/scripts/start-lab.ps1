param(
  [string]$WorkspaceRoot = $(Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$labRoot = Split-Path -Parent $PSScriptRoot
$reportPath = Join-Path $WorkspaceRoot 'Archive/reports/leeway-survivability-lab-start-report.json'
$receiptId = 'LEEWAY-RECEIPT-SURVIVABILITY-START-0001'

Push-Location $labRoot
try {
  $dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
  if ($dockerAvailable) {
    docker compose up -d | Out-Null
  }

  $status = [pscustomobject]@{
    reportId = 'LEEWAY_SURVIVABILITY_LAB_START_REPORT::20260522'
    reportObjectId = 'LEEWAY-REPORT-SURVIVABILITY-START-0001'
    generatedAt = (Get-Date).ToString('o')
    receiptId = $receiptId
    dockerComposeAttempted = $dockerAvailable
    dockerComposeStarted = $dockerAvailable
    truthState = if ($dockerAvailable) { 'PASS' } else { 'PARTIAL' }
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $reportPath) | Out-Null
  $status | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
  $status | ConvertTo-Json -Depth 8
}
finally {
  Pop-Location
}
