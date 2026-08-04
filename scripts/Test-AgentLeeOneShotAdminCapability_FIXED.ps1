[CmdletBinding()]
param(
    [switch]$AuthorizeCamera = $true,
    [switch]$AuthorizeVoice = $true,
    [switch]$AuthorizeNetworkDiscovery = $true,
    [switch]$AuthorizeCreation = $true,
    [switch]$AuthorizePrintWhatIf = $true,
    [switch]$AuthorizeRealPrint = $false,
    [string]$ImagePrompt = "Create a cinematic image of futuristic chess pieces on a glowing board, dramatic lighting, high detail.",
    [string]$VoiceText = "Peace Leonard, it is Agent Lee. I am running the full capability proof now. I will test camera, clone voice, vision, image creation, 3D creation, video, documents, website, printer, and local network discovery."
)

$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
Set-Location $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ProofRoot = Join-Path $Root "Archive\proofs\agent-lee-one-shot-admin-proof-$Stamp"
$ReportDir = Join-Path $Root "Archive\reports"
$ReceiptDir = Join-Path $Root "Archive\receipts\leeway-system-completion"

$Dirs = @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\voice",
    "$ProofRoot\camera",
    "$ProofRoot\vision",
    "$ProofRoot\creative",
    "$ProofRoot\3d",
    "$ProofRoot\video",
    "$ProofRoot\audio",
    "$ProofRoot\documents",
    "$ProofRoot\website",
    "$ProofRoot\email",
    "$ProofRoot\printer",
    "$ProofRoot\network",
    $ReportDir,
    $ReceiptDir
)

foreach ($d in $Dirs) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$TranscriptPath = Join-Path $ProofRoot "logs\agent-lee-one-shot-transcript-$Stamp.txt"
Start-Transcript -Path $TranscriptPath -Force | Out-Null

$Results = [ordered]@{
    schema = "agent-lee-one-shot-admin-capability-proof-fixed-v1"
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    root = $Root
    proofRoot = $ProofRoot
    authorizations = [ordered]@{
        camera = [bool]$AuthorizeCamera
        voice = [bool]$AuthorizeVoice
        networkDiscovery = [bool]$AuthorizeNetworkDiscovery
        creation = [bool]$AuthorizeCreation
        printWhatIf = [bool]$AuthorizePrintWhatIf
        realPrint = [bool]$AuthorizeRealPrint
    }
    lanes = [ordered]@{}
    blockers = @()
    warnings = @()
    artifacts = [ordered]@{}
    rule = "Fallback artifacts prove local fallback ability only. They do not prove full AI model capability."
}

function Write-JsonFile {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)]$Object
    )

    $folder = Split-Path -Parent $Path
    if ($folder -and -not (Test-Path $folder)) {
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $json = $Object | ConvertTo-Json -Depth 40
    [System.IO.File]::WriteAllText($Path, $json, $utf8)
}

function Add-Lane {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Status,
        [Parameter(Mandatory=$true)][string]$ProofLevel,
        [Parameter(Mandatory=$true)][string]$Details,
        [string[]]$Artifacts = @(),
        [string[]]$Blockers = @()
    )

    $script:Results.lanes[$Name] = [ordered]@{
        status = $Status
        proofLevel = $ProofLevel
        details = $Details
        artifacts = $Artifacts
        blockers = $Blockers
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    }

    foreach ($b in $Blockers) {
        if (-not [string]::IsNullOrWhiteSpace($b)) {
            # FIXED: do not use "$Name: $b"; PowerShell parses $Name: as invalid scoped variable.
            $script:Results.blockers += ("{0}: {1}" -f $Name, $b)
        }
    }

    Write-Host ""
    Write-Host ("[{0}] {1}" -f $Name, $Status) -ForegroundColor Cyan
    Write-Host ("  {0}" -f $Details)
}

