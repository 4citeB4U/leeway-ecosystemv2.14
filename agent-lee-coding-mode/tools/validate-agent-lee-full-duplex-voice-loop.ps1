# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VALIDATION::VALIDATE_AGENT_LEE_FULL_DUPLEX_VOICE_LOOP
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Diagnostic-first proof for the end-to-end voice loop, with truthful semi-duplex reporting when barge-in is not implemented.

[CmdletBinding()]
param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
  [switch]$NoExitOnFail,
  [switch]$VerboseRaw
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DesktopRuntimeUrl = "http://127.0.0.1:8091"
$VoiceStatusUrl = "$DesktopRuntimeUrl/runtime/voice/status"
$VoiceTurnUrl = "$DesktopRuntimeUrl/runtime/voice/turn"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$VoiceSamplePath = Join-Path $Root "voice-diagnostics\mic-probe.wav"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-full-duplex-voice-loop-proof-$Stamp.json"

function Get-NestedFirstValue {
  param(
    [Parameter(Mandatory = $true)]$InputObject,
    [Parameter(Mandatory = $true)][string[]]$Paths
  )

  foreach ($path in $Paths) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    $current = $InputObject
    $ok = $true

    foreach ($segment in ($path -split '\.')) {
      if ($null -eq $current) { $ok = $false; break }
      if ($segment -match '^\d+$') {
        $index = [int]$segment
        if ($current -is [System.Collections.IList] -and $index -lt $current.Count) {
          $current = $current[$index]
          continue
        }
        $ok = $false
        break
      }
      if ($current -is [System.Collections.IDictionary] -and $current.Contains($segment)) {
        $current = $current[$segment]
        continue
      }
      if ($current.PSObject -and $current.PSObject.Properties.Name -contains $segment) {
        $current = $current.$segment
        continue
      }
      $ok = $false
      break
    }

    if ($ok -and $null -ne $current -and -not [string]::IsNullOrWhiteSpace([string]$current)) {
      return $current
    }
  }

  return $null
}

function Read-ErrorBody {
  param([Parameter(Mandatory = $true)]$Exception)
  try {
    if ($Exception.Response) {
      $stream = $Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        try { return $reader.ReadToEnd() } finally { $reader.Close() }
      }
    }
  } catch {}
  return ""
}

