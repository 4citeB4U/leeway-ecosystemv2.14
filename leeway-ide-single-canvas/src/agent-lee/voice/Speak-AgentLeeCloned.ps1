<#
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.VOICE.SPEAK_CLONED
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Speaks Agent Lee responses through the configured local F5-TTS cloned developer voice.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Text,
  [string]$ConfigPath = "",
  [string]$ProofPath = "",
  [switch]$NormalCadence,
  [int]$WordsPerMinuteTarget = 120,
  [int]$SentencePauseMs = 1200,
  [switch]$WritePlaybackPath,
  [switch]$NoPlayback
)

$ErrorActionPreference = "Continue"
$playbackStartedAt = [System.Diagnostics.Stopwatch]::StartNew()

if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
  $scriptPath = $MyInvocation.MyCommand.Path
  if ([string]::IsNullOrWhiteSpace($scriptPath)) {
    $scriptPath = $MyInvocation.MyCommand.Definition
  }
  if ([string]::IsNullOrWhiteSpace($scriptPath)) {
    throw "Unable to resolve Speak-AgentLeeCloned.ps1 path for voice runtime configuration."
  }
  $ConfigPath = Join-Path (Split-Path -Parent $scriptPath) "voice-runtime.json"
}

function Write-VoiceProof {
  param(
    [string]$EventType,
    [hashtable]$Payload = @{}
  )

  if ([string]::IsNullOrWhiteSpace($ProofPath)) {
    return
  }

  try {
    $proofDir = Split-Path -Parent $ProofPath
    if (-not [string]::IsNullOrWhiteSpace($proofDir)) {
      New-Item -ItemType Directory -Force -Path $proofDir | Out-Null
    }

    $record = [ordered]@{
      eventType = $EventType
      timestamp = (Get-Date).ToString("o")
    }

    foreach ($key in $Payload.Keys) {
      $record[$key] = $Payload[$key]
    }

    ($record | ConvertTo-Json -Compress) + [Environment]::NewLine | Out-File -LiteralPath $ProofPath -Append -Encoding utf8
  } catch {
    # Proof emission must never crash the LeeWay-owned playback route.
  }
}

if (-not (Test-Path $ConfigPath)) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_FAILED" -Payload @{
    detail = "Voice runtime config not found."
  }
  throw "Voice runtime config not found at $ConfigPath"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
if (-not $config.cloneReferenceAudioPath -or -not (Test-Path ([string]$config.cloneReferenceAudioPath))) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_FAILED" -Payload @{
    detail = "Clone reference audio path is not configured or missing."
  }
  throw "Clone reference audio path is not configured or missing."
}
if (-not $config.cloneReferenceText) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_FAILED" -Payload @{
    detail = "Clone reference transcript is not configured."
  }
  throw "Clone reference transcript is not configured."
}

function Resolve-VoiceToolPath {
  param(
    [string]$ToolName,
    [string[]]$Candidates
  )

  foreach ($candidate in @($Candidates)) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $expanded = [Environment]::ExpandEnvironmentVariables($candidate)
    if (Test-Path -LiteralPath $expanded) {
      return [System.IO.Path]::GetFullPath($expanded)
    }
  }

  return $null
}

function Resolve-WinGetFfmpegBin {
  $packageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if (-not (Test-Path -LiteralPath $packageRoot)) { return $null }

  $gyanPkg = Get-ChildItem -Path $packageRoot -Directory -Filter 'Gyan.FFmpeg*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $gyanPkg) {
    $candidate = Join-Path $gyanPkg.FullName 'ffmpeg-8.1.1-full_build\bin\ffmpeg.exe'
    if (-not (Test-Path -LiteralPath $candidate)) {
      $candidate = Get-ChildItem -Path $gyanPkg.FullName -Filter 'ffmpeg.exe' -Recurse -Depth 3 -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { $_.FullName }
    }
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate)) {
      return (Split-Path -Parent $candidate)
    }
  }

  return $null
}

