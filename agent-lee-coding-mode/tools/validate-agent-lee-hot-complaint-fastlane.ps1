# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VALIDATION::VALIDATE_AGENT_LEE_HOT_COMPLAINT_FASTLANE
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Diagnostic-first proof for Agent Lee hot complaint fast-lane routing.

[CmdletBinding()]
param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
  [switch]$NoExitOnFail,
  [switch]$VerboseRaw
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RouterUrl = "http://127.0.0.1:8080/v1/chat/completions"
$AdapterUrl = "http://127.0.0.1:8787/v1/chat/completions"
$HotBackendCandidates = @(
  $(if ($env:AGENT_LEE_HOT_CHAT_MODEL) { [string]$env:AGENT_LEE_HOT_CHAT_MODEL } else { $null }),
  "qwen3:latest"
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-hot-complaint-fastlane-proof-$Stamp.json"

$LongComplaint = @'
I am still getting the same exact response. Agent Lee is not able to do anything. The downstream model backend did not respond within the VS Code chat window. Current state: the backend is reachable, but the selected model is cold, busy, unhealthy, or timed out. Backend note: request timed out; stale VS Code session or model timeout path, not lock eligible. Voice is not working.
'@.Trim()

$ShortVoiceStatusComplaint = @'
I am not hearing the voice output. Are you working right now?
'@.Trim()

$CodingRequest = @'
Write a JavaScript function named fibonacci that returns the nth Fibonacci number. Return only code, and include one short example call.
'@.Trim()

function Get-NestedFirstValue {
  param(
    [Parameter(Mandatory = $true)]$InputObject,
    [Parameter(Mandatory = $true)][string[]]$Paths
  )

  foreach ($path in $Paths) {
    if ([string]::IsNullOrWhiteSpace($path)) {
      continue
    }

    $current = $InputObject
    $ok = $true

    foreach ($segment in ($path -split '\.')) {
      if ($null -eq $current) {
        $ok = $false
        break
      }

      if ($segment -match '^\d+$') {
        if ($current -is [System.Collections.IList] -and [int]$segment -lt $current.Count) {
          $current = $current[[int]$segment]
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

  $body = ""
  try {
    if ($Exception.Response) {
      $stream = $Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
      }
    }
  } catch {
    $body = ""
  }

  return [string]$body
}

function Invoke-AgentLeeProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Prompt,
    [int]$TimeoutSec = 30,
    [int]$MaxTokens = 96,
    [switch]$VerboseRaw
  )

  $started = Get-Date
  $payload = @{
    model = "agent-lee"
    stream = $false
    temperature = 0
    max_tokens = $MaxTokens
    trace = $true
    messages = @(
      @{
        role = "user"
        content = $Prompt
      }
    )
  } | ConvertTo-Json -Depth 20

  $probe = [ordered]@{
    name = $Name
    url = $Url
    ok = $false
    httpOk = $false
    statusCode = 0
    ms = 0
    error = $null
    rawBody = ""
    parsed = $null
    content = ""
    responseMode = $null
    selectedModel = $null
    selectedBackend = $null
    resolvedBackend = $null
    fallbackUsed = $null
    timeout = $null
    rawStaleTimeoutTextPresent = $false
    contentStaleTimeoutTextPresent = $false
    traceSource = $null
  }

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" -Body $payload -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    $probe.httpOk = $true
    $probe.statusCode = [int]$response.StatusCode
    $probe.rawBody = [string]$response.Content
  } catch {
    $probe.error = $_.Exception.Message
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      try {
        $probe.statusCode = [int]$_.Exception.Response.StatusCode
      } catch {}
    }
    $probe.rawBody = Read-ErrorBody -Exception $_.Exception
    if ([string]::IsNullOrWhiteSpace($probe.rawBody)) {
      $probe.rawBody = $_.Exception.Message
    }
  }

  $probe.ms = [int]((Get-Date) - $started).TotalMilliseconds
  $probe.rawStaleTimeoutTextPresent = [bool]($probe.rawBody -match 'downstream model backend did not respond|request timed out|Backend note')

  if (-not [string]::IsNullOrWhiteSpace($probe.rawBody)) {
    try {
      $probe.parsed = $probe.rawBody | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $probe.parsed = $null
    }
  }

  $probe.content = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'choices.0.message.content',
    'choices.0.text',
    'response',
    'text',
    'content',
    'message.content',
    'agentLeeTurbo.content',
    'agentLeeTurbo.response',
    'agentLeeTurbo.trace.content',
    'agentLeeRouter.content'
  ))

  $probe.responseMode = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeTurbo.responseMode',
    'agentLeeRouter.responseMode',
    'responseMode',
    'trace.responseMode',
    'agentLeeTrace.responseMode',
    'agentLeeTurbo.trace.responseMode',
    'agentLeeTurbo.downstreamTrace.responseMode'
  ))

  $probe.selectedModel = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeTurbo.selectedModel',
    'agentLeeRouter.selectedModel',
    'selectedModel',
    'trace.selectedModel',
    'agentLeeTrace.selectedModel',
    'agentLeeTurbo.trace.selectedModel',
    'agentLeeTurbo.downstreamTrace.selectedModel'
  ))

  $probe.selectedBackend = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeTurbo.selectedBackend',
    'agentLeeRouter.selectedBackend',
    'selectedBackend',
    'trace.selectedBackend',
    'agentLeeTrace.selectedBackend',
    'agentLeeTurbo.trace.selectedBackend',
    'agentLeeTurbo.downstreamTrace.selectedBackend'
  ))

  $probe.resolvedBackend = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeRouter.resolvedBackend',
    'agentLeeTurbo.resolvedBackend',
    'resolvedBackend',
    'trace.resolvedBackend',
    'agentLeeTurbo.trace.resolvedBackend',
    'agentLeeTurbo.downstreamTrace.resolvedBackend'
  ))

  $probe.fallbackUsed = Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeTurbo.fallbackUsed',
    'agentLeeRouter.fallbackUsed',
    'fallbackUsed',
    'trace.fallbackUsed',
    'agentLeeTrace.fallbackUsed',
    'agentLeeTurbo.trace.fallbackUsed',
    'agentLeeTurbo.downstreamTrace.fallbackUsed'
  )

  $probe.timeout = Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeTurbo.timeout',
    'agentLeeRouter.timeout',
    'timeout',
    'trace.timeout',
    'agentLeeTrace.timeout',
    'agentLeeTurbo.trace.timeout',
    'agentLeeTurbo.downstreamTrace.timeout'
  )

  $probe.traceSource = [string](Get-NestedFirstValue -InputObject $probe.parsed -Paths @(
    'agentLeeTrace.label',
    'agentLeeTurbo.trace.label',
    'trace.label'
  ))

  $probe.contentStaleTimeoutTextPresent = [bool]($probe.content -match 'downstream model backend did not respond|request timed out|Backend note')
  $probe.ok = $probe.httpOk -and $probe.statusCode -eq 200

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

  $status = if ($Case.ok) { "PASS" } else { "FAIL" }
  Write-Host "`n=== $($Case.name) ===" -ForegroundColor Cyan
  Write-Host "URL: $($Case.url)"
  Write-Host "Status: $status"
  Write-Host "HTTP: $($Case.statusCode)"
  Write-Host "Elapsed ms: $($Case.ms)"
  Write-Host "responseMode: $($Case.responseMode)"
  Write-Host "selectedModel: $($Case.selectedModel)"
  Write-Host "selectedBackend: $($Case.selectedBackend)"
  Write-Host "resolvedBackend: $($Case.resolvedBackend)"
  Write-Host "fallbackUsed: $($Case.fallbackUsed)"
  Write-Host "timeout: $($Case.timeout)"
  Write-Host "contentStaleTimeoutTextPresent: $($Case.contentStaleTimeoutTextPresent)"
  Write-Host "rawStaleTimeoutTextPresent: $($Case.rawStaleTimeoutTextPresent)"

  if ($Case.error) {
    Write-Host "Error: $($Case.error)" -ForegroundColor Red
  }

  if ($VerboseRaw -or -not $Case.ok) {
    Write-Host "Content:" -ForegroundColor DarkCyan
    if ([string]::IsNullOrWhiteSpace($Case.content)) {
      Write-Host "<empty>"
    } else {
      Write-Host $Case.content
    }
  }
}

