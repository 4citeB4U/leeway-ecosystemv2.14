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
    $ProofRoot = Join-Path $Root ("Archive\proofs\agent-lee-voice-first-approval-live-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
}

foreach ($d in @(
    $ProofRoot,
    "$ProofRoot\logs",
    "$ProofRoot\voice",
    "$ProofRoot\ears",
    "$ProofRoot\printer"
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$EventLogPath = "$ProofRoot\logs\voice-first-approval-events.jsonl"
$ApprovalLogPath = "$ProofRoot\ears\voice-approval-log.txt"

function Write-JsonFile {
    param([string]$Path, $Object)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth 50), $utf8)
}

function Write-EventLine {
    param([string]$Type, [string]$Message, $Data = $null)

    $obj = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        type = $Type
        message = $Message
        data = $Data
    }

    Add-Content -Path $EventLogPath -Value ($obj | ConvertTo-Json -Compress -Depth 30) -Encoding UTF8
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

            Write-EventLine -Type "AGENT_LEE_SPOKE" -Message $Text -Data @{ wavPath = $wavPath }
            return $wavPath
        }

        Write-EventLine -Type "VOICE_BLOCKED" -Message "No audio URL returned from XTTS."
        return $null
    } catch {
        Write-EventLine -Type "VOICE_FAILED" -Message $_.Exception.Message
        return $null
    }
}

function Listen-AgentLeeOnce {
    param(
        [int]$Seconds = 9,
        [string]$Purpose = "voice input"
    )

    if (-not $script:SpeechAvailable) {
        Write-EventLine -Type "EARS_BLOCKED" -Message "System.Speech is unavailable."
        return $null
    }

    try {
        Write-EventLine -Type "EARS_LISTENING" -Message $Purpose

        $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $grammar = New-Object System.Speech.Recognition.DictationGrammar
        $rec.LoadGrammar($grammar)
        $rec.SetInputToDefaultAudioDevice()

        $result = $rec.Recognize([TimeSpan]::FromSeconds($Seconds))
        $rec.Dispose()

        if ($result) {
            $heard = [string]$result.Text
            $confidence = [double]$result.Confidence

            $line = "[{0}] PURPOSE={1} CONFIDENCE={2:N2} HEARD={3}" -f (Get-Date -Format "HH:mm:ss"), $Purpose, $confidence, $heard
            Add-Content -Path $ApprovalLogPath -Value $line -Encoding UTF8

            Write-EventLine -Type "AGENT_LEE_HEARD" -Message $heard -Data @{
                purpose = $Purpose
                confidence = $confidence
            }

            return [ordered]@{
                text = $heard
                confidence = $confidence
            }
        }

        Write-EventLine -Type "EARS_NO_SPEECH" -Message "No speech recognized for $Purpose."
        return $null
    } catch {
        Write-EventLine -Type "EARS_FAILED" -Message $_.Exception.Message
        return $null
    }
}

function Get-VoiceApproval {
    param(
        [string]$ActionName,
        [string]$Question,
        [int]$MaxAttempts = 2
    )

    $approvalWords = @(
        "yes",
        "yeah",
        "yep",
        "approve",
        "approved",
        "i approve",
        "go ahead",
        "print",
        "print it",
        "send it",
        "do it",
        "okay",
        "ok"
    )

    $denyWords = @(
        "no",
        "nope",
        "stop",
        "cancel",
        "do not",
        "don't",
        "do not print",
        "cancel print"
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        Speak-AgentLeeClone $Question | Out-Null

        $heard = Listen-AgentLeeOnce -Seconds 9 -Purpose "approval:$ActionName"

        if ($heard -and $heard.text) {
            $text = $heard.text.ToLowerInvariant()

            foreach ($deny in $denyWords) {
                if ($text -like "*$deny*") {
                    Write-EventLine -Type "VOICE_APPROVAL_DENIED" -Message $text -Data @{
                        action = $ActionName
                        attempt = $attempt
                    }

                    Speak-AgentLeeClone "Understood. I will not do that." | Out-Null

                    return [ordered]@{
                        approved = $false
                        heard = $heard.text
                        confidence = $heard.confidence
                        reason = "Denied by voice."
                    }
                }
            }

            foreach ($yes in $approvalWords) {
                if ($text -like "*$yes*") {
                    Write-EventLine -Type "VOICE_APPROVAL_GRANTED" -Message $text -Data @{
                        action = $ActionName
                        attempt = $attempt
                    }

                    Speak-AgentLeeClone "Approval received. I am proceeding now." | Out-Null

                    return [ordered]@{
                        approved = $true
                        heard = $heard.text
                        confidence = $heard.confidence
                        reason = "Approved by voice."
                    }
                }
            }

            Speak-AgentLeeClone "I heard you, but I did not hear a clear yes or approval. Please say yes, approve, go ahead, or cancel." | Out-Null
        } else {
            Speak-AgentLeeClone "I did not hear a response. Please answer by voice." | Out-Null
        }
    }

    Write-EventLine -Type "VOICE_APPROVAL_NOT_GRANTED" -Message "No clear approval heard." -Data @{
        action = $ActionName
    }

    return [ordered]@{
        approved = $false
        heard = ""
        confidence = 0
        reason = "No clear voice approval."
    }
}

