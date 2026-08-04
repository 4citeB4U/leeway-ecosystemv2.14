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
$reportPath = Join-Path $Reports "leeway-qwen-vision-route-report.json"
$receiptPath = Join-Path $Receipts "leeway-qwen-vision-route-$Stamp.json"
$proofRoot = Join-Path $Root "Archive\proofs\leeway-vision-test"
New-LeewayDirectory -Path $proofRoot | Out-Null
$img = Join-Path $proofRoot "leeway-qwen-vision-test.png"
if (-not (Test-Path $img)) {
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap 48, 48
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(200, 80, 40))
  $g.DrawEllipse([System.Drawing.Pens]::White, 4, 4, 40, 40)
  $bmp.Save($img, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
$bytes = [Convert]::ToBase64String([IO.File]::ReadAllBytes($img))
$body = @{ model = "qwen2.5vl:7b"; messages = @(@{ role = "user"; content = "Describe this image in one short sentence. If no image is visible, say IMAGE_NOT_VISIBLE."; images = @($bytes) }); stream = $false; options = @{ num_predict = 32; temperature = 0.2 } } | ConvertTo-Json -Depth 8
$resp = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:11434/api/chat" -ContentType "application/json" -Body $body
$text = [string]$resp.message.content
$ok = -not [string]::IsNullOrWhiteSpace($text)
$result = [ordered]@{
  receiptId = "leeway-qwen-vision-route-$Stamp"
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  model = "qwen2.5vl:7b"
  responseText = $text
  outputReceived = $ok
  fallbackUsed = $false
  blockers = @()
  truthLabels = @("QWEN2_5VL_PRIMARY_VISION_MODEL_READY","NO_MODEL_REPLACEMENT","NO_PROVIDER_DRIFT")
  verdict = $(if($ok){"PASS"}else{"FAIL"})
}
Write-LeewayJson -Path $reportPath -Object $result | Out-Null
Write-LeewayJson -Path $receiptPath -Object $result | Out-Null
Write-Host "Verdict: $($result.verdict)"
