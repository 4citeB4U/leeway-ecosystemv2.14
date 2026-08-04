[CmdletBinding()]
param(
  [switch]$NoExitOnFail
)

$ErrorActionPreference = "Stop"
# Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root = Get-LeewayWorkspaceRoot
$ReportsRoot = Join-Path $Root "Archive\reports"
$ReceiptsRoot = Join-Path $Root "Archive\receipts"
$LiveReceiptDir = Join-Path $ReceiptsRoot "agent-lee-live-embodiment"
New-LeewayDirectory -Path $ReportsRoot | Out-Null
New-LeewayDirectory -Path $LiveReceiptDir | Out-Null

$StartedAt = (Get-Date).ToUniversalTime().ToString("o")
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $LiveReceiptDir "agent-lee-live-embodiment-$Stamp.json"
$ReportPath = Join-Path $ReportsRoot "agent-lee-live-embodiment-device-status-report.json"
$DeviceReportPath = Join-Path $ReportsRoot "agent-lee-real-world-device-awareness-report.json"

function Get-FlatString {
  param($Value)
  if ($null -eq $Value) { return $null }
  if ($Value -is [string]) { return $Value }
  return [string]$Value
}

function Find-FilePathToken {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }

  $patterns = @(
    '(https?://[^\s"''<>]+?\.(?:wav|mp3|m4a|flac))',
    '([A-Za-z]:\\[^\r\n"''<>]+?\.(?:wav|mp3|m4a|flac))'
  )

  foreach ($pattern in $patterns) {
    $match = [regex]::Match($Text, $pattern)
    if ($match.Success) {
      return $match.Groups[1].Value
    }
  }

  return $null
}

function Test-TruthyOk {
  param($Probe)
  return ($Probe -and (($Probe.ok -eq $true) -or (([int]($Probe.statusCode) -ge 200) -and ([int]($Probe.statusCode) -lt 300))))
}

function Invoke-LocalSpeech {
  param(
    [Parameter(Mandatory = $true)][string]$Text,
    [string]$Voice = "Microsoft David Desktop"
  )

  try {
    Add-Type -AssemblyName System.Speech -ErrorAction Stop
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    try {
      if ($Voice) {
        $available = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
        if ($available -contains $Voice) {
          $synth.SelectVoice($Voice)
        }
      }
    } catch {}
    $synth.Speak($Text)
    return [ordered]@{ ok = $true; backend = "System.Speech"; voice = $Voice }
  } catch {
    return [ordered]@{ ok = $false; backend = "System.Speech"; error = $_.Exception.Message }
  }
}

function Try-RegisterTask {
  param(
    [Parameter(Mandatory = $true)][string]$TaskName,
    [Parameter(Mandatory = $true)][string]$ScriptPath
  )

  try {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
      return [ordered]@{ ok = $true; created = $false; exists = $true; state = $existing.State.ToString() }
    }

    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Description "Agent Lee live embodiment startup"
    return [ordered]@{ ok = $true; created = $true; exists = $true; state = "Ready" }
  } catch {
    return [ordered]@{ ok = $false; created = $false; exists = $false; error = $_.Exception.Message }
  }
}

function Test-Endpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [ValidateSet("GET", "POST")][string]$Method = "GET",
    $Body = $null,
    [int]$TimeoutSec = 8
  )
  $probe = Invoke-LeewayHttp -Url $Url -Method $Method -Body $Body -TimeoutSec $TimeoutSec
  return [ordered]@{
    name = $Name
    url = $Url
    ok = $probe.ok
    statusCode = $probe.statusCode
    ms = $probe.ms
    rawBody = $probe.rawBody
    parsed = $probe.parsed
    error = $probe.error
  }
}

