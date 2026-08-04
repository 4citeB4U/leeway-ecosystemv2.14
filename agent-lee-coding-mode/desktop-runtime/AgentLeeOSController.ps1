param(
  [switch]$Loop,
  [switch]$Once,
  [string]$CommandText,
  [string]$InboxFilePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$EcosystemRoot = "D:\Leeway-Ecosystem v2.1.4"
$RuntimeProjectRoot = Join-Path $EcosystemRoot "agent-lee-coding-mode\desktop-runtime"
$RuntimeRoot = "C:\Users\Leona\LeeWay-Runtime"
$ManifestPath = Join-Path $RuntimeRoot "bridge-package\agentlee-fabric-bridge.manifest.json"
$DockerRegistryPath = Join-Path $RuntimeRoot "docker-fabric\state\agentlee-docker-endpoint-registry.json"
$OSShellStatePath = Join-Path $RuntimeRoot "docker-fabric\state\agentlee-os-shell-state.json"
$DiscoveryMasterRegistry = Join-Path $RuntimeRoot "discovery\state\leeway-master-discovery-registry.json"
$InboxDir = Join-Path $RuntimeRoot "intelligence\inbox"
$SpeechQueueDir = Join-Path $RuntimeRoot "speech\queue"
$ReceiptRoot = Join-Path $RuntimeRoot "Archive\receipts\agent-lee-os-controller"
$StatePath = Join-Path $RuntimeProjectRoot "agent-lee-os-controller-state.json"
$ControllerPidPath = Join-Path $RuntimeProjectRoot "agent-lee-os-controller.pid"

New-Item -ItemType Directory -Force -Path $InboxDir, $SpeechQueueDir, $ReceiptRoot, $RuntimeProjectRoot | Out-Null

try {
  Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
} catch {}

function Write-AgentLeeLog {
  param([string]$Message)
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$stamp] $Message"
  $logPath = Join-Path $RuntimeProjectRoot "logs\agent-lee-os-controller.log"
  New-Item -ItemType Directory -Force -Path (Split-Path $logPath -Parent) | Out-Null
  Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
  } catch {
    return $null
  }
}

