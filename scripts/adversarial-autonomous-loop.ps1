# Adversarial Autonomous Loop Test
# Tests: Real goal execution - Open Notepad, Type Text, Save File, Verify

$Root = "D:\Leeway-Ecosystem v2.1.4"

$Report = @{
    Timestamp = (Get-Date).ToString("s")
    Goal = "Open Notepad, type text, save file, verify contents"
    Tests = @()
    PassedTests = 0
    FailedTests = 0
    Status = "IN_PROGRESS"
}

Write-Host ""
Write-Host "=============================================="
Write-Host " ADVERSARIAL AUTONOMOUS LOOP TEST"
Write-Host "=============================================="
Write-Host ""
Write-Host "Goal: Open Notepad, type text, save file, verify"
Write-Host ""
Write-Host "This test will:"
Write-Host "  1. Launch Notepad application"
Write-Host "  2. Send keystrokes to type text"
Write-Host "  3. Save file with specific name"
Write-Host "  4. Verify file exists and contains correct text"
Write-Host ""

# Prepare test file path
$TestFileName = "agent-lee-autonomous-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
$TestFilePath = Join-Path $Root "Archive\adversarial-tests\$TestFileName"
$TestDir = Split-Path $TestFilePath
New-Item -ItemType Directory -Force -Path $TestDir | Out-Null

$TestText = "Agent Lee Autonomous Test - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Test 1: Launch Notepad
Write-Host "=============================================="
Write-Host "TEST 1: Launch Notepad"
Write-Host "=============================================="
Write-Host ""

$Test1 = @{
    Test = "Launch Notepad"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    ProcessId = $null
    Error = $null
}

try {
    Write-Host "[->] Launching Notepad..."
    $NotepadProcess = Start-Process notepad -PassThru
    Start-Sleep -Seconds 2
    
    if ($NotepadProcess -and !$NotepadProcess.HasExited) {
        $Test1.Success = $true
        $Test1.ProcessId = $NotepadProcess.Id
        Write-Host "[PASS] Notepad launched"
        Write-Host "      Process ID: $($NotepadProcess.Id)"
        $Report.PassedTests++
    }
    else {
        $Test1.Success = $false
        $Test1.Error = "Notepad process not found or exited"
        Write-Host "[FAIL] Notepad did not launch"
        $Report.FailedTests++
    }
}
catch {
    $Test1.Success = $false
    $Test1.Error = $_.Exception.Message
    Write-Host "[FAIL] Error launching Notepad: $($_.Exception.Message)"
    $Report.FailedTests++
}

$Report.Tests += $Test1
Write-Host ""

# Test 2: Type Text
Write-Host "=============================================="
Write-Host "TEST 2: Type Text in Notepad"
Write-Host "=============================================="
Write-Host ""

$Test2 = @{
    Test = "Type Text"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    TextSent = $false
    Error = $null
}

if ($Test1.Success) {
    try {
        Write-Host "[->] Sending text to Notepad..."
        Write-Host "    Text: $TestText"
        
        # Load Windows Forms for SendKeys
        Add-Type -AssemblyName System.Windows.Forms
        
        # Give Notepad focus
        Start-Sleep -Milliseconds 500
        
        # Send the text
        [System.Windows.Forms.SendKeys]::SendWait($TestText)
        $Test2.TextSent = $true
        
        Start-Sleep -Milliseconds 500
        
        $Test2.Success = $true
        Write-Host "[PASS] Text sent to Notepad"
        $Report.PassedTests++
    }
    catch {
        $Test2.Success = $false
        $Test2.Error = $_.Exception.Message
        Write-Host "[FAIL] Error sending text: $($_.Exception.Message)"
        $Report.FailedTests++
    }
}
else {
    $Test2.Success = $false
    $Test2.Error = "Skipped - Notepad launch failed"
    Write-Host "[SKIP] Notepad launch failed, skipping text input"
    $Report.FailedTests++
}

$Report.Tests += $Test2
Write-Host ""

# Test 3: Save File
Write-Host "=============================================="
Write-Host "TEST 3: Save File"
Write-Host "=============================================="
Write-Host ""

$Test3 = @{
    Test = "Save File"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    FilePath = $TestFilePath
    Error = $null
}

