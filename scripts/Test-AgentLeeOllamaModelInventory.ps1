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
$ReportPath = Join-Path $ReportsRoot "agent-lee-ollama-model-inventory-report.json"
$ReceiptPath = Join-Path $ReceiptsRoot "agent-lee-ollama-model-inventory-$Stamp.json"
$SelectionManifestPath = Join-Path $Root "agent-lee-coding-mode\runtime\vision\qwen-vision-model-selection.manifest.json"

function Get-ModelClass {
  param([string]$Name)
  $lower = $Name.ToLowerInvariant()
  if ($lower -match 'vl|vision') { return 'VISION_CAPABLE_CANDIDATE' }
  if ($lower -match 'coder') { return 'CODER' }
  if ($lower -match 'qwen3$|qwen3:latest|qwen2\.5$|qwen2\.5:latest') { return 'TEXT_ONLY' }
  return 'UNKNOWN'
}

$Result = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  ollamaContainerFound = $false
  ollamaContainerRunning = $false
  hostOllamaReachable = $false
  dockerOllamaReachable = $false
  models = @()
  visionCapableCandidates = @()
  selectedVisionModelCandidate = $null
  blockers = @()
  truthLabels = @()
  verdict = "OLLAMA_MODEL_INVENTORY_BLOCKED"
}

$dockerPs = docker ps --format "{{.Names}}`t{{.Status}}" 2>$null
if ($LASTEXITCODE -eq 0) {
  $match = $dockerPs | Select-String -Pattern '^leeway_ollama|^leeway-ollama|ollama'
  if ($match) {
    $Result.ollamaContainerFound = $true
    if ($match.ToString() -match 'Up') { $Result.ollamaContainerRunning = $true }
  }
}

try {
  $hostTags = Invoke-LeewayHttp -Url "http://127.0.0.1:11434/api/tags" -TimeoutSec 8
  if ($hostTags.ok -and $hostTags.parsed) {
    $Result.hostOllamaReachable = $true
    foreach ($model in @($hostTags.parsed.models)) {
      $tag = [string]$model.name
      $class = Get-ModelClass -Name $tag
      $Result.models += [ordered]@{ name = $tag; class = $class; source = "host" }
      if ($class -eq 'VISION_CAPABLE_CANDIDATE') { $Result.visionCapableCandidates += $tag }
    }
  }
} catch {}

if ($Result.ollamaContainerFound) {
  try {
    $dockerList = docker exec leeway_ollama ollama list 2>$null
    if ($LASTEXITCODE -eq 0 -and $dockerList) {
      $Result.dockerOllamaReachable = $true
      $lines = $dockerList | Select-Object -Skip 1
      foreach ($line in $lines) {
        $name = ($line -split '\s+')[0]
        if ($name) {
          $class = Get-ModelClass -Name $name
          $Result.models += [ordered]@{ name = $name; class = $class; source = "docker" }
          if ($class -eq 'VISION_CAPABLE_CANDIDATE') { $Result.visionCapableCandidates += $name }
        }
      }
    }
  } catch {}
}

$Result.visionCapableCandidates = @($Result.visionCapableCandidates | Select-Object -Unique)
if ($Result.visionCapableCandidates.Count -gt 0) {
  $Result.selectedVisionModelCandidate = $Result.visionCapableCandidates[0]
  $Result.truthLabels += "QWEN_VISION_MODEL_SELECTED"
  $Result.verdict = "OLLAMA_MODEL_INVENTORY_READY"
} else {
  $Result.blockers += "No local vision-capable Qwen model was proven in Ollama tags."
  $Result.truthLabels += "QWEN_VISION_MODEL_MISSING"
  if ($Result.hostOllamaReachable -or $Result.dockerOllamaReachable) {
    $Result.verdict = "OLLAMA_MODEL_INVENTORY_PARTIAL"
  }
}

if ($Result.ollamaContainerFound) { $Result.truthLabels += "OLLAMA_CONTAINER_FOUND" }
if ($Result.ollamaContainerRunning) { $Result.truthLabels += "OLLAMA_CONTAINER_RUNNING" }
if ($Result.hostOllamaReachable) { $Result.truthLabels += "OLLAMA_MODEL_INVENTORY_READY" }
if (-not $Result.visionCapableCandidates.Count) { $Result.truthLabels += "NO_MODEL_REPLACEMENT"; $Result.truthLabels += "NO_PROVIDER_DRIFT"; $Result.truthLabels += "NO_FAKE_QWEN_VISION_PASS" }

Write-LeewayJson -Path $ReportPath -Object $Result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $Result | Out-Null

Write-Host "Verdict: $($Result.verdict)"
Write-Host "Report: $ReportPath"
Write-Host "Receipt: $ReceiptPath"