function Write-JsonFile {
  param([string]$Path, $Value)
  New-Item -ItemType Directory -Force -Path (Split-Path $Path -Parent) | Out-Null
  $Value | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Load-AgentLeeControllerState {
  if (Test-Path -LiteralPath $StatePath) {
    return Read-JsonFile -Path $StatePath
  }
  return [pscustomobject]@{ processedFiles = @(); lastCommand = ""; lastReceiptPath = "" }
}

function Save-AgentLeeControllerState {
  param($State)
  Write-JsonFile -Path $StatePath -Value $State
}

function Get-AgentLeeManifest {
  if (-not (Test-Path -LiteralPath $ManifestPath)) {
    return [pscustomobject]@{ endpoints = [pscustomobject]@{ desktopRuntime = [pscustomobject]@{ baseUrl = "http://127.0.0.1:8091" }; voiceKernel = [pscustomobject]@{ baseUrl = "http://127.0.0.1:8092" }; visionKernel = [pscustomobject]@{ baseUrl = "http://127.0.0.1:8093" } }; blockers = [pscustomobject]@{ doNotRebuildVoice = $true } }
  }
  return Read-JsonFile -Path $ManifestPath
}

function Get-AgentLeeDockerRegistry {
  if (-not (Test-Path -LiteralPath $DockerRegistryPath)) {
    return $null
  }
  try {
    $registry = Read-JsonFile -Path $DockerRegistryPath
    if ($registry -and $registry.services) {
      return $registry
    }
  } catch {}
  return $null
}

function Load-LeewayDiscovery {
  if (-not (Test-Path -LiteralPath $DiscoveryMasterRegistry)) {
    Write-AgentLeeLog "WARNING: Discovery Master Registry not found at $DiscoveryMasterRegistry"
    return $null
  }
  try {
    $discovery = Read-JsonFile -Path $DiscoveryMasterRegistry
    if ($discovery -and $discovery.components) {
      Write-AgentLeeLog "Discovery loaded: $($discovery.components.Count) components registered"
      return $discovery
    }
  } catch {
    Write-AgentLeeLog "ERROR loading discovery: $_"
  }
  return $null
}

function Get-ServiceEndpoint {
  param([string]$ServiceKey, $Registry, $Manifest)
  
  if ($null -ne $Registry -and $Registry.services) {
    $service = $Registry.services | Where-Object { $_.key -eq $ServiceKey }
    if ($service -and $service.baseUrl) {
      return $service.baseUrl
    }
  }
  
  if ($null -ne $Manifest -and $Manifest.endpoints) {
    $endpoint = $Manifest.endpoints.$ServiceKey
    if ($endpoint -and $endpoint.baseUrl) {
      return $endpoint.baseUrl
    }
  }
  
  return $null
}

function Invoke-AgentLeeJsonRequest {
  param([Parameter(Mandatory=$true)][string]$Method, [Parameter(Mandatory=$true)][string]$Url, $Body = $null, [int]$TimeoutSec = 30)
  $payload = $null
  if ($null -ne $Body) {
    $payload = $Body | ConvertTo-Json -Depth 20
  }
  try {
    $response = Invoke-RestMethod -Method $Method -Uri $Url -ContentType "application/json" -Body $payload -TimeoutSec $TimeoutSec -ErrorAction Stop
    return [pscustomobject]@{ ok = $true; statusCode = 200; response = $response }
  } catch {
    return [pscustomobject]@{ ok = $false; statusCode = 0; response = $null; error = $_.Exception.Message }
  }
}

function Get-AgentLeeDockerInventory {
  $lines = @()
  try {
    $lines = & docker.exe ps --format "{{.Names}}|{{.Image}}|{{.Status}}" 2>$null
  } catch {}
  return @($lines | Where-Object { $_ })
}

function Get-AgentLeeCommandTextFromInboxFile {
  param([string]$FilePath)
  if (-not (Test-Path -LiteralPath $FilePath)) { return "" }
  try {
    $raw = Get-Content -LiteralPath $FilePath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return "" }
    try {
      $obj = $raw | ConvertFrom-Json -ErrorAction Stop
      foreach ($candidate in @($obj.text, $obj.command, $obj.commandText, $obj.message, $obj.transcript)) {
        if (-not [string]::IsNullOrWhiteSpace([string]$candidate)) { return [string]$candidate }
      }
    } catch {}
    return $raw.Trim()
  } catch {
    return ""
  }
}

function Parse-AgentLeeIntent {
  param([string]$CommandText)
  $safeCommandText = if ($null -ne $CommandText) { [string]$CommandText } else { "" }
  $text = $safeCommandText.Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($text)) { return [pscustomobject]@{ intent = "unknown"; appName = $null; confidence = 0 } }
  if ($text -match "are you there") { return [pscustomobject]@{ intent = "presence"; appName = $null; confidence = 1 } }
  if ($text -match "open notepad") { return [pscustomobject]@{ intent = "open_app"; appName = "notepad"; confidence = 1 } }
  if ($text -match "open calculator") { return [pscustomobject]@{ intent = "open_app"; appName = "calculator"; confidence = 1 } }
  if ($text -match "move the mouse|move the cursor") { return [pscustomobject]@{ intent = "move_cursor"; appName = $null; confidence = 1 } }
  if ($text -match "click") { return [pscustomobject]@{ intent = "click"; appName = $null; confidence = 1 } }
  if ($text -match "can you see me|what do you see|camera status") { return [pscustomobject]@{ intent = "vision"; appName = $null; confidence = 1 } }
  if ($text -match "runtime status") { return [pscustomobject]@{ intent = "runtime_status"; appName = $null; confidence = 1 } }
  return [pscustomobject]@{ intent = "unknown"; appName = $null; confidence = 0 }
}

