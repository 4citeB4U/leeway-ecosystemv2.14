# Adversarial Voice Loop Test
# Tests: Generate speech, verify audio file, play audio, verify playback

$Root = "D:\Leeway-Ecosystem v2.1.4"

$Report = @{
    Timestamp = (Get-Date).ToString("s")
    Tests = @()
    PassedTests = 0
    FailedTests = 0
    Status = "IN_PROGRESS"
}

Write-Host ""
Write-Host "=============================================="
Write-Host " ADVERSARIAL VOICE LOOP TEST"
Write-Host "=============================================="
Write-Host ""
Write-Host "This test will:"
Write-Host "  1. Generate speech audio file"
Write-Host "  2. Verify audio file properties"
Write-Host "  3. Play audio file"
Write-Host "  4. Verify playback completion"
Write-Host ""

# Test 1: Generate Speech Audio
Write-Host "=============================================="
Write-Host "TEST 1: Generate Speech Audio"
Write-Host "=============================================="
Write-Host ""

$Test1 = @{
    Test = "Generate Speech Audio"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    AudioPath = $null
    AudioSize = 0
    Error = $null
}

try {
    Add-Type -AssemblyName System.Speech
    
    $Voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $AudioPath = Join-Path $Root "Archive\adversarial-tests\voice-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').wav"
    
    # Ensure directory exists
    $AudioDir = Split-Path $AudioPath
    New-Item -ItemType Directory -Force -Path $AudioDir | Out-Null
    
    Write-Host "[->] Generating speech audio..."
    Write-Host "    Path: $AudioPath"
    
    $Voice.SetOutputToWaveFile($AudioPath)
    $Voice.Speak("Agent Lee adversarial voice loop test. This is a complete end-to-end voice synthesis and playback verification.")
    $Voice.Dispose()
    
    if (Test-Path $AudioPath) {
        $FileInfo = Get-Item $AudioPath
        $Test1.AudioPath = $AudioPath
        $Test1.AudioSize = $FileInfo.Length
        
        if ($FileInfo.Length -gt 0) {
            $Test1.Success = $true
            Write-Host "[PASS] Audio file generated"
            Write-Host "      Size: $($FileInfo.Length) bytes"
            $Report.PassedTests++
        }
        else {
            $Test1.Success = $false
            $Test1.Error = "Audio file is empty"
            Write-Host "[FAIL] Audio file is empty"
            $Report.FailedTests++
        }
    }
    else {
        $Test1.Success = $false
        $Test1.Error = "Audio file was not created"
        Write-Host "[FAIL] Audio file was not created"
        $Report.FailedTests++
    }
}
catch {
    $Test1.Success = $false
    $Test1.Error = $_.Exception.Message
    Write-Host "[FAIL] Error generating audio: $($_.Exception.Message)"
    $Report.FailedTests++
}

$Report.Tests += $Test1
Write-Host ""

# Test 2: Verify Audio File Properties
Write-Host "=============================================="
Write-Host "TEST 2: Verify Audio File Properties"
Write-Host "=============================================="
Write-Host ""

$Test2 = @{
    Test = "Verify Audio Properties"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    Properties = @{}
    Error = $null
}

if ($Test1.Success -and $Test1.AudioPath) {
    try {
        $FileInfo = Get-Item $Test1.AudioPath
        
        Write-Host "[->] Checking audio file properties..."
        Write-Host "    File: $($FileInfo.Name)"
        Write-Host "    Size: $($FileInfo.Length) bytes"
        Write-Host "    Extension: $($FileInfo.Extension)"
        Write-Host "    Created: $($FileInfo.CreationTime)"
        
        $Test2.Properties = @{
            Name = $FileInfo.Name
            Size = $FileInfo.Length
            Extension = $FileInfo.Extension
            Created = $FileInfo.CreationTime.ToString("s")
        }
        
        # Verify it's a WAV file and has reasonable size
        if ($FileInfo.Extension -eq ".wav" -and $FileInfo.Length -gt 1000) {
            $Test2.Success = $true
            Write-Host "[PASS] Audio file properties valid"
            $Report.PassedTests++
        }
        else {
            $Test2.Success = $false
            $Test2.Error = "Invalid audio file properties"
            Write-Host "[FAIL] Invalid audio file properties"
            $Report.FailedTests++
        }
    }
    catch {
        $Test2.Success = $false
        $Test2.Error = $_.Exception.Message
        Write-Host "[FAIL] Error verifying properties: $($_.Exception.Message)"
        $Report.FailedTests++
    }
}
else {
    $Test2.Success = $false
    $Test2.Error = "Skipped - audio generation failed"
    Write-Host "[SKIP] Audio generation failed, skipping property verification"
    $Report.FailedTests++
}

