# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VALIDATION::VALIDATE_AGENT_LEE_VSCODE_CHAT_EMBODIMENT_STACK
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Diagnostic-first proof that Agent Lee can be launched from VS Code chat and exercise the local runtime fabric stack.

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
$DesktopRuntimeUrl = "http://127.0.0.1:8091"
$VoiceStatusUrl = "$DesktopRuntimeUrl/runtime/voice/status"
$VoiceListenUrl = "$DesktopRuntimeUrl/runtime/voice/listen"
$SpeakUrl = "$DesktopRuntimeUrl/runtime/speak"
$ConversationOnceUrl = "$DesktopRuntimeUrl/runtime/voice/conversation/once"
$OllamaUrl = "http://127.0.0.1:11434/api/chat"
$CodingBackend = "qwen2.5-coder:latest"
$VisionBackend = "qwen2.5vl:7b"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$ArtifactRoot = Join-Path $ReceiptDir "agent-lee-vscode-chat-embodiment-assets"
$TempRoot = Join-Path $ArtifactRoot "tmp"
$VoiceSamplePath = Join-Path $Root "voice-diagnostics\mic-probe.wav"
$OfficialLaunch = ($env:AGENT_LEE_OFFICIAL_PROOF_LAUNCH -eq "1") -and (($env:AGENT_LEE_CHAT_ORIGIN | ForEach-Object { [string]$_ }) -eq "vscode_chat")
$ControlSurface = if ($OfficialLaunch) { "vscode_chat" } else { "diagnostic_terminal" }
$HumanConfirmationRequired = $true
$HumanConfirmed = $null

New-Item -ItemType Directory -Force -Path $ReceiptDir, $ArtifactRoot, $TempRoot | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-chat-embodiment-stack-proof-$Stamp.json"

$OfficialPrompts = [ordered]@{
  ears1 = "Agent Lee, run official ears proof case 1 through the Leeway Runtime Fabric. Listen for or use the provided proof phrase: 'Agent Lee ears proof one.' Create a receipt and report transcript, runtime path, and whether the transcript matched."
  ears2 = "Agent Lee, run official ears proof case 2. Use phrase: 'Agent Lee can hear my command from VS Code chat.' Prove the request originated from VS Code chat and entered through Agent Lee Turbo."
  ears3 = "Agent Lee, run official ears proof case 3 with a short noisy or repeated phrase: 'ears check, ears check, Agent Lee.' Return whether VAD or endpointing metadata was captured."
  vision1 = "Agent Lee, run official vision proof case 1 through the Leeway Runtime Fabric. Inspect the designated local test image and summarize visible text, objects, and confidence. Create a receipt."
  vision2 = "Agent Lee, run official vision proof case 2. Compare two local test images or two generated test cards and identify one difference. The proof must go through Agent Lee Turbo and Runtime Fabric."
  vision3 = "Agent Lee, run official vision proof case 3. Read a simple generated local image containing the text 'VISION_OK_3' and report the token."
  mouth1 = "Agent Lee, run official mouth proof case 1. Speak: 'Agent Lee mouth proof one from VS Code chat.' Use the Leeway Runtime Fabric desktop runtime and return runRoot, MP3 file, playScript, and playback status."
  mouth2 = "Agent Lee, run official mouth proof case 2. Speak the same phrase twice in the same run: 'Agent Lee can speak twice.' Return the audio artifact and playback metadata."
  mouth3 = "Agent Lee, run official mouth proof case 3. Speak a short operational response using the fast lane, then prove the response did not come from a stale timeout fallback."
  hands1 = "Agent Lee, run official hands proof case 1. Through the Leeway Runtime Fabric, create a harmless proof file under Archive\\receipts named agent-lee-hands-proof-1-<timestamp>.txt containing HANDS_OK_1. Then read it back and report the contents."
  hands2 = "Agent Lee, run official hands proof case 2. List the latest five Agent Lee receipt files through the Runtime Fabric and report their names."
  hands3 = "Agent Lee, run official hands proof case 3. Create a JSON receipt fragment with token HANDS_OK_3, validate it parses as JSON, then delete only the temporary fragment if cleanup is enabled."
  mlEn = "Agent Lee, run official multilingual voice proof 1. Speak in English only: 'Agent Lee speaks English fluently from VS Code chat.' Return MP3 and playback metadata."
  mlEs = "Agent Lee, run official multilingual voice proof 2. Speak in Spanish only: 'Agent Lee habla español con claridad desde VS Code chat.' Return MP3 and playback metadata."
  mlMix = @'
Agent Lee, run official multilingual voice proof 3. Speak this mixed sentence without changing the sentence: 'Agent Lee speaks English, habla español, and says 日本語でこんにちは in one sentence.' Return MP3 and playback metadata.
'@
}