function New-AgentLeePrintDocument {
    param(
        [string]$Title,
        [string]$Body
    )

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $proofPath = "$ProofRoot\printer\agent-lee-voice-approved-print-$stamp.json"

    try {
        $printers = @(Get-Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    } catch {
        $printers = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, DriverName, PortName)
    }

    $selected = $printers | Where-Object { $_.Name -match "HP|OfficeJet|8020" } | Select-Object -First 1
    if (-not $selected) {
        $selected = $printers | Select-Object -First 1
    }

    if (-not $selected) {
        Speak-AgentLeeClone "I cannot print because Windows did not return a printer." | Out-Null
        Write-EventLine -Type "PRINT_BLOCKED" -Message "No printer found."
        return $null
    }

    $approval = Get-VoiceApproval `
        -ActionName "physical_print" `
        -Question "Leonard, I found printer $($selected.Name). May I print the Agent Lee report now? Please say yes, approve, go ahead, or cancel."

    if (-not $approval.approved) {
        Write-JsonFile $proofPath ([ordered]@{
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
            selectedPrinter = $selected.Name
            printSubmitted = $false
            approval = $approval
        })

        return $null
    }

    Add-Type -AssemblyName System.Drawing

    $doc = New-Object System.Drawing.Printing.PrintDocument
    $doc.PrinterSettings.PrinterName = $selected.Name
    $doc.DocumentName = "Agent Lee Voice Approved Report"

    $doc.add_PrintPage({
        param($sender, $e)

        $g = $e.Graphics
        $fontTitle = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
        $fontBody = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Regular)
        $fontSmall = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Regular)
        $brush = [System.Drawing.Brushes]::Black

        $y = 40

        $g.DrawString($Title, $fontTitle, $brush, 40, $y)
        $y += 45

        $g.DrawString(("Printed by Agent Lee after voice approval."), $fontBody, $brush, 40, $y)
        $y += 30

        $g.DrawString(("Timestamp: " + (Get-Date).ToString()), $fontSmall, $brush, 40, $y)
        $y += 25

        $g.DrawString(("Printer: " + $doc.PrinterSettings.PrinterName), $fontSmall, $brush, 40, $y)
        $y += 35

        $rect = New-Object System.Drawing.RectangleF([single]40, [single]$y, [single]720, [single]700)
        $g.DrawString($Body, $fontBody, $brush, $rect)
    })

    try {
        $doc.Print()

        $receipt = [ordered]@{
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
            selectedPrinter = $selected.Name
            printSubmitted = $true
            approval = $approval
            title = $Title
            body = $Body
            truth = "Physical print submitted only after voice approval."
        }

        Write-JsonFile $proofPath $receipt

        Speak-AgentLeeClone "The print job has been submitted to the printer." | Out-Null
        Write-EventLine -Type "PRINT_SUBMITTED_AFTER_VOICE_APPROVAL" -Message "Print submitted." -Data $receipt

        return $proofPath
    } catch {
        Speak-AgentLeeClone "I tried to print, but Windows returned an error." | Out-Null

        Write-JsonFile $proofPath ([ordered]@{
            timestamp = (Get-Date).ToUniversalTime().ToString("o")
            selectedPrinter = $selected.Name
            printSubmitted = $false
            approval = $approval
            error = $_.Exception.Message
        })

        Write-EventLine -Type "PRINT_FAILED" -Message $_.Exception.Message
        return $null
    }
}

