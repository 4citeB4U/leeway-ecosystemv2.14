param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [string]$ProofRoot = ""
)

$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    Add-Type -AssemblyName System.Speech
    $script:SpeechAvailable = $true
} catch {
    $script:SpeechAvailable = $false
}

if ([string]::IsNullOrWhiteSpace($ProofRoot)) {
    $ProofRoot = Join-Path $Root ("Archive\proofs\agent-lee-v5-voice-first-auto-live-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

foreach ($d in @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\voice",
    "$ProofRoot\ears",
    "$ProofRoot\camera",
    "$ProofRoot\image",
    "$ProofRoot\video",
    "$ProofRoot\3d",
    "$ProofRoot\network",
    "$ProofRoot\website",
    "$ProofRoot\printer"
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$EventLog = "$ProofRoot\logs\agent-lee-v5-events.jsonl"
$SpeechLog = "$ProofRoot\ears\heard-transcript.txt"

function Write-JsonFile {
    param([string]$Path, $Object)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth 60), $utf8)
}

function Write-Event {
    param([string]$Type, [string]$Message, $Data = $null)

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        data = $Data
    }

    Add-Content -Path $EventLog -Value ($obj | ConvertTo-Json -Compress -Depth 30) -Encoding UTF8
}

function Log {
    param([string]$Text)

    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text

    if ($script:txtLog) {
        $script:txtLog.AppendText($line + [Environment]::NewLine)
        $script:txtLog.SelectionStart = $script:txtLog.Text.Length
        $script:txtLog.ScrollToCaret()
    }

    Write-Event -Type "LOG" -Message $Text
}

function AgentLine {
    param([string]$Message)
    return $Message
}

function Test-Cmd {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-AgentLeePreferredCameraName {
    $paths = @(
        "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\desktop-runtime\camera-preference.json",
        "D:\Leeway-Ecosystem v2.1.4\scripts\agent-lee-camera-preference.json"
    )

    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $cfg = Get-Content $p -Raw | ConvertFrom-Json

                if ($cfg.status -eq "USB_WEBCAM_PROVEN_READY" -and -not [string]::IsNullOrWhiteSpace([string]$cfg.selectedCameraName)) {
                    return [string]$cfg.selectedCameraName
                }

                if ($cfg.status -like "*BLOCKED*") {
                    return ""
                }
            } catch {}
        }
    }

    return ""
}

function Assert-AgentLeeUsbWebcamOnly {
    param([string]$CameraName)

    if ([string]::IsNullOrWhiteSpace($CameraName)) {
        return $false
    }

    if ($CameraName -match "(?i)integrated|built-in|builtin|front|ir camera|windows hello|laptop") {
        return $false
    }

    return $true
}