function Ensure-VoiceRuntimeMediaTools {
  param([string]$ClonePythonPath)

  $pythonDir = if ([string]::IsNullOrWhiteSpace($ClonePythonPath)) { $null } else { Split-Path -Parent $ClonePythonPath }
  $wingetBin = Resolve-WinGetFfmpegBin
  $pythonFfmpeg = $null
  $pythonFfprobe = $null
  $wingetFfmpeg = $null
  $wingetFfprobe = $null

  if ($pythonDir) {
    $pythonFfmpeg = Join-Path $pythonDir 'ffmpeg.exe'
    $pythonFfprobe = Join-Path $pythonDir 'ffprobe.exe'
  }
  if ($wingetBin) {
    $wingetFfmpeg = Join-Path $wingetBin 'ffmpeg.exe'
    $wingetFfprobe = Join-Path $wingetBin 'ffprobe.exe'
  }

  $ffmpegPath = Resolve-VoiceToolPath -ToolName 'ffmpeg' -Candidates @(
    $env:FFMPEG_BINARY,
    $pythonFfmpeg,
    $wingetFfmpeg
  )

  $ffprobePath = Resolve-VoiceToolPath -ToolName 'ffprobe' -Candidates @(
    $env:FFPROBE_BINARY,
    $pythonFfprobe,
    $wingetFfprobe
  )

  if ($ffmpegPath) {
    $env:FFMPEG_BINARY = $ffmpegPath
    $ffmpegDir = Split-Path -Parent $ffmpegPath
    if (-not [string]::IsNullOrWhiteSpace($ffmpegDir) -and -not ($env:PATH -split ';' | Where-Object { $_ -eq $ffmpegDir })) {
      $env:PATH = $ffmpegDir + ';' + $env:PATH
    }
  }

  if ($ffprobePath) {
    $env:FFPROBE_BINARY = $ffprobePath
    $ffprobeDir = Split-Path -Parent $ffprobePath
    if (-not [string]::IsNullOrWhiteSpace($ffprobeDir) -and -not ($env:PATH -split ';' | Where-Object { $_ -eq $ffprobeDir })) {
      $env:PATH = $ffprobeDir + ';' + $env:PATH
    }
  }

  return [pscustomobject]@{
    ffmpegPath = $ffmpegPath
    ffprobePath = $ffprobePath
  }
}

$mediaTools = Ensure-VoiceRuntimeMediaTools -ClonePythonPath ([string]$config.clonePythonPath)
if ([string]::IsNullOrWhiteSpace([string]$mediaTools.ffmpegPath) -or [string]::IsNullOrWhiteSpace([string]$mediaTools.ffprobePath)) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_WARNING" -Payload @{
    detail = "ffmpeg or ffprobe is unresolved in active clone runtime path."
    ffmpegPath = [string]$mediaTools.ffmpegPath
    ffprobePath = [string]$mediaTools.ffprobePath
  }
}

# Do not inject HF credentials in governed runtime playback; use local model artifacts only.

# Format the text for speech
function Format-SpeechText {
  param([string]$InputText)
  $clean = [regex]::Replace($InputText, '```[\s\S]*?```', '[code omitted]')
  $clean = [regex]::Replace($clean, '`[^`]+`', '[code omitted]')
  $clean = [regex]::Replace($clean, 'https?://\S+', '[link omitted]')
  $clean = $clean.Replace([string][char]0x2018, "'").Replace([string][char]0x2019, "'")
  $clean = $clean.Replace([string][char]0x201C, '"').Replace([string][char]0x201D, '"')
  $clean = $clean.Replace([string][char]0x2013, "-").Replace([string][char]0x2014, "-")
  $clean = $clean.Replace([string][char]0x2026, "...")
  $clean = [regex]::Replace($clean, '[^\u0009\u000A\u000D\u0020-\u007E]', ' ')
  $clean = [regex]::Replace($clean, '\s+', ' ')
  $clean = $clean.Trim()
  if ($clean.Length -gt 500) {
    $clean = $clean.Substring(0, 500) + "..."
  }
  return $clean
}

$cleanText = Format-SpeechText -InputText $Text
if ([string]::IsNullOrWhiteSpace($cleanText)) {
  exit 0
}

Write-VoiceProof -EventType "LEEWAY_VOICE_STATUS_CHANGED" -Payload @{
  status = "LeeWay live voice clone route received a speak request."
  detail = $cleanText
}