function Invoke-AgentLeeProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST")][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$JsonBody = $null,
    [int]$TimeoutSec = 300,
    [switch]$VerboseRaw
  )

  $started = Get-Date
  $probe = [ordered]@{
    name = $Name
    url = $Url
    ok = $false
    statusCode = 0
    ms = 0
    rawBody = ""
    parsed = $null
    error = $null
    status = $null
    responseMode = $null
    selectedBackend = $null
    fallbackUsed = $null
    timeout = $null
    content = $null
    transcriptText = $null
    transcriptCaptureMode = $null
    speechOk = $null
    speechStarted = $null
    speechReceiptPath = $null
    bargeInSupported = $null
    bargeInTriggered = $null
    playbackStopped = $null
    timelineMs = $null
  }

  try {
    if ($Method -eq "GET") {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    } else {
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" -Body $JsonBody -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    }

    $probe.ok = $true
    $probe.statusCode = [int]$response.StatusCode
    $probe.rawBody = [string]$response.Content
  } catch {
    $probe.error = $_.Exception.Message
    if ($_.Exception.Response) {
      try { $probe.statusCode = [int]$_.Exception.Response.StatusCode } catch {}
    }
    $probe.rawBody = Read-ErrorBody -Exception $_.Exception
    if ([string]::IsNullOrWhiteSpace($probe.rawBody)) {
      $probe.rawBody = $_.Exception.Message
    }
  }

  $probe.ms = [int]((Get-Date) - $started).TotalMilliseconds
  if (-not [string]::IsNullOrWhiteSpace($probe.rawBody)) {
    try { $probe.parsed = $probe.rawBody | ConvertFrom-Json -ErrorAction Stop } catch { $probe.parsed = $null }
  }

  $probe.status = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @("status", "result.status"))
  $probe.responseMode = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "agent.responseMode",
    "responseMode",
    "agentLeeTurbo.responseMode",
    "trace.responseMode",
    "agentLeeTurbo.trace.responseMode"
  ))
  $probe.selectedBackend = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "agent.selectedBackend",
    "selectedBackend",
    "agentLeeTurbo.selectedBackend",
    "trace.selectedBackend",
    "agentLeeTurbo.trace.selectedBackend"
  ))
  $probe.fallbackUsed = Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "agent.fallbackUsed",
    "fallbackUsed",
    "agentLeeTurbo.fallbackUsed",
    "trace.fallbackUsed",
    "agentLeeTurbo.trace.fallbackUsed"
  )
  $probe.timeout = Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "agent.timeout",
    "timeout",
    "agentLeeTurbo.timeout",
    "trace.timeout",
    "agentLeeTurbo.trace.timeout"
  )
  $probe.content = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "agent.content",
    "content",
    "result.agent.content",
    "result.content",
    "choices.0.message.content"
  ))
  $probe.transcriptText = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "transcript.text",
    "transcript.english",
    "inputAudio.transcript",
    "result.transcript.text",
    "result.transcript.english"
  ))
  $probe.transcriptCaptureMode = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "transcript.captureMode",
    "inputAudio.captureMode",
    "result.transcript.captureMode",
    "result.inputAudio.captureMode"
  ))
  $probe.speechOk = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("speech.ok", "result.speech.ok")
  $probe.speechStarted = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("speech.playback.started", "speech.started", "result.speech.playback.started")
  $probe.speechReceiptPath = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @("speech.receiptPath", "result.speech.receiptPath"))
  $probe.bargeInSupported = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("bargeInSupported", "result.bargeInSupported")
  $probe.bargeInTriggered = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("bargeInTriggered", "result.bargeInTriggered")
  $probe.playbackStopped = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("playbackStopped", "result.playbackStopped")
  $probe.timelineMs = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("timeline.totalMs", "result.timeline.totalMs")

  if ($VerboseRaw -or -not $probe.ok) {
    Write-Host "`n[RAW] $Name" -ForegroundColor DarkCyan
    if ([string]::IsNullOrWhiteSpace($probe.rawBody)) {
      Write-Host "<empty>"
    } else {
      Write-Host $probe.rawBody
    }
  }

  return [pscustomobject]$probe
}

function Write-CaseSummary {
  param(
    [Parameter(Mandatory = $true)]$Case,
    [switch]$VerboseRaw
  )

  $state = if ($Case.ok) { "PASS" } else { "FAIL" }
  Write-Host "`n=== $($Case.name) ===" -ForegroundColor Cyan
  Write-Host "Status: $state"
  Write-Host "URL: $($Case.url)"
  Write-Host "HTTP: $($Case.statusCode)"
  Write-Host "Elapsed ms: $($Case.ms)"
  Write-Host "status field: $($Case.status)"
  Write-Host "responseMode: $($Case.responseMode)"
  Write-Host "selectedBackend: $($Case.selectedBackend)"
  Write-Host "fallbackUsed: $($Case.fallbackUsed)"
  Write-Host "timeout: $($Case.timeout)"
  Write-Host "transcriptText: $($Case.transcriptText)"
  Write-Host "transcriptCaptureMode: $($Case.transcriptCaptureMode)"
  Write-Host "speechOk: $($Case.speechOk)"
  Write-Host "speechStarted: $($Case.speechStarted)"
  Write-Host "speechReceiptPath: $($Case.speechReceiptPath)"
  Write-Host "bargeInSupported: $($Case.bargeInSupported)"
  Write-Host "bargeInTriggered: $($Case.bargeInTriggered)"
  Write-Host "playbackStopped: $($Case.playbackStopped)"
  Write-Host "timelineMs: $($Case.timelineMs)"
  if ($Case.error) {
    Write-Host "Error: $($Case.error)" -ForegroundColor Red
  }

  if ($VerboseRaw -or -not $Case.ok) {
    Write-Host "Raw body:" -ForegroundColor DarkCyan
    if ([string]::IsNullOrWhiteSpace([string]$Case.rawBody)) {
      Write-Host "<empty>"
    } else {
      Write-Host $Case.rawBody
    }
  }
}