function Save-Receipt {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Report
  )

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $json = $Report | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $Path -Value $json -Encoding UTF8
}

function Test-PositiveCase {
  param(
    [Parameter(Mandatory = $true)]$Case,
    [Parameter(Mandatory = $true)][string[]]$AllowedHotBackends
  )

  $failures = New-Object System.Collections.Generic.List[string]

  if (-not $Case.ok) {
    $failures.Add("http_not_200")
  }
  if ($Case.responseMode -ne "hot_cached_identity_response") {
    $failures.Add("response_mode_not_hot_cached_identity_response")
  }
  if ([string]::IsNullOrWhiteSpace($Case.selectedBackend)) {
    $failures.Add("selected_backend_missing")
  } elseif ($AllowedHotBackends -notcontains [string]$Case.selectedBackend) {
    $failures.Add("selected_backend_not_allowed")
  }
  if ($Case.fallbackUsed -eq $true) {
    $failures.Add("fallback_used_true")
  }
  if ($Case.timeout -eq $true) {
    $failures.Add("timeout_true")
  }
  if ($Case.contentStaleTimeoutTextPresent -or $Case.rawStaleTimeoutTextPresent) {
    $failures.Add("stale_timeout_text_present")
  }
  if ($Case.content -notmatch 'Agent Lee online|fast lane|voice is enabled|using the fast lane|Agent Lee ready') {
    $failures.Add("missing_operational_fast_lane_text")
  }

  return ,$failures
}

