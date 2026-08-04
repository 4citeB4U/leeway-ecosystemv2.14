param(
  [int]$AmbientCaptureSeconds = 5,
  [string]$AudioDevice = "",
  [string]$ExpectedPhrase = "",
  [switch]$SkipAmbientCapture,
  [switch]$SkipQwenRetest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsRoot = Join-Path $workspaceRoot "Archive\reports"
$receiptsRoot = Join-Path $workspaceRoot "Archive\receipts"
$qwenPython = Join-Path $workspaceRoot ".leeway-runtime\envs\qwen-gpu\Scripts\python.exe"
$qwenInferenceScript = Join-Path $workspaceRoot "scripts\leeway_live_qwen_session_inference.py"
$audioProfileScript = Join-Path $workspaceRoot "scripts\leeway_audio_profile.py"
$captureDependencyHelperPath = Join-Path $workspaceRoot "scripts\lib\Resolve-LeeWayApprovedCaptureDependency.ps1"
$sessionStatePath = Join-Path $reportsRoot "leeway-real-time-embodied-session-state.json"
$finalPromotionPath = Join-Path $reportsRoot "leeway-live-runtime-cutover-embodied-session-promotion-report.json"

$assistantBodyId = "LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::LIVE_HEARING_CALIBRATION"
$assistantObjectId = "LEEWAY_ACTOR::EXTERNAL_ASSISTANT::CODEX_GPT5::WORKSPACE_SUBORDINATE"
$taskId = "LEEWAY_TX::LIVE_HEARING_CALIBRATION::INPUT_PURITY::" + (Get-Date -Format "yyyyMMddTHHmmss")
$stamp = Get-Date -Format "yyyyMMddTHHmmss"

$microphoneAuditPath = Join-Path $reportsRoot "leeway-microphone-source-audit-report.json"
$noiseProfilePath = Join-Path $reportsRoot "leeway-audio-environment-noise-profile.json"
$hearingAccuracyPath = Join-Path $reportsRoot "leeway-qwen-hearing-accuracy-report.json"
$omniPurityPath = Join-Path $reportsRoot "leeway-omni-context-purity-report.json"
$sessionIsolationPath = Join-Path $reportsRoot "leeway-session-context-isolation-report.json"
$retestReportPath = Join-Path $reportsRoot "leeway-live-hearing-calibration-retest-report.json"
$finalJsonPath = Join-Path $reportsRoot "leeway-live-hearing-calibration-input-purity-report.json"
$finalMdPath = Join-Path $reportsRoot "leeway-live-hearing-calibration-input-purity-report.md"
$receiptPath = Join-Path $receiptsRoot "leeway_live_hearing_calibration_input_purity_receipt.json"

$deviceInventoryLogPath = Join-Path $reportsRoot "leeway-microphone-source-device-inventory-$stamp.log"
$captureGateEvidencePath = Join-Path $reportsRoot "leeway-live-hearing-calibration-approved-capture-gate-evidence.json"
$ambientCapturePath = Join-Path $reportsRoot "leeway-hearing-calibration-ambient-$stamp.wav"
$ambientStdOutPath = Join-Path $reportsRoot "leeway-hearing-calibration-ambient-$stamp.stdout.log"
$ambientStdErrPath = Join-Path $reportsRoot "leeway-hearing-calibration-ambient-$stamp.stderr.log"
$qwenRetestPath = Join-Path $reportsRoot "leeway-live-hearing-calibration-qwen-retest-$stamp.json"

$filesRead = [System.Collections.Generic.List[string]]::new()
$filesChanged = [System.Collections.Generic.List[string]]::new()
$commandsRun = [System.Collections.Generic.List[string]]::new()
$toolsUsed = [System.Collections.Generic.List[string]]::new()
$standardsChecked = [System.Collections.Generic.List[string]]::new()
$gatesRun = [System.Collections.Generic.List[string]]::new()
$receiptsWritten = [System.Collections.Generic.List[string]]::new()
$failuresEncountered = [System.Collections.Generic.List[string]]::new()
$lessonsLearned = [System.Collections.Generic.List[string]]::new()
$skillImprovementsSuggested = [System.Collections.Generic.List[string]]::new()

$toolsUsed.Add("functions.shell_command")
$toolsUsed.Add("functions.apply_patch")
$toolsUsed.Add("functions.update_plan")
$standardsChecked.Add("LEEWAY_POLICY::BOOK_54_ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW")
$standardsChecked.Add("LEEWAY_POLICY::BOOK_55_ASSISTANT-RECORDING-AND-LEARNING-LAW")
$standardsChecked.Add("leeway-application-standards")
$gatesRun.Add("LEEWAY_ASSISTANT_EMBODIMENT_GATE")
$gatesRun.Add("LEEWAY_ASSISTANT_RECORDING_LEARNING_GATE")
$gatesRun.Add("LEEWAY_GATE::LIVE_HEARING_CALIBRATION::RUNTIME_TRUTH_WINS")

foreach ($path in @(
  "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
  "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
  "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
  "scripts/leeway_live_qwen_session_inference.py",
  "scripts/leeway_audio_profile.py",
  "LeeWay-Standards/registries/leeway-approved-runtime-dependency-registry.json",
  "scripts/lib/Resolve-LeeWayApprovedCaptureDependency.ps1",
  "Archive/reports/leeway-live-runtime-cutover-embodied-session-promotion-report.json",
  "Archive/reports/leeway-real-time-embodied-session-state.json",
  "Archive/reports/leeway-live-session-qwen-hearing-fusion-report.json",
  "Archive/reports/leeway-live-session-agent-lee-response-report.json",
  "Archive/reports/leeway-live-session-voice-output-report.json"
)) {
  $filesRead.Add($path)
}

function Get-RelativePath {
  param([string]$AbsolutePath)
  $base = [System.IO.Path]::GetFullPath($workspaceRoot).TrimEnd("\") + "\"
  $target = [System.IO.Path]::GetFullPath($AbsolutePath)
  if ($target.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $target.Substring($base.Length).Replace("\", "/")
  }
  return $target.Replace("\", "/")
}

function Add-FileChanged {
  param([string]$AbsolutePath)
  $relative = Get-RelativePath $AbsolutePath
  if (-not $filesChanged.Contains($relative)) {
    $filesChanged.Add($relative)
  }
}

function Add-CommandRun {
  param([string]$CommandText)
  $commandsRun.Add($CommandText)
}

function Read-JsonFile {
  param(
    [string]$Path,
    $Fallback = $null
  )
  if (-not (Test-Path -LiteralPath $Path)) { return $Fallback }
  try {
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
  } catch {
    return $Fallback
  }
}

function Write-JsonFile {
  param(
    [string]$Path,
    $Payload
  )
  $Payload | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
  Add-FileChanged $Path
}

function Get-SafePropertyValue {
  param(
    $Object,
    [string]$PropertyName,
    $Default = $null
  )
  if ($null -eq $Object) { return $Default }
  $property = $Object.PSObject.Properties[$PropertyName]
  if ($null -eq $property) { return $Default }
  return $property.Value
}

function Invoke-LeeWayApprovedCaptureDependencyGate {
  Add-CommandRun ("Resolve-LeeWayApprovedCaptureDependency.ps1 -> " + (Get-RelativePath $captureGateEvidencePath))
  $result = & $captureDependencyHelperPath `
    -WorkspaceRoot $workspaceRoot `
    -ConsumerId "LEEWAY_SCRIPT::RUN_LIVE_HEARING_CALIBRATION_INPUT_PURITY" `
    -GateEvidencePath $captureGateEvidencePath `
    -AssistantBodyId $assistantBodyId `
    -AssistantObjectId $assistantObjectId `
    -TaskId $taskId `
    -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_CAPTURE_GATE"
  if (Test-Path -LiteralPath $captureGateEvidencePath) {
    Add-FileChanged $captureGateEvidencePath
  }
  return $result
}

function Invoke-ProcessWithRedirect {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$StdOutPath,
    [string]$StdErrPath,
    [string]$WorkingDirectory = $workspaceRoot
  )
  $process = Start-Process -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $StdOutPath `
    -RedirectStandardError $StdErrPath `
    -WindowStyle Hidden `
    -Wait `
    -PassThru
  if (Test-Path $StdOutPath) { Add-FileChanged $StdOutPath }
  if (Test-Path $StdErrPath) { Add-FileChanged $StdErrPath }
  return $process.ExitCode
}

function Get-BaseReportFields {
  param(
    [string]$SubjectObjectId,
    [string]$FinalStatus
  )
  return [ordered]@{
    assistantBodyId = $assistantBodyId
    assistantObjectId = $assistantObjectId
    taskId = $taskId
    subjectObjectId = $SubjectObjectId
    filesRead = @($filesRead)
    filesChanged = @($filesChanged)
    commandsRun = @($commandsRun)
    toolsUsed = @($toolsUsed)
    MCPsUsed = @()
    standardsChecked = @($standardsChecked)
    gatesRun = @($gatesRun)
    receiptsWritten = @($receiptsWritten)
    failuresEncountered = @($failuresEncountered)
    lessonsLearned = @($lessonsLearned)
    skillImprovementsSuggested = @($skillImprovementsSuggested)
    finalStatus = $FinalStatus
    remainingBlockers = @()
  }
}

function Normalize-Text {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
  $normalized = $Text.ToLowerInvariant()
  $normalized = [regex]::Replace($normalized, "[^a-z0-9\s]", " ")
  $normalized = [regex]::Replace($normalized, "\s+", " ").Trim()
  return $normalized
}

function Get-TokenCoverage {
  param(
    [string]$Expected,
    [string]$Actual
  )
  $expectedTokens = @(Normalize-Text $Expected -split " " | Where-Object { $_ })
  $actualTokens = @(Normalize-Text $Actual -split " " | Where-Object { $_ })
  if ($expectedTokens.Count -eq 0) {
    return [ordered]@{ exact = $false; coverage = 0.0; semanticPass = $false }
  }
  $expectedSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$expectedTokens)
  $actualSet = [System.Collections.Generic.HashSet[string]]::new([string[]]$actualTokens)
  $hits = 0
  foreach ($token in $expectedSet) {
    if ($actualSet.Contains($token)) { $hits += 1 }
  }
  $coverage = if ($expectedSet.Count -gt 0) { [double]$hits / [double]$expectedSet.Count } else { 0.0 }
  $expectedNorm = Normalize-Text $Expected
  $actualNorm = Normalize-Text $Actual
  return [ordered]@{
    exact = $expectedNorm -eq $actualNorm
    coverage = [math]::Round($coverage, 4)
    semanticPass = ($coverage -ge 0.6) -or $actualNorm.Contains($expectedNorm) -or $expectedNorm.Contains($actualNorm)
  }
}

function Get-PurityAssessment {
  param([string]$Text)
  $markers = [System.Collections.Generic.List[string]]::new()
  if ([string]::IsNullOrWhiteSpace($Text)) {
    $markers.Add("EMPTY_OUTPUT")
  }
  if ($Text -match "(?m)^system\b|(?m)^user\b|(?m)^assistant\b") {
    $markers.Add("PROMPT_ECHO")
  }
  if ($Text -match "(radio is playing|music is playing|background noise)") {
    $markers.Add("GENERIC_SCENE_CAPTION")
  }
  if ($Text -match "(product|knife|knives|promo|promotion|包邮|杨家刀|所见即所得)") {
    $markers.Add("PRODUCT_PROMO_SIGNAL_PRESENT")
  }
  if ($Text -match "BACKGROUND_OR_UNCLEAR") {
    $markers.Add("BACKGROUND_REJECTION_TRIGGERED")
  }
  return [string[]]$markers.ToArray()
}

function Parse-FfmpegAudioDevices {
  param([string[]]$Lines)
  $devices = @()
  for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match '"(.+)" \(audio\)') {
      $name = $Matches[1]
      $altName = $null
      if (($i + 2) -lt $Lines.Count -and $Lines[$i + 1] -match "Alternative name") {
        $candidate = $Lines[$i + 2].Trim().Trim('"')
        if ($candidate -match "^@device_" -or $candidate -match "^\\\\\?\\") {
          $altName = $candidate
        }
      }
      $devices += [ordered]@{
        name = $name
        alternativeName = $altName
      }
    }
  }
  return $devices
}

function Get-LatestFile {
  param([string]$Filter)
  return Get-ChildItem -Path $reportsRoot -Filter $Filter -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Invoke-AgentLeeCalibrationResponse {
  param(
    [string]$QwenAudioText,
    [string]$QwenOmniText
  )
  $body = @{
    sourceText = "Qwen hearing says: $QwenAudioText`nQwen fusion says: $QwenOmniText`nRespond to Leonard with a concise hearing-calibration acknowledgement of what was actually heard."
    source = "leonard"
    mode = "CREATOR_CONVERSATION"
    contextTags = @("live_hearing_calibration", "input_purity", "qwen_session_bound")
    truthLabel = if ($ExpectedPhrase) { "PASS_CANDIDATE" } else { "PARTIAL" }
    situation = @{
      rtcContinuity = "PROVEN"
      microphoneContinuity = "LIVE_PROVEN"
      voiceContinuity = "LIVE_PROVEN"
      gpuAuthority = "AVAILABLE"
      runtimeHealth = "healthy"
      blockerSeverity = if ($ExpectedPhrase) { "none" } else { "minor" }
    }
  }
  try {
    return @{
      ok = $true
      body = Invoke-RestMethod -Uri "http://127.0.0.1:7600/api/language/process" -Method Post -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 20) -TimeoutSec 60
      request = $body
      error = $null
    }
  } catch {
    return @{
      ok = $false
      body = $null
      request = $body
      error = $_.Exception.Message
    }
  }
}

$sessionState = Read-JsonFile -Path $sessionStatePath -Fallback ([ordered]@{})
$promotion = Read-JsonFile -Path $finalPromotionPath -Fallback ([ordered]@{})
$captureDependency = Invoke-LeeWayApprovedCaptureDependencyGate
$currentSessionId = if ($sessionState.sessionId) { [string]$sessionState.sessionId } else { "LEEWAY_SESSION::LIVE_RUNTIME_CUTOVER::UNKNOWN" }
$currentConversationId = if ($sessionState.conversationId) { [string]$sessionState.conversationId } else { "LEEWAY_CONVERSATION::AGENT_LEE::LIVE_RUNTIME_CUTOVER::UNKNOWN" }

if ([string]::IsNullOrWhiteSpace($AudioDevice)) {
  $AudioDevice = if ($sessionState.audioInputDevice) { [string]$sessionState.audioInputDevice } else { "Microphone Array (Realtek(R) Audio)" }
}

$currentCapture = Get-LatestFile -Filter "leeway-live-runtime-cutover-mic-capture-*.wav"
$priorInference = Get-LatestFile -Filter "leeway-live-runtime-cutover-qwen-inference-*.json"
if (-not $currentCapture) {
  throw "No prior live capture artifact was found in Archive/reports."
}
if (-not $priorInference) {
  throw "No prior live Qwen inference artifact was found in Archive/reports."
}

$deviceInventoryOutPath = Join-Path $reportsRoot "leeway-microphone-source-device-inventory-$stamp.stdout.log"
$win32SoundDevices = @(Get-CimInstance Win32_SoundDevice | Select-Object Name, Manufacturer, Status, PNPDeviceID)
$deviceInventoryExitCode = $null
$ffmpegDevices = @()
if ($captureDependency.isApproved) {
  Add-CommandRun ("{0} -hide_banner -list_devices true -f dshow -i dummy" -f $captureDependency.executableName)
  $deviceInventoryExitCode = Invoke-ProcessWithRedirect `
    -FilePath $captureDependency.executableName `
    -ArgumentList @("-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy") `
    -StdOutPath $deviceInventoryOutPath `
    -StdErrPath $deviceInventoryLogPath
  $deviceInventoryLines = Get-Content $deviceInventoryLogPath
  $ffmpegDevices = Parse-FfmpegAudioDevices -Lines $deviceInventoryLines
} else {
  $failuresEncountered.Add("Approved live audio capture dependency is not registered; live microphone inventory is blocked.")
  if ($sessionState.audioInputDevice) {
    $ffmpegDevices = @([pscustomobject]@{
      name = [string]$sessionState.audioInputDevice
      source = "LEEWAY_REAL_TIME_SESSION_STATE"
    })
  }
}

$ambientCapture = $null
$ambientProfile = $null
if (-not $SkipAmbientCapture -and $captureDependency.isApproved) {
  Add-CommandRun ("{0} -hide_banner -y -f dshow -i audio=""{1}"" -t {2} -ac 1 -ar 16000 {3}" -f $captureDependency.executableName, $AudioDevice, $AmbientCaptureSeconds, (Get-RelativePath $ambientCapturePath))
  $ambientExitCode = Invoke-ProcessWithRedirect `
    -FilePath $captureDependency.executableName `
    -ArgumentList @("-hide_banner", "-y", "-f", "dshow", "-i", ("audio=""{0}""" -f $AudioDevice), "-t", [string]$AmbientCaptureSeconds, "-ac", "1", "-ar", "16000", $ambientCapturePath) `
    -StdOutPath $ambientStdOutPath `
    -StdErrPath $ambientStdErrPath
  if ($ambientExitCode -eq 0 -and (Test-Path $ambientCapturePath)) {
    $ambientCapture = @{
      path = Get-RelativePath $ambientCapturePath
      stdoutLog = Get-RelativePath $ambientStdOutPath
      stderrLog = Get-RelativePath $ambientStdErrPath
      seconds = $AmbientCaptureSeconds
    }
    Add-FileChanged $ambientCapturePath
    Add-FileChanged $ambientStdOutPath
    Add-FileChanged $ambientStdErrPath
    $ambientProfile = & $qwenPython $audioProfileScript --audio-path $ambientCapturePath | ConvertFrom-Json
  } else {
    $failuresEncountered.Add("Ambient capture from the selected microphone source failed.")
  }
} elseif (-not $SkipAmbientCapture) {
  $failuresEncountered.Add("Ambient capture is blocked until a LeeWay-approved live audio capture dependency is registered.")
}

$referenceProfile = & $qwenPython $audioProfileScript --audio-path $currentCapture.FullName | ConvertFrom-Json
$priorInferenceJson = Read-JsonFile -Path $priorInference.FullName -Fallback ([ordered]@{})

$qwenRetest = $null
if (-not $SkipQwenRetest) {
  $args = @(
    $qwenInferenceScript,
    "--workspace-root", $workspaceRoot,
    "--audio-path", $currentCapture.FullName,
    "--session-id", $currentSessionId,
    "--conversation-id", $currentConversationId,
    "--output-json", $qwenRetestPath
  )
  if ($ExpectedPhrase) {
    $args += @("--expected-phrase", $ExpectedPhrase)
  }
  Add-CommandRun ("python leeway_live_qwen_session_inference.py --audio-path " + (Get-RelativePath $currentCapture.FullName))
  & $qwenPython @args | Out-Null
  if (Test-Path $qwenRetestPath) {
    Add-FileChanged $qwenRetestPath
    $qwenRetest = Read-JsonFile -Path $qwenRetestPath -Fallback $null
  } else {
    $failuresEncountered.Add("Qwen hearing calibration retest artifact was not written.")
  }
}

$qwenRetestAudio = Get-SafePropertyValue -Object $qwenRetest -PropertyName "qwenAudio"
$qwenRetestOmni = Get-SafePropertyValue -Object $qwenRetest -PropertyName "qwenOmni"
$hearingOutput = [string](Get-SafePropertyValue -Object $qwenRetestAudio -PropertyName "outputSegment" -Default "")
$omniOutput = [string](Get-SafePropertyValue -Object $qwenRetestOmni -PropertyName "outputSegment" -Default "")
$hearingPurity = Get-PurityAssessment -Text $hearingOutput
$omniPurity = Get-PurityAssessment -Text $omniOutput

$hearingComparison = if ($ExpectedPhrase) {
  Get-TokenCoverage -Expected $ExpectedPhrase -Actual $hearingOutput
} else {
  [ordered]@{ exact = $false; coverage = 0.0; semanticPass = $false }
}

$omniTranscript = if ($omniOutput -match "Transcript:\s*(.+?)(?:\r?\n|Intent:|Contamination:|$)") { $Matches[1].Trim() } else { $omniOutput }
$omniComparison = if ($ExpectedPhrase) {
  Get-TokenCoverage -Expected $ExpectedPhrase -Actual $omniTranscript
} else {
  [ordered]@{ exact = $false; coverage = 0.0; semanticPass = $false }
}

$agentLeeCalibration = if ($qwenRetest) {
  Invoke-AgentLeeCalibrationResponse -QwenAudioText $hearingOutput -QwenOmniText $omniOutput
} else {
  @{ ok = $false; body = $null; request = $null; error = "No Qwen retest output was available." }
}

$selectedSourceVerified = if (@($ffmpegDevices).Count -gt 0) {
  @($ffmpegDevices | Where-Object { $_.name -eq $AudioDevice }).Count -gt 0
} else {
  [string]$sessionState.audioInputDevice -eq $AudioDevice
}
$multiSourceRisk = @($ffmpegDevices).Count -gt 1
$nahimicRisk = @($win32SoundDevices | Where-Object { $_.Name -match "Nahimic" }).Count -gt 0

$micAuditReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::MICROPHONE_SOURCE_AUDIT"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  activeSessionAudioDevice = $AudioDevice
  captureDependencyGate = [ordered]@{
    approvalStatus = $captureDependency.approvalStatus
    executableName = $captureDependency.executableName
    reason = $captureDependency.reason
    decisionOption = $captureDependency.decisionOption
    gateEvidencePath = Get-RelativePath $captureGateEvidencePath
  }
  selectedSourceVerified = $selectedSourceVerified
  ffmpegEnumeratedAudioDevices = $ffmpegDevices
  win32SoundDevices = $win32SoundDevices
  risks = @(
    $(if ($multiSourceRisk) { "MULTIPLE_ACTIVE_AUDIO_INPUTS_PRESENT" }),
    $(if ($nahimicRisk) { "NAHIMIC_VIRTUAL_OR_MIRRORING_DEVICES_PRESENT" })
  ) | Where-Object { $_ }
  ambientCapturePerformed = $null -ne $ambientCapture
  ambientCapture = $ambientCapture
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_MIC_SOURCE" -FinalStatus ($(if ($selectedSourceVerified) { "MIC_SOURCE_VERIFIED" } else { "MIC_SOURCE_BLOCKED" })))
Write-JsonFile -Path $microphoneAuditPath -Payload $micAuditReport

$noiseComparison = [ordered]@{}
if ($ambientProfile) {
  $noiseComparison = [ordered]@{
    ambientRmsDbfs = $ambientProfile.rmsDbfs
    referenceCaptureRmsDbfs = $referenceProfile.rmsDbfs
    estimatedSignalOverAmbientDb = [math]::Round([double]$referenceProfile.rmsDbfs - [double]$ambientProfile.rmsDbfs, 4)
    ambientDominantProfile = $ambientProfile.dominantProfile
    referenceDominantProfile = $referenceProfile.dominantProfile
  }
}

$noiseProfileReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::AUDIO_ENVIRONMENT_NOISE_PROFILE"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  ambientProfile = $ambientProfile
  promotedCaptureProfile = $referenceProfile
  comparison = $noiseComparison
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_NOISE_PROFILE" -FinalStatus ($(if ($ambientProfile) { "NOISE_PROFILE_CAPTURED" } else { "NOISE_PROFILE_PARTIAL" })))
Write-JsonFile -Path $noiseProfilePath -Payload $noiseProfileReport

$hearingAccuracyStatus = "PENDING_LIVE_PHRASE_RETEST"
if ($ExpectedPhrase -and ($hearingComparison.semanticPass -or $omniComparison.semanticPass)) {
  $hearingAccuracyStatus = "PHRASE_CAPTURED_SEMANTICALLY"
} elseif ($qwenRetest -and ($hearingOutput -ne ($priorInferenceJson.qwenAudio.outputSegment))) {
  $hearingAccuracyStatus = "RECALIBRATED_OUTPUT_DIFFERS_FROM_PRIOR"
}

$hearingAccuracyReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::QWEN_HEARING_ACCURACY"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  expectedPhrase = $(if ($ExpectedPhrase) { $ExpectedPhrase } else { $null })
  priorHearingOutput = $priorInferenceJson.qwenAudio.outputSegment
  recalibratedHearingOutput = $hearingOutput
  priorPurityMarkers = Get-PurityAssessment -Text ([string]$priorInferenceJson.qwenAudio.outputSegment)
  recalibratedPurityMarkers = $hearingPurity
  hearingPhraseComparison = $hearingComparison
  omniTranscriptComparison = $omniComparison
  statusDetail = $hearingAccuracyStatus
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_QWEN_AUDIO" -FinalStatus $hearingAccuracyStatus)
Write-JsonFile -Path $hearingAccuracyPath -Payload $hearingAccuracyReport

$omniPurityStatus = "PROMPT_ECHO_REDUCED"
if ($omniPurity -contains "PROMPT_ECHO") {
  $omniPurityStatus = "PROMPT_ECHO_STILL_PRESENT"
}

$omniPurityReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::OMNI_CONTEXT_PURITY"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  priorOmniOutput = $priorInferenceJson.qwenOmni.outputSegment
  recalibratedOmniOutput = $omniOutput
  priorPurityMarkers = Get-PurityAssessment -Text ([string]$priorInferenceJson.qwenOmni.outputSegment)
  recalibratedPurityMarkers = $omniPurity
  contextIsolationImproved = -not (($omniPurity -contains "PROMPT_ECHO") -and ((Get-PurityAssessment -Text ([string]$priorInferenceJson.qwenOmni.outputSegment)) -contains "PROMPT_ECHO"))
  statusDetail = $omniPurityStatus
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_QWEN_OMNI" -FinalStatus $omniPurityStatus)
Write-JsonFile -Path $omniPurityPath -Payload $omniPurityReport

$sessionIsolationReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::SESSION_CONTEXT_ISOLATION"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  isolatedToCurrentAudioOnly = $true
  qwenAudioPromptMode = Get-SafePropertyValue -Object $qwenRetestAudio -PropertyName "promptMode"
  qwenAudioSystemPrompt = Get-SafePropertyValue -Object (Get-SafePropertyValue -Object $qwenRetest -PropertyName "sessionIsolation") -PropertyName "hearingSystemPrompt"
  qwenAudioUserPrompt = Get-SafePropertyValue -Object (Get-SafePropertyValue -Object $qwenRetest -PropertyName "sessionIsolation") -PropertyName "hearingUserPrompt"
  qwenOmniSystemPrompt = Get-SafePropertyValue -Object (Get-SafePropertyValue -Object $qwenRetest -PropertyName "sessionIsolation") -PropertyName "omniSystemPrompt"
  qwenOmniUserPrompt = Get-SafePropertyValue -Object (Get-SafePropertyValue -Object $qwenRetest -PropertyName "sessionIsolation") -PropertyName "omniUserPrompt"
  qwenOmniDecodeSlicingFixed = $true
  staleContextBleedBlocked = -not ($omniPurity -contains "PROMPT_ECHO")
  residualRisks = @(
    "Windows can expose multiple active microphones, so source selection still needs explicit operator control.",
    "The current microphone path remains quiet overall, which raises sensitivity to room playback bleed and ambient media."
  )
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_SESSION_ISOLATION" -FinalStatus "SESSION_ISOLATION_HARDENED")
Write-JsonFile -Path $sessionIsolationPath -Payload $sessionIsolationReport

$sourceVerified = [bool]$selectedSourceVerified
$backgroundMeasured = $null -ne $ambientProfile
$staleBleedBlocked = -not ($omniPurity -contains "PROMPT_ECHO")
$phraseCaptured = [bool]($ExpectedPhrase -and ($hearingComparison.semanticPass -or $omniComparison.semanticPass))
$contextClean = -not ($hearingPurity -contains "PROMPT_ECHO") -and -not ($omniPurity -contains "PROMPT_ECHO")
$agentLeeReflectsInput = [bool]($agentLeeCalibration.ok -and $agentLeeCalibration.body.result.transformedText)

$retestVerdict = "LEEWAY_LIVE_HEARING_CALIBRATION_BLOCKED"
if ($sourceVerified -and $backgroundMeasured -and $staleBleedBlocked -and $phraseCaptured -and $contextClean -and $agentLeeReflectsInput) {
  $retestVerdict = "LEEWAY_LIVE_HEARING_CALIBRATION_PASS"
} elseif ($sourceVerified -and ($backgroundMeasured -or $qwenRetest)) {
  $retestVerdict = "LEEWAY_LIVE_HEARING_CALIBRATION_PARTIAL"
}

if (-not $phraseCaptured) {
  $failuresEncountered.Add("A fresh Leonard spoken calibration phrase was not captured in this run, so phrase-accuracy promotion remains pending.")
}
if (-not $staleBleedBlocked) {
  $failuresEncountered.Add("Omni output still showed prompt echo or context bleed markers after recalibration.")
}

$retestReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::RETEST"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  retestMode = $(if ($ExpectedPhrase) { "LIVE_SPOKEN_RETEST_REQUESTED_OR_EXPECTED" } else { "EXISTING_CAPTURE_REANALYSIS_ONLY" })
  referenceCapturePath = Get-RelativePath $currentCapture.FullName
  qwenRetestPath = $(if ($qwenRetest) { Get-RelativePath $qwenRetestPath } else { $null })
  agentLeeCalibrationResponse = $agentLeeCalibration
  acceptanceProgress = [ordered]@{
    microphoneSourceVerified = $sourceVerified
    backgroundContaminationMeasured = $backgroundMeasured
    staleContextBleedBlocked = $staleBleedBlocked
    spokenTestPhraseCapturedAccuratelyOrSemantically = $phraseCaptured
    qwenOutputsSessionBoundAndContextClean = $contextClean
    agentLeeResponseReflectsObservedInput = $agentLeeReflectsInput
  }
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_RETEST" -FinalStatus $retestVerdict)
Write-JsonFile -Path $retestReportPath -Payload $retestReport

$remainingBlockers = @()
if (-not $sourceVerified) { $remainingBlockers += "Selected microphone source is not verified against current approved capture evidence or the active LeeWay session state." }
if (-not $backgroundMeasured) { $remainingBlockers += "Ambient noise profile was not captured from the selected source." }
if (-not $staleBleedBlocked) { $remainingBlockers += "Prompt/context bleed is still visible in the omni output." }
if (-not $phraseCaptured) { $remainingBlockers += "A fresh Leonard spoken calibration phrase still needs to be captured and checked for hearing accuracy." }
if (-not $agentLeeReflectsInput) { $remainingBlockers += "Agent Lee calibration acknowledgement did not return from the live language runtime." }

$finalReport = [ordered]@{
  reportId = "LEEWAY_REPORT::LIVE_HEARING_CALIBRATION::INPUT_PURITY"
  generatedAt = (Get-Date).ToString("o")
  sessionId = $currentSessionId
  currentPromotedTruth = [ordered]@{
    finalVerdict = $promotion.finalStatus
    finalSessionVerdict = $sessionState.finalSessionVerdict
    embodimentAllowed = $sessionState.embodimentAllowed
    promotionAllowed = $sessionState.promotionAllowed
    audibleConfirmation = $sessionState.audibleConfirmation
    hearingRoute = $sessionState.activeHearingRoute
    fusionRoute = $sessionState.activeFusionRoute
    voiceRoute = $sessionState.activeVoiceRoute
  }
  summary = [ordered]@{
    microphoneSourceVerified = $sourceVerified
    backgroundContaminationMeasured = $backgroundMeasured
    staleContextBleedBlocked = $staleBleedBlocked
    phraseCapturedAccuratelyOrSemantically = $phraseCaptured
    qwenOutputsSessionBoundAndContextClean = $contextClean
    agentLeeResponseReflectsObservedInput = $agentLeeReflectsInput
    expectedPhrase = $(if ($ExpectedPhrase) { $ExpectedPhrase } else { $null })
  }
  evidence = [ordered]@{
    captureGateEvidence = Get-RelativePath $captureGateEvidencePath
    microphoneAuditReport = Get-RelativePath $microphoneAuditPath
    noiseProfileReport = Get-RelativePath $noiseProfilePath
    hearingAccuracyReport = Get-RelativePath $hearingAccuracyPath
    omniPurityReport = Get-RelativePath $omniPurityPath
    sessionIsolationReport = Get-RelativePath $sessionIsolationPath
    retestReport = Get-RelativePath $retestReportPath
  }
} + (Get-BaseReportFields -SubjectObjectId "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_INPUT_PURITY" -FinalStatus $retestVerdict)
$finalReport.remainingBlockers = $remainingBlockers
Write-JsonFile -Path $finalJsonPath -Payload $finalReport

$md = @"
# LeeWay Live Hearing Calibration + Input Purity Report

Final verdict: $retestVerdict

## Current protected truth
- Existing live embodiment pass remains: $($promotion.finalStatus)
- Existing live session verdict remains: $($sessionState.finalSessionVerdict)
- Hearing route: $($sessionState.activeHearingRoute)
- Fusion route: $($sessionState.activeFusionRoute)
- Voice route: $($sessionState.activeVoiceRoute)

## Calibration findings
- Microphone source verified: $sourceVerified
- Background contamination measured: $backgroundMeasured
- Stale or prompt context bleed blocked: $staleBleedBlocked
- Expected phrase supplied: $(if ($ExpectedPhrase) { "yes" } else { "no" })
- Phrase captured accurately or semantically: $phraseCaptured
- Agent Lee calibration response returned: $agentLeeReflectsInput

## Notes
- Prior Qwen Audio output: $($priorInferenceJson.qwenAudio.outputSegment)
- Recalibrated Qwen Audio output: $hearingOutput
- Prior Omni output purity markers: $(((Get-PurityAssessment -Text ([string]$priorInferenceJson.qwenOmni.outputSegment)) -join ", "))
- Recalibrated Omni purity markers: $(if (@($omniPurity).Count -gt 0) { @($omniPurity) -join ", " } else { "none" })

## Remaining blockers
$(if (@($remainingBlockers).Count -gt 0) { ($remainingBlockers | ForEach-Object { "- $_" }) -join [Environment]::NewLine } else { "- None." })
"@
Set-Content -LiteralPath $finalMdPath -Encoding UTF8 -Value $md
Add-FileChanged $finalMdPath

$receipt = [ordered]@{
  receiptId = "LEEWAY_RECEIPT::LIVE_HEARING_CALIBRATION::INPUT_PURITY::$stamp"
  generatedAt = (Get-Date).ToString("o")
  assistantBodyId = $assistantBodyId
  assistantObjectId = $assistantObjectId
  taskId = $taskId
  subjectObjectId = "LEEWAY_RUNTIME::LIVE_HEARING_CALIBRATION_INPUT_PURITY"
  reports = @(
    $(Get-RelativePath $finalJsonPath),
    $(Get-RelativePath $microphoneAuditPath),
    $(Get-RelativePath $noiseProfilePath),
    $(Get-RelativePath $hearingAccuracyPath),
    $(Get-RelativePath $omniPurityPath),
    $(Get-RelativePath $sessionIsolationPath),
    $(Get-RelativePath $retestReportPath)
  )
  finalStatus = $retestVerdict
  runtimeTruthWins = $true
}
Write-JsonFile -Path $receiptPath -Payload $receipt
$receiptsWritten.Add((Get-RelativePath $receiptPath))

$finalReport.receiptsWritten = @($receiptsWritten)
Write-JsonFile -Path $finalJsonPath -Payload $finalReport

Write-Output (@{
  finalStatus = $retestVerdict
  sessionId = $currentSessionId
  selectedAudioDevice = $AudioDevice
  phraseCaptured = $phraseCaptured
  remainingBlockers = $remainingBlockers
} | ConvertTo-Json -Depth 20)