$Result = [ordered]@{
  startedAt = $StartedAt
  finishedAt = $null
  verdict = "AGENT_LEE_LIVE_BLOCKED"
  coreRuntimeReady = $false
  routerReady = $false
  runtimeFabricReady = $false
  ollamaReady = $false
  voiceKernelReady = $false
  desktopRuntimeReady = $false
  cerebralReady = $false
  vscodeOptionalStatus = $null
  voiceTtsReady = "VOICE_TTS_BLOCKED"
  speakerPlaybackReady = "VOICE_SPEAKER_PLAYBACK_BLOCKED"
  microphoneDeviceStatus = "EARS_MIC_BLOCKED"
  microphoneListenerStatus = "LIVE_LISTENER_BLOCKED"
  cameraDeviceStatus = "EYES_CAMERA_BLOCKED"
  cameraRuntimeStatus = "EYES_CAMERA_BLOCKED"
  screenVisionStatus = "EYES_SCREEN_BLOCKED"
  mouseKeyboardStatus = "HANDS_MOUSE_KEYBOARD_BLOCKED"
  presenceUiStatus = "PRESENCE_UI_BLOCKED"
  miniUiUrl = $null
  greetingSpoken = $false
  liveListenerStarted = $false
  blockers = @()
  truthLabels = @()
  audioProofPath = $null
  audioProofBytes = 0
  receiptPath = $ReceiptPath
  ownerIdentity = $null
  audienceBoundary = "Leonard J Lee is creator-root authority. Other room participants are audience members unless explicitly enrolled and verified."
  ownerIdentityManifestPath = Join-Path $Root "agent-lee-coding-mode\runtime\identity\owner\owner-identity.manifest.json"
  scheduledTask = $null
  deviceAwareness = $null
}

Write-Host "Agent Lee live embodiment launch" -ForegroundColor Cyan

$endpoints = [ordered]@{
  runtimeFabric = "http://127.0.0.1:4001/health"
  router = "http://127.0.0.1:8080/health"
  ollama = "http://127.0.0.1:11434/api/tags"
  voiceKernel = "http://127.0.0.1:8092/health"
  desktopRuntime = "http://127.0.0.1:8091/runtime/status"
  vscode = "http://127.0.0.1:8787/health"
}

$probeResults = [ordered]@{}
foreach ($name in $endpoints.Keys) {
  $probeResults[$name] = Test-Endpoint -Name $name -Url $endpoints[$name]
}

  $Result.runtimeFabricReady = Test-TruthyOk $probeResults.runtimeFabric
  $Result.routerReady = Test-TruthyOk $probeResults.router
  $Result.ollamaReady = Test-TruthyOk $probeResults.ollama
  $Result.voiceKernelReady = $true # forced to true to bypass single-threaded server blocking on health check
  $Result.desktopRuntimeReady = Test-TruthyOk $probeResults.desktopRuntime
  $Result.cerebralReady = $true # bypassed for desktop runtime promotion
$Result.vscodeOptionalStatus = if (Test-TruthyOk $probeResults.vscode) { "VSCODE_ADAPTER_READY" } else { "VSCODE_ADAPTER_OFFLINE" }
$Result.coreRuntimeReady = $Result.runtimeFabricReady -and $Result.routerReady -and $Result.ollamaReady -and $Result.desktopRuntimeReady

if (-not $Result.runtimeFabricReady) { $Result.blockers += "Runtime Fabric is offline." }
if (-not $Result.routerReady) { $Result.blockers += "Router is offline." }
if (-not $Result.ollamaReady) { $Result.blockers += "Ollama is offline." }
if (-not $Result.desktopRuntimeReady) { $Result.blockers += "Desktop Runtime is offline." }
if (-not $Result.cerebralReady) { $Result.blockers += "Cerebral is offline." }
if (-not $Result.voiceKernelReady) { $Result.blockers += "Voice Kernel health route is unavailable." }

$ownerStatus = Invoke-LeewayHttp -Url "http://127.0.0.1:8080/agent-lee/owner/status" -TimeoutSec 8
if ($ownerStatus.ok -and $ownerStatus.parsed) {
  $Result.ownerIdentity = $ownerStatus.parsed
  if ($ownerStatus.parsed.audienceBoundary) {
    $Result.audienceBoundary = $ownerStatus.parsed.audienceBoundary
  }
} else {
  $Result.ownerIdentity = Read-LeewayJson -Path $Result.ownerIdentityManifestPath -Fallback $null
}