function Save-Receipt {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Report
  )

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $Report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Test-StatusCase {
  param([Parameter(Mandatory = $true)]$Case)

  $failures = New-Object System.Collections.Generic.List[string]
  if (-not $Case.ok -or $Case.statusCode -ne 200) { $failures.Add("http_not_200") }
  if ([string]$Case.status -notmatch 'PASS') { $failures.Add("status_not_pass") }
  return ,$failures
}

function Test-TurnCase {
  param([Parameter(Mandatory = $true)]$Case)

  $failures = New-Object System.Collections.Generic.List[string]
  if (-not $Case.ok -or $Case.statusCode -ne 200) { $failures.Add("http_not_200") }
  if ([string]$Case.status -notmatch 'PASS') { $failures.Add("status_not_pass") }
  if ($Case.transcriptCaptureMode -ne "transcribe") { $failures.Add("capture_mode_not_transcribe") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.transcriptText)) { $failures.Add("transcript_empty") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.responseMode)) { $failures.Add("response_mode_missing") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.selectedBackend)) { $failures.Add("selected_backend_missing") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.content)) { $failures.Add("content_empty") }
  if ($Case.speechOk -ne $true) { $failures.Add("speech_not_ok") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.speechReceiptPath)) { $failures.Add("speech_receipt_missing") }
  if ($Case.fallbackUsed -eq $true) { $failures.Add("fallback_used_true") }
  if ($Case.timeout -eq $true) { $failures.Add("timeout_true") }
  if ($Case.bargeInSupported -ne $true) { $failures.Add("barge_in_supported_not_true") }
  if ($Case.bargeInTriggered -ne $false) { $failures.Add("barge_in_triggered_not_false") }
  if ($Case.playbackStopped -ne $false) { $failures.Add("playback_stopped_not_false") }
  return ,$failures
}

$Report = [ordered]@{
  schema = "leeway.agent-lee.full-duplex-voice-loop-proof.v1"
  timestamp = (Get-Date).ToString("o")
  workspaceRoot = $Root
  receiptPath = $ReceiptPath
  voiceSamplePath = $VoiceSamplePath
  ok = $false
  status = "STARTED"
  error = $null
  fullDuplexClaimed = $true
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
  cases = @()
  failedCases = @()
}

