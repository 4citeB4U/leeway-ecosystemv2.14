[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\agent-lee-voice-kernel-health-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-voice\agent-lee-voice-kernel-health-$Stamp.json"
$BaseUrl = "http://127.0.0.1:8092"

function Test-TcpPort {
  param([string]$HostName, [int]$Port)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync($HostName, $Port)
    if (-not $task.Wait(1500)) { return $false }
    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
$container = $null
if ($docker) {
  try {
    $raw = & $docker.Source ps --filter "name=agent-lee-voice-kernel" --format "{{json .}}" 2>$null
    if ($raw) { $container = $raw | Select-Object -First 1 | ConvertFrom-Json }
  } catch {}
}

$portOpen = Test-TcpPort -HostName "127.0.0.1" -Port 8092
$health = Invoke-LeewayHttp -Url "$BaseUrl/health" -TimeoutSec 8
$voiceIdentity = Invoke-LeewayHttp -Url "$BaseUrl/voice-identity" -TimeoutSec 8
$voiceStatus = Invoke-LeewayHttp -Url "$BaseUrl/voice/status" -TimeoutSec 5
$tts = Invoke-LeewayHttp -Url "$BaseUrl/tts" -Method POST -Body @{
  text = "Agent Lee voice kernel health check."
  voice = "agent-lee"
  language = "en"
  speed = 1.0
} -TimeoutSec 45

$blockers = @()
if (-not $docker) { $blockers += "Docker CLI is not available on PATH." }
if (-not $container) { $blockers += "agent-lee-voice-kernel container was not found running by docker ps." }
if (-not $portOpen) { $blockers += "Port 8092 is not reachable on 127.0.0.1." }
if (-not $health.ok) { $blockers += "GET /health did not return HTTP success." }
if ($health.ok -and [string]::IsNullOrWhiteSpace($health.rawBody)) { $blockers += "GET /health returned an empty body." }
if (-not $tts.ok) { $blockers += "POST /tts did not return HTTP success within the bounded timeout." }

$truthLabels = @("NO_PROVIDER_DRIFT", "NO_FAKE_PASS")
if ($container) { $truthLabels += "VOICE_KERNEL_CONTAINER_FOUND" }
if ($portOpen) { $truthLabels += "VOICE_KERNEL_PORT_OPEN" }
if ($health.ok) { $truthLabels += "VOICE_KERNEL_HEALTH_ROUTE_CONTACTED" }
if ($tts.ok) { $truthLabels += "VOICE_KERNEL_TTS_ROUTE_CONTACTED" }

$ready = $container -and $portOpen -and $health.ok -and $tts.ok
if ($ready) { $truthLabels += "VOICE_KERNEL_HEALTH_READY" }

$result = [ordered]@{
  reportId = "agent-lee-voice-kernel-health-$Stamp"
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
  applicableStandards = @("VOICE_TRUTH", "NO_FAKE_PASS", "RECEIPT_REQUIRED")
  requestedBy = "Leonard J Lee"
  creatorRootAuthority = "Leonard J Lee"
  objectIds = @("agent-lee-voice-kernel", "LEEWAY-ASSISTANT-0002")
  dockerCliFound = [bool]$docker
  containerFound = [bool]$container
  container = $container
  port = 8092
  portOpen = $portOpen
  health = $health
  voiceIdentity = $voiceIdentity
  voiceStatus = $voiceStatus
  tts = $tts
  modifiedFiles = @()
  generatedFiles = @($ReportPath, $ReceiptPath)
  backedUpFiles = @()
  validationCommandsRun = @("powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-AgentLeeVoiceKernelHealth.ps1")
  validationResults = @()
  receiptsWritten = @($ReceiptPath)
  blockers = $blockers
  truthLabels = $truthLabels
  verdict = if ($ready) { "VOICE_KERNEL_HEALTH_READY" } else { "VOICE_KERNEL_HEALTH_PARTIAL_BLOCKERS_REMAIN" }
}

Write-LeewayJson -Path $ReportPath -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null
Write-Host "Verdict: $($result.verdict)"
exit $(if ($ready) { 0 } else { 1 })