if ($Test1.Success -and $Test2.Success) {
    try {
        Write-Host "[->] Saving file..."
        Write-Host "    Path: $TestFilePath"
        
        # Send Ctrl+S to open Save dialog
        [System.Windows.Forms.SendKeys]::SendWait("^s")
        Start-Sleep -Milliseconds 1000
        
        # Type the file path
        [System.Windows.Forms.SendKeys]::SendWait($TestFilePath)
        Start-Sleep -Milliseconds 500
        
        # Press Enter to save
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
        Start-Sleep -Milliseconds 1000
        
        # Close Notepad
        [System.Windows.Forms.SendKeys]::SendWait("%{F4}")
        Start-Sleep -Milliseconds 500
        
        $Test3.Success = $true
        Write-Host "[PASS] Save command sent"
        $Report.PassedTests++
    }
    catch {
        $Test3.Success = $false
        $Test3.Error = $_.Exception.Message
        Write-Host "[FAIL] Error saving file: $($_.Exception.Message)"
        $Report.FailedTests++
    }
}
else {
    $Test3.Success = $false
    $Test3.Error = "Skipped - previous tests failed"
    Write-Host "[SKIP] Previous tests failed, skipping save"
    $Report.FailedTests++
}

$Report.Tests += $Test3
Write-Host ""

# Clean up Notepad process if still running
if ($Test1.ProcessId) {
    $Process = Get-Process -Id $Test1.ProcessId -ErrorAction SilentlyContinue
    if ($Process) {
        Write-Host "[->] Cleaning up Notepad process..."
        Stop-Process -Id $Test1.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Test 4: Verify File and Contents
Write-Host "=============================================="
Write-Host "TEST 4: Verify File and Contents"
Write-Host "=============================================="
Write-Host ""

$Test4 = @{
    Test = "Verify File"
    Timestamp = (Get-Date).ToString("s")
    Success = $false
    FileExists = $false
    ContentsMatch = $false
    Error = $null
}

try {
    Write-Host "[->] Checking if file exists..."
    
    if (Test-Path $TestFilePath) {
        $Test4.FileExists = $true
        Write-Host "[OK] File exists"
        
        Write-Host "[->] Verifying file contents..."
        $FileContents = Get-Content $TestFilePath -Raw
        
        if ($FileContents -match [regex]::Escape($TestText)) {
            $Test4.ContentsMatch = $true
            $Test4.Success = $true
            Write-Host "[PASS] File contents verified"
            Write-Host "      Expected: $TestText"
            Write-Host "      Found: $($FileContents.Trim())"
            $Report.PassedTests++
        }
        else {
            $Test4.Success = $false
            $Test4.Error = "File contents do not match expected text"
            Write-Host "[FAIL] File contents do not match"
            Write-Host "      Expected: $TestText"
            Write-Host "      Found: $($FileContents.Trim())"
            $Report.FailedTests++
        }
    }
    else {
        $Test4.Success = $false
        $Test4.Error = "File was not created"
        Write-Host "[FAIL] File was not created"
        Write-Host "      Expected path: $TestFilePath"
        $Report.FailedTests++
    }
}
catch {
    $Test4.Success = $false
    $Test4.Error = $_.Exception.Message
    Write-Host "[FAIL] Error verifying file: $($_.Exception.Message)"
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
    Write-Host "[PASS] All autonomous loop tests passed"
    Write-Host ""
    Write-Host "Autonomous execution proven:"
    Write-Host "  - Application launched"
    Write-Host "  - User input simulated"
    Write-Host "  - File saved"
    Write-Host "  - Result verified"
}
else {
    $Report.Status = "FAIL"
    Write-Host "[FAIL] Some autonomous loop tests failed"
}

# Write receipt
$ReceiptPath = Join-Path $Root "Archive\receipts\capability-proofs\adversarial-autonomous-loop.json"
$Report | ConvertTo-Json -Depth 10 | Set-Content $ReceiptPath -Encoding UTF8

Write-Host ""
Write-Host "Receipt: $ReceiptPath"
if ($Test4.FileExists) {
    Write-Host "Artifact: $TestFilePath"
}
Write-Host ""
Write-Host "=============================================="
Write-Host ""

exit $Report.FailedTests

# Made with Bob
