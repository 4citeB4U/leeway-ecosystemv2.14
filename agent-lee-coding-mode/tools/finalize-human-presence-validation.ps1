[CmdletBinding()]
param(
  [switch]$AudibleConfirmed,
  [switch]$VisionConfirmed,
  [switch]$ChatInteracted
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ReceiptDir = Join-Path $Root "Archive\receipts"

# Find latest embodiment proof receipt
$receipts = Get-ChildItem -Path $ReceiptDir -Filter "agent-lee-vscode-chat-embodiment-stack-proof-*.json" | Sort-Object LastWriteTime -Descending
if ($receipts.Count -eq 0) {
  Write-Error "No embodiment stack proof receipt found to finalize."
}

$latestReceipt = $receipts[0]
$receiptContent = Get-Content -LiteralPath $latestReceipt.FullName -Raw | ConvertFrom-Json

Write-Host "Found latest receipt: $($latestReceipt.Name)"

# Validate parameters
if (-not $AudibleConfirmed -or -not $VisionConfirmed -or -not $ChatInteracted) {
  $statusLine = "PARTIAL"
  $overallOk = $false
  Write-Warning "Operator did not confirm all human presence validation checkpoints. Status is PARTIAL."
} else {
  $statusLine = "PASS_HUMAN_CONFIRMED"
  $overallOk = $true
  Write-Host "Operator confirmed all human presence validation checkpoints. Status is PASS_HUMAN_CONFIRMED."
}

# 1. Update the latest embodiment stack proof receipt in-place
$receiptContent.status = if ($overallOk) { "PASS" } else { "PARTIAL" }
$receiptContent.ok = $overallOk
if ($receiptContent.humanConfirmation) {
  $receiptContent.humanConfirmation.audibleConfirmed = $AudibleConfirmed
  $receiptContent.humanConfirmation.visionConfirmed = $VisionConfirmed
  $receiptContent.humanConfirmation.confirmedByUserInput = if ($overallOk) { "YES" } else { "NO" }
}
if ($receiptContent.summary) {
  $receiptContent.summary.lockEligible = $overallOk
  $receiptContent.summary.finalizationRequired = -not $overallOk
  $receiptContent.summary.humanConfirmed = $overallOk
}

$updatedJson = $receiptContent | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($latestReceipt.FullName, $updatedJson, [System.Text.UTF8Encoding]::new($false))

# 2. Write the new Human Presence Validation receipt
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$HumanPresenceReceiptPath = Join-Path $ReceiptDir "agent-lee-human-presence-validation-$Stamp.json"

$HumanPresenceReceipt = [ordered]@{
  schema = "leeway.agent-lee.human-presence-validation.v1"
  status = $statusLine
  ok = $overallOk
  lock = "AGENT_LEE_VSCODE_CHAT_EMBODIMENT_STACK_LOCKED"
  controlSurface = "vscode_chat"
  timestamp = (Get-Date).ToString("o")
  humanConfirmation = [ordered]@{
    audibleConfirmed = $AudibleConfirmed
    visionConfirmed = $VisionConfirmed
    chatInteracted = $ChatInteracted
    confirmedByUserInput = if ($overallOk) { "YES" } else { "NO" }
  }
  operatorStatements = @(
    "I heard Agent Lee.",
    "I received Agent Lee's response.",
    "I successfully interacted with Agent Lee."
  )
  targetEmbodimentReceipt = $latestReceipt.Name
}

$presenceJson = $HumanPresenceReceipt | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($HumanPresenceReceiptPath, $presenceJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "Updated embodiment receipt saved to: $($latestReceipt.FullName)"
Write-Host "Human Presence Validation receipt saved to: $HumanPresenceReceiptPath"

if ($overallOk) {
  Write-Host "LOCKED: AGENT_LEE_VSCODE_CHAT_EMBODIMENT_STACK_LOCKED" -ForegroundColor Green
  exit 0
} else {
  exit 1
}