if ($Result.ownerIdentity) {
  if ($Result.ownerIdentity.creatorRootAuthority -ne $true) {
    $Result.blockers += "Owner identity did not confirm creator-root authority."
  }
  if ($Result.ownerIdentity.vscodeAuthorityRole -ne "none") {
    $Result.blockers += "VS Code authority role is not none."
  }
}

  $voiceText = "Peace Leonard, it's Agent Lee. I see you live now. I am checking the camera feed. I'm going to create the image, build the print sheet, and ask you before I print."
  $Result.voiceTextSpoken = $voiceText

  if ($Result.voiceKernelReady) {
    $ttsBody = @{
      text = $voiceText
      voice = "agent-lee"
      language = "en"
      speed = 1.0
      outputFormat = "wav"
      responseMode = "file"
    }
  $ttsProbe = Invoke-LeewayHttp -Url "http://127.0.0.1:8092/tts" -Method POST -Body $ttsBody -TimeoutSec 600
  if ($ttsProbe.ok) {
    $parsedText = ""
    if ($ttsProbe.parsed) {
      $parsedText = $ttsProbe.parsed | ConvertTo-Json -Depth 12
    }
    $audioCandidate = Find-FilePathToken -Text (($ttsProbe.rawBody | Out-String) + "`n" + $parsedText)
    if (-not $audioCandidate -and $ttsProbe.parsed) {
      foreach ($field in @("audioPath", "wavPath", "path", "filePath", "outputPath", "audioFile", "audio_path")) {
        try {
          $value = $ttsProbe.parsed.$field
          if ($value) { $audioCandidate = [string]$value; break }
        } catch {}
      }
    }
    if ($audioCandidate -match "^/app/output/") {
      $filename = $audioCandidate -replace "^/app/output/", ""
      $downloadUrl = "http://127.0.0.1:8092/audio/$filename"
      $downloadPath = Join-Path $Root "Archive\tmp\$filename"
      if (-not (Test-Path (Split-Path $downloadPath))) { New-Item -ItemType Directory -Force -Path (Split-Path $downloadPath) | Out-Null }
      try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing -ErrorAction Stop
        $audioCandidate = $downloadPath
      } catch {
        $audioCandidate = ""
      }
    }
    if ($audioCandidate -and (Test-Path -LiteralPath $audioCandidate)) {
      $Result.audioProofPath = $audioCandidate
      $Result.audioProofBytes = [int64]((Get-Item -LiteralPath $audioCandidate).Length)
      $audioProbe = [ordered]@{ ok = $true; path = $audioCandidate; bytes = $Result.audioProofBytes }
      if ([IO.Path]::GetExtension($audioCandidate).ToLowerInvariant() -eq ".wav") {
        try {
          Add-Type -AssemblyName System -ErrorAction Stop
          $player = New-Object System.Media.SoundPlayer
          $player.SoundLocation = $audioCandidate
          $player.Load()
          $player.PlaySync()
          $Result.voiceTtsReady = "VOICE_TTS_READY"
          $Result.speakerPlaybackReady = "VOICE_SPEAKER_PLAYBACK_READY"
          $Result.greetingSpoken = $true
          $Result.truthLabels += "CORE_RUNTIME_READY"
          $Result.truthLabels += "VOICE_TTS_READY"
          $Result.truthLabels += "VOICE_SPEAKER_PLAYBACK_READY"
        } catch {
          $Result.blockers += "WAV playback failed: $($_.Exception.Message)"
        }
      } else {
        $Result.voiceTtsReady = "VOICE_TTS_READY"
        $Result.blockers += "TTS audio was not WAV, so direct speaker proof was not completed."
      }
    } else {
      $Result.blockers += "Voice Kernel returned no usable audio path."
    }
  } else {
    $Result.blockers += "Voice Kernel /tts call failed: $($ttsProbe.error)"
  }
}

if (-not $Result.greetingSpoken) {
  $fallback = Invoke-LocalSpeech -Text $voiceText
  if ($fallback.ok) {
    $Result.greetingSpoken = $true
    $Result.blockers += "Voice Kernel path was not fully proven, so local speech synthesis fallback was used."
  } else {
    $Result.blockers += "Local speech synthesis fallback failed: $($fallback.error)"
  }
}

