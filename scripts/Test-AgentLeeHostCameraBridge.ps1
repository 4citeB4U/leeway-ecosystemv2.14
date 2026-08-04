[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root        = Get-LeewayWorkspaceRoot
$Stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath  = Join-Path $Root "Archive\reports\agent-lee-host-camera-bridge-report.json"
$ReceiptPath = Join-Path $Root "Archive\receipts\agent-lee-vision\agent-lee-camera-frame-$Stamp.json"
$ProofDir    = Join-Path $Root "Archive\proofs\agent-lee-camera"
$RawPath     = Join-Path $ProofDir "agent-lee-camera-bridge-raw-$Stamp.json"
$PngPath     = Join-Path $ProofDir "agent-lee-camera-frame-$Stamp.png"

New-LeewayDirectory -Path $ProofDir | Out-Null

$governingStandards = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
)

$DesktopBase   = "http://127.0.0.1:8091"
$blockers      = @()
$truthLabels   = @("NO_FAKE_PASS", "AUTHORIZATION_USED:I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE")
$proofArtifacts= @()

# ── Step 1: Desktop Runtime live check — USE /status NOT /health ──────────────
# CORRECTION: Desktop Runtime returns 404 on /health. Correct probe is /status.
$healthProbe  = Invoke-LeewayHttp -Url "$DesktopBase/health"  -TimeoutSec 5
$statusProbe  = Invoke-LeewayHttp -Url "$DesktopBase/status"  -TimeoutSec 5
$runtimeLive  = $statusProbe.ok

$probeNote = "NOTE: /health returns 404 in Desktop Runtime - this is expected. /status is the correct liveness probe."
if (-not $runtimeLive) {
    $blockers    += "BLOCKED_RUNTIME: Desktop Runtime /status not reachable on 8091. Error: $($statusProbe.error)"
    $truthLabels += "DESKTOP_RUNTIME_OFFLINE"
} else {
    $truthLabels += "DESKTOP_RUNTIME_LIVE_VIA_STATUS_ROUTE"
}

# ── Step 2: Enumerate camera devices (Windows PnP) ───────────────────────────
$cameras      = @()
$cameraError  = $null
try {
    $cameras = @(Get-PnpDevice -Class Camera -ErrorAction Stop |
        Select-Object FriendlyName, InstanceId, Status)
} catch {
    $cameraError = $_.Exception.Message
    try {
        $cameras = @(Get-WmiObject -Query "SELECT * FROM Win32_PnPEntity WHERE PNPClass='Camera'" -ErrorAction SilentlyContinue |
            Select-Object Name, DeviceID, Status)
    } catch { $cameraError += " | WMI fallback: " + $_.Exception.Message }
}
$cameraCount = $cameras.Count
$deviceFound = $cameraCount -gt 0
if ($deviceFound) { $truthLabels += "CAMERA_DEVICE_FOUND:$cameraCount" }
else { $blockers += "BLOCKED_HARDWARE: No camera device found via PnP or WMI." }

# ── Step 3: Check Desktop Runtime camera routes (actual route inventory) ──────
$routes       = @()
$routeMap     = [ordered]@{}
if ($runtimeLive) {
    try {
        $parsed = $statusProbe.parsed
        if ($parsed.routes) { $routes = @($parsed.routes) }
    } catch {}
}

$cameraStatusExists  = @($routes | Where-Object { $_ -match "/camera/status" }).Count -gt 0
$cameraCaptureExists = @($routes | Where-Object { $_ -match "/camera/capture" }).Count -gt 0

# Also probe directly to confirm
$cameraStatusProbe  = Invoke-LeewayHttp -Url "$DesktopBase/camera/status"  -TimeoutSec 5
$cameraCaptureProbe = Invoke-LeewayHttp -Url "$DesktopBase/camera/capture" -TimeoutSec 5

$cameraStatusReachable  = ($cameraStatusProbe.ok  -or $cameraStatusProbe.statusCode -in @(400,405,422,403))
$cameraCaptureReachable = ($cameraCaptureProbe.ok -or $cameraCaptureProbe.statusCode -in @(400,405,422,403))

$routeMap["camera_status_in_manifest"]  = $cameraStatusExists
$routeMap["camera_capture_in_manifest"] = $cameraCaptureExists
$routeMap["camera_status_probe"]        = $cameraStatusProbe
$routeMap["camera_capture_probe"]       = $cameraCaptureProbe

# ── Step 4: Attempt frame capture ────────────────────────────────────────────
$captureOk   = $false
$imageBytes  = 0
$captureError= $null

if ($cameraCaptureReachable -and $cameraCaptureProbe.ok) {
    # Desktop Runtime responded with image data
    if ($cameraCaptureProbe.rawBody -and $cameraCaptureProbe.rawBody.Length -gt 100) {
        try {
            $imgBytes  = [System.Text.Encoding]::UTF8.GetBytes($cameraCaptureProbe.rawBody)
            [System.IO.File]::WriteAllBytes($PngPath, $imgBytes)
            $imageBytes = $imgBytes.Length
            $captureOk  = $true
            $truthLabels += "CAMERA_FRAME_CAPTURED_VIA_DESKTOP_RUNTIME"
            $proofArtifacts += $PngPath
        } catch { $captureError = "Failed saving frame: " + $_.Exception.Message }
    }
}

if (-not $captureOk) {
    # WIA fallback
    try {
        $wia = New-Object -ComObject WIA.DeviceManager -ErrorAction Stop
        $cameraWia = $null
        for ($i = 1; $i -le $wia.DeviceInfos.Count; $i++) {
            $dev = $wia.DeviceInfos.Item($i)
            if ($dev.Type -eq 2) { $cameraWia = $dev; break }
        }
        if ($cameraWia) {
            $conn  = $cameraWia.Connect()
            $items = $conn.Items
            if ($items.Count -gt 0) {
                $image = $items.Item(1).Transfer("{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}")
                $image.SaveFile($PngPath)
                if (Test-Path $PngPath) {
                    $imageBytes = (Get-Item $PngPath).Length
                    $captureOk  = $imageBytes -gt 0
                    if ($captureOk) { $truthLabels += "CAMERA_FRAME_CAPTURED_VIA_WIA"; $proofArtifacts += $PngPath }
                }
            }
        } else { $captureError = "WIA: No camera-type device (type=2) accessible." }
    } catch { $captureError = "WIA capture failed: " + $_.Exception.Message }
}

if (-not $captureOk) {
    if (-not $cameraCaptureExists -and -not $cameraCaptureReachable) {
        $blockers += "BLOCKED_RUNTIME: /camera/capture route does not exist in Desktop Runtime. Camera bridge not deployed. Deploy Leeway Camera Bridge or add /camera/capture to Desktop Runtime node server."
    }
    $blockers += "BLOCKED_RUNTIME: Camera frame not captured. Desktop Runtime camera route missing, WIA inaccessible. captureError: $captureError"
    $truthLabels += "CAMERA_FRAME_NOT_CAPTURED"
}

# ── Step 5: Determine lane status ─────────────────────────────────────────────
$laneStatus = if ($captureOk) {
    "PROVEN_READY"
} elseif ($deviceFound -and $runtimeLive) {
    "PARTIAL_WITH_EXACT_BLOCKER"
} elseif ($deviceFound) {
    "PARTIAL_WITH_EXACT_BLOCKER"
} elseif (-not $deviceFound) {
    "BLOCKED_HARDWARE"
} else {
    "BLOCKED_RUNTIME"
}

$actualProofLevel   = if ($captureOk) { "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME" } elseif ($deviceFound -and $runtimeLive) { "PROOF_LEVEL_2_COMMAND_VALIDATION" } elseif ($deviceFound) { "PROOF_LEVEL_1_STATIC_VALIDATION" } else { "PROOF_LEVEL_0_DOCUMENT" }
$requiredProofLevel = "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME"

# ── Step 6: Write raw proof ───────────────────────────────────────────────────
$rawProof = [ordered]@{
    proofId              = "agent-lee-camera-bridge-raw-$Stamp"
    capturedAt           = (Get-Date).ToUniversalTime().ToString("o")
    authorization        = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"
    probeNote            = $probeNote
    healthProbe          = $healthProbe
    statusProbe          = $statusProbe
    runtimeLive          = $runtimeLive
    deviceFound          = $deviceFound
    cameraCount          = $cameraCount
    cameraDevices        = $cameras
    cameraError          = $cameraError
    routeManifest        = $routes
    cameraStatusExists   = $cameraStatusExists
    cameraCaptureExists  = $cameraCaptureExists
    cameraStatusProbe    = $cameraStatusProbe
    cameraCaptureProbe   = $cameraCaptureProbe
    captureOk            = $captureOk
    imageBytes           = $imageBytes
    imagePath            = if ($captureOk) { $PngPath } else { $null }
    captureError         = $captureError
    blockers             = $blockers
    truthLabels          = $truthLabels
}
Write-LeewayJson -Path $RawPath -Object $rawProof | Out-Null
$proofArtifacts += $RawPath

# ── Step 7: Write report and receipt ─────────────────────────────────────────
$result = [ordered]@{
    reportId               = "agent-lee-host-camera-bridge-$Stamp"
    generatedAt            = (Get-Date).ToUniversalTime().ToString("o")
    assistantBodyRole      = "CODEX_ASSISTANT_BODY"
    assistantObjectId      = "LEEWAY-ASSISTANT-0002"
    governingStandardsRead = $governingStandards
    authorization          = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"
    laneId                 = "HOST_CAMERA_BRIDGE"
    laneStatus             = $laneStatus
    requiredProofLevel     = $requiredProofLevel
    actualProofLevel       = $actualProofLevel
    runtimeLive            = $runtimeLive
    deviceFound            = $deviceFound
    cameraCount            = $cameraCount
    cameraStatusExists     = $cameraStatusExists
    cameraCaptureExists    = $cameraCaptureExists
    captureOk              = $captureOk
    imageBytes             = $imageBytes
    imagePath              = if ($captureOk) { $PngPath } else { $null }
    rawProofPath           = $RawPath
    proofArtifacts         = $proofArtifacts
    blockers               = $blockers
    truthLabels            = $truthLabels
    receiptsWritten        = @($ReceiptPath)
    reportsWritten         = @($ReportPath)
}
Write-LeewayJson -Path $ReportPath  -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

Write-Host "=== Host Camera Bridge Proof ==="
Write-Host "Desktop Runtime live  : $runtimeLive (via /status)"
Write-Host "Health probe note     : $probeNote"
Write-Host "Camera devices found  : $deviceFound ($cameraCount)"
Write-Host "Camera/status route   : $cameraStatusExists (probe: $cameraStatusReachable)"
Write-Host "Camera/capture route  : $cameraCaptureExists (probe: $cameraCaptureReachable)"
Write-Host "Frame captured        : $captureOk ($imageBytes bytes)"
Write-Host "Lane status           : $laneStatus"
Write-Host "Actual proof level    : $actualProofLevel"
if ($blockers.Count -gt 0) {
    Write-Host "BLOCKERS:"
    $blockers | ForEach-Object { Write-Host "  - $_" }
}
Write-Host "Raw proof             : $RawPath"
Write-Host "Receipt               : $ReceiptPath"

exit $(if ($captureOk) { 0 } else { 1 })
