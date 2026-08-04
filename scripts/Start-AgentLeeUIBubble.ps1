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
    $StampLocal = Get-Date -Format "yyyyMMdd-HHmmss"
    $ProofRoot = Join-Path $Root "Archive\proofs\agent-lee-ui-bubble-live-$StampLocal"
}

foreach ($d in @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\voice",
    "$ProofRoot\ears",
    "$ProofRoot\runtime"
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$EventLogPath = "$ProofRoot\logs\agent-lee-ui-bubble-events.jsonl"
$SpeechLogPath = "$ProofRoot\ears\agent-lee-heard-transcript.txt"

function Write-EventLine {
    param([string]$Type, [string]$Message, $Data = $null)

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        data = $Data
    }

    Add-Content -Path $EventLogPath -Value ($obj | ConvertTo-Json -Compress -Depth 20) -Encoding UTF8
}

function Append-Log {
    param([string]$Text)

    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text

    if ($script:txtLog) {
        $script:txtLog.AppendText($line + [Environment]::NewLine)
    }

    Write-EventLine -Type "UI_LOG" -Message $Text
}

function Invoke-JsonSafe {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        $Body = $null,
        [int]$TimeoutSec = 5
    )

    try {
        if ($null -ne $Body) {
            return Invoke-RestMethod -Uri $Uri -Method $Method -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 20) -TimeoutSec $TimeoutSec
        } else {
            return Invoke-RestMethod -Uri $Uri -Method $Method -TimeoutSec $TimeoutSec
        }
    } catch {
        return [ordered]@{
            error = $true
            message = $_.Exception.Message
            uri = $Uri
        }
    }
}

function Get-DiscoveryStatus {
    $desktop = Invoke-JsonSafe -Uri "http://127.0.0.1:8091/status" -TimeoutSec 3
    $voice = Invoke-JsonSafe -Uri "http://127.0.0.1:8092/health" -TimeoutSec 5
    $vision = Invoke-JsonSafe -Uri "http://127.0.0.1:8093/health" -TimeoutSec 5

    $desktopStatus = if ($desktop.error) { "BLOCKED" } else { "READY" }
    $voiceStatus = if ($voice.error) { "BLOCKED" } else { "READY" }
    $visionStatus = if ($vision.error) { "BLOCKED" } else { "READY" }
    $earsStatus = if ($script:SpeechAvailable) { "READY" } else { "BLOCKED" }

    return @"
Discovery Layer Status

Desktop Runtime 8091: $desktopStatus
Clone Voice XTTS 8092: $voiceStatus
Vision Kernel 8093: $visionStatus
Mic/Ears System.Speech: $earsStatus

Cursor Rule:
Leonard's Windows cursor stays normal.
This Agent Lee UI bubble is separate.
This UI does not move Leonard's mouse.
"@
}

