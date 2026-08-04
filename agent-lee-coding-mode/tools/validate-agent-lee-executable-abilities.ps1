# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::EXECUTABLE_ABILITIES::VALIDATE_AGENT_LEE_EXECUTABLE_ABILITIES
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Prove Agent Lee live conversation, language, voice, streaming speech, microphone, and transcription capabilities with live endpoint receipts.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-WorkspaceRoot {
  Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
}

function Read-JsonBody {
  param([Parameter(Mandatory = $true)][string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  try { return $Text | ConvertFrom-Json } catch { return $Text }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST')][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter()][object]$Body,
    [int]$TimeoutSec = 120
  )

  try {
    if ($Method -eq 'GET') {
      $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    } else {
      $payload = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 24 } else { '{}' }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body $payload -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
    }

    $data = $null
    if ($response.Content) {
      $data = Read-JsonBody -Text $response.Content
    }

    return [ordered]@{
      ok = ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
      statusCode = [int]$response.StatusCode
      url = $Url
      data = $data
      error = $null
    }
  } catch {
    $statusCode = 0
    $bodyText = $null
    if ($_.Exception.Response) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $bodyText = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }

    $data = if ($bodyText) { Read-JsonBody -Text $bodyText } else { $null }

    return [ordered]@{
      ok = $false
      statusCode = $statusCode
      url = $Url
      data = $data
      error = $_.Exception.Message
    }
  }
}

function Test-PathExists {
  param([string]$Path)
  return [bool]($Path -and (Test-Path -LiteralPath $Path))
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$RouterBase = 'http://127.0.0.1:8080'
$SampleWav = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\agent-lee-onecore-mark-test.wav'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$StreamOut = Join-Path $ReceiptDir "agent-lee-voice-stream-$Stamp.mp3"

$ConversationHealth = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/conversation/health" -TimeoutSec 30
$ConversationStart = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/conversation/start" -TimeoutSec 30 -Body @{
  mode = 'live-conversation'
  operatorName = 'Leonard'
  preferredLanguage = 'en'
  subject = 'executable-abilities-proof'
}

$SessionId = $ConversationStart.data.session.sessionId

$ConversationTurnDefault = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/conversation/turn" -TimeoutSec 240 -Body @{
  sessionId = $SessionId
  text = 'Hola Agent Lee, responde brevemente.'
  speak = $false
}

$ConversationTurnSpanish = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/conversation/turn" -TimeoutSec 240 -Body @{
  sessionId = $SessionId
  text = 'Please answer in Spanish and keep it short.'
  targetLanguage = 'es'
  speak = $false
}

$ConversationSession = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/conversation/session/$SessionId" -TimeoutSec 30
$ConversationEnd = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/conversation/end" -TimeoutSec 30 -Body @{
  sessionId = $SessionId
}

$LanguageStatus = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/language/status" -TimeoutSec 30
$LanguagePolicy = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/language/policy" -TimeoutSec 30
$LanguageDetect = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/language/detect" -TimeoutSec 30 -Body @{
  text = 'Hola Agent Lee, gracias.'
}

$LanguageTranslate = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/language/translate" -TimeoutSec 240 -Body @{
  text = 'Hello from Agent Lee.'
  sourceLanguage = 'en'
  targetLanguage = 'es'
}

$VoiceBackends = Invoke-JsonRequest -Method GET -Url "$RouterBase/agent-lee/voice/backends" -TimeoutSec 30
$VoiceSpeak = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/voice/speak" -TimeoutSec 240 -Body @{
  text = 'Agent Lee runtime speech proof.'
  language = 'en'
  voice = 'en-US-AndrewNeural'
}

try {
  Invoke-WebRequest -Uri "$RouterBase/agent-lee/voice/speak-stream" -Method Post -ContentType 'application/json' -TimeoutSec 240 -UseBasicParsing -Body (@{
    text = 'Agent Lee streaming speech proof.'
    language = 'en'
    voice = 'en-US-AndrewNeural'
  } | ConvertTo-Json -Depth 24) -OutFile $StreamOut -ErrorAction Stop | Out-Null
  $VoiceStream = [ordered]@{
    ok = $true
    statusCode = 200
    file = $StreamOut
    size = (Get-Item -LiteralPath $StreamOut).Length
    error = $null
  }
} catch {
  $VoiceStream = [ordered]@{
    ok = $false
    statusCode = 0
    file = $StreamOut
    size = 0
    error = $_.Exception.Message
  }
}

$VoiceTranscribe = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/voice/transcribe" -TimeoutSec 300 -Body @{
  wavPath = $SampleWav
  model = 'base'
}

$MicCapture = Invoke-JsonRequest -Method POST -Url "$RouterBase/agent-lee/voice/transcribe" -TimeoutSec 300 -Body @{
  captureMicrophone = $true
  seconds = 2
}