$serverUrl = if ($config.cloneServerUrl) { [string]$config.cloneServerUrl } else { "http://127.0.0.1:8766" }
$refAudio = [string]$config.cloneReferenceAudioPath
$refText = [string]$config.cloneReferenceText
$outputDir = $env:TEMP
$outputName = "agent-lee-cloned-" + [Guid]::NewGuid().ToString("N") + ".wav"
$outputPath = Join-Path $outputDir $outputName
$speechSpeed = 1.0
if ($config.cloneSpeedRatio) {
  $speechSpeed = [double]$config.cloneSpeedRatio
} elseif ($config.tuning -and $config.tuning.playbackRateRatio) {
  $speechSpeed = [double]$config.tuning.playbackRateRatio
}
if ($speechSpeed -lt 0.6) { $speechSpeed = 0.6 }
if ($speechSpeed -gt 1.4) { $speechSpeed = 1.4 }
if ($NormalCadence) {
  $cadenceTargetRatio = [Math]::Round(($WordsPerMinuteTarget / 150.0), 3)
  if ($cadenceTargetRatio -lt 0.55) { $cadenceTargetRatio = 0.55 }
  if ($cadenceTargetRatio -gt 0.85) { $cadenceTargetRatio = 0.85 }
  $speechSpeed = [Math]::Round(($speechSpeed * $cadenceTargetRatio), 2)
  if ($speechSpeed -gt 0.62) {
    $speechSpeed = 0.62
  }
  if ($speechSpeed -lt 0.45) {
    $speechSpeed = 0.45
  }
}

$pitchRatio = 1.0
if ($config.tuning -and $config.tuning.pitchRatio) {
  $pitchRatio = [double]$config.tuning.pitchRatio
}
if ($pitchRatio -lt 0.7) { $pitchRatio = 0.7 }
if ($pitchRatio -gt 1.3) { $pitchRatio = 1.3 }

$toneRatio = 1.0
if ($config.tuning -and $config.tuning.toneRatio) {
  $toneRatio = [double]$config.tuning.toneRatio
}
if ($toneRatio -lt 0.7) { $toneRatio = 0.7 }
if ($toneRatio -gt 1.3) { $toneRatio = 1.3 }

$volumeRatio = 1.0
if ($config.cloneVolumeRatio) {
  $volumeRatio = [double]$config.cloneVolumeRatio
}
if ($volumeRatio -lt 0.0) { $volumeRatio = 0.0 }
if ($volumeRatio -gt 1.5) { $volumeRatio = 1.5 }

if ([string]::IsNullOrWhiteSpace($serverUrl)) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_FAILED" -Payload @{
    detail = "Clone server URL is not configured."
  }
  throw "Clone server URL is not configured."
}

$sentenceSegments = @($cleanText)

function Invoke-DirectCloneSynthesis {
  param(
    [string]$ConfigPythonPath,
    [string]$ConfigScriptPath,
    [string]$ReferenceAudio,
    [string]$ReferenceText,
    [string]$SpeechText,
    [string]$WavOutputPath,
    [string]$Device,
    [double]$Speed
  )

  if ([string]::IsNullOrWhiteSpace($ConfigPythonPath) -or -not (Test-Path $ConfigPythonPath)) {
    throw "clonePythonPath is not configured or missing."
  }
  if ([string]::IsNullOrWhiteSpace($ConfigScriptPath) -or -not (Test-Path $ConfigScriptPath)) {
    throw "cloneScriptPath is not configured or missing."
  }

  function Invoke-PythonClone {
    param([string]$TargetOutputPath)
    $pythonArgs = @(
      $ConfigScriptPath,
      "--ref_audio", $ReferenceAudio,
      "--ref_text", $ReferenceText,
      "--text", $SpeechText,
      "--output", $TargetOutputPath,
      "--device", $(if ([string]::IsNullOrWhiteSpace($Device)) { "cpu" } else { $Device }),
      "--speed", ([string]$Speed)
    )

    & $ConfigPythonPath @pythonArgs | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Direct clone synthesis failed with exit code $LASTEXITCODE"
    }
    return $TargetOutputPath
  }

  try {
    return Invoke-PythonClone -TargetOutputPath $WavOutputPath
  } catch {
    $tempOutputPath = Join-Path $env:TEMP ("agent-lee-cloned-" + [Guid]::NewGuid().ToString("N") + ".wav")
    return Invoke-PythonClone -TargetOutputPath $tempOutputPath
  }
}

$serverReady = $false
if ($config.preferVoiceServer -eq $true) {
  try {
    $health = Invoke-RestMethod -Uri ($serverUrl.TrimEnd("/") + "/health") -Method Get -TimeoutSec 3
    $serverReady = [bool]$health.ready
  } catch {}
}

$generatedSegments = New-Object System.Collections.Generic.List[string]
foreach ($segmentText in $sentenceSegments) {
  $segmentOutputPath = if ($generatedSegments.Count -eq 0) { $outputPath } else { Join-Path $outputDir ("agent-lee-cloned-" + [Guid]::NewGuid().ToString("N") + ".wav") }

  if ($serverReady) {
    try {
      $requestBody = @{
        text = $segmentText
        ref_audio = $refAudio
        ref_text = $refText
        output_path = $segmentOutputPath
        speed = $speechSpeed
      } | ConvertTo-Json -Depth 5

      $synthesis = Invoke-RestMethod `
        -Uri ($serverUrl.TrimEnd("/") + "/synthesize") `
        -Method Post `
        -ContentType "application/json" `
        -Body $requestBody `
        -TimeoutSec 180

      if ($synthesis.output_path) {
        $segmentOutputPath = [string]$synthesis.output_path
      }
    } catch {
      $segmentOutputPath = Invoke-DirectCloneSynthesis `
        -ConfigPythonPath ([string]$config.clonePythonPath) `
        -ConfigScriptPath ([string]$config.cloneScriptPath) `
        -ReferenceAudio $refAudio `
        -ReferenceText $refText `
        -SpeechText $segmentText `
        -WavOutputPath $segmentOutputPath `
        -Device ([string]$config.cloneDevice) `
        -Speed $speechSpeed
    }
  } else {
    $segmentOutputPath = Invoke-DirectCloneSynthesis `
      -ConfigPythonPath ([string]$config.clonePythonPath) `
      -ConfigScriptPath ([string]$config.cloneScriptPath) `
      -ReferenceAudio $refAudio `
      -ReferenceText $refText `
      -SpeechText $segmentText `
      -WavOutputPath $segmentOutputPath `
      -Device ([string]$config.cloneDevice) `
      -Speed $speechSpeed
  }

  $generatedSegments.Add($segmentOutputPath)
}

$outputPath = $generatedSegments[0]

if (-not (Test-Path $outputPath) -or ((Get-Item $outputPath).Length -lt 100)) {
  throw "Clone voice synthesis did not produce a playable audio file."
  exit 1
}

$playbackPath = $outputPath

if (-not (Test-Path $playbackPath)) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_FAILED" -Payload @{
    detail = "Clone voice playback artifact is missing."
    outputPath = $playbackPath
  }
  throw "Clone voice playback artifact is missing: $playbackPath"
}

$audioBytes = (Get-Item $playbackPath).Length
$firstAudioLatencyMs = [Math]::Round($playbackStartedAt.Elapsed.TotalMilliseconds, 2)

Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_STARTED" -Payload @{
  status = "LeeWay live voice playback is starting."
  outputPath = $playbackPath
  audioBytes = $audioBytes
}
Write-VoiceProof -EventType "LEEWAY_VOICE_FIRST_AUDIO" -Payload @{
  status = "LeeWay live voice produced its first playable artifact."
  outputPath = $playbackPath
  audioBytes = $audioBytes
  firstAudioLatencyMs = $firstAudioLatencyMs
  cadenceMode = $(if ($NormalCadence) { 'NORMAL' } else { 'DEFAULT' })
  wordsPerMinuteTarget = $WordsPerMinuteTarget
  sentencePauseMs = $SentencePauseMs
}

if ($WritePlaybackPath) {
  Write-Output $playbackPath
}

if ($NoPlayback) {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_SKIPPED" -Payload @{
    status = "LeeWay live voice playback was skipped after proof generation."
    outputPath = $playbackPath
    audioBytes = $audioBytes
    firstAudioLatencyMs = $firstAudioLatencyMs
  }
  exit 0
}

try {
  $player = New-Object System.Media.SoundPlayer $playbackPath
  $player.PlaySync()
  Write-VoiceProof -EventType "LEEWAY_VOICE_SEGMENT_PLAYED" -Payload @{
    status = "LeeWay live voice segment played."
    outputPath = $playbackPath
    audioBytes = $audioBytes
    firstAudioLatencyMs = $firstAudioLatencyMs
  }
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_COMPLETED" -Payload @{
    status = "LeeWay live voice playback completed."
    outputPath = $playbackPath
    audioBytes = $audioBytes
    firstAudioLatencyMs = $firstAudioLatencyMs
  }
} catch {
  Write-VoiceProof -EventType "LEEWAY_VOICE_PLAYBACK_FAILED" -Payload @{
    detail = "Clone voice playback failed."
    outputPath = $playbackPath
    audioBytes = $audioBytes
    firstAudioLatencyMs = $firstAudioLatencyMs
  }
  throw "Clone voice playback failed for $playbackPath"
}
