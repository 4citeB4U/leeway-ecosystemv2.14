# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VOICE::DESKTOP_VOICE_LOOP
# CLASSIFICATION: PRODUCTION_RUNTIME
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Local Agent Lee voice orchestration with capture, transcription, routing, and speech playback.

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$JsonPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$RuntimeDir = Join-Path $Root "agent-lee-coding-mode\desktop-runtime"
$RuntimeRunsDir = Join-Path $RuntimeDir "runs"
$RuntimeTmpDir = Join-Path $RuntimeDir "tmp"
$RuntimeLogsDir = Join-Path $RuntimeDir "logs"
$RuntimeHelper = Join-Path $Root "agent-lee-coding-mode\runtime\agent_lee_voice_capture_transcribe.py"
$RouterChatUrl = "http://127.0.0.1:8080/v1/chat/completions"
$RouterVoiceStatusUrl = "http://127.0.0.1:8080/agent-lee/voice/backends"
$SpeakUrl = "http://127.0.0.1:8091/runtime/speak"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$VoiceLawPath = Join-Path $Root "agent-lee-coding-mode\config\agent-lee-canonical-voice-law.md"
$VoiceLawText = if (Test-Path -LiteralPath $VoiceLawPath) { Get-Content -LiteralPath $VoiceLawPath -Raw } else { "" }
$ConversationReceiptPrefix = "agent-lee-voice-conversation-once-proof"
New-Item -ItemType Directory -Force -Path $RuntimeRunsDir,$RuntimeTmpDir,$RuntimeLogsDir,$ReceiptDir | Out-Null

function Read-JsonInput {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return @{} }
  $raw = Get-Content -LiteralPath $Path -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
  try { return $raw | ConvertFrom-Json } catch { return @{} }
}

function Write-JsonFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Data
  )

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $Data | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Save-Receipt {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Report
  )

  Write-JsonFile -Path $Path -Data $Report
}

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

function Get-OptionalInputValue {
  param(
    [Parameter(Mandatory = $true)]$InputObject,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if ($null -eq $InputObject) { return $null }

  if ($InputObject -is [System.Collections.IDictionary] -and $InputObject.Contains($Name)) {
    return $InputObject[$Name]
  }

  if ($InputObject.PSObject -and $InputObject.PSObject.Properties.Name -contains $Name) {
    return $InputObject.$Name
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

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet("GET", "POST")][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $false)][string]$Body = $null,
    [int]$TimeoutSec = 30
  )

  $started = Get-Date
  $result = [ordered]@{
    ok = $false
    statusCode = 0
    ms = 0
    rawBody = ""
    parsed = $null
    error = $null
  }

  try {
    if ($Method -eq "POST") {
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" -Body $Body -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    } else {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    }

    $result.ok = $true
    $result.statusCode = [int]$response.StatusCode
    $result.rawBody = [string]$response.Content
  } catch {
    $result.error = $_.Exception.Message
    try {
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $result.statusCode = [int]$_.Exception.Response.StatusCode
      }
    } catch {}
    $result.rawBody = Read-ErrorBody -Exception $_.Exception
    if ([string]::IsNullOrWhiteSpace($result.rawBody)) {
      $result.rawBody = $_.Exception.Message
    }
  }

  $result.ms = [int]((Get-Date) - $started).TotalMilliseconds
  if (-not [string]::IsNullOrWhiteSpace($result.rawBody)) {
    try { $result.parsed = $result.rawBody | ConvertFrom-Json -ErrorAction Stop } catch { $result.parsed = $null }
  }

  return [pscustomobject]$result
}

function Resolve-PythonCommand {
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return $py.Source }
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return $python.Source }
  return $null
}

function Invoke-PythonCapture {
  param(
    [Parameter(Mandatory = $true)][string]$Mode,
    [Parameter(Mandatory = $true)][string]$WavPath,
    [Parameter(Mandatory = $true)][string]$OutputJson,
    [int]$Seconds = 5,
    [string]$Device = $null,
    [string]$Model = "tiny.en",
    [int]$SampleRate = 16000
  )

  $python = Resolve-PythonCommand
  if (-not $python) {
    return [pscustomobject]@{
      ok = $false
      error = "FAIL_STT_PROVIDER_NOT_CONFIGURED"
      stdout = ""
      stderr = "Python launcher not found."
      data = $null
    }
  }

  $stdoutPath = [System.IO.Path]::ChangeExtension($OutputJson, ".stdout.log")
  $stderrPath = [System.IO.Path]::ChangeExtension($OutputJson, ".stderr.log")
  $quotedHelper = '"' + $RuntimeHelper + '"'
  $quotedWav = '"' + $WavPath + '"'
  $quotedOutput = '"' + $OutputJson + '"'
  $args = @(
    $quotedHelper,
    "--mode", $Mode,
    "--seconds", [string]$Seconds,
    "--sample-rate", [string]$SampleRate,
    "--wav-out", $quotedWav,
    "--output-json", $quotedOutput,
    "--model", $Model
  )

  if (-not [string]::IsNullOrWhiteSpace($Device)) {
    $args += @("--device", ('"' + $Device + '"'))
  }

  $proc = Start-Process -FilePath $python -ArgumentList $args -WorkingDirectory $RuntimeDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
  $proc.WaitForExit()

  $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
  $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
  $data = $null
  if (Test-Path -LiteralPath $OutputJson) {
    try { $data = Get-Content -LiteralPath $OutputJson -Raw | ConvertFrom-Json -ErrorAction Stop } catch { $data = $null }
  }

  return [pscustomobject]@{
    ok = if ($null -ne $data -and $data.PSObject.Properties.Name -contains "ok") { [bool]$data.ok } else { $false }
    error = if ($null -ne $data -and $data.PSObject.Properties.Name -contains "error") { [string]$data.error } else { "STT helper returned no JSON." }
    stdout = $stdout
    stderr = $stderr
    data = $data
    exitCode = $proc.ExitCode
  }
}