function Test-Cmd {
    param([Parameter(Mandatory=$true)][string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Json {
    param(
        [Parameter(Mandatory=$true)][string]$Uri,
        [string]$Method = "GET",
        $Body = $null,
        [int]$TimeoutSec = 10
    )

    try {
        if ($null -ne $Body) {
            $bodyJson = $Body | ConvertTo-Json -Depth 30
            return Invoke-RestMethod -Uri $Uri -Method $Method -Body $bodyJson -ContentType "application/json" -TimeoutSec $TimeoutSec
        } else {
            return Invoke-RestMethod -Uri $Uri -Method $Method -TimeoutSec $TimeoutSec
        }
    } catch {
        return [ordered]@{
            error = $true
            message = $_.Exception.Message
            uri = $Uri
            method = $Method
        }
    }
}

function New-FallbackImage {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Text
    )

    Add-Type -AssemblyName System.Drawing

    $bmp = New-Object System.Drawing.Bitmap 1200, 800
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    try {
        $g.Clear([System.Drawing.Color]::Black)

        $titleFont = New-Object System.Drawing.Font "Arial", 36, [System.Drawing.FontStyle]::Bold
        $bodyFont = New-Object System.Drawing.Font "Arial", 20, [System.Drawing.FontStyle]::Regular
        $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Gold)
        $white = [System.Drawing.Brushes]::White
        $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Gold), 8

        $g.DrawString("Agent Lee Image Creation Proof", $titleFont, $gold, 60, 60)
        $g.DrawString("Fallback local graphic. AI image route not yet proven.", $bodyFont, $white, 60, 145)
        $g.DrawString($Text, $bodyFont, $white, 60, 210)
        $g.DrawEllipse($pen, 470, 360, 250, 250)
        $g.DrawRectangle($pen, 420, 630, 350, 70)

        $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        if ($g) { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
    }
}

function New-ProceduralPawnObj {
    param([Parameter(Mandatory=$true)][string]$Path)

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Agent Lee procedural fallback chess pawn OBJ")
    $lines.Add("# NOT proof of AI image-to-3D. Local 3D file creation only.")

    $segments = 24
    $levels = @(
        @{ z = 0.0; r = 1.00 },
        @{ z = 0.2; r = 1.15 },
        @{ z = 0.4; r = 0.75 },
        @{ z = 1.3; r = 0.50 },
        @{ z = 1.8; r = 0.70 },
        @{ z = 2.3; r = 0.45 },
        @{ z = 2.7; r = 0.00 }
    )

    foreach ($level in $levels) {
        for ($i = 0; $i -lt $segments; $i++) {
            $a = 2 * [Math]::PI * $i / $segments
            $x = [Math]::Cos($a) * $level.r
            $y = [Math]::Sin($a) * $level.r
            $z = $level.z
            $lines.Add(("v {0:N5} {1:N5} {2:N5}" -f $x, $y, $z))
        }
    }

    for ($l = 0; $l -lt ($levels.Count - 1); $l++) {
        for ($i = 0; $i -lt $segments; $i++) {
            $a = $l * $segments + $i + 1
            $b = $l * $segments + (($i + 1) % $segments) + 1
            $c = ($l + 1) * $segments + (($i + 1) % $segments) + 1
            $d = ($l + 1) * $segments + $i + 1
            $lines.Add("f $a $b $c $d")
        }
    }

    Set-Content -Path $Path -Value $lines -Encoding UTF8
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "AGENT LEE ONE-SHOT ADMIN CAPABILITY PROOF - FIXED" -ForegroundColor Green
Write-Host "Proof Root: $ProofRoot"
Write-Host "============================================================" -ForegroundColor Green

# 1. Docker inventory
try {
    $DockerLog = "$ProofRoot\logs\docker-ps-$Stamp.txt"
    if (Test-Cmd "docker") {
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}" | Tee-Object -FilePath $DockerLog | Out-Null
        Add-Lane "DOCKER" "DOCKER_READY" "PROOF_LEVEL_2_COMMAND_VALIDATION" "Docker is available. Container inventory captured." @($DockerLog)
    } else {
        Add-Lane "DOCKER" "DOCKER_NOT_FOUND" "PROOF_LEVEL_0_NOT_PROVEN" "Docker command not found." @() @("Docker command not found.")
    }
} catch {
    Add-Lane "DOCKER" "DOCKER_BLOCKED" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

# 2. Desktop Runtime
$DesktopStatusPath = "$ProofRoot\logs\desktop-runtime-status-$Stamp.json"
$DesktopStatus = Invoke-Json -Uri "http://127.0.0.1:8091/status" -TimeoutSec 10
Write-JsonFile -Path $DesktopStatusPath -Object $DesktopStatus

if ($DesktopStatus.error) {
    Add-Lane "DESKTOP_RUNTIME_8091" "DESKTOP_RUNTIME_BLOCKED" "PROOF_LEVEL_0_NOT_PROVEN" "Desktop Runtime /status failed." @($DesktopStatusPath) @($DesktopStatus.message)
} else {
    Add-Lane "DESKTOP_RUNTIME_8091" "DESKTOP_RUNTIME_STATUS_READY" "PROOF_LEVEL_3_RUNTIME_ENDPOINT" "Desktop Runtime /status returned successfully." @($DesktopStatusPath)
}

# 3. Canonical Docker XTTS clone voice
$VoiceHealthPath = "$ProofRoot\voice\xtts-health-$Stamp.json"
$VoiceReqPath = "$ProofRoot\voice\xtts-request-$Stamp.json"
$VoiceResPath = "$ProofRoot\voice\xtts-response-$Stamp.json"
$VoiceAudioPath = "$ProofRoot\voice\agent-lee-canonical-xtts-$Stamp.wav"

$VoiceGenerated = $false
$VoiceHealth = Invoke-Json -Uri "http://127.0.0.1:8092/health" -TimeoutSec 30
Write-JsonFile -Path $VoiceHealthPath -Object $VoiceHealth

if ($VoiceHealth.error) {
    Add-Lane "CANONICAL_XTTS_CLONE_VOICE" "CANONICAL_CLONE_VOICE_BLOCKED_ENDPOINT" "PROOF_LEVEL_0_NOT_PROVEN" "Voice kernel health failed." @($VoiceHealthPath) @($VoiceHealth.message)
} elseif (-not $AuthorizeVoice) {
    Add-Lane "CANONICAL_XTTS_CLONE_VOICE" "CANONICAL_CLONE_VOICE_BLOCKED_APPROVAL" "PROOF_LEVEL_2_ENDPOINT_SEEN" "Voice endpoint exists but voice authorization disabled." @($VoiceHealthPath)
} else {
    $VoiceReq = [ordered]@{
        text = $VoiceText
        voice = "agent-lee"
        requireCanonicalCloneVoice = $true
        noFallback = $true
    }

    Write-JsonFile -Path $VoiceReqPath -Object $VoiceReq

    Write-Host "Calling Docker XTTS voice kernel. This may take several minutes on CPU..." -ForegroundColor Yellow
    $VoiceRes = Invoke-Json -Uri "http://127.0.0.1:8092/tts" -Method "POST" -Body $VoiceReq -TimeoutSec 900
    Write-JsonFile -Path $VoiceResPath -Object $VoiceRes

    $AudioUrl = $null

    foreach ($k in @("audio_url", "audioUrl", "url", "file", "filename", "path", "audio_path")) {
        if ($VoiceRes.PSObject.Properties.Name -contains $k) {
            $v = [string]$VoiceRes.$k
            if ($v -like "http*") {
                $AudioUrl = $v
            } elseif (-not [string]::IsNullOrWhiteSpace($v)) {
                $AudioUrl = "http://127.0.0.1:8092/audio/$([System.IO.Path]::GetFileName($v))"
            }
        }
    }

    if ($AudioUrl) {
        try {
            Invoke-WebRequest -Uri $AudioUrl -OutFile $VoiceAudioPath -TimeoutSec 180 | Out-Null
            $bytes = (Get-Item $VoiceAudioPath).Length

            if ($bytes -gt 1000) {
                $VoiceGenerated = $true
                Add-Lane "CANONICAL_XTTS_CLONE_VOICE" "CANONICAL_CLONE_VOICE_PROVEN_READY" "PROOF_LEVEL_4_FUNCTIONAL_ARTIFACT" "XTTS generated clone voice audio. Bytes=$bytes" @($VoiceHealthPath, $VoiceReqPath, $VoiceResPath, $VoiceAudioPath)
            } else {
                Add-Lane "CANONICAL_XTTS_CLONE_VOICE" "CANONICAL_CLONE_VOICE_PARTIAL_SMALL_AUDIO" "PROOF_LEVEL_3_RUNTIME_ENDPOINT" "Audio file too small. Bytes=$bytes" @($VoiceAudioPath) @("Audio too small.")
            }
        } catch {
            Add-Lane "CANONICAL_XTTS_CLONE_VOICE" "CANONICAL_CLONE_VOICE_PARTIAL_AUDIO_DOWNLOAD_FAILED" "PROOF_LEVEL_3_RUNTIME_ENDPOINT" $_.Exception.Message @($VoiceResPath) @($_.Exception.Message)
        }
    } else {
        Add-Lane "CANONICAL_XTTS_CLONE_VOICE" "CANONICAL_CLONE_VOICE_PARTIAL_NO_AUDIO_URL" "PROOF_LEVEL_3_RUNTIME_ENDPOINT" "No audio URL/path found in TTS response." @($VoiceResPath) @("No audio URL/path found.")
    }
}

# 4. Optional local playback of XTTS artifact
if ($VoiceGenerated) {
    try {
        $player = New-Object System.Media.SoundPlayer
        $player.SoundLocation = $VoiceAudioPath
        $player.Load()
        $player.PlaySync()
        Add-Lane "VOICE_PLAYBACK" "VOICE_PLAYBACK_ATTEMPTED" "PROOF_LEVEL_4_FUNCTIONAL_ARTIFACT" "Played canonical XTTS WAV locally. Human confirmation still required." @($VoiceAudioPath)
    } catch {
        Add-Lane "VOICE_PLAYBACK" "VOICE_PLAYBACK_BLOCKED" "PROOF_LEVEL_3_AUDIO_ARTIFACT_ONLY" $_.Exception.Message @($VoiceAudioPath) @($_.Exception.Message)
    }
}

# 5. Camera snapshot
$CameraInventoryPath = "$ProofRoot\camera\camera-inventory-$Stamp.txt"
$CameraFramePath = "$ProofRoot\camera\camera-frame-$Stamp.png"

if (-not $AuthorizeCamera) {
    Add-Lane "CAMERA_CAPTURE" "CAMERA_BLOCKED_APPROVAL" "PROOF_LEVEL_0_NOT_PROVEN" "Camera authorization disabled." @() @("Camera authorization disabled.")
} elseif (Test-Cmd "ffmpeg") {
    try {
        ffmpeg -hide_banner -list_devices true -f dshow -i dummy 2> $CameraInventoryPath
        $inv = Get-Content $CameraInventoryPath -Raw -ErrorAction SilentlyContinue
        $m = [regex]::Matches($inv, '"([^"]+)"\s+\(video\)')

        if ($m.Count -gt 0) {
            $cam = $m[0].Groups[1].Value
            $camLog = "$ProofRoot\camera\camera-capture-log-$Stamp.txt"
            & ffmpeg -y -f dshow -i "video=$cam" -frames:v 1 $CameraFramePath 2>&1 | Tee-Object -FilePath $camLog | Out-Null

            if (Test-Path $CameraFramePath) {
                $bytes = (Get-Item $CameraFramePath).Length
                Add-Lane "CAMERA_CAPTURE" "CAMERA_FRAME_CAPTURE_ATTEMPTED" "PROOF_LEVEL_4_FUNCTIONAL_ARTIFACT" "Camera snapshot attempted from '$cam'. Bytes=$bytes" @($CameraInventoryPath, $CameraFramePath, $camLog)
            } else {
                Add-Lane "CAMERA_CAPTURE" "CAMERA_CAPTURE_FAILED" "PROOF_LEVEL_2_COMMAND_VALIDATION" "FFmpeg found camera '$cam' but did not produce frame." @($CameraInventoryPath, $camLog) @("No frame produced.")
            }
        } else {
            Add-Lane "CAMERA_CAPTURE" "CAMERA_NO_DSHOW_CAMERA_FOUND" "PROOF_LEVEL_2_COMMAND_VALIDATION" "No DirectShow video camera found." @($CameraInventoryPath) @("No DirectShow camera found.")
        }
    } catch {
        Add-Lane "CAMERA_CAPTURE" "CAMERA_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @($CameraInventoryPath) @($_.Exception.Message)
    }
} else {
    Add-Lane "CAMERA_CAPTURE" "CAMERA_BLOCKED_FFMPEG_NOT_FOUND" "PROOF_LEVEL_0_NOT_PROVEN" "ffmpeg not found on PATH." @() @("ffmpeg not found.")
}

# 6. Vision kernel + image description
$VisionHealthPath = "$ProofRoot\vision\vision-health-$Stamp.json"
$VisionResPath = "$ProofRoot\vision\vision-response-$Stamp.json"

$VisionHealth = Invoke-Json -Uri "http://127.0.0.1:8093/health" -TimeoutSec 20
Write-JsonFile -Path $VisionHealthPath -Object $VisionHealth

if ($VisionHealth.error) {
    Add-Lane "VISION_KERNEL" "VISION_KERNEL_BLOCKED" "PROOF_LEVEL_0_NOT_PROVEN" "Vision kernel /health failed." @($VisionHealthPath) @($VisionHealth.message)
} else {
    Add-Lane "VISION_KERNEL" "VISION_KERNEL_ENDPOINT_READY" "PROOF_LEVEL_3_RUNTIME_ENDPOINT" "Vision kernel health returned." @($VisionHealthPath)
}

if ((Test-Path $CameraFramePath) -and -not $VisionHealth.error) {
    try {
        $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($CameraFramePath))
        $VisionBody = [ordered]@{
            image_base64 = $b64
            prompt = "Describe only visible, non-sensitive details in this image. If clothing color is visible, describe it. Do not identify the person."
            privacy = "non_sensitive_observable_only"
        }

        $VisionRes = Invoke-Json -Uri "http://127.0.0.1:8093/vision/analyze/camera-frame" -Method "POST" -Body $VisionBody -TimeoutSec 180
        Write-JsonFile -Path $VisionResPath -Object $VisionRes

        if ($VisionRes.error) {
            Add-Lane "VISION_DESCRIPTION" "VISION_DESCRIPTION_BLOCKED_ROUTE" "PROOF_LEVEL_3_RUNTIME_ENDPOINT" "Vision analysis route failed." @($VisionResPath) @($VisionRes.message)
        } else {
            Add-Lane "VISION_DESCRIPTION" "VISION_DESCRIPTION_READY" "PROOF_LEVEL_4_FUNCTIONAL_ARTIFACT" "Camera frame sent to vision kernel and response captured." @($CameraFramePath, $VisionResPath)
        }
    } catch {
        Add-Lane "VISION_DESCRIPTION" "VISION_DESCRIPTION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @($CameraFramePath) @($_.Exception.Message)
    }
} else {
    Add-Lane "VISION_DESCRIPTION" "VISION_DESCRIPTION_BLOCKED_CAMERA_OR_KERNEL" "PROOF_LEVEL_0_NOT_PROVEN" "Camera frame or vision kernel unavailable." @($CameraFramePath, $VisionHealthPath) @("Camera frame or vision kernel unavailable.")
}

# 7. Image creation fallback
$GeneratedImagePath = "$ProofRoot\creative\generated-image-$Stamp.png"
$ImageProofPath = "$ProofRoot\creative\image-generation-proof-$Stamp.json"

try {
    $imageChecks = [ordered]@{
        prompt = $ImagePrompt
        checkedEndpoints = @(
            "http://127.0.0.1:7860/sdapi/v1/txt2img",
            "http://127.0.0.1:8188/system_stats",
            "http://127.0.0.1:4001/image/status"
        )
        note = "Fallback image is not proof of full AI image generation."
    }

    Write-JsonFile -Path $ImageProofPath -Object $imageChecks
    New-FallbackImage -Path $GeneratedImagePath -Text $ImagePrompt

    Add-Lane "IMAGE_CREATION" "IMAGE_CREATION_PARTIAL_FALLBACK_GRAPHIC_USED" "PROOF_LEVEL_4_LOCAL_FALLBACK_ARTIFACT" "Created local fallback image. AI image model route not proven by this script." @($GeneratedImagePath, $ImageProofPath) @("AI image generation route not proven.")
} catch {
    Add-Lane "IMAGE_CREATION" "IMAGE_CREATION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

# 8. AI image-to-3D check + procedural OBJ fallback
$ThreeDInventoryPath = "$ProofRoot\3d\image-to-3d-inventory-$Stamp.json"
$ObjPath = "$ProofRoot\3d\procedural-chess-pawn-$Stamp.obj"

try {
    $ThreeDInventory = [ordered]@{
        blenderOnPath = (Test-Cmd "blender")
        pythonOnPath = (Test-Cmd "python")
        aiImageTo3DEndpointsChecked = @(
            "http://127.0.0.1:4001/3d/status",
            "http://127.0.0.1:7860/3d/status",
            "http://127.0.0.1:8188/3d/status"
        )
        note = "Procedural OBJ fallback is not proof of AI image-to-3D."
    }

    Write-JsonFile -Path $ThreeDInventoryPath -Object $ThreeDInventory
    New-ProceduralPawnObj -Path $ObjPath

    Add-Lane "THREE_D_CREATION" "THREE_D_OBJECT_CREATION_PARTIAL_PROCEDURAL_FALLBACK" "PROOF_LEVEL_4_LOCAL_FALLBACK_ARTIFACT" "Created procedural OBJ chess pawn. AI image-to-3D route not proven." @($ThreeDInventoryPath, $ObjPath) @("AI image-to-3D generation not proven.")
} catch {
    Add-Lane "THREE_D_CREATION" "THREE_D_OBJECT_CREATION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

# 9. Video creation via FFmpeg
$VideoPath = "$ProofRoot\video\generated-demo-video-$Stamp.mp4"
$VideoLogPath = "$ProofRoot\video\video-generation-log-$Stamp.txt"

if ((Test-Path $GeneratedImagePath) -and (Test-Cmd "ffmpeg")) {
    try {
        ffmpeg -y -loop 1 -i $GeneratedImagePath -t 5 -vf "scale=1280:720,format=yuv420p" -r 24 $VideoPath 2>&1 | Tee-Object -FilePath $VideoLogPath | Out-Null

        if (Test-Path $VideoPath) {
            Add-Lane "VIDEO_CREATION" "VIDEO_CREATION_PARTIAL_LOCAL_SLIDESHOW_FALLBACK" "PROOF_LEVEL_4_LOCAL_FALLBACK_ARTIFACT" "Created 5-second MP4 from generated image. AI text-to-video not proven." @($VideoPath, $VideoLogPath) @("AI text-to-video route not proven.")
        } else {
            Add-Lane "VIDEO_CREATION" "VIDEO_CREATION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" "FFmpeg did not produce video." @($VideoLogPath) @("No video produced.")
        }
    } catch {
        Add-Lane "VIDEO_CREATION" "VIDEO_CREATION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @($VideoLogPath) @($_.Exception.Message)
    }
} else {
    Add-Lane "VIDEO_CREATION" "VIDEO_CREATION_BLOCKED_FFMPEG_OR_IMAGE" "PROOF_LEVEL_0_NOT_PROVEN" "Missing ffmpeg or generated image." @($GeneratedImagePath) @("Missing ffmpeg or image.")
}

# 10. Audio creation from canonical voice artifact
if ($VoiceGenerated) {
    $AudioCopy = "$ProofRoot\audio\generated-agent-lee-narration-$Stamp.wav"
    Copy-Item $VoiceAudioPath $AudioCopy -Force
    Add-Lane "AUDIO_CREATION" "AUDIO_CREATION_PROVEN_READY" "PROOF_LEVEL_4_FUNCTIONAL_ARTIFACT" "Audio created through canonical XTTS clone voice." @($AudioCopy)
} else {
    Add-Lane "AUDIO_CREATION" "AUDIO_CREATION_BLOCKED_CANONICAL_VOICE" "PROOF_LEVEL_0_NOT_PROVEN" "No canonical XTTS audio artifact." @() @("No canonical XTTS audio artifact.")
}

# 11. Internet research attempt
$ResearchPath = "$ProofRoot\creative\image-to-3d-research-$Stamp.json"
$ResearchSummaryPath = "$ProofRoot\creative\image-to-3d-research-summary-$Stamp.txt"

try {
    $queries = @(
        "how to turn a 2D image into a 3D model",
        "image to 3D model workflow Blender",
        "make 3D printable model from image STL OBJ"
    )

    $research = [ordered]@{
        queries = $queries
        results = @()
        summary = "Use the image as reference; trace simple shapes to SVG and extrude; use Blender for modeling; use AI image-to-3D only if a model route exists; clean mesh; export STL OBJ or GLB; slice for printing."
    }

    foreach ($q in $queries) {
        $url = "https://duckduckgo.com/html/?q=$([uri]::EscapeDataString($q))"
        try {
            $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
            $research.results += [ordered]@{
                query = $q
                url = $url
                statusCode = $res.StatusCode
                bytes = $res.Content.Length
                captured = $true
            }
        } catch {
            $research.results += [ordered]@{
                query = $q
                url = $url
                error = $_.Exception.Message
                captured = $false
            }
        }
    }

    Write-JsonFile -Path $ResearchPath -Object $research
    Set-Content -Path $ResearchSummaryPath -Value $research.summary -Encoding UTF8

    Add-Lane "INTERNET_RESEARCH" "INTERNET_RESEARCH_ATTEMPTED" "PROOF_LEVEL_3_WEB_REQUEST_ATTEMPT" "Research queries attempted and summary written." @($ResearchPath, $ResearchSummaryPath)
} catch {
    Add-Lane "INTERNET_RESEARCH" "INTERNET_RESEARCH_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

# 12. Documents, website, email draft
$HtmlDocPath = "$ProofRoot\documents\agent-lee-proof-sheet-$Stamp.html"
$PdfPath = "$ProofRoot\documents\agent-lee-proof-sheet-$Stamp.pdf"
$DocxPath = "$ProofRoot\documents\agent-lee-demo-document-$Stamp.docx"
$XlsxPath = "$ProofRoot\documents\agent-lee-demo-spreadsheet-$Stamp.xlsx"
$PptxPath = "$ProofRoot\documents\agent-lee-demo-slide-deck-$Stamp.pptx"

try {
    $researchText = ""
    if (Test-Path $ResearchSummaryPath) {
        $researchText = Get-Content $ResearchSummaryPath -Raw -ErrorAction SilentlyContinue
    }

    $html = @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Agent Lee Capability Proof</title></head>
<body style="font-family:Arial;margin:40px">
<h1>Agent Lee Capability Proof</h1>
<p><b>Timestamp:</b> $Stamp</p>
<h2>Prompt</h2><p>$ImagePrompt</p>
<h2>Generated Image / Fallback</h2><img src="file:///$($GeneratedImagePath.Replace('\','/'))" style="max-width:700px">
<h2>3D Object</h2><p>$ObjPath</p>
<h2>Video</h2><p>$VideoPath</p>
<h2>Research Summary</h2><pre>$researchText</pre>
<p><b>Proof rule:</b> Fallbacks are partial unless real AI model route is proven.</p>
</body>
</html>
"@

    Set-Content -Path $HtmlDocPath -Value $html -Encoding UTF8

    $edgeCandidates = @(
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )

    $edge = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($edge) {
        & $edge --headless --disable-gpu --print-to-pdf="$PdfPath" "file:///$($HtmlDocPath.Replace('\','/'))" 2>$null
    }

    Set-Content -Path $DocxPath -Value "Agent Lee DOCX fallback placeholder. Full DOCX requires python-docx or Word COM." -Encoding UTF8
    Set-Content -Path $XlsxPath -Value "Capability,Status`nImage,Partial fallback`n3D,Procedural fallback`nVideo,FFmpeg fallback" -Encoding UTF8
    Set-Content -Path $PptxPath -Value "Agent Lee PPTX fallback placeholder. Full PPTX requires python-pptx or PowerPoint COM." -Encoding UTF8

    Add-Lane "DOCUMENT_CREATION" "DOCUMENT_CREATION_PARTIAL_FALLBACK_METHOD_USED" "PROOF_LEVEL_3_ARTIFACTS_CREATED" "HTML/PDF attempted. DOCX/XLSX/PPTX fallback placeholders created." @($HtmlDocPath, $PdfPath, $DocxPath, $XlsxPath, $PptxPath) @("Office files are placeholders unless proper library/COM generation is added.")
} catch {
    Add-Lane "DOCUMENT_CREATION" "DOCUMENT_CREATION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

$WebsiteDir = "$ProofRoot\website\agent-lee-demo-site-$Stamp"
$WebsiteIndex = "$WebsiteDir\index.html"

try {
    New-Item -ItemType Directory -Force -Path $WebsiteDir | Out-Null

    if (Test-Path $GeneratedImagePath) { Copy-Item $GeneratedImagePath "$WebsiteDir\generated-image.png" -Force }
    if (Test-Path $ObjPath) { Copy-Item $ObjPath "$WebsiteDir\model.obj" -Force }
    if (Test-Path $VideoPath) { Copy-Item $VideoPath "$WebsiteDir\video.mp4" -Force }
    if ($VoiceGenerated -and (Test-Path $VoiceAudioPath)) { Copy-Item $VoiceAudioPath "$WebsiteDir\audio.wav" -Force }
    if (Test-Path $PdfPath) { Copy-Item $PdfPath "$WebsiteDir\proof-sheet.pdf" -Force }

    $site = @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Agent Lee Demo Site</title></head>
<body style="font-family:Arial;background:#111;color:#fff;margin:40px">
<h1>Agent Lee Demo Site</h1>
<img src="generated-image.png" style="max-width:800px;width:100%">
<p><a href="model.obj">Download 3D OBJ</a></p>
<video src="video.mp4" controls style="max-width:800px;width:100%"></video>
<audio src="audio.wav" controls></audio>
<p><a href="proof-sheet.pdf">Download Proof Sheet PDF</a></p>
</body>
</html>
"@

    Set-Content -Path $WebsiteIndex -Value $site -Encoding UTF8

    Add-Lane "WEBSITE_CREATION" "WEBSITE_CREATION_READY" "PROOF_LEVEL_4_FUNCTIONAL_ARTIFACT" "Website created with media links." @($WebsiteIndex)
} catch {
    Add-Lane "WEBSITE_CREATION" "WEBSITE_CREATION_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

$EmlPath = "$ProofRoot\email\agent-lee-demo-package-$Stamp.eml"

try {
    $eml = @"
To: Leonard J Lee <osirussees@gmail.com>
Subject: Agent Lee Capability Proof Package $Stamp
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"

Leonard,

This is a local .eml draft created by the Agent Lee proof script.

Image: $GeneratedImagePath
3D OBJ: $ObjPath
Video: $VideoPath
Audio: $VoiceAudioPath
PDF: $PdfPath
Website: $WebsiteIndex

This proves local email draft creation only. It does not prove email sending.
"@

    Set-Content -Path $EmlPath -Value $eml -Encoding UTF8

    Add-Lane "EMAIL_DRAFT" "EMAIL_DELIVERY_PARTIAL_LOCAL_EML_ONLY" "PROOF_LEVEL_4_LOCAL_FALLBACK_ARTIFACT" "Local .eml draft created." @($EmlPath) @("Email send not proven.")
} catch {
    Add-Lane "EMAIL_DRAFT" "EMAIL_DELIVERY_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

# 13. Printer inventory and optional print
$PrinterInventoryPath = "$ProofRoot\printer\printer-inventory-$Stamp.json"
$PrintProofPath = "$ProofRoot\printer\print-job-proof-$Stamp.json"

try {
    try {
        $printers = @(Get-Printer | Select-Object Name, PrinterStatus, Type, DriverName, PortName, Shared)
    } catch {
        $printers = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, DriverName, PortName, Default, Network)
    }

    Write-JsonFile -Path $PrinterInventoryPath -Object $printers

    if ($printers.Count -gt 0) {
        $selected = $printers | Select-Object -First 1
        Add-Lane "PRINTER_INVENTORY" "PRINTER_INVENTORY_READY" "PROOF_LEVEL_3_SYSTEM_INVENTORY" "Printer found: $($selected.Name)" @($PrinterInventoryPath)

        if ($AuthorizeRealPrint) {
            $doc = if (Test-Path $PdfPath) { $PdfPath } else { $HtmlDocPath }

            try {
                Start-Process -FilePath $doc -Verb Print | Out-Null

                $pp = [ordered]@{
                    selectedPrinter = $selected.Name
                    document = $doc
                    realPrint = $true
                    status = "PRINT_COMMAND_SUBMITTED"
                    timestamp = (Get-Date).ToUniversalTime().ToString("o")
                }

                Write-JsonFile -Path $PrintProofPath -Object $pp

                Add-Lane "REAL_PRINT_JOB" "REAL_PRINT_JOB_ATTEMPTED" "PROOF_LEVEL_4_FUNCTIONAL_ATTEMPT" "Print command submitted for $doc." @($PrintProofPath)
            } catch {
                Add-Lane "REAL_PRINT_JOB" "REAL_PRINT_JOB_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @($PrintProofPath) @($_.Exception.Message)
            }
        } elseif ($AuthorizePrintWhatIf) {
            $pp = [ordered]@{
                selectedPrinter = $selected.Name
                document = $PdfPath
                whatIf = $true
                status = "WHATIF_ONLY_NO_PRINT_SUBMITTED"
                timestamp = (Get-Date).ToUniversalTime().ToString("o")
            }

            Write-JsonFile -Path $PrintProofPath -Object $pp

            Add-Lane "REAL_PRINT_JOB" "REAL_PRINT_JOB_WHATIF_ONLY" "PROOF_LEVEL_3_APPROVAL_GATE" "WhatIf mode only. No real print job submitted." @($PrintProofPath) @("Run with -AuthorizeRealPrint to submit a real print job.")
        } else {
            Add-Lane "REAL_PRINT_JOB" "REAL_PRINT_JOB_BLOCKED_APPROVAL" "PROOF_LEVEL_3_APPROVAL_GATE" "Printer found but print approval disabled." @($PrinterInventoryPath) @("Print approval disabled.")
        }
    } else {
        Add-Lane "PRINTER_INVENTORY" "PRINTER_BLOCKED_NO_PRINTER" "PROOF_LEVEL_0_NOT_PROVEN" "No printer found." @($PrinterInventoryPath) @("No printer found.")
    }
} catch {
    Add-Lane "PRINTER_INVENTORY" "PRINTER_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
}

# 14. Local network discovery
$NetworkPath = "$ProofRoot\network\local-network-discovery-$Stamp.json"

if (-not $AuthorizeNetworkDiscovery) {
    Add-Lane "LOCAL_NETWORK_DISCOVERY" "LOCAL_NETWORK_DISCOVERY_BLOCKED_APPROVAL" "PROOF_LEVEL_0_NOT_PROVEN" "Network discovery authorization disabled." @() @("Network discovery disabled.")
} else {
    try {
        $net = [ordered]@{
            interfaces = @(Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer)
            neighbors = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object ifIndex, IPAddress, LinkLayerAddress, State)
            arp = @(arp -a)
            note = "Safe local network discovery only. Exact phone model may be hidden by private MAC/randomized hostname."
        }

        Write-JsonFile -Path $NetworkPath -Object $net

        Add-Lane "LOCAL_NETWORK_DISCOVERY" "LOCAL_NETWORK_DISCOVERY_READY" "PROOF_LEVEL_3_SYSTEM_INVENTORY" "Captured interfaces, neighbors, and ARP table." @($NetworkPath)
    } catch {
        Add-Lane "LOCAL_NETWORK_DISCOVERY" "LOCAL_NETWORK_DISCOVERY_BLOCKED_RUNTIME" "PROOF_LEVEL_0_NOT_PROVEN" $_.Exception.Message @() @($_.Exception.Message)
    }
}

# Final report
$fallbacks = @()
$blocked = @()

foreach ($k in $Results.lanes.Keys) {
    $status = [string]$Results.lanes[$k].status
    if ($status -match "PARTIAL|FALLBACK|WHATIF") { $fallbacks += "$k=$status" }
    if ($status -match "BLOCKED|FAILED|NOT_FOUND|NO_") { $blocked += "$k=$status" }
}

$FinalVerdict = if ($blocked.Count -eq 0 -and $fallbacks.Count -eq 0) {
    "AGENT_LEE_ONE_SHOT_ADMIN_CAPABILITY_PROVEN_READY"
} elseif (($Results.lanes.Contains("CANONICAL_XTTS_CLONE_VOICE")) -and ([string]$Results.lanes["CANONICAL_XTTS_CLONE_VOICE"].status -match "BLOCKED|DRIFT")) {
    "AGENT_LEE_ONE_SHOT_ADMIN_CAPABILITY_BLOCKED_CANONICAL_VOICE"
} else {
    "AGENT_LEE_ONE_SHOT_ADMIN_CAPABILITY_PARTIAL_BLOCKERS_REMAIN"
}

$Results.endedAt = (Get-Date).ToUniversalTime().ToString("o")
$Results.finalVerdict = $FinalVerdict
$Results.fallbacks = $fallbacks
$Results.blocked = $blocked

$ReportPath = Join-Path $ReportDir "agent-lee-one-shot-admin-capability-report-$Stamp.json"
$ReceiptPath = Join-Path $ReceiptDir "agent-lee-one-shot-admin-capability-receipt-$Stamp.json"
$MdPath = Join-Path $ReportDir "agent-lee-one-shot-admin-capability-report-$Stamp.md"

$Results.reportPath = $ReportPath
$Results.receiptPath = $ReceiptPath
$Results.markdownPath = $MdPath
$Results.transcriptPath = $TranscriptPath

Write-JsonFile -Path $ReportPath -Object $Results
Write-JsonFile -Path $ReceiptPath -Object $Results

$md = @()
$md += "# Agent Lee One-Shot Admin Capability Proof"
$md += ""
$md += "Generated: $($Results.endedAt)"
$md += ""
$md += "## Final Verdict"
$md += ""
$md += $FinalVerdict
$md += ""
$md += "## Lanes"
$md += ""
$md += "| Lane | Status | Proof Level |"
$md += "|---|---|---|"

foreach ($k in $Results.lanes.Keys) {
    $md += "| $k | $($Results.lanes[$k].status) | $($Results.lanes[$k].proofLevel) |"
}

$md += ""
$md += "## Fallbacks / Partial Proof"
foreach ($f in $fallbacks) { $md += "- $f" }

$md += ""
$md += "## Blockers"
foreach ($b in $Results.blockers) { $md += "- $b" }

$md += ""
$md += "## Proof Root"
$md += $ProofRoot
$md += ""
$md += "## Report"
$md += $ReportPath
$md += ""
$md += "## Receipt"
$md += $ReceiptPath

Set-Content -Path $MdPath -Value $md -Encoding UTF8

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "AGENT LEE ONE-SHOT ADMIN CAPABILITY PROOF COMPLETE" -ForegroundColor Green
Write-Host "Final Verdict: $FinalVerdict" -ForegroundColor Yellow
Write-Host "Proof Root: $ProofRoot"
Write-Host "Report: $ReportPath"
Write-Host "Receipt: $ReceiptPath"
Write-Host "Markdown: $MdPath"
Write-Host "Transcript: $TranscriptPath"
Write-Host "============================================================" -ForegroundColor Green

Stop-Transcript | Out-Null

Start-Process explorer.exe $ProofRoot
Start-Process notepad.exe $MdPath

if ($FinalVerdict -eq "AGENT_LEE_ONE_SHOT_ADMIN_CAPABILITY_PROVEN_READY") {
    exit 0
} else {
    exit 1
}
