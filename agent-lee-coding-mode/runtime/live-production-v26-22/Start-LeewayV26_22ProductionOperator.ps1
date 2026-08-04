param(
    [string]$Root,
    [string]$StatePath,
    [string]$CommandLogPath,
    [string]$ProofDir,
    [string]$AssetsDir,
    [string]$ReportsOutDir,
    [string]$UiPath
)

$ErrorActionPreference = "Continue"

foreach ($d in @($ProofDir,$AssetsDir,$ReportsOutDir,(Split-Path -Parent $StatePath),(Split-Path -Parent $CommandLogPath))) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

function Write-JsonFile {
    param([string]$Path,$Object,[int]$Depth = 80)
    if ($Depth -gt 100) { $Depth = 100 }
    $parent = Split-Path -Parent $Path
    if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth $Depth), $utf8NoBom)
}

function Add-Log {
    param($Object)
    ($Object | ConvertTo-Json -Depth 80 -Compress) | Add-Content -Path $CommandLogPath -Encoding UTF8
}

function New-Result {
    param([string]$Status,[string]$Lane,$Evidence)
    return [ordered]@{
        status = $Status
        lane = $Lane
        recordedAt = (Get-Date).ToUniversalTime().ToString("o")
        evidence = $Evidence
    }
}

function Invoke-AgentLee {
    param([string]$Prompt,$Evidence)

    $body = [ordered]@{
        model = "agent-lee"
        messages = @(
            [ordered]@{
                role = "system"
                content = "You are Agent Lee in full production test mode. Be precise. Do not claim an action was completed unless tool evidence proves it. If evidence is partial, say CHECK_REQUIRED."
            },
            [ordered]@{
                role = "user"
                content = "Prompt: $Prompt`nEvidence:`n$($Evidence | ConvertTo-Json -Depth 30)"
            }
        )
        temperature = 0.25
    }

    try {
        $json = $body | ConvertTo-Json -Depth 50
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/chat/completions" -Method POST -ContentType "application/json" -Body $json -TimeoutSec 120
        $text = $null
        try { $text = $r.choices[0].message.content } catch {}
        if (-not $text) { $text = ($r | ConvertTo-Json -Depth 20) }

        return [ordered]@{
            status = "READY"
            provider = "agent-lee-8080"
            text = [string]$text
        }
    } catch {
        return [ordered]@{
            status = "CHECK_REQUIRED"
            provider = "agent-lee-8080"
            error = $_.Exception.Message
            text = "Agent Lee route did not answer. Tool evidence was still generated locally."
        }
    }
}

