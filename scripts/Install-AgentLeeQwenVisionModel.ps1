[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReportsRoot = Join-Path $Root "Archive\reports"
$ReceiptsRoot = Join-Path $Root "Archive\receipts\agent-lee-vision"
New-LeewayDirectory -Path $ReportsRoot | Out-Null
New-LeewayDirectory -Path $ReceiptsRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportsRoot "agent-lee-qwen-vision-model-install-report.json"
$ReceiptPath = Join-Path $ReceiptsRoot "agent-lee-qwen-vision-model-install-$Stamp.json"
$SelectionPath = Join-Path $Root "agent-lee-coding-mode\runtime\vision\qwen-vision-model-selection.manifest.json"
$Selection = Get-Content $SelectionPath -Raw | ConvertFrom-Json

$Result = [ordered]@{
  receiptId = "agent-lee-qwen-vision-model-install-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  containerName = "leeway_ollama"
  selectedModelTag = $Selection.selectedModelTag
  modelAlreadyPresent = $false
  pullAttempted = $false
  pullSucceeded = $false
  finalModelPresent = $false
  existingModelsPreserved = $false
  providerDrift = $false
  blockers = @()
  truthLabels = @()
  verdict = "QWEN_VISION_MODEL_INSTALL_BLOCKED"
}

$list = docker exec leeway_ollama ollama list 2>$null
if ($LASTEXITCODE -ne 0) {
  $Result.blockers += "Unable to read leeway_ollama model list."
} else {
  $Result.existingModelsPreserved = $true
  if ($list -match [regex]::Escape($Result.selectedModelTag)) {
    $Result.modelAlreadyPresent = $true
    $Result.finalModelPresent = $true
    $Result.verdict = "QWEN_VISION_MODEL_PRESENT_NO_INSTALL_NEEDED"
    $Result.truthLabels += "QWEN_VISION_MODEL_PRESENT"
    $Result.truthLabels += "EXISTING_MODELS_PRESERVED"
    $Result.truthLabels += "NO_MODEL_REPLACEMENT"
  } else {
    $Result.pullAttempted = $true
    docker exec leeway_ollama ollama pull $Result.selectedModelTag | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $Result.pullSucceeded = $true
      $Result.finalModelPresent = $true
      $Result.verdict = "QWEN_VISION_MODEL_INSTALLED"
      $Result.truthLabels += "QWEN_VISION_MODEL_INSTALLED"
      $Result.truthLabels += "EXISTING_MODELS_PRESERVED"
      $Result.truthLabels += "NO_MODEL_REPLACEMENT"
    } else {
      $Result.blockers += "ollama pull failed for $($Result.selectedModelTag)"
    }
  }
}

if (-not $Result.finalModelPresent) {
  $Result.blockers += "Selected model was not confirmed present after install attempt."
}

Write-LeewayJson -Path $ReportPath -Object $Result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $Result | Out-Null
Write-Host "Verdict: $($Result.verdict)"
Write-Host "Report: $ReportPath"
Write-Host "Receipt: $ReceiptPath"