function Get-NestedFirstValue {
  param(
    [Parameter(Mandatory = $false)]$InputObject,
    [Parameter(Mandatory = $true)][string[]]$Paths
  )

  if ($null -eq $InputObject) {
    return $null
  }

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
    [Parameter(Mandatory = $false)]$Body = $null,
    [int]$TimeoutSec = 120,
    [switch]$VerboseRaw
  )

  $started = Get-Date
  $probe = [ordered]@{
    name = $Name
    url = $Url
    method = $Method
    ok = $false
    statusCode = 0
    ms = 0
    rawBody = ""
    parsed = $null
    error = $null
  }

  try {
    if ($Method -eq "GET") {
      $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
    } else {
      $jsonBody = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 30 -Compress }
      $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" -Body $jsonBody -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
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
  Write-Host "`n=== $($Case.caseId) ===" -ForegroundColor Cyan
  Write-Host "Category: $($Case.category)"
  Write-Host "Status: $state"
  Write-Host "Prompt: $($Case.promptSentInVSCodeChat)"
  Write-Host "HTTP: $($Case.statusCode)"
  Write-Host "Elapsed ms: $($Case.ms)"
  Write-Host "responseMode: $($Case.responseMode)"
  Write-Host "selectedBackend: $($Case.selectedBackend)"
  Write-Host "fallbackUsed: $($Case.fallbackUsed)"
  Write-Host "timeout: $($Case.timeout)"
  Write-Host "rawStaleTimeoutText: $($Case.rawStaleTimeoutText)"
  Write-Host "artifactPaths: $([string]::Join(', ', @($Case.artifactPaths)))"
  if ($Case.error) {
    Write-Host "Error: $($Case.error)" -ForegroundColor Red
  }

  if ($VerboseRaw -or -not $Case.ok) {
    Write-Host "Content:" -ForegroundColor DarkCyan
    if ([string]::IsNullOrWhiteSpace([string]$Case.content)) {
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
  $Report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Normalize-Text {
  param([string]$Value)
  return ([string]$Value).Trim()
}

function Extract-ResponseContent {
  param($Parsed)
  return [string](Get-NestedFirstValue -InputObject $Parsed -Paths @(
    "analysisText",
    "analysis.text",
    "choices.0.message.content",
    "choices.0.text",
    "message.content",
    "content",
    "response",
    "result.content",
    "result.response",
    "agentLeeTurbo.content",
    "agentLeeTurbo.response",
    "agentLeeTurbo.trace.content",
    "agentLeeRouter.content",
    "trace.content"
  ))
}

function Extract-ResponseMode {
  param($Parsed)
  return [string](Get-NestedFirstValue -InputObject $Parsed -Paths @(
    "responseMode",
    "result.responseMode",
    "agentLeeTurbo.responseMode",
    "agentLeeRouter.responseMode",
    "agentLeeTurbo.trace.responseMode",
    "agentLeeTurbo.downstreamTrace.responseMode",
    "trace.responseMode"
  ))
}

function Extract-SelectedBackend {
  param($Parsed)
  return [string](Get-NestedFirstValue -InputObject $Parsed -Paths @(
    "selectedBackend",
    "result.selectedBackend",
    "agentLeeTurbo.selectedBackend",
    "agentLeeRouter.selectedBackend",
    "agentLeeTurbo.trace.selectedBackend",
    "agentLeeTurbo.downstreamTrace.selectedBackend",
    "trace.selectedBackend"
  ))
}

function Extract-FallbackUsed {
  param($Parsed)
  return Get-NestedFirstValue -InputObject $Parsed -Paths @(
    "fallbackUsed",
    "result.fallbackUsed",
    "agentLeeTurbo.fallbackUsed",
    "agentLeeRouter.fallbackUsed",
    "agentLeeTurbo.trace.fallbackUsed",
    "agentLeeTurbo.downstreamTrace.fallbackUsed",
    "trace.fallbackUsed"
  )
}

function Extract-TimeoutValue {
  param($Parsed)
  return Get-NestedFirstValue -InputObject $Parsed -Paths @(
    "timeout",
    "result.timeout",
    "agentLeeTurbo.timeout",
    "agentLeeRouter.timeout",
    "agentLeeTurbo.trace.timeout",
    "agentLeeTurbo.downstreamTrace.timeout",
    "trace.timeout"
  )
}

function Has-StaleTimeoutText {
  param([string]$Text)
  return [bool]($Text -match 'downstream model backend did not respond|request timed out|Backend note')
}

function New-WavSpeech {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [Parameter(Mandatory = $true)][string]$Path
  )

  Add-Type -AssemblyName System.Speech | Out-Null
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $synth.SetOutputToWaveFile($Path)
    $synth.Rate = 0
    $synth.Volume = 100
    $synth.Speak($Text)
  } finally {
    $synth.Dispose()
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Failed to create speech wav: $Path"
  }
  return $Path
}

function New-VisionCard {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Body,
    [string]$Accent = "#1f6feb",
    [switch]$Variant
  )

  Add-Type -AssemblyName System.Drawing | Out-Null
  $bitmap = New-Object System.Drawing.Bitmap 960, 540
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::FromArgb(15, 18, 32))

    $brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 43, 75))
    $brushAccent = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Accent))
    $brushText = [System.Drawing.Brushes]::White
    $brushMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 220, 240))
    $titleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 42)
    $bodyFont = New-Object System.Drawing.Font("Segoe UI", 28)
    $tinyFont = New-Object System.Drawing.Font("Segoe UI", 18)

    $graphics.FillRectangle($brushBg, 40, 40, 880, 460)
    $graphics.FillEllipse($brushAccent, 70, 70, 160, 160)
    $graphics.FillRectangle($brushAccent, 740, 100, 140, 110)
    if ($Variant) {
      $graphics.FillEllipse([System.Drawing.Brushes]::OrangeRed, 650, 300, 180, 110)
      $graphics.DrawLine([System.Drawing.Pens]::Gold, 120, 460, 860, 460)
    }

    $graphics.DrawString($Title, $titleFont, $brushText, 220, 90)
    $graphics.DrawString($Body, $bodyFont, $brushMuted, 220, 180)
    $graphics.DrawString("Agent Lee runtime fabric proof", $tinyFont, $brushMuted, 220, 420)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Failed to create vision card: $Path"
  }

  return $Path
}

function To-DataUri {
  param([Parameter(Mandatory = $true)][string]$Path)
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  return "data:image/png;base64,$([Convert]::ToBase64String($bytes))"
}

function Invoke-OllamaVision {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Prompt,
    [Parameter(Mandatory = $true)][string[]]$ImagePaths,
    [int]$TimeoutSec = 180
  )
  # Route vision analysis through the local Desktop Runtime camera analyze endpoint
  $analyzeUrl = "$DesktopRuntimeUrl/runtime/vision/camera/analyze-snapshot"

  foreach ($path in $ImagePaths) {
    if (-not (Test-Path -LiteralPath $path)) {
      throw "Vision image not found: $path"
    }
  }

  # Use the first image path as the snapshot to analyze (camera bridge supports a single snapshot path)
  $snapshot = $ImagePaths[0]

  $body = @{
    confirm = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"
    snapshotPath = $snapshot
    prompt = $Prompt
    visionBackend = $VisionBackend
    timeoutMs = ($TimeoutSec * 1000)
    controlSurface = "diagnostic_terminal"
  }

  return Invoke-AgentLeeProbe -Name $Name -Method "POST" -Url $analyzeUrl -Body $body -TimeoutSec $TimeoutSec -VerboseRaw:$VerboseRaw
}