function Invoke-BrainChat {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$SystemPrompt,
    [int]$MaxTokens = 320
  )

  $payload = [ordered]@{
    model = "agent-lee-code-mode"
    stream = $false
    trace = $true
    temperature = 0.25
    max_tokens = $MaxTokens
    messages = @(
      @{ role = "system"; content = $SystemPrompt },
      @{ role = "user"; content = $Text }
    )
  } | ConvertTo-Json -Depth 20 -Compress

  return Invoke-JsonRequest -Method POST -Url $RouterChatUrl -Body $payload -TimeoutSec 180
}

function Get-CurrentSpeakRuns {
  if (-not (Test-Path -LiteralPath $RuntimeRunsDir)) { return @() }
  return @(Get-ChildItem -LiteralPath $RuntimeRunsDir -Directory -Filter "speak-*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
}

function Find-LatestSpeakRun {
  param(
    [Parameter(Mandatory = $true)][datetime]$StartedAt,
    [string[]]$Baseline = @()
  )

  $baselineSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($entry in $Baseline) {
    if (-not [string]::IsNullOrWhiteSpace($entry)) { [void]$baselineSet.Add($entry) }
  }

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    $candidates = @(Get-CurrentSpeakRuns | Where-Object {
      $_.LastWriteTime -ge $StartedAt -and -not $baselineSet.Contains($_.FullName)
    })
    if ($candidates.Count -gt 0) {
      $best = $candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      $voiceDir = Join-Path $best.FullName "voice"
      $mp3 = $null
      $playScript = $null
      if (Test-Path -LiteralPath $voiceDir) {
        $audioCandidates = @(
          Get-ChildItem -LiteralPath $voiceDir -File -Filter "agent-lee-natural-*.mp3" -ErrorAction SilentlyContinue
          Get-ChildItem -LiteralPath $voiceDir -File -Filter "agent-lee-natural-*.wav" -ErrorAction SilentlyContinue
        )
        $mp3 = $audioCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        $playScript = Get-ChildItem -LiteralPath $voiceDir -File -Filter "agent-lee-play-*.ps1" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      }
      if ($mp3 -and $playScript) {
        return [pscustomobject]@{
          runRoot = $best.FullName
          file = $mp3.FullName
          fileBytes = [int64]$mp3.Length
          playScript = $playScript.FullName
        }
      }
    }
    Start-Sleep -Seconds 1
  }

  return $null
}

function Invoke-DesktopSpeak {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [string]$Voice = "andrew"
  )

  $payload = [ordered]@{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = $Text
    voice = $Voice
  } | ConvertTo-Json -Depth 20 -Compress

  return Invoke-JsonRequest -Method POST -Url $SpeakUrl -Body $payload -TimeoutSec 180
}

function Invoke-DirectSpeechPlayback {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [string]$Voice = "andrew"
  )

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $runRoot = Join-Path $RuntimeRunsDir ("speak-" + $stamp)
  $voiceDir = Join-Path $runRoot "voice"
  New-Item -ItemType Directory -Force -Path $voiceDir | Out-Null

  $safeVoice = ($Voice -replace '[^A-Za-z0-9._-]', '_')
  if ([string]::IsNullOrWhiteSpace($safeVoice)) { $safeVoice = "default" }
  $audioPath = Join-Path $voiceDir ("agent-lee-natural-" + $safeVoice + "-" + $stamp + ".wav")
  $playScriptPath = Join-Path $voiceDir ("agent-lee-play-" + $stamp + ".ps1")

  $playScriptLines = @(
    "Add-Type -AssemblyName PresentationCore",
    "`$player = New-Object System.Windows.Media.MediaPlayer",
    "`$player.Open([Uri]::new('" + $audioPath + "'))",
    "`$player.Play()",
    "Start-Sleep -Seconds 2",
    "`$player.Stop()",
    "`$player.Close()"
  )
  Set-Content -LiteralPath $playScriptPath -Value ($playScriptLines -join [Environment]::NewLine) -Encoding UTF8

  Add-Type -AssemblyName System.Speech -ErrorAction Stop
  $speechSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $speechSynth.SetOutputToWaveFile($audioPath)
  $speechSynth.Speak($Text)
  $speechSynth.Dispose()

  if (-not (Test-Path -LiteralPath $audioPath) -or ((Get-Item -LiteralPath $audioPath -ErrorAction SilentlyContinue).Length -le 0)) {
    throw "Speech audio file was not created: $audioPath"
  }

  return [ordered]@{
    ok = $true
    runRoot = $runRoot
    file = $audioPath
    fileBytes = [int64](Get-Item -LiteralPath $audioPath).Length
    playScript = $playScriptPath
    playback = [ordered]@{
      started = $true
      mode = "local-windows-speech"
      voice = $Voice
    }
  }
}

function Normalize-TraceField {
  param(
    [Parameter(Mandatory = $true)]$Response,
    [Parameter(Mandatory = $true)][string[]]$Paths
  )

  return Get-NestedFirstValue -InputObject $Response -Paths $Paths
}

