# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VALIDATION::VALIDATE_AGENT_LEE_AUDIO_PLAYBACK_AUDIBLE
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Diagnostic-first proof for audible Agent Lee playback.

[CmdletBinding()]
param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
  [switch]$NoExitOnFail,
  [switch]$VerboseRaw,
  [switch]$SkipHumanConfirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DesktopRuntimeUrl = "http://127.0.0.1:8091"
$DesktopStatusUrl = "$DesktopRuntimeUrl/runtime/status"
$DesktopSpeakUrl = "$DesktopRuntimeUrl/runtime/speak"
$DesktopRuntimeDir = Join-Path $Root "agent-lee-coding-mode\desktop-runtime"
$DesktopRunsDir = Join-Path $DesktopRuntimeDir "runs"
$DesktopTmpDir = Join-Path $DesktopRuntimeDir "tmp"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$ProofStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-audio-playback-audible-proof-$ProofStamp.json"
$ProofPhrase = "Agent Lee audible playback proof $ProofStamp. If you hear this, type YES in the terminal."

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
      if ($null -eq $current) {
        $ok = $false
        break
      }

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

function Save-Receipt {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Report
  )

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $Report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Write-CaseSummary {
  param(
    [Parameter(Mandatory = $true)]$Case,
    [switch]$VerboseRaw
  )

  $status = if ($Case.ok) { "PASS" } else { "FAIL" }
  Write-Host "`n=== $($Case.name) ===" -ForegroundColor Cyan
  Write-Host "Status: $status"
  Write-Host "Route: $($Case.route)"
  Write-Host "HTTP: $($Case.statusCode)"
  Write-Host "Elapsed ms: $($Case.ms)"
  Write-Host "responseMode: $($Case.responseMode)"
  Write-Host "selectedBackend: $($Case.selectedBackend)"
  Write-Host "receiptPath: $($Case.receiptPath)"
  Write-Host "receiptPathExists: $($Case.receiptPathExists)"
  Write-Host "spawned: $($Case.spawned)"
  Write-Host "spawnedPid: $($Case.spawnedPid)"
  Write-Host "spawnedPidSeen: $($Case.spawnedPidSeen)"
  Write-Host "audioArtifactPath: $($Case.audioArtifactPath)"
  Write-Host "audioArtifactLength: $($Case.audioArtifactLength)"
  Write-Host "playbackProcessSeen: $($Case.playbackProcessSeen)"
  Write-Host "playbackProcessCompleted: $($Case.playbackProcessCompleted)"
  Write-Host "humanAudibleConfirm: $($Case.humanAudibleConfirm)"

  if ($Case.error) {
    Write-Host "Error: $($Case.error)" -ForegroundColor Red
  }

  if ($VerboseRaw -or -not $Case.ok) {
    Write-Host "Raw body:" -ForegroundColor DarkCyan
    if ([string]::IsNullOrWhiteSpace([string]$Case.rawBody)) {
      Write-Host "<empty>"
    } else {
      $Case.rawBody -split "`r?`n" | ForEach-Object { Write-Host $_ }
    }
  }
}