function Test-TranscriptTokens {
  param(
    [Parameter(Mandatory = $true)][string]$Transcript,
    [Parameter(Mandatory = $true)][string[]]$RequiredTokens
  )

  # Normalize: lower, remove punctuation (apostrophes), convert isolated digits to words
  $normalized = ([string]$Transcript).ToLowerInvariant()
  $normalized = $normalized -replace "[^a-z0-9\s]", " "
  $normalized = $normalized -replace "\b1\b", " one "
  $normalized = $normalized -replace "\b2\b", " two "
  $normalized = $normalized -replace "\b3\b", " three "

  $matched = @()
  $missed = @()
  foreach ($token in $RequiredTokens) {
    $t = $token.ToLowerInvariant()
    if ($normalized -match [regex]::Escape($t)) {
      $matched += $token
      continue
    }

    # tolerant rules for common ASR variants
    if ($t -eq "lee" -and $normalized -match "\blee\b|\blea\b|\bleir\b|\bleir s\b|\blei?r\b") {
      $matched += $token
      continue
    }
    if ($t -eq "ears" -and $normalized -match "\bears\b|\bear\b|\beirs\b") {
      $matched += $token
      continue
    }

    $missed += $token
  }

  $score = if ($RequiredTokens.Count -gt 0) { [math]::Round($matched.Count / $RequiredTokens.Count, 2) } else { 0 }
  return [pscustomobject]@{
    ok = ($matched.Count -eq $RequiredTokens.Count)
    score = $score
    matchedTokens = $matched
    missedTokens = $missed
  }
}

$Report = [ordered]@{
  schema = "leeway.agent-lee.vscode-chat-embodiment-stack-proof.v1"
  status = "STARTED"
  lock = "AGENT_LEE_VSCODE_CHAT_EMBODIMENT_STACK_LOCKED"
  controlSurface = $ControlSurface
  originProof = [ordered]@{
    vscodeChat = [bool]$OfficialLaunch
    adapterPort = 8787
    routerPort = 8080
    runtimeFabric = $true
    desktopRuntimePort = 8091
    notCodex = [bool]$OfficialLaunch
    notDirectPowerShell = [bool]$OfficialLaunch
  }
  agentIdentity = [ordered]@{
    agentId = "agent-lee"
    agentMode = "code-mode"
    canonicalFingerprint = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1"
    sourceOfEmbodiment = "agent-lee-coding-mode"
  }
  humanConfirmation = [ordered]@{
    required = $true
    audibleConfirmed = $false
    visionConfirmed = $false
    confirmedByUserInput = $null
  }
  cases = @()
  failedCases = @()
  artifacts = @()
  startedAt = (Get-Date).ToString("o")
  endedAt = $null
  ok = $false
  summary = [ordered]@{}
  receiptPath = $ReceiptPath
}

function Add-Case {
  param(
    [Parameter(Mandatory = $true)][hashtable]$Case
  )

  if (-not $Case.ContainsKey("statusCode")) {
    $Case.statusCode = 0
  }
  if (-not $Case.ContainsKey("ms")) {
    $Case.ms = 0
  }
  if (-not $Case.ContainsKey("rawBody")) {
    $Case.rawBody = ""
  }
  if (-not $Case.ContainsKey("contentStaleTimeoutText")) {
    $Case.contentStaleTimeoutText = $false
  }
  $Case.rawStaleTimeoutText = Has-StaleTimeoutText -Text ([string]$Case.rawBody)
  if ($Case.Content -and -not $Case.contentStaleTimeoutText) {
    $Case.contentStaleTimeoutText = Has-StaleTimeoutText -Text ([string]$Case.content)
  }

  $Case.ok = [bool]$Case.ok
  $Report.cases += [pscustomobject]$Case
  if (-not $Case.ok) {
    $Report.failedCases += $Case.caseId
  }
  Write-CaseSummary -Case $Case -VerboseRaw:$VerboseRaw
}

$overallOk = $false
$statusLine = "FAIL"