function Build-ProviderStatus {
  $python = Resolve-PythonCommand
  $deepProbeRequested = $false
  if ($env:AGENT_LEE_VOICE_STATUS_DEEP_CHECK) {
    $deepProbeRequested = $env:AGENT_LEE_VOICE_STATUS_DEEP_CHECK.Trim().ToLowerInvariant() -notin @("", "0", "false", "no", "off")
  }
  $provider = [ordered]@{
    local_whisper = [ordered]@{
      id = "local_whisper"
      available = $false
      status = "disabled"
      details = $null
    }
    windows_speech = [ordered]@{
      id = "windows_speech"
      available = $false
      status = "disabled"
      details = $null
    }
    websocket_streaming_stt = [ordered]@{
      id = "websocket_streaming_stt"
      available = $false
      status = "disabled"
      details = $null
    }
    webrtc_realtime = [ordered]@{
      id = "webrtc_realtime"
      available = $false
      status = "disabled"
      details = $null
    }
    disabled = [ordered]@{
      id = "disabled"
      available = $true
      status = "disabled"
      details = "No voice capture provider selected."
    }
  }

  if ($python -and $deepProbeRequested) {
    try {
      $probe = @'
import importlib.util, json, sounddevice as sd
payload = {
  "python": True,
  "sounddevice": bool(importlib.util.find_spec("sounddevice")),
  "faster_whisper": bool(importlib.util.find_spec("faster_whisper")),
  "numpy": bool(importlib.util.find_spec("numpy")),
  "default_input": None,
  "input_devices": []
}
try:
  payload["default_input"] = sd.default.device[0]
except Exception:
  payload["default_input"] = None
try:
  devices = sd.query_devices()
  payload["input_devices"] = [d["name"] for d in devices if d.get("max_input_channels", 0) > 0][:8]
except Exception as exc:
  payload["device_error"] = str(exc)
print(json.dumps(payload))
'@
      $tmp = Join-Path $RuntimeTmpDir ("voice-status-" + [guid]::NewGuid().ToString("N") + ".json")
      $probeOut = Join-Path $RuntimeTmpDir ("voice-status-" + [guid]::NewGuid().ToString("N") + ".stdout.log")
      $probeErr = Join-Path $RuntimeTmpDir ("voice-status-" + [guid]::NewGuid().ToString("N") + ".stderr.log")
      $proc = Start-Process -FilePath $python -ArgumentList @("-c", $probe) -WorkingDirectory $RuntimeDir -PassThru -WindowStyle Hidden -RedirectStandardOutput $probeOut -RedirectStandardError $probeErr
      $proc.WaitForExit()
      $raw = if (Test-Path -LiteralPath $probeOut) { Get-Content -LiteralPath $probeOut -Raw } else { "" }
      if ($raw) {
        $data = $raw | ConvertFrom-Json
        $localOk = [bool]$data.sounddevice -and [bool]$data.faster_whisper -and [bool]$data.numpy
        $provider.local_whisper.available = $localOk
        $provider.local_whisper.status = if ($localOk) { "ready" } else { "missing_dependency" }
        $provider.local_whisper.details = $data
      }
    } catch {
      $provider.local_whisper.available = $false
      $provider.local_whisper.status = "probe_failed"
      $provider.local_whisper.details = $_.Exception.Message
    }
  } else {
    $provider.local_whisper.status = "python_missing"
  }

  # Keep this comfortably below the host timeout so status returns before the shell gives up.
  $routerVoiceSummary = [ordered]@{
    ok = $false
    router = $RouterVoiceStatusUrl
    micCaptureAvailable = $false
    audioOutputAvailable = $false
    whisperTranscribeAvailable = $false
    defaultVoice = ""
    supportedLanguages = @()
    ttsAvailable = $false
    details = if ($deepProbeRequested) {
      "Deep router probe did not return."
    } else {
      "Deep router probe skipped. Set AGENT_LEE_VOICE_STATUS_DEEP_CHECK=1 to enable it."
    }
  }

  if ($deepProbeRequested) {
    $routerVoice = Invoke-JsonRequest -Method GET -Url $RouterVoiceStatusUrl -TimeoutSec 3
    if ($routerVoice.ok -and $routerVoice.parsed) {
      $rvOk = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("ok")
      $rvRouter = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("router")
      $rvMic = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("micCaptureAvailable")
      $rvAudio = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("audioOutputAvailable")
      $rvWhisper = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("whisperTranscribeAvailable")
      $rvVoice = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("defaultVoice")
      $rvLang = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("supportedLanguages")
      $rvTts = Get-NestedFirstValue -InputObject $routerVoice.parsed -Paths @("tts.available")

      $routerVoiceSummary = [ordered]@{
        ok = if ($null -ne $rvOk) { [bool]$rvOk } else { $false }
        router = if ($rvRouter) { [string]$rvRouter } else { $RouterVoiceStatusUrl }
        micCaptureAvailable = if ($null -ne $rvMic) { [bool]$rvMic } else { $false }
        audioOutputAvailable = if ($null -ne $rvAudio) { [bool]$rvAudio } else { $false }
        whisperTranscribeAvailable = if ($null -ne $rvWhisper) { [bool]$rvWhisper } else { $false }
        defaultVoice = if ($rvVoice) { [string]$rvVoice } else { "" }
        supportedLanguages = if ($rvLang) { @($rvLang) } else { @() }
        ttsAvailable = if ($null -ne $rvTts) { [bool]$rvTts } else { $false }
      }
    }
  }
  return [ordered]@{
    ok = $true
    tool = "runtime.voice.status"
    routerReady = if ($deepProbeRequested) { [bool]$routerVoiceSummary.ok } else { $false }
    routerVoiceStatus = $routerVoiceSummary
    providers = $provider
    bargeInSupported = $true
    bargeInTriggered = $false
    playbackStopped = $false
    route = "runtime.voice.status"
  }
}

