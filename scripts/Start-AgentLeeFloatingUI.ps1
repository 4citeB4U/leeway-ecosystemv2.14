param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [string]$ProofRoot = ""
)

$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# System.Speech may not exist on every Windows install, so load defensively.
$SpeechAvailable = $false
try {
    Add-Type -AssemblyName System.Speech
    $SpeechAvailable = $true
} catch {
    $SpeechAvailable = $false
}

if ([string]::IsNullOrWhiteSpace($ProofRoot)) {
    $StampLocal = Get-Date -Format "yyyyMMdd-HHmmss"
    $ProofRoot = Join-Path $Root "Archive\proofs\agent-lee-floating-ui-live-$StampLocal"
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

$EventLogPath = "$ProofRoot\logs\agent-lee-floating-ui-events.jsonl"
$SpeechLogPath = "$ProofRoot\ears\agent-lee-heard-transcript.txt"

function Write-EventLine {
    param(
        [string]$Type,
        [string]$Message,
        $Data = $null
    )

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        data = $Data
    }

    Add-Content -Path $EventLogPath -Value ($obj | ConvertTo-Json -Compress -Depth 20) -Encoding UTF8
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

function Get-LaneStatusText {
    $desktop = Invoke-JsonSafe -Uri "http://127.0.0.1:8091/status" -TimeoutSec 3
    $voice = Invoke-JsonSafe -Uri "http://127.0.0.1:8092/health" -TimeoutSec 5
    $vision = Invoke-JsonSafe -Uri "http://127.0.0.1:8093/health" -TimeoutSec 5

    $desktopStatus = if ($desktop.error) { "BLOCKED" } else { "READY" }
    $voiceStatus = if ($voice.error) { "BLOCKED" } else { "READY" }
    $visionStatus = if ($vision.error) { "BLOCKED" } else { "READY" }

    return @"
Runtime discovery:
Desktop Runtime 8091: $desktopStatus
Clone Voice XTTS 8092: $voiceStatus
Vision Kernel 8093: $visionStatus
Speech/Ears Assembly: $(if ($SpeechAvailable) { "READY" } else { "BLOCKED" })

Truth:
- Agent Lee UI orb is separate from Leonard's cursor.
- This UI does not move Leonard's mouse.
- Desktop hands must be a separate approval-gated mode.
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

        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8092/tts" -Method POST -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 20) -TimeoutSec 900

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
        } else {
            Write-EventLine -Type "CLONE_VOICE_NO_AUDIO_URL" -Message "XTTS response did not provide audio URL." -Data @{ responsePath = $resPath }
            return $null
        }
    } catch {
        Write-EventLine -Type "CLONE_VOICE_FAILED" -Message $_.Exception.Message
        return $null
    }
}

# ------------------------------------------------------------
# Build the Agent Lee floating orb.
# This is a normal clickable UI window, NOT a cursor overlay.
# ------------------------------------------------------------

$formOrb = New-Object System.Windows.Forms.Form
$formOrb.Text = "Agent Lee"
$formOrb.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$formOrb.TopMost = $true
$formOrb.ShowInTaskbar = $true
$formOrb.Width = 112
$formOrb.Height = 112
$formOrb.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$formOrb.BackColor = [System.Drawing.Color]::Black
$formOrb.Opacity = 0.94

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$formOrb.Left = $screen.Right - 140
$formOrb.Top = $screen.Bottom - 160

$orbPanel = New-Object System.Windows.Forms.Panel
$orbPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
$orbPanel.BackColor = [System.Drawing.Color]::Black
$formOrb.Controls.Add($orbPanel)

$orbPanel.Add_Paint({
    param($sender, $e)

    $g = $e.Graphics
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 150, 255))
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 4)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $fontTitle = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
    $fontSmall = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)

    $g.FillEllipse($blue, 10, 10, 90, 90)
    $g.DrawEllipse($goldPen, 10, 10, 90, 90)
    $g.DrawString("LEE", $fontTitle, $white, 38, 33)
    $g.DrawString("open", $fontSmall, $white, 38, 61)
})

# Drag orb by holding mouse down, so user can place it.
$script:dragging = $false
$script:dragOffsetX = 0
$script:dragOffsetY = 0

$orbPanel.Add_MouseDown({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:dragging = $true
        $script:dragOffsetX = $e.X
        $script:dragOffsetY = $e.Y
    }
})

$orbPanel.Add_MouseMove({
    param($sender, $e)
    if ($script:dragging) {
        $pos = [System.Windows.Forms.Cursor]::Position
        $formOrb.Left = $pos.X - $script:dragOffsetX
        $formOrb.Top = $pos.Y - $script:dragOffsetY
    }
})

$orbPanel.Add_MouseUp({
    $script:dragging = $false
})

# ------------------------------------------------------------
# Main Agent Lee panel.
# ------------------------------------------------------------

$formPanel = New-Object System.Windows.Forms.Form
$formPanel.Text = "Agent Lee Control Panel"
$formPanel.Width = 760
$formPanel.Height = 650
$formPanel.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$formPanel.TopMost = $false

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.ReadOnly = $true
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 10)
$txtLog.Left = 12
$txtLog.Top = 12
$txtLog.Width = 720
$txtLog.Height = 360
$formPanel.Controls.Add($txtLog)

$txtInput = New-Object System.Windows.Forms.TextBox
$txtInput.Left = 12
$txtInput.Top = 390
$txtInput.Width = 600
$txtInput.Height = 30
$txtInput.Font = New-Object System.Drawing.Font("Arial", 11)
$formPanel.Controls.Add($txtInput)