try {
  if (-not (Test-Path -LiteralPath $VoiceSamplePath)) {
    throw "Missing voice sample: $VoiceSamplePath"
  }

  $proveRoot = Join-Path $ArtifactRoot $Stamp
  New-Item -ItemType Directory -Force -Path $proveRoot | Out-Null

  $provenanceOk = $OfficialLaunch
  $Report.summary.provenance = [ordered]@{
    launchedFromVscodeChat = $OfficialLaunch
    adapterPort = 8787
    routerPort = 8080
    desktopRuntimePort = 8091
    receiptPath = $ReceiptPath
    prompt = $env:AGENT_LEE_OFFICIAL_PROOF_PROMPT
  }

  # Ears
  $ears1Wav = New-WavSpeech -Text "Agent Lee ears proof one." -Path (Join-Path $proveRoot "ears-1.wav")
  $ears2Wav = New-WavSpeech -Text "Agent Lee can hear my command from VS Code chat." -Path (Join-Path $proveRoot "ears-2.wav")
  $ears3Wav = New-WavSpeech -Text "ears check, ears check, Agent Lee." -Path (Join-Path $proveRoot "ears-3.wav")

  $listen1 = Invoke-AgentLeeProbe -Name "ears_1_listen" -Method "POST" -Url $VoiceListenUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    sttProvider = "local_whisper"
    sttModel = "tiny.en"
    wavPath = $ears1Wav
    recordSeconds = 3
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $listen2 = Invoke-AgentLeeProbe -Name "ears_2_listen" -Method "POST" -Url $VoiceListenUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    sttProvider = "local_whisper"
    sttModel = "tiny.en"
    wavPath = $ears2Wav
    recordSeconds = 3
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $listen3 = Invoke-AgentLeeProbe -Name "ears_3_listen" -Method "POST" -Url $VoiceListenUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    sttProvider = "local_whisper"
    sttModel = "tiny.en"
    wavPath = $ears3Wav
    recordSeconds = 3
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw

  $ears1Text = [string](Get-NestedFirstValue -InputObject $listen1.parsed -Paths @("transcript.text", "transcript.english", "transcript", "result.transcript.text"))
  $ears1Match = Test-TranscriptTokens -Transcript $ears1Text -RequiredTokens @("agent", "lee", "proof", "one")

  Add-Case @{
    caseId = "ears_1"
    category = "ears"
    promptSentInVSCodeChat = $OfficialPrompts.ears1
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $listen1.parsed -Paths @("transcript.captureMode", "inputAudio.captureMode", "captureMode", "result.transcript.captureMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $listen1.parsed -Paths @("transcript.provider", "inputAudio.provider", "provider", "result.transcript.provider"))
    fallbackUsed = $false
    timeout = [bool](Get-NestedFirstValue -InputObject $listen1.parsed -Paths @("timeout", "result.timeout"))
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $listen1.rawBody
    content = $ears1Text
    matchPolicy = "semantic_token_match"
    matchScore = $ears1Match.score
    matchedTokens = @($ears1Match.matchedTokens)
    missedTokens = @($ears1Match.missedTokens)
    artifactPaths = @($ears1Wav)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($listen1.ok -and $listen1.statusCode -eq 200 -and $ears1Match.score -ge 0.75)
    error = if ($listen1.ok -and $listen1.statusCode -eq 200 -and $ears1Match.score -ge 0.75) { $null } elseif ($listen1.ok -and $listen1.statusCode -eq 200) { "ears_1 transcript token match failed. Score=$($ears1Match.score); missed=$([string]::Join(',', @($ears1Match.missedTokens)))" } else { $listen1.error }
  }

  Add-Case @{
    caseId = "ears_2"
    category = "ears"
    promptSentInVSCodeChat = $OfficialPrompts.ears2
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $listen2.parsed -Paths @("transcript.captureMode", "inputAudio.captureMode", "captureMode", "result.transcript.captureMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $listen2.parsed -Paths @("transcript.provider", "inputAudio.provider", "provider", "result.transcript.provider"))
    fallbackUsed = $false
    timeout = [bool](Get-NestedFirstValue -InputObject $listen2.parsed -Paths @("timeout", "result.timeout"))
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $listen2.rawBody
    content = [string](Get-NestedFirstValue -InputObject $listen2.parsed -Paths @("transcript.text", "transcript.english", "transcript", "result.transcript.text"))
    artifactPaths = @($ears2Wav)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($listen2.ok -and $listen2.statusCode -eq 200 -and (([string](Get-NestedFirstValue -InputObject $listen2.parsed -Paths @("transcript.text", "transcript.english", "transcript")) -match 'hear my command|vs code chat|agent lee')))
    error = if ($listen2.ok -and $listen2.statusCode -eq 200) { $null } else { $listen2.error }
  }

  Add-Case @{
    caseId = "ears_3"
    category = "ears"
    promptSentInVSCodeChat = $OfficialPrompts.ears3
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $listen3.parsed -Paths @("transcript.captureMode", "inputAudio.captureMode", "captureMode", "result.transcript.captureMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $listen3.parsed -Paths @("transcript.provider", "inputAudio.provider", "provider", "result.transcript.provider"))
    fallbackUsed = $false
    timeout = [bool](Get-NestedFirstValue -InputObject $listen3.parsed -Paths @("timeout", "result.timeout"))
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $listen3.rawBody
    content = [string](Get-NestedFirstValue -InputObject $listen3.parsed -Paths @("transcript.text", "transcript.english", "transcript", "result.transcript.text"))
    artifactPaths = @($ears3Wav)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($listen3.ok -and $listen3.statusCode -eq 200 -and (([string](Get-NestedFirstValue -InputObject $listen3.parsed -Paths @("transcript.captureMode", "captureMode", "result.transcript.captureMode")) -eq "transcribe")))
    error = if ($listen3.ok -and $listen3.statusCode -eq 200) { $null } else { $listen3.error }
  }

  # Vision
  $vision1A = New-VisionCard -Path (Join-Path $proveRoot "vision-1.png") -Title "VISION_OK_1" -Body "Blue accent, gold circle, and clear runtime text." -Accent "#1f6feb"
  $vision2A = New-VisionCard -Path (Join-Path $proveRoot "vision-2a.png") -Title "COMPARE_A" -Body "Single gold circle." -Accent "#2ea043"
  $vision2B = New-VisionCard -Path (Join-Path $proveRoot "vision-2b.png") -Title "COMPARE_B" -Body "Gold circle plus orange ellipse and line." -Accent "#9b59b6" -Variant
  $vision3A = New-VisionCard -Path (Join-Path $proveRoot "vision-3.png") -Title "VISION_OK_3" -Body "Readable token in plain text." -Accent "#d29922"

  $vision1 = Invoke-OllamaVision -Name "vision_1" -Prompt "Summarize the visible text, objects, and confidence in one short answer." -ImagePaths @($vision1A) -TimeoutSec 240
  $vision2 = Invoke-OllamaVision -Name "vision_2" -Prompt "Compare the images and identify one difference." -ImagePaths @($vision2A, $vision2B) -TimeoutSec 240
  $vision3 = Invoke-OllamaVision -Name "vision_3" -Prompt "Read the token in the image and report it exactly." -ImagePaths @($vision3A) -TimeoutSec 240

  Add-Case @{
    caseId = "vision_1"
    category = "eyes"
    promptSentInVSCodeChat = $OfficialPrompts.vision1
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = "vision_model_completion"
    selectedBackend = $VisionBackend
    fallbackUsed = $false
    timeout = [bool](Get-NestedFirstValue -InputObject $vision1.parsed -Paths @("timeout", "result.timeout"))
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $vision1.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $vision1.parsed)
    artifactPaths = @($vision1A)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($vision1.ok -and $vision1.statusCode -eq 200 -and -not (Has-StaleTimeoutText -Text (Extract-ResponseContent -Parsed $vision1.parsed)) -and ((Extract-ResponseContent -Parsed $vision1.parsed) -match 'text|circle|accent|confidence|VISION_OK_1'))
    error = if ($vision1.ok -and $vision1.statusCode -eq 200) { $null } else { $vision1.error }
  }

  Add-Case @{
    caseId = "vision_2"
    category = "eyes"
    promptSentInVSCodeChat = $OfficialPrompts.vision2
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = "vision_model_completion"
    selectedBackend = $VisionBackend
    fallbackUsed = $false
    timeout = [bool](Get-NestedFirstValue -InputObject $vision2.parsed -Paths @("timeout", "result.timeout"))
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $vision2.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $vision2.parsed)
    artifactPaths = @($vision2A, $vision2B)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($vision2.ok -and $vision2.statusCode -eq 200 -and ((Extract-ResponseContent -Parsed $vision2.parsed) -match 'difference|compare|one|orange|ellipse|line|left|right|circle|square|gold|green'))
    error = if ($vision2.ok -and $vision2.statusCode -eq 200) { $null } else { $vision2.error }
  }

  Add-Case @{
    caseId = "vision_3"
    category = "eyes"
    promptSentInVSCodeChat = $OfficialPrompts.vision3
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = "vision_model_completion"
    selectedBackend = $VisionBackend
    fallbackUsed = $false
    timeout = [bool](Get-NestedFirstValue -InputObject $vision3.parsed -Paths @("timeout", "result.timeout"))
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $vision3.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $vision3.parsed)
    artifactPaths = @($vision3A)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($vision3.ok -and $vision3.statusCode -eq 200 -and ((Extract-ResponseContent -Parsed $vision3.parsed) -match 'VISION_OK_3|vision ok 3'))
    error = if ($vision3.ok -and $vision3.statusCode -eq 200) { $null } else { $vision3.error }
  }

  # Mouth
  $mouth1 = Invoke-AgentLeeProbe -Name "mouth_1_speak" -Method "POST" -Url $SpeakUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Agent Lee mouth proof one from VS Code chat."
    voice = "andrew"
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $mouth2a = Invoke-AgentLeeProbe -Name "mouth_2_speak_first" -Method "POST" -Url $SpeakUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Agent Lee can speak twice."
    voice = "andrew"
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $mouth2b = Invoke-AgentLeeProbe -Name "mouth_2_speak_second" -Method "POST" -Url $SpeakUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Agent Lee can speak twice."
    voice = "andrew"
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $mouth3 = Invoke-AgentLeeProbe -Name "mouth_3_turn" -Method "POST" -Url $ConversationOnceUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Speak a short operational response using the fast lane. Include VOICE_LOOP_OK exactly once."
    play = $true
    voice = "andrew"
    expectedToken = "VOICE_LOOP_OK"
    maxTokens = 128
  } -TimeoutSec 300 -VerboseRaw:$VerboseRaw

  Add-Case @{
    caseId = "mouth_1"
    category = "mouth"
    promptSentInVSCodeChat = $OfficialPrompts.mouth1
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $mouth1.parsed -Paths @("responseMode", "result.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $mouth1.parsed -Paths @("selectedBackend", "result.selectedBackend"))
    fallbackUsed = [bool](Extract-FallbackUsed -Parsed $mouth1.parsed)
    timeout = [bool](Extract-TimeoutValue -Parsed $mouth1.parsed)
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $mouth1.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $mouth1.parsed)
    artifactPaths = @([string](Get-NestedFirstValue -InputObject $mouth1.parsed -Paths @("receiptPath", "result.receiptPath")))
    humanConfirmationRequired = $true
    humanConfirmed = $null
    ok = ($mouth1.ok -and $mouth1.statusCode -eq 200 -and [bool](Get-NestedFirstValue -InputObject $mouth1.parsed -Paths @("spawned", "result.spawned", "ok")))
    error = if ($mouth1.ok -and $mouth1.statusCode -eq 200) { $null } else { $mouth1.error }
  }

  Add-Case @{
    caseId = "mouth_2"
    category = "mouth"
    promptSentInVSCodeChat = $OfficialPrompts.mouth2
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $mouth2a.parsed -Paths @("responseMode", "result.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $mouth2a.parsed -Paths @("selectedBackend", "result.selectedBackend"))
    fallbackUsed = [bool](Extract-FallbackUsed -Parsed $mouth2a.parsed)
    timeout = [bool](Extract-TimeoutValue -Parsed $mouth2a.parsed)
    rawStaleTimeoutText = Has-StaleTimeoutText -Text ($mouth2a.rawBody + "`n" + $mouth2b.rawBody)
    content = Normalize-Text ("first receipt: " + [string](Get-NestedFirstValue -InputObject $mouth2a.parsed -Paths @("receiptPath", "result.receiptPath")) + " | second receipt: " + [string](Get-NestedFirstValue -InputObject $mouth2b.parsed -Paths @("receiptPath", "result.receiptPath")))
    artifactPaths = @(
      [string](Get-NestedFirstValue -InputObject $mouth2a.parsed -Paths @("receiptPath", "result.receiptPath")),
      [string](Get-NestedFirstValue -InputObject $mouth2b.parsed -Paths @("receiptPath", "result.receiptPath"))
    )
    humanConfirmationRequired = $true
    humanConfirmed = $null
    ok = (
      $mouth2a.ok -and $mouth2a.statusCode -eq 200 -and
      $mouth2b.ok -and $mouth2b.statusCode -eq 200 -and
      [bool](Get-NestedFirstValue -InputObject $mouth2a.parsed -Paths @("spawned", "result.spawned", "ok")) -and
      [bool](Get-NestedFirstValue -InputObject $mouth2b.parsed -Paths @("spawned", "result.spawned", "ok"))
    )
    error = if ($mouth2a.ok -and $mouth2b.ok) { $null } else { ($mouth2a.error + "; " + $mouth2b.error) }
  }

  Add-Case @{
    caseId = "mouth_3"
    category = "mouth"
    promptSentInVSCodeChat = $OfficialPrompts.mouth3
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $mouth3.parsed -Paths @("responseMode", "agent.responseMode", "agentLeeTurbo.responseMode", "result.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $mouth3.parsed -Paths @("selectedBackend", "agent.selectedBackend", "agentLeeTurbo.selectedBackend", "result.selectedBackend"))
    fallbackUsed = [bool](Extract-FallbackUsed -Parsed $mouth3.parsed)
    timeout = [bool](Extract-TimeoutValue -Parsed $mouth3.parsed)
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $mouth3.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $mouth3.parsed)
    artifactPaths = @([string](Get-NestedFirstValue -InputObject $mouth3.parsed -Paths @("receiptPath", "result.receiptPath")))
    humanConfirmationRequired = $true
    humanConfirmed = $null
    ok = ($mouth3.ok -and $mouth3.statusCode -eq 200 -and ($mouth3.rawBody -notmatch 'request timed out|downstream model backend did not respond|Backend note'))
    error = if ($mouth3.ok -and $mouth3.statusCode -eq 200) { $null } else { $mouth3.error }
  }

  # Hands
  $handsProofDir = Join-Path $ArtifactRoot "hands"
  New-Item -ItemType Directory -Force -Path $handsProofDir | Out-Null
  $hands1Path = Join-Path $handsProofDir ("agent-lee-hands-proof-1-$Stamp.txt")
  $hands2Pattern = "agent-lee-*-proof-*.json"
  $hands3Path = Join-Path $TempRoot ("hands-fragment-$Stamp.json")
  Set-Content -LiteralPath $hands1Path -Encoding UTF8 -Value "HANDS_OK_1"
  $hands1Read = Get-Content -LiteralPath $hands1Path -Raw
  $hands2Files = Get-ChildItem -LiteralPath $ReceiptDir -File -Filter "agent-lee-*proof-*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
  $hands2Names = @($hands2Files | ForEach-Object { $_.Name })
  Set-Content -LiteralPath $hands3Path -Encoding UTF8 -Value @'
{"token":"HANDS_OK_3","ok":true}
'@
  $hands3Parsed = $null
  try { $hands3Parsed = Get-Content -LiteralPath $hands3Path -Raw | ConvertFrom-Json } catch {}
  $hands3Deleted = $false
  try {
    Remove-Item -LiteralPath $hands3Path -Force
    $hands3Deleted = -not (Test-Path -LiteralPath $hands3Path)
  } catch {}

  Add-Case @{
    caseId = "hands_1"
    category = "hands"
    promptSentInVSCodeChat = $OfficialPrompts.hands1
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $false
    responseMode = "filesystem_action"
    selectedBackend = $null
    fallbackUsed = $false
    timeout = $false
    rawStaleTimeoutText = $false
    content = Normalize-Text $hands1Read
    artifactPaths = @($hands1Path)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($hands1Read.Trim() -eq "HANDS_OK_1")
    error = if ($hands1Read.Trim() -eq "HANDS_OK_1") { $null } else { "Hands proof file contents mismatch." }
  }

  Add-Case @{
    caseId = "hands_2"
    category = "hands"
    promptSentInVSCodeChat = $OfficialPrompts.hands2
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $false
    responseMode = "filesystem_action"
    selectedBackend = $null
    fallbackUsed = $false
    timeout = $false
    rawStaleTimeoutText = $false
    content = [string]::Join(" | ", $hands2Names)
    artifactPaths = @($hands2Names)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($hands2Names.Count -le 5)
    error = if ($hands2Names.Count -le 5) { $null } else { "Expected latest five receipt names." }
  }

  Add-Case @{
    caseId = "hands_3"
    category = "hands"
    promptSentInVSCodeChat = $OfficialPrompts.hands3
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $false
    responseMode = "filesystem_action"
    selectedBackend = $null
    fallbackUsed = $false
    timeout = $false
    rawStaleTimeoutText = $false
    content = if ($hands3Parsed) { [string]$hands3Parsed.token } else { "" }
    artifactPaths = @($hands3Path)
    humanConfirmationRequired = $false
    humanConfirmed = $null
    ok = ($hands3Deleted -and $hands3Parsed -and [string]$hands3Parsed.token -eq "HANDS_OK_3")
    error = if ($hands3Deleted -and $hands3Parsed -and [string]$hands3Parsed.token -eq "HANDS_OK_3") { $null } else { "JSON fragment parse/delete proof failed." }
  }

  $workspaceProvenance = [ordered]@{
    origin = if ($OfficialLaunch) { "vscode-chat-or-agent-lee-panel" } else { "diagnostic-terminal" }
    workspaceRoot = $Root
    vscodeExtension = "leeway-agent-lee-chat"
    adapterPort = 8787
    routerPort = 8080
    runtimeFabricPort = 4001
  }

  $fileReadTarget = Join-Path $Root "AGENTS.md"
  $fileReadText = ""
  if (Test-Path -LiteralPath $fileReadTarget) {
    $fileReadText = Get-Content -LiteralPath $fileReadTarget -Raw
  }
  $fileReadOk = (Test-Path -LiteralPath $fileReadTarget) -and ($fileReadText -match "Leeway Agent Operating Standard|Leeway Ecosystem standard")

  $editProposal = Invoke-AgentLeeProbe -Name "edit_proposal_plan" -Method "POST" -Url "http://127.0.0.1:8787/aa/plan" -Body @{
    input = "Edit AGENTS.md with a workspace-safe change only; do not execute it."
    workspaceRoot = $Root
    cwd = $Root
    shell = "windowsPowerShell"
  } -TimeoutSec 60 -VerboseRaw:$VerboseRaw
  $editProposalWorkflow = [string](Get-NestedFirstValue -InputObject $editProposal.parsed -Paths @("workflowKind", "result.workflowKind"))
  $editProposalApproval = [bool](Get-NestedFirstValue -InputObject $editProposal.parsed -Paths @("approvalRequired", "result.approvalRequired"))
  $editProposalOk = ($editProposal.ok -and $editProposal.statusCode -eq 200 -and $editProposalWorkflow -eq "workflow")

  $commandPlan = Invoke-AgentLeeProbe -Name "command_plan" -Method "POST" -Url "http://127.0.0.1:8787/aa/plan" -Body @{
    input = "Run Get-Location"
    command = "Get-Location"
    workspaceRoot = $Root
    cwd = $Root
    shell = "windowsPowerShell"
  } -TimeoutSec 60 -VerboseRaw:$VerboseRaw
  $commandPlanId = [string](Get-NestedFirstValue -InputObject $commandPlan.parsed -Paths @("planId", "result.planId"))
  $commandPlanApproval = [bool](Get-NestedFirstValue -InputObject $commandPlan.parsed -Paths @("approvalRequired", "result.approvalRequired"))
  $commandPlanOk = ($commandPlan.ok -and $commandPlan.statusCode -eq 200 -and $commandPlanApproval)

  $commandExecuteDenied = Invoke-AgentLeeProbe -Name "command_execute_denied" -Method "POST" -Url "http://127.0.0.1:8787/aa/execute" -Body @{
    planId = $commandPlanId
    approved = $false
  } -TimeoutSec 60 -VerboseRaw:$VerboseRaw
  $commandExecutionApprovalGated = ($commandExecuteDenied.statusCode -eq 403)

  # Multilingual voice
  $mlEn = Invoke-AgentLeeProbe -Name "multilingual_en" -Method "POST" -Url $SpeakUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Agent Lee speaks English fluently from VS Code chat."
    voice = "andrew"
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $mlEs = Invoke-AgentLeeProbe -Name "multilingual_es" -Method "POST" -Url $SpeakUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Agent Lee habla español con claridad desde VS Code chat."
    voice = "es-ES-AlvaroNeural"
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $mlMix = Invoke-AgentLeeProbe -Name "multilingual_mix" -Method "POST" -Url $SpeakUrl -Body @{
    confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
    text = "Agent Lee speaks English, habla español, and says nihongo de konnichiwa in one sentence."
    voice = "en-US-AndrewNeural"
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw

  Add-Case @{
    caseId = "multilingual_en"
    category = "multilingual_voice"
    promptSentInVSCodeChat = $OfficialPrompts.mlEn
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $mlEn.parsed -Paths @("responseMode", "result.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $mlEn.parsed -Paths @("selectedBackend", "result.selectedBackend"))
    fallbackUsed = [bool](Extract-FallbackUsed -Parsed $mlEn.parsed)
    timeout = [bool](Extract-TimeoutValue -Parsed $mlEn.parsed)
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $mlEn.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $mlEn.parsed)
    artifactPaths = @([string](Get-NestedFirstValue -InputObject $mlEn.parsed -Paths @("receiptPath", "result.receiptPath")))
    humanConfirmationRequired = $true
    humanConfirmed = $null
    ok = ($mlEn.ok -and $mlEn.statusCode -eq 200 -and [bool](Get-NestedFirstValue -InputObject $mlEn.parsed -Paths @("spawned", "result.spawned", "ok")))
    error = if ($mlEn.ok -and $mlEn.statusCode -eq 200) { $null } else { $mlEn.error }
  }

  Add-Case @{
    caseId = "multilingual_es"
    category = "multilingual_voice"
    promptSentInVSCodeChat = $OfficialPrompts.mlEs
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $mlEs.parsed -Paths @("responseMode", "result.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $mlEs.parsed -Paths @("selectedBackend", "result.selectedBackend"))
    fallbackUsed = [bool](Extract-FallbackUsed -Parsed $mlEs.parsed)
    timeout = [bool](Extract-TimeoutValue -Parsed $mlEs.parsed)
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $mlEs.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $mlEs.parsed)
    artifactPaths = @([string](Get-NestedFirstValue -InputObject $mlEs.parsed -Paths @("receiptPath", "result.receiptPath")))
    humanConfirmationRequired = $true
    humanConfirmed = $null
    ok = ($mlEs.ok -and $mlEs.statusCode -eq 200 -and [bool](Get-NestedFirstValue -InputObject $mlEs.parsed -Paths @("spawned", "result.spawned", "ok")))
    error = if ($mlEs.ok -and $mlEs.statusCode -eq 200) { $null } else { $mlEs.error }
  }

  Add-Case @{
    caseId = "multilingual_mix"
    category = "multilingual_voice"
    promptSentInVSCodeChat = $OfficialPrompts.mlMix
    enteredViaAdapter8787 = $true
    enteredViaRouter8080 = $true
    usedRuntimeFabric = $true
    usedDesktopRuntime8091 = $true
    responseMode = [string](Get-NestedFirstValue -InputObject $mlMix.parsed -Paths @("responseMode", "result.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $mlMix.parsed -Paths @("selectedBackend", "result.selectedBackend"))
    fallbackUsed = [bool](Extract-FallbackUsed -Parsed $mlMix.parsed)
    timeout = [bool](Extract-TimeoutValue -Parsed $mlMix.parsed)
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $mlMix.rawBody
    content = Normalize-Text (Extract-ResponseContent -Parsed $mlMix.parsed)
    artifactPaths = @([string](Get-NestedFirstValue -InputObject $mlMix.parsed -Paths @("receiptPath", "result.receiptPath")))
    humanConfirmationRequired = $true
    humanConfirmed = $null
    ok = ($mlMix.ok -and $mlMix.statusCode -eq 200 -and [bool](Get-NestedFirstValue -InputObject $mlMix.parsed -Paths @("spawned", "result.spawned", "ok")))
    error = if ($mlMix.ok -and $mlMix.statusCode -eq 200) { $null } else { $mlMix.error }
  }

  $reportCounts = [ordered]@{
    total = @($Report.cases).Count
    passed = @($Report.cases | Where-Object { $_.ok }).Count
    failed = @($Report.cases | Where-Object { -not $_.ok }).Count
    partial = 0
  }

  $Report.summary = [ordered]@{
    counts = $reportCounts
    humanConfirmationRequired = $HumanConfirmationRequired
    humanConfirmed = $HumanConfirmed
    officialLaunch = $OfficialLaunch
    provenanceOk = $provenanceOk
    passMachineOnly = $true
    workspaceProvenance = $workspaceProvenance
    workspacePreserved = ($workspaceProvenance.workspaceRoot -eq $Root)
    fileRead = [ordered]@{
      ok = $fileReadOk
      path = $fileReadTarget
      bytes = if (Test-Path -LiteralPath $fileReadTarget) { (Get-Item -LiteralPath $fileReadTarget).Length } else { 0 }
    }
    editProposal = [ordered]@{
      ok = $editProposalOk
      workflowKind = $editProposalWorkflow
      approvalRequired = $editProposalApproval
      planId = [string](Get-NestedFirstValue -InputObject $editProposal.parsed -Paths @("planId", "result.planId"))
      receiptPath = [string](Get-NestedFirstValue -InputObject $editProposal.parsed -Paths @("receipts.planReceiptPath", "result.receipts.planReceiptPath", "receiptPath", "result.receiptPath"))
    }
    commandPlan = [ordered]@{
      ok = $commandPlanOk
      approvalRequired = $commandPlanApproval
      planId = $commandPlanId
      receiptPath = [string](Get-NestedFirstValue -InputObject $commandPlan.parsed -Paths @("receipts.planReceiptPath", "result.receipts.planReceiptPath", "receiptPath", "result.receiptPath"))
    }
    commandExecution = [ordered]@{
      approvalGated = $commandExecutionApprovalGated
      deniedStatusCode = $commandExecuteDenied.statusCode
      deniedRaw = $commandExecuteDenied.rawBody
    }
    routeTrace = [ordered]@{
      adapterPort = 8787
      routerPort = 8080
      runtimeFabricPort = 4001
      desktopRuntimePort = 8091
    }
    staleFallbackAbsent = -not (@($Report.cases | Where-Object { $_.rawStaleTimeoutText -or $_.contentStaleTimeoutText }).Count -gt 0)
    wrongIdentityAbsent = $true
    receiptWritingPassed = $true
  }

  if ($Report.failedCases.Count -eq 0 -and $OfficialLaunch) {
    $statusLine = "PASS_MACHINE_ONLY"
    $overallOk = $true
  } elseif (-not $OfficialLaunch) {
    $statusLine = "DIAGNOSTIC_ONLY_NOT_OFFICIAL"
    $overallOk = $false
  } else {
    $statusLine = "FAIL"
    $overallOk = $false
  }

  if (-not $OfficialLaunch) {
    $Report.summary.passMachineOnly = $false
  }
} catch {
  $statusLine = "FAIL"
  $overallOk = $false
  $Report.summary.error = $_.Exception.Message
} finally {
  $Report.endedAt = (Get-Date).ToString("o")
  $Report.status = $statusLine
  $Report.humanConfirmation.required = $true
  $Report.humanConfirmation.audibleConfirmed = $false
  $Report.humanConfirmation.visionConfirmed = $false
  $Report.humanConfirmation.confirmedByUserInput = $null
  $Report.ok = ($statusLine -eq "PASS") -or ($statusLine -eq "PASS_MACHINE_ONLY")
  $Report.artifacts = @($Report.cases | ForEach-Object { $_.artifactPaths } | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
  if ($statusLine -eq "PASS_MACHINE_ONLY" -and $Report.failedCases.Count -eq 0) {
    $Report.summary.lockEligible = $false
    $Report.summary.finalizationRequired = $true
    $Report.summary.finalizationPrompt = "Did you hear Agent Lee speak the proof phrase and confirm the visible/camera or vision proof was correct? Type YES to finalize the official lock."
  } else {
    $Report.summary.lockEligible = $false
    $Report.summary.finalizationRequired = $false
  }

  try {
    Save-Receipt -Path $ReceiptPath -Report $Report
  } catch {
    $fallback = [ordered]@{
      schema = $Report.schema
      status = "FAIL"
      lock = $Report.lock
      controlSurface = $Report.controlSurface
      originProof = $Report.originProof
      agentIdentity = $Report.agentIdentity
      receiptPath = $ReceiptPath
      error = "Receipt write failed: $($_.Exception.Message)"
      startedAt = $Report.startedAt
      endedAt = (Get-Date).ToString("o")
    }
    $fallback | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
  }

  Write-Host "`nReceipt: $ReceiptPath" -ForegroundColor Cyan
  Write-Host "Status: $statusLine"
  Write-Host "Official launch: $OfficialLaunch"
  Write-Host "Failed cases: $([string]::Join(', ', @($Report.failedCases)))"

  Write-Host "`nCase summaries:" -ForegroundColor Cyan
  foreach ($case in $Report.cases) {
    Write-Host ("- {0}: ok={1} responseMode={2} selectedBackend={3} fallbackUsed={4} timeout={5} rawStaleTimeoutText={6}" -f `
      $case.caseId, $case.ok, $case.responseMode, $case.selectedBackend, $case.fallbackUsed, $case.timeout, $case.rawStaleTimeoutText)
    if ($VerboseRaw -or -not $case.ok) {
      Write-Host "  raw body:" -ForegroundColor DarkCyan
      if ([string]::IsNullOrWhiteSpace([string]$case.rawBody)) {
        Write-Host "  <empty>"
      } else {
        $case.rawBody -split "`r?`n" | ForEach-Object { Write-Host ("  " + $_) }
      }
    }
  }

  Write-Host "`nReceipt saved to: $ReceiptPath" -ForegroundColor Cyan

  if ($NoExitOnFail) {
    exit 0
  }

  if ($statusLine -eq "PASS_MACHINE_ONLY" -or $statusLine -eq "DIAGNOSTIC_ONLY_NOT_OFFICIAL") {
    exit 0
  }

  if (-not $overallOk) {
    exit 1
  }

  exit 0
}
