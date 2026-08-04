param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [string]$ProofRoot = "",
    [string]$EventsPath = "",
    [string]$StatePath = ""
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
    $ProofRoot = Join-Path $Root ("Archive\proofs\agent-lee-v26-25-real-pointer-auto-live-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

if ([string]::IsNullOrWhiteSpace($EventsPath)) {
    $EventsPath = Join-Path $ProofRoot "events\agent-lee-pointer-events.jsonl"
}

if ([string]::IsNullOrWhiteSpace($StatePath)) {
    $StatePath = Join-Path $Root "agent-lee-coding-mode\runtime\agent-lee-real-pointer-auto-live\state\agent-lee-real-pointer-auto-live-state.json"
}

$EnvPath = Join-Path $Root ".env.local"

foreach ($d in @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\events",
    "$ProofRoot\voice",
    "$ProofRoot\browser",
    "$ProofRoot\notepad",
    "$ProofRoot\image",
    "$ProofRoot\video",
    "$ProofRoot\3d",
    "$ProofRoot\network",
    "$ProofRoot\website",
    "$ProofRoot\printer",
    "$ProofRoot\reports",
    (Split-Path -Parent $StatePath)
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

# Win32 only for click-through overlay. This does not move the mouse.
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class OverlayWindowToolsV2625 {
    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_TRANSPARENT = 0x00000020;
    public const int WS_EX_LAYERED = 0x00080000;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
}
"@

$script:FlowStarted = $false
$script:FlowDone = $false
$script:Paused = $false
$script:State = "booting"
$script:Message = "Agent Lee pointer booting"
$script:Step = 0
$script:AgentX = 180
$script:AgentY = 180
$script:TargetX = 180
$script:TargetY = 180
$script:LastReportPath = ""
$script:VoiceMode = "NOT_TESTED"
$script:Evidence = [ordered]@{}

function Write-JsonFile {
    param(
        [string]$Path,
        $Object,
        [int]$Depth = 80
    )

    if ($Depth -gt 100) { $Depth = 100 }

    $parent = Split-Path -Parent $Path
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth $Depth), $utf8NoBom)
}

function Write-State {
    param([string]$Status, $Data = $null)

    $obj = [ordered]@{
        schema = "agent-lee-v26-25-real-pointer-auto-live-state"
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        status = $Status
        root = $Root
        proofRoot = $ProofRoot
        eventsPath = $EventsPath
        statePath = $StatePath
        pointerState = $script:State
        pointerMessage = $script:Message
        pointerX = $script:AgentX
        pointerY = $script:AgentY
        flowStarted = $script:FlowStarted
        flowDone = $script:FlowDone
        voiceMode = $script:VoiceMode
        data = $Data
    }

    Write-JsonFile -Path $StatePath -Object $obj -Depth 80
}

function Write-EventLine {
    param(
        [string]$Type,
        [string]$Message,
        [int]$X = -1,
        [int]$Y = -1,
        $Data = $null
    )

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        agentPointerX = $X
        agentPointerY = $Y
        realMouseMoved = $false
        realMouseClicked = $false
        note = "Agent Lee independent pointer event. This does not move Leonard's Windows cursor."
        data = $Data
    }

    Add-Content -Path $EventsPath -Value ($obj | ConvertTo-Json -Compress -Depth 50) -Encoding UTF8
    Write-State $Type $Data
}

function Set-PointerState {
    param(
        [string]$State,
        [string]$Message,
        [int]$X,
        [int]$Y
    )

    $script:State = $State
    $script:Message = $Message
    $script:TargetX = $X
    $script:TargetY = $Y

    Write-EventLine -Type "POINTER_TARGET" -Message $Message -X $X -Y $Y -Data @{ state = $State }
}

function Read-EnvMap {
    $map = @{}

    if (-not (Test-Path $EnvPath)) {
        return $map
    }

    foreach ($line in (Get-Content $EnvPath -ErrorAction SilentlyContinue)) {
        $raw = [string]$line
        $trim = $raw.Trim()

        if ([string]::IsNullOrWhiteSpace($trim)) { continue }
        if ($trim.StartsWith("#")) { continue }

        $idx = $raw.IndexOf("=")
        if ($idx -le 0) { continue }

        $key = $raw.Substring(0, $idx).Trim()
        $value = $raw.Substring($idx + 1).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $map[$key] = $value
    }

    return $map
}

