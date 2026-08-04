# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::VALIDATION::VALIDATE_AGENT_LEE_CAMERA_PHYSICAL_EYES
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Diagnostic-first proof for the Leeway-owned physical camera eyes bridge.

[CmdletBinding()]
param(
  [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
  [switch]$NoExitOnFail,
  [switch]$VerboseRaw,
  [switch]$SkipSpeak,
  [switch]$SkipHumanConfirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RuntimeUrl = "http://127.0.0.1:8091"
$StatusUrl = "$RuntimeUrl/runtime/vision/camera/status"
$OpenUrl = "$RuntimeUrl/runtime/vision/camera/open"
$SnapshotUrl = "$RuntimeUrl/runtime/vision/camera/snapshot"
$AnalyzeUrl = "$RuntimeUrl/runtime/vision/camera/analyze-snapshot"
$StopUrl = "$RuntimeUrl/runtime/vision/camera/stop"
$SpeakUrl = "$RuntimeUrl/runtime/speak"
$ReceiptDir = Join-Path $Root "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-camera-physical-eyes-proof-$Stamp.json"
$CameraConfirm = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"
$DesktopConfirm = "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
$VisionBackend = "qwen2.5vl:7b"
$OfficialLaunch = ($env:AGENT_LEE_OFFICIAL_PROOF_LAUNCH -eq "1") -and (($env:AGENT_LEE_CHAT_ORIGIN | ForEach-Object { [string]$_ }) -eq "vscode_chat")
$ControlSurface = if ($OfficialLaunch) { "vscode_chat" } else { "diagnostic_terminal" }

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

function Has-StaleTimeoutText {
  param([string]$Text)
  return [bool]($Text -match 'downstream model backend did not respond|request timed out|Backend note')
}

function Save-Receipt {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)]$Report
  )

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
  $Report | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
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
      try {
        $probe.statusCode = [int]$_.Exception.Response.StatusCode
        $probe.rawBody = Read-ErrorBody -Exception $_.Exception
      } catch {}
    }
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
  Write-Host "Status: $state"
  Write-Host "HTTP: $($Case.statusCode)"
  Write-Host "Endpoint: $($Case.endpoint)"
  Write-Host "responseMode: $($Case.responseMode)"
  Write-Host "selectedBackend: $($Case.selectedBackend)"
  Write-Host "fallbackUsed: $($Case.fallbackUsed)"
  Write-Host "timeout: $($Case.timeout)"
  Write-Host "rawStaleTimeoutText: $($Case.rawStaleTimeoutText)"
  Write-Host "snapshotPath: $($Case.snapshotPath)"
  Write-Host "snapshotBytes: $($Case.snapshotBytes)"
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

function New-Receipt {
  param(
    [string]$Status = "STARTED",
    [string]$Error = $null
  )

  return [ordered]@{
    schema = "leeway.agent-lee.camera-physical-eyes-proof.v1"
    status = $Status
    lock = "AGENT_LEE_PHYSICAL_CAMERA_EYES_LOCKED"
    controlSurface = $ControlSurface
    originProof = [ordered]@{
      vscodeChat = [bool]$OfficialLaunch
      adapterPort = 8787
      routerPort = 8080
      runtimeFabric = $true
      desktopRuntimePort = 8091
      notCodex = [bool]$OfficialLaunch
      notDirectPowerShell = [bool]$OfficialLaunch
      notDirectBrowserOnly = [bool]$OfficialLaunch
    }
    camera = [ordered]@{
      bridge = "leeway_camera_bridge"
      cameraPermissionRequired = $true
      cameraPermissionResult = "unknown"
      snapshotPath = ""
      snapshotBytes = 0
      cameraActiveMs = 0
    }
    vision = [ordered]@{
      backend = $VisionBackend
      responseMode = ""
      selectedBackend = ""
      fallbackUsed = $false
      timeout = $false
      analysisText = ""
    }
    speech = [ordered]@{
      spoken = $false
      runRoot = ""
      file = ""
      playback = [ordered]@{}
    }
    safety = [ordered]@{
      noSilentCapture = $true
      explicitConsent = $true
      localOnly = $true
      noIdentityRecognition = $true
    }
    ok = $false
    error = $Error
    startedAt = (Get-Date).ToString("o")
    endedAt = $null
    cases = @()
    failedCases = @()
    summary = [ordered]@{}
    receiptPath = $ReceiptPath
  }
}

$Report = New-Receipt
$overallOk = $false
$statusLine = "FAIL"
$humanConfirmed = $null

try {
  $cases = @()

  $status = Invoke-AgentLeeProbe -Name "camera_status" -Method GET -Url $StatusUrl -TimeoutSec 90 -VerboseRaw:$VerboseRaw
  $cases += [pscustomobject]@{
    caseId = "camera_status"
    endpoint = "/runtime/vision/camera/status"
    ok = ($status.ok -and $status.statusCode -eq 200 -and [bool](Get-NestedFirstValue -InputObject $status.parsed -Paths @("ok", "result.ok", "agentLeeTurbo.ok", "agentLeeTurbo.trace.ok")))
    statusCode = $status.statusCode
    responseMode = [string](Get-NestedFirstValue -InputObject $status.parsed -Paths @("responseMode", "result.responseMode", "agentLeeTurbo.responseMode", "trace.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $status.parsed -Paths @("selectedBackend", "result.selectedBackend", "agentLeeTurbo.selectedBackend", "trace.selectedBackend"))
    fallbackUsed = [bool](Get-NestedFirstValue -InputObject $status.parsed -Paths @("fallbackUsed", "result.fallbackUsed", "agentLeeTurbo.fallbackUsed", "trace.fallbackUsed"))
    timeout = [bool](Get-NestedFirstValue -InputObject $status.parsed -Paths @("timeout", "result.timeout", "agentLeeTurbo.timeout", "trace.timeout"))
    content = $status.rawBody
    snapshotPath = [string](Get-NestedFirstValue -InputObject $status.parsed -Paths @("snapshotPath", "result.snapshotPath", "agentLeeTurbo.snapshotPath", "trace.snapshotPath"))
    snapshotBytes = [int](Get-NestedFirstValue -InputObject $status.parsed -Paths @("snapshotBytes", "result.snapshotBytes", "agentLeeTurbo.snapshotBytes", "trace.snapshotBytes"))
    rawBody = $status.rawBody
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $status.rawBody
    error = $status.error
  }

  $open = Invoke-AgentLeeProbe -Name "camera_open" -Method POST -Url $OpenUrl -Body @{
    confirm = $CameraConfirm
    permissionMode = "auto"
    controlSurface = $ControlSurface
  } -TimeoutSec 180 -VerboseRaw:$VerboseRaw
  $openState = Get-NestedFirstValue -InputObject $open.parsed -Paths @("permissionResult", "result.permissionResult", "cameraPermissionResult", "agentLeeTurbo.cameraPermissionResult", "trace.cameraPermissionResult")
  $cases += [pscustomobject]@{
    caseId = "camera_open"
    endpoint = "/runtime/vision/camera/open"
    ok = ($open.ok -and $open.statusCode -eq 200 -and ([string]$openState -ne "denied"))
    statusCode = $open.statusCode
    responseMode = [string](Get-NestedFirstValue -InputObject $open.parsed -Paths @("responseMode", "result.responseMode", "agentLeeTurbo.responseMode", "trace.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $open.parsed -Paths @("selectedBackend", "result.selectedBackend", "agentLeeTurbo.selectedBackend", "trace.selectedBackend"))
    fallbackUsed = [bool](Get-NestedFirstValue -InputObject $open.parsed -Paths @("fallbackUsed", "result.fallbackUsed", "agentLeeTurbo.fallbackUsed", "trace.fallbackUsed"))
    timeout = [bool](Get-NestedFirstValue -InputObject $open.parsed -Paths @("timeout", "result.timeout", "agentLeeTurbo.timeout", "trace.timeout"))
    content = $open.rawBody
    snapshotPath = [string](Get-NestedFirstValue -InputObject $open.parsed -Paths @("snapshotPath", "result.snapshotPath", "agentLeeTurbo.snapshotPath", "trace.snapshotPath"))
    snapshotBytes = [int](Get-NestedFirstValue -InputObject $open.parsed -Paths @("snapshotBytes", "result.snapshotBytes", "agentLeeTurbo.snapshotBytes", "trace.snapshotBytes"))
    rawBody = $open.rawBody
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $open.rawBody
    error = $open.error
  }

  $snapshot = Invoke-AgentLeeProbe -Name "camera_snapshot" -Method POST -Url $SnapshotUrl -Body @{
    confirm = $CameraConfirm
    autoStart = $true
    controlSurface = $ControlSurface
    permissionMode = "auto"
  } -TimeoutSec 240 -VerboseRaw:$VerboseRaw
  $snapshotPath = [string](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("snapshotPath", "result.snapshotPath", "agentLeeTurbo.snapshotPath", "trace.snapshotPath"))
  $snapshotBytes = [int](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("snapshotBytes", "result.snapshotBytes", "agentLeeTurbo.snapshotBytes", "trace.snapshotBytes"))
  $cases += [pscustomobject]@{
    caseId = "camera_snapshot"
    endpoint = "/runtime/vision/camera/snapshot"
    ok = ($snapshot.ok -and $snapshot.statusCode -eq 200 -and (Test-Path -LiteralPath $snapshotPath) -and $snapshotBytes -gt 0)
    statusCode = $snapshot.statusCode
    responseMode = [string](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("responseMode", "result.responseMode", "agentLeeTurbo.responseMode", "trace.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("selectedBackend", "result.selectedBackend", "agentLeeTurbo.selectedBackend", "trace.selectedBackend"))
    fallbackUsed = [bool](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("fallbackUsed", "result.fallbackUsed", "agentLeeTurbo.fallbackUsed", "trace.fallbackUsed"))
    timeout = [bool](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("timeout", "result.timeout", "agentLeeTurbo.timeout", "trace.timeout"))
    content = $snapshot.rawBody
    snapshotPath = $snapshotPath
    snapshotBytes = $snapshotBytes
    rawBody = $snapshot.rawBody
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $snapshot.rawBody
    error = $snapshot.error
  }

  $analyze = Invoke-AgentLeeProbe -Name "camera_analyze" -Method POST -Url $AnalyzeUrl -Body @{
    confirm = $CameraConfirm
    controlSurface = $ControlSurface
    snapshotPath = $snapshotPath
    prompt = "Describe the visible environment, objects, lighting, and any visible screen context. Do not identify people by name."
    speakSummary = (-not $SkipSpeak)
    visionBackend = $VisionBackend
  } -TimeoutSec 420 -VerboseRaw:$VerboseRaw
  $analysisText = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("analysisText", "result.analysisText", "vision.analysisText", "agentLeeTurbo.analysisText", "trace.analysisText"))
  $analyzeReceipt = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("receiptPath", "result.receiptPath", "agentLeeTurbo.receiptPath", "trace.receiptPath"))
  $cases += [pscustomobject]@{
    caseId = "camera_analyze"
    endpoint = "/runtime/vision/camera/analyze-snapshot"
    ok = ($analyze.ok -and $analyze.statusCode -eq 200 -and -not [string]::IsNullOrWhiteSpace($analysisText) -and -not (Has-StaleTimeoutText -Text ($analyze.rawBody + "`n" + $analysisText)))
    statusCode = $analyze.statusCode
    responseMode = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("responseMode", "result.responseMode", "vision.responseMode", "agentLeeTurbo.responseMode", "trace.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("selectedBackend", "result.selectedBackend", "vision.selectedBackend", "agentLeeTurbo.selectedBackend", "trace.selectedBackend"))
    fallbackUsed = [bool](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("fallbackUsed", "result.fallbackUsed", "vision.fallbackUsed", "agentLeeTurbo.fallbackUsed", "trace.fallbackUsed"))
    timeout = [bool](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("timeout", "result.timeout", "vision.timeout", "agentLeeTurbo.timeout", "trace.timeout"))
    content = $analysisText
    snapshotPath = $snapshotPath
    snapshotBytes = $snapshotBytes
    rawBody = $analyze.rawBody
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $analyze.rawBody
    error = $analyze.error
    receiptPath = $analyzeReceipt
  }

  $stop = Invoke-AgentLeeProbe -Name "camera_stop" -Method POST -Url $StopUrl -Body @{
    confirm = $CameraConfirm
    controlSurface = $ControlSurface
  } -TimeoutSec 120 -VerboseRaw:$VerboseRaw
  $cases += [pscustomobject]@{
    caseId = "camera_stop"
    endpoint = "/runtime/vision/camera/stop"
    ok = ($stop.ok -and $stop.statusCode -eq 200)
    statusCode = $stop.statusCode
    responseMode = [string](Get-NestedFirstValue -InputObject $stop.parsed -Paths @("responseMode", "result.responseMode", "agentLeeTurbo.responseMode", "trace.responseMode"))
    selectedBackend = [string](Get-NestedFirstValue -InputObject $stop.parsed -Paths @("selectedBackend", "result.selectedBackend", "agentLeeTurbo.selectedBackend", "trace.selectedBackend"))
    fallbackUsed = [bool](Get-NestedFirstValue -InputObject $stop.parsed -Paths @("fallbackUsed", "result.fallbackUsed", "agentLeeTurbo.fallbackUsed", "trace.fallbackUsed"))
    timeout = [bool](Get-NestedFirstValue -InputObject $stop.parsed -Paths @("timeout", "result.timeout", "agentLeeTurbo.timeout", "trace.timeout"))
    content = $stop.rawBody
    snapshotPath = $snapshotPath
    snapshotBytes = $snapshotBytes
    rawBody = $stop.rawBody
    rawStaleTimeoutText = Has-StaleTimeoutText -Text $stop.rawBody
    error = $stop.error
  }

  if (-not $SkipHumanConfirm) {
    $humanConfirmed = Read-Host "Did Agent Lee capture the intended live camera view and speak the summary? Type YES to confirm"
  }

  $Report.cases = @($cases)
  $Report.failedCases = @($cases | Where-Object { -not $_.ok } | ForEach-Object { $_.caseId })
  $Report.camera.cameraPermissionResult = [string](Get-NestedFirstValue -InputObject $open.parsed -Paths @("permissionResult", "result.permissionResult", "cameraPermissionResult", "agentLeeTurbo.cameraPermissionResult", "trace.cameraPermissionResult"))
  if ([string]::IsNullOrWhiteSpace($Report.camera.cameraPermissionResult)) {
    $Report.camera.cameraPermissionResult = "unknown"
  }
  $Report.camera.snapshotPath = $snapshotPath
  $Report.camera.snapshotBytes = $snapshotBytes
  $Report.camera.cameraActiveMs = [int](Get-NestedFirstValue -InputObject $snapshot.parsed -Paths @("cameraActiveMs", "result.cameraActiveMs", "agentLeeTurbo.cameraActiveMs", "trace.cameraActiveMs"))
  $Report.vision.backend = $VisionBackend
  $Report.vision.responseMode = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("responseMode", "result.responseMode", "vision.responseMode", "agentLeeTurbo.responseMode", "trace.responseMode"))
  $Report.vision.selectedBackend = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("selectedBackend", "result.selectedBackend", "vision.selectedBackend", "agentLeeTurbo.selectedBackend", "trace.selectedBackend"))
  $Report.vision.fallbackUsed = [bool](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("fallbackUsed", "result.fallbackUsed", "vision.fallbackUsed", "agentLeeTurbo.fallbackUsed", "trace.fallbackUsed"))
  $Report.vision.timeout = [bool](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("timeout", "result.timeout", "vision.timeout", "agentLeeTurbo.timeout", "trace.timeout"))
  $Report.vision.analysisText = $analysisText
  $Report.speech.spoken = [bool](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("speech.spoken", "result.speech.spoken", "agentLeeTurbo.speech.spoken", "trace.speech.spoken"))
  $Report.speech.runRoot = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("speech.runRoot", "result.speech.runRoot", "agentLeeTurbo.speech.runRoot", "trace.speech.runRoot"))
  $Report.speech.file = [string](Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("speech.file", "result.speech.file", "agentLeeTurbo.speech.file", "trace.speech.file"))
  $Report.speech.playback = Get-NestedFirstValue -InputObject $analyze.parsed -Paths @("speech.playback", "result.speech.playback", "agentLeeTurbo.speech.playback", "trace.speech.playback")
  if (-not $Report.speech.playback) {
    $Report.speech.playback = [ordered]@{}
  }
  $Report.ok = ($Report.failedCases.Count -eq 0)

  if (-not $OfficialLaunch) {
    $statusLine = "DIAGNOSTIC_ONLY_NOT_OFFICIAL"
  } elseif ($Report.ok -and $SkipHumanConfirm) {
    $statusLine = "PASS_MACHINE_ONLY"
  } elseif ($Report.ok -and ($humanConfirmed -eq "YES")) {
    $statusLine = "PASS"
  } elseif ($Report.ok) {
    $statusLine = "PASS_MACHINE_ONLY"
  } else {
    $statusLine = "FAIL"
  }
} catch {
  $statusLine = if (-not $OfficialLaunch) { "DIAGNOSTIC_ONLY_NOT_OFFICIAL" } else { "FAIL" }
  $Report.error = $_.Exception.Message
  $Report.ok = $false
} finally {
  $Report.status = $statusLine
  $Report.endedAt = (Get-Date).ToString("o")
  $Report.summary = [ordered]@{
    total = @($Report.cases).Count
    passed = @($Report.cases | Where-Object { $_.ok }).Count
    failed = @($Report.cases | Where-Object { -not $_.ok }).Count
    humanConfirmed = $humanConfirmed
    officialLaunch = $OfficialLaunch
  }

  try {
    Save-Receipt -Path $ReceiptPath -Report $Report
  } catch {
    $fallback = [ordered]@{
      schema = $Report.schema
      status = "FAIL"
      lock = $Report.lock
      error = "Receipt write failed: $($_.Exception.Message)"
      receiptPath = $ReceiptPath
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
    Write-CaseSummary -Case $case -VerboseRaw:$VerboseRaw
  }
  Write-Host "`nReceipt saved to: $ReceiptPath" -ForegroundColor Cyan

  if ($NoExitOnFail) {
    exit 0
  }

  if ($statusLine -eq "FAIL") {
    exit 1
  }

  exit 0
}