function Speak-AgentLeeClone {
    param([string]$Text)

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $reqPath = "$ProofRoot\voice\xtts-request-$stamp.json"
    $resPath = "$ProofRoot\voice\xtts-response-$stamp.json"
    $wavPath = "$ProofRoot\voice\agent-lee-speech-$stamp.wav"

    try {
        $body = [ordered]@{
            text = $Text
            voice = "agent-lee"
            requireCanonicalCloneVoice = $true
            noFallback = $true
        }

        [System.IO.File]::WriteAllText($reqPath, ($body | ConvertTo-Json -Depth 20), [System.Text.UTF8Encoding]::new($false))

        $res = Invoke-RestMethod `
            -Uri "http://127.0.0.1:8092/tts" `
            -Method POST `
            -ContentType "application/json" `
            -Body ($body | ConvertTo-Json -Depth 20) `
            -TimeoutSec 900

        [System.IO.File]::WriteAllText($resPath, ($res | ConvertTo-Json -Depth 20), [System.Text.UTF8Encoding]::new($false))

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

            Write-EventLine -Type "CLONE_VOICE_SPOKE" -Message $Text -Data @{ wavPath = $wavPath }
            return $wavPath
        }

        Write-EventLine -Type "CLONE_VOICE_NO_AUDIO_URL" -Message "XTTS returned no audio URL."
        return $null
    } catch {
        Write-EventLine -Type "CLONE_VOICE_FAILED" -Message $_.Exception.Message
        return $null
    }
}

# ============================================================
# Agent Lee UI Bubble - same earlier look, fixed
# ============================================================

$formBubble = New-Object System.Windows.Forms.Form
$formBubble.Text = "Agent Lee UI"
$formBubble.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$formBubble.TopMost = $true
$formBubble.ShowInTaskbar = $true
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

    # Left circle, like earlier
    $g.FillEllipse($blue, 5, 5, 70, 70)
    $g.DrawEllipse($goldPen, 5, 5, 70, 70)
    $g.DrawString("LEE", $font1, $white, 23, 20)
    $g.DrawString("OPEN", $font2, $white, 17, 43)

    # Right label, like earlier
    $g.FillRectangle($dark, 78, 16, 82, 42)
    $g.DrawRectangle($goldPen, 78, 16, 82, 42)
    $g.DrawString("AGENT", $font2, $white, 93, 20)
    $g.DrawString("LEE UI", $font2, $white, 93, 38)
})

# Dragging the bubble is allowed because the user is controlling it.
$script:dragging = $false
$script:dragX = 0
$script:dragY = 0
$script:movedDuringClick = $false

$panelBubble.Add_MouseDown({
    param($sender, $e)

    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:dragging = $true
        $script:dragX = $e.X
        $script:dragY = $e.Y
        $script:movedDuringClick = $false
    }
})

$panelBubble.Add_MouseMove({
    param($sender, $e)

    if ($script:dragging) {
        $pos = [System.Windows.Forms.Cursor]::Position
        $newLeft = $pos.X - $script:dragX
        $newTop = $pos.Y - $script:dragY

        if (([Math]::Abs($formBubble.Left - $newLeft) -gt 2) -or ([Math]::Abs($formBubble.Top - $newTop) -gt 2)) {
            $script:movedDuringClick = $true
        }

        $formBubble.Left = $newLeft
        $formBubble.Top = $newTop
    }
})

$panelBubble.Add_MouseUp({
    $script:dragging = $false
})

# ============================================================
# Agent Lee Control Panel
# ============================================================

$formPanel = New-Object System.Windows.Forms.Form
$formPanel.Text = "Agent Lee UI Control Panel"
$formPanel.Width = 820
$formPanel.Height = 680
$formPanel.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$formPanel.TopMost = $false

$script:txtLog = New-Object System.Windows.Forms.TextBox
$script:txtLog.Multiline = $true
$script:txtLog.ScrollBars = "Vertical"
$script:txtLog.ReadOnly = $true
$script:txtLog.Font = New-Object System.Drawing.Font("Consolas", 10)
$script:txtLog.Left = 12
$script:txtLog.Top = 12
$script:txtLog.Width = 780
$script:txtLog.Height = 370
$formPanel.Controls.Add($script:txtLog)

$txtInput = New-Object System.Windows.Forms.TextBox
$txtInput.Left = 12
$txtInput.Top = 400
$txtInput.Width = 650
$txtInput.Height = 32
$txtInput.Font = New-Object System.Drawing.Font("Arial", 11)
$formPanel.Controls.Add($txtInput)

$btnSend = New-Object System.Windows.Forms.Button
$btnSend.Text = "Send"
$btnSend.Left = 672
$btnSend.Top = 398
$btnSend.Width = 120
$btnSend.Height = 36
$formPanel.Controls.Add($btnSend)

$btnSpeak = New-Object System.Windows.Forms.Button
$btnSpeak.Text = "Speak Test"
$btnSpeak.Left = 12
$btnSpeak.Top = 455
$btnSpeak.Width = 135
$btnSpeak.Height = 38
$formPanel.Controls.Add($btnSpeak)

$btnListen = New-Object System.Windows.Forms.Button
$btnListen.Text = "Start Ears"
$btnListen.Left = 157
$btnListen.Top = 455
$btnListen.Width = 135
$btnListen.Height = 38
$formPanel.Controls.Add($btnListen)

$btnStopListen = New-Object System.Windows.Forms.Button
$btnStopListen.Text = "Stop Ears"
$btnStopListen.Left = 302
$btnStopListen.Top = 455
$btnStopListen.Width = 135
$btnStopListen.Height = 38
$formPanel.Controls.Add($btnStopListen)

$btnStatus = New-Object System.Windows.Forms.Button
$btnStatus.Text = "Discovery Status"
$btnStatus.Left = 447
$btnStatus.Top = 455
$btnStatus.Width = 155
$btnStatus.Height = 38
$formPanel.Controls.Add($btnStatus)

$btnProof = New-Object System.Windows.Forms.Button
$btnProof.Text = "Open Proofs"
$btnProof.Left = 612
$btnProof.Top = 455
$btnProof.Width = 180
$btnProof.Height = 38
$formPanel.Controls.Add($btnProof)

$lblRule = New-Object System.Windows.Forms.Label
$lblRule.Left = 12
$lblRule.Top = 515
$lblRule.Width = 780
$lblRule.Height = 90
$lblRule.Font = New-Object System.Drawing.Font("Arial", 10)
$lblRule.Text = "Agent Lee UI bubble restored. Your Windows cursor remains normal. The bubble is separate and clickable. Ears are off until Start Ears."
$formPanel.Controls.Add($lblRule)

$script:recognizer = $null
$script:earsRunning = $false

function Start-Ears {
    if (-not $script:SpeechAvailable) {
        Append-Log "EARS BLOCKED: System.Speech is not available."
        return
    }

    if ($script:earsRunning) {
        Append-Log "Ears already running."
        return
    }

    try {
        $script:recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $dictation = New-Object System.Speech.Recognition.DictationGrammar
        $script:recognizer.LoadGrammar($dictation)
        $script:recognizer.SetInputToDefaultAudioDevice()

        Register-ObjectEvent -InputObject $script:recognizer -EventName SpeechRecognized -Action {
            $text = $EventArgs.Result.Text
            $confidence = $EventArgs.Result.Confidence
            $line = "[{0}] HEARD confidence={1:N2}: {2}" -f (Get-Date -Format "HH:mm:ss"), $confidence, $text

            Add-Content -Path $using:SpeechLogPath -Value $line -Encoding UTF8

            $using:txtLog.BeginInvoke([Action]{
                $using:txtLog.AppendText($line + [Environment]::NewLine)
            }) | Out-Null
        } | Out-Null

        $script:recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
        $script:earsRunning = $true

        $lblRule.Text = "Ears are ON. Speak into the Windows default microphone. Heard text will appear in the log."
        Append-Log "EARS STARTED through Windows default microphone."
        Write-EventLine -Type "EARS_STARTED" -Message "Recognizer started."
    } catch {
        Append-Log ("EARS FAILED: " + $_.Exception.Message)
        Write-EventLine -Type "EARS_FAILED" -Message $_.Exception.Message
    }
}

function Stop-Ears {
    try {
        if ($script:recognizer) {
            $script:recognizer.RecognizeAsyncStop()
            $script:recognizer.Dispose()
            $script:recognizer = $null
        }

        $script:earsRunning = $false
        $lblRule.Text = "Ears are OFF."
        Append-Log "EARS STOPPED."
        Write-EventLine -Type "EARS_STOPPED" -Message "Recognizer stopped."
    } catch {
        Append-Log ("EARS STOP FAILED: " + $_.Exception.Message)
    }
}

function Open-AgentPanel {
    $formPanel.Show()
    $formPanel.Activate()
    Append-Log "Agent Lee UI panel opened from AGENT LEE UI bubble."
}

$panelBubble.Add_Click({
    if (-not $script:movedDuringClick) {
        Open-AgentPanel
    }
})

$panelBubble.Add_DoubleClick({
    Open-AgentPanel
})

$btnStatus.Add_Click({
    Append-Log (Get-DiscoveryStatus)
})

$btnSpeak.Add_Click({
    Append-Log "Speak Test started through XTTS clone voice..."
    $wav = Speak-AgentLeeClone "Peace Leonard, Agent Lee UI is restored. I look like the earlier Agent Lee UI bubble, but I am not attached to your cursor. Click my bubble to open my panel."
    if ($wav) {
        Append-Log ("VOICE READY: " + $wav)
    } else {
        Append-Log "VOICE BLOCKED: XTTS did not return playable audio."
    }
})

$btnListen.Add_Click({
    Start-Ears
})

$btnStopListen.Add_Click({
    Stop-Ears
})

$btnProof.Add_Click({
    Start-Process explorer.exe $ProofRoot
    Append-Log ("Opened proof folder: " + $ProofRoot)
})

$btnSend.Add_Click({
    $msg = $txtInput.Text.Trim()

    if ([string]::IsNullOrWhiteSpace($msg)) {
        Append-Log "No message entered."
        return
    }

    Append-Log ("LEONARD typed: " + $msg)

    $response = "I received your typed message inside my restored Agent Lee UI panel. The next step is wiring this message and the mic transcript into the runtime reasoning loop."
    Append-Log ("AGENT LEE: " + $response)

    Speak-AgentLeeClone $response | Out-Null
    $txtInput.Text = ""
})

$formPanel.Add_FormClosing({
    param($sender, $e)
    $e.Cancel = $true
    $formPanel.Hide()
})

$formBubble.Add_FormClosing({
    try { Stop-Ears } catch {}
})

Append-Log "Agent Lee UI bubble restored."
Append-Log "Click the AGENT / LEE UI bubble to open my panel."
Append-Log "Your Windows cursor remains normal."
Append-Log (Get-DiscoveryStatus)

Write-EventLine -Type "AGENT_LEE_UI_BUBBLE_STARTED" -Message "Agent Lee UI bubble restored with earlier visual style." -Data @{
    proofRoot = $ProofRoot
    speechAvailable = $script:SpeechAvailable
}

[System.Windows.Forms.Application]::Run($formBubble)