$Report.Tests += $Test2
Write-Host ""

# Test 3: Play Audio File
Write-Host "=============================================="
Write-Host "TEST 3: Play Audio File"
Write-Host "=============================================="
Write-Host ""

$Test3 = @{
    Test = "Play Audio"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    PlaybackStarted = $false
    Error = $null
}

if ($Test1.Success -and $Test1.AudioPath) {
    try {
        Write-Host "[->] Playing audio file..."
        
        # Use SoundPlayer for simpler, more reliable playback
        Add-Type -AssemblyName System.Windows.Forms
        $Player = New-Object System.Media.SoundPlayer
        $Player.SoundLocation = $Test1.AudioPath
        
        $Test3.PlaybackStarted = $true
        Write-Host "[OK] Playback started"
        
        # Play synchronously (blocks until complete)
        Write-Host "[->] Playing audio (synchronous)..."
        $Player.PlaySync()
        
        $Test3.Success = $true
        Write-Host "[PASS] Playback completed"
        $Report.PassedTests++
        
        $Player.Dispose()
    }
    catch {
        $Test3.Success = $false
        $Test3.Error = $_.Exception.Message
        Write-Host "[FAIL] Error during playback: $($_.Exception.Message)"
        $Report.FailedTests++
    }
}
else {
    $Test3.Success = $false
    $Test3.Error = "Skipped - audio generation failed"
    Write-Host "[SKIP] Audio generation failed, skipping playback"
    $Report.FailedTests++
}

$Report.Tests += $Test3
Write-Host ""

# Test 4: Verify Playback Artifact
Write-Host "=============================================="
Write-Host "TEST 4: Verify Playback Artifact"
Write-Host "=============================================="
Write-Host ""

$Test4 = @{
    Test = "Verify Playback Artifact"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    ArtifactExists = $false
}

if ($Test1.Success -and $Test1.AudioPath) {
    try {
        # Verify audio file still exists after playback
        if (Test-Path $Test1.AudioPath) {
            $Test4.ArtifactExists = $true
            $Test4.Success = $true
            Write-Host "[PASS] Audio artifact verified"
            Write-Host "      Path: $($Test1.AudioPath)"
            $Report.PassedTests++
        }
        else {
            $Test4.Success = $false
            Write-Host "[FAIL] Audio artifact missing after playback"
            $Report.FailedTests++
        }
    }
    catch {
        $Test4.Success = $false
        $Test4.Error = $_.Exception.Message
        Write-Host "[FAIL] Error verifying artifact: $($_.Exception.Message)"
        $Report.FailedTests++
    }
}
else {
    $Test4.Success = $false
    $Test4.Error = "Skipped - audio generation failed"
    Write-Host "[SKIP] Audio generation failed, skipping artifact verification"
    $Report.FailedTests++
}

$Report.Tests += $Test4
Write-Host ""

# Final Summary
Write-Host "=============================================="
Write-Host " TEST SUMMARY"
Write-Host "=============================================="
Write-Host ""
Write-Host "Total Tests:  4"
Write-Host "Passed:       $($Report.PassedTests)"
Write-Host "Failed:       $($Report.FailedTests)"
Write-Host ""

if ($Report.FailedTests -eq 0) {
    $Report.Status = "PASS"
    Write-Host "[PASS] All voice loop tests passed"
}
else {
    $Report.Status = "FAIL"
    Write-Host "[FAIL] Some voice loop tests failed"
}

# Write receipt
$ReceiptPath = Join-Path $Root "Archive\receipts\capability-proofs\adversarial-voice-loop.json"
$Report | ConvertTo-Json -Depth 10 | Set-Content $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Receipt: $ReceiptPath"
Write-Host ""
Write-Host "=============================================="
Write-Host ""

# Note about full voice loop
Write-Host "NOTE: Full voice loop requires:"
Write-Host "  - Speech input (microphone/STT)"
Write-Host "  - Intent parsing"
Write-Host "  - Command execution"
Write-Host "  - Speech output (TTS) <- tested here"
Write-Host ""

exit $Report.FailedTests

# Made with Bob