function Invoke-AgentLeeProbe {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST")][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $false)][string]$JsonBody = $null,
    [int]$TimeoutSec = 30,
    [switch]$VerboseRaw
  )

  $started = Get-Date
  $probe = [ordered]@{
    name = $Name
    method = $Method
    url = $Url
    ok = $false
    statusCode = 0
    ms = 0
    rawBody = ""
    parsed = $null
    error = $null
  }

  try {
    if ($Method -eq "GET") {
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    } else {
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" -Body $JsonBody -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    }

    $probe.ok = $true
    $probe.statusCode = [int]$response.StatusCode
    $probe.rawBody = [string]$response.Content
  } catch {
    $probe.error = $_.Exception.Message
    if ($_.Exception.Response) {
      try {
        $probe.statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $probe.rawBody = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }
    if ([string]::IsNullOrWhiteSpace($probe.rawBody)) {
      $probe.rawBody = $_.Exception.Message
    }
  }

  $probe.ms = [int]((Get-Date) - $started).TotalMilliseconds
  if (-not [string]::IsNullOrWhiteSpace($probe.rawBody)) {
    try {
      $probe.parsed = $probe.rawBody | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $probe.parsed = $null
    }
  }

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

function Get-AudioFiles {
  param(
    [Parameter(Mandatory = $true)][string]$RunsDir,
    [Parameter(Mandatory = $true)][string]$TmpDir
  )

  $extensions = @("*.mp3", "*.wav", "*.m4a", "*.aac", "*.flac", "*.ogg", "*.wma")
  $files = @()
  foreach ($root in @($RunsDir, $TmpDir)) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($ext in $extensions) {
      $files += Get-ChildItem -Path $root -Recurse -File -Filter $ext -ErrorAction SilentlyContinue
    }
  }

  return @($files | Sort-Object LastWriteTime, FullName -Descending)
}

function Get-PlaybackProcessState {
  param([string]$PlayScriptPath)

  if ([string]::IsNullOrWhiteSpace($PlayScriptPath)) {
    return [ordered]@{
      seen = $false
      completed = $false
      exitCode = $null
      pid = $null
    }
  }

  $matches = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -and $_.CommandLine -match [regex]::Escape($PlayScriptPath)
  }

  return [ordered]@{
    seen = [bool]$matches
    completed = -not [bool]$matches
    exitCode = $null
    pid = if ($matches) { @($matches | Select-Object -ExpandProperty ProcessId) -join "," } else { $null }
  }
}