try {
  if (-not (Test-Path -LiteralPath $VoiceSamplePath)) {
    throw "Voice sample wav not found: $VoiceSamplePath"
  }

  $statusProbe = Invoke-AgentLeeProbe -Name "voice_status" -Method "GET" -Url $VoiceStatusUrl -TimeoutSec 30 -VerboseRaw:$VerboseRaw
  $turnBody = [ordered]@{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    wavPath = $VoiceSamplePath
    sttProvider = "local_whisper"
    sttModel = "tiny.en"
    voice = "andrew"
    play = $true
    expectedToken = "VOICE_LOOP_OK"
    maxTokens = 128
  } | ConvertTo-Json -Depth 20 -Compress
  $turnProbe = Invoke-AgentLeeProbe -Name "turn_sample_wav" -Method "POST" -Url $VoiceTurnUrl -JsonBody $turnBody -TimeoutSec 300 -VerboseRaw:$VerboseRaw

  $caseRows = @(
    [ordered]@{
      name = "voice_status"
      url = $VoiceStatusUrl
      ok = $false
      statusCode = $statusProbe.statusCode
      ms = $statusProbe.ms
      status = $statusProbe.status
      responseMode = $statusProbe.responseMode
      selectedBackend = $statusProbe.selectedBackend
      fallbackUsed = $statusProbe.fallbackUsed
      timeout = $statusProbe.timeout
      transcriptText = $statusProbe.transcriptText
      transcriptCaptureMode = $statusProbe.transcriptCaptureMode
      speechOk = $statusProbe.speechOk
      speechStarted = $statusProbe.speechStarted
      speechReceiptPath = $statusProbe.speechReceiptPath
      bargeInSupported = $statusProbe.bargeInSupported
      bargeInTriggered = $statusProbe.bargeInTriggered
      playbackStopped = $statusProbe.playbackStopped
      timelineMs = $statusProbe.timelineMs
      rawBody = $statusProbe.rawBody
      error = $statusProbe.error
      failures = @()
    },
    [ordered]@{
      name = "turn_sample_wav"
      url = $VoiceTurnUrl
      ok = $false
      statusCode = $turnProbe.statusCode
      ms = $turnProbe.ms
      status = $turnProbe.status
      responseMode = $turnProbe.responseMode
      selectedBackend = $turnProbe.selectedBackend
      fallbackUsed = $turnProbe.fallbackUsed
      timeout = $turnProbe.timeout
      content = $turnProbe.content
      transcriptText = $turnProbe.transcriptText
      transcriptCaptureMode = $turnProbe.transcriptCaptureMode
      speechOk = $turnProbe.speechOk
      speechStarted = $turnProbe.speechStarted
      speechReceiptPath = $turnProbe.speechReceiptPath
      bargeInSupported = $turnProbe.bargeInSupported
      bargeInTriggered = $turnProbe.bargeInTriggered
      playbackStopped = $turnProbe.playbackStopped
      timelineMs = $turnProbe.timelineMs
      rawBody = $turnProbe.rawBody
      error = $turnProbe.error
      failures = @()
    }
  )

  $caseRows[0].failures = Test-StatusCase -Case $statusProbe
  $caseRows[1].failures = Test-TurnCase -Case $turnProbe

  foreach ($case in $caseRows) {
    if ($case.failures.Count -eq 0) {
      $case.ok = $true
    } else {
      $Report.failedCases += $case.name
      if (-not $case.error) {
        $case.error = "Assertions failed: $($case.failures -join ', ')"
      }
    }

    $Report.cases += [pscustomobject]$case
    Write-CaseSummary -Case $case -VerboseRaw:$VerboseRaw
  }

  if ($Report.failedCases.Count -eq 0) {
    $Report.ok = $true
    $Report.status = "PASS_FULL_DUPLEX"
  } else {
    $Report.ok = $false
    $Report.status = "FAIL"
    $Report.error = "Failed cases: $($Report.failedCases -join ', ')"
  }
} catch {
  $Report.ok = $false
  $Report.status = "FAIL"
  $Report.error = $_.Exception.Message
} finally {
  $Report.endedAt = (Get-Date).ToString("o")
  try { Save-Receipt -Path $ReceiptPath -Report $Report } catch {}

  Write-Host "`nReceipt: $ReceiptPath" -ForegroundColor Cyan
  Write-Host "Status: $($Report.status)"
  Write-Host "OK: $($Report.ok)"
  if ($Report.error) {
    Write-Host "Error: $($Report.error)" -ForegroundColor Red
  }
  Write-Host "fullDuplexClaimed: $($Report.fullDuplexClaimed)"

  Write-Host "`nFailed cases:" -ForegroundColor Cyan
  if ($Report.failedCases.Count -gt 0) {
    $Report.failedCases | ForEach-Object { Write-Host "- $_" }
  } else {
    Write-Host "<none>"
  }

  Write-Host "`nReceipt saved to: $ReceiptPath" -ForegroundColor Cyan
  if (-not $NoExitOnFail -and -not $Report.ok) { exit 1 }
  exit 0
}
