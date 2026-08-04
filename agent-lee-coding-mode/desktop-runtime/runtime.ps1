param(
  [Parameter(Mandatory=$true)]
  [string]$Action,

  [Parameter(Mandatory=$true)]
  [string]$JsonPath
)

$ErrorActionPreference = "Stop"

$RuntimeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DefaultRunsRoot = Join-Path $RuntimeRoot "runs"
$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $RuntimeRoot)
$StateDir = $RuntimeRoot
$StatePath = Join-Path $StateDir "agent-lee-desktop-runtime-state.json"
$ReceiptDir = Join-Path $WorkspaceRoot "Archive\receipts\agent-lee-desktop-runtime"
$OwnerIdentityPath = Join-Path $WorkspaceRoot "agent-lee-coding-mode\runtime\identity\owner\owner-identity.manifest.json"
$VoiceKernelUrl = if ($env:AGENT_LEE_VOICE_KERNEL_URL -and $env:AGENT_LEE_VOICE_KERNEL_URL.Trim() -ne "") {
  $env:AGENT_LEE_VOICE_KERNEL_URL.Trim()
} else {
  "http://127.0.0.1:8092"
}

# If a Seafile-synced path is provided via environment, prefer storing run artifacts there.
# This allows desktop runtime outputs (audio, screenshots, receipts) to be synced to leeway-seafile.
$SeafileSync = $env:SEAFILE_SYNC_PATH
if ($SeafileSync -and ($SeafileSync.Trim() -ne "")) {
  try {
    $SeafileRunsRoot = Join-Path $SeafileSync "agent-lee-runs"
    New-Item -ItemType Directory -Force -Path $SeafileRunsRoot | Out-Null
    $RunsRoot = $SeafileRunsRoot
  }
  catch {
    # If creating the Seafile path fails for any reason, fall back to local runs directory.
    $RunsRoot = $DefaultRunsRoot
  }
}
else {
  $RunsRoot = $DefaultRunsRoot
}

$LogsRoot = Join-Path $RuntimeRoot "logs"

New-Item -ItemType Directory -Force -Path $RunsRoot,$LogsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $StateDir,$ReceiptDir | Out-Null

$Request = @{}
if (Test-Path -LiteralPath $JsonPath) {
  $raw = Get-Content -LiteralPath $JsonPath -Raw
  if ($raw.Trim()) {
    $Request = $raw | ConvertFrom-Json
  }
}

function Out-Json {
  param([object]$Object)
  $Object | ConvertTo-Json -Depth 30 -Compress
}