function Wait-ForPlaybackCompletion {
  param(
    [Parameter(Mandatory = $true)][string]$PlayScriptPath,
    [int]$TimeoutSec = 45
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $state = Get-PlaybackProcessState -PlayScriptPath $PlayScriptPath

  while ($state.seen -and -not $state.completed -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    $state = Get-PlaybackProcessState -PlayScriptPath $PlayScriptPath
  }

  return $state
}

function Wait-ForAudioArtifact {
  param(
    [Parameter(Mandatory = $true)][datetime]$StartTime,
    [Parameter(Mandatory = $true)][string[]]$BaselinePaths,
    [Parameter(Mandatory = $true)][string]$RunsDir,
    [Parameter(Mandatory = $true)][string]$TmpDir,
    [int]$TimeoutSec = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $baseline = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($path in $BaselinePaths) {
    if (-not [string]::IsNullOrWhiteSpace($path)) {
      [void]$baseline.Add($path)
    }
  }

  $best = $null
  while ((Get-Date) -lt $deadline) {
    $candidates = @(Get-AudioFiles -RunsDir $RunsDir -TmpDir $TmpDir | Where-Object {
      $_.LastWriteTime -ge $StartTime -and -not $baseline.Contains($_.FullName)
    })

    if ($candidates.Count -gt 0) {
      $best = $candidates | Select-Object -First 1
      if ($best.Length -gt 0) {
        return $best
      }
    }

    Start-Sleep -Seconds 2
  }

  return $best
}

function Prompt-HumanConfirmation {
  $response = Read-Host "Did you hear Agent Lee say the playback proof phrase? Type YES to confirm"
  return ([string]$response).Trim().ToUpperInvariant() -eq "YES"
}

$Report = [ordered]@{
  schema = "leeway.agent-lee.audio-playback-audible-proof.v1"
  timestamp = (Get-Date).ToString("o")
  workspaceRoot = $Root
  receiptPath = $ReceiptPath
  status = "STARTED"
  ok = $false
  error = $null
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
  proofPhrase = $ProofPhrase
  skipHumanConfirm = [bool]$SkipHumanConfirm
  desktopStatus = $null
  speakHttp = $null
  humanAudibleConfirm = $null
  cases = @()
}

$OverallFailReason = $null
$exitCode = 0

try {
  $baselineFiles = @(Get-AudioFiles -RunsDir $DesktopRunsDir -TmpDir $DesktopTmpDir | Select-Object -ExpandProperty FullName)
  $startTime = Get-Date

  $desktopStatus = Invoke-AgentLeeProbe -Name "desktop_status" -Method "GET" -Url $DesktopStatusUrl -TimeoutSec 15 -VerboseRaw:$VerboseRaw
  $desktopStatusParsed = $desktopStatus.parsed
  $desktopStatusOk = $desktopStatus.ok -and $desktopStatus.statusCode -eq 200 -and ([string](Get-NestedFirstValue -InputObject $desktopStatusParsed -Paths @("ok")) -eq "True" -or [string](Get-NestedFirstValue -InputObject $desktopStatusParsed -Paths @("ok")) -eq "true")

  $payload = [ordered]@{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = $ProofPhrase
    voice = "andrew"
  } | ConvertTo-Json -Compress

  $speakHttp = Invoke-AgentLeeProbe -Name "speak_http" -Method "POST" -Url $DesktopSpeakUrl -JsonBody $payload -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $speakParsed = $speakHttp.parsed
  $speakResult = Get-NestedFirstValue -InputObject $speakParsed -Paths @("result", "body.result")
  $speakReceiptPath = [string](Get-NestedFirstValue -InputObject $speakParsed -Paths @("receiptPath", "runRoot", "result.receiptPath", "result.file"))
  $speakSpawned = [bool](Get-NestedFirstValue -InputObject $speakParsed -Paths @("spawned", "result.spawned", "ok"))
  $speakPid = Get-NestedFirstValue -InputObject $speakParsed -Paths @("pid", "result.pid")
  $speakReceiptExists = $false
  if (-not [string]::IsNullOrWhiteSpace($speakReceiptPath)) {
    $speakReceiptExists = Test-Path -LiteralPath $speakReceiptPath
  }

  $receiptFilePath = [string](Get-NestedFirstValue -InputObject $speakParsed -Paths @("result.receiptPath", "receiptPath", "result.file"))
  if ([string]::IsNullOrWhiteSpace($receiptFilePath)) {
    $receiptFilePath = [string](Get-NestedFirstValue -InputObject $speakParsed -Paths @("result.playScript", "playScript"))
  }

  $artifact = Wait-ForAudioArtifact -StartTime $startTime -BaselinePaths $baselineFiles -RunsDir $DesktopRunsDir -TmpDir $DesktopTmpDir -TimeoutSec 60
  $artifactPath = if ($artifact) { $artifact.FullName } else { $null }
  $artifactLength = if ($artifact) { [int64]$artifact.Length } else { 0 }
  $artifactLastWrite = if ($artifact) { $artifact.LastWriteTime.ToString("o") } else { $null }

  $playScriptPath = [string](Get-NestedFirstValue -InputObject $speakParsed -Paths @("result.playScript", "playScript"))
  if ([string]::IsNullOrWhiteSpace($playScriptPath) -and $artifactPath) {
    $artifactDir = Split-Path -Parent $artifactPath
    $playScriptCandidate = Get-ChildItem -LiteralPath $artifactDir -File -Filter "*.ps1" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($playScriptCandidate) {
      $playScriptPath = $playScriptCandidate.FullName
    }
  }
  $playbackState = if ([string]::IsNullOrWhiteSpace($playScriptPath)) {
    [ordered]@{
      seen = $false
      completed = $false
      exitCode = $null
      pid = $null
    }
  } else {
    Wait-ForPlaybackCompletion -PlayScriptPath $playScriptPath -TimeoutSec 45
  }

  $humanConfirm = $null
  if ($SkipHumanConfirm) {
    $humanConfirm = $null
  } else {
    $humanConfirm = Prompt-HumanConfirmation
  }

  $machinePass = $desktopStatusOk -and $speakHttp.ok -and $speakHttp.statusCode -eq 200 -and $speakSpawned -and $speakReceiptExists -and $artifact -and $artifactLength -gt 0

  $caseRows = @(
    [ordered]@{
      name = "desktop_status"
      ok = $desktopStatusOk
      route = $DesktopStatusUrl
      statusCode = $desktopStatus.statusCode
      ms = $desktopStatus.ms
      responseMode = [string](Get-NestedFirstValue -InputObject $desktopStatusParsed -Paths @("responseMode"))
      selectedBackend = [string](Get-NestedFirstValue -InputObject $desktopStatusParsed -Paths @("selectedBackend"))
      receiptPath = $null
      receiptPathExists = $null
      spawned = $null
      spawnedPid = $null
      spawnedPidSeen = $null
      audioArtifactPath = $null
      audioArtifactLength = 0
      playbackProcessSeen = $null
      playbackProcessCompleted = $null
      humanAudibleConfirm = $null
      error = if ($desktopStatusOk) { $null } else { $desktopStatus.error }
      rawBody = $desktopStatus.rawBody
    },
    [ordered]@{
      name = "speak_http"
      ok = ($speakHttp.ok -and $speakHttp.statusCode -eq 200)
      route = $DesktopSpeakUrl
      statusCode = $speakHttp.statusCode
      ms = $speakHttp.ms
      responseMode = [string](Get-NestedFirstValue -InputObject $speakParsed -Paths @("responseMode", "result.responseMode"))
      selectedBackend = [string](Get-NestedFirstValue -InputObject $speakParsed -Paths @("selectedBackend", "result.selectedBackend"))
      receiptPath = $speakReceiptPath
      receiptPathExists = $speakReceiptExists
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = $humanConfirm
      error = if ($speakHttp.ok -and $speakHttp.statusCode -eq 200) { $null } else { $speakHttp.error }
      rawBody = $speakHttp.rawBody
    },
    [ordered]@{
      name = "receipt_file_exists"
      ok = $speakReceiptExists
      route = $speakReceiptPath
      statusCode = 200
      ms = 0
      responseMode = $null
      selectedBackend = $null
      receiptPath = $speakReceiptPath
      receiptPathExists = $speakReceiptExists
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = $humanConfirm
      error = if ($speakReceiptExists) { $null } else { "Receipt path missing or not found." }
      rawBody = ""
    },
    [ordered]@{
      name = "spawned_pid_seen"
      ok = [bool]$speakPid
      route = $DesktopSpeakUrl
      statusCode = 200
      ms = 0
      responseMode = $null
      selectedBackend = $null
      receiptPath = $speakReceiptPath
      receiptPathExists = $speakReceiptExists
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = $humanConfirm
      error = if ($speakPid) { $null } else { "Spawned PID missing from runtime response." }
      rawBody = ""
    },
    [ordered]@{
      name = "audio_artifact_created"
      ok = [bool]$artifact
      route = $DesktopRunsDir
      statusCode = 200
      ms = 0
      responseMode = $null
      selectedBackend = $null
      receiptPath = $artifactPath
      receiptPathExists = if ($artifactPath) { Test-Path -LiteralPath $artifactPath } else { $false }
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      audioArtifactLastWrite = $artifactLastWrite
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = $humanConfirm
      error = if ($artifact) { $null } else { "No new audio artifact detected." }
      rawBody = ""
    },
    [ordered]@{
      name = "audio_artifact_nonzero"
      ok = ($artifactLength -gt 0)
      route = $artifactPath
      statusCode = 200
      ms = 0
      responseMode = $null
      selectedBackend = $null
      receiptPath = $artifactPath
      receiptPathExists = if ($artifactPath) { Test-Path -LiteralPath $artifactPath } else { $false }
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = $humanConfirm
      error = if ($artifactLength -gt 0) { $null } else { "Audio artifact is zero bytes or missing." }
      rawBody = ""
    },
    [ordered]@{
      name = "playback_process_completed"
      ok = [bool]$playScriptPath -and $playbackState.completed
      route = $playScriptPath
      statusCode = 200
      ms = 0
      responseMode = $null
      selectedBackend = $null
      receiptPath = $playScriptPath
      receiptPathExists = if ($playScriptPath) { Test-Path -LiteralPath $playScriptPath } else { $false }
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = $humanConfirm
      error = if ([bool]$playScriptPath -and $playbackState.completed) { $null } else { "Playback process still appears to be running or could not be observed." }
      rawBody = ""
    },
    [ordered]@{
      name = "human_audible_confirm"
      ok = if ($SkipHumanConfirm) { $true } elseif ($humanConfirm -eq $true) { $true } else { $false }
      route = "terminal human confirmation"
      statusCode = 200
      ms = 0
      responseMode = $null
      selectedBackend = $null
      receiptPath = $null
      receiptPathExists = $null
      spawned = $speakSpawned
      spawnedPid = $speakPid
      spawnedPidSeen = if ($speakPid) { $true } else { $false }
      audioArtifactPath = $artifactPath
      audioArtifactLength = $artifactLength
      playbackProcessSeen = $playbackState.seen
      playbackProcessCompleted = $playbackState.completed
      humanAudibleConfirm = if ($SkipHumanConfirm) { "SKIPPED" } else { [string]$humanConfirm }
      error = if ($SkipHumanConfirm) { $null } elseif ($humanConfirm -eq $true) { $null } else { "Human audible confirmation was not YES." }
      rawBody = ""
    }
  )

  foreach ($case in $caseRows) {
    $Report.cases += [pscustomobject]$case
    Write-CaseSummary -Case $case -VerboseRaw:$VerboseRaw
  }

  $machineCases = @($Report.cases | Where-Object { $_.name -ne "human_audible_confirm" })
  $machinePass = -not ($machineCases | Where-Object { -not $_.ok })
  $humanPass = $SkipHumanConfirm -or ($humanConfirm -eq $true)

  if ($machinePass -and $humanPass -and -not $SkipHumanConfirm) {
    $Report.ok = $true
    $Report.status = "PASS"
  } elseif ($machinePass -and $SkipHumanConfirm) {
    $Report.ok = $true
    $Report.status = "PASS_NO_HUMAN_AUDIO_CONFIRM"
  } elseif (-not $machinePass -and $desktopStatusOk -and $speakHttp.ok -and $speakHttp.statusCode -eq 200 -and (-not $humanPass)) {
    $Report.ok = $false
    $Report.status = "FAIL_AUDIO_NOT_HEARD"
    $OverallFailReason = "HTTP works but audible confirmation was not YES."
  } else {
    $Report.ok = $false
    $Report.status = "FAIL"
    $OverallFailReason = "One or more machine checks failed."
  }

  if (-not $Report.ok) {
    if (-not $OverallFailReason) {
      $OverallFailReason = "One or more checks failed."
    }
    $Report.error = $OverallFailReason
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
        schema = "leeway.agent.lee.audio.playback.audible-proof.v1"
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
    Write-Host ("- {0}: ok={1} route={2} responseMode={3} selectedBackend={4} spawnedPid={5} receiptPathExists={6} audioArtifact={7} ({8} bytes) humanAudibleConfirm={9}" -f `
      $case.name, $case.ok, $case.route, $case.responseMode, $case.selectedBackend, $case.spawnedPid, $case.receiptPathExists, $case.audioArtifactPath, $case.audioArtifactLength, $case.humanAudibleConfirm)
    if ($case.error) {
      Write-Host ("  error: {0}" -f $case.error) -ForegroundColor Yellow
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

  if ($Report.status -eq "FAIL_AUDIO_NOT_HEARD") {
    Write-Host "`nLikely next checks:" -ForegroundColor Yellow
    Write-Host "- Windows output device"
    Write-Host "- Muted app/session"
    Write-Host "- Spawned playback process failing silently"
    Write-Host "- Runtime generating audio but not playing it"
    Write-Host "- Wrong voice backend or missing player"
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