function Test-NegativeCodingCase {
  param(
    [Parameter(Mandatory = $true)]$Case
  )

  $failures = New-Object System.Collections.Generic.List[string]

  if (-not $Case.ok) {
    $failures.Add("http_not_200")
  }
  if ($Case.responseMode -eq "hot_cached_identity_response") {
    $failures.Add("unexpected_hot_cached_identity_response")
  }
  if ($Case.selectedBackend -ne "qwen2.5-coder:latest") {
    $failures.Add("selected_backend_not_coding_backend")
  }
  if ($Case.fallbackUsed -eq $true) {
    $failures.Add("fallback_used_true")
  }
  if ($Case.timeout -eq $true) {
    $failures.Add("timeout_true")
  }
  if ($Case.contentStaleTimeoutTextPresent -or $Case.rawStaleTimeoutTextPresent) {
    $failures.Add("stale_timeout_text_present")
  }
  if ($Case.content -notmatch '\bfunction\b|\bconst\b|\blet\b|=>|\breturn\b|```') {
    $failures.Add("content_not_code_like")
  }

  return ,$failures
}

$Report = [ordered]@{
  schema = "leeway.agent-lee.hot-complaint-fastlane-proof.v1"
  timestamp = (Get-Date).ToString("o")
  workspaceRoot = $Root
  receiptPath = $ReceiptPath
  routerUrl = $RouterUrl
  adapterUrl = $AdapterUrl
  hotBackendCandidates = $HotBackendCandidates
  ok = $false
  status = "STARTED"
  error = $null
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
  cases = @()
  failedCases = @()
}

$exitCode = 0