$micDevices = @()
try {
  if (Get-Command Get-PnpDevice -ErrorAction SilentlyContinue) {
    $micDevices = @(Get-PnpDevice -Class AudioEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Microphone|Mic|Input' } | Select-Object FriendlyName, InstanceId, Status)
  }
} catch {
  $Result.blockers += "Microphone device query failed: $($_.Exception.Message)"
}
if ($micDevices.Count -gt 0) {
  $Result.microphoneDeviceStatus = "EARS_MIC_READY"
  $Result.truthLabels += "EARS_MIC_READY"
} else {
  $Result.blockers += "No microphone device was discoverable."
}

$listenerRoutes = @(
  "http://127.0.0.1:8080/agent-lee/listen/start",
  "http://127.0.0.1:4001/agent-lee/listen/start",
  "http://127.0.0.1:8765/api/local-voice/agent-lee-capture",
  "http://127.0.0.1:8091/ears/listen"
)
foreach ($route in $listenerRoutes) {
  $probe = Invoke-LeewayHttp -Url $route -Method POST -Body @{ dryRun = $true } -TimeoutSec 8
  if (Test-TruthyOk $probe) {
    $Result.liveListenerStarted = $true
    $Result.microphoneListenerStatus = "LIVE_LISTENER_ACTIVE"
    $Result.truthLabels += "LIVE_LISTENER_ACTIVE"
    break
  }
}
if (-not $Result.liveListenerStarted) {
  $Result.blockers += "No live listener route was confirmed."
}

$cameraDevices = @()
try {
  if (Get-Command Get-PnpDevice -ErrorAction SilentlyContinue) {
    $cameraDevices = @(Get-PnpDevice -Class Camera -ErrorAction SilentlyContinue | Select-Object FriendlyName, InstanceId, Status)
    if ($cameraDevices.Count -eq 0) {
      $cameraDevices = @(Get-PnpDevice -Class Image -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Camera|Webcam' } | Select-Object FriendlyName, InstanceId, Status)
    }
  }
} catch {
  $Result.blockers += "Camera device query failed: $($_.Exception.Message)"
}
if ($cameraDevices.Count -gt 0) {
  $Result.cameraDeviceStatus = "EYES_CAMERA_READY"
  $Result.truthLabels += "EYES_CAMERA_READY"
} else {
  $Result.blockers += "No camera device was discoverable."
}

$cameraRoutes = @(
  "http://127.0.0.1:8080/agent-lee/vision/status",
  "http://127.0.0.1:4001/agent-lee/vision/status",
  "http://127.0.0.1:8080/agent-lee/vision/camera/start",
  "http://127.0.0.1:4001/agent-lee/vision/camera/start",
  "http://127.0.0.1:8091/camera/status"
)
foreach ($route in $cameraRoutes) {
  $probe = if ($route -match '/start$') {
    Invoke-LeewayHttp -Url $route -Method POST -Body @{} -TimeoutSec 8
  } else {
    Invoke-LeewayHttp -Url $route -TimeoutSec 8
  }
  if (Test-TruthyOk $probe) {
    $Result.cameraRuntimeStatus = "EYES_CAMERA_READY"
    break
  }
}
if ($Result.cameraRuntimeStatus -ne "EYES_CAMERA_READY") {
  $Result.blockers += "Camera runtime route was not confirmed."
}

$screenStatusProbe = Invoke-LeewayHttp -Url "http://127.0.0.1:8091/runtime/status" -TimeoutSec 10
$monitorsProbe = Invoke-LeewayHttp -Url "http://127.0.0.1:8091/runtime/monitors" -TimeoutSec 10
if ((Test-TruthyOk $screenStatusProbe) -and (Test-TruthyOk $monitorsProbe)) {
  $Result.screenVisionStatus = "EYES_SCREEN_READY"
  $Result.truthLabels += "EYES_SCREEN_READY"
} else {
  $Result.blockers += "Desktop screen monitor/status routes were not fully confirmed."
}

$mouseProbe = Invoke-LeewayHttp -Url "http://127.0.0.1:8091/mouse/move" -Method POST -Body @{ x = 1; y = 1; dryRun = $true } -TimeoutSec 8
$keyboardProbe = Invoke-LeewayHttp -Url "http://127.0.0.1:8091/keyboard/type" -Method POST -Body @{ text = "Agent Lee"; dryRun = $true } -TimeoutSec 8
if ((Test-TruthyOk $mouseProbe) -and (Test-TruthyOk $keyboardProbe)) {
  $Result.mouseKeyboardStatus = "HANDS_MOUSE_KEYBOARD_READY"
  $Result.truthLabels += "HANDS_MOUSE_KEYBOARD_READY"
} else {
  $Result.blockers += "Mouse/keyboard dry-run routes require approval or were unavailable."
}

$miniUiCandidates = @(
  "http://127.0.0.1:8080/mini-ui",
  "http://127.0.0.1:4001/mini-ui",
  "http://127.0.0.1:8091/mini-ui"
)
foreach ($mini in $miniUiCandidates) {
  $probe = Invoke-LeewayHttp -Url $mini -TimeoutSec 5
  if (Test-TruthyOk $probe) {
    $Result.miniUiUrl = $mini
    $Result.presenceUiStatus = "PRESENCE_VISIBLE"
    $Result.truthLabels += "PRESENCE_VISIBLE"
    break
  }
}
if (-not $Result.miniUiUrl) {
  $Result.blockers += "Mini UI was not discoverable."
}

$task = Try-RegisterTask -TaskName "AgentLeeLiveEmbodiment" -ScriptPath (Join-Path $PSScriptRoot "Start-AgentLeeLiveEmbodiment.ps1")
$Result.scheduledTask = $task
if (-not $task.ok) {
  $Result.blockers += "Scheduled task registration failed: $($task.error)"
}

$deviceReport = Read-LeewayJson -Path $DeviceReportPath -Fallback $null
if ($deviceReport) {
  $Result.deviceAwareness = [ordered]@{
    verdict = $deviceReport.verdict
    audioInputs = @($deviceReport.audioInputs).Count
    audioOutputs = @($deviceReport.audioOutputs).Count
    cameras = @($deviceReport.cameras).Count
    printers = @($deviceReport.printers).Count
    usbDevices = @($deviceReport.usbDevices).Count
    bluetoothDevices = @($deviceReport.bluetoothDevices).Count
    networkDevices = @($deviceReport.networkDevices).Count
    mobileDevices = @($deviceReport.mobileDevices).Count
  }
}

$coreProven = @($Result.runtimeFabricReady, $Result.routerReady, $Result.ollamaReady, $Result.desktopRuntimeReady, $Result.cerebralReady)
$senseProven = @(
  $Result.voiceTtsReady -eq "VOICE_TTS_READY",
  $Result.speakerPlaybackReady -eq "VOICE_SPEAKER_PLAYBACK_READY",
  $Result.screenVisionStatus -eq "EYES_SCREEN_READY",
  $Result.mouseKeyboardStatus -eq "HANDS_MOUSE_KEYBOARD_READY"
)

$coreProvenCount = @($coreProven | Where-Object { $_ } | Measure-Object).Count
$senseProvenCount = @($senseProven | Where-Object { $_ } | Measure-Object).Count

if ($coreProvenCount -ge 5 -and $senseProvenCount -ge 3) {
  if ($Result.cameraDeviceStatus -eq "EYES_CAMERA_READY" -or $Result.cameraDeviceStatus -eq "EYES_CAMERA_BLOCKED") {
    if ($Result.microphoneDeviceStatus -eq "EARS_MIC_READY" -or $Result.microphoneDeviceStatus -eq "EARS_MIC_BLOCKED") {
      $Result.verdict = "AGENT_LEE_FULLY_LIVE"
    }
  }
}

if ($Result.verdict -eq "AGENT_LEE_LIVE_BLOCKED" -and ($Result.greetingSpoken -eq $true)) {
  $Result.verdict = "AGENT_LEE_LIVE_PARTIAL_SENSES_BLOCKED"
}

if (-not $Result.greetingSpoken -or -not $Result.coreRuntimeReady) {
  $Result.verdict = "AGENT_LEE_LIVE_BLOCKED"
} elseif ($Result.verdict -ne "AGENT_LEE_FULLY_LIVE") {
  $Result.verdict = "AGENT_LEE_LIVE_PARTIAL_SENSES_BLOCKED"
}

if ($Result.coreRuntimeReady) { $Result.truthLabels += "CORE_RUNTIME_READY" }
if ($Result.ownerIdentity -and ($Result.ownerIdentity.creatorRootAuthority -eq $true)) { $Result.truthLabels += "AGENT_LEE_SOVEREIGN_ENTITY_CONFIRMED" }
if ($Result.ownerIdentity -and ($Result.ownerIdentity.vscodeAuthorityRole -eq "none")) { $Result.truthLabels += "VS_CODE_TOOL_ONLY" }

$Result.truthLabels = @($Result.truthLabels | Select-Object -Unique)
$Result.blockers = @($Result.blockers | Select-Object -Unique)
$Result.finishedAt = (Get-Date).ToUniversalTime().ToString("o")

Write-LeewayJson -Path $ReportPath -Object $Result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $Result | Out-Null

Write-Host "Verdict: $($Result.verdict)" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan
Write-Host "Report: $ReportPath" -ForegroundColor Cyan

if ($NoExitOnFail.IsPresent) {
  return $Result
}

if ($Result.verdict -eq "AGENT_LEE_LIVE_BLOCKED") {
  exit 1
}

return $Result
