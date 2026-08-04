param(
  [string]$WorkspaceRoot = $(Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$evidence = @(
  'Archive/reports/leeway-survivability-lab-capability-report.json',
  'Archive/reports/leeway-survivability-lab-load-report.json',
  'Archive/reports/leeway-survivability-lab-network-chaos-report.json',
  'Archive/reports/leeway-survivability-lab-recovery-report.json',
  'Archive/reports/leeway-survivability-gauntlet-results.json'
)

$found = New-Object System.Collections.Generic.List[string]
$missing = New-Object System.Collections.Generic.List[string]
foreach ($path in $evidence) {
  if (Test-Path -LiteralPath (Join-Path $WorkspaceRoot $path)) { $found.Add($path) } else { $missing.Add($path) }
}

$report = [pscustomobject]@{
  reportId = 'LEEWAY_SURVIVABILITY_LAB_EVIDENCE_REPORT::20260522'
  reportObjectId = 'LEEWAY-REPORT-SURVIVABILITY-EVIDENCE-0001'
  generatedAt = (Get-Date).ToString('o')
  receiptId = 'LEEWAY-RECEIPT-SURVIVABILITY-EVIDENCE-0001'
  foundEvidence = @($found.ToArray())
  missingEvidence = @($missing.ToArray())
  truthState = if ($missing.Count -eq 0) { 'PASS' } else { 'PARTIAL' }
}

$out = Join-Path $WorkspaceRoot 'Archive/reports/leeway-survivability-lab-evidence-report.json'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $out) | Out-Null
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $out -Encoding UTF8
$report | ConvertTo-Json -Depth 8
