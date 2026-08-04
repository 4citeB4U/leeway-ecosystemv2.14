[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$KernelRoot = Join-Path $Root "agent-lee-vision-kernel"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-vision-kernel-docker-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-vision\agent-lee-vision-kernel-docker-$Stamp.json"
$BaseUrl = "http://127.0.0.1:8093"

$required = @(
  "vision-server.py",
  "qwen_vision_client.py",
  "vision_manifest.py",
  "vision_receipts.py",
  "vision_input_optimizer.py",
  "vision_response_validator.py",
  "room_vision_policy.py",
  "config.json",
  "requirements.txt",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.production.yml",
  "README.md"
)

$missing = @()
foreach ($name in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $KernelRoot $name))) {
    $missing += $name
  }
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
$container = $null
if ($docker) {
  try {
    $raw = & $docker.Source ps --filter "name=agent-lee-vision-kernel" --format "{{json .}}" 2>$null
    if ($raw) { $container = $raw | Select-Object -First 1 | ConvertFrom-Json }
  } catch {}
}

$health = Invoke-LeewayHttp -Url "$BaseUrl/health" -TimeoutSec 5
$status = Invoke-LeewayHttp -Url "$BaseUrl/vision/status" -TimeoutSec 5
$model = Invoke-LeewayHttp -Url "$BaseUrl/vision/model" -TimeoutSec 5

$blockers = @()
if ($missing.Count -gt 0) { $blockers += "Vision Kernel required files missing: $($missing -join ', ')" }
if (-not $docker) { $blockers += "Docker CLI is not available on PATH." }
if (-not $container) { $blockers += "agent-lee-vision-kernel container is not running. Starting it requires explicit service-start approval." }
if (-not $health.ok) { $blockers += "Vision Kernel /health is not reachable on port 8093." }

$truthLabels = @("NO_MODEL_REPLACEMENT", "NO_PROVIDER_DRIFT", "NO_FAKE_PASS")
if ($missing.Count -eq 0) { $truthLabels += "VISION_KERNEL_FILES_READY" }
if ($container) { $truthLabels += "VISION_KERNEL_CONTAINER_FOUND" }
if ($health.ok) { $truthLabels += "VISION_KERNEL_READY" }

$ready = ($missing.Count -eq 0) -and $container -and $health.ok -and $status.ok -and $model.ok

$result = [ordered]@{
  reportId = "agent-lee-vision-kernel-docker-$Stamp"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  workspaceRoot = $Root
  assistantBodyRole = "CODEX_ASSISTANT_BODY"
  assistantObjectId = "LEEWAY-ASSISTANT-0002"
  authorityLevel = "GOVERNED_ASSISTANT_BODY"
  directAuthority = $false
  governingStandardsRead = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md"
  )
  applicableStandards = @("VISION_TRUTH", "NO_HIDDEN_CAMERA", "NO_FAKE_PASS")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-vision-kernel", "LEEWAY-ASSISTANT-0002")
  selectedModel = "qwen2.5vl:7b"
  kernelRoot = $KernelRoot
  requiredFiles = $required
  missingFiles = $missing
  dockerCliFound = [bool]$docker
  containerFound = [bool]$container
  container = $container
  routes = [ordered]@{
    health = $health
    status = $status
    model = $model
  }
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @()
  validationCommandsRun = @("powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-AgentLeeVisionKernelDocker.ps1")
  validationResults = @()
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = $truthLabels
  verdict = if ($ready) { "VISION_KERNEL_READY" } elseif ($missing.Count -eq 0) { "VISION_KERNEL_DOCUMENT_READY_RUNTIME_UNPROVEN" } else { "VISION_KERNEL_BLOCKED" }
}

Write-LeewayJson -Path $ReportPath -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null
Write-Host "Verdict: $($result.verdict)"
exit $(if ($ready) { 0 } else { 1 })