function Write-JsonFile {
  param(
    [string]$Path,
    [object]$Data
  )

  $directory = Split-Path -Parent $Path
  if ($directory -and -not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $json = $Data | ConvertTo-Json -Depth 30
  Set-Content -Path $Path -Value $json -Encoding UTF8
}

function New-RunRoot {
  param([string]$Name)
  $path = Join-Path $RunsRoot ($Name + "-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  New-Item -ItemType Directory -Force -Path $path | Out-Null
  return $path
}

function Write-Step {
  param(
    [string]$RunRoot,
    [string]$Message
  )

  $line = "$(Get-Date -Format 'HH:mm:ss')  $Message"
  $line | Out-File -FilePath (Join-Path $RunRoot "runtime-step-log.txt") -Append -Encoding UTF8
}

function Get-OwnerIdentity {
  $fallback = [ordered]@{
    ownerId = "LEONARD_J_LEE"
    ownerName = "Leonard J Lee"
    creatorRootAuthority = $true
    vscodeAuthorityRole = "none"
    audienceBoundary = "Leonard J Lee is creator-root authority. Other room participants are audience members unless explicitly enrolled and verified."
    sourcePath = $OwnerIdentityPath
  }

  if (-not (Test-Path -LiteralPath $OwnerIdentityPath)) {
    return $fallback
  }

  try {
    $manifest = Get-Content -LiteralPath $OwnerIdentityPath -Raw | ConvertFrom-Json
    return [ordered]@{
      ownerId = if ($manifest.ownerId) { [string]$manifest.ownerId } else { $fallback.ownerId }
      ownerName = if ($manifest.ownerName) { [string]$manifest.ownerName } else { $fallback.ownerName }
      creatorRootAuthority = if ($null -ne $manifest.creatorRootAuthority) { [bool]$manifest.creatorRootAuthority } else { $fallback.creatorRootAuthority }
      vscodeAuthorityRole = if ($manifest.vscodeAuthorityRole) { [string]$manifest.vscodeAuthorityRole } else { $fallback.vscodeAuthorityRole }
      audienceBoundary = if ($manifest.audienceBoundary) { [string]$manifest.audienceBoundary } else { $fallback.audienceBoundary }
      sourcePath = $OwnerIdentityPath
    }
  } catch {
    return $fallback
  }
}

function Get-DesktopRuntimeStatus {
  $ownerIdentity = Get-OwnerIdentity
  $existingState = $null
  if (Test-Path -LiteralPath $StatePath) {
    try {
      $existingState = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    } catch {
      $existingState = $null
    }
  }
  $pointerState = if ($existingState -and $existingState.pointerState) {
    $existingState.pointerState
  } else {
    [ordered]@{
      status = "CHECK_REQUIRED"
      message = "Pointer event hook is not yet active."
      lastEvent = $null
      updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    }
  }
  $state = [ordered]@{
    ok = $true
    tool = "runtime.desktop.status"
    hostId = "agent-lee-desktop-runtime-host"
    hostName = "Agent Lee Desktop Runtime Host"
    hostStatus = "READY"
    runtimeRoot = $RuntimeRoot
    workspaceRoot = $WorkspaceRoot
    statePath = $StatePath
    receiptDir = $ReceiptDir
    pointerState = $pointerState
    routes = @(
      "GET /runtime/status",
      "GET /runtime/health",
      "GET /runtime/voice/status",
      "POST /runtime/voice/listen",
      "POST /runtime/voice/conversation/once",
      "POST /runtime/voice/speak",
      "POST /runtime/speak",
      "GET /runtime/vision/camera/status",
      "POST /runtime/vision/camera/open",
      "POST /runtime/vision/camera/snapshot",
      "POST /runtime/vision/camera/analyze-snapshot",
      "POST /runtime/vision/camera/stop",
      "POST /runtime/vision/camera/look-now",
      "POST /runtime/desktop/move-cursor",
      "POST /runtime/desktop/click",
      "POST /runtime/desktop/open-app",
      "POST /runtime/desktop/type-text",
      "POST /runtime/desktop/open-browser",
      "POST /runtime/desktop/search-web",
      "POST /runtime/desktop/scroll",
      "POST /runtime/desktop/capture-screen",
      "POST /runtime/desktop/print",
      "POST /runtime/pointer/event",
      "POST /runtime/telegram/send",
      "POST /runtime/receipt/write"
    )
    ownerIdentity = $ownerIdentity
    truthLabels = @("DESKTOP_RUNTIME_HOST_READY", "NO_FAKE_PASS")
    blockers = @()
    updatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  }

  if ($pointerState -and $pointerState.status -eq "READY") {
    $state.truthLabels += "POINTER_EVENT_READY"
  }

  Write-JsonFile -Path $StatePath -Data $state
  return $state
}

# Upload a local file to an optional Seafile endpoint.
# Config via environment variables:
#  - SEAFILE_API_URL : full upload endpoint (required to enable uploads)
#  - SEAFILE_TOKEN or SEAFILE_API_TOKEN : auth token (optional)
#  - SEAFILE_API_TOKEN_TYPE : 'Token' (default) or 'Bearer'
#  - SEAFILE_REPO_ID : repo identifier (optional, will be included as form field)
#  - SEAFILE_PATH : remote path (optional, will be included as form field)
function Send-ToSeafile {
  param(
    [string]$LocalPath,
    [string]$RemotePath = "",
    [string]$RunRoot = ""
  )

  if (-not $env:SEAFILE_API_URL -or $env:SEAFILE_API_URL.Trim() -eq "") {
    return [ordered]@{ ok = $false; reason = "SEAFILE_API_URL not configured" }
  }

  if (-not (Test-Path -LiteralPath $LocalPath)) {
    return [ordered]@{ ok = $false; reason = "Local file missing" }
  }

  try {
    $uri = $env:SEAFILE_API_URL
    $token = $env:SEAFILE_TOKEN
    if (-not $token) { $token = $env:SEAFILE_API_TOKEN }
    $tokenType = if ($env:SEAFILE_API_TOKEN_TYPE) { $env:SEAFILE_API_TOKEN_TYPE } else { "Token" }

    if ($RunRoot) { Write-Step $RunRoot ("Seafile: uploading $LocalPath -> $uri") }

    $client = New-Object System.Net.Http.HttpClient
    if ($token -and $token.Trim() -ne "") {
      $client.DefaultRequestHeaders.Add("Authorization", "$tokenType $token")
    }

    $multipart = New-Object System.Net.Http.MultipartFormDataContent
    if ($env:SEAFILE_REPO_ID) {
      $multipart.Add((New-Object System.Net.Http.StringContent($env:SEAFILE_REPO_ID)), "repo_id")
    }
    if ($RemotePath -and $RemotePath.Trim() -ne "") {
      $multipart.Add((New-Object System.Net.Http.StringContent($RemotePath)), "path")
    }
    elseif ($env:SEAFILE_PATH) {
      $multipart.Add((New-Object System.Net.Http.StringContent($env:SEAFILE_PATH)), "path")
    }

    $fileStream = [System.IO.File]::OpenRead($LocalPath)
    $streamContent = New-Object System.Net.Http.StreamContent($fileStream)
    $streamContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/octet-stream")
    $fileName = [System.IO.Path]::GetFileName($LocalPath)
    $multipart.Add($streamContent, "file", $fileName)

    $task = $client.PostAsync($uri, $multipart)
    $task.Wait()
    $resp = $task.Result
    $contentTask = $resp.Content.ReadAsStringAsync()
    $contentTask.Wait()
    $body = $contentTask.Result
    $status = [int]$resp.StatusCode

    if ($fileStream) { $fileStream.Dispose() }

    if ($RunRoot) { Write-Step $RunRoot ("Seafile upload finished: status=" + $status) }

    return [ordered]@{ ok = $resp.IsSuccessStatusCode; status = $status; body = $body; uri = $uri }
  }
  catch {
    if ($RunRoot) { Write-Step $RunRoot ("Seafile upload failed: " + $_.Exception.Message) }
    return [ordered]@{ ok = $false; error = $_.Exception.Message }
  }
}

function Get-Monitors {
  Add-Type -AssemblyName System.Windows.Forms

  $screens = [System.Windows.Forms.Screen]::AllScreens
  $items = @()

  for ($i = 0; $i -lt $screens.Count; $i++) {
    $s = $screens[$i]
    $items += [ordered]@{
      index = $i
      primary = $s.Primary
      deviceName = $s.DeviceName
      x = $s.Bounds.X
      y = $s.Bounds.Y
      width = $s.Bounds.Width
      height = $s.Bounds.Height
      workingX = $s.WorkingArea.X
      workingY = $s.WorkingArea.Y
      workingWidth = $s.WorkingArea.Width
      workingHeight = $s.WorkingArea.Height
    }
  }

  return $items
}

function Test-VoiceKernelHealth {
  param([string]$BaseUrl = $VoiceKernelUrl)

  try {
    $healthUrl = ($BaseUrl.TrimEnd("/") + "/health")
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  }
  catch {
    return $false
  }
}

function Invoke-VoiceKernelSpeak {
  param(
    [string]$Text,
    [string]$VoiceId,
    [string]$RunRoot = "",
    [string]$OutputPath,
    [string]$BaseUrl = $VoiceKernelUrl
  )

  if (-not $OutputPath) {
    throw "OutputPath is required."
  }

  $outputDir = Split-Path -Parent $OutputPath
  if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
  }

  $base = $BaseUrl.TrimEnd("/")
  $requestBody = [ordered]@{
    text = $Text
    voice = "agent-lee"
    language = "en"
    speed = 1.0
  }

  if ($RunRoot) {
    Write-Step $RunRoot ("Voice kernel synth request -> " + $base + "/tts")
  }

  $response = Invoke-RestMethod -Uri ($base + "/tts") -Method Post -ContentType "application/json" -Body ($requestBody | ConvertTo-Json -Depth 8) -TimeoutSec 30
  $audioPath = [string]$response.audio_path
  if (-not $audioPath) {
    $audioPath = [string]$response.audioPath
  }
  if (-not $audioPath) {
    throw "Voice kernel response did not include an audio path."
  }

  $audioName = [System.IO.Path]::GetFileName($audioPath)
  $audioUrl = if ($response.audio_url) {
    [string]$response.audio_url
  } elseif ($response.audioUrl) {
    [string]$response.audioUrl
  } else {
    $base + "/audio/" + $audioName
  }

  Invoke-WebRequest -Uri $audioUrl -UseBasicParsing -OutFile $OutputPath -TimeoutSec 30 | Out-Null

  if (-not (Test-Path -LiteralPath $OutputPath) -or ((Get-Item -LiteralPath $OutputPath -ErrorAction SilentlyContinue).Length -le 0)) {
    throw "Voice kernel audio download did not produce a playable file."
  }

  if ($RunRoot) {
    Write-Step $RunRoot ("Voice kernel audio downloaded: " + $audioUrl)
  }

  return [ordered]@{
    ok = $true
    source = "voice-kernel"
    voiceKernelUrl = $base
    voiceKernelAudioUrl = $audioUrl
    voiceKernelAudioPath = $audioPath
    file = $OutputPath
    response = $response
    fallbackUsed = $false
  }
}

function Invoke-NaturalSpeak {
  param(
    [string]$Text,
    [string]$Voice = "andrew",
    [string]$RunRoot = "",
    [switch]$Expressive
  )

  if (-not $RunRoot) {
    $RunRoot = New-RunRoot "voice"
  }

  # Prefer an explicit Agent Lee clone voice when configured in environment.
  $envAgentVoice = $env:AGENT_LEE_VOICE
  $voiceId = "LEEWAY_VOICE::AGENT_LEE::DEFAULT_CLONE"
  if ($envAgentVoice -and ($Voice -eq "andrew" -or -not $Voice)) {
    $voiceId = $envAgentVoice
  }
  elseif ($Voice -match "ava|alternate|backup") {
    $voiceId = "en-US-AvaNeural"
  }
  elseif ($Voice -and $Voice -notmatch "^(andrew|default)$") {
    # If caller provided a non-default token, assume it's a full voice id.
    $voiceId = $Voice
  }

  $voiceRoot = Join-Path $RunRoot "voice"
  New-Item -ItemType Directory -Force -Path $voiceRoot | Out-Null

  $speakerProfile = if ($env:AGENT_LEE_SPEAKER_PROFILE -and $env:AGENT_LEE_SPEAKER_PROFILE.Trim() -ne "") {
    $env:AGENT_LEE_SPEAKER_PROFILE
  } else {
    "default-local-speakers"
  }

  $speakerVolume = 1.0
  if ($env:AGENT_LEE_SPEAKER_VOLUME) {
    try {
      $parsedVolume = [double]$env:AGENT_LEE_SPEAKER_VOLUME
      if ($parsedVolume -gt 0 -and $parsedVolume -le 1) {
        $speakerVolume = $parsedVolume
      }
    } catch {}
  }

  $safeVoiceId = ($voiceId -replace '[^A-Za-z0-9._-]', '_')

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $outFile = Join-Path $voiceRoot ("agent-lee-natural-" + $safeVoiceId + "-" + $stamp + ".mp3")
  $playScriptPath = Join-Path $voiceRoot ("agent-lee-play-" + $stamp + ".ps1")
  $segmentDir = Join-Path $voiceRoot ("segments-" + $stamp)
  New-Item -ItemType Directory -Force -Path $segmentDir | Out-Null
  $voiceKernelUsed = $false
  $voiceKernelResult = $null
  $fallbackUsed = $false

  if (Test-VoiceKernelHealth -BaseUrl $VoiceKernelUrl) {
    try {
      $voiceKernelResult = Invoke-VoiceKernelSpeak -Text $Text -VoiceId $voiceId -RunRoot $RunRoot -OutputPath $outFile -BaseUrl $VoiceKernelUrl
      if ($voiceKernelResult -and $voiceKernelResult.ok) {
        $voiceKernelUsed = $true
      }
    }
    catch {
      $voiceKernelResult = [ordered]@{
        ok = $false
        source = "voice-kernel"
        voiceKernelUrl = $VoiceKernelUrl
        error = $_.Exception.Message
      }
    }
  }

  # Prefer using the project's Cerebral virtualenv Python so that
  # `-m leeway_tts` imports the repository modules reliably. If the
  # venv is not present, fall back to `py`/`python` on PATH.
  $repoRoot = Split-Path -Parent (Split-Path -Parent $RuntimeRoot)
  $venvPython = Join-Path $repoRoot "Cerebral\.venv\Scripts\python.exe"

  function Invoke-TtsWrite {
    param(
      [string]$SegmentText,
      [string]$SegmentFile
    )
    if (Test-Path -LiteralPath $venvPython) {
      $env:PYTHONPATH = $repoRoot
      & $venvPython -m leeway_tts --voice $voiceId --text $SegmentText --write-media $SegmentFile
    }
    else {
      $py = Get-Command py -ErrorAction SilentlyContinue
      $python = Get-Command python -ErrorAction SilentlyContinue
      if ($py) {
        $env:PYTHONPATH = $repoRoot
        & py -m leeway_tts --voice $voiceId --text $SegmentText --write-media $SegmentFile
      }
      elseif ($python) {
        $env:PYTHONPATH = $repoRoot
        & python -m leeway_tts --voice $voiceId --text $SegmentText --write-media $SegmentFile
      }
      else {
        throw "Python launcher not found. Install Python or make py/python available on PATH."
      }
    }
  }

  if (-not $voiceKernelUsed -and $Expressive) {
    $breathText = "inh"
    $speechOne = Join-Path $segmentDir "02-speech.mp3"
    $laughBreathText = "inh"
    $laughText = "ha"
    $jokeText = "Why did the byte go to school? Because it wanted to be a little bit brighter."
    $speechTwo = Join-Path $segmentDir "04-speech.mp3"
    $outFile = $speechOne

    Invoke-TtsWrite -SegmentText $breathText -SegmentFile (Join-Path $segmentDir "01-breath.mp3")
    Invoke-TtsWrite -SegmentText $Text -SegmentFile $speechOne
    Invoke-TtsWrite -SegmentText $jokeText -SegmentFile (Join-Path $segmentDir "03-joke.mp3")
    Invoke-TtsWrite -SegmentText $laughBreathText -SegmentFile (Join-Path $segmentDir "04-laugh-breath.mp3")
    Invoke-TtsWrite -SegmentText $laughText -SegmentFile (Join-Path $segmentDir "05-laugh.mp3")
    Invoke-TtsWrite -SegmentText "I am here. I can keep going with you." -SegmentFile $speechTwo
  }
  elseif (-not $voiceKernelUsed) {
    Invoke-TtsWrite -SegmentText $Text -SegmentFile $outFile
  }

  if (-not $voiceKernelUsed) {
    $fallbackUsed = $true
  }

  if (-not (Test-Path -LiteralPath $outFile) -or ((Get-Item -LiteralPath $outFile -ErrorAction SilentlyContinue).Length -le 0)) {
    $fallbackWav = Join-Path $voiceRoot ("agent-lee-natural-" + $safeVoiceId + "-" + $stamp + ".wav")
    try {
      Add-Type -AssemblyName System.Speech -ErrorAction Stop
      $speechSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $speechSynth.SetOutputToWaveFile($fallbackWav)
      $speechSynth.Speak($Text)
      $speechSynth.Dispose()
      if ((Test-Path -LiteralPath $fallbackWav) -and ((Get-Item -LiteralPath $fallbackWav -ErrorAction SilentlyContinue).Length -gt 0)) {
        $outFile = $fallbackWav
      }
    }
    catch {
      $outFile = $fallbackWav
    }
  }

  if (-not (Test-Path -LiteralPath $outFile) -or ((Get-Item -LiteralPath $outFile -ErrorAction SilentlyContinue).Length -le 0)) {
    throw "Natural voice file was not created: $outFile"
  }

  # Optional: upload TTS artifact to Seafile if configured
  $seafileResult = $null
  try {
    $seafileResult = Send-ToSeafile -LocalPath $outFile -RunRoot $RunRoot
  }
  catch {
    $seafileResult = [ordered]@{ ok = $false; error = $_.Exception.Message }
  }

  $estimatedSeconds = [Math]::Min(120, [Math]::Max(8, [Math]::Ceiling($Text.Length / 8) + 4))

  if ($Expressive) {
    $playLines = @(
      'Add-Type -AssemblyName PresentationCore',
      '$items = @(',
      ('  ''' + (Join-Path $segmentDir "01-breath.mp3") + ''''),
      ('  ''' + $speechOne + ''''),
      ('  ''' + (Join-Path $segmentDir "03-joke.mp3") + ''''),
      ('  ''' + (Join-Path $segmentDir "04-laugh-breath.mp3") + ''''),
      ('  ''' + (Join-Path $segmentDir "05-laugh.mp3") + ''''),
      ('  ''' + $speechTwo + ''''),
      ')',
      'foreach ($item in $items) {',
      '  $player = New-Object System.Windows.Media.MediaPlayer',
      '  $player.Volume = ' + $speakerVolume,
      '  $player.Open([Uri]$item)',
      '  Start-Sleep -Milliseconds 1200',
      '  try {',
      '    if ($player.NaturalDuration.HasTimeSpan) {',
      '      $duration = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds) + 2',
      '    }',
      '    else {',
      '      $duration = 5',
      '    }',
      '  }',
      '  catch {',
      '    $duration = 5',
      '  }',
      '  $player.Play()',
      '  Start-Sleep -Seconds $duration',
      '  $player.Stop()',
      '  $player.Close()',
      '  Start-Sleep -Milliseconds 50',
      '}'
    )
  }
  else {
    $playLines = @(
      'Add-Type -AssemblyName PresentationCore',
      '$player = New-Object System.Windows.Media.MediaPlayer',
      '$player.Volume = ' + $speakerVolume,
      '$player.Open([Uri]''' + $outFile + ''')',
      'Start-Sleep -Milliseconds 1200',
      'try {',
      '  if ($player.NaturalDuration.HasTimeSpan) {',
      '    $duration = [Math]::Ceiling($player.NaturalDuration.TimeSpan.TotalSeconds) + 3',
      '  }',
      '  else {',
      '    $duration = ' + $estimatedSeconds,
      '  }',
      '}',
      'catch {',
      '  $duration = ' + $estimatedSeconds,
      '}',
      'if ($duration -lt ' + $estimatedSeconds + ') {',
      '  $duration = ' + $estimatedSeconds,
      '}',
      '$player.Play()',
      'Start-Sleep -Seconds $duration',
      '$player.Stop()',
      '$player.Close()'
    )
  }

  $playLines | Out-File -Encoding UTF8 $playScriptPath

  powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File $playScriptPath

  return [ordered]@{
    ok = $true
    voice = $voiceId
    chars = $Text.Length
    file = $outFile
    playScript = $playScriptPath
    playback = "hidden-wpf-mediaplayer-sta"
    speakerProfile = $speakerProfile
    speakerVolume = $speakerVolume
    expressive = [bool]$Expressive
    voiceKernelUrl = $VoiceKernelUrl
    voiceKernelUsed = $voiceKernelUsed
    voiceKernelResult = $voiceKernelResult
    fallbackUsed = $fallbackUsed
    seafile = $seafileResult
  }
}

function Get-FullScreenshot {
  param(
    [string]$RunRoot,
    [string]$Label = "screenshot",
    [switch]$Open
  )

  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  $screens = [System.Windows.Forms.Screen]::AllScreens

  $minX = ($screens | ForEach-Object { $_.Bounds.X } | Measure-Object -Minimum).Minimum
  $minY = ($screens | ForEach-Object { $_.Bounds.Y } | Measure-Object -Minimum).Minimum
  $maxX = ($screens | ForEach-Object { $_.Bounds.X + $_.Bounds.Width } | Measure-Object -Maximum).Maximum
  $maxY = ($screens | ForEach-Object { $_.Bounds.Y + $_.Bounds.Height } | Measure-Object -Maximum).Maximum

  $width = $maxX - $minX
  $height = $maxY - $minY

  # Guard: GDI+ Bitmap constructor requires positive non-zero dimensions.
  # In a non-interactive/STA session, AllScreens may report 0×0. Fall back
  # to the primary screen bounds to guarantee a valid bitmap size.
  if ($width -le 0 -or $height -le 0) {
    $primary = [System.Windows.Forms.Screen]::PrimaryScreen
    if ($null -ne $primary) {
      $minX = $primary.Bounds.X
      $minY = $primary.Bounds.Y
      $width = $primary.Bounds.Width
      $height = $primary.Bounds.Height
    }
    # Final fallback: safe 1920×1080 capture
    if ($width -le 0 -or $height -le 0) {
      $minX = 0; $minY = 0; $width = 1920; $height = 1080
    }
  }

  $shotRoot = Join-Path $RunRoot "screenshots"
  New-Item -ItemType Directory -Force -Path $shotRoot | Out-Null

  $path = Join-Path $shotRoot ("agent-lee-" + $Label + "-full-desktop-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")

  $bitmap = New-Object System.Drawing.Bitmap([int]$width, [int]$height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen([int]$minX, [int]$minY, 0, 0, $bitmap.Size)
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()

  if (-not (Test-Path -LiteralPath $path)) {
    throw "Screenshot was not created."
  }

  if ($Open) {
    Start-Process -FilePath $path
  }

  # Optional: upload screenshot to Seafile if configured
  $seafileShot = $null
  try {
    $seafileShot = Send-ToSeafile -LocalPath $path -RunRoot $RunRoot
  }
  catch {
    $seafileShot = [ordered]@{ ok = $false; error = $_.Exception.Message }
  }

  return [ordered]@{
    ok = $true
    path = $path
    opened = [bool]$Open
    width = $width
    height = $height
    minX = $minX
    minY = $minY
    seafile = $seafileShot
  }
}

function Invoke-Demo {
  $runRoot = New-RunRoot "demo"
  $stage = "start"

  $result = [ordered]@{
    ok = $false
    tool = "runtime.demo"
    stage = $stage
    error = ""
    runRoot = $runRoot
    monitor = $null
    edgeWindowHandle = $null
    points = @()
    screenshot = $null
    screenshotOpened = $false
    voice = @()
  }

  try {
    Write-Step $runRoot "Demo started."

    $monitorIndex = 1
    if ($null -ne $Request.monitorIndex) {
      $monitorIndex = [int]$Request.monitorIndex
    }

    $monitors = Get-Monitors
    if ($monitorIndex -lt 0 -or $monitorIndex -ge $monitors.Count) {
      throw "Invalid monitor index $monitorIndex"
    }

    $monitor = $monitors[$monitorIndex]
    $result.monitor = $monitor

    $stage = "voice-start"
    $result.stage = $stage
    $result.voice += Invoke-NaturalSpeak -RunRoot $runRoot -Voice "andrew" -Text "Yo, Agent Lee desktop runtime is starting the full flow. I will open the browser, move the mouse across one, two, and three, capture the screenshot, open it, and only then report success."

    $stage = "create-html"
    $result.stage = $stage

    $htmlPath = Join-Path $runRoot "agent-lee-runtime-proof.html"

    $html = @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Agent Lee Runtime Proof</title>
<style>
  html, body {
    margin: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #080b14;
    color: white;
    font-family: Segoe UI, Arial, sans-serif;
  }
  h1 { margin: 34px 44px 8px; font-size: 44px; }
  .sub { margin: 0 44px; font-size: 22px; color: #b9c6ff; }
  .target {
    position: absolute;
    width: 330px;
    height: 330px;
    margin-left: -165px;
    margin-top: -165px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-size: 72px;
    font-weight: 900;
    background: rgba(255,255,255,0.16);
    border: 10px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 45px rgba(255,255,255,0.28);
  }
  .target:hover {
    background: rgba(0,255,140,0.72);
    box-shadow: 0 0 150px rgba(0,255,140,1);
    transform: scale(1.12);
  }
  #one { left: 22vw; top: 50vh; }
  #two { left: 50vw; top: 50vh; }
  #three { left: 78vw; top: 50vh; }
  #cursorDot {
    position: fixed;
    width: 50px;
    height: 50px;
    margin-left: -25px;
    margin-top: -25px;
    border-radius: 999px;
    background: rgba(255,230,0,0.98);
    box-shadow: 0 0 70px rgba(255,230,0,1);
    pointer-events: none;
    z-index: 9999;
  }
  .status {
    position: fixed;
    left: 44px;
    right: 44px;
    bottom: 34px;
    padding: 20px 26px;
    border-radius: 18px;
    font-size: 28px;
    background: rgba(0,0,0,0.72);
  }
</style>
</head>
<body>
  <h1>Agent Lee Runtime Proof</h1>
  <div class="sub">Transactional flow: open browser, move cursor, capture screenshot, open proof.</div>
  <div class="target" id="one">1</div>
  <div class="target" id="two">2</div>
  <div class="target" id="three">3</div>
  <div id="cursorDot"></div>
  <div class="status" id="status">Waiting for real cursor movement...</div>
<script>
  const dot = document.getElementById("cursorDot");
  const status = document.getElementById("status");
  document.addEventListener("mousemove", (event) => {
    dot.style.left = event.clientX + "px";
    dot.style.top = event.clientY + "px";
    status.textContent = "Real cursor at X=" + event.clientX + ", Y=" + event.clientY;
  });
</script>
</body>
</html>
"@

    Set-Content -LiteralPath $htmlPath -Encoding UTF8 -Value $html

    $stage = "load-win32"
    $result.stage = $stage

    Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class AgentLeeRuntimeNative {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern int GetWindowTextLength(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);

  [DllImport("user32.dll")]
  public static extern bool GetCursorPos(out POINT lpPoint);

  [StructLayout(LayoutKind.Sequential)]
  public struct POINT {
    public int X;
    public int Y;
  }

  public static string GetTitle(IntPtr hWnd) {
    int length = GetWindowTextLength(hWnd);
    if (length <= 0) return "";
    StringBuilder builder = new StringBuilder(length + 1);
    GetWindowText(hWnd, builder, builder.Capacity);
    return builder.ToString();
  }
}
"@

    $stage = "open-edge"
    $result.stage = $stage

    $edgeCandidates = @(
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    )

    $edgePath = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $edgePath) {
      throw "Microsoft Edge not found."
    }

    $uri = (New-Object System.Uri($htmlPath)).AbsoluteUri
    Start-Process -FilePath $edgePath -ArgumentList @("--app=$uri")
    Start-Sleep -Seconds 5

    $stage = "resolve-window"
    $result.stage = $stage

    $hwnd = [IntPtr]::Zero
    $deadline = (Get-Date).AddSeconds(30)

    while ((Get-Date) -lt $deadline -and $hwnd -eq [IntPtr]::Zero) {
      $script:AgentLeeRuntimeFound = [IntPtr]::Zero

      $callback = [AgentLeeRuntimeNative+EnumWindowsProc]{
        param([IntPtr]$h, [IntPtr]$l)
        if ([AgentLeeRuntimeNative]::IsWindowVisible($h)) {
          $title = [AgentLeeRuntimeNative]::GetTitle($h)
          if ($title -match "Agent Lee Runtime Proof|Runtime Proof") {
            $script:AgentLeeRuntimeFound = $h
          }
        }
        return $true
      }

      [AgentLeeRuntimeNative]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

      if ($script:AgentLeeRuntimeFound -ne [IntPtr]::Zero) {
        $hwnd = $script:AgentLeeRuntimeFound
        break
      }

      Start-Sleep -Milliseconds 500
    }

    if ($hwnd -eq [IntPtr]::Zero) {
      throw "Could not resolve Edge runtime proof window by title."
    }

    $result.edgeWindowHandle = $hwnd.ToInt64()

    $stage = "move-window"
    $result.stage = $stage

    [AgentLeeRuntimeNative]::MoveWindow($hwnd, $monitor.x, $monitor.y, $monitor.width, $monitor.height, $true) | Out-Null
    [AgentLeeRuntimeNative]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Seconds 2

    function Move-Slow {
      param(
        [int]$FromX,
        [int]$FromY,
        [int]$ToX,
        [int]$ToY,
        [int]$Steps = 190,
        [int]$DelayMs = 16
      )

      for ($i = 0; $i -le $Steps; $i++) {
        $t = $i / $Steps
        $x = [int]($FromX + (($ToX - $FromX) * $t))
        $y = [int]($FromY + (($ToY - $FromY) * $t))
        [AgentLeeRuntimeNative]::SetCursorPos($x, $y) | Out-Null
        Start-Sleep -Milliseconds $DelayMs
      }
    }

    $points = @(
      [ordered]@{ label = "one"; x = [int]($monitor.x + ($monitor.width * 0.22)); y = [int]($monitor.y + ($monitor.height * 0.50)) },
      [ordered]@{ label = "two"; x = [int]($monitor.x + ($monitor.width * 0.50)); y = [int]($monitor.y + ($monitor.height * 0.50)) },
      [ordered]@{ label = "three"; x = [int]($monitor.x + ($monitor.width * 0.78)); y = [int]($monitor.y + ($monitor.height * 0.50)) }
    )

    $result.points = $points

    $stage = "voice-before-move"
    $result.stage = $stage
    $result.voice += Invoke-NaturalSpeak -RunRoot $runRoot -Voice "andrew" -Text "Browser is positioned. I am moving the real cursor across target one, target two, and target three."

    $stage = "move-mouse"
    $result.stage = $stage

    [AgentLeeRuntimeNative+POINT]$pos = New-Object AgentLeeRuntimeNative+POINT
    [AgentLeeRuntimeNative]::GetCursorPos([ref]$pos) | Out-Null

    $cx = $pos.X
    $cy = $pos.Y

    foreach ($point in $points) {
      Write-Step $runRoot ("Moving cursor to target " + $point.label + " at " + $point.x + "," + $point.y)
      Move-Slow -FromX $cx -FromY $cy -ToX $point.x -ToY $point.y
      Start-Sleep -Seconds 2
      $cx = $point.x
      $cy = $point.y
    }

    $stage = "screenshot"
    $result.stage = $stage
    $shot = Get-FullScreenshot -RunRoot $runRoot -Label "success" -Open

    $result.screenshot = $shot.path
    $result.screenshotOpened = $shot.opened

    if (-not (Test-Path -LiteralPath $shot.path)) {
      throw "Screenshot proof path missing after capture."
    }

    if (-not $shot.opened) {
      throw "Screenshot proof was captured but not opened."
    }

    $stage = "voice-success"
    $result.stage = $stage
    $result.voice += Invoke-NaturalSpeak -RunRoot $runRoot -Voice "andrew" -Text "Runtime proof complete. I moved the cursor, captured the full desktop screenshot, opened it, and verified the proof."

    $result.stage = "complete"
    $result.ok = $true
  }
  catch {
    $result.error = $_.Exception.Message
    $result.stage = $stage

    try {
      $failShot = Get-FullScreenshot -RunRoot $runRoot -Label "failure" -Open
      $result.screenshot = $failShot.path
      $result.screenshotOpened = $failShot.opened
    }
    catch {}

    try {
      $result.voice += Invoke-NaturalSpeak -RunRoot $runRoot -Voice "andrew" -Text ("Runtime proof failed at stage " + $stage + ". I opened a failure screenshot if capture succeeded.")
    }
    catch {}
  }

  return $result
}

function Invoke-OfficialEmbodimentProof {
  param(
    [Parameter(Mandatory = $true)]$Payload,
    [int]$TimeoutMs = 30000
  )

  $blockers = @(
    "Official embodiment proof lane only supports a narrow browser-search proof path."
  ) + @($Payload.blockers)

  $prompt = ""
  if ($null -ne $Payload.prompt -and -not [string]::IsNullOrWhiteSpace([string]$Payload.prompt)) {
    $prompt = [string]$Payload.prompt
  } elseif ($null -ne $Payload.text -and -not [string]::IsNullOrWhiteSpace([string]$Payload.text)) {
    $prompt = [string]$Payload.text
  } elseif ($null -ne $Payload.instruction -and -not [string]::IsNullOrWhiteSpace([string]$Payload.instruction)) {
    $prompt = [string]$Payload.instruction
  }
  $searchIntent = [bool]($prompt -match '(?i)\b(search|open chrome|open browser|browse)\b')
  $searchQuery = $prompt
  if ($searchIntent) {
    $searchQuery = $searchQuery -replace '(?i)^.*?\bsearch\b', ''
    $searchQuery = $searchQuery -replace '(?i)^.*?\bopen chrome\b', ''
    $searchQuery = $searchQuery -replace '(?i)^.*?\bopen browser\b', ''
    $searchQuery = $searchQuery -replace '(?i)^.*?\bbrowse\b', ''
    $searchQuery = $searchQuery -replace '^[\s,.:;#-]+', ''
    $searchQuery = $searchQuery -replace '[\s,.:;#-]+$', ''
  }
  if ([string]::IsNullOrWhiteSpace($searchQuery)) {
    $searchQuery = "Milwaukee Bucks latest trades"
  }

  $chromeCandidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  $chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  $browserUrl = "https://www.bing.com/search?q=" + [uri]::EscapeDataString($searchQuery)
  $runRoot = New-RunRoot "official-embodiment-proof"
  $browserOpened = $false
  $screenshot = $null

  if ($searchIntent -and $chromePath) {
    try {
      Start-Process -FilePath $chromePath -ArgumentList @($browserUrl)
      $browserOpened = $true
      Start-Sleep -Seconds 2
      try {
        $screenshot = Get-FullScreenshot -RunRoot $runRoot -Label "official-embodiment-proof" -Open:$false
      } catch {
        $blockers += ("Screenshot capture failed: " + $_.Exception.Message)
      }
    } catch {
      $blockers += ("Chrome launch failed: " + $_.Exception.Message)
    }
  } elseif ($searchIntent -and -not $chromePath) {
    $blockers += "Chrome executable was not found."
  } else {
    $blockers += "Prompt did not describe a browser-search intent."
  }

  $ok = $browserOpened -and $null -ne $screenshot -and (Test-Path -LiteralPath $screenshot.path)
  $status = if ($ok) { "PASS_MACHINE_ONLY" } else { "CHECK_REQUIRED" }
  $truthLabels = if ($ok) { @("AGENT_LEE_TOOL_CALLING_READY", "NO_FAKE_PASS") } else { @("CHECK_REQUIRED", "NO_FAKE_PASS") }

  $result = [ordered]@{
    ok = $ok
    status = $status
    tool = "runtime.official-embodiment-proof"
    route = "/runtime/official-embodiment-proof/run"
    hostId = "agent-lee-desktop-runtime-host"
    hostName = "Agent Lee Desktop Runtime Host"
    timeoutMs = $TimeoutMs
    controlSurface = if ($Payload.controlSurface) { [string]$Payload.controlSurface } else { "diagnostic_terminal" }
    prompt = $prompt
    searchQuery = $searchQuery
    browserPath = $chromePath
    browserUrl = $browserUrl
    runRoot = $runRoot
    screenshot = $screenshot
    blockers = $blockers
    truthLabels = $truthLabels
  }

  $receiptStamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $receiptPath = Join-Path $ReceiptDir ("official-embodiment-proof-" + $receiptStamp + ".json")
  Write-JsonFile -Path $receiptPath -Data ([ordered]@{
    receiptId = "official-embodiment-proof-" + $receiptStamp
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    hostId = "agent-lee-desktop-runtime-host"
    hostName = "Agent Lee Desktop Runtime Host"
    route = "/runtime/official-embodiment-proof/run"
    action = "official-embodiment-proof"
    status = $status
    ok = $ok
    prompt = $prompt
    searchQuery = $searchQuery
    browserPath = $chromePath
    browserUrl = $browserUrl
    runRoot = $runRoot
    screenshot = $screenshot
    blockers = $blockers
    truthLabels = $truthLabels
    routeResult = $result
  })
  $result.receiptPath = $receiptPath
  return $result
}

function Finalize-OfficialEmbodimentProof {
  param(
    [Parameter(Mandatory = $true)]$Payload
  )

  $blockers = @(
    "Official embodiment proof finalize lane is not fully implemented in the desktop runtime host."
  )
  if (-not $Payload.pendingReceiptPath) {
    $blockers += "pendingReceiptPath is required."
  }
  if (-not $Payload.finalConfirm -or [string]$Payload.finalConfirm -ne "YES") {
    $blockers += "finalConfirm must be YES."
  }

  $result = [ordered]@{
    ok = $false
    status = "CHECK_REQUIRED"
    tool = "runtime.official-embodiment-proof.finalize"
    route = "/runtime/official-embodiment-proof/finalize"
    hostId = "agent-lee-desktop-runtime-host"
    hostName = "Agent Lee Desktop Runtime Host"
    pendingReceiptPath = if ($Payload.pendingReceiptPath) { [string]$Payload.pendingReceiptPath } else { $null }
    blockers = $blockers
    truthLabels = @("CHECK_REQUIRED", "NO_FAKE_PASS")
  }

  $receiptStamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $receiptPath = Join-Path $ReceiptDir ("official-embodiment-proof-finalize-" + $receiptStamp + ".json")
  Write-JsonFile -Path $receiptPath -Data ([ordered]@{
    receiptId = "official-embodiment-proof-finalize-" + $receiptStamp
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    hostId = "agent-lee-desktop-runtime-host"
    hostName = "Agent Lee Desktop Runtime Host"
    route = "/runtime/official-embodiment-proof/finalize"
    action = "official-embodiment-proof.finalize"
    status = "CHECK_REQUIRED"
    ok = $false
    blockers = $blockers
    truthLabels = @("CHECK_REQUIRED", "NO_FAKE_PASS")
    routeResult = $result
  })
  $result.receiptPath = $receiptPath
  return $result
}

try {
  switch ($Action) {
    "status" {
      Out-Json (Get-DesktopRuntimeStatus)
    }

    "desktop-status" {
      Out-Json (Get-DesktopRuntimeStatus)
    }

    "monitors" {
      Out-Json ([ordered]@{
        ok = $true
        tool = "runtime.monitors"
        monitors = Get-Monitors
      })
    }

    "speak" {
      $text = [string]$Request.text
      if (-not $text) { throw "Missing text." }

      $voice = [string]$Request.voice
      if (-not $voice) { $voice = "andrew" }
      $expressive = $false
      if ($null -ne $Request.expressive) {
        $expressive = [bool]$Request.expressive
      }

      $runRoot = New-RunRoot "speak"

      Out-Json ([ordered]@{
        ok = $true
        tool = "runtime.speak"
        result = Invoke-NaturalSpeak -Text $text -Voice $voice -RunRoot $runRoot -Expressive:($expressive)
        runRoot = $runRoot
      })
    }

    "screenshot-show" {
      $runRoot = New-RunRoot "screenshot"
      $label = [string]$Request.label
      if (-not $label) { $label = "manual" }

      Out-Json ([ordered]@{
        ok = $true
        tool = "runtime.screenshot-show"
        screenshot = Get-FullScreenshot -RunRoot $runRoot -Label $label -Open
        runRoot = $runRoot
      })
    }

    "demo" {
      Out-Json (Invoke-Demo)
    }

    # ─── Extended Body/Action Handlers ───────────────────────────────────────
    # Added by Leeway 99% Readiness Uplift Pass (2026-06-25)

    "mouse-move" {
      $x = [int]$Request.x
      $y = [int]$Request.y
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
        Out-Json ([ordered]@{
          ok = $true
          action = "mouse-move"
          result = [ordered]@{ x = $x; y = $y }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "mouse-move"; error = $_.Exception.Message })
      }
    }

    "mouse-click" {
      $x = [int]$Request.x
      $y = [int]$Request.y
      $button = [string]$Request.button
      if (-not $button) { $button = "left" }
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue

        # Move first
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
        Start-Sleep -Milliseconds 80

        # P/Invoke mouse_event from user32
        $userDllDef = @"
using System;
using System.Runtime.InteropServices;
public class AgentLeeMouseHelper {
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, IntPtr dwExtraInfo);
    public const uint MOUSEEVENTF_LEFTDOWN   = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP     = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN  = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP    = 0x0010;
}
"@
        try { Add-Type -TypeDefinition $userDllDef -ErrorAction SilentlyContinue } catch {}

        if ($button -eq "right") {
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, [IntPtr]::Zero)
          Start-Sleep -Milliseconds 50
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_RIGHTUP, 0, 0, 0, [IntPtr]::Zero)
        } elseif ($button -eq "double") {
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [IntPtr]::Zero)
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [IntPtr]::Zero)
          Start-Sleep -Milliseconds 80
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [IntPtr]::Zero)
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [IntPtr]::Zero)
        } else {
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [IntPtr]::Zero)
          Start-Sleep -Milliseconds 50
          [AgentLeeMouseHelper]::mouse_event([AgentLeeMouseHelper]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [IntPtr]::Zero)
        }

        Out-Json ([ordered]@{
          ok = $true
          action = "mouse-click"
          result = [ordered]@{ x = $x; y = $y; button = $button }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "mouse-click"; error = $_.Exception.Message })
      }
    }

    "keyboard-type" {
      $text = [string]$Request.text
      if (-not $text) { throw "keyboard-type: text is required" }
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        # Escape special SendKeys characters: +^%~(){}[]
        $escaped = $text -replace '([+^%~(){}[\]])', '{$1}'
        [System.Windows.Forms.SendKeys]::SendWait($escaped)
        Out-Json ([ordered]@{
          ok = $true
          action = "keyboard-type"
          result = [ordered]@{ charCount = $text.Length; method = "SendKeys.SendWait" }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
          note = "SendKeys may not work in UAC-elevated windows or secure desktop"
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "keyboard-type"; error = $_.Exception.Message })
      }
    }

    "keyboard-hotkey" {
      $keys = $Request.keys
      if (-not $keys) { throw "keyboard-hotkey: keys array is required" }
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        # Build SendKeys combo: ctrl+c -> ^c, alt+F4 -> %{F4}, etc.
        $modifierMap = @{
          'ctrl'  = '^'
          'control' = '^'
          'alt'   = '%'
          'shift' = '+'
          'win'   = '^%'
        }
        $sendStr = ""
        $modifiers = ""
        $mainKeys = @()
        foreach ($k in $keys) {
          $kl = $k.ToLower()
          if ($modifierMap.ContainsKey($kl)) {
            $modifiers += $modifierMap[$kl]
          } else {
            # Check if it's a function key or special key
            if ($kl -match '^f\d+$') { $mainKeys += "{$($k.ToUpper())}" }
            elseif ($kl -eq 'enter') { $mainKeys += "{ENTER}" }
            elseif ($kl -eq 'tab') { $mainKeys += "{TAB}" }
            elseif ($kl -eq 'esc' -or $kl -eq 'escape') { $mainKeys += "{ESC}" }
            elseif ($kl -eq 'delete' -or $kl -eq 'del') { $mainKeys += "{DELETE}" }
            elseif ($kl -eq 'backspace') { $mainKeys += "{BACKSPACE}" }
            else { $mainKeys += $k }
          }
        }
        if ($modifiers -and $mainKeys.Count -gt 0) {
          $sendStr = $modifiers + "(" + ($mainKeys -join "") + ")"
        } else {
          $sendStr = $modifiers + ($mainKeys -join "")
        }
        [System.Windows.Forms.SendKeys]::SendWait($sendStr)
        Out-Json ([ordered]@{
          ok = $true
          action = "keyboard-hotkey"
          result = [ordered]@{ keys = $keys; sendKeysString = $sendStr }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "keyboard-hotkey"; error = $_.Exception.Message })
      }
    }

    "scroll" {
      $direction = [string]$Request.direction
      $amount = [int]$Request.amount
      if ($amount -le 0) { $amount = 1 }
      if (-not $direction) { $direction = "down" }
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        $key = if ($direction -match '^up') { "{PGUP}" } else { "{PGDN}" }
        for ($i = 0; $i -lt $amount; $i++) {
          [System.Windows.Forms.SendKeys]::SendWait($key)
          Start-Sleep -Milliseconds 60
        }
        Out-Json ([ordered]@{
          ok = $true
          action = "scroll"
          result = [ordered]@{ direction = $direction; amount = $amount; method = "SendKeys" }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "scroll"; error = $_.Exception.Message })
      }
    }

    "app-launch" {
      $appName = [string]$Request.appName
      if (-not $appName) { throw "app-launch: appName is required" }
      $appArgs = $Request.args
      try {
        $proc = if ($appArgs -and $appArgs.Count -gt 0) {
          Start-Process -FilePath $appName -ArgumentList $appArgs -PassThru
        } else {
          Start-Process -FilePath $appName -PassThru
        }
        Out-Json ([ordered]@{
          ok = $true
          action = "app-launch"
          result = [ordered]@{ appName = $appName; pid = $proc.Id; started = $proc.StartTime }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "app-launch"; error = $_.Exception.Message })
      }
    }

    "app-focus" {
      $windowTitle = [string]$Request.windowTitle
      if (-not $windowTitle) { throw "app-focus: windowTitle is required" }
      try {
        $setForegroundDef = @"
using System;
using System.Runtime.InteropServices;
public class AgentLeeWindowHelper {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
        try { Add-Type -TypeDefinition $setForegroundDef -ErrorAction SilentlyContinue } catch {}

        $proc = Get-Process | Where-Object { $_.MainWindowTitle -match $windowTitle } | Select-Object -First 1
        if (-not $proc) {
          Out-Json ([ordered]@{ ok = $false; action = "app-focus"; error = "No window matching: $windowTitle" })
        } else {
          [AgentLeeWindowHelper]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null  # SW_RESTORE
          [AgentLeeWindowHelper]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
          Out-Json ([ordered]@{
            ok = $true
            action = "app-focus"
            result = [ordered]@{ windowTitle = $proc.MainWindowTitle; pid = $proc.Id; processName = $proc.ProcessName }
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
          })
        }
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "app-focus"; error = $_.Exception.Message })
      }
    }

    "window-list" {
      try {
        $windows = Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | ForEach-Object {
          [ordered]@{
            pid = $_.Id
            processName = $_.ProcessName
            windowTitle = $_.MainWindowTitle
            handle = $_.MainWindowHandle.ToString()
          }
        }
        Out-Json ([ordered]@{
          ok = $true
          action = "window-list"
          result = [ordered]@{ count = ($windows | Measure-Object).Count; windows = @($windows) }
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "window-list"; error = $_.Exception.Message })
      }
    }

    "screen-read" {
      $runRoot = New-RunRoot "screen-read"
      try {
        # Take screenshot first
        $shot = Get-FullScreenshot -RunRoot $runRoot -Label "screen-read" -Open:$false
        $result = [ordered]@{
          ok = $true
          action = "screen-read"
          screenshot = $shot.path
          ocrAttempted = $false
          ocrText = $null
          ocrMethod = $null
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
          runRoot = $runRoot
        }

        # Attempt Windows.Media.Ocr if available (requires Windows 10+ and WinRT)
        try {
          Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
          $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
          $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
          if ($engine -and (Test-Path -LiteralPath $shot.path)) {
            Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
            # Load bitmap via WinRT StorageFile
            $fileTask = [Windows.Storage.StorageFile]::GetFileFromPathAsync($shot.path)
            $file = $fileTask.GetAwaiter().GetResult()
            $streamTask = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
            $stream = $streamTask.GetAwaiter().GetResult()
            $bitmapTask = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
            $bitmap = $bitmapTask.GetAwaiter().GetResult()
            $softBitmapTask = $bitmap.GetSoftwareBitmapAsync()
            $softBitmap = $softBitmapTask.GetAwaiter().GetResult()
            $ocrTask = $engine.RecognizeAsync($softBitmap)
            $ocrResult = $ocrTask.GetAwaiter().GetResult()
            $result.ocrAttempted = $true
            $result.ocrText = $ocrResult.Text
            $result.ocrMethod = "Windows.Media.Ocr"
          }
        } catch {
          $result.ocrAttempted = $true
          $result.ocrText = $null
          $result.ocrError = "Windows.Media.Ocr not available or failed: " + $_.Exception.Message
          $result.ocrMethod = "CONDITIONAL_FAILED"
          $result.note = "OCR requires Windows 10+ WinRT. Screenshot was still captured."
        }

        Out-Json $result
      } catch {
        Out-Json ([ordered]@{ ok = $false; action = "screen-read"; error = $_.Exception.Message; runRoot = $runRoot })
      }
    }

    # ─── Camera Actions ───────────────────────────────────────────────────────
    # Added by Leeway Runtime Proof Closure Pass (2026-06-27)

    "print" {
      $runRoot = New-RunRoot "print"
      $filePath = [string]$Request.filePath
      $text = [string]$Request.text
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        $targetPath = $filePath

        if (-not $targetPath -and $text) {
          $targetPath = Join-Path $runRoot "print.txt"
          Set-Content -LiteralPath $targetPath -Value $text -Encoding UTF8
        }

        if (-not $targetPath) {
          throw "print: filePath or text is required"
        }
        if (-not (Test-Path -LiteralPath $targetPath)) {
          throw "print: target file not found"
        }
        if (-not (Get-Command Out-Printer -ErrorAction SilentlyContinue)) {
          throw "Out-Printer command is unavailable."
        }

        Get-Content -LiteralPath $targetPath | Out-Printer
        Out-Json ([ordered]@{
          ok = $true
          action = "print"
          result = [ordered]@{ targetPath = $targetPath; method = "Out-Printer" }
          runRoot = $runRoot
          timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{
          ok = $false
          action = "print"
          error = $_.Exception.Message
          runRoot = $runRoot
        })
      }
    }

    "camera-status" {
      # Enumerate video-class camera devices via WMI (DirectShow/PnP)
      $cameraDevices = @()
      try {
        $pnpCams = @(Get-PnpDevice -Class Camera -ErrorAction SilentlyContinue)
        if (-not $pnpCams) {
          $pnpCams = @(Get-WmiObject Win32_PnPEntity -ErrorAction SilentlyContinue |
            Where-Object { $_.PNPClass -eq 'Camera' -or $_.Name -match 'camera|webcam|video' })
        }
        foreach ($d in $pnpCams) {
          $dName   = if ($d.FriendlyName) { $d.FriendlyName } elseif ($d.Name) { $d.Name } else { "Unknown" }
          $dStatus = if ($d.Status) { $d.Status } else { "Unknown" }
          $dId     = if ($d.InstanceId) { $d.InstanceId } elseif ($d.DeviceID) { $d.DeviceID } else { "" }
          $cameraDevices += [ordered]@{
            name   = $dName
            status = $dStatus
            id     = $dId
          }
        }
      } catch {}

      # Check ffmpeg availability (primary capture path for video-class webcam)
      $ffmpegAvailable = $false
      try {
        $ffmpegCheck = & ffmpeg -version 2>&1
        $ffmpegAvailable = ($LASTEXITCODE -eq 0)
      } catch {}

      Out-Json ([ordered]@{
        ok              = $true
        action          = "camera-status"
        deviceCount     = $cameraDevices.Count
        devices         = $cameraDevices
        ffmpegAvailable = $ffmpegAvailable
        captureMethod   = if ($ffmpegAvailable) { "ffmpeg-dshow" } else { "unavailable" }
        note            = "WIA type-2 not available for video-class devices. ffmpeg DirectShow is the capture path."
        timestamp       = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      })
    }

    "camera-capture" {
      $runRoot     = New-RunRoot "camera-capture"
      $frameFile   = Join-Path $runRoot "frame.png"
      $deviceIndex = if ($null -ne $Request.deviceIndex) { [int]$Request.deviceIndex } else { 0 }

      # Try ffmpeg DirectShow capture (video_size 1280x720, 1 frame)
      $ffmpegAvailable = $false
      try {
        $ffmpegCheck = & ffmpeg -version 2>&1
        $ffmpegAvailable = ($LASTEXITCODE -eq 0)
      } catch {}

      if (-not $ffmpegAvailable) {
        Out-Json ([ordered]@{
          ok      = $false
          action  = "camera-capture"
          error   = "ffmpeg not available. Cannot capture from video-class webcam. Install ffmpeg and ensure it is on PATH."
          runRoot = $runRoot
        })
      } else {
        # Enumerate DirectShow devices to get the device name for index $deviceIndex
        $dsDevices = @()
        try {
          $listOut = & ffmpeg -list_devices true -f dshow -i dummy 2>&1
          $dsDevices = @($listOut | Where-Object { $_ -match '"' } | Select-String '"([^"]+)"' |
            ForEach-Object { $_.Matches[0].Groups[1].Value })
          # Filter to video devices only (first block before audio)
          $audioMarker = ($dsDevices | Select-String "audio" | Select-Object -First 1)
          if ($audioMarker) {
            $audioIdx = [array]::IndexOf($dsDevices, $audioMarker.ToString().Trim())
            if ($audioIdx -gt 0) { $dsDevices = $dsDevices[0..($audioIdx - 1)] }
          }
        } catch {}

        $deviceName = if ($dsDevices.Count -gt $deviceIndex) { $dsDevices[$deviceIndex] } else { $null }

        if (-not $deviceName -and $dsDevices.Count -gt 0) { $deviceName = $dsDevices[0] }

        if (-not $deviceName) {
          Out-Json ([ordered]@{
            ok       = $false
            action   = "camera-capture"
            error    = "No DirectShow video device found via ffmpeg. Ensure webcam is connected and not in use."
            runRoot  = $runRoot
          })
        } else {
          try {
            $ffmpegArgs = @(
              "-y", "-f", "dshow", "-video_size", "1280x720",
              "-i", "video=$deviceName",
              "-frames:v", "1", "-q:v", "2",
              $frameFile
            )
            $ffOut = & ffmpeg @ffmpegArgs 2>&1
            $captured = (Test-Path -LiteralPath $frameFile) -and (Get-Item -LiteralPath $frameFile).Length -gt 0
            Out-Json ([ordered]@{
              ok          = $captured
              action      = "camera-capture"
              deviceName  = $deviceName
              deviceIndex = $deviceIndex
              framePath   = $frameFile
              frameBytes  = if ($captured) { (Get-Item -LiteralPath $frameFile).Length } else { 0 }
              captureMethod = "ffmpeg-dshow"
              runRoot     = $runRoot
              ffmpegOutput = ($ffOut -join "`n") | Select-Object -First 1
              timestamp   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
              error       = if (-not $captured) { "ffmpeg ran but frame not produced. Check device availability." } else { $null }
            })
          } catch {
            Out-Json ([ordered]@{
              ok      = $false
              action  = "camera-capture"
              error   = $_.Exception.Message
              runRoot = $runRoot
            })
          }
        }
      }
    }

    # ─── Ears / Mic Actions ───────────────────────────────────────────────────
    # Added by Leeway Runtime Proof Closure Pass (2026-06-27)

    "ears-status" {
      # Enumerate audio input devices
      $micDevices = @()
      try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
        $mmDef = @"
using System.Runtime.InteropServices;
public class AgentLeeAudioEnum {
    [DllImport("winmm.dll")] public static extern int waveInGetNumDevs();
}
"@
        try { Add-Type -TypeDefinition $mmDef -ErrorAction SilentlyContinue } catch {}
        $micCount = try { [AgentLeeAudioEnum]::waveInGetNumDevs() } catch { 0 }
      } catch { $micCount = 0 }

      # Also get named devices via WMI
      try {
        $wmiMics = @(Get-WmiObject Win32_SoundDevice -ErrorAction SilentlyContinue |
          Where-Object { $_.Availability -ne $null })
        foreach ($d in $wmiMics) {
          $dName   = if ($d.Name)   { $d.Name }   else { "Unknown" }
          $dStatus = if ($d.Status) { $d.Status } else { "Unknown" }
          $micDevices += [ordered]@{
            name   = $dName
            status = $dStatus
          }
        }
      } catch {}

      # Check System.Speech availability
      $speechAvailable = $false
      try {
        Add-Type -AssemblyName System.Speech -ErrorAction SilentlyContinue
        $speechAvailable = $true
      } catch {}

      # Check Windows Audio service
      $audioServiceRunning = $false
      try {
        $svc = Get-Service -Name AudioSrv -ErrorAction SilentlyContinue
        $audioServiceRunning = ($svc -and $svc.Status -eq "Running")
      } catch {}

      Out-Json ([ordered]@{
        ok                  = $true
        action              = "ears-status"
        waveInDeviceCount   = $micCount
        wmiAudioDevices     = $micDevices
        systemSpeechReady   = $speechAvailable
        audioServiceRunning = $audioServiceRunning
        listenMethod        = if ($speechAvailable) { "System.Speech.Recognition" } else { "unavailable" }
        timestamp           = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
      })
    }

    "ears-listen" {
      $runRoot      = New-RunRoot "ears-listen"
      $durationMs   = if ($null -ne $Request.durationMs) { [int]$Request.durationMs } else { 3000 }
      $bounded      = if ($null -ne $Request.bounded)    { [bool]$Request.bounded   } else { $true }

      # Cap bounded duration to 10 seconds per BOOK-55 recording law
      if ($bounded -and $durationMs -gt 10000) { $durationMs = 10000 }

      try {
        Add-Type -AssemblyName System.Speech -ErrorAction Stop

        $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $grammar    = New-Object System.Speech.Recognition.DictationGrammar
        $recognizer.LoadGrammar($grammar)
        $recognizer.SetInputToDefaultAudioDevice()

        $transcript = $null
        $confidence = $null
        $eventFired = $false

        $handler = [System.Speech.Recognition.SpeechRecognizedEventHandler]{
          param($src, $e)
          $transcript = $e.Result.Text
          $confidence = $e.Result.Confidence
          $eventFired = $true
        }
        $recognizer.add_SpeechRecognized($handler)

        $recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
        $start = Get-Date
        while (-not $eventFired -and ((Get-Date) - $start).TotalMilliseconds -lt $durationMs) {
          Start-Sleep -Milliseconds 100
        }
        $recognizer.RecognizeAsyncStop()
        $recognizer.Dispose()

        $transcriptFile = Join-Path $runRoot "transcript.txt"
        if ($transcript) { Set-Content -LiteralPath $transcriptFile -Value $transcript -Encoding UTF8 }

        Out-Json ([ordered]@{
          ok             = $true
          action         = "ears-listen"
          bounded        = $bounded
          durationMs     = $durationMs
          eventCaptured  = $eventFired
          transcript     = $transcript
          confidence     = $confidence
          transcriptFile = if ($transcript) { $transcriptFile } else { $null }
          runRoot        = $runRoot
          listenMethod   = "System.Speech.Recognition"
          timestamp      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        })
      } catch {
        Out-Json ([ordered]@{
          ok      = $false
          action  = "ears-listen"
          error   = $_.Exception.Message
          runRoot = $runRoot
        })
      }
    }

    # ─── End Camera / Ears Handlers ───────────────────────────────────────────

    default {
      throw "Unknown action: $Action"
    }
  }
}
catch {
  Out-Json ([ordered]@{
    ok = $false
    tool = "runtime.error"
    action = $Action
    error = $_.Exception.Message
  })
}