$btnSend = New-Object System.Windows.Forms.Button
$btnSend.Text = "Send"
$btnSend.Left = 620
$btnSend.Top = 388
$btnSend.Width = 110
$btnSend.Height = 34
$formPanel.Controls.Add($btnSend)

$btnSpeak = New-Object System.Windows.Forms.Button
$btnSpeak.Text = "Speak Test"
$btnSpeak.Left = 12
$btnSpeak.Top = 440
$btnSpeak.Width = 130
$btnSpeak.Height = 36
$formPanel.Controls.Add($btnSpeak)

$btnListen = New-Object System.Windows.Forms.Button
$btnListen.Text = "Start Ears"
$btnListen.Left = 150
$btnListen.Top = 440
$btnListen.Width = 130
$btnListen.Height = 36
$formPanel.Controls.Add($btnListen)

$btnStopListen = New-Object System.Windows.Forms.Button
$btnStopListen.Text = "Stop Ears"
$btnStopListen.Left = 288
$btnStopListen.Top = 440
$btnStopListen.Width = 130
$btnStopListen.Height = 36
$formPanel.Controls.Add($btnStopListen)

$btnStatus = New-Object System.Windows.Forms.Button
$btnStatus.Text = "Discovery Status"
$btnStatus.Left = 426
$btnStatus.Top = 440
$btnStatus.Width = 150
$btnStatus.Height = 36
$formPanel.Controls.Add($btnStatus)

$btnProof = New-Object System.Windows.Forms.Button
$btnProof.Text = "Open Proofs"
$btnProof.Left = 584
$btnProof.Top = 440
$btnProof.Width = 146
$btnProof.Height = 36
$formPanel.Controls.Add($btnProof)

$lblMode = New-Object System.Windows.Forms.Label
$lblMode.Left = 12
$lblMode.Top = 500
$lblMode.Width = 720
$lblMode.Height = 70
$lblMode.Font = New-Object System.Drawing.Font("Arial", 10)
$lblMode.Text = "Agent Lee UI restored. Your cursor is normal. Click the orb to open this panel. Ears are off until Start Ears."
$formPanel.Controls.Add($lblMode)

function Append-Log {
    param([string]$Text)

    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text
    $txtLog.AppendText($line + [Environment]::NewLine)
    Write-EventLine -Type "UI_LOG" -Message $Text
}

$recognizer = $null
$earsRunning = $false

function Start-Ears {
    if (-not $SpeechAvailable) {
        Append-Log "EARS BLOCKED: System.Speech is not available on this Windows install."
        return
    }

    if ($earsRunning) {
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

            # Cross-thread UI update
            $using:txtLog.BeginInvoke([Action]{
                $using:txtLog.AppendText($line + [Environment]::NewLine)
            }) | Out-Null
        } | Out-Null

        Register-ObjectEvent -InputObject $script:recognizer -EventName RecognizeCompleted -Action {
            Add-Content -Path $using:SpeechLogPath -Value ("[{0}] RecognizeCompleted" -f (Get-Date -Format "HH:mm:ss")) -Encoding UTF8
        } | Out-Null

        $script:recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
        $script:earsRunning = $true
        $lblMode.Text = "Ears are ON. Speak into your selected/default Windows microphone."
        Append-Log "EARS STARTED: Listening through Windows default microphone."
        Write-EventLine -Type "EARS_STARTED" -Message "System.Speech recognizer started."
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
        $lblMode.Text = "Ears are OFF."
        Append-Log "EARS STOPPED."
        Write-EventLine -Type "EARS_STOPPED" -Message "Recognizer stopped."
    } catch {
        Append-Log ("EARS STOP FAILED: " + $_.Exception.Message)
    }
}

$orbPanel.Add_DoubleClick({
    $formPanel.Show()
    $formPanel.Activate()
    Append-Log "Agent Lee panel opened from orb."
})

$orbPanel.Add_Click({
    $formPanel.Show()
    $formPanel.Activate()
})

$btnStatus.Add_Click({
    $status = Get-LaneStatusText
    Append-Log $status
})

$btnSpeak.Add_Click({
    Append-Log "Speaking through XTTS clone voice..."
    $wav = Speak-AgentLeeClone "Peace Leonard, Agent Lee is back in his own UI. Your cursor is yours. My orb opens my control panel. I am testing my voice now."
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

    # For now this is a local UI response, not a model call.
    # The next pass should route this through qwen3/runtime fabric.
    $response = "I heard the typed message in my UI. Voice and ears are being tested here. Next repair connects this box to runtime reasoning."
    Append-Log ("AGENT LEE: " + $response)

    Speak-AgentLeeClone $response | Out-Null

    $txtInput.Text = ""
})

$formPanel.Add_FormClosing({
    param($sender, $e)
    $e.Cancel = $true
    $formPanel.Hide()
})

$formOrb.Add_FormClosing({
    try { Stop-Ears } catch {}
})

Append-Log "Agent Lee floating UI started."
Append-Log "Click the blue LEE orb to open the control panel."
Append-Log "This does not move or label Leonard's Windows cursor."
Append-Log (Get-LaneStatusText)

Write-EventLine -Type "AGENT_LEE_FLOATING_UI_STARTED" -Message "Orb and control panel started." -Data @{
    proofRoot = $ProofRoot
    speechAvailable = $SpeechAvailable
}

[System.Windows.Forms.Application]::Run($formOrb)
