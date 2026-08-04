# Adversarial Certification Suite
# Runs all adversarial tests to prove operational capability

$Root = "D:\Leeway-Ecosystem v2.1.4"

$Report = @{
    Timestamp = (Get-Date).ToString("s")
    Suite = "Adversarial Certification"
    Tests = @()
    Summary = @{
        Total = 4
        Passed = 0
        Failed = 0
    }
    OverallStatus = "IN_PROGRESS"
}

Write-Host ""
Write-Host "=================================================="
Write-Host "  ADVERSARIAL CERTIFICATION SUITE"
Write-Host "=================================================="
Write-Host ""
Write-Host "This suite runs adversarial tests that prove"
Write-Host "actual operational capability, not just existence."
Write-Host ""
Write-Host "Tests:"
Write-Host "  1. Runtime Persistence (stop/start/kill/recover)"
Write-Host "  2. Voice Loop (generate/play/verify audio)"
Write-Host "  3. Autonomous Loop (real goal execution)"
Write-Host "  4. Learning Loop (repeated runs with improvement)"
Write-Host ""
Write-Host "=================================================="
Write-Host ""

# Test 1: Runtime Persistence
Write-Host ""
Write-Host "=================================================="
Write-Host "TEST 1/4: Runtime Persistence"
Write-Host "=================================================="
Write-Host ""

$Test1Start = Get-Date
& "$Root\scripts\adversarial-runtime-persistence.ps1"
$Test1ExitCode = $LASTEXITCODE
$Test1Duration = ((Get-Date) - $Test1Start).TotalSeconds

$Test1 = @{
    Name = "Runtime Persistence"
    Status = if ($Test1ExitCode -eq 0) { "PASS" } else { "FAIL" }
    ExitCode = $Test1ExitCode
    Duration = [math]::Round($Test1Duration, 2)
}

$Report.Tests += $Test1

if ($Test1ExitCode -eq 0) {
    $Report.Summary.Passed++
}
else {
    $Report.Summary.Failed++
}

# Test 2: Voice Loop
Write-Host ""
Write-Host "=================================================="
Write-Host "TEST 2/4: Voice Loop"
Write-Host "=================================================="
Write-Host ""

$Test2Start = Get-Date
& "$Root\scripts\adversarial-voice-loop.ps1"
$Test2ExitCode = $LASTEXITCODE
$Test2Duration = ((Get-Date) - $Test2Start).TotalSeconds

$Test2 = @{
    Name = "Voice Loop"
    Status = if ($Test2ExitCode -eq 0) { "PASS" } else { "FAIL" }
    ExitCode = $Test2ExitCode
    Duration = [math]::Round($Test2Duration, 2)
}

$Report.Tests += $Test2

if ($Test2ExitCode -eq 0) {
    $Report.Summary.Passed++
}
else {
    $Report.Summary.Failed++
}

# Test 3: Autonomous Loop
Write-Host ""
Write-Host "=================================================="
Write-Host "TEST 3/4: Autonomous Loop"
Write-Host "=================================================="
Write-Host ""

$Test3Start = Get-Date
& "$Root\scripts\adversarial-autonomous-loop.ps1"
$Test3ExitCode = $LASTEXITCODE
$Test3Duration = ((Get-Date) - $Test3Start).TotalSeconds

$Test3 = @{
    Name = "Autonomous Loop"
    Status = if ($Test3ExitCode -eq 0) { "PASS" } else { "FAIL" }
    ExitCode = $Test3ExitCode
    Duration = [math]::Round($Test3Duration, 2)
}

$Report.Tests += $Test3

if ($Test3ExitCode -eq 0) {
    $Report.Summary.Passed++
}
else {
    $Report.Summary.Failed++
}

# Test 4: Learning Loop
Write-Host ""
Write-Host "=================================================="
Write-Host "TEST 4/4: Learning Loop"
Write-Host "=================================================="
Write-Host ""

$Test4Start = Get-Date
& "$Root\scripts\adversarial-learning-loop.ps1"
$Test4ExitCode = $LASTEXITCODE
$Test4Duration = ((Get-Date) - $Test4Start).TotalSeconds

$Test4 = @{
    Name = "Learning Loop"
    Status = if ($Test4ExitCode -eq 0) { "PASS" } else { "FAIL" }
    ExitCode = $Test4ExitCode
    Duration = [math]::Round($Test4Duration, 2)
}

$Report.Tests += $Test4

if ($Test4ExitCode -eq 0) {
    $Report.Summary.Passed++
}
else {
    $Report.Summary.Failed++
}

# Final Summary
Write-Host ""
Write-Host "=================================================="
Write-Host "  ADVERSARIAL CERTIFICATION SUMMARY"
Write-Host "=================================================="
Write-Host ""

foreach ($Test in $Report.Tests) {
    $StatusSymbol = if ($Test.Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host "$StatusSymbol $($Test.Name)"
    Write-Host "         Duration: $($Test.Duration)s"
}

Write-Host ""
Write-Host "--------------------------------------------------"
Write-Host "Total Tests:    $($Report.Summary.Total)"
Write-Host "Passed:         $($Report.Summary.Passed)"
Write-Host "Failed:         $($Report.Summary.Failed)"
Write-Host "--------------------------------------------------"
Write-Host ""

# Determine overall status
if ($Report.Summary.Failed -eq 0) {
    $Report.OverallStatus = "FULLY OPERATIONAL"
    Write-Host "[PASS] Overall Status: FULLY OPERATIONAL"
    Write-Host ""
    Write-Host "All adversarial tests passed."
    Write-Host "Agent Lee operational capability verified."
}
else {
    $Report.OverallStatus = "PARTIALLY OPERATIONAL"
    Write-Host "[FAIL] Overall Status: PARTIALLY OPERATIONAL"
    Write-Host ""
    Write-Host "Some adversarial tests failed."
    Write-Host "Review individual test receipts for details."
}

# Write consolidated report
$ReportPath = Join-Path $Root "Archive\receipts\capability-proofs\adversarial-certification-report.json"
$Report | ConvertTo-Json -Depth 10 | Set-Content $ReportPath -Encoding UTF8

Write-Host ""
Write-Host "Consolidated Report: $ReportPath"
Write-Host ""
Write-Host "Individual Receipts:"
Write-Host "  Archive\receipts\capability-proofs\adversarial-runtime-persistence.json"
Write-Host "  Archive\receipts\capability-proofs\adversarial-voice-loop.json"
Write-Host "  Archive\receipts\capability-proofs\adversarial-autonomous-loop.json"
Write-Host "  Archive\receipts\capability-proofs\adversarial-learning-loop.json"
Write-Host ""
Write-Host "=================================================="
Write-Host ""

# Exit with failure count
exit $Report.Summary.Failed

# Made with Bob