function Speak-Text {
    param([string]$Text)
    try {
        Add-Type -AssemblyName System.Speech
        $sp = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $sp.SetOutputToDefaultAudioDevice()
        $sp.Rate = 0
        $sp.Volume = 100
        $sp.Speak($Text)
        return [ordered]@{ status = "SPOKEN"; voice = $sp.Voice.Name }
    } catch {
        return [ordered]@{ status = "SPEECH_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Get-DeviceDiscovery {
    $e = [ordered]@{
        note = "Only devices visible to this Windows host through Wi-Fi, ARP, NetNeighbor, Bluetooth, Windows discovery, and SSDP/UPnP can be reported. Hidden/private devices may not appear."
        recordedAt = (Get-Date).ToUniversalTime().ToString("o")
    }

    try { $e.wifiInterfacesRaw = netsh wlan show interfaces } catch { $e.wifiError = $_.Exception.Message }
    try { $e.wifiProfilesRaw = netsh wlan show profiles } catch {}
    try { $e.ipConfigRaw = ipconfig /all } catch {}
    try { $e.networkAdapters = Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, MacAddress, LinkSpeed } catch {}
    try { $e.netIPAddress = Get-NetIPAddress | Select-Object InterfaceAlias, AddressFamily, IPAddress, PrefixLength } catch {}
    try { $e.netNeighbor = Get-NetNeighbor | Select-Object InterfaceAlias, IPAddress, LinkLayerAddress, State } catch {}
    try { $e.arpRaw = arp -a } catch {}
    try { $e.bluetooth = Get-PnpDevice -Class Bluetooth | Select-Object FriendlyName, Status, InstanceId } catch { $e.bluetoothError = $_.Exception.Message }
    try { $e.mediaDevices = Get-PnpDevice | Where-Object { $_.FriendlyName -match "TV|Samsung|LG|Roku|Chromecast|Cast|Display|Media|Speaker|Bluetooth" } | Select-Object FriendlyName, Class, Status, InstanceId } catch {}
    try { $e.printers = Get-CimInstance Win32_Printer | Select-Object Name, Default, WorkOffline, PrinterStatus, PortName, DriverName } catch {}
    try { $e.cameras = Get-PnpDevice -Class Camera | Select-Object FriendlyName, Status, InstanceId } catch {}
    try { $e.audio = Get-CimInstance Win32_SoundDevice | Select-Object Name, Status, Manufacturer } catch {}

    try {
        Add-Type -AssemblyName System.Windows.Forms
        $e.monitors = @()
        foreach ($s in [System.Windows.Forms.Screen]::AllScreens) {
            $e.monitors += [ordered]@{
                deviceName = $s.DeviceName
                primary = $s.Primary
                width = $s.Bounds.Width
                height = $s.Bounds.Height
                x = $s.Bounds.X
                y = $s.Bounds.Y
            }
        }
        $e.monitorCount = $e.monitors.Count
    } catch {}

    # SSDP / UPnP discovery attempt.
    try {
        $responses = New-Object System.Collections.Generic.List[string]
        $udp = New-Object System.Net.Sockets.UdpClient
        $udp.Client.ReceiveTimeout = 2500
        $endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Parse("239.255.255.250")), 1900
        $msg = "M-SEARCH * HTTP/1.1`r`nHOST: 239.255.255.250:1900`r`nMAN: `"ssdp:discover`"`r`nMX: 2`r`nST: ssdp:all`r`n`r`n"
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($msg)
        [void]$udp.Send($bytes, $bytes.Length, $endpoint)
        $deadline = (Get-Date).AddSeconds(3)
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
    } catch {
        $e.ssdpError = $_.Exception.Message
    }

    $path = Join-Path $ReportsOutDir "device-discovery-report.json"
    Write-JsonFile $path $e 100

    return [ordered]@{
        status = "READY"
        path = $path
        report = $e
    }
}

function Capture-Screen {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
        $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bmp.Size)
        $path = Join-Path $AssetsDir ("screen-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
        return [ordered]@{ status = "READY"; path = $path; width = $bounds.Width; height = $bounds.Height }
    } catch {
        return [ordered]@{ status = "SCREEN_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Move-MouseProof {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $start = [System.Windows.Forms.Cursor]::Position
        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($start.X + 120), ($start.Y + 80))
        Start-Sleep -Milliseconds 350
        [System.Windows.Forms.Cursor]::Position = $start
        return [ordered]@{ status = "READY"; startX = $start.X; startY = $start.Y; action = "mouse moved and restored" }
    } catch {
        return [ordered]@{ status = "MOUSE_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Open-BrowserAndSearch {
    param([string]$Query)
    try {
        $url = "https://duckduckgo.com/?q=" + [uri]::EscapeDataString($Query)
        Start-Process "msedge.exe" $url
        Start-Sleep -Seconds 2
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("{PGDN}")
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.SendKeys]::SendWait("{PGUP}")
        return [ordered]@{ status = "READY"; url = $url; browser = "msedge"; scroll = "PageDown/PageUp sent" }
    } catch {
        return [ordered]@{ status = "BROWSER_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Open-NotepadTypeProof {
    try {
        $p = Start-Process notepad.exe -PassThru
        Start-Sleep -Seconds 2
        Add-Type -AssemblyName System.Windows.Forms
        $txt = "Agent Lee V26.22 production proof.`r`nApp opened, text typed, and action receipt generated.`r`nTimestamp: $((Get-Date).ToUniversalTime().ToString('o'))"
        [System.Windows.Forms.SendKeys]::SendWait($txt)
        return [ordered]@{ status = "READY"; processId = $p.Id; textLength = $txt.Length }
    } catch {
        return [ordered]@{ status = "DESKTOP_APP_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Create-ImageAsset {
    param([string]$Prompt)
    try {
        Add-Type -AssemblyName System.Drawing
        $path = Join-Path $AssetsDir ("agent-lee-image-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")
        $bmp = New-Object System.Drawing.Bitmap 1280, 720
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $titleFont = New-Object System.Drawing.Font "Arial", 34, ([System.Drawing.FontStyle]::Bold)
        $bodyFont = New-Object System.Drawing.Font "Arial", 18
        $g.DrawString("Agent Lee Generated Image Proof", $titleFont, [System.Drawing.Brushes]::DarkBlue, 60, 50)
        $g.DrawString("Prompt: " + $Prompt.Substring(0, [Math]::Min(120, $Prompt.Length)), $bodyFont, [System.Drawing.Brushes]::Black, 60, 130)
        $g.FillEllipse([System.Drawing.Brushes]::SteelBlue, 120, 280, 180, 180)
        $g.FillRectangle([System.Drawing.Brushes]::DarkBlue, 420, 300, 260, 160)
        $points = @(
            (New-Object System.Drawing.Point 850, 470),
            (New-Object System.Drawing.Point 970, 270),
            (New-Object System.Drawing.Point 1090, 470)
        )
        $g.FillPolygon([System.Drawing.Brushes]::CornflowerBlue, $points)
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
        Start-Process $path
        return [ordered]@{ status = "CREATED"; path = $path; prompt = $Prompt }
    } catch {
        return [ordered]@{ status = "IMAGE_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Create-3DAsset {
    param([string]$Prompt)
    try {
        $objPath = Join-Path $AssetsDir ("agent-lee-3d-object-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".obj")
        $htmlPath = $objPath.Replace(".obj", "-preview.html")
        @(
            "# Agent Lee V26.22 OBJ Proof",
            "# Prompt: $Prompt",
            "o AgentLeeProductionCube",
            "v -1 -1 -1",
            "v 1 -1 -1",
            "v 1 1 -1",
            "v -1 1 -1",
            "v -1 -1 1",
            "v 1 -1 1",
            "v 1 1 1",
            "v -1 1 1",
            "f 1 2 3 4",
            "f 5 8 7 6",
            "f 1 5 6 2",
            "f 2 6 7 3",
            "f 3 7 8 4",
            "f 5 1 4 8"
        ) | Set-Content -Path $objPath -Encoding UTF8

        $html = @"
<!doctype html>
<html><head><meta charset='utf-8'><title>Agent Lee 3D Preview</title>
<style>body{font-family:Arial;margin:40px}.cube{width:240px;height:240px;background:linear-gradient(135deg,#1d4ed8,#93c5fd);transform:rotateX(55deg) rotateZ(45deg);margin:90px;box-shadow:35px 35px 25px #aaa}</style>
</head><body><h1>Agent Lee 3D Object Preview</h1><p>$Prompt</p><p>OBJ: $objPath</p><div class='cube'></div></body></html>
"@
        $html | Set-Content -Path $htmlPath -Encoding UTF8
        Start-Process $htmlPath
        return [ordered]@{ status = "CREATED"; objPath = $objPath; previewPath = $htmlPath; prompt = $Prompt }
    } catch {
        return [ordered]@{ status = "THREE_D_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Create-VideoFrames {
    param([string]$Prompt)
    try {
        Add-Type -AssemblyName System.Drawing
        $frameDir = Join-Path $AssetsDir ("video-frames-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
        New-Item -ItemType Directory -Force -Path $frameDir | Out-Null
        $frames = @()

        for ($i = 0; $i -lt 18; $i++) {
            $path = Join-Path $frameDir ("frame-{0:00}.png" -f $i)
            $bmp = New-Object System.Drawing.Bitmap 1280, 720
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.Clear([System.Drawing.Color]::White)
            $font = New-Object System.Drawing.Font "Arial", 28, ([System.Drawing.FontStyle]::Bold)
            $small = New-Object System.Drawing.Font "Arial", 16
            $g.DrawString("Agent Lee Video Proof Frame $i", $font, [System.Drawing.Brushes]::DarkBlue, 60, 50)
            $g.DrawString($Prompt.Substring(0, [Math]::Min(120, $Prompt.Length)), $small, [System.Drawing.Brushes]::Black, 60, 115)
            $g.FillEllipse([System.Drawing.Brushes]::SteelBlue, 80 + ($i * 45), 330, 100, 100)
            $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
            $g.Dispose()
            $bmp.Dispose()
            $frames += $path
        }

        $htmlPath = Join-Path $frameDir "video-animation-proof.html"
        $js = ""
        foreach ($f in $frames) {
            $js += "frames.push('" + (Split-Path $f -Leaf) + "');`n"
        }

        $html = @"
<!doctype html>
<html><head><meta charset='utf-8'><title>Agent Lee Video Proof</title></head>
<body><h1>Agent Lee Video Animation Proof</h1><p>$Prompt</p><img id='frame' width='960'><script>
const frames = [];
$js
let i = 0;
setInterval(()=>{document.getElementById('frame').src = frames[i % frames.length]; i++;}, 220);
</script></body></html>
"@
        $html | Set-Content -Path $htmlPath -Encoding UTF8
        Start-Process $htmlPath
        return [ordered]@{ status = "CREATED"; framesDir = $frameDir; htmlPath = $htmlPath; frameCount = $frames.Count; prompt = $Prompt; note = "Frame animation created. MP4 requires ffmpeg encoder." }
    } catch {
        return [ordered]@{ status = "VIDEO_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Research-Bucks {
    try {
        $queries = @(
            "Milwaukee Bucks latest trades roster 2026",
            "Milwaukee Bucks projected starting lineup next season",
            "Milwaukee Bucks current roster depth chart 2026",
            "Milwaukee Bucks offseason trades latest news"
        )

        $items = @()
        foreach ($q in $queries) {
            $url = "https://duckduckgo.com/html/?q=" + [uri]::EscapeDataString($q)
            try {
                $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
                $path = Join-Path $ReportsOutDir ("bucks-search-" + ([guid]::NewGuid().ToString("N")) + ".html")
                $r.Content | Set-Content -Path $path -Encoding UTF8
                $items += [ordered]@{ query = $q; status = "SEARCHED"; url = $url; path = $path; statusCode = $r.StatusCode }
            } catch {
                $items += [ordered]@{ query = $q; status = "CHECK_REQUIRED"; error = $_.Exception.Message }
            }
        }

        $reportPath = Join-Path $ReportsOutDir "milwaukee-bucks-research-report.txt"

        $text = @"
Milwaukee Bucks Research Report
Generated: $((Get-Date).ToUniversalTime().ToString("o"))

Purpose:
Research latest available public web results for Milwaukee Bucks trades, roster, lineup, and likely starting five next season.

Important:
This script collects live web-search evidence files. Final basketball conclusions should be verified against official NBA/Bucks sources before business use.

Search Evidence:
$($items | ForEach-Object { "- $($_.query) :: $($_.status) :: $($_.path)" } | Out-String)

Working Starting Five Placeholder Pending Source Review:
1. Point Guard: CHECK_REQUIRED
2. Shooting Guard: CHECK_REQUIRED
3. Small Forward: CHECK_REQUIRED
4. Power Forward: CHECK_REQUIRED
5. Center: CHECK_REQUIRED

Reason:
The local harness gathered search evidence. A final lineup should not be asserted without checking current official roster/depth-chart sources.
"@

        $text | Set-Content -Path $reportPath -Encoding UTF8
        Start-Process notepad.exe $reportPath

        return [ordered]@{ status = "READY"; reportPath = $reportPath; searches = $items }
    } catch {
        return [ordered]@{ status = "BUCKS_RESEARCH_CHECK_REQUIRED"; error = $_.Exception.Message }
    }
}

function Build-Website {
    param($Image,$ThreeD,$Video,$Bucks,$Devices)
    try {
        $sitePath = Join-Path $AssetsDir "agent-lee-production-proof-webapp.html"

        $imageRel = ""
        if ($Image.path) { $imageRel = $Image.path }

        $html = @"
<!doctype html>
<html>
<head>
<meta charset='utf-8'>
<title>Agent Lee Production Proof Web App</title>
<style>
body{font-family:Arial;margin:0;background:#f8fafc;color:#0f172a}
header{background:#0f172a;color:white;padding:28px}
section{padding:24px;margin:18px;background:white;border-radius:12px;box-shadow:0 2px 10px #ccc}
code{background:#e2e8f0;padding:3px 6px;border-radius:4px}
</style>
</head>
<body>
<header><h1>Agent Lee Production Proof Web App</h1><p>Generated by V26.22 live production test harness.</p></header>
<section><h2>Milwaukee Bucks Research</h2><p>Report: <code>$($Bucks.reportPath)</code></p></section>
<section><h2>Device Discovery</h2><p>Device report: <code>$($Devices.path)</code></p></section>
<section><h2>Image Asset</h2><p><code>$($Image.path)</code></p></section>
<section><h2>3D Object</h2><p>OBJ: <code>$($ThreeD.objPath)</code></p><p>Preview: <code>$($ThreeD.previewPath)</code></p></section>
<section><h2>Video Frames</h2><p>Animation: <code>$($Video.htmlPath)</code></p></section>
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
    try {
        if (-not (Test-Path $ReportPath)) { throw "Report not found: $ReportPath" }
        $printer = Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1
        if (-not $printer) { throw "No default printer found." }
        if ($printer.WorkOffline) { throw "Default printer is offline: $($printer.Name)" }
        Get-Content $ReportPath | Out-Printer -Name $printer.Name
        return [ordered]@{ status = "SENT_TO_PRINTER"; printer = $printer.Name; reportPath = $ReportPath }
    } catch {
        return [ordered]@{ status = "PRINT_CHECK_REQUIRED"; error = $_.Exception.Message; reportPath = $ReportPath }
    }
}

function Run-FullProductionTest {
    param($Body)

    $imagePrompt = if ($Body.imagePrompt) { [string]$Body.imagePrompt } else { "Create an Agent Lee proof image." }
    $objectPrompt = if ($Body.objectPrompt) { [string]$Body.objectPrompt } else { "Create an Agent Lee 3D proof object." }
    $videoPrompt = if ($Body.videoPrompt) { [string]$Body.videoPrompt } else { "Create Agent Lee proof video frames." }

    $devices = Get-DeviceDiscovery
    $screen = Capture-Screen
    $mouse = Move-MouseProof
    $browser = Open-BrowserAndSearch "Milwaukee Bucks latest trades roster projected starting lineup"
    $desktop = Open-NotepadTypeProof
    $image = Create-ImageAsset $imagePrompt
    $threeD = Create-3DAsset $objectPrompt
    $video = Create-VideoFrames $videoPrompt
    $bucks = Research-Bucks
    $site = Build-Website -Image $image -ThreeD $threeD -Video $video -Bucks $bucks -Devices $devices
    $print = Print-Report $bucks.reportPath

    $evidence = [ordered]@{
        devices = $devices
        screen = $screen
        mouse = $mouse
        browser = $browser
        desktop = $desktop
        image = $image
        threeD = $threeD
        video = $video
        bucks = $bucks
        website = $site
        print = $print
    }

    $agent = Invoke-AgentLee -Prompt "Summarize the full production readiness test evidence." -Evidence $evidence
    $speech = Speak-Text "Agent Lee production test completed. Review the report, website, and receipts."

    $result = [ordered]@{
        status = "V26_22_FULL_PRODUCTION_TEST_COMPLETE"
        evidence = $evidence
        agent = $agent
        speech = $speech
    }

    $resultPath = Join-Path $ReportsOutDir "v26-22-full-production-test-result.json"
    Write-JsonFile $resultPath $result 100
    $result.resultPath = $resultPath
    Add-Log $result

    return $result
}

$state = [ordered]@{
    schema = "leeway.v26_22.production_operator.state"
    startedAt = (Get-Date).ToUniversalTime().ToString("o")
    status = "STARTING"
    bridge = "http://127.0.0.1:8792"
    ui = $UiPath
    proofDir = $ProofDir
    assetsDir = $AssetsDir
    reportsOutDir = $ReportsOutDir
    commandLog = $CommandLogPath
}

Write-JsonFile $StatePath $state 80

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:8792/")
    $listener.Start()
    $state.status = "READY"
    Write-JsonFile $StatePath $state 80
    Start-Process $UiPath
    Speak-Text "Agent Lee full live production test harness is ready." | Out-Null
} catch {
    $state.status = "CHECK_REQUIRED"
    $state.error = $_.Exception.Message
    Write-JsonFile $StatePath $state 80
    return
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $path = $request.Url.AbsolutePath.ToLowerInvariant()

        $body = @{}
        if ($request.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $raw = $reader.ReadToEnd()
            if ($raw) { $body = $raw | ConvertFrom-Json }
        }

        $result = [ordered]@{ status = "NOT_FOUND"; path = $path }

        if ($path -eq "/health") {
            $result = [ordered]@{ status = "READY"; service = "leeway-v26-22-production-operator"; statePath = $StatePath; ui = $UiPath }
        }
        elseif ($path -eq "/command" -and $request.HttpMethod -eq "POST") {
            $result = Run-FullProductionTest $body
        }
        elseif ($path -eq "/devices") {
            $result = New-Result "READY" "devices" (Get-DeviceDiscovery)
        }
        elseif ($path -eq "/screen") {
            $result = New-Result "READY" "screen" (Capture-Screen)
        }
        elseif ($path -eq "/browser/open") {
            $result = New-Result "READY" "browser" (Open-BrowserAndSearch "Milwaukee Bucks latest trades roster projected starting lineup")
        }
        elseif ($path -eq "/browser/research-bucks") {
            $result = New-Result "READY" "bucks-research" (Research-Bucks)
        }
        elseif ($path -eq "/desktop/notepad") {
            $result = New-Result "READY" "desktop" (Open-NotepadTypeProof)
        }
        elseif ($path -eq "/create/image") {
            $prompt = if ($body.imagePrompt) { [string]$body.imagePrompt } else { "Agent Lee image proof." }
            $result = New-Result "READY" "image" (Create-ImageAsset $prompt)
        }
        elseif ($path -eq "/create/video") {
            $prompt = if ($body.videoPrompt) { [string]$body.videoPrompt } else { "Agent Lee video proof." }
            $result = New-Result "READY" "video" (Create-VideoFrames $prompt)
        }
        elseif ($path -eq "/create/3d") {
            $prompt = if ($body.objectPrompt) { [string]$body.objectPrompt } else { "Agent Lee 3D proof." }
            $result = New-Result "READY" "3d" (Create-3DAsset $prompt)
        }
        elseif ($path -eq "/website/build") {
            $devices = Get-DeviceDiscovery
            $image = Create-ImageAsset "Agent Lee production website image."
            $threeD = Create-3DAsset "Agent Lee production website 3D object."
            $video = Create-VideoFrames "Agent Lee production website animation."
            $bucks = Research-Bucks
            $result = New-Result "READY" "website" (Build-Website -Image $image -ThreeD $threeD -Video $video -Bucks $bucks -Devices $devices)
        }
        elseif ($path -eq "/print/report") {
            $bucks = Research-Bucks
            $result = New-Result "READY" "print" (Print-Report $bucks.reportPath)
        }

        Add-Log $result

        $json = $result | ConvertTo-Json -Depth 100
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json"
        $response.StatusCode = 200
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.OutputStream.Close()
    } catch {
        try {
            $err = [ordered]@{ status = "BRIDGE_ERROR"; error = $_.Exception.Message } | ConvertTo-Json -Depth 20
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($err)
            $response.StatusCode = 500
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        } catch {}
    }
}