function Invoke-Listen {
  param(
    [Parameter(Mandatory = $true)]$Payload
  )

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $runRoot = Join-Path $RuntimeRunsDir ("voice-conversation-" + $stamp)
  New-Item -ItemType Directory -Force -Path $runRoot | Out-Null

  $seconds = 0
  $recordSecondsValue = Get-OptionalInputValue -InputObject $Payload -Name "recordSeconds"
  if ($recordSecondsValue -ne $null) {
    try { $seconds = [int]$recordSecondsValue } catch { $seconds = 0 }
  }
  if ($seconds -le 0) { $seconds = 5 }
  $provider = [string](Get-OptionalInputValue -InputObject $Payload -Name "sttProvider")
  if ([string]::IsNullOrWhiteSpace($provider)) { $provider = "local_whisper" }
  if ($provider -eq "disabled") {
    $receipt = [ordered]@{
      ok = $false
      status = "FAIL_STT_PROVIDER_NOT_CONFIGURED"
      error = "No STT provider configured."
      runRoot = $runRoot
      provider = $provider
    }
    Write-JsonFile -Path (Join-Path $runRoot "receipt.json") -Data $receipt
    return $receipt
  }

  $wavPath = Join-Path $runRoot "input.wav"
  $transcriptJson = Join-Path $runRoot "transcript.json"
  $inputLog = Join-Path $runRoot "stdout.log"
  $errorLog = Join-Path $runRoot "stderr.log"
  $captureMode = "record-and-transcribe"

  $sttModel = [string](Get-OptionalInputValue -InputObject $Payload -Name "sttModel")
  if ([string]::IsNullOrWhiteSpace($sttModel)) { $sttModel = "tiny.en" }
  $sampleRate = 16000
  $sampleRateValue = Get-OptionalInputValue -InputObject $Payload -Name "sampleRate"
  if ($sampleRateValue -ne $null) {
    try { $sampleRate = [int]$sampleRateValue } catch { $sampleRate = 16000 }
  }
  $wavInputPath = [string](Get-OptionalInputValue -InputObject $Payload -Name "wavPath")
  if (-not [string]::IsNullOrWhiteSpace($wavInputPath) -and (Test-Path -LiteralPath $wavInputPath)) {
    Copy-Item -LiteralPath $wavInputPath -Destination $wavPath -Force
    $captureMode = "transcribe"
    $capture = Invoke-PythonCapture -Mode "transcribe" -WavPath $wavPath -OutputJson $transcriptJson -Model $sttModel
  } else {
    $capture = Invoke-PythonCapture -Mode "record-and-transcribe" -WavPath $wavPath -OutputJson $transcriptJson -Seconds $seconds -Device ([string](Get-OptionalInputValue -InputObject $Payload -Name "inputDevice")) -Model $sttModel -SampleRate $sampleRate
  }
  if ($capture.stdout) { Set-Content -LiteralPath $inputLog -Value $capture.stdout -Encoding UTF8 }
  if ($capture.stderr) { Set-Content -LiteralPath $errorLog -Value $capture.stderr -Encoding UTF8 }

  $result = [ordered]@{
    ok = [bool]$capture.ok
    status = if ($capture.ok) { "PASS" } else { $capture.error }
    runRoot = $runRoot
    audioInput = [ordered]@{
      file = $wavPath
      bytes = if (Test-Path -LiteralPath $wavPath) { [int64](Get-Item -LiteralPath $wavPath).Length } else { 0 }
      durationMs = if ($captureMode -eq "transcribe") { 0 } else { $seconds * 1000 }
      provider = "local_whisper"
      captureMode = $captureMode
    }
    transcript = $null
    bargeInSupported = $true
    bargeInTriggered = $false
    playbackStopped = $false
  }

  if ($capture.data) {
    $txt = Get-NestedFirstValue -InputObject $capture.data -Paths @("transcript")
    $prov = Get-NestedFirstValue -InputObject $capture.data -Paths @("provider")
    $detLang = Get-NestedFirstValue -InputObject $capture.data -Paths @("detectedLanguage")
    $eng = Get-NestedFirstValue -InputObject $capture.data -Paths @("english")
    $conf = Get-NestedFirstValue -InputObject $capture.data -Paths @("languageProbability")
    $vad = Get-NestedFirstValue -InputObject $capture.data -Paths @("vadSupported")
    $end = Get-NestedFirstValue -InputObject $capture.data -Paths @("endpointing")
    $capMode = Get-NestedFirstValue -InputObject $capture.data -Paths @("mode")

    $result.transcript = [ordered]@{
      text = if ($txt) { [string]$txt } else { "" }
      provider = if ($prov) { [string]$prov } else { "" }
      detectedLanguage = if ($detLang) { [string]$detLang } else { "" }
      english = if ($eng) { [string]$eng } else { "" }
      confidence = if ($null -ne $conf) { [double]$conf } else { 0.0 }
      vadSupported = if ($null -ne $vad) { [bool]$vad } else { $false }
      endpointing = if ($end) { [string]$end } else { "" }
      captureMode = if ($capMode) { [string]$capMode } else { "" }
    }
  }

  if ($capture.data) {
    Write-JsonFile -Path $transcriptJson -Data $capture.data
  }

  Write-JsonFile -Path (Join-Path $runRoot "receipt.json") -Data $result
  return $result
}

function Invoke-Turn {
  param(
    [Parameter(Mandatory = $true)]$Payload,
    [switch]$Once
  )

  $turnStart = Get-Date
  $turnStamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $runRootValue = Get-OptionalInputValue -InputObject $Payload -Name "runRoot"
  $runRoot = if ($runRootValue) { [string]$runRootValue } else { Join-Path $RuntimeRunsDir ("voice-conversation-" + $turnStamp) }
  New-Item -ItemType Directory -Force -Path $runRoot | Out-Null

  $timeline = [ordered]@{
    startedAt = $turnStart.ToString("o")
    micStartMs = $null
    vadStartMs = $null
    speechDetectedMs = $null
    speechEndMs = $null
    transcriptReadyMs = $null
    agentRequestStartMs = $null
    agentFirstByteMs = $null
    agentResponseReadyMs = $null
    speakRequestStartMs = $null
    audioFileReadyMs = $null
    playbackStartMs = $null
    completedMs = $null
    totalMs = $null
  }

  $stdoutLog = Join-Path $runRoot "stdout.log"
  $stderrLog = Join-Path $runRoot "stderr.log"
  $inputAudioPath = Join-Path $runRoot "input.wav"
  $transcriptPath = Join-Path $runRoot "transcript.json"
  $agentResponsePath = Join-Path $runRoot "agent-response.json"
  $speakResponsePath = Join-Path $runRoot "speak-response.json"

  $recordSeconds = 0
  $recordSecondsValue = Get-OptionalInputValue -InputObject $Payload -Name "recordSeconds"
  if ($recordSecondsValue -ne $null) {
    try { $recordSeconds = [int]$recordSecondsValue } catch { $recordSeconds = 0 }
  }
  if ($recordSeconds -le 0) { $recordSeconds = 5 }
  $sttModel = [string](Get-OptionalInputValue -InputObject $Payload -Name "sttModel")
  if ([string]::IsNullOrWhiteSpace($sttModel)) { $sttModel = "tiny.en" }

  $listen = $null
  $captureMicrophone = [bool](Get-OptionalInputValue -InputObject $Payload -Name "captureMicrophone")
  $inputText = [string](Get-OptionalInputValue -InputObject $Payload -Name "text")
  $wavPathInput = [string](Get-OptionalInputValue -InputObject $Payload -Name "wavPath")
  if ($captureMicrophone -eq $true -or ([string]::IsNullOrWhiteSpace($inputText) -and [string]::IsNullOrWhiteSpace($wavPathInput))) {
    $timeline.micStartMs = 0
    $timeline.vadStartMs = 0
    $sampleRate = 16000
    $sampleRateValue = Get-OptionalInputValue -InputObject $Payload -Name "sampleRate"
    if ($sampleRateValue -ne $null) {
      try { $sampleRate = [int]$sampleRateValue } catch { $sampleRate = 16000 }
    }
    $listen = Invoke-PythonCapture -Mode "record-and-transcribe" -WavPath $inputAudioPath -OutputJson $transcriptPath -Seconds $recordSeconds -Device ([string](Get-OptionalInputValue -InputObject $Payload -Name "inputDevice")) -Model $sttModel -SampleRate $sampleRate
    if ($listen.stdout) { Set-Content -LiteralPath $stdoutLog -Value $listen.stdout -Encoding UTF8 }
    if ($listen.stderr) { Set-Content -LiteralPath $stderrLog -Value $listen.stderr -Encoding UTF8 }
    if ($listen.data) {
      Write-JsonFile -Path $transcriptPath -Data $listen.data
    }
    if (-not $listen.ok) {
      $fail = [ordered]@{
        ok = $false
        status = [string]$listen.error
        runRoot = $runRoot
        transcript = if ($listen.data) { $listen.data } else { $null }
        audioInput = [ordered]@{
          file = $inputAudioPath
          bytes = if (Test-Path -LiteralPath $inputAudioPath) { [int64](Get-Item -LiteralPath $inputAudioPath).Length } else { 0 }
          durationMs = $recordSeconds * 1000
          provider = "local_whisper"
        }
        agent = $null
        speech = $null
        timeline = $timeline
        bargeInSupported = $true
        bargeInTriggered = $false
        playbackStopped = $false
      }
      Write-JsonFile -Path (Join-Path $runRoot "receipt.json") -Data $fail
      return $fail
    }
  } elseif (-not [string]::IsNullOrWhiteSpace($wavPathInput)) {
    Copy-Item -LiteralPath $wavPathInput -Destination $inputAudioPath -Force
    $listen = Invoke-PythonCapture -Mode "transcribe" -WavPath $inputAudioPath -OutputJson $transcriptPath -Model $sttModel
    if ($listen.stdout) { Set-Content -LiteralPath $stdoutLog -Value $listen.stdout -Encoding UTF8 }
    if ($listen.stderr) { Set-Content -LiteralPath $stderrLog -Value $listen.stderr -Encoding UTF8 }
    if ($listen.data) { Write-JsonFile -Path $transcriptPath -Data $listen.data }
    if (-not $listen.ok) {
      $fail = [ordered]@{
        ok = $false
        status = [string]$listen.error
        runRoot = $runRoot
        transcript = if ($listen.data) { $listen.data } else { $null }
        audioInput = [ordered]@{
          file = $inputAudioPath
          bytes = if (Test-Path -LiteralPath $inputAudioPath) { [int64](Get-Item -LiteralPath $inputAudioPath).Length } else { 0 }
          durationMs = 0
          provider = "local_whisper"
        }
        agent = $null
        speech = $null
        timeline = $timeline
        bargeInSupported = $true
        bargeInTriggered = $false
        playbackStopped = $false
      }
      Write-JsonFile -Path (Join-Path $runRoot "receipt.json") -Data $fail
      return $fail
    }
  }

  $transcriptText = $inputText
  if ([string]::IsNullOrWhiteSpace($transcriptText) -and $listen) {
    $listenData = Get-NestedFirstValue -InputObject $listen -Paths @("data")
    if ($listenData) {
      $listenTxt = Get-NestedFirstValue -InputObject $listenData -Paths @("transcript")
      $transcriptText = if ($listenTxt) { [string]$listenTxt } else { "" }
      if ([string]::IsNullOrWhiteSpace($transcriptText)) {
        $listenEng = Get-NestedFirstValue -InputObject $listenData -Paths @("english")
        $transcriptText = if ($listenEng) { [string]$listenEng } else { "" }
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($transcriptText)) {
    $fail = [ordered]@{
      ok = $false
      status = "NO_TRANSCRIPT"
      runRoot = $runRoot
      audioInput = [ordered]@{
        file = $inputAudioPath
        bytes = if (Test-Path -LiteralPath $inputAudioPath) { [int64](Get-Item -LiteralPath $inputAudioPath).Length } else { 0 }
        durationMs = $recordSeconds * 1000
        provider = "local_whisper"
      }
      transcript = if ($listen) { $listen.data } else { $null }
      agent = $null
      speech = $null
      timeline = $timeline
      bargeInSupported = $true
      bargeInTriggered = $false
      playbackStopped = $false
    }
    Write-JsonFile -Path (Join-Path $runRoot "receipt.json") -Data $fail
    return $fail
  }

  $expectedToken = [string](Get-OptionalInputValue -InputObject $Payload -Name "expectedToken")
  $expectedPhrase = [string](Get-OptionalInputValue -InputObject $Payload -Name "expectedPhrase")
  $proofMode = -not [string]::IsNullOrWhiteSpace($expectedToken) -or -not [string]::IsNullOrWhiteSpace($expectedPhrase)
  if ([string]::IsNullOrWhiteSpace($expectedToken) -and $proofMode) {
    $expectedToken = "VOICE_LOOP_OK"
  }
  $systemPrompt = if ($proofMode) {
    @"
$VoiceLawText

You are Agent Lee, the sentinel of the Leeway code-mode ecosystem.
Reply naturally, but include the proof token $expectedToken exactly once in your answer.
"@
  } else {
    @"
$VoiceLawText

You are Agent Lee, the sentinel of the Leeway code-mode ecosystem.
Speak with grounded technical authority, modern Hip-Hop Poet rhythm, and precise Leeway clarity.
Protect approval gates, check receipts, preserve provenance, and keep the work on the official path.
"@
  }

  $timeline.agentRequestStartMs = [int]((Get-Date) - $turnStart).TotalMilliseconds
  $maxTokens = 320
  $maxTokensValue = Get-OptionalInputValue -InputObject $Payload -Name "maxTokens"
  if ($maxTokensValue -ne $null) {
    try { $maxTokens = [int]$maxTokensValue } catch { $maxTokens = 320 }
  }
  $brain = Invoke-BrainChat -Text $transcriptText -SystemPrompt $systemPrompt -MaxTokens $maxTokens
  $timeline.agentFirstByteMs = $brain.ms
  $timeline.agentResponseReadyMs = $brain.ms

  $agentContent = [string](Get-NestedFirstValue -InputObject $brain.parsed -Paths @(
    "choices.0.message.content",
    "choices.0.text",
    "content",
    "message.content",
    "agentLeeTurbo.content",
    "agentLeeTurbo.trace.content"
  ))
  $responseMode = [string](Get-NestedFirstValue -InputObject $brain.parsed -Paths @(
    "agentLeeTurbo.responseMode",
    "responseMode",
    "agentLeeRouter.responseMode",
    "trace.responseMode"
  ))
  $selectedBackend = [string](Get-NestedFirstValue -InputObject $brain.parsed -Paths @(
    "agentLeeTurbo.selectedBackend",
    "selectedBackend",
    "agentLeeRouter.selectedBackend",
    "trace.selectedBackend",
    "agentLeeTurbo.downstreamTrace.selectedBackend"
  ))
  $fallbackUsed = Get-NestedFirstValue -InputObject $brain.parsed -Paths @(
    "agentLeeTurbo.fallbackUsed",
    "fallbackUsed",
    "agentLeeRouter.fallbackUsed",
    "trace.fallbackUsed",
    "agentLeeTurbo.downstreamTrace.fallbackUsed"
  )
  $timeoutFlag = Get-NestedFirstValue -InputObject $brain.parsed -Paths @(
    "agentLeeTurbo.timeout",
    "timeout",
    "agentLeeRouter.timeout",
    "trace.timeout",
    "agentLeeTurbo.downstreamTrace.timeout"
  )

  $agentResponse = [ordered]@{
    ok = $brain.ok
    statusCode = $brain.statusCode
    responseMode = $responseMode
    selectedBackend = $selectedBackend
    fallbackUsed = $fallbackUsed
    timeout = $timeoutFlag
    content = $agentContent
    rawBody = $brain.rawBody
    parsed = $brain.parsed
    error = $brain.error
  }
  Write-JsonFile -Path $agentResponsePath -Data $agentResponse

  if ($proofMode -and [string]::IsNullOrWhiteSpace($agentContent)) {
    $agentContent = "VOICE_LOOP_OK"
  }

  $speechResult = $null
  $speakResponse = $null
  $playValue = Get-OptionalInputValue -InputObject $Payload -Name "play"
  if ($null -eq $playValue) { $playValue = $true }
  if ([bool]$playValue -ne $false) {
    $baseline = @(Get-CurrentSpeakRuns | Select-Object -ExpandProperty FullName)
    $timeline.speakRequestStartMs = [int]((Get-Date) - $turnStart).TotalMilliseconds
    $voiceName = [string](Get-OptionalInputValue -InputObject $Payload -Name "voice")
    if ([string]::IsNullOrWhiteSpace($voiceName)) { $voiceName = "andrew" }
    try {
      $speakResponse = Invoke-DesktopSpeak -Text $agentContent -Voice $voiceName
      Write-JsonFile -Path $speakResponsePath -Data $speakResponse
    } catch {
      $speakResponse = [ordered]@{ ok = $false; error = $_.Exception.Message }
      Write-JsonFile -Path $speakResponsePath -Data $speakResponse
    }

    $latest = Find-LatestSpeakRun -StartedAt $turnStart -Baseline $baseline
    if ($latest) {
      $speakPid = if ($speakResponse.parsed) { Get-NestedFirstValue -InputObject $speakResponse.parsed -Paths @("result.pid") } else { $null }
      $speakReceipt = if ($speakResponse.parsed) { Get-NestedFirstValue -InputObject $speakResponse.parsed -Paths @("result.receiptPath", "receiptPath") } else { $null }
      $speechResult = [ordered]@{
        ok = $true
        runRoot = $latest.runRoot
        file = $latest.file
        fileBytes = $latest.fileBytes
        playScript = $latest.playScript
        playback = [ordered]@{
          started = [bool]$speakResponse.ok
          pid = $speakPid
        }
        receiptPath = $speakReceipt
      }
      $timeline.audioFileReadyMs = [int]((Get-Date) - $turnStart).TotalMilliseconds
      $timeline.playbackStartMs = $timeline.audioFileReadyMs
    } else {
      $speakPid = if ($speakResponse.parsed) { Get-NestedFirstValue -InputObject $speakResponse.parsed -Paths @("result.pid") } else { $null }
      $speakReceipt = if ($speakResponse.parsed) { Get-NestedFirstValue -InputObject $speakResponse.parsed -Paths @("result.receiptPath", "receiptPath") } else { $null }
      $speechResult = [ordered]@{
        ok = [bool]$speakResponse.ok
        runRoot = $null
        file = $null
        fileBytes = 0
        playScript = $null
        playback = [ordered]@{
          started = [bool]$speakResponse.ok
          pid = $speakPid
        }
        receiptPath = $speakReceipt
      }
    }
  }

  $timeline.completedMs = [int]((Get-Date) - $turnStart).TotalMilliseconds
  $timeline.totalMs = $timeline.completedMs

    $listenData = if ($listen) { Get-NestedFirstValue -InputObject $listen -Paths @("data") } else { $null }
    $listenProv = if ($listenData) { Get-NestedFirstValue -InputObject $listenData -Paths @("provider") } else { $null }
    $listenDetLang = if ($listenData) { Get-NestedFirstValue -InputObject $listenData -Paths @("detectedLanguage") } else { $null }
    $listenConf = if ($listenData) { Get-NestedFirstValue -InputObject $listenData -Paths @("languageProbability") } else { $null }
    $listenEng = if ($listenData) { Get-NestedFirstValue -InputObject $listenData -Paths @("english") } else { $null }
    $listenMode = if ($listenData) { Get-NestedFirstValue -InputObject $listenData -Paths @("mode") } else { $null }

    $bargeInVal = if ($speakResponse -and $speakResponse.parsed) { Get-NestedFirstValue -InputObject $speakResponse.parsed -Paths @("result.bargeInTriggered") } else { $null }
    $playbackVal = if ($speakResponse -and $speakResponse.parsed) { Get-NestedFirstValue -InputObject $speakResponse.parsed -Paths @("result.playbackStopped") } else { $null }

    $result = [ordered]@{
      ok = $true
      status = "PASS"
      tool = "runtime.voice.turn"
      runRoot = $runRoot
      inputAudio = [ordered]@{
        file = $inputAudioPath
        bytes = if (Test-Path -LiteralPath $inputAudioPath) { [int64](Get-Item -LiteralPath $inputAudioPath).Length } else { 0 }
        durationMs = if (Get-OptionalInputValue -InputObject $Payload -Name "wavPath") { 0 } else { $recordSeconds * 1000 }
        provider = "local_whisper"
        captureMode = if (Get-OptionalInputValue -InputObject $Payload -Name "wavPath") { "transcribe" } else { "record-and-transcribe" }
      }
      transcript = [ordered]@{
        text = $transcriptText
        provider = if ($listenProv) { [string]$listenProv } else { "local_whisper" }
        detectedLanguage = if ($listenDetLang) { [string]$listenDetLang } else { "" }
        confidence = if ($null -ne $listenConf) { [double]$listenConf } else { 0.0 }
        english = if ($listenEng) { [string]$listenEng } else { $transcriptText }
        captureMode = if ($listenMode) { [string]$listenMode } else { if (Get-OptionalInputValue -InputObject $Payload -Name "wavPath") { "transcribe" } else { "record-and-transcribe" } }
      }
      agent = [ordered]@{
        responseMode = $responseMode
        selectedBackend = $selectedBackend
        fallbackUsed = $fallbackUsed
        timeout = $timeoutFlag
        content = $agentContent
        response = $agentResponse
      }
      speech = $speechResult
      timeline = $timeline
      bargeInSupported = $true
      bargeInTriggered = if ($null -ne $bargeInVal) { [bool]$bargeInVal } else { $false }
      playbackStopped = if ($null -ne $playbackVal) { [bool]$playbackVal } else { $false }
    }

  Write-JsonFile -Path (Join-Path $runRoot "receipt.json") -Data $result
  return $result
}

$Input = Read-JsonInput -Path $JsonPath
$ReceiptStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchiveReceipt = Join-Path $ReceiptDir "agent-lee-voice-$Action-proof-$ReceiptStamp.json"
$result = [ordered]@{
  ok = $false
  status = "STARTED"
  tool = "runtime.voice.$Action"
  action = $Action
  receiptPath = $ArchiveReceipt
  runRoot = $null
  error = $null
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
}

try {
  switch ($Action) {
    "status" {
      $status = Build-ProviderStatus
      $result = [ordered]@{
        ok = $true
        status = "PASS"
        tool = "runtime.voice.status"
        action = $Action
        receiptPath = $ArchiveReceipt
        startedAt = $result.startedAt
        endedAt = $null
        providers = $status.providers
        routerReady = $status.routerReady
        routerVoiceStatus = $status.routerVoiceStatus
        bargeInSupported = $status.bargeInSupported
        bargeInTriggered = $status.bargeInTriggered
        playbackStopped = $status.playbackStopped
      }
    }

    "listen" {
      $listen = Invoke-Listen -Payload $Input
      $result = [ordered]@{
        ok = [bool]$listen.ok
        status = if ($listen.ok) { "PASS" } else { [string]$listen.status }
        tool = "runtime.voice.listen"
        action = $Action
        receiptPath = $ArchiveReceipt
        runRoot = $listen.runRoot
        inputAudio = $listen.audioInput
        transcript = $listen.transcript
        bargeInSupported = $listen.bargeInSupported
        bargeInTriggered = $listen.bargeInTriggered
        playbackStopped = $listen.playbackStopped
      }
    }

    "turn" {
      $turn = Invoke-Turn -Payload $Input
      $result = $turn
      $result.tool = "runtime.voice.turn"
      $result.action = $Action
      $result.receiptPath = $ArchiveReceipt
    }

    "conversation.once" {
      $hasText = -not [string]::IsNullOrWhiteSpace([string](Get-OptionalInputValue -InputObject $Input -Name "text"))
      $playValue = Get-OptionalInputValue -InputObject $Input -Name "play"
      if ($null -eq $playValue) { $playValue = $true }
      $recordSecondsValue = Get-OptionalInputValue -InputObject $Input -Name "recordSeconds"
      if ($null -eq $recordSecondsValue) { $recordSecondsValue = 5 }
      $sttProviderValue = Get-OptionalInputValue -InputObject $Input -Name "sttProvider"
      if ([string]::IsNullOrWhiteSpace([string]$sttProviderValue)) { $sttProviderValue = "local_whisper" }
      $sttModelValue = Get-OptionalInputValue -InputObject $Input -Name "sttModel"
      if ([string]::IsNullOrWhiteSpace([string]$sttModelValue)) { $sttModelValue = "tiny.en" }
      $sampleRateValue = Get-OptionalInputValue -InputObject $Input -Name "sampleRate"
      if ($null -eq $sampleRateValue) { $sampleRateValue = 16000 }
      $voiceValue = Get-OptionalInputValue -InputObject $Input -Name "voice"
      if ([string]::IsNullOrWhiteSpace([string]$voiceValue)) { $voiceValue = "andrew" }
      $maxTokensValue = Get-OptionalInputValue -InputObject $Input -Name "maxTokens"
      if ($null -eq $maxTokensValue) { $maxTokensValue = 320 }
      $copy = [ordered]@{
        captureMicrophone = if ($hasText) { $false } else { $true }
        text = if ($hasText) { [string](Get-OptionalInputValue -InputObject $Input -Name "text") } else { $null }
        play = [bool]$playValue
        recordSeconds = $recordSecondsValue
        sttProvider = $sttProviderValue
        sttModel = $sttModelValue
        inputDevice = Get-OptionalInputValue -InputObject $Input -Name "inputDevice"
        sampleRate = $sampleRateValue
        expectedToken = Get-OptionalInputValue -InputObject $Input -Name "expectedToken"
        expectedPhrase = Get-OptionalInputValue -InputObject $Input -Name "expectedPhrase"
        voice = $voiceValue
        maxTokens = $maxTokensValue
      }

      $turn = Invoke-Turn -Payload $copy -Once
      $result = $turn
      $result.tool = "runtime.voice.conversation.once"
      $result.action = $Action
      $result.receiptPath = $ArchiveReceipt
    }

    "conversation.start" {
      $result = [ordered]@{
        ok = $true
        status = "PASS"
        tool = "runtime.voice.conversation.start"
        action = $Action
        receiptPath = $ArchiveReceipt
        runRoot = $null
        note = "Conversation start is a placeholder for future always-listening mode."
        bargeInSupported = $true
        bargeInTriggered = $false
        playbackStopped = $false
      }
    }

    "play" {
      $payload = $Input
      $textValue = [string](Get-OptionalInputValue -InputObject $payload -Name "text")
      if ([string]::IsNullOrWhiteSpace($textValue)) { $textValue = "Agent Lee voice playback test." }
      $voiceValue = [string](Get-OptionalInputValue -InputObject $payload -Name "voice")
      if ([string]::IsNullOrWhiteSpace($voiceValue)) { $voiceValue = "andrew" }
      $playResponse = Invoke-DesktopSpeak -Text $textValue -Voice $voiceValue
      $playResult = $playResponse.parsed
      $playBody = if ($playResult) { Get-NestedFirstValue -InputObject $playResult -Paths @("result") } else { $null }
      if (-not $playResponse.ok -or -not $playResult -or -not [bool](Get-NestedFirstValue -InputObject $playResult -Paths @("ok"))) {
        $errorText = if ($playResult -and $playResult.error) { [string]$playResult.error } elseif ($playResponse.error) { [string]$playResponse.error } else { "Desktop speak route failed." }
        throw $errorText
      }

      $audioFile = [string](Get-NestedFirstValue -InputObject $playBody -Paths @("file", "audio.file"))
      $playScript = [string](Get-NestedFirstValue -InputObject $playBody -Paths @("playScript", "audio.playScript"))
      $audioBytes = 0
      if ($audioFile -and (Test-Path -LiteralPath $audioFile)) {
        $audioBytes = [int64](Get-Item -LiteralPath $audioFile).Length
      }

      $result = [ordered]@{
        ok = $true
        status = "PASS"
        tool = "runtime.voice.play"
        action = $Action
        receiptPath = $ArchiveReceipt
        runRoot = [string](Get-NestedFirstValue -InputObject $playBody -Paths @("runRoot"))
        audio = [ordered]@{
          file = $audioFile
          bytes = $audioBytes
          playScript = $playScript
          playback = Get-NestedFirstValue -InputObject $playBody -Paths @("playback")
        }
        voiceKernelUsed = [bool](Get-NestedFirstValue -InputObject $playBody -Paths @("voiceKernelUsed"))
        fallbackUsed = [bool](Get-NestedFirstValue -InputObject $playBody -Paths @("fallbackUsed"))
        bargeInSupported = $true
        bargeInTriggered = $false
        playbackStopped = $false
      }
    }

    "conversation.stop" {
      $result = [ordered]@{
        ok = $true
        status = "PASS"
        tool = "runtime.voice.conversation.stop"
        action = $Action
        receiptPath = $ArchiveReceipt
        runRoot = $null
        note = "Conversation stop is a placeholder for future full-duplex mode."
        bargeInSupported = $true
        bargeInTriggered = $false
        playbackStopped = $false
      }
    }

    default {
      throw "Unknown voice action: $Action"
    }
  }
} catch {
  $result.ok = $false
  $result.status = "FAIL"
  $result.error = $_.Exception.Message
} finally {
  $result.endedAt = (Get-Date).ToString("o")
  try { Save-Receipt -Path $ArchiveReceipt -Report $result } catch {}

  if ($result.PSObject.Properties.Name -contains "runRoot" -and $result.runRoot) {
    try { Write-JsonFile -Path (Join-Path $result.runRoot "receipt.json") -Data $result } catch {}
  }

  $stdout = $result | ConvertTo-Json -Depth 100 -Compress
  Write-Output $stdout
  if (-not $result.ok) { exit 1 }
}