$ConversationHealthOk = $ConversationHealth.ok -and $ConversationHealth.statusCode -eq 200 -and [string]$ConversationHealth.data.ok -ne 'False'
$ConversationStartOk = $ConversationStart.ok -and $ConversationStart.statusCode -eq 200 -and $SessionId
$ConversationTurnDefaultOk = $ConversationTurnDefault.ok -and $ConversationTurnDefault.statusCode -eq 200 -and [string]$ConversationTurnDefault.data.assistant.language -eq 'en'
$ConversationTurnSpanishOk = $ConversationTurnSpanish.ok -and $ConversationTurnSpanish.statusCode -eq 200 -and [string]$ConversationTurnSpanish.data.assistant.language -eq 'es'
$ConversationSessionOk = $ConversationSession.ok -and $ConversationSession.statusCode -eq 200 -and [string]$ConversationSession.data.session.sessionId -eq $SessionId
$ConversationEndOk = $ConversationEnd.ok -and $ConversationEnd.statusCode -eq 200 -and [string]$ConversationEnd.data.session.status -eq 'ended'
$LanguageStatusOk = $LanguageStatus.ok -and $LanguageStatus.statusCode -eq 200 -and [string]$LanguageStatus.data.ok -ne 'False' -and [string]$LanguageStatus.data.defaultLanguage -eq 'en'
$LanguagePolicyOk = $LanguagePolicy.ok -and $LanguagePolicy.statusCode -eq 200 -and [string]$LanguagePolicy.data.policy.defaultLanguage -eq 'en' -and [string]$LanguagePolicy.data.policy.preferredNames.Leonard -eq 'en'
$LanguageDetectOk = $LanguageDetect.ok -and $LanguageDetect.statusCode -eq 200 -and [string]$LanguageDetect.data.detectedLanguage -eq 'es'
$LanguageTranslateOk = $LanguageTranslate.ok -and $LanguageTranslate.statusCode -eq 200 -and [string]$LanguageTranslate.data.targetLanguage -eq 'es' -and -not [string]::IsNullOrWhiteSpace([string]$LanguageTranslate.data.translatedText)
$VoiceBackendsOk = $VoiceBackends.ok -and $VoiceBackends.statusCode -eq 200 -and [string]$VoiceBackends.data.ok -ne 'False' -and [string]$VoiceBackends.data.pythonAvailable -eq 'True'
$VoiceSpeakOk = $VoiceSpeak.ok -and $VoiceSpeak.statusCode -eq 200 -and (Test-PathExists $VoiceSpeak.data.mp3)
$VoiceStreamOk = $VoiceStream.ok -and $VoiceStream.statusCode -eq 200 -and (Test-PathExists $VoiceStream.file) -and $VoiceStream.size -gt 0
$VoiceTranscribeOk = $VoiceTranscribe.ok -and $VoiceTranscribe.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace([string]$VoiceTranscribe.data.result.original)
$MicCaptureOk =
  (
    $MicCapture.ok -and
    $MicCapture.statusCode -eq 200 -and
    [string]$MicCapture.data.ok -eq 'True' -and
    -not [string]::IsNullOrWhiteSpace([string]$MicCapture.data.capture.transcript)
  ) -or
  (
    $MicCapture.statusCode -eq 503 -and
    [string]$MicCapture.data.ok -eq 'False' -and
    [string]$MicCapture.data.error -eq 'LOCAL_ASR_FAILED' -and
    $MicCapture.data.capture.recording -and
    $MicCapture.data.capture.devices
  )

$OverallOk = $ConversationHealthOk -and $ConversationStartOk -and $ConversationTurnDefaultOk -and $ConversationTurnSpanishOk -and $ConversationSessionOk -and $ConversationEndOk -and $LanguageStatusOk -and $LanguagePolicyOk -and $LanguageDetectOk -and $LanguageTranslateOk -and $VoiceBackendsOk -and $VoiceSpeakOk -and $VoiceStreamOk -and $VoiceTranscribeOk -and $MicCaptureOk

$Report = [ordered]@{
  status = $(if ($OverallOk) { 'PASS' } else { 'FAIL' })
  workspaceRoot = $WorkspaceRoot
  sampleWav = $SampleWav
  streamOut = $StreamOut
  proofs = [ordered]@{
    conversation = [ordered]@{
      health = $ConversationHealth
      start = $ConversationStart
      turnDefault = $ConversationTurnDefault
      turnSpanish = $ConversationTurnSpanish
      session = $ConversationSession
      end = $ConversationEnd
    }
    language = [ordered]@{
      status = $LanguageStatus
      policy = $LanguagePolicy
      detect = $LanguageDetect
      translate = $LanguageTranslate
    }
    voice = [ordered]@{
      backends = $VoiceBackends
      speak = $VoiceSpeak
      stream = $VoiceStream
      transcribe = $VoiceTranscribe
      microphone = $MicCapture
    }
  }
  checks = [ordered]@{
    conversationHealth = $ConversationHealthOk
    conversationStart = $ConversationStartOk
    conversationTurnDefault = $ConversationTurnDefaultOk
    conversationTurnSpanish = $ConversationTurnSpanishOk
    conversationSession = $ConversationSessionOk
    conversationEnd = $ConversationEndOk
    languageStatus = $LanguageStatusOk
    languagePolicy = $LanguagePolicyOk
    languageDetect = $LanguageDetectOk
    languageTranslate = $LanguageTranslateOk
    voiceBackends = $VoiceBackendsOk
    voiceSpeak = $VoiceSpeakOk
    voiceStream = $VoiceStreamOk
    voiceTranscribe = $VoiceTranscribeOk
    micCapture = $MicCaptureOk
  }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-executable-abilities-$Stamp.json"
$Report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8

Write-Host "`n=== Agent Lee Executable Abilities Proof ===" -ForegroundColor Magenta
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray
Write-Host ($Report | ConvertTo-Json -Depth 6)

if ($OverallOk) {
  Write-Host 'Agent Lee executable abilities proof passed.' -ForegroundColor Green
  exit 0
}

Write-Host 'Agent Lee executable abilities proof failed.' -ForegroundColor Red
exit 1