function Invoke-AgentLeeSpeech {
  param([string]$Text, [string]$Source = "agent-lee-os-controller")
  $manifest = Get-AgentLeeManifest
  $registry = Get-AgentLeeDockerRegistry
  $voiceBase = Get-ServiceEndpoint -ServiceKey "voiceKernel" -Registry $registry -Manifest $manifest
  
  if (-not $voiceBase) {
    return [pscustomobject]@{ ok = $false; error = "Voice kernel endpoint not found in registry or manifest" }
  }
  
  $queueItem = [ordered]@{
    timestamp = (Get-Date).ToString("o")
    text = $Text
    source = $Source
    policy = "XTTS_CLONED_VOICE_ONLY_DO_NOT_REBUILD"
    status = "queued"
  }
  $queuePath = Join-Path $SpeechQueueDir ("agent-lee-os-controller-" + [guid]::NewGuid().ToString() + ".json")
  Write-JsonFile -Path $queuePath -Value $queueItem

  $ttsRequest = [ordered]@{
    text = $Text
    voice = "agent-lee"
    format = "wav"
  }
  $ttsResponse = Invoke-AgentLeeJsonRequest -Method POST -Url "$voiceBase/tts" -Body $ttsRequest -TimeoutSec 120
  $ttsError = $null
  if ($null -ne $ttsResponse -and $ttsResponse.PSObject.Properties.Name -contains 'error') {
    $ttsError = $ttsResponse.error
  }
  return [pscustomobject]@{
    ok = $ttsResponse.ok
    queuePath = $queuePath
    endpoint = "$voiceBase/tts"
    requestBody = $ttsRequest
    responseBody = $ttsResponse.response
    error = $ttsError
    noFallbackVoice = $true
  }
}

