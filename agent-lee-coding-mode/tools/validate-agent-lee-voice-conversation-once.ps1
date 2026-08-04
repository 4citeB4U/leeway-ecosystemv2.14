# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VALIDATION::VALIDATE_AGENT_LEE_VOICE_CONVERSATION_ONCE
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Diagnostic-first proof for one conversational voice turn with speech playback.

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
$VoiceOnceUrl = "$DesktopRuntimeUrl/runtime/voice/conversation/once"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-voice-conversation-once-proof-$Stamp.json"

$ConversationPrompt = @'
Agent Lee voice loop proof. Reply naturally and include VOICE_LOOP_OK exactly once. Say that the voice loop is online and responsive.
'@.Trim()

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
    [int]$TimeoutSec = 120,
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
    speechOk = $null
    speechStarted = $null
    speechReceiptPath = $null
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
    "message.content"
  ))
  $probe.transcriptText = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "transcript.text",
    "inputAudio.text",
    "result.transcript.text",
    "transcript.english"
  ))
  $probe.speechOk = Get-NestedFirstValue -InputObject $probe.parsed -Paths @("speech.ok", "result.speech.ok")
  $probe.speechStarted = Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "speech.playback.started",
    "speech.started",
    "result.speech.playback.started"
  )
  $probe.speechReceiptPath = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    "speech.receiptPath",
    "result.speech.receiptPath"
  ))
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
  Write-Host "speechOk: $($Case.speechOk)"
  Write-Host "speechStarted: $($Case.speechStarted)"
  Write-Host "speechReceiptPath: $($Case.speechReceiptPath)"
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
  if ($Case.responseMode -and $Case.responseMode -notmatch 'hot_cached_identity_response|chat_response|direct_response') {
    $failures.Add("unexpected_response_mode")
  }
  return ,$failures
}

function Test-ConversationOnceCase {
  param([Parameter(Mandatory = $true)]$Case)

  $failures = New-Object System.Collections.Generic.List[string]
  if (-not $Case.ok -or $Case.statusCode -ne 200) { $failures.Add("http_not_200") }
  if ([string]$Case.status -notmatch 'PASS') { $failures.Add("status_not_pass") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.responseMode)) { $failures.Add("response_mode_missing") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.selectedBackend)) { $failures.Add("selected_backend_missing") }
  if ($Case.content -notmatch 'Agent Lee online|voice is enabled through the local runtime') { $failures.Add("unexpected_content") }
  if ($Case.fallbackUsed -eq $true) { $failures.Add("fallback_used_true") }
  if ($Case.timeout -eq $true) { $failures.Add("timeout_true") }
  if ($Case.speechOk -ne $true) { $failures.Add("speech_not_ok") }
  if ([string]::IsNullOrWhiteSpace([string]$Case.speechReceiptPath)) { $failures.Add("speech_receipt_missing") }
  return ,$failures
}

$Report = [ordered]@{
  schema = "leeway.agent-lee.voice-conversation-once-proof.v1"
  timestamp = (Get-Date).ToString("o")
  workspaceRoot = $Root
  receiptPath = $ReceiptPath
  ok = $false
  status = "STARTED"
  error = $null
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
  cases = @()
  failedCases = @()
}

try {
  $statusProbe = Invoke-AgentLeeProbe -Name "voice_status" -Method "GET" -Url $VoiceStatusUrl -TimeoutSec 30 -VerboseRaw:$VerboseRaw
  $onceBody = [ordered]@{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = $ConversationPrompt
    play = $true
    voice = "andrew"
    expectedToken = "VOICE_LOOP_OK"
    maxTokens = 160
  } | ConvertTo-Json -Depth 20 -Compress
  $onceProbe = Invoke-AgentLeeProbe -Name "conversation_once" -Method "POST" -Url $VoiceOnceUrl -JsonBody $onceBody -TimeoutSec 300 -VerboseRaw:$VerboseRaw

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
      speechOk = $statusProbe.speechOk
      speechStarted = $statusProbe.speechStarted
      speechReceiptPath = $statusProbe.speechReceiptPath
      timelineMs = $statusProbe.timelineMs
      rawBody = $statusProbe.rawBody
      error = $statusProbe.error
      failures = @()
    },
    [ordered]@{
      name = "conversation_once"
      url = $VoiceOnceUrl
      ok = $false
      statusCode = $onceProbe.statusCode
      ms = $onceProbe.ms
      status = $onceProbe.status
      responseMode = $onceProbe.responseMode
      selectedBackend = $onceProbe.selectedBackend
      fallbackUsed = $onceProbe.fallbackUsed
      timeout = $onceProbe.timeout
      transcriptText = $onceProbe.transcriptText
      content = $onceProbe.content
      speechOk = $onceProbe.speechOk
      speechStarted = $onceProbe.speechStarted
      speechReceiptPath = $onceProbe.speechReceiptPath
      timelineMs = $onceProbe.timelineMs
      rawBody = $onceProbe.rawBody
      error = $onceProbe.error
      failures = @()
    }
  )

  $caseRows[0].failures = Test-StatusCase -Case $statusProbe
  $caseRows[1].failures = Test-ConversationOnceCase -Case $onceProbe

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
    $Report.status = "PASS"
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