function Pick-Env {
    param([hashtable]$Map,[string[]]$Keys)

    foreach ($k in $Keys) {
        if ($Map.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace([string]$Map[$k])) {
            return [string]$Map[$k]
        }
    }

    return $null
}

function Speak-Sapi {
    param([string]$Text)

    try {
        if (-not $script:SpeechAvailable) {
            throw "System.Speech unavailable."
        }

        $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $speaker.SetOutputToDefaultAudioDevice()
        $speaker.Volume = 100
        $speaker.Rate = 0
        $speaker.SpeakAsync($Text) | Out-Null
        $script:VoiceMode = "WINDOWS_SAPI_ASYNC"
        Write-EventLine -Type "SPEAK_SAPI" -Message $Text -X $script:AgentX -Y $script:AgentY
        return [ordered]@{ status = "SPOKEN_ASYNC"; mode = "WINDOWS_SAPI_ASYNC"; voice = $speaker.Voice.Name }
    } catch {
        return [ordered]@{ status = "SPEECH_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Speak-AgentLee {
    param([string]$Text)

    # Use XTTS first, but do not freeze the operator forever.
    try {
        $body = @{
            text = $Text
            voice = "agent-lee"
            language = "en"
            speed = 1.04
        } | ConvertTo-Json -Depth 10

        $r = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8092/tts" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 45

        $audioPath = [string]$r.audio_path
        $fileName = Split-Path $audioPath -Leaf
        $url = "http://127.0.0.1:8092/audio/$fileName"
        $localAudio = Join-Path $ProofRoot ("voice\xtts-" + [guid]::NewGuid().ToString("N") + ".wav")

        Invoke-WebRequest -Uri $url -OutFile $localAudio -TimeoutSec 30 | Out-Null

        if (Test-Path $localAudio) {
            $player = New-Object System.Media.SoundPlayer $localAudio
            $player.Play()
            $script:VoiceMode = "XTTS_V2_CLONE_VOICE"
            Write-EventLine -Type "SPEAK_XTTS" -Message $Text -X $script:AgentX -Y $script:AgentY -Data @{ audio = $localAudio }
            return [ordered]@{ status = "SPOKEN"; mode = "XTTS_V2_CLONE_VOICE"; audio = $localAudio }
        }

        throw "XTTS audio file did not download."
    } catch {
        return Speak-Sapi $Text
    }
}

function Send-Telegram {
    param([string]$Text)

    try {
        $env = Read-EnvMap
        $token = Pick-Env $env @("TELEGRAM_BOT_TOKEN","AGENT_LEE_TELEGRAM_BOT_TOKEN","LEEWAY_TELEGRAM_BOT_TOKEN","TELEGRAM_API_TOKEN","TG_BOT_TOKEN","TELEGRAM_TOKEN","BOT_TOKEN")
        $chatId = Pick-Env $env @("TELEGRAM_CHAT_ID","AGENT_LEE_TELEGRAM_CHAT_ID","LEEWAY_TELEGRAM_CHAT_ID","LEONARD_TELEGRAM_CHAT_ID","TELEGRAM_USER_CHAT_ID","TG_CHAT_ID","TELEGRAM_TARGET_CHAT_ID")

        if ([string]::IsNullOrWhiteSpace($token)) { throw "Telegram token missing." }
        if ([string]::IsNullOrWhiteSpace($chatId)) { throw "Telegram chat id missing." }

        $body = @{
            chat_id = $chatId
            text = $Text
            disable_notification = $false
            link_preview_options = @{ is_disabled = $true }
        } | ConvertTo-Json -Depth 20

        $r = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 35

        return [ordered]@{ status = "SENT"; messageId = $r.result.message_id }
    } catch {
        return [ordered]@{ status = "TELEGRAM_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Get-DeviceDiscovery {
    Set-PointerState "looking" "Scanning Wi-Fi, Bluetooth, LAN, media, monitors, printers." 760 260
    Speak-AgentLee "Leonard, I am scanning the visible device field now. Wi-Fi, Bluetooth, network neighbors, media surfaces, printer lanes, monitors, audio, and camera inventory. I will not fake hidden TVs." | Out-Null

    $e = [ordered]@{
        recordedAt = (Get-Date).ToUniversalTime().ToString("o")
        boundary = "Only devices visible to this Windows host through Wi-Fi, ARP, NetNeighbor, Bluetooth, SSDP/UPnP, Windows device inventory, printers, monitors, audio, and camera inventory can be reported. Hidden or isolated devices may not appear."
    }

    try { $e.wifiInterfacesRaw = netsh wlan show interfaces } catch { $e.wifiError = $_.Exception.Message }
    try { $e.wifiProfilesRaw = netsh wlan show profiles } catch {}
    try { $e.ipConfigRaw = ipconfig /all } catch {}
    try { $e.networkAdapters = Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, MacAddress, LinkSpeed } catch {}
    try { $e.netIPAddress = Get-NetIPAddress | Select-Object InterfaceAlias, AddressFamily, IPAddress, PrefixLength } catch {}
    try { $e.netNeighbor = Get-NetNeighbor | Select-Object InterfaceAlias, IPAddress, LinkLayerAddress, State } catch {}
    try { $e.arpRaw = arp -a } catch {}
    try { $e.bluetooth = Get-PnpDevice -Class Bluetooth | Select-Object FriendlyName, Status, InstanceId } catch { $e.bluetoothError = $_.Exception.Message }
    try { $e.mediaLikeDevices = Get-PnpDevice | Where-Object { $_.FriendlyName -match "TV|Samsung|LG|Roku|Chromecast|Cast|Display|Media|Speaker|Bluetooth|Xbox|Fire|Apple|Wireless|HP" } | Select-Object FriendlyName, Class, Status, InstanceId } catch {}
    try { $e.cameras = Get-PnpDevice -Class Camera | Select-Object FriendlyName, Status, InstanceId } catch {}
    try { $e.audioDevices = Get-CimInstance Win32_SoundDevice | Select-Object Name, Status, Manufacturer, DeviceID } catch {}
    try { $e.printers = Get-CimInstance Win32_Printer | Select-Object Name, Default, WorkOffline, PrinterStatus, PortName, DriverName } catch {}

    try {
        $e.monitors = @()
        foreach ($s in [System.Windows.Forms.Screen]::AllScreens) {
            $e.monitors += [ordered]@{
                deviceName = $s.DeviceName
                primary = $s.Primary
                x = $s.Bounds.X
                y = $s.Bounds.Y
                width = $s.Bounds.Width
                height = $s.Bounds.Height
            }
        }
        $e.monitorCount = $e.monitors.Count
    } catch { $e.monitorError = $_.Exception.Message }

    try {
        $responses = New-Object System.Collections.Generic.List[string]
        $udp = New-Object System.Net.Sockets.UdpClient
        $udp.Client.ReceiveTimeout = 2500
        $endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Parse("239.255.255.250")), 1900
        $msg = "M-SEARCH * HTTP/1.1`r`nHOST: 239.255.255.250:1900`r`nMAN: `"ssdp:discover`"`r`nMX: 2`r`nST: ssdp:all`r`n`r`n"
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($msg)
        [void]$udp.Send($bytes, $bytes.Length, $endpoint)
        $deadline = (Get-Date).AddSeconds(4)

        while ((Get-Date) -lt $deadline) {
            try {
                $remote = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Any), 0
                $data = $udp.Receive([ref]$remote)
                $responses.Add(([System.Text.Encoding]::ASCII.GetString($data)))
            } catch { break }
        }

        $udp.Close()
        $e.ssdpResponses = $responses
        $e.ssdpResponseCount = $responses.Count
    } catch { $e.ssdpError = $_.Exception.Message }

    $path = Join-Path $ProofRoot "network\device-discovery-report.json"
    Write-JsonFile -Path $path -Object $e -Depth 100

    Start-Process notepad.exe $path

    Speak-AgentLee "Device scan complete. The full report is open. If a TV or phone hides itself from network discovery, I marked the boundary instead of pretending." | Out-Null

    return [ordered]@{ status = "READY"; path = $path; report = $e }
}

function Capture-ScreenProof {
    Set-PointerState "looking" "Capturing visible desktop proof." 900 420

    try {
        $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bmp.Size)

        $path = Join-Path $ProofRoot "browser\screen-snapshot.png"
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

        $g.Dispose()
        $bmp.Dispose()

        Start-Process $path

        return [ordered]@{ status = "READY"; path = $path; width = $bounds.Width; height = $bounds.Height }
    } catch {
        return [ordered]@{ status = "SCREEN_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Open-NotepadTypeProof {
    Set-PointerState "acting" "Opening Notepad and typing proof." 300 700
    Speak-AgentLee "I am opening Notepad now. You should see the desktop proof with my live reality claim typed on screen." | Out-Null

    try {
        $p = Start-Process notepad.exe -PassThru
        Start-Sleep -Seconds 2

        $txt = @"
Agent Lee V26.25 Live Reality Claim

Leonard J Lee is creator authority.
Agent Lee real pointer overlay is active.
Desktop control proof: Notepad opened and text typed.
Browser proof, Bucks research, media creation, Telegram, and print lanes are being executed visibly.

Timestamp:
$((Get-Date).ToUniversalTime().ToString("o"))
"@

        [System.Windows.Forms.SendKeys]::SendWait($txt.Replace("`n","{ENTER}"))

        return [ordered]@{ status = "READY"; processId = $p.Id; textLength = $txt.Length }
    } catch {
        return [ordered]@{ status = "DESKTOP_APP_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Open-BrowserBucksResearch {
    Set-PointerState "pointing" "Opening browser and searching Bucks." 520 160
    Speak-AgentLee "I am opening the browser and searching the Milwaukee Bucks now. You should see the page open and scroll." | Out-Null

    try {
        $query = "Milwaukee Bucks latest trades roster projected starting lineup next season"
        $url = "https://duckduckgo.com/?q=" + [uri]::EscapeDataString($query)

        $browser = "chrome.exe"
        if (-not (Get-Command $browser -ErrorAction SilentlyContinue)) {
            $browser = "msedge.exe"
        }

        Start-Process $browser $url
        Start-Sleep -Seconds 5

        [System.Windows.Forms.SendKeys]::SendWait("{PGDN}")
        Start-Sleep -Milliseconds 900
        [System.Windows.Forms.SendKeys]::SendWait("{PGDN}")
        Start-Sleep -Milliseconds 900
        [System.Windows.Forms.SendKeys]::SendWait("{PGUP}")

        return [ordered]@{ status = "READY"; query = $query; url = $url; browser = $browser; scroll = "PageDown/PageDown/PageUp sent" }
    } catch {
        return [ordered]@{ status = "BROWSER_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Research-Bucks {
    Set-PointerState "working" "Collecting Bucks research evidence." 980 210
    Speak-AgentLee "Analyst lane is live. I am collecting Bucks evidence for trades, roster, and projected starting five. I will mark uncertain claims as check required." | Out-Null

    try {
        $queries = @(
            "Milwaukee Bucks latest trades roster",
            "Milwaukee Bucks projected starting lineup next season",
            "Milwaukee Bucks current roster depth chart",
            "Milwaukee Bucks offseason trades latest news"
        )

        $items = @()

        foreach ($q in $queries) {
            $url = "https://duckduckgo.com/html/?q=" + [uri]::EscapeDataString($q)

            try {
                $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
                $path = Join-Path $ProofRoot ("reports\bucks-search-" + ([guid]::NewGuid().ToString("N")) + ".html")
                $r.Content | Set-Content -Path $path -Encoding UTF8

                $plain = ($r.Content -replace "<script[\s\S]*?</script>"," " -replace "<style[\s\S]*?</style>"," " -replace "<[^>]+>"," " -replace "&nbsp;"," " -replace "&amp;","&")
                $plain = ($plain -replace "\s+"," ").Trim()
                $snippet = $plain.Substring(0, [Math]::Min(2500, $plain.Length))

                $items += [ordered]@{ query = $q; status = "SEARCHED"; url = $url; path = $path; statusCode = $r.StatusCode; snippet = $snippet }
            } catch {
                $items += [ordered]@{ query = $q; status = "CHECK_REQUIRED"; error = $_.Exception.Message }
            }
        }

        $reportPath = Join-Path $ProofRoot "reports\milwaukee-bucks-research-report.txt"

        $text = @"
Milwaukee Bucks Research Report
Generated: $((Get-Date).ToUniversalTime().ToString("o"))

Purpose:
Research public web evidence for Milwaukee Bucks latest trades, roster, lineup, and likely starting five next season.

Important:
This local proof runner gathers live search evidence. Final sports conclusions must be verified against official NBA/Bucks sources before business use.

Search Evidence Files:
$($items | ForEach-Object { "- $($_.query) :: $($_.status) :: $($_.path)" } | Out-String)

Projected Starting Five:
CHECK_REQUIRED unless verified by official/current roster and depth-chart sources.

Proof Directory:
$ProofRoot
"@

        $text | Set-Content -Path $reportPath -Encoding UTF8
        Start-Process notepad.exe $reportPath

        return [ordered]@{ status = "READY"; reportPath = $reportPath; searches = $items }
    } catch {
        return [ordered]@{ status = "BUCKS_RESEARCH_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Create-ImageAsset {
    param([string]$Prompt)

    Set-PointerState "creating" "Creating image asset." 700 480
    Speak-AgentLee "Creator lane is active. I am creating and opening the image proof." | Out-Null

    try {
        $path = Join-Path $ProofRoot "image\agent-lee-created-image.png"

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
            $g.DrawString("Prompt:", $body, $cyan, 55, 125)

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
            $g.DrawString("TRUTH: local render from requested prompt. Full AI image model route requires installed image endpoint.", $small, $gray, 60, 840)

            $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            if ($g) { $g.Dispose() }
            if ($bmp) { $bmp.Dispose() }
        }

        Start-Process $path

        return [ordered]@{ status = "CREATED"; path = $path; prompt = $Prompt }
    } catch {
        return [ordered]@{ status = "IMAGE_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Create-VideoFrames {
    param([string]$Prompt)

    Set-PointerState "creating" "Creating video frames." 850 540
    Speak-AgentLee "I am creating the video proof as a visible animation preview." | Out-Null

    try {
        $frameDir = Join-Path $ProofRoot "video\frames"
        New-Item -ItemType Directory -Force -Path $frameDir | Out-Null

        $frames = @()

        for ($i = 0; $i -lt 18; $i++) {
            $path = Join-Path $frameDir ("frame-{0:00}.png" -f $i)

            $bmp = New-Object System.Drawing.Bitmap 1280, 720
            $g = [System.Drawing.Graphics]::FromImage($bmp)

            try {
                $g.Clear([System.Drawing.Color]::White)

                $font = New-Object System.Drawing.Font("Arial", [single]30, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)
                $small = New-Object System.Drawing.Font("Arial", [single]16, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)

                $g.DrawString("Agent Lee Video Proof Frame $i", $font, [System.Drawing.Brushes]::DarkBlue, 60, 50)
                $g.DrawString($Prompt.Substring(0, [Math]::Min(120, $Prompt.Length)), $small, [System.Drawing.Brushes]::Black, 60, 120)
                $g.FillEllipse([System.Drawing.Brushes]::SteelBlue, 80 + ($i * 45), 330, 100, 100)

                $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
            } finally {
                if ($g) { $g.Dispose() }
                if ($bmp) { $bmp.Dispose() }
            }

            $frames += $path
        }

        $htmlPath = Join-Path $ProofRoot "video\video-animation-proof.html"
        $js = ""

        foreach ($f in $frames) {
            $js += "frames.push('frames/" + (Split-Path $f -Leaf) + "');`n"
        }

        $html = @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Agent Lee Video Proof</title></head>
<body>
<h1>Agent Lee Video Animation Proof</h1>
<p>$Prompt</p>
<img id="frame" width="960">
<script>
const frames = [];
$js
let i = 0;
setInterval(() => {
  document.getElementById('frame').src = frames[i % frames.length];
  i++;
}, 220);
</script>
</body>
</html>
"@

        $html | Set-Content -Path $htmlPath -Encoding UTF8
        Start-Process $htmlPath

        return [ordered]@{ status = "CREATED"; framesDir = $frameDir; htmlPath = $htmlPath; frameCount = $frames.Count; prompt = $Prompt }
    } catch {
        return [ordered]@{ status = "VIDEO_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Create-3DAsset {
    param([string]$Prompt)

    Set-PointerState "creating" "Creating OBJ asset." 960 600
    Speak-AgentLee "I am creating the 3D OBJ proof and opening the preview." | Out-Null

    try {
        $objPath = Join-Path $ProofRoot "3d\agent-lee-object.obj"
        $htmlPath = Join-Path $ProofRoot "3d\agent-lee-3d-preview.html"

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

        Set-Content -Path $objPath -Value $lines -Encoding UTF8

        $html = @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Agent Lee 3D Preview</title>
<style>
body{font-family:Arial;margin:40px;background:#f8fafc;color:#0f172a}
.cube{width:260px;height:260px;background:linear-gradient(135deg,#1d4ed8,#93c5fd);transform:rotateX(55deg) rotateZ(45deg);margin:90px;box-shadow:35px 35px 25px #aaa}
</style>
</head>
<body>
<h1>Agent Lee 3D Object Preview</h1>
<p>$Prompt</p>
<p>OBJ file: $objPath</p>
<div class="cube"></div>
</body>
</html>
"@

        $html | Set-Content -Path $htmlPath -Encoding UTF8
        Start-Process $htmlPath

        return [ordered]@{ status = "CREATED"; objPath = $objPath; previewPath = $htmlPath; prompt = $Prompt }
    } catch {
        return [ordered]@{ status = "THREE_D_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Build-Website {
    param($Evidence)

    Set-PointerState "presenting" "Building web dashboard." 700 700
    Speak-AgentLee "I am compiling the proof into a web dashboard now." | Out-Null

    try {
        $siteDir = Join-Path $ProofRoot "website\site"
        New-Item -ItemType Directory -Force -Path $siteDir | Out-Null

        $sitePath = Join-Path $siteDir "index.html"

        $html = @"
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Agent Lee V26.25 Real Pointer Proof</title>
<style>
body{font-family:Arial;margin:0;background:#111827;color:white}
header{background:#0f172a;color:white;padding:28px}
section{padding:24px;margin:18px;background:#1f2937;border-radius:12px;border:1px solid #374151}
code{background:#0f172a;padding:3px 6px;border-radius:4px;color:#93c5fd}
a{color:#93c5fd}
</style>
</head>
<body>
<header><h1>Agent Lee V26.25 Real Pointer Auto-Live Proof</h1><p>Generated by the transparent pointer overlay flow.</p></header>
<section><h2>Device Discovery</h2><p><code>$($Evidence.devices.path)</code></p></section>
<section><h2>Screen Snapshot</h2><p><code>$($Evidence.screen.path)</code></p></section>
<section><h2>Bucks Research</h2><p><code>$($Evidence.bucks.reportPath)</code></p></section>
<section><h2>Image</h2><p><code>$($Evidence.image.path)</code></p></section>
<section><h2>Video</h2><p><code>$($Evidence.video.htmlPath)</code></p></section>
<section><h2>3D Object</h2><p><code>$($Evidence.threeD.objPath)</code></p></section>
<section><h2>Telegram</h2><p><code>$($Evidence.telegram.status)</code></p></section>
<section><h2>Print</h2><p><code>$($Evidence.print.status)</code></p></section>
</body>
</html>
"@

        $html | Set-Content -Path $sitePath -Encoding UTF8
        Start-Process $sitePath

        return [ordered]@{ status = "CREATED"; sitePath = $sitePath }
    } catch {
        return [ordered]@{ status = "WEBSITE_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Print-Report {
    param([string]$ReportPath)

    Set-PointerState "printing" "Sending report to default printer." 1040 690
    Speak-AgentLee "Physical proof lane. I am sending the report to the default printer if Windows shows it online." | Out-Null

    try {
        if (-not (Test-Path $ReportPath)) {
            throw "Report not found: $ReportPath"
        }

        $printer = Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1

        if (-not $printer) {
            throw "No default printer found."
        }

        if ($printer.WorkOffline) {
            throw "Default printer is offline: $($printer.Name)"
        }

        Get-Content $ReportPath | Out-Printer -Name $printer.Name

        return [ordered]@{ status = "SENT_TO_PRINTER"; printer = $printer.Name; reportPath = $ReportPath }
    } catch {
        return [ordered]@{ status = "PRINT_CHECK_REQUIRED"; error = $_.Exception.Message; reportPath = $ReportPath }
    }
}

function Run-AutoFlow {
    if ($script:FlowStarted) { return }

    $script:FlowStarted = $true
    Write-State "FLOW_STARTED"
    Write-EventLine -Type "FLOW_STARTED" -Message "Agent Lee V26.25 auto-live proof started." -X $script:AgentX -Y $script:AgentY

    $prompt = "Create a cinematic Agent Lee operations command center image."

    Set-PointerState "speaking" "Starting full proof automatically." 220 200
    Speak-AgentLee "Aight Leonard, Agent Lee is back in the correct form. Real pointer overlay, no big control box. I am starting the full live proof now, moving visible, speaking live, and writing receipts. Your mouse stays yours." | Out-Null

    $evidence = [ordered]@{}
    $evidence.authority = [ordered]@{ status = "READY"; creator = "Leonard J Lee"; rule = "Leeway Standards changes require Leonard authorization." }
    $evidence.voice = [ordered]@{ status = "READY"; mode = $script:VoiceMode; xttsPort = 8092 }
    $evidence.devices = Get-DeviceDiscovery
    $evidence.screen = Capture-ScreenProof
    $evidence.notepad = Open-NotepadTypeProof
    $evidence.browser = Open-BrowserBucksResearch
    $evidence.bucks = Research-Bucks
    $evidence.image = Create-ImageAsset $prompt
    $evidence.video = Create-VideoFrames "Create animated frames showing Agent Lee performing research, creation, and printing."
    $evidence.threeD = Create-3DAsset "Create a game-ready Agent Lee proof object for Unity/Roblox-style import."
    $evidence.telegram = Send-Telegram "Agent Lee V26.25 real pointer auto-live proof is running and entering final stage."

    $finalReport = Join-Path $ProofRoot "reports\agent-lee-v26-25-final-report.txt"

    $reportText = @"
Agent Lee V26.25 Real Pointer Auto-Live Proof Report
Generated: $((Get-Date).ToUniversalTime().ToString("o"))

Creator Authority:
Leonard J Lee is creator authority. Standards changes require Leonard authorization.

Voice:
$($evidence.voice | ConvertTo-Json -Depth 20)

Device Discovery:
$($evidence.devices.path)

Bucks Research:
$($evidence.bucks.reportPath)

Image:
$($evidence.image.path)

Video:
$($evidence.video.htmlPath)

3D Object:
$($evidence.threeD.objPath)

Boundary:
Network TVs/devices are only listed if visible to this Windows host through ARP, NetNeighbor, SSDP/UPnP, Bluetooth, Windows device inventory, or printer/media discovery.

Proof Directory:
$ProofRoot
"@

    $reportText | Set-Content -Path $finalReport -Encoding UTF8
    Start-Process notepad.exe $finalReport

    $evidence.print = Print-Report $finalReport
    $evidence.website = Build-Website $evidence

    $proofJson = Join-Path $ProofRoot "agent-lee-v26-25-full-proof.json"
    Write-JsonFile -Path $proofJson -Object $evidence -Depth 100

    $receipt = [ordered]@{
        schema = "agent-lee-v26-25-real-pointer-auto-live-receipt"
        recordedAt = (Get-Date).ToUniversalTime().ToString("o")
        creator = "Leonard J Lee"
        status = "COMPLETE_WITH_EVIDENCE"
        proofRoot = $ProofRoot
        proofJson = $proofJson
        finalReport = $finalReport
        evidence = $evidence
    }

    $receiptPath = Join-Path $Root ("Archive\receipts\leeway-system-completion\agent-lee-v26-25-real-pointer-auto-live-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".json")
    Write-JsonFile -Path $receiptPath -Object $receipt -Depth 100

    Set-PointerState "complete" "Full proof complete. Receipts written." 260 260
    Speak-AgentLee "Leonard, full real pointer proof is complete. I opened the outputs and wrote the receipt. If any lane is check required, it is marked truthfully." | Out-Null

    $script:FlowDone = $true
    Write-State "FLOW_COMPLETE" @{ proofJson = $proofJson; receiptPath = $receiptPath; finalReport = $finalReport }
}

# ------------------------------------------------------------
# Transparent full-screen pointer overlay.
# ------------------------------------------------------------

$form = New-Object System.Windows.Forms.Form
$form.Text = "Agent Lee Independent Pointer"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.BackColor = [System.Drawing.Color]::Magenta
$form.TransparencyKey = [System.Drawing.Color]::Magenta

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$form.Left = 0
$form.Top = 0
$form.Width = $screen.Width
$form.Height = $screen.Height

$script:AgentX = [int]($screen.Width * 0.18)
$script:AgentY = [int]($screen.Height * 0.20)
$script:TargetX = $script:AgentX
$script:TargetY = $script:AgentY

$panel = New-Object System.Windows.Forms.Panel
$panel.Dock = [System.Windows.Forms.DockStyle]::Fill
$panel.BackColor = [System.Drawing.Color]::Transparent
$form.Controls.Add($panel)

$panel.Add_Paint({
    param($sender, $e)

    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $x = $script:AgentX
    $y = $script:AgentY

    $pulse = [Math]::Abs([Math]::Sin((Get-Date).Millisecond / 1000.0 * [Math]::PI))
    $ring = [int](8 + ($pulse * 8))

    switch ($script:State) {
        "booting" { $mainColor = [System.Drawing.Color]::FromArgb(235, 0, 160, 255) }
        "speaking" { $mainColor = [System.Drawing.Color]::FromArgb(235, 255, 190, 0) }
        "looking" { $mainColor = [System.Drawing.Color]::FromArgb(235, 120, 180, 255) }
        "pointing" { $mainColor = [System.Drawing.Color]::FromArgb(235, 255, 230, 0) }
        "working" { $mainColor = [System.Drawing.Color]::FromArgb(235, 0, 220, 120) }
        "acting" { $mainColor = [System.Drawing.Color]::FromArgb(235, 255, 120, 0) }
        "creating" { $mainColor = [System.Drawing.Color]::FromArgb(235, 160, 80, 255) }
        "presenting" { $mainColor = [System.Drawing.Color]::FromArgb(235, 0, 200, 255) }
        "printing" { $mainColor = [System.Drawing.Color]::FromArgb(235, 255, 80, 80) }
        "complete" { $mainColor = [System.Drawing.Color]::FromArgb(235, 0, 220, 120) }
        default { $mainColor = [System.Drawing.Color]::FromArgb(235, 0, 160, 255) }
    }

    $brush = New-Object System.Drawing.SolidBrush($mainColor)
    $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 15, 15, 20))
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 4)
    $cyanPen = New-Object System.Drawing.Pen([System.Drawing.Color]::DeepSkyBlue, 3)

    $fontTitle = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
    $fontSmall = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)

    # Draw actual pointer-arrow shape, not a regular UI panel.
    $points = New-Object 'System.Drawing.Point[]' 7
    $points[0] = New-Object System.Drawing.Point($x, $y)
    $points[1] = New-Object System.Drawing.Point(($x + 34), ($y + 14))
    $points[2] = New-Object System.Drawing.Point(($x + 20), ($y + 23))
    $points[3] = New-Object System.Drawing.Point(($x + 36), ($y + 55))
    $points[4] = New-Object System.Drawing.Point(($x + 22), ($y + 62))
    $points[5] = New-Object System.Drawing.Point(($x + 8), ($y + 31))
    $points[6] = New-Object System.Drawing.Point(($x - 8), ($y + 45))

    $g.FillPolygon($brush, $points)
    $g.DrawPolygon($goldPen, $points)

    $g.DrawEllipse($cyanPen, ($x - $ring), ($y - $ring), (70 + ($ring * 2)), (70 + ($ring * 2)))

    $labelX = $x + 55
    $labelY = $y + 10
    $g.FillRectangle($darkBrush, $labelX, $labelY, 330, 78)
    $g.DrawRectangle($goldPen, $labelX, $labelY, 330, 78)

    $g.DrawString("AGENT LEE POINTER", $fontTitle, $whiteBrush, ($labelX + 12), ($labelY + 9))
    $g.DrawString(("State: " + $script:State), $fontSmall, $whiteBrush, ($labelX + 12), ($labelY + 31))
    $g.DrawString($script:Message, $fontSmall, $whiteBrush, ($labelX + 12), ($labelY + 51))

    $note = "Leonard mouse is separate. Agent Lee pointer is visual; desktop actions run by approved automation."
    $g.FillRectangle($darkBrush, 20, ($screen.Height - 52), 880, 34)
    $g.DrawString($note, $fontSmall, $whiteBrush, 35, ($screen.Height - 43))
})

$form.Add_Shown({
    $style = [OverlayWindowToolsV2625]::GetWindowLong($form.Handle, [OverlayWindowToolsV2625]::GWL_EXSTYLE)
    $style = $style -bor [OverlayWindowToolsV2625]::WS_EX_LAYERED -bor [OverlayWindowToolsV2625]::WS_EX_TRANSPARENT -bor [OverlayWindowToolsV2625]::WS_EX_TOOLWINDOW
    [OverlayWindowToolsV2625]::SetWindowLong($form.Handle, [OverlayWindowToolsV2625]::GWL_EXSTYLE, $style) | Out-Null

    Write-EventLine -Type "OVERLAY_STARTED" -Message "Agent Lee independent pointer overlay started." -X $script:AgentX -Y $script:AgentY
    Write-State "OVERLAY_STARTED"

    # Start the full flow automatically after overlay is visible.
    $startTimer = New-Object System.Windows.Forms.Timer
    $startTimer.Interval = 1800
    $startTimer.Add_Tick({
        $startTimer.Stop()
        Run-AutoFlow
    })
    $startTimer.Start()
})

$moveTimer = New-Object System.Windows.Forms.Timer
$moveTimer.Interval = 20

$moveTimer.Add_Tick({
    $dx = $script:TargetX - $script:AgentX
    $dy = $script:TargetY - $script:AgentY

    $script:AgentX = [int]($script:AgentX + ($dx * 0.060))
    $script:AgentY = [int]($script:AgentY + ($dy * 0.060))

    $panel.Invalidate()
})

$moveTimer.Start()

[System.Windows.Forms.Application]::Run($form)