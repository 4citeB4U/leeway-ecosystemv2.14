param(
  [Parameter(Mandatory=$true)][string]$Category,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Summary,
  [Parameter(Mandatory=$true)][string]$Decision,
  [string]$EventType = "lesson",
  [string]$Severity = "medium",
  [string]$Evidence = ""
)

$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$Ledger = Join-Path $Root "Archive\agent-lee-learning\agent-lee-learning-ledger.jsonl"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-learning"

New-Item -ItemType Directory -Force -Path (Split-Path $Ledger) | Out-Null
New-Item -ItemType Directory -Force -Path $Proof | Out-Null

$EvidenceList = @()

if ($Evidence -and $Evidence.Trim().Length -gt 0) {
  $EvidenceList = @(
    $Evidence -split "\s*\|\s*" |
      Where-Object { $_ -and $_.Trim().Length -gt 0 } |
      ForEach-Object { $_.Trim() }
  )
}

$Event = @{
  event_type = $EventType
  category = $Category
  title = $Title
  summary = $Summary
  decision = $Decision
  severity = $Severity
  evidence = $EvidenceList
  created_at = (Get-Date).ToString("o")
}

$Event | ConvertTo-Json -Depth 80 -Compress | Add-Content -Path $Ledger -Encoding UTF8

$ReceiptPath = Join-Path $Proof ("AGENT_LEE_LEARNING_EVENT_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".receipt.json")
$Event | ConvertTo-Json -Depth 80 | Set-Content -Path $ReceiptPath -Encoding UTF8

Write-Host "Learning event appended." -ForegroundColor Green
Write-Host "Ledger: $Ledger" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
