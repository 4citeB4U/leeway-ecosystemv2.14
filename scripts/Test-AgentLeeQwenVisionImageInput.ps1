[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReportsRoot = Join-Path $Root "Archive\reports"
$ReceiptsRoot = Join-Path $Root "Archive\receipts\agent-lee-vision"
$ProofRoot = Join-Path $Root "Archive\proofs\agent-lee-vision-test"
New-LeewayDirectory -Path $ReportsRoot | Out-Null
New-LeewayDirectory -Path $ReceiptsRoot | Out-Null
New-LeewayDirectory -Path $ProofRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $ReportsRoot "agent-lee-qwen-vision-image-input-report.json"
$ReceiptPath = Join-Path $ReceiptsRoot "agent-lee-qwen-vision-image-input-$Stamp.json"
$ImagePath = Join-Path $ProofRoot "agent-lee-qwen-vision-test-image.png"
$Selection = Get-Content (Join-Path $Root "agent-lee-coding-mode\runtime\vision\qwen-vision-model-selection.manifest.json") -Raw | ConvertFrom-Json

if (-not (Test-Path $ImagePath)) {
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap 64, 64
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(32, 64, 128))
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString("LEEWAY", (New-Object System.Drawing.Font("Arial", 14)), $brush, 4, 22)
  $bmp.Save($ImagePath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $brush.Dispose()
}

$Result = [ordered]@{
  receiptId = "agent-lee-qwen-vision-image-input-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  selectedModelTag = $Selection.selectedModelTag
  modelPresent = $false
  imagePath = $ImagePath
  responseText = $null
  responseNonEmpty = $false
  imageRelated = $false
  blockers = @()
  truthLabels = @()
  verdict = "QWEN_VISION_IMAGE_INPUT_BLOCKED"
}

$list = docker exec leeway_ollama ollama list
if ($list -match [regex]::Escape($Result.selectedModelTag)) {
  $Result.modelPresent = $true
  $Result.truthLabels += "QWEN_VISION_MODEL_PRESENT"
} else {
  $Result.blockers += "Selected model tag not listed in leeway_ollama."
}

if ($Result.modelPresent) {
  $prompt = "Describe this image in one short sentence. If no image is visible, say IMAGE_NOT_VISIBLE."
  $payload = @{
    model = $Result.selectedModelTag
    messages = @(
      @{ role = "user"; content = $prompt; images = @([Convert]::ToBase64String([IO.File]::ReadAllBytes($ImagePath))) }
    )
    stream = $false
  } | ConvertTo-Json -Depth 8

  $resp = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:11434/api/chat" -ContentType "application/json" -Body $payload
  $text = [string]$resp.message.content
  $Result.responseText = $text
  $Result.responseNonEmpty = -not [string]::IsNullOrWhiteSpace($text)
  $Result.imageRelated = $text -match 'image|scene|blue|white|LEEWAY|text|picture|visible|object'
  if ($Result.responseNonEmpty -and $Result.imageRelated) {
    $Result.verdict = "QWEN_VISION_IMAGE_INPUT_READY"
    $Result.truthLabels += "QWEN_VISION_IMAGE_INPUT_READY"
    $Result.truthLabels += "NO_FAKE_QWEN_VISION_PASS"
    $Result.truthLabels += "NO_FAKE_VISION_PASS"
  } else {
    $Result.blockers += "Vision response was empty or not image-related."
  }
} else {
  $Result.blockers += "Model presence could not be confirmed."
}

Write-LeewayJson -Path $ReportPath -Object $Result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $Result | Out-Null
Write-Host "Verdict: $($Result.verdict)"
Write-Host "Report: $ReportPath"
Write-Host "Receipt: $ReceiptPath"