try {
  $caseSpecs = @(
    @{
      name = "long_complaint_8080"
      url = $RouterUrl
      prompt = $LongComplaint
      kind = "positive"
    },
    @{
      name = "long_complaint_8787"
      url = $AdapterUrl
      prompt = $LongComplaint
      kind = "positive"
    },
    @{
      name = "short_voice_status_8787"
      url = $AdapterUrl
      prompt = $ShortVoiceStatusComplaint
      kind = "positive"
    },
    @{
      name = "negative_actual_coding_8787"
      url = $AdapterUrl
      prompt = $CodingRequest
      kind = "negative"
    }
  )

  foreach ($spec in $caseSpecs) {
    $probe = Invoke-AgentLeeProbe -Name $spec.name -Url $spec.url -Prompt $spec.prompt -VerboseRaw:$VerboseRaw
    $caseReport = [ordered]@{
      name = $spec.name
      kind = $spec.kind
      url = $spec.url
      ok = $false
      httpOk = $probe.httpOk
      statusCode = $probe.statusCode
      ms = $probe.ms
      responseMode = $probe.responseMode
      selectedModel = $probe.selectedModel
      selectedBackend = $probe.selectedBackend
      resolvedBackend = $probe.resolvedBackend
      fallbackUsed = $probe.fallbackUsed
      timeout = $probe.timeout
      content = $probe.content
      rawBody = $probe.rawBody
      contentStaleTimeoutTextPresent = $probe.contentStaleTimeoutTextPresent
      rawStaleTimeoutTextPresent = $probe.rawStaleTimeoutTextPresent
      error = $probe.error
      failures = @()
    }

    if ($spec.kind -eq "positive") {
      $caseFailures = Test-PositiveCase -Case $probe -AllowedHotBackends $HotBackendCandidates
    } else {
      $caseFailures = Test-NegativeCodingCase -Case $probe
    }

    $caseReport.failures = @($caseFailures)
    if ($caseFailures.Count -eq 0) {
      $caseReport.ok = $true
    } else {
      $Report.failedCases += $spec.name
      if (-not [string]::IsNullOrWhiteSpace($probe.error)) {
        $caseReport.error = $probe.error
      } else {
        $caseReport.error = "Assertions failed: $($caseFailures -join ', ')"
      }
    }

    $Report.cases += [pscustomobject]$caseReport
    Write-CaseSummary -Case $caseReport -VerboseRaw:$VerboseRaw
  }

  if ($Report.failedCases.Count -eq 0) {
    $Report.ok = $true
    $Report.status = "PASS"
  } else {
    $Report.ok = $false
    $Report.status = "FAIL"
    $Report.error = "Failed hot complaint fast-lane cases: $($Report.failedCases -join ', ')"
  }
} catch {
  $Report.ok = $false
  $Report.status = "FAIL"
  $Report.error = $_.Exception.Message
} finally {
  $Report.endedAt = (Get-Date).ToString("o")
  try {
    Save-Receipt -Path $ReceiptPath -Report $Report
  } catch {
    try {
      $fallback = [ordered]@{
        schema = "leeway.agent-lee.hot-complaint-fastlane-proof.v1"
        timestamp = (Get-Date).ToString("o")
        workspaceRoot = $Root
        receiptPath = $ReceiptPath
        ok = $false
        status = "FAIL"
        error = "Receipt write failed: $($_.Exception.Message)"
      }
      $fallback | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
    } catch {}
  }

  Write-Host "`nReceipt: $ReceiptPath" -ForegroundColor Cyan
  Write-Host "Status: $($Report.status)"
  Write-Host "OK: $($Report.ok)"
  if ($Report.error) {
    Write-Host "Error: $($Report.error)" -ForegroundColor Red
  }

  Write-Host "`nCase summaries:" -ForegroundColor Cyan
  foreach ($case in $Report.cases) {
    Write-Host ("- {0}: ok={1} responseMode={2} selectedBackend={3} fallbackUsed={4} timeout={5} staleTimeoutText(content/raw)={6}/{7}" -f `
      $case.name, $case.ok, $case.responseMode, $case.selectedBackend, $case.fallbackUsed, $case.timeout, $case.contentStaleTimeoutTextPresent, $case.rawStaleTimeoutTextPresent)
    if ($case.failures.Count -gt 0) {
      Write-Host ("  failures: {0}" -f ($case.failures -join ", ")) -ForegroundColor Yellow
    }
    if ($VerboseRaw -or -not $case.ok) {
      Write-Host "  raw body:" -ForegroundColor DarkCyan
      if ([string]::IsNullOrWhiteSpace([string]$case.rawBody)) {
        Write-Host "  <empty>"
      } else {
        $case.rawBody -split "`r?`n" | ForEach-Object { Write-Host ("  " + $_) }
      }
    }
  }

  Write-Host "`nFailed cases:" -ForegroundColor Cyan
  if ($Report.failedCases.Count -gt 0) {
    $Report.failedCases
  } else {
    Write-Host "<none>"
  }

  Write-Host "`nReceipt saved to: $ReceiptPath" -ForegroundColor Cyan
}

if ($NoExitOnFail) {
  exit 0
}

if (-not $Report.ok) {
  exit 1
}

exit 0