function Speak-AgentLee {
    param([string]$Text)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $reqPath = "$ProofRoot\voice\xtts-request-$stamp.json"
    $resPath = "$ProofRoot\voice\xtts-response-$stamp.json"
    $wavPath = "$ProofRoot\voice\agent-lee-speech-$stamp.wav"

    try {
        Log ("AGENT LEE says: " + $Text)

        $body = [ordered]@{
            text = $Text
            voice = "agent-lee"
            requireCanonicalCloneVoice = $true
            noFallback = $true
        }

        Write-JsonFile $reqPath $body

        $res = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8092/tts" `
            -Method POST `
            -ContentType "application/json" `
            -Body ($body | ConvertTo-Json -Depth 20) `
            -TimeoutSec 900

        Write-JsonFile $resPath $res

        $audioUrl = $null
        foreach ($k in @("audio_url","audioUrl","url","file","filename","path","audio_path")) {
            if ($res.PSObject.Properties.Name -contains $k) {
                $v = [string]$res.$k
                if ($v -like "http*") {
                    $audioUrl = $v
                } elseif (-not [string]::IsNullOrWhiteSpace($v)) {
                    $audioUrl = "http://127.0.0.1:8092/audio/$([System.IO.Path]::GetFileName($v))"
                }
            }
        }

        if ($audioUrl) {
            Invoke-WebRequest -Uri $audioUrl -OutFile $wavPath -TimeoutSec 180 | Out-Null
            $player = New-Object System.Media.SoundPlayer
            $player.SoundLocation = $wavPath
            $player.Load()
            $player.PlaySync()

            Write-Event -Type "AGENT_LEE_SPOKE" -Message $Text -Data @{ wavPath = $wavPath }
            return $wavPath
        }

        Log "VOICE BLOCKED: XTTS returned no audio URL."
        return $null
    } catch {
        Log ("VOICE FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Listen-Once {
    param([int]$Seconds = 12, [string]$Purpose = "voice_input")

    if (-not $script:SpeechAvailable) {
        Log "EARS BLOCKED: System.Speech is unavailable."
        return $null
    }

    try {
        Log ("EARS LISTENING: " + $Purpose)

        $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $grammar = New-Object System.Speech.Recognition.DictationGrammar
        $rec.LoadGrammar($grammar)
        $rec.SetInputToDefaultAudioDevice()

        $result = $rec.Recognize([TimeSpan]::FromSeconds($Seconds))
        $rec.Dispose()

        if ($result) {
            $heard = [string]$result.Text
            $confidence = [double]$result.Confidence

            $line = "PURPOSE={0} CONFIDENCE={1:N2} HEARD={2}" -f $Purpose, $confidence, $heard
            Add-Content -Path $SpeechLog -Value $line -Encoding UTF8

            Log ("HEARD: " + $heard)

            return [ordered]@{
                text = $heard
                confidence = $confidence
            }
        }

        Log "EARS PARTIAL: no speech recognized."
        return $null
    } catch {
        Log ("EARS FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Get-VoiceApproval {
    param([string]$Question, [string]$ActionName)

    $yesWords = @("yes","yeah","yep","approve","approved","i approve","go ahead","do it","print it","print","okay","ok","run it")
    $noWords = @("no","nope","stop","cancel","do not","don't","hold up","wait")

    for ($i = 1; $i -le 2; $i++) {
        Speak-AgentLee $Question | Out-Null
        $heard = Listen-Once -Seconds 10 -Purpose ("approval:" + $ActionName)

        if ($heard -and $heard.text) {
            $text = $heard.text.ToLowerInvariant()

            foreach ($n in $noWords) {
                if ($text -like "*$n*") {
                    Speak-AgentLee "Bet. I heard you. I am holding that action, no move." | Out-Null
                    return [ordered]@{ approved = $false; heard = $heard.text; reason = "denied_by_voice" }
                }
            }

            foreach ($y in $yesWords) {
                if ($text -like "*$y*") {
                    Speak-AgentLee "Say less. Approval locked in. I am moving now." | Out-Null
                    return [ordered]@{ approved = $true; heard = $heard.text; reason = "approved_by_voice" }
                }
            }

            Speak-AgentLee "I heard sound, but not a clean yes. Say yes, approve, go ahead, or cancel." | Out-Null
        } else {
            Speak-AgentLee "I did not catch that. Give me a clear yes or cancel." | Out-Null
        }
    }

    return [ordered]@{ approved = $false; heard = ""; reason = "no_clear_voice_approval" }
}

function Get-Cameras {
    $inventory = "$ProofRoot\camera\camera-inventory.txt"
    $cams = @()

    if (-not (Test-Cmd "ffmpeg")) {
        return @()
    }

    try {
        ffmpeg -hide_banner -list_devices true -f dshow -i dummy 2> $inventory
        $txt = Get-Content $inventory -Raw -ErrorAction SilentlyContinue
        $matches = [regex]::Matches($txt, '"([^"]+)"\s+\(video\)')

        for ($i = 0; $i -lt $matches.Count; $i++) {
            $name = $matches[$i].Groups[1].Value
            $score = 0
            if ($name -match "usb|webcam|logitech|brio|c920|c922|external|hd webcam") { $score += 10 }
            if ($name -match "integrated|built-in|ir|laptop|front") { $score -= 10 }
            $cams += [ordered]@{ index = $i; name = $name; score = $score }
        }
    } catch {}

    return @($cams | Where-Object { param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [string]$ProofRoot = ""
)

$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    Add-Type -AssemblyName System.Speech
    $script:SpeechAvailable = $true
} catch {
    $script:SpeechAvailable = $false
}

if ([string]::IsNullOrWhiteSpace($ProofRoot)) {
    $ProofRoot = Join-Path $Root ("Archive\proofs\agent-lee-v5-voice-first-auto-live-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

foreach ($d in @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\voice",
    "$ProofRoot\ears",
    "$ProofRoot\camera",
    "$ProofRoot\image",
    "$ProofRoot\video",
    "$ProofRoot\3d",
    "$ProofRoot\network",
    "$ProofRoot\website",
    "$ProofRoot\printer"
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$EventLog = "$ProofRoot\logs\agent-lee-v5-events.jsonl"
$SpeechLog = "$ProofRoot\ears\heard-transcript.txt"

function Write-JsonFile {
    param([string]$Path, $Object)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth 60), $utf8)
}

function Write-Event {
    param([string]$Type, [string]$Message, $Data = $null)

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        data = $Data
    }

    Add-Content -Path $EventLog -Value ($obj | ConvertTo-Json -Compress -Depth 30) -Encoding UTF8
}

function Log {
    param([string]$Text)

    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text

    if ($script:txtLog) {
        $script:txtLog.AppendText($line + [Environment]::NewLine)
        $script:txtLog.SelectionStart = $script:txtLog.Text.Length
        $script:txtLog.ScrollToCaret()
    }

    Write-Event -Type "LOG" -Message $Text
}

function AgentLine {
    param([string]$Message)
    return $Message
}

function Test-Cmd {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-AgentLeePreferredCameraName {
    $paths = @(
        "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\desktop-runtime\camera-preference.json",
        "D:\Leeway-Ecosystem v2.1.4\scripts\agent-lee-camera-preference.json"
    )

    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $cfg = Get-Content $p -Raw | ConvertFrom-Json

                if ($cfg.status -eq "USB_WEBCAM_PROVEN_READY" -and -not [string]::IsNullOrWhiteSpace([string]$cfg.selectedCameraName)) {
                    return [string]$cfg.selectedCameraName
                }

                if ($cfg.status -like "*BLOCKED*") {
                    return ""
                }
            } catch {}
        }
    }

    return ""
}

function Assert-AgentLeeUsbWebcamOnly {
    param([string]$CameraName)

    if ([string]::IsNullOrWhiteSpace($CameraName)) {
        return $false
    }

    if ($CameraName -match "(?i)integrated|built-in|builtin|front|ir camera|windows hello|laptop") {
        return $false
    }

    return $true
}

function Speak-AgentLee {
    param([string]$Text)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $reqPath = "$ProofRoot\voice\xtts-request-$stamp.json"
    $resPath = "$ProofRoot\voice\xtts-response-$stamp.json"
    $wavPath = "$ProofRoot\voice\agent-lee-speech-$stamp.wav"

    try {
        Log ("AGENT LEE says: " + $Text)

        $body = [ordered]@{
            text = $Text
            voice = "agent-lee"
            requireCanonicalCloneVoice = $true
            noFallback = $true
        }

        Write-JsonFile $reqPath $body

        $res = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8092/tts" `
            -Method POST `
            -ContentType "application/json" `
            -Body ($body | ConvertTo-Json -Depth 20) `
            -TimeoutSec 900

        Write-JsonFile $resPath $res

        $audioUrl = $null
        foreach ($k in @("audio_url","audioUrl","url","file","filename","path","audio_path")) {
            if ($res.PSObject.Properties.Name -contains $k) {
                $v = [string]$res.$k
                if ($v -like "http*") {
                    $audioUrl = $v
                } elseif (-not [string]::IsNullOrWhiteSpace($v)) {
                    $audioUrl = "http://127.0.0.1:8092/audio/$([System.IO.Path]::GetFileName($v))"
                }
            }
        }

        if ($audioUrl) {
            Invoke-WebRequest -Uri $audioUrl -OutFile $wavPath -TimeoutSec 180 | Out-Null
            $player = New-Object System.Media.SoundPlayer
            $player.SoundLocation = $wavPath
            $player.Load()
            $player.PlaySync()

            Write-Event -Type "AGENT_LEE_SPOKE" -Message $Text -Data @{ wavPath = $wavPath }
            return $wavPath
        }

        Log "VOICE BLOCKED: XTTS returned no audio URL."
        return $null
    } catch {
        Log ("VOICE FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Listen-Once {
    param([int]$Seconds = 12, [string]$Purpose = "voice_input")

    if (-not $script:SpeechAvailable) {
        Log "EARS BLOCKED: System.Speech is unavailable."
        return $null
    }

    try {
        Log ("EARS LISTENING: " + $Purpose)

        $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $grammar = New-Object System.Speech.Recognition.DictationGrammar
        $rec.LoadGrammar($grammar)
        $rec.SetInputToDefaultAudioDevice()

        $result = $rec.Recognize([TimeSpan]::FromSeconds($Seconds))
        $rec.Dispose()

        if ($result) {
            $heard = [string]$result.Text
            $confidence = [double]$result.Confidence

            $line = "PURPOSE={0} CONFIDENCE={1:N2} HEARD={2}" -f $Purpose, $confidence, $heard
            Add-Content -Path $SpeechLog -Value $line -Encoding UTF8

            Log ("HEARD: " + $heard)

            return [ordered]@{
                text = $heard
                confidence = $confidence
            }
        }

        Log "EARS PARTIAL: no speech recognized."
        return $null
    } catch {
        Log ("EARS FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Get-VoiceApproval {
    param([string]$Question, [string]$ActionName)

    $yesWords = @("yes","yeah","yep","approve","approved","i approve","go ahead","do it","print it","print","okay","ok","run it")
    $noWords = @("no","nope","stop","cancel","do not","don't","hold up","wait")

    for ($i = 1; $i -le 2; $i++) {
        Speak-AgentLee $Question | Out-Null
        $heard = Listen-Once -Seconds 10 -Purpose ("approval:" + $ActionName)

        if ($heard -and $heard.text) {
            $text = $heard.text.ToLowerInvariant()

            foreach ($n in $noWords) {
                if ($text -like "*$n*") {
                    Speak-AgentLee "Bet. I heard you. I am holding that action, no move." | Out-Null
                    return [ordered]@{ approved = $false; heard = $heard.text; reason = "denied_by_voice" }
                }
            }

            foreach ($y in $yesWords) {
                if ($text -like "*$y*") {
                    Speak-AgentLee "Say less. Approval locked in. I am moving now." | Out-Null
                    return [ordered]@{ approved = $true; heard = $heard.text; reason = "approved_by_voice" }
                }
            }

            Speak-AgentLee "I heard sound, but not a clean yes. Say yes, approve, go ahead, or cancel." | Out-Null
        } else {
            Speak-AgentLee "I did not catch that. Give me a clear yes or cancel." | Out-Null
        }
    }

    return [ordered]@{ approved = $false; heard = ""; reason = "no_clear_voice_approval" }
}

function Get-Cameras {
    $inventory = "$ProofRoot\camera\camera-inventory.txt"
    $cams = @()

    if (-not (Test-Cmd "ffmpeg")) {
        return @()
    }

    try {
        ffmpeg -hide_banner -list_devices true -f dshow -i dummy 2> $inventory
        $txt = Get-Content $inventory -Raw -ErrorAction SilentlyContinue
        $matches = [regex]::Matches($txt, '"([^"]+)"\s+\(video\)')

        for ($i = 0; $i -lt $matches.Count; $i++) {
            $name = $matches[$i].Groups[1].Value
            $score = 0
            if ($name -match "usb|webcam|logitech|brio|c920|c922|external|hd webcam") { $score += 10 }
            if ($name -match "integrated|built-in|ir|laptop|front") { $score -= 10 }
            $cams += [ordered]@{ index = $i; name = $name; score = $score }
        }
    } catch {}

    return @($cams | Sort-Object score -Descending)
}

function Capture-Webcam {
    param([string]$CameraName)

    if ([string]::IsNullOrWhiteSpace($CameraName)) {
        Log "CAMERA BLOCKED: no selected camera."
        return $null
    }

    if (-not (Test-Cmd "ffmpeg")) {
        Log "CAMERA BLOCKED: ffmpeg not found."
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $frame = "$ProofRoot\camera\webcam-frame-$stamp.png"
    $logPath = "$ProofRoot\camera\webcam-capture-$stamp.log"

    try {
        Log ("Capturing selected webcam: " + $CameraName)
        & ffmpeg -y -f dshow -i "video=$CameraName" -frames:v 1 $frame 2>&1 | Tee-Object -FilePath $logPath | Out-Null

        if (Test-Path $frame) {
            $bytes = (Get-Item $frame).Length
            if ($bytes -gt 1000) {
                Log ("CAMERA READY: captured frame. Bytes=" + $bytes)
                Start-Process $frame
                return $frame
            }
        }

        Log "CAMERA FAILED: no valid frame produced."
        return $null
    } catch {
        Log ("CAMERA FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Create-RequestedImage {
    param([string]$Prompt)

    Add-Type -AssemblyName System.Drawing

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = "$ProofRoot\image\requested-image-$stamp.png"

    $bmp = New-Object System.Drawing.Bitmap 1400, 900
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    try {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::FromArgb(10, 12, 24))

        $title = New-Object System.Drawing.Font("Arial", [single]34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
        $body = New-Object System.Drawing.Font("Arial", [single]20, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
        $small = New-Object System.Drawing.Font("Arial", [single]13, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)

        $gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Gold)
        $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::DeepSkyBlue)
        $gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::LightGray)
        $penGold = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 5)
        $penCyan = New-Object System.Drawing.Pen([System.Drawing.Color]::DeepSkyBlue, 3)

        $g.DrawString("Agent Lee Requested Image", $title, $gold, 55, 45)
        $g.DrawString("Leonard asked for:", $body, $cyan, 55, 125)

        $rect = New-Object System.Drawing.RectangleF([single]55, [single]170, [single]1280, [single]120)
        $g.DrawString($Prompt, $body, $white, $rect)

        $g.DrawRectangle($penCyan, 55, 320, 1290, 500)

        $cx = 700
        $cy = 555

        for ($i = 0; $i -lt 11; $i++) {
            $r = 35 + ($i * 24)
            $pen = if ($i % 2 -eq 0) { $penGold } else { $penCyan }
            $g.DrawEllipse($pen, $cx - $r, $cy - $r, $r * 2, $r * 2)
        }

        $g.FillEllipse($gold, 620, 475, 160, 160)
        $g.DrawString("LEE", $title, [System.Drawing.Brushes]::Black, 662, 522)

        $g.DrawString("TRUTH: local render from requested prompt. Full AI image route requires an installed image model endpoint.", $small, $gray, 60, 840)

        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        Start-Process $path
        Log ("IMAGE READY: " + $path)
        return $path
    } finally {
        if ($g) { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
    }
}

function Create-Video {
    param([string]$ImagePath)

    if (-not (Test-Path $ImagePath)) {
        Log "VIDEO BLOCKED: image missing."
        return $null
    }

    if (-not (Test-Cmd "ffmpeg")) {
        Log "VIDEO BLOCKED: ffmpeg not found."
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $video = "$ProofRoot\video\agent-lee-real-video-$stamp.mp4"
    $logPath = "$ProofRoot\video\ffmpeg-video-$stamp.log"

    try {
        & ffmpeg -y -loop 1 -i $ImagePath -t 8 -vf "scale=1280:720,format=yuv420p" -r 24 $video 2>&1 | Tee-Object -FilePath $logPath | Out-Null

        if (Test-Path $video) {
            $bytes = (Get-Item $video).Length
            if ($bytes -gt 1000) {
                Log ("VIDEO READY: real MP4 created. Bytes=" + $bytes)
                Start-Process $video
                return $video
            }
        }

        Log "VIDEO FAILED: no valid MP4 produced."
        return $null
    } catch {
        Log ("VIDEO FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Create-Obj {
    param([string]$Prompt)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $obj = "$ProofRoot\3d\agent-lee-object-$stamp.obj"

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Agent Lee 3D object")
    $lines.Add("# Prompt: $Prompt")
    $lines.Add("# TRUTH: procedural OBJ fallback. Real AI image-to-3D route not proven.")

    $segments = 32
    $levels = @(
        @{ z = 0.0; r = 1.00 },
        @{ z = 0.3; r = 1.25 },
        @{ z = 0.7; r = 0.60 },
        @{ z = 1.4; r = 0.50 },
        @{ z = 2.0; r = 0.75 },
        @{ z = 2.5; r = 0.35 },
        @{ z = 2.9; r = 0.00 }
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

    Set-Content -Path $obj -Value $lines -Encoding UTF8
    Log ("3D OBJ READY: " + $obj)
    Start-Process explorer.exe (Split-Path -Parent $obj)
    return $obj
}

function Get-NetworkReport {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = "$ProofRoot\network\network-phone-report-$stamp.json"
    $items = @()

    try {
        $neighbors = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
            $_.IPAddress -and $_.LinkLayerAddress -and $_.State -ne "Unreachable"
        })

        foreach ($n in $neighbors) {
            $ip = [string]$n.IPAddress
            $mac = [string]$n.LinkLayerAddress
            $host = ""

            try {
                $dns = Resolve-DnsName -Name $ip -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($dns) { $host = [string]$dns.NameHost }
            } catch {}

            $brand = "UNKNOWN_NOT_PROVEN"
            $type = "UNKNOWN_NOT_PROVEN"

            if ($host -match "iphone|ipad|apple") {
                $brand = "APPLE_FROM_HOSTNAME"
                $type = "IPHONE_OR_IPAD_FROM_HOSTNAME"
            } elseif ($host -match "android|galaxy|samsung|pixel|oneplus|moto|motorola") {
                $brand = "ANDROID_FROM_HOSTNAME"
                $type = "ANDROID_PHONE_OR_TABLET_FROM_HOSTNAME"
            }

            $items += [ordered]@{
                ipAddress = $ip
                macAddress = $mac
                hostname = $host
                brandEvidence = $brand
                deviceTypeEvidence = $type
                proofLimit = "Private MAC/random hostname can hide exact phone brand/model."
            }
        }
    } catch {
        $items += [ordered]@{ error = $_.Exception.Message }
    }

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        devices = $items
        truth = "No exact iPhone/Android claim unless hostname/evidence proves it."
    }

    Write-JsonFile $path $obj
    Start-Process notepad.exe $path
    Log ("NETWORK REPORT READY: " + $path)
    return $path
}

function Build-Website {
    param(
        [string]$Prompt,
        [string]$Image,
        [string]$Video,
        [string]$Obj,
        [string]$Network
    )

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $dir = "$ProofRoot\website\site-$stamp"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    if ($Image -and (Test-Path $Image)) { Copy-Item $Image "$dir\requested-image.png" -Force }
    if ($Video -and (Test-Path $Video)) { Copy-Item $Video "$dir\requested-video.mp4" -Force }
    if ($Obj -and (Test-Path $Obj)) { Copy-Item $Obj "$dir\requested-object.obj" -Force }
    if ($Network -and (Test-Path $Network)) { Copy-Item $Network "$dir\network-report.json" -Force }

    $index = "$dir\index.html"

    $html = @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Agent Lee Full Voice Flow</title>
<style>
body { font-family: Arial, sans-serif; background:#111827; color:white; margin:40px; }
.card { background:#1f2937; border:1px solid #374151; border-radius:14px; padding:20px; margin:20px 0; }
img, video { max-width:900px; width:100%; border:2px solid gold; border-radius:10px; }
a { color:#93c5fd; }
</style>
</head>
<body>
<h1>Agent Lee Full Voice Flow Report</h1>
<div class="card"><h2>Leonard's requested image prompt</h2><p>$Prompt</p></div>
<div class="card"><h2>Requested Image</h2><img src="requested-image.png"></div>
<div class="card"><h2>Real MP4 Video</h2><video src="requested-video.mp4" controls></video></div>
<div class="card"><h2>3D OBJ</h2><a href="requested-object.obj">Open 3D object</a></div>
<div class="card"><h2>Network / Phone Discovery</h2><a href="network-report.json">Open network report</a></div>
</body>
</html>
"@

    Set-Content -Path $index -Value $html -Encoding UTF8
    Start-Process $index
    Log ("WEBSITE READY: " + $index)
    return $index
}

function Print-Report {
    param(
        [string]$Prompt,
        [string]$Image,
        [string]$Video,
        [string]$Obj,
        [string]$Network
    )

    try {
        $printers = @(Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    } catch {
        $printers = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    }

    $selected = $printers | Where-Object { $_.Name -match "HP|OfficeJet|8020" } | Select-Object -First 1
    if (-not $selected) { $selected = $printers | Select-Object -First 1 }

    if (-not $selected) {
        Speak-AgentLee "I cannot print because Windows did not return a printer." | Out-Null
        Log "PRINT BLOCKED: no printer found."
        return $null
    }

    $approval = Get-VoiceApproval `
        -ActionName "physical_print" `
        -Question "Leonard, I got the report ready for printer $($selected.Name). You want me to print it now? Say yes, approve, go ahead, or cancel."

    if (-not $approval.approved) {
        Log "PRINT NOT SUBMITTED: no voice approval."
        return $null
    }

    Add-Type -AssemblyName System.Drawing

    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings.PrinterName = $selected.Name
    $doc.DocumentName = "Agent Lee Full Voice Flow Report"

    $doc.add_PrintPage({
        param($sender, $e)

        $g = $e.Graphics
        $fontTitle = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
        $fontBody = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Regular)
        $fontSmall = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Regular)
        $brush = [System.Drawing.Brushes]::Black

        $y = 40
        $g.DrawString("Agent Lee Full Voice Flow Report", $fontTitle, $brush, 40, $y)
        $y += 45
        $g.DrawString(("Prompt: " + $Prompt), $fontBody, $brush, 40, $y)
        $y += 30
        $g.DrawString(("Image: " + $Image), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("Video: " + $Video), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("3D OBJ: " + $Obj), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("Network Report: " + $Network), $fontSmall, $brush, 40, $y)
        $y += 35
        $g.DrawString("Printed only after voice approval.", $fontBody, $brush, 40, $y)
        $y += 30

        if ($Image -and (Test-Path $Image)) {
            try {
                $img = [System.Drawing.Image]::FromFile($Image)
                $g.DrawImage($img, 40, $y, 420, 270)
                $img.Dispose()
            } catch {}
        }
    })

    try {
        $doc.Print()
        Log ("PRINT SUBMITTED TO: " + $selected.Name)
        Speak-AgentLee "Done. I submitted the print job to the printer." | Out-Null
        return $selected.Name
    } catch {
        Log ("PRINT FAILED: " + $_.Exception.Message)
        Speak-AgentLee "I tried to print, but Windows returned an error." | Out-Null
        return $null
    }
}

function Run-FullVoiceFlow {
    if ($script:FlowRunning) { return }
    $script:FlowRunning = $true

    try {
        Log "FULL VOICE FLOW AUTO STARTED."

        Speak-AgentLee "Peace Leonard. Agent Lee online. Aight, we doing this voice first. No typing, no extra button chasing. Tell me what image you want me to create." | Out-Null

        $heard = Listen-Once -Seconds 14 -Purpose "requested_image_prompt"

        if ($heard -and $heard.text) {
            $script:LastPrompt = $heard.text
            $txtPrompt.Text = $script:LastPrompt
            Speak-AgentLee ("Bet. I heard you say: " + $script:LastPrompt + ". I am moving through the full flow now.") | Out-Null
        } else {
            $script:LastPrompt = "Create a powerful futuristic blue lion standing beside a chess board"
            $txtPrompt.Text = $script:LastPrompt
            Speak-AgentLee "I did not catch the image request clean, so I am using the fallback prompt shown in my panel." | Out-Null
        }

        $preferredCameraName = Get-AgentLeePreferredCameraName
$cmbCamera.Items.Clear()

if (Assert-AgentLeeUsbWebcamOnly -CameraName $preferredCameraName) {
    [void]$cmbCamera.Items.Add($preferredCameraName)
    $cmbCamera.SelectedIndex = 0
    Log ("USB WEBCAM LOCK ACTIVE: " + $preferredCameraName)
} else {
    Log "CAMERA BLOCKED: no proven USB webcam preference. Integrated Camera will not be used."
}

        $preferredCameraName = Get-AgentLeePreferredCameraName

if (Assert-AgentLeeUsbWebcamOnly -CameraName $preferredCameraName) {
    Speak-AgentLee ("I am using the locked USB webcam: " + $preferredCameraName) | Out-Null
    $script:LastCamera = Capture-Webcam -CameraName $preferredCameraName
} else {
    Speak-AgentLee "Camera lane blocked. I will not use the integrated laptop camera. I need the USB webcam proven first." | Out-Null
    Log "CAMERA BLOCKED: refused to use Integrated Camera."
}

        Start-Process ("https://duckduckgo.com/?q=" + [uri]::EscapeDataString($script:LastPrompt + " image to 3D workflow chess game information"))
        Log "WEB SEARCH OPENED."
        Speak-AgentLee "I opened web research for the image, 3D workflow, and background information." | Out-Null

        $script:LastImage = Create-RequestedImage -Prompt $script:LastPrompt
        Speak-AgentLee "I created and opened the requested image artifact." | Out-Null

        $script:LastVideo = Create-Video -ImagePath $script:LastImage
        if ($script:LastVideo) {
            Speak-AgentLee "I created a real MP4 video and opened it. You should see a real play button." | Out-Null
        }

        $script:LastObj = Create-Obj -Prompt $script:LastPrompt
        Speak-AgentLee "I created the 3D object file. I am truth-labeling it as procedural unless the full image to 3D model route is installed." | Out-Null

        $script:LastNetwork = Get-NetworkReport
        Speak-AgentLee "I created the network report. I will not fake phone brands. If Windows cannot prove iPhone or Android, I mark it unknown." | Out-Null

        $script:LastWebsite = Build-Website -Prompt $script:LastPrompt -Image $script:LastImage -Video $script:LastVideo -Obj $script:LastObj -Network $script:LastNetwork
        Speak-AgentLee "I opened the website report with image, video player, 3D object link, and network report." | Out-Null

        Print-Report -Prompt $script:LastPrompt -Image $script:LastImage -Video $script:LastVideo -Obj $script:LastObj -Network $script:LastNetwork | Out-Null

        Speak-AgentLee "Full voice flow complete. That is the demo, voice first, OG mode, proof on disk." | Out-Null
        Log "FULL VOICE FLOW COMPLETE."
    } finally {
        $script:FlowRunning = $false
    }
}

# UI bubble and fallback panel.
$formBubble = New-Object System.Windows.Forms.Form
$formBubble.Text = "Agent Lee UI"
$formBubble.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$formBubble.TopMost = $true
$formBubble.ShowInTaskbar = $false
$formBubble.Width = 170
$formBubble.Height = 90
$formBubble.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$formBubble.BackColor = [System.Drawing.Color]::Magenta
$formBubble.TransparencyKey = [System.Drawing.Color]::Magenta

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$formBubble.Left = $screen.Right - 210
$formBubble.Top = $screen.Bottom - 140

$panelBubble = New-Object System.Windows.Forms.Panel
$panelBubble.Width = 165
$panelBubble.Height = 85
$panelBubble.Left = 0
$panelBubble.Top = 0
$panelBubble.BackColor = [System.Drawing.Color]::Transparent
$formBubble.Controls.Add($panelBubble)

$panelBubble.Add_Paint({
    param($sender, $e)

    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0, 170, 255))
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 4)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 20, 20, 20))
    $font1 = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
    $font2 = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)

    $g.FillEllipse($blue, 5, 5, 70, 70)
    $g.DrawEllipse($goldPen, 5, 5, 70, 70)
    $g.DrawString("LEE", $font1, $white, 23, 20)
    $g.DrawString("LIVE", $font2, $white, 20, 43)

    $g.FillRectangle($dark, 78, 16, 82, 42)
    $g.DrawRectangle($goldPen, 78, 16, 82, 42)
    $g.DrawString("AGENT", $font2, $white, 93, 20)
    $g.DrawString("LEE UI", $font2, $white, 93, 38)
})

$script:dragging = $false
$script:dragX = 0
$script:dragY = 0
$script:moved = $false

$panelBubble.Add_MouseDown({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:dragging = $true
        $script:dragX = $e.X
        $script:dragY = $e.Y
        $script:moved = $false
    }
})

$panelBubble.Add_MouseMove({
    param($sender, $e)
    if ($script:dragging) {
        $pos = [System.Windows.Forms.Cursor]::Position
        $newLeft = $pos.X - $script:dragX
        $newTop = $pos.Y - $script:dragY
        if (([Math]::Abs($formBubble.Left - $newLeft) -gt 2) -or ([Math]::Abs($formBubble.Top - $newTop) -gt 2)) {
            $script:moved = $true
        }
        $formBubble.Left = $newLeft
        $formBubble.Top = $newTop
    }
})

$panelBubble.Add_MouseUp({ $script:dragging = $false })

$formPanel = New-Object System.Windows.Forms.Form
$formPanel.Text = "Agent Lee Fallback Chat / Control"
$formPanel.Width = 980
$formPanel.Height = 640
$formPanel.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen

$script:txtLog = New-Object System.Windows.Forms.TextBox
$script:txtLog.Multiline = $true
$script:txtLog.ScrollBars = "Vertical"
$script:txtLog.ReadOnly = $true
$script:txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$script:txtLog.Left = 15
$script:txtLog.Top = 15
$script:txtLog.Width = 930
$script:txtLog.Height = 300
$formPanel.Controls.Add($script:txtLog)

$txtPrompt = New-Object System.Windows.Forms.TextBox
$txtPrompt.Left = 15
$txtPrompt.Top = 335
$txtPrompt.Width = 930
$txtPrompt.Height = 30
$formPanel.Controls.Add($txtPrompt)

$cmbCamera = New-Object System.Windows.Forms.ComboBox
$cmbCamera.Left = 15
$cmbCamera.Top = 385
$cmbCamera.Width = 540
$cmbCamera.DropDownStyle = "DropDownList"
$formPanel.Controls.Add($cmbCamera)

$btnProof = New-Object System.Windows.Forms.Button
$btnProof.Text = "Open Proof Folder"
$btnProof.Left = 15
$btnProof.Top = 435
$btnProof.Width = 180
$btnProof.Height = 40
$formPanel.Controls.Add($btnProof)

$btnSpeakAgain = New-Object System.Windows.Forms.Button
$btnSpeakAgain.Text = "Speak Again"
$btnSpeakAgain.Left = 210
$btnSpeakAgain.Top = 435
$btnSpeakAgain.Width = 150
$btnSpeakAgain.Height = 40
$formPanel.Controls.Add($btnSpeakAgain)

$lblRule = New-Object System.Windows.Forms.Label
$lblRule.Left = 15
$lblRule.Top = 500
$lblRule.Width = 930
$lblRule.Height = 80
$lblRule.Text = "This panel is fallback only. Agent Lee starts the full voice flow automatically. No Run button. No typed PRINT."
$formPanel.Controls.Add($lblRule)

$btnProof.Add_Click({
    Start-Process explorer.exe $ProofRoot
    Log ("Opened proof folder: " + $ProofRoot)
})

$btnSpeakAgain.Add_Click({
    Speak-AgentLee "I am here, Leonard. The full voice flow runs automatically. This panel is only fallback control." | Out-Null
})

$panelBubble.Add_Click({
    if (-not $script:moved) {
        $formPanel.Show()
        $formPanel.Activate()
        Log "Fallback chat/control panel opened from AGENT / LEE UI bubble."
    }
})

$formPanel.Add_FormClosing({
    param($sender, $e)
    $e.Cancel = $true
    $formPanel.Hide()
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1200
$timer.Add_Tick({
    $timer.Stop()
    Run-FullVoiceFlow
})

$formBubble.Add_Shown({
    Write-Event -Type "AGENT_LEE_V5_STARTED" -Message "Voice-first auto operator started."
    $formPanel.Show()
    $formPanel.Activate()
    $timer.Start()
})

[System.Windows.Forms.Application]::Run($formBubble)
.isExternalCandidate -eq $true -and param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [string]$ProofRoot = ""
)

$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    Add-Type -AssemblyName System.Speech
    $script:SpeechAvailable = $true
} catch {
    $script:SpeechAvailable = $false
}

if ([string]::IsNullOrWhiteSpace($ProofRoot)) {
    $ProofRoot = Join-Path $Root ("Archive\proofs\agent-lee-v5-voice-first-auto-live-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

foreach ($d in @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\voice",
    "$ProofRoot\ears",
    "$ProofRoot\camera",
    "$ProofRoot\image",
    "$ProofRoot\video",
    "$ProofRoot\3d",
    "$ProofRoot\network",
    "$ProofRoot\website",
    "$ProofRoot\printer"
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$EventLog = "$ProofRoot\logs\agent-lee-v5-events.jsonl"
$SpeechLog = "$ProofRoot\ears\heard-transcript.txt"

function Write-JsonFile {
    param([string]$Path, $Object)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth 60), $utf8)
}

function Write-Event {
    param([string]$Type, [string]$Message, $Data = $null)

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        data = $Data
    }

    Add-Content -Path $EventLog -Value ($obj | ConvertTo-Json -Compress -Depth 30) -Encoding UTF8
}

function Log {
    param([string]$Text)

    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text

    if ($script:txtLog) {
        $script:txtLog.AppendText($line + [Environment]::NewLine)
        $script:txtLog.SelectionStart = $script:txtLog.Text.Length
        $script:txtLog.ScrollToCaret()
    }

    Write-Event -Type "LOG" -Message $Text
}

function AgentLine {
    param([string]$Message)
    return $Message
}

function Test-Cmd {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-AgentLeePreferredCameraName {
    $paths = @(
        "D:\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\desktop-runtime\camera-preference.json",
        "D:\Leeway-Ecosystem v2.1.4\scripts\agent-lee-camera-preference.json"
    )

    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $cfg = Get-Content $p -Raw | ConvertFrom-Json

                if ($cfg.status -eq "USB_WEBCAM_PROVEN_READY" -and -not [string]::IsNullOrWhiteSpace([string]$cfg.selectedCameraName)) {
                    return [string]$cfg.selectedCameraName
                }

                if ($cfg.status -like "*BLOCKED*") {
                    return ""
                }
            } catch {}
        }
    }

    return ""
}

function Assert-AgentLeeUsbWebcamOnly {
    param([string]$CameraName)

    if ([string]::IsNullOrWhiteSpace($CameraName)) {
        return $false
    }

    if ($CameraName -match "(?i)integrated|built-in|builtin|front|ir camera|windows hello|laptop") {
        return $false
    }

    return $true
}

function Speak-AgentLee {
    param([string]$Text)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $reqPath = "$ProofRoot\voice\xtts-request-$stamp.json"
    $resPath = "$ProofRoot\voice\xtts-response-$stamp.json"
    $wavPath = "$ProofRoot\voice\agent-lee-speech-$stamp.wav"

    try {
        Log ("AGENT LEE says: " + $Text)

        $body = [ordered]@{
            text = $Text
            voice = "agent-lee"
            requireCanonicalCloneVoice = $true
            noFallback = $true
        }

        Write-JsonFile $reqPath $body

        $res = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8092/tts" `
            -Method POST `
            -ContentType "application/json" `
            -Body ($body | ConvertTo-Json -Depth 20) `
            -TimeoutSec 900

        Write-JsonFile $resPath $res

        $audioUrl = $null
        foreach ($k in @("audio_url","audioUrl","url","file","filename","path","audio_path")) {
            if ($res.PSObject.Properties.Name -contains $k) {
                $v = [string]$res.$k
                if ($v -like "http*") {
                    $audioUrl = $v
                } elseif (-not [string]::IsNullOrWhiteSpace($v)) {
                    $audioUrl = "http://127.0.0.1:8092/audio/$([System.IO.Path]::GetFileName($v))"
                }
            }
        }

        if ($audioUrl) {
            Invoke-WebRequest -Uri $audioUrl -OutFile $wavPath -TimeoutSec 180 | Out-Null
            $player = New-Object System.Media.SoundPlayer
            $player.SoundLocation = $wavPath
            $player.Load()
            $player.PlaySync()

            Write-Event -Type "AGENT_LEE_SPOKE" -Message $Text -Data @{ wavPath = $wavPath }
            return $wavPath
        }

        Log "VOICE BLOCKED: XTTS returned no audio URL."
        return $null
    } catch {
        Log ("VOICE FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Listen-Once {
    param([int]$Seconds = 12, [string]$Purpose = "voice_input")

    if (-not $script:SpeechAvailable) {
        Log "EARS BLOCKED: System.Speech is unavailable."
        return $null
    }

    try {
        Log ("EARS LISTENING: " + $Purpose)

        $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $grammar = New-Object System.Speech.Recognition.DictationGrammar
        $rec.LoadGrammar($grammar)
        $rec.SetInputToDefaultAudioDevice()

        $result = $rec.Recognize([TimeSpan]::FromSeconds($Seconds))
        $rec.Dispose()

        if ($result) {
            $heard = [string]$result.Text
            $confidence = [double]$result.Confidence

            $line = "PURPOSE={0} CONFIDENCE={1:N2} HEARD={2}" -f $Purpose, $confidence, $heard
            Add-Content -Path $SpeechLog -Value $line -Encoding UTF8

            Log ("HEARD: " + $heard)

            return [ordered]@{
                text = $heard
                confidence = $confidence
            }
        }

        Log "EARS PARTIAL: no speech recognized."
        return $null
    } catch {
        Log ("EARS FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Get-VoiceApproval {
    param([string]$Question, [string]$ActionName)

    $yesWords = @("yes","yeah","yep","approve","approved","i approve","go ahead","do it","print it","print","okay","ok","run it")
    $noWords = @("no","nope","stop","cancel","do not","don't","hold up","wait")

    for ($i = 1; $i -le 2; $i++) {
        Speak-AgentLee $Question | Out-Null
        $heard = Listen-Once -Seconds 10 -Purpose ("approval:" + $ActionName)

        if ($heard -and $heard.text) {
            $text = $heard.text.ToLowerInvariant()

            foreach ($n in $noWords) {
                if ($text -like "*$n*") {
                    Speak-AgentLee "Bet. I heard you. I am holding that action, no move." | Out-Null
                    return [ordered]@{ approved = $false; heard = $heard.text; reason = "denied_by_voice" }
                }
            }

            foreach ($y in $yesWords) {
                if ($text -like "*$y*") {
                    Speak-AgentLee "Say less. Approval locked in. I am moving now." | Out-Null
                    return [ordered]@{ approved = $true; heard = $heard.text; reason = "approved_by_voice" }
                }
            }

            Speak-AgentLee "I heard sound, but not a clean yes. Say yes, approve, go ahead, or cancel." | Out-Null
        } else {
            Speak-AgentLee "I did not catch that. Give me a clear yes or cancel." | Out-Null
        }
    }

    return [ordered]@{ approved = $false; heard = ""; reason = "no_clear_voice_approval" }
}

function Get-Cameras {
    $inventory = "$ProofRoot\camera\camera-inventory.txt"
    $cams = @()

    if (-not (Test-Cmd "ffmpeg")) {
        return @()
    }

    try {
        ffmpeg -hide_banner -list_devices true -f dshow -i dummy 2> $inventory
        $txt = Get-Content $inventory -Raw -ErrorAction SilentlyContinue
        $matches = [regex]::Matches($txt, '"([^"]+)"\s+\(video\)')

        for ($i = 0; $i -lt $matches.Count; $i++) {
            $name = $matches[$i].Groups[1].Value
            $score = 0
            if ($name -match "usb|webcam|logitech|brio|c920|c922|external|hd webcam") { $score += 10 }
            if ($name -match "integrated|built-in|ir|laptop|front") { $score -= 10 }
            $cams += [ordered]@{ index = $i; name = $name; score = $score }
        }
    } catch {}

    return @($cams | Sort-Object score -Descending)
}

function Capture-Webcam {
    param([string]$CameraName)

    if ([string]::IsNullOrWhiteSpace($CameraName)) {
        Log "CAMERA BLOCKED: no selected camera."
        return $null
    }

    if (-not (Test-Cmd "ffmpeg")) {
        Log "CAMERA BLOCKED: ffmpeg not found."
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $frame = "$ProofRoot\camera\webcam-frame-$stamp.png"
    $logPath = "$ProofRoot\camera\webcam-capture-$stamp.log"

    try {
        Log ("Capturing selected webcam: " + $CameraName)
        & ffmpeg -y -f dshow -i "video=$CameraName" -frames:v 1 $frame 2>&1 | Tee-Object -FilePath $logPath | Out-Null

        if (Test-Path $frame) {
            $bytes = (Get-Item $frame).Length
            if ($bytes -gt 1000) {
                Log ("CAMERA READY: captured frame. Bytes=" + $bytes)
                Start-Process $frame
                return $frame
            }
        }

        Log "CAMERA FAILED: no valid frame produced."
        return $null
    } catch {
        Log ("CAMERA FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Create-RequestedImage {
    param([string]$Prompt)

    Add-Type -AssemblyName System.Drawing

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = "$ProofRoot\image\requested-image-$stamp.png"

    $bmp = New-Object System.Drawing.Bitmap 1400, 900
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    try {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::FromArgb(10, 12, 24))

        $title = New-Object System.Drawing.Font("Arial", [single]34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
        $body = New-Object System.Drawing.Font("Arial", [single]20, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
        $small = New-Object System.Drawing.Font("Arial", [single]13, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)

        $gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Gold)
        $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::DeepSkyBlue)
        $gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::LightGray)
        $penGold = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 5)
        $penCyan = New-Object System.Drawing.Pen([System.Drawing.Color]::DeepSkyBlue, 3)

        $g.DrawString("Agent Lee Requested Image", $title, $gold, 55, 45)
        $g.DrawString("Leonard asked for:", $body, $cyan, 55, 125)

        $rect = New-Object System.Drawing.RectangleF([single]55, [single]170, [single]1280, [single]120)
        $g.DrawString($Prompt, $body, $white, $rect)

        $g.DrawRectangle($penCyan, 55, 320, 1290, 500)

        $cx = 700
        $cy = 555

        for ($i = 0; $i -lt 11; $i++) {
            $r = 35 + ($i * 24)
            $pen = if ($i % 2 -eq 0) { $penGold } else { $penCyan }
            $g.DrawEllipse($pen, $cx - $r, $cy - $r, $r * 2, $r * 2)
        }

        $g.FillEllipse($gold, 620, 475, 160, 160)
        $g.DrawString("LEE", $title, [System.Drawing.Brushes]::Black, 662, 522)

        $g.DrawString("TRUTH: local render from requested prompt. Full AI image route requires an installed image model endpoint.", $small, $gray, 60, 840)

        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        Start-Process $path
        Log ("IMAGE READY: " + $path)
        return $path
    } finally {
        if ($g) { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
    }
}

function Create-Video {
    param([string]$ImagePath)

    if (-not (Test-Path $ImagePath)) {
        Log "VIDEO BLOCKED: image missing."
        return $null
    }

    if (-not (Test-Cmd "ffmpeg")) {
        Log "VIDEO BLOCKED: ffmpeg not found."
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $video = "$ProofRoot\video\agent-lee-real-video-$stamp.mp4"
    $logPath = "$ProofRoot\video\ffmpeg-video-$stamp.log"

    try {
        & ffmpeg -y -loop 1 -i $ImagePath -t 8 -vf "scale=1280:720,format=yuv420p" -r 24 $video 2>&1 | Tee-Object -FilePath $logPath | Out-Null

        if (Test-Path $video) {
            $bytes = (Get-Item $video).Length
            if ($bytes -gt 1000) {
                Log ("VIDEO READY: real MP4 created. Bytes=" + $bytes)
                Start-Process $video
                return $video
            }
        }

        Log "VIDEO FAILED: no valid MP4 produced."
        return $null
    } catch {
        Log ("VIDEO FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Create-Obj {
    param([string]$Prompt)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $obj = "$ProofRoot\3d\agent-lee-object-$stamp.obj"

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Agent Lee 3D object")
    $lines.Add("# Prompt: $Prompt")
    $lines.Add("# TRUTH: procedural OBJ fallback. Real AI image-to-3D route not proven.")

    $segments = 32
    $levels = @(
        @{ z = 0.0; r = 1.00 },
        @{ z = 0.3; r = 1.25 },
        @{ z = 0.7; r = 0.60 },
        @{ z = 1.4; r = 0.50 },
        @{ z = 2.0; r = 0.75 },
        @{ z = 2.5; r = 0.35 },
        @{ z = 2.9; r = 0.00 }
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

    Set-Content -Path $obj -Value $lines -Encoding UTF8
    Log ("3D OBJ READY: " + $obj)
    Start-Process explorer.exe (Split-Path -Parent $obj)
    return $obj
}

function Get-NetworkReport {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = "$ProofRoot\network\network-phone-report-$stamp.json"
    $items = @()

    try {
        $neighbors = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
            $_.IPAddress -and $_.LinkLayerAddress -and $_.State -ne "Unreachable"
        })

        foreach ($n in $neighbors) {
            $ip = [string]$n.IPAddress
            $mac = [string]$n.LinkLayerAddress
            $host = ""

            try {
                $dns = Resolve-DnsName -Name $ip -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($dns) { $host = [string]$dns.NameHost }
            } catch {}

            $brand = "UNKNOWN_NOT_PROVEN"
            $type = "UNKNOWN_NOT_PROVEN"

            if ($host -match "iphone|ipad|apple") {
                $brand = "APPLE_FROM_HOSTNAME"
                $type = "IPHONE_OR_IPAD_FROM_HOSTNAME"
            } elseif ($host -match "android|galaxy|samsung|pixel|oneplus|moto|motorola") {
                $brand = "ANDROID_FROM_HOSTNAME"
                $type = "ANDROID_PHONE_OR_TABLET_FROM_HOSTNAME"
            }

            $items += [ordered]@{
                ipAddress = $ip
                macAddress = $mac
                hostname = $host
                brandEvidence = $brand
                deviceTypeEvidence = $type
                proofLimit = "Private MAC/random hostname can hide exact phone brand/model."
            }
        }
    } catch {
        $items += [ordered]@{ error = $_.Exception.Message }
    }

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        devices = $items
        truth = "No exact iPhone/Android claim unless hostname/evidence proves it."
    }

    Write-JsonFile $path $obj
    Start-Process notepad.exe $path
    Log ("NETWORK REPORT READY: " + $path)
    return $path
}

function Build-Website {
    param(
        [string]$Prompt,
        [string]$Image,
        [string]$Video,
        [string]$Obj,
        [string]$Network
    )

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $dir = "$ProofRoot\website\site-$stamp"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    if ($Image -and (Test-Path $Image)) { Copy-Item $Image "$dir\requested-image.png" -Force }
    if ($Video -and (Test-Path $Video)) { Copy-Item $Video "$dir\requested-video.mp4" -Force }
    if ($Obj -and (Test-Path $Obj)) { Copy-Item $Obj "$dir\requested-object.obj" -Force }
    if ($Network -and (Test-Path $Network)) { Copy-Item $Network "$dir\network-report.json" -Force }

    $index = "$dir\index.html"

    $html = @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Agent Lee Full Voice Flow</title>
<style>
body { font-family: Arial, sans-serif; background:#111827; color:white; margin:40px; }
.card { background:#1f2937; border:1px solid #374151; border-radius:14px; padding:20px; margin:20px 0; }
img, video { max-width:900px; width:100%; border:2px solid gold; border-radius:10px; }
a { color:#93c5fd; }
</style>
</head>
<body>
<h1>Agent Lee Full Voice Flow Report</h1>
<div class="card"><h2>Leonard's requested image prompt</h2><p>$Prompt</p></div>
<div class="card"><h2>Requested Image</h2><img src="requested-image.png"></div>
<div class="card"><h2>Real MP4 Video</h2><video src="requested-video.mp4" controls></video></div>
<div class="card"><h2>3D OBJ</h2><a href="requested-object.obj">Open 3D object</a></div>
<div class="card"><h2>Network / Phone Discovery</h2><a href="network-report.json">Open network report</a></div>
</body>
</html>
"@

    Set-Content -Path $index -Value $html -Encoding UTF8
    Start-Process $index
    Log ("WEBSITE READY: " + $index)
    return $index
}

function Print-Report {
    param(
        [string]$Prompt,
        [string]$Image,
        [string]$Video,
        [string]$Obj,
        [string]$Network
    )

    try {
        $printers = @(Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    } catch {
        $printers = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    }

    $selected = $printers | Where-Object { $_.Name -match "HP|OfficeJet|8020" } | Select-Object -First 1
    if (-not $selected) { $selected = $printers | Select-Object -First 1 }

    if (-not $selected) {
        Speak-AgentLee "I cannot print because Windows did not return a printer." | Out-Null
        Log "PRINT BLOCKED: no printer found."
        return $null
    }

    $approval = Get-VoiceApproval `
        -ActionName "physical_print" `
        -Question "Leonard, I got the report ready for printer $($selected.Name). You want me to print it now? Say yes, approve, go ahead, or cancel."

    if (-not $approval.approved) {
        Log "PRINT NOT SUBMITTED: no voice approval."
        return $null
    }

    Add-Type -AssemblyName System.Drawing

    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings.PrinterName = $selected.Name
    $doc.DocumentName = "Agent Lee Full Voice Flow Report"

    $doc.add_PrintPage({
        param($sender, $e)

        $g = $e.Graphics
        $fontTitle = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
        $fontBody = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Regular)
        $fontSmall = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Regular)
        $brush = [System.Drawing.Brushes]::Black

        $y = 40
        $g.DrawString("Agent Lee Full Voice Flow Report", $fontTitle, $brush, 40, $y)
        $y += 45
        $g.DrawString(("Prompt: " + $Prompt), $fontBody, $brush, 40, $y)
        $y += 30
        $g.DrawString(("Image: " + $Image), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("Video: " + $Video), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("3D OBJ: " + $Obj), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("Network Report: " + $Network), $fontSmall, $brush, 40, $y)
        $y += 35
        $g.DrawString("Printed only after voice approval.", $fontBody, $brush, 40, $y)
        $y += 30

        if ($Image -and (Test-Path $Image)) {
            try {
                $img = [System.Drawing.Image]::FromFile($Image)
                $g.DrawImage($img, 40, $y, 420, 270)
                $img.Dispose()
            } catch {}
        }
    })

    try {
        $doc.Print()
        Log ("PRINT SUBMITTED TO: " + $selected.Name)
        Speak-AgentLee "Done. I submitted the print job to the printer." | Out-Null
        return $selected.Name
    } catch {
        Log ("PRINT FAILED: " + $_.Exception.Message)
        Speak-AgentLee "I tried to print, but Windows returned an error." | Out-Null
        return $null
    }
}

function Run-FullVoiceFlow {
    if ($script:FlowRunning) { return }
    $script:FlowRunning = $true

    try {
        Log "FULL VOICE FLOW AUTO STARTED."

        Speak-AgentLee "Peace Leonard. Agent Lee online. Aight, we doing this voice first. No typing, no extra button chasing. Tell me what image you want me to create." | Out-Null

        $heard = Listen-Once -Seconds 14 -Purpose "requested_image_prompt"

        if ($heard -and $heard.text) {
            $script:LastPrompt = $heard.text
            $txtPrompt.Text = $script:LastPrompt
            Speak-AgentLee ("Bet. I heard you say: " + $script:LastPrompt + ". I am moving through the full flow now.") | Out-Null
        } else {
            $script:LastPrompt = "Create a powerful futuristic blue lion standing beside a chess board"
            $txtPrompt.Text = $script:LastPrompt
            Speak-AgentLee "I did not catch the image request clean, so I am using the fallback prompt shown in my panel." | Out-Null
        }

        $preferredCameraName = Get-AgentLeePreferredCameraName
$cmbCamera.Items.Clear()

if (Assert-AgentLeeUsbWebcamOnly -CameraName $preferredCameraName) {
    [void]$cmbCamera.Items.Add($preferredCameraName)
    $cmbCamera.SelectedIndex = 0
    Log ("USB WEBCAM LOCK ACTIVE: " + $preferredCameraName)
} else {
    Log "CAMERA BLOCKED: no proven USB webcam preference. Integrated Camera will not be used."
}

        $preferredCameraName = Get-AgentLeePreferredCameraName

if (Assert-AgentLeeUsbWebcamOnly -CameraName $preferredCameraName) {
    Speak-AgentLee ("I am using the locked USB webcam: " + $preferredCameraName) | Out-Null
    $script:LastCamera = Capture-Webcam -CameraName $preferredCameraName
} else {
    Speak-AgentLee "Camera lane blocked. I will not use the integrated laptop camera. I need the USB webcam proven first." | Out-Null
    Log "CAMERA BLOCKED: refused to use Integrated Camera."
}

        Start-Process ("https://duckduckgo.com/?q=" + [uri]::EscapeDataString($script:LastPrompt + " image to 3D workflow chess game information"))
        Log "WEB SEARCH OPENED."
        Speak-AgentLee "I opened web research for the image, 3D workflow, and background information." | Out-Null

        $script:LastImage = Create-RequestedImage -Prompt $script:LastPrompt
        Speak-AgentLee "I created and opened the requested image artifact." | Out-Null

        $script:LastVideo = Create-Video -ImagePath $script:LastImage
        if ($script:LastVideo) {
            Speak-AgentLee "I created a real MP4 video and opened it. You should see a real play button." | Out-Null
        }

        $script:LastObj = Create-Obj -Prompt $script:LastPrompt
        Speak-AgentLee "I created the 3D object file. I am truth-labeling it as procedural unless the full image to 3D model route is installed." | Out-Null

        $script:LastNetwork = Get-NetworkReport
        Speak-AgentLee "I created the network report. I will not fake phone brands. If Windows cannot prove iPhone or Android, I mark it unknown." | Out-Null

        $script:LastWebsite = Build-Website -Prompt $script:LastPrompt -Image $script:LastImage -Video $script:LastVideo -Obj $script:LastObj -Network $script:LastNetwork
        Speak-AgentLee "I opened the website report with image, video player, 3D object link, and network report." | Out-Null

        Print-Report -Prompt $script:LastPrompt -Image $script:LastImage -Video $script:LastVideo -Obj $script:LastObj -Network $script:LastNetwork | Out-Null

        Speak-AgentLee "Full voice flow complete. That is the demo, voice first, OG mode, proof on disk." | Out-Null
        Log "FULL VOICE FLOW COMPLETE."
    } finally {
        $script:FlowRunning = $false
    }
}

# UI bubble and fallback panel.
$formBubble = New-Object System.Windows.Forms.Form
$formBubble.Text = "Agent Lee UI"
$formBubble.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$formBubble.TopMost = $true
$formBubble.ShowInTaskbar = $false
$formBubble.Width = 170
$formBubble.Height = 90
$formBubble.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$formBubble.BackColor = [System.Drawing.Color]::Magenta
$formBubble.TransparencyKey = [System.Drawing.Color]::Magenta

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$formBubble.Left = $screen.Right - 210
$formBubble.Top = $screen.Bottom - 140

$panelBubble = New-Object System.Windows.Forms.Panel
$panelBubble.Width = 165
$panelBubble.Height = 85
$panelBubble.Left = 0
$panelBubble.Top = 0
$panelBubble.BackColor = [System.Drawing.Color]::Transparent
$formBubble.Controls.Add($panelBubble)

$panelBubble.Add_Paint({
    param($sender, $e)

    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0, 170, 255))
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 4)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 20, 20, 20))
    $font1 = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
    $font2 = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)

    $g.FillEllipse($blue, 5, 5, 70, 70)
    $g.DrawEllipse($goldPen, 5, 5, 70, 70)
    $g.DrawString("LEE", $font1, $white, 23, 20)
    $g.DrawString("LIVE", $font2, $white, 20, 43)

    $g.FillRectangle($dark, 78, 16, 82, 42)
    $g.DrawRectangle($goldPen, 78, 16, 82, 42)
    $g.DrawString("AGENT", $font2, $white, 93, 20)
    $g.DrawString("LEE UI", $font2, $white, 93, 38)
})

$script:dragging = $false
$script:dragX = 0
$script:dragY = 0
$script:moved = $false

$panelBubble.Add_MouseDown({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:dragging = $true
        $script:dragX = $e.X
        $script:dragY = $e.Y
        $script:moved = $false
    }
})

$panelBubble.Add_MouseMove({
    param($sender, $e)
    if ($script:dragging) {
        $pos = [System.Windows.Forms.Cursor]::Position
        $newLeft = $pos.X - $script:dragX
        $newTop = $pos.Y - $script:dragY
        if (([Math]::Abs($formBubble.Left - $newLeft) -gt 2) -or ([Math]::Abs($formBubble.Top - $newTop) -gt 2)) {
            $script:moved = $true
        }
        $formBubble.Left = $newLeft
        $formBubble.Top = $newTop
    }
})

$panelBubble.Add_MouseUp({ $script:dragging = $false })

$formPanel = New-Object System.Windows.Forms.Form
$formPanel.Text = "Agent Lee Fallback Chat / Control"
$formPanel.Width = 980
$formPanel.Height = 640
$formPanel.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen

$script:txtLog = New-Object System.Windows.Forms.TextBox
$script:txtLog.Multiline = $true
$script:txtLog.ScrollBars = "Vertical"
$script:txtLog.ReadOnly = $true
$script:txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$script:txtLog.Left = 15
$script:txtLog.Top = 15
$script:txtLog.Width = 930
$script:txtLog.Height = 300
$formPanel.Controls.Add($script:txtLog)

$txtPrompt = New-Object System.Windows.Forms.TextBox
$txtPrompt.Left = 15
$txtPrompt.Top = 335
$txtPrompt.Width = 930
$txtPrompt.Height = 30
$formPanel.Controls.Add($txtPrompt)

$cmbCamera = New-Object System.Windows.Forms.ComboBox
$cmbCamera.Left = 15
$cmbCamera.Top = 385
$cmbCamera.Width = 540
$cmbCamera.DropDownStyle = "DropDownList"
$formPanel.Controls.Add($cmbCamera)

$btnProof = New-Object System.Windows.Forms.Button
$btnProof.Text = "Open Proof Folder"
$btnProof.Left = 15
$btnProof.Top = 435
$btnProof.Width = 180
$btnProof.Height = 40
$formPanel.Controls.Add($btnProof)

$btnSpeakAgain = New-Object System.Windows.Forms.Button
$btnSpeakAgain.Text = "Speak Again"
$btnSpeakAgain.Left = 210
$btnSpeakAgain.Top = 435
$btnSpeakAgain.Width = 150
$btnSpeakAgain.Height = 40
$formPanel.Controls.Add($btnSpeakAgain)

$lblRule = New-Object System.Windows.Forms.Label
$lblRule.Left = 15
$lblRule.Top = 500
$lblRule.Width = 930
$lblRule.Height = 80
$lblRule.Text = "This panel is fallback only. Agent Lee starts the full voice flow automatically. No Run button. No typed PRINT."
$formPanel.Controls.Add($lblRule)

$btnProof.Add_Click({
    Start-Process explorer.exe $ProofRoot
    Log ("Opened proof folder: " + $ProofRoot)
})

$btnSpeakAgain.Add_Click({
    Speak-AgentLee "I am here, Leonard. The full voice flow runs automatically. This panel is only fallback control." | Out-Null
})

$panelBubble.Add_Click({
    if (-not $script:moved) {
        $formPanel.Show()
        $formPanel.Activate()
        Log "Fallback chat/control panel opened from AGENT / LEE UI bubble."
    }
})

$formPanel.Add_FormClosing({
    param($sender, $e)
    $e.Cancel = $true
    $formPanel.Hide()
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1200
$timer.Add_Tick({
    $timer.Stop()
    Run-FullVoiceFlow
})

$formBubble.Add_Shown({
    Write-Event -Type "AGENT_LEE_V5_STARTED" -Message "Voice-first auto operator started."
    $formPanel.Show()
    $formPanel.Activate()
    $timer.Start()
})

[System.Windows.Forms.Application]::Run($formBubble)
.isIntegrated -ne $true } | Sort-Object score -Descending)
}

function Capture-Webcam {
    param([string]$CameraName)

    if ([string]::IsNullOrWhiteSpace($CameraName)) {
        Log "CAMERA BLOCKED: no selected camera."
        return $null
    }

    if (-not (Test-Cmd "ffmpeg")) {
        Log "CAMERA BLOCKED: ffmpeg not found."
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $frame = "$ProofRoot\camera\webcam-frame-$stamp.png"
    $logPath = "$ProofRoot\camera\webcam-capture-$stamp.log"

    try {
        Log ("Capturing selected webcam: " + $CameraName)
        & ffmpeg -y -f dshow -i "video=$CameraName" -frames:v 1 $frame 2>&1 | Tee-Object -FilePath $logPath | Out-Null

        if (Test-Path $frame) {
            $bytes = (Get-Item $frame).Length
            if ($bytes -gt 1000) {
                Log ("CAMERA READY: captured frame. Bytes=" + $bytes)
                Start-Process $frame
                return $frame
            }
        }

        Log "CAMERA FAILED: no valid frame produced."
        return $null
    } catch {
        Log ("CAMERA FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Create-RequestedImage {
    param([string]$Prompt)

    Add-Type -AssemblyName System.Drawing

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = "$ProofRoot\image\requested-image-$stamp.png"

    $bmp = New-Object System.Drawing.Bitmap 1400, 900
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    try {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.Clear([System.Drawing.Color]::FromArgb(10, 12, 24))

        $title = New-Object System.Drawing.Font("Arial", [single]34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
        $body = New-Object System.Drawing.Font("Arial", [single]20, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
        $small = New-Object System.Drawing.Font("Arial", [single]13, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)

        $gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Gold)
        $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::DeepSkyBlue)
        $gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::LightGray)
        $penGold = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 5)
        $penCyan = New-Object System.Drawing.Pen([System.Drawing.Color]::DeepSkyBlue, 3)

        $g.DrawString("Agent Lee Requested Image", $title, $gold, 55, 45)
        $g.DrawString("Leonard asked for:", $body, $cyan, 55, 125)

        $rect = New-Object System.Drawing.RectangleF([single]55, [single]170, [single]1280, [single]120)
        $g.DrawString($Prompt, $body, $white, $rect)

        $g.DrawRectangle($penCyan, 55, 320, 1290, 500)

        $cx = 700
        $cy = 555

        for ($i = 0; $i -lt 11; $i++) {
            $r = 35 + ($i * 24)
            $pen = if ($i % 2 -eq 0) { $penGold } else { $penCyan }
            $g.DrawEllipse($pen, $cx - $r, $cy - $r, $r * 2, $r * 2)
        }

        $g.FillEllipse($gold, 620, 475, 160, 160)
        $g.DrawString("LEE", $title, [System.Drawing.Brushes]::Black, 662, 522)

        $g.DrawString("TRUTH: local render from requested prompt. Full AI image route requires an installed image model endpoint.", $small, $gray, 60, 840)

        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        Start-Process $path
        Log ("IMAGE READY: " + $path)
        return $path
    } finally {
        if ($g) { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
    }
}

function Create-Video {
    param([string]$ImagePath)

    if (-not (Test-Path $ImagePath)) {
        Log "VIDEO BLOCKED: image missing."
        return $null
    }

    if (-not (Test-Cmd "ffmpeg")) {
        Log "VIDEO BLOCKED: ffmpeg not found."
        return $null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $video = "$ProofRoot\video\agent-lee-real-video-$stamp.mp4"
    $logPath = "$ProofRoot\video\ffmpeg-video-$stamp.log"

    try {
        & ffmpeg -y -loop 1 -i $ImagePath -t 8 -vf "scale=1280:720,format=yuv420p" -r 24 $video 2>&1 | Tee-Object -FilePath $logPath | Out-Null

        if (Test-Path $video) {
            $bytes = (Get-Item $video).Length
            if ($bytes -gt 1000) {
                Log ("VIDEO READY: real MP4 created. Bytes=" + $bytes)
                Start-Process $video
                return $video
            }
        }

        Log "VIDEO FAILED: no valid MP4 produced."
        return $null
    } catch {
        Log ("VIDEO FAILED: " + $_.Exception.Message)
        return $null
    }
}

function Create-Obj {
    param([string]$Prompt)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $obj = "$ProofRoot\3d\agent-lee-object-$stamp.obj"

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Agent Lee 3D object")
    $lines.Add("# Prompt: $Prompt")
    $lines.Add("# TRUTH: procedural OBJ fallback. Real AI image-to-3D route not proven.")

    $segments = 32
    $levels = @(
        @{ z = 0.0; r = 1.00 },
        @{ z = 0.3; r = 1.25 },
        @{ z = 0.7; r = 0.60 },
        @{ z = 1.4; r = 0.50 },
        @{ z = 2.0; r = 0.75 },
        @{ z = 2.5; r = 0.35 },
        @{ z = 2.9; r = 0.00 }
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

    Set-Content -Path $obj -Value $lines -Encoding UTF8
    Log ("3D OBJ READY: " + $obj)
    Start-Process explorer.exe (Split-Path -Parent $obj)
    return $obj
}

function Get-NetworkReport {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $path = "$ProofRoot\network\network-phone-report-$stamp.json"
    $items = @()

    try {
        $neighbors = @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
            $_.IPAddress -and $_.LinkLayerAddress -and $_.State -ne "Unreachable"
        })

        foreach ($n in $neighbors) {
            $ip = [string]$n.IPAddress
            $mac = [string]$n.LinkLayerAddress
            $host = ""

            try {
                $dns = Resolve-DnsName -Name $ip -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($dns) { $host = [string]$dns.NameHost }
            } catch {}

            $brand = "UNKNOWN_NOT_PROVEN"
            $type = "UNKNOWN_NOT_PROVEN"

            if ($host -match "iphone|ipad|apple") {
                $brand = "APPLE_FROM_HOSTNAME"
                $type = "IPHONE_OR_IPAD_FROM_HOSTNAME"
            } elseif ($host -match "android|galaxy|samsung|pixel|oneplus|moto|motorola") {
                $brand = "ANDROID_FROM_HOSTNAME"
                $type = "ANDROID_PHONE_OR_TABLET_FROM_HOSTNAME"
            }

            $items += [ordered]@{
                ipAddress = $ip
                macAddress = $mac
                hostname = $host
                brandEvidence = $brand
                deviceTypeEvidence = $type
                proofLimit = "Private MAC/random hostname can hide exact phone brand/model."
            }
        }
    } catch {
        $items += [ordered]@{ error = $_.Exception.Message }
    }

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        devices = $items
        truth = "No exact iPhone/Android claim unless hostname/evidence proves it."
    }

    Write-JsonFile $path $obj
    Start-Process notepad.exe $path
    Log ("NETWORK REPORT READY: " + $path)
    return $path
}

function Build-Website {
    param(
        [string]$Prompt,
        [string]$Image,
        [string]$Video,
        [string]$Obj,
        [string]$Network
    )

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $dir = "$ProofRoot\website\site-$stamp"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    if ($Image -and (Test-Path $Image)) { Copy-Item $Image "$dir\requested-image.png" -Force }
    if ($Video -and (Test-Path $Video)) { Copy-Item $Video "$dir\requested-video.mp4" -Force }
    if ($Obj -and (Test-Path $Obj)) { Copy-Item $Obj "$dir\requested-object.obj" -Force }
    if ($Network -and (Test-Path $Network)) { Copy-Item $Network "$dir\network-report.json" -Force }

    $index = "$dir\index.html"

    $html = @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Agent Lee Full Voice Flow</title>
<style>
body { font-family: Arial, sans-serif; background:#111827; color:white; margin:40px; }
.card { background:#1f2937; border:1px solid #374151; border-radius:14px; padding:20px; margin:20px 0; }
img, video { max-width:900px; width:100%; border:2px solid gold; border-radius:10px; }
a { color:#93c5fd; }
</style>
</head>
<body>
<h1>Agent Lee Full Voice Flow Report</h1>
<div class="card"><h2>Leonard's requested image prompt</h2><p>$Prompt</p></div>
<div class="card"><h2>Requested Image</h2><img src="requested-image.png"></div>
<div class="card"><h2>Real MP4 Video</h2><video src="requested-video.mp4" controls></video></div>
<div class="card"><h2>3D OBJ</h2><a href="requested-object.obj">Open 3D object</a></div>
<div class="card"><h2>Network / Phone Discovery</h2><a href="network-report.json">Open network report</a></div>
</body>
</html>
"@

    Set-Content -Path $index -Value $html -Encoding UTF8
    Start-Process $index
    Log ("WEBSITE READY: " + $index)
    return $index
}

function Print-Report {
    param(
        [string]$Prompt,
        [string]$Image,
        [string]$Video,
        [string]$Obj,
        [string]$Network
    )

    try {
        $printers = @(Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    } catch {
        $printers = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    }

    $selected = $printers | Where-Object { $_.Name -match "HP|OfficeJet|8020" } | Select-Object -First 1
    if (-not $selected) { $selected = $printers | Select-Object -First 1 }

    if (-not $selected) {
        Speak-AgentLee "I cannot print because Windows did not return a printer." | Out-Null
        Log "PRINT BLOCKED: no printer found."
        return $null
    }

    $approval = Get-VoiceApproval `
        -ActionName "physical_print" `
        -Question "Leonard, I got the report ready for printer $($selected.Name). You want me to print it now? Say yes, approve, go ahead, or cancel."

    if (-not $approval.approved) {
        Log "PRINT NOT SUBMITTED: no voice approval."
        return $null
    }

    Add-Type -AssemblyName System.Drawing

    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings.PrinterName = $selected.Name
    $doc.DocumentName = "Agent Lee Full Voice Flow Report"

    $doc.add_PrintPage({
        param($sender, $e)

        $g = $e.Graphics
        $fontTitle = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
        $fontBody = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Regular)
        $fontSmall = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Regular)
        $brush = [System.Drawing.Brushes]::Black

        $y = 40
        $g.DrawString("Agent Lee Full Voice Flow Report", $fontTitle, $brush, 40, $y)
        $y += 45
        $g.DrawString(("Prompt: " + $Prompt), $fontBody, $brush, 40, $y)
        $y += 30
        $g.DrawString(("Image: " + $Image), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("Video: " + $Video), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("3D OBJ: " + $Obj), $fontSmall, $brush, 40, $y)
        $y += 18
        $g.DrawString(("Network Report: " + $Network), $fontSmall, $brush, 40, $y)
        $y += 35
        $g.DrawString("Printed only after voice approval.", $fontBody, $brush, 40, $y)
        $y += 30

        if ($Image -and (Test-Path $Image)) {
            try {
                $img = [System.Drawing.Image]::FromFile($Image)
                $g.DrawImage($img, 40, $y, 420, 270)
                $img.Dispose()
            } catch {}
        }
    })

    try {
        $doc.Print()
        Log ("PRINT SUBMITTED TO: " + $selected.Name)
        Speak-AgentLee "Done. I submitted the print job to the printer." | Out-Null
        return $selected.Name
    } catch {
        Log ("PRINT FAILED: " + $_.Exception.Message)
        Speak-AgentLee "I tried to print, but Windows returned an error." | Out-Null
        return $null
    }
}

function Run-FullVoiceFlow {
    if ($script:FlowRunning) { return }
    $script:FlowRunning = $true

    try {
        Log "FULL VOICE FLOW AUTO STARTED."

        Speak-AgentLee "Peace Leonard. Agent Lee online. Aight, we doing this voice first. No typing, no extra button chasing. Tell me what image you want me to create." | Out-Null

        $heard = Listen-Once -Seconds 14 -Purpose "requested_image_prompt"

        if ($heard -and $heard.text) {
            $script:LastPrompt = $heard.text
            $txtPrompt.Text = $script:LastPrompt
            Speak-AgentLee ("Bet. I heard you say: " + $script:LastPrompt + ". I am moving through the full flow now.") | Out-Null
        } else {
            $script:LastPrompt = "Create a powerful futuristic blue lion standing beside a chess board"
            $txtPrompt.Text = $script:LastPrompt
            Speak-AgentLee "I did not catch the image request clean, so I am using the fallback prompt shown in my panel." | Out-Null
        }

        $preferredCameraName = Get-AgentLeePreferredCameraName
$cmbCamera.Items.Clear()

if (Assert-AgentLeeUsbWebcamOnly -CameraName $preferredCameraName) {
    [void]$cmbCamera.Items.Add($preferredCameraName)
    $cmbCamera.SelectedIndex = 0
    Log ("USB WEBCAM LOCK ACTIVE: " + $preferredCameraName)
} else {
    Log "CAMERA BLOCKED: no proven USB webcam preference. Integrated Camera will not be used."
}

        $preferredCameraName = Get-AgentLeePreferredCameraName

if (Assert-AgentLeeUsbWebcamOnly -CameraName $preferredCameraName) {
    Speak-AgentLee ("I am using the locked USB webcam: " + $preferredCameraName) | Out-Null
    $script:LastCamera = Capture-Webcam -CameraName $preferredCameraName
} else {
    Speak-AgentLee "Camera lane blocked. I will not use the integrated laptop camera. I need the USB webcam proven first." | Out-Null
    Log "CAMERA BLOCKED: refused to use Integrated Camera."
}

        Start-Process ("https://duckduckgo.com/?q=" + [uri]::EscapeDataString($script:LastPrompt + " image to 3D workflow chess game information"))
        Log "WEB SEARCH OPENED."
        Speak-AgentLee "I opened web research for the image, 3D workflow, and background information." | Out-Null

        $script:LastImage = Create-RequestedImage -Prompt $script:LastPrompt
        Speak-AgentLee "I created and opened the requested image artifact." | Out-Null

        $script:LastVideo = Create-Video -ImagePath $script:LastImage
        if ($script:LastVideo) {
            Speak-AgentLee "I created a real MP4 video and opened it. You should see a real play button." | Out-Null
        }

        $script:LastObj = Create-Obj -Prompt $script:LastPrompt
        Speak-AgentLee "I created the 3D object file. I am truth-labeling it as procedural unless the full image to 3D model route is installed." | Out-Null

        $script:LastNetwork = Get-NetworkReport
        Speak-AgentLee "I created the network report. I will not fake phone brands. If Windows cannot prove iPhone or Android, I mark it unknown." | Out-Null

        $script:LastWebsite = Build-Website -Prompt $script:LastPrompt -Image $script:LastImage -Video $script:LastVideo -Obj $script:LastObj -Network $script:LastNetwork
        Speak-AgentLee "I opened the website report with image, video player, 3D object link, and network report." | Out-Null

        Print-Report -Prompt $script:LastPrompt -Image $script:LastImage -Video $script:LastVideo -Obj $script:LastObj -Network $script:LastNetwork | Out-Null

        Speak-AgentLee "Full voice flow complete. That is the demo, voice first, OG mode, proof on disk." | Out-Null
        Log "FULL VOICE FLOW COMPLETE."
    } finally {
        $script:FlowRunning = $false
    }
}

# UI bubble and fallback panel.
$formBubble = New-Object System.Windows.Forms.Form
$formBubble.Text = "Agent Lee UI"
$formBubble.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$formBubble.TopMost = $true
$formBubble.ShowInTaskbar = $false
$formBubble.Width = 170
$formBubble.Height = 90
$formBubble.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$formBubble.BackColor = [System.Drawing.Color]::Magenta
$formBubble.TransparencyKey = [System.Drawing.Color]::Magenta

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$formBubble.Left = $screen.Right - 210
$formBubble.Top = $screen.Bottom - 140

$panelBubble = New-Object System.Windows.Forms.Panel
$panelBubble.Width = 165
$panelBubble.Height = 85
$panelBubble.Left = 0
$panelBubble.Top = 0
$panelBubble.BackColor = [System.Drawing.Color]::Transparent
$formBubble.Controls.Add($panelBubble)

$panelBubble.Add_Paint({
    param($sender, $e)

    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0, 170, 255))
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 4)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 20, 20, 20))
    $font1 = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
    $font2 = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)

    $g.FillEllipse($blue, 5, 5, 70, 70)
    $g.DrawEllipse($goldPen, 5, 5, 70, 70)
    $g.DrawString("LEE", $font1, $white, 23, 20)
    $g.DrawString("LIVE", $font2, $white, 20, 43)

    $g.FillRectangle($dark, 78, 16, 82, 42)
    $g.DrawRectangle($goldPen, 78, 16, 82, 42)
    $g.DrawString("AGENT", $font2, $white, 93, 20)
    $g.DrawString("LEE UI", $font2, $white, 93, 38)
})

$script:dragging = $false
$script:dragX = 0
$script:dragY = 0
$script:moved = $false

$panelBubble.Add_MouseDown({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:dragging = $true
        $script:dragX = $e.X
        $script:dragY = $e.Y
        $script:moved = $false
    }
})

$panelBubble.Add_MouseMove({
    param($sender, $e)
    if ($script:dragging) {
        $pos = [System.Windows.Forms.Cursor]::Position
        $newLeft = $pos.X - $script:dragX
        $newTop = $pos.Y - $script:dragY
        if (([Math]::Abs($formBubble.Left - $newLeft) -gt 2) -or ([Math]::Abs($formBubble.Top - $newTop) -gt 2)) {
            $script:moved = $true
        }
        $formBubble.Left = $newLeft
        $formBubble.Top = $newTop
    }
})

$panelBubble.Add_MouseUp({ $script:dragging = $false })

$formPanel = New-Object System.Windows.Forms.Form
$formPanel.Text = "Agent Lee Fallback Chat / Control"
$formPanel.Width = 980
$formPanel.Height = 640
$formPanel.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen

$script:txtLog = New-Object System.Windows.Forms.TextBox
$script:txtLog.Multiline = $true
$script:txtLog.ScrollBars = "Vertical"
$script:txtLog.ReadOnly = $true
$script:txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$script:txtLog.Left = 15
$script:txtLog.Top = 15
$script:txtLog.Width = 930
$script:txtLog.Height = 300
$formPanel.Controls.Add($script:txtLog)

$txtPrompt = New-Object System.Windows.Forms.TextBox
$txtPrompt.Left = 15
$txtPrompt.Top = 335
$txtPrompt.Width = 930
$txtPrompt.Height = 30
$formPanel.Controls.Add($txtPrompt)

$cmbCamera = New-Object System.Windows.Forms.ComboBox
$cmbCamera.Left = 15
$cmbCamera.Top = 385
$cmbCamera.Width = 540
$cmbCamera.DropDownStyle = "DropDownList"
$formPanel.Controls.Add($cmbCamera)

$btnProof = New-Object System.Windows.Forms.Button
$btnProof.Text = "Open Proof Folder"
$btnProof.Left = 15
$btnProof.Top = 435
$btnProof.Width = 180
$btnProof.Height = 40
$formPanel.Controls.Add($btnProof)

$btnSpeakAgain = New-Object System.Windows.Forms.Button
$btnSpeakAgain.Text = "Speak Again"
$btnSpeakAgain.Left = 210
$btnSpeakAgain.Top = 435
$btnSpeakAgain.Width = 150
$btnSpeakAgain.Height = 40
$formPanel.Controls.Add($btnSpeakAgain)

$lblRule = New-Object System.Windows.Forms.Label
$lblRule.Left = 15
$lblRule.Top = 500
$lblRule.Width = 930
$lblRule.Height = 80
$lblRule.Text = "This panel is fallback only. Agent Lee starts the full voice flow automatically. No Run button. No typed PRINT."
$formPanel.Controls.Add($lblRule)

$btnProof.Add_Click({
    Start-Process explorer.exe $ProofRoot
    Log ("Opened proof folder: " + $ProofRoot)
})

$btnSpeakAgain.Add_Click({
    Speak-AgentLee "I am here, Leonard. The full voice flow runs automatically. This panel is only fallback control." | Out-Null
})

$panelBubble.Add_Click({
    if (-not $script:moved) {
        $formPanel.Show()
        $formPanel.Activate()
        Log "Fallback chat/control panel opened from AGENT / LEE UI bubble."
    }
})

$formPanel.Add_FormClosing({
    param($sender, $e)
    $e.Cancel = $true
    $formPanel.Hide()
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1200
$timer.Add_Tick({
    $timer.Stop()
    Run-FullVoiceFlow
})

$formBubble.Add_Shown({
    Write-Event -Type "AGENT_LEE_V5_STARTED" -Message "Voice-first auto operator started."
    $formPanel.Show()
    $formPanel.Activate()
    $timer.Start()
})

[System.Windows.Forms.Application]::Run($formBubble)