function Invoke-AgentLeeDesktopAction {
  param([string]$Intent, [string]$AppName, [string]$CommandText, [string]$SourceInboxFile)
  $manifest = Get-AgentLeeManifest
  $desktopBase = $manifest.endpoints.desktopRuntime.baseUrl
  $confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
  $blockers = @()
  $actionVerification = [ordered]@{}

  switch ($Intent) {
    "presence" {
      $response = [pscustomobject]@{ ok = $true; message = "Agent Lee is listening and ready." }
      $actionVerification = [ordered]@{ route = "presence"; verified = $true }
      return [pscustomobject]@{ response = $response; actionVerification = $actionVerification; blockers = @(); observedResult = "presence acknowledged" }
    }
    "open_app" {
      $requestBody = [ordered]@{ appName = $AppName; confirm = $confirm }
      $routeResult = Invoke-AgentLeeJsonRequest -Method POST -Url "$desktopBase/runtime/desktop/open-app" -Body $requestBody -TimeoutSec 60
      $process = Get-Process -Name $AppName -ErrorAction SilentlyContinue | Select-Object -First 1
      $actionVerification = [ordered]@{ route = "/runtime/desktop/open-app"; ok = $routeResult.ok; processExists = $null -ne $process; processId = if ($process) { $process.Id } else { $null } }
      if (-not $routeResult.ok -or -not $process) { $blockers += "desktop-app-open-not-verified" }
      return [pscustomobject]@{ response = $routeResult; actionVerification = $actionVerification; blockers = $blockers; observedResult = if ($process) { "process started" } else { "process not found" } }
    }
    "move_cursor" {
      Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue | Out-Null
      $before = [System.Windows.Forms.Cursor]::Position
      $requestBody = [ordered]@{ x = 420; y = 220; confirm = $confirm }
      $routeResult = Invoke-AgentLeeJsonRequest -Method POST -Url "$desktopBase/runtime/desktop/move-cursor" -Body $requestBody -TimeoutSec 30
      $after = [System.Windows.Forms.Cursor]::Position
      $moved = $before.X -ne $after.X -or $before.Y -ne $after.Y
      $actionVerification = [ordered]@{ route = "/runtime/desktop/move-cursor"; ok = $routeResult.ok; cursorMoved = $moved; before = [ordered]@{ x = $before.X; y = $before.Y }; after = [ordered]@{ x = $after.X; y = $after.Y } }
      if (-not $routeResult.ok -or -not $moved) { $blockers += "cursor-move-not-verified" }
      return [pscustomobject]@{ response = $routeResult; actionVerification = $actionVerification; blockers = $blockers; observedResult = if ($moved) { "cursor moved" } else { "cursor position did not change" } }
    }
    "click" {
      Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue | Out-Null
      $position = [System.Windows.Forms.Cursor]::Position
      $requestBody = [ordered]@{ x = $position.X; y = $position.Y; confirm = $confirm }
      $routeResult = Invoke-AgentLeeJsonRequest -Method POST -Url "$desktopBase/runtime/desktop/click" -Body $requestBody -TimeoutSec 30
      $actionVerification = [ordered]@{ route = "/runtime/desktop/click"; ok = $routeResult.ok; cursorPosition = [ordered]@{ x = $position.X; y = $position.Y } }
      if (-not $routeResult.ok) { $blockers += "click-route-not-verified" }
      return [pscustomobject]@{ response = $routeResult; actionVerification = $actionVerification; blockers = $blockers; observedResult = "click command sent" }
    }
    "vision" {
      $cameraStatusRoute = "$desktopBase/runtime/vision/camera/status"
      $statusResult = Invoke-AgentLeeJsonRequest -Method GET -Url $cameraStatusRoute -TimeoutSec 30
      $cameraStatus = $statusResult.response
      $lookResult = $null
      $analysisText = ""
      $blockers = @()
      if ($statusResult.ok -and $cameraStatus -and ($cameraStatus.cameraPermissionResult -eq "granted" -or $cameraStatus.cameraActive -eq $true)) {
        $lookResult = Invoke-AgentLeeJsonRequest -Method POST -Url "$desktopBase/runtime/vision/camera/look-now" -Body ([ordered]@{ confirm = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE" }) -TimeoutSec 90
      } else {
        $openResult = Invoke-AgentLeeJsonRequest -Method POST -Url "$desktopBase/runtime/vision/camera/open" -Body ([ordered]@{ confirm = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE" }) -TimeoutSec 90
        $lookResult = Invoke-AgentLeeJsonRequest -Method POST -Url "$desktopBase/runtime/vision/camera/look-now" -Body ([ordered]@{ confirm = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE" }) -TimeoutSec 90
      }
      if ($lookResult -and $lookResult.ok -and $lookResult.response) {
        $analysisText = if ($lookResult.response.analysisText) { [string]$lookResult.response.analysisText } else { "" }
      }
      if (-not $analysisText) {
        $blockers += "camera-vision-capture-blocked"
      }
      $actionVerification = [ordered]@{ route = "/runtime/vision/camera/look-now"; ok = $lookResult.ok; cameraStatus = $cameraStatus; analysisText = $analysisText }
      return [pscustomobject]@{ response = $lookResult; actionVerification = $actionVerification; blockers = $blockers; observedResult = if ($analysisText) { "vision analysis returned" } else { "vision analysis blocked" } }
    }
    "runtime_status" {
      $routeResult = Invoke-AgentLeeJsonRequest -Method GET -Url "$desktopBase/runtime/status" -TimeoutSec 30
      $actionVerification = [ordered]@{ route = "/runtime/status"; ok = $routeResult.ok; hostStatus = if ($routeResult.response) { $routeResult.response.hostStatus } else { $null } }
      return [pscustomobject]@{ response = $routeResult; actionVerification = $actionVerification; blockers = @(); observedResult = "runtime status retrieved" }
    }
    default {
      $routeResult = [pscustomobject]@{ ok = $false; error = "No matching intent" }
      return [pscustomobject]@{ response = $routeResult; actionVerification = [ordered]@{ route = "unknown"; ok = $false }; blockers = @("unknown-intent"); observedResult = "unsupported command" }
    }
  }
}

function Write-AgentLeeOSReceipt {
  param(
    [string]$CommandText,
    [string]$SourceInboxFile,
    [string]$ParsedIntent,
    [string]$RouteSelected,
    [string]$ServiceCalled,
    $RequestBody,
    $ResponseBody,
    $ActionVerification,
    [string]$ObservedResult,
    [string]$SpokenResponseText,
    $XttsReceipt,
    [string]$FinalStatus,
    [string]$Blocker
  )

  $receiptId = "agentlee-os-" + (Get-Date -Format "yyyyMMdd-HHmmss-fff") + "-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
  $receiptPath = Join-Path $ReceiptRoot ("$receiptId.json")
  $receipt = [ordered]@{
    schema = "leeway.agent-lee.os-controller.receipt.v1"
    commandText = $CommandText
    sourceInboxFile = $SourceInboxFile
    timestamp = (Get-Date).ToString("o")
    parsedIntent = $ParsedIntent
    routeSelected = $RouteSelected
    serviceCalled = $ServiceCalled
    requestBody = $RequestBody
    responseBody = $ResponseBody
    actionVerification = $ActionVerification
    observedResult = $ObservedResult
    spokenResponseText = $SpokenResponseText
    xttsReceipt = $XttsReceipt
    finalStatus = $FinalStatus
    blocker = $Blocker
    heard = $true
    routed = $true
    actionAttempted = $true
    actionVerified = ($ActionVerification -and ($ActionVerification.ok -eq $true))
    observed = (-not [string]::IsNullOrWhiteSpace([string]$ObservedResult))
    spokeWithXTTSClone = ($null -ne $XttsReceipt)
    noFallbackVoice = $true
  }
  Write-JsonFile -Path $receiptPath -Value $receipt
  return $receiptPath
}

function Invoke-AgentLeeControllerCommand {
  param([string]$CommandText, [string]$SourceInboxFile)

  $manifest = Get-AgentLeeManifest
  $intent = Parse-AgentLeeIntent -CommandText $CommandText
  $route = $null
  $serviceCalled = $null
  $requestBody = $null
  $responseBody = $null
  $actionVerification = [ordered]@{}
  $observedResult = ""
  $spokenResponseText = ""
  $blocker = $null
  $xttsReceipt = $null

  switch ($intent.intent) {
    "presence" {
      $route = "local/acknowledge"
      $serviceCalled = "controller"
      $responseBody = [pscustomobject]@{ ok = $true; message = "Agent Lee is listening and ready." }
      $observedResult = "presence acknowledged"
      $spokenResponseText = "Yes, I am here."
    }
    "open_app" {
      $route = "/runtime/desktop/open-app"
      $serviceCalled = "desktopRuntime"
      $desktopAction = Invoke-AgentLeeDesktopAction -Intent $intent.intent -AppName $intent.appName -CommandText $CommandText -SourceInboxFile $SourceInboxFile
      $requestBody = [ordered]@{ appName = $intent.appName; confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND" }
      $responseBody = $desktopAction.response
      $actionVerification = $desktopAction.actionVerification
      $observedResult = $desktopAction.observedResult
      $blocker = if ($desktopAction.blockers.Count -gt 0) { $desktopAction.blockers[0] } else { $null }
      $spokenResponseText = if ($desktopAction.actionVerification.processExists) { "I opened $($intent.appName)." } else { "I could not open $($intent.appName)." }
    }
    "move_cursor" {
      $route = "/runtime/desktop/move-cursor"
      $serviceCalled = "desktopRuntime"
      $desktopAction = Invoke-AgentLeeDesktopAction -Intent $intent.intent -AppName $null -CommandText $CommandText -SourceInboxFile $SourceInboxFile
      $requestBody = [ordered]@{ x = 420; y = 220; confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND" }
      $responseBody = $desktopAction.response
      $actionVerification = $desktopAction.actionVerification
      $observedResult = $desktopAction.observedResult
      $blocker = if ($desktopAction.blockers.Count -gt 0) { $desktopAction.blockers[0] } else { $null }
      $spokenResponseText = if ($desktopAction.actionVerification.cursorMoved) { "I moved the cursor." } else { "I could not verify the cursor move." }
    }
    "click" {
      $route = "/runtime/desktop/click"
      $serviceCalled = "desktopRuntime"
      $desktopAction = Invoke-AgentLeeDesktopAction -Intent $intent.intent -AppName $null -CommandText $CommandText -SourceInboxFile $SourceInboxFile
      $requestBody = [ordered]@{ confirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND" }
      $responseBody = $desktopAction.response
      $actionVerification = $desktopAction.actionVerification
      $observedResult = $desktopAction.observedResult
      $blocker = if ($desktopAction.blockers.Count -gt 0) { $desktopAction.blockers[0] } else { $null }
      $spokenResponseText = if ($desktopAction.actionVerification.ok) { "I clicked." } else { "I could not verify the click." }
    }
    "vision" {
      $route = "/runtime/vision/camera/look-now"
      $serviceCalled = "visionKernel"
      $desktopAction = Invoke-AgentLeeDesktopAction -Intent $intent.intent -AppName $null -CommandText $CommandText -SourceInboxFile $SourceInboxFile
      $requestBody = [ordered]@{ confirm = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE" }
      $responseBody = $desktopAction.response
      $actionVerification = $desktopAction.actionVerification
      $observedResult = $desktopAction.observedResult
      $blocker = if ($desktopAction.blockers.Count -gt 0) { $desktopAction.blockers[0] } else { $null }
      $spokenResponseText = if ($desktopAction.actionVerification.analysisText) { "I see: $($desktopAction.actionVerification.analysisText)" } else { "I could not verify the camera view." }
    }
    "runtime_status" {
      $route = "/runtime/status"
      $serviceCalled = "desktopRuntime"
      $desktopAction = Invoke-AgentLeeDesktopAction -Intent $intent.intent -AppName $null -CommandText $CommandText -SourceInboxFile $SourceInboxFile
      $requestBody = [ordered]@{ }
      $responseBody = $desktopAction.response
      $actionVerification = $desktopAction.actionVerification
      $observedResult = $desktopAction.observedResult
      $blocker = if ($desktopAction.blockers.Count -gt 0) { $desktopAction.blockers[0] } else { $null }
      $spokenResponseText = "Runtime status is available."
    }
    default {
      $route = "unknown"
      $serviceCalled = "controller"
      $observedResult = "unsupported command"
      $spokenResponseText = "I did not understand that command."
      $blocker = "unknown-intent"
    }
  }

  $xttsReceipt = Invoke-AgentLeeSpeech -Text $spokenResponseText -Source "agent-lee-os-controller"
  $receiptPath = Write-AgentLeeOSReceipt -CommandText $CommandText -SourceInboxFile $SourceInboxFile -ParsedIntent $intent.intent -RouteSelected $route -ServiceCalled $serviceCalled -RequestBody $requestBody -ResponseBody $responseBody -ActionVerification $actionVerification -ObservedResult $observedResult -SpokenResponseText $spokenResponseText -XttsReceipt $xttsReceipt -FinalStatus $(if ($blocker) { "BLOCKED" } else { "OK" }) -Blocker $blocker
  Write-AgentLeeLog "Processed '$CommandText' -> $receiptPath"

  $state = Load-AgentLeeControllerState
  $state.lastCommand = $CommandText
  $state.lastReceiptPath = $receiptPath
  $state.processedFiles = @($state.processedFiles + @($SourceInboxFile)) | Select-Object -Unique
  Save-AgentLeeControllerState -State $state
  return [pscustomobject]@{ receiptPath = $receiptPath; finalStatus = if ($blocker) { "BLOCKED" } else { "OK" }; spokenResponseText = $spokenResponseText; blocker = $blocker }
}

function Start-AgentLeeOSControllerLoop {
  param([int]$PollSeconds = 2)
  $state = Load-AgentLeeControllerState
  $processed = @($state.processedFiles)
  Set-Content -LiteralPath $ControllerPidPath -Value $PID -Encoding UTF8
  Write-AgentLeeLog "Agent Lee OS controller started."
  while ($true) {
    $files = @(Get-ChildItem -LiteralPath $InboxDir -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTimeUtc)
    foreach ($file in $files) {
      if ($processed -contains $file.FullName) { continue }
      $commandText = Get-AgentLeeCommandTextFromInboxFile -FilePath $file.FullName
      if ([string]::IsNullOrWhiteSpace($commandText)) { continue }
      try {
        Invoke-AgentLeeControllerCommand -CommandText $commandText -SourceInboxFile $file.FullName | Out-Null
      } catch {
        Write-AgentLeeLog "Controller error: $($_.Exception.Message)"
      }
      $processed += $file.FullName
      $state.processedFiles = $processed | Select-Object -Unique
      Save-AgentLeeControllerState -State $state
    }
    Start-Sleep -Seconds $PollSeconds
  }
}

if ($CommandText -or $InboxFilePath) {
  if ($InboxFilePath) {
    $actualText = if ($CommandText) { $CommandText } else { Get-AgentLeeCommandTextFromInboxFile -FilePath $InboxFilePath }
    Invoke-AgentLeeControllerCommand -CommandText $actualText -SourceInboxFile $InboxFilePath | ConvertTo-Json -Depth 20
  } else {
    Invoke-AgentLeeControllerCommand -CommandText $CommandText -SourceInboxFile $null | ConvertTo-Json -Depth 20
  }
  exit 0
}

if ($Loop -or $Once) {
  Start-AgentLeeOSControllerLoop
}