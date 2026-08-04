[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root             = Get-LeewayWorkspaceRoot
$Stamp            = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath       = Join-Path $Root "Archive\reports\agent-lee-camera-to-qwen-vision-report.json"
$ReceiptPath      = Join-Path $Root "Archive\receipts\agent-lee-vision\agent-lee-camera-to-qwen-vision-$Stamp.json"
$ProofDir         = Join-Path $Root "Archive\proofs\agent-lee-vision"
$RequestProofPath = Join-Path $ProofDir "camera-to-qwen-request-$Stamp.json"
$ResponseProofPath= Join-Path $ProofDir "camera-to-qwen-response-$Stamp.json"

New-LeewayDirectory -Path $ProofDir | Out-Null

$governingStandards = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
)

$blockers      = @()
$truthLabels   = @("NO_FAKE_PASS", "NO_IDENTIFY_PERSONS", "AUTHORIZATION_USED:I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE")
$proofArtifacts= @()

# ── Step 1: Check Vision Kernel health ──────────────────────────────────────
$BaseUrl      = "http://127.0.0.1:8093"
$healthResult = Invoke-LeewayHttp -Url "$BaseUrl/health" -TimeoutSec 8
$statusResult = Invoke-LeewayHttp -Url "$BaseUrl/vision/status" -TimeoutSec 8
$modelResult  = Invoke-LeewayHttp -Url "$BaseUrl/vision/model" -TimeoutSec 8

$visionKernelLive = $healthResult.ok
if (-not $visionKernelLive) {
    $blockers += "BLOCKED_RUNTIME: Vision Kernel is not live on port 8093. Health check failed: $($healthResult.error). Run: docker compose -f '.\agent-lee-vision-kernel\docker-compose.yml' up -d"
    $truthLabels += "VISION_KERNEL_OFFLINE"
} else {
    $truthLabels += "VISION_KERNEL_LIVE"
    $selectedModel = $null
    try { $selectedModel = $modelResult.parsed.selectedModel } catch {}
    if ($selectedModel) { $truthLabels += "MODEL:$selectedModel" }
}

# ── Step 2: Find or synthesize a camera frame ───────────────────────────────
# Look for a previously captured frame from the camera bridge proof
$CameraProofDir = Join-Path $Root "Archive\proofs\agent-lee-camera"
$latestFrame    = $null
$frameBase64    = $null
$frameSource    = $null

if (Test-Path $CameraProofDir) {
    $pngFiles = Get-ChildItem -LiteralPath $CameraProofDir -Filter "*.png" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($pngFiles) {
        $latestFrame  = $pngFiles.FullName
        $frameSource  = "camera-bridge-proof"
        $frameBytes   = [System.IO.File]::ReadAllBytes($latestFrame)
        $frameBase64  = [Convert]::ToBase64String($frameBytes)
        $truthLabels += "CAMERA_FRAME_FOUND:$($pngFiles.Name)"
    }
}

# Synthesize a minimal 1×1 white PNG as a safe test image if no real frame
# This tests the Vision Kernel → Qwen route end-to-end with a trivially safe image
if (-not $frameBase64) {
    $truthLabels  += "USING_SYNTHETIC_TEST_FRAME"
    $blockers      += "PARTIAL_WITH_EXACT_BLOCKER: No real camera frame found from Host Camera Bridge proof. Using synthetic 1x1 white PNG to test Vision Kernel → Qwen route. For full PROOF_LEVEL_4, real camera frame required."

    # Minimal valid PNG: 1x1 white pixel
    $pngBytes = [byte[]](
        0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,  # PNG signature
        0x00,0x00,0x00,0x0D,                        # IHDR length
        0x49,0x48,0x44,0x52,                        # "IHDR"
        0x00,0x00,0x00,0x01,                        # width=1
        0x00,0x00,0x00,0x01,                        # height=1
        0x08,0x02,                                   # 8-bit RGB
        0x00,0x00,0x00,                             # compression/filter/interlace
        0x90,0x77,0x53,0xDE,                        # IHDR CRC
        0x00,0x00,0x00,0x0C,                        # IDAT length
        0x49,0x44,0x41,0x54,                        # "IDAT"
        0x08,0xD7,0x63,0xF8,0xFF,0xFF,0x3F,0x00,   # deflate stream (white pixel)
        0x05,0xFE,0x02,0xFE,                        # IDAT CRC
        0xDC,0xCC,0x59,0xE7,                        # pad
        0x00,0x00,0x00,0x00,                        # IEND length
        0x49,0x45,0x4E,0x44,                        # "IEND"
        0xAE,0x42,0x60,0x82                         # IEND CRC
    )
    $frameBase64 = [Convert]::ToBase64String($pngBytes)
    $frameSource = "synthetic-1x1-white-png"
}

# ── Step 3: Build the vision analyze request ─────────────────────────────────
$visionRequest = [ordered]@{
    imageBase64 = $frameBase64
    prompt      = "Describe only non-sensitive visible scene elements (objects, lighting, environment). Do not identify or name any people. Do not infer sensitive attributes."
}
Write-LeewayJson -Path $RequestProofPath -Object $visionRequest | Out-Null
$proofArtifacts += $RequestProofPath

# ── Step 4: POST to Vision Kernel /vision/analyze/camera-frame ───────────────
$analyzeResult  = $null
$modelResponse  = $null
$routeOk        = $false

if ($visionKernelLive) {
    $analyzeResult = Invoke-LeewayHttp -Url "$BaseUrl/vision/analyze/camera-frame" -Method POST -Body $visionRequest -TimeoutSec 60
    $routeOk       = $analyzeResult.ok

    if ($routeOk) {
        $modelResponse = $analyzeResult.parsed
        $truthLabels  += "VISION_KERNEL_ROUTE_RESPONDED"
        try {
            $responseText = $modelResponse.responseText
            if ($responseText -and $responseText.Length -gt 0) {
                $truthLabels += "QWEN_VISION_RESPONSE_RETURNED"
            }
        } catch {}
    } else {
        $blockers += "BLOCKED_MODEL: Vision Kernel /vision/analyze/camera-frame returned error: $($analyzeResult.error) | status: $($analyzeResult.statusCode) | body: $($analyzeResult.rawBody)"
    }
} else {
    $truthLabels += "ROUTE_SKIPPED_KERNEL_OFFLINE"
}

# ── Step 5: Write response proof ─────────────────────────────────────────────
$responseProof = [ordered]@{
    proofId          = "camera-to-qwen-response-$Stamp"
    capturedAt       = (Get-Date).ToUniversalTime().ToString("o")
    visionKernelLive = $visionKernelLive
    frameSource      = $frameSource
    routeUrl         = "$BaseUrl/vision/analyze/camera-frame"
    routeOk          = $routeOk
    statusCode       = $analyzeResult.statusCode
    rawBody          = $analyzeResult.rawBody
    parsed           = $analyzeResult.parsed
    error            = $analyzeResult.error
    blockers         = $blockers
    truthLabels      = $truthLabels
}
Write-LeewayJson -Path $ResponseProofPath -Object $responseProof | Out-Null
$proofArtifacts += $ResponseProofPath

# ── Step 6: Determine lane status ────────────────────────────────────────────
$realFrameUsed     = ($frameSource -eq "camera-bridge-proof")
$syntheticUsed     = ($frameSource -eq "synthetic-1x1-white-png")

$laneStatus = if ($routeOk -and $realFrameUsed) {
    "PROVEN_READY"
} elseif ($routeOk -and $syntheticUsed) {
    "PARTIAL_WITH_EXACT_BLOCKER"
} elseif (-not $visionKernelLive) {
    "BLOCKED_RUNTIME"
} else {
    "BLOCKED_MODEL"
}

$actualProofLevel = if ($routeOk -and $realFrameUsed) {
    "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME"
} elseif ($routeOk -and $syntheticUsed) {
    "PROOF_LEVEL_3_RUNTIME_ENDPOINT"
} elseif ($visionKernelLive) {
    "PROOF_LEVEL_3_RUNTIME_ENDPOINT"
} else {
    "PROOF_LEVEL_0_DOCUMENT"
}
$requiredProofLevel = "PROOF_LEVEL_4_FUNCTIONAL_RUNTIME"

# ── Step 7: Write report and receipt ─────────────────────────────────────────
$result = [ordered]@{
    reportId               = "agent-lee-camera-to-qwen-vision-$Stamp"
    generatedAt            = (Get-Date).ToUniversalTime().ToString("o")
    assistantBodyRole      = "CODEX_ASSISTANT_BODY"
    assistantObjectId      = "LEEWAY-ASSISTANT-0002"
    governingStandardsRead = $governingStandards
    authorization          = "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"
    laneId                 = "CAMERA_TO_QWEN_VISION"
    laneStatus             = $laneStatus
    requiredProofLevel     = $requiredProofLevel
    actualProofLevel       = $actualProofLevel
    visionKernelLive       = $visionKernelLive
    visionKernelHealth     = $healthResult
    visionKernelStatus     = $statusResult
    visionKernelModel      = $modelResult
    frameSource            = $frameSource
    routeUrl               = "$BaseUrl/vision/analyze/camera-frame"
    routeOk                = $routeOk
    rawRequestProofPath    = $RequestProofPath
    rawResponseProofPath   = $ResponseProofPath
    proofArtifacts         = $proofArtifacts
    blockers               = $blockers
    truthLabels            = $truthLabels
    receiptsWritten        = @($ReceiptPath)
    reportsWritten         = @($ReportPath)
}

Write-LeewayJson -Path $ReportPath -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

Write-Host "=== PHASE 3: Camera-to-Qwen Vision ==="
Write-Host "Lane Status      : $laneStatus"
Write-Host "Actual Proof     : $actualProofLevel"
Write-Host "Required Proof   : $requiredProofLevel"
Write-Host "Vision Kernel    : $visionKernelLive"
Write-Host "Frame Source     : $frameSource"
Write-Host "Route OK         : $routeOk"
if ($blockers.Count -gt 0) {
    Write-Host "BLOCKERS:"
    $blockers | ForEach-Object { Write-Host "  - $_" }
}
Write-Host "Request proof    : $RequestProofPath"
Write-Host "Response proof   : $ResponseProofPath"
Write-Host "Receipt          : $ReceiptPath"

exit $(if ($laneStatus -eq "PROVEN_READY" -or $laneStatus -eq "PARTIAL_WITH_EXACT_BLOCKER") { 0 } else { 1 })