# ============================================================
# Voice-first demo UI
# ============================================================

$form = New-Object System.Windows.Forms.Form
$form.Text = "Agent Lee Voice-First Approval Patch"
$form.Width = 760
$form.Height = 520
$form.StartPosition = "CenterScreen"

$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.ReadOnly = $true
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 10)
$txtLog.Left = 15
$txtLog.Top = 15
$txtLog.Width = 710
$txtLog.Height = 300
$form.Controls.Add($txtLog)

function UiLog {
    param([string]$Text)
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Text
    $txtLog.AppendText($line + [Environment]::NewLine)
    Write-EventLine -Type "UI_LOG" -Message $Text
}

$btnAskPrint = New-Object System.Windows.Forms.Button
$btnAskPrint.Text = "Ask Voice Approval + Print"
$btnAskPrint.Left = 15
$btnAskPrint.Top = 335
$btnAskPrint.Width = 240
$btnAskPrint.Height = 45
$form.Controls.Add($btnAskPrint)

$btnVoiceTest = New-Object System.Windows.Forms.Button
$btnVoiceTest.Text = "Voice Test"
$btnVoiceTest.Left = 270
$btnVoiceTest.Top = 335
$btnVoiceTest.Width = 140
$btnVoiceTest.Height = 45
$form.Controls.Add($btnVoiceTest)

$btnListenTest = New-Object System.Windows.Forms.Button
$btnListenTest.Text = "Listen Test"
$btnListenTest.Left = 425
$btnListenTest.Top = 335
$btnListenTest.Width = 140
$btnListenTest.Height = 45
$form.Controls.Add($btnListenTest)

$btnProof = New-Object System.Windows.Forms.Button
$btnProof.Text = "Open Proofs"
$btnProof.Left = 580
$btnProof.Top = 335
$btnProof.Width = 145
$btnProof.Height = 45
$form.Controls.Add($btnProof)

$lbl = New-Object System.Windows.Forms.Label
$lbl.Left = 15
$lbl.Top = 400
$lbl.Width = 710
$lbl.Height = 70
$lbl.Text = "Voice-first rule: Agent Lee asks out loud, listens for spoken approval, then prints only if approval is heard. No typed PRINT."
$form.Controls.Add($lbl)

$btnVoiceTest.Add_Click({
    UiLog "Testing Agent Lee clone voice..."
    Speak-AgentLeeClone "Peace Leonard. Voice-first approvals are active. I will ask before printing, and you can approve by voice." | Out-Null
    UiLog "Voice test complete."
})

$btnListenTest.Add_Click({
    UiLog "Listening once. Say something now."
    $heard = Listen-AgentLeeOnce -Seconds 8 -Purpose "listen_test"

    if ($heard) {
        UiLog ("Heard: " + $heard.text)
    } else {
        UiLog "No speech recognized."
    }
})

$btnAskPrint.Add_Click({
    UiLog "Agent Lee will ask for voice approval before printing."

    $receipt = New-AgentLeePrintDocument `
        -Title "Agent Lee Voice-Approved Print Test" `
        -Body "This is a voice-first print test. Agent Lee asked Leonard out loud for permission. The print job should only submit if Leonard approved by voice. This replaces the typed PRINT gate."

    if ($receipt) {
        UiLog ("Print receipt: " + $receipt)
    } else {
        UiLog "Print was not submitted."
    }
})

$btnProof.Add_Click({
    Start-Process explorer.exe $ProofRoot
    UiLog ("Opened proof folder: " + $ProofRoot)
})

$form.Add_Shown({
    UiLog "Agent Lee voice-first approval patch started."
    UiLog "No typed PRINT is used."
    UiLog "Use Voice Test, Listen Test, then Ask Voice Approval + Print."
    Speak-AgentLeeClone "Leonard, I am ready for voice-first approval testing. I will not ask you to type print anymore." | Out-Null
})

Write-EventLine -Type "VOICE_FIRST_APPROVAL_PATCH_STARTED" -Message "Patch UI started." -Data @{
    proofRoot = $ProofRoot
    speechAvailable = $script:SpeechAvailable
}

[System.Windows.Forms.Application]::Run($form)
