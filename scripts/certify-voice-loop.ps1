# Voice Loop Certification
# Independent verification of Agent Lee speech synthesis capability

$Root = "D:\Leeway-Ecosystem v2.1.4"

$VoiceReport = @{
    Timestamp = (Get-Date).ToString("s")
    SpeechSynthesizerAvailable = $false
    AudioOutputGenerated = $false
    AudioFilePath = ""
    AudioFileSize = 0
    Status = "FAIL"
    Error = $null
}

Write-Host ""
Write-Host "====================================="
Write-Host " Voice Loop Certification"
Write-Host "====================================="
Write-Host ""

try {
    # Load System.Speech assembly
    Add-Type -AssemblyName System.Speech
    
    $VoiceReport.SpeechSynthesizerAvailable = $true
    Write-Host "[OK] System.Speech assembly loaded"
    
    # Create speech synthesizer
    $Voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
    
    # Generate test audio file
    $TempFile = Join-Path $env:TEMP "agentlee-voice-certification-test.wav"
    
    Write-Host "[->] Generating test audio file..."
    
    $Voice.SetOutputToWaveFile($TempFile)
    $Voice.Speak("Agent Lee voice certification test. This is an independent verification of speech synthesis capability.")
    $Voice.Dispose()
    
    # Verify file was created
    if (Test-Path $TempFile) {
        $FileInfo = Get-Item $TempFile
        $VoiceReport.AudioOutputGenerated = $true
        $VoiceReport.AudioFilePath = $TempFile
        $VoiceReport.AudioFileSize = $FileInfo.Length
        
        Write-Host "[OK] Audio file generated successfully"
        Write-Host "    Path: $TempFile"
        Write-Host "    Size: $($FileInfo.Length) bytes"
        
        if ($FileInfo.Length -gt 0) {
            $VoiceReport.Status = "PASS"
            Write-Host ""
            Write-Host "[PASS] Voice synthesis operational"
        }
        else {
            $VoiceReport.Status = "FAIL"
            Write-Host ""
            Write-Host "[FAIL] Audio file is empty"
        }
    }
    else {
        $VoiceReport.Status = "FAIL"
        Write-Host "[FAIL] Audio file was not created"
        Write-Host ""
        Write-Host "[FAIL] Voice synthesis failed"
    }
}
catch {
    $VoiceReport.Error = $_.Exception.Message
    $VoiceReport.Status = "FAIL"
    
    Write-Host "[FAIL] Error during voice certification:"
    Write-Host "    $($_.Exception.Message)"
    Write-Host ""
    Write-Host "[FAIL] Voice synthesis error"
}

# Write receipt
$OutFile = Join-Path $Root "Archive\receipts\capability-proofs\voice-loop-audit.json"

$VoiceReport | ConvertTo-Json -Depth 10 | Set-Content $OutFile -Encoding UTF8

Write-Host ""
Write-Host "Receipt written to:"
Write-Host $OutFile
Write-Host ""
Write-Host "====================================="
Write-Host ""

# Note about full voice loop
Write-Host "NOTE: This test validates speech synthesis only."
Write-Host "Full voice loop requires:"
Write-Host "  - Speech input (STT)"
Write-Host "  - Intent parsing"
Write-Host "  - Action execution"
Write-Host "  - Speech output (TTS) <- tested here"
Write-Host ""

# Made with Bob
