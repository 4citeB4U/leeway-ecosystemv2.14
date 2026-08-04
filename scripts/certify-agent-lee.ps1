# Agent Lee Independent Certification Master Runner
# Executes all certification scripts and generates consolidated report

$Root = "D:\Leeway-Ecosystem v2.1.4"

$ConsolidatedReport = @{
    Timestamp = (Get-Date).ToString("s")
    CertificationRun = "Agent Lee Independent Certification"
    Tests = @()
    Summary = @{
        Total = 4
        Passed = 0
        Partial = 0
        Failed = 0
    }
}

Write-Host ""
Write-Host "=============================================="
Write-Host "  AGENT LEE INDEPENDENT CERTIFICATION"
Write-Host "=============================================="
Write-Host ""
Write-Host "This certification suite provides independent"
Write-Host "verification of Agent Lee capabilities without"
Write-Host "relying on self-assessment."
Write-Host ""
Write-Host "Running 4 certification tests..."
Write-Host ""
Write-Host "=============================================="
Write-Host ""

# Test 1: Runtime Persistence
Write-Host "TEST 1/4: Runtime Persistence"
Write-Host "----------------------------------------------"
& "$Root\scripts\certify-runtime-persistence.ps1"

$Receipt1 = Get-Content "$Root\Archive\receipts\capability-proofs\runtime-persistence-audit.json" -Raw | ConvertFrom-Json
$ConsolidatedReport.Tests += @{
    Name = "Runtime Persistence"
    Status = $Receipt1.Status
    Timestamp = $Receipt1.Timestamp
}

switch ($Receipt1.Status) {
    "PASS" { $ConsolidatedReport.Summary.Passed++ }
    "PARTIAL" { $ConsolidatedReport.Summary.Partial++ }
    default { $ConsolidatedReport.Summary.Failed++ }
}

# Test 2: Voice Loop
Write-Host ""
Write-Host "TEST 2/4: Voice Loop"
Write-Host "----------------------------------------------"
& "$Root\scripts\certify-voice-loop.ps1"

$Receipt2 = Get-Content "$Root\Archive\receipts\capability-proofs\voice-loop-audit.json" -Raw | ConvertFrom-Json
$ConsolidatedReport.Tests += @{
    Name = "Voice Loop"
    Status = $Receipt2.Status
    Timestamp = $Receipt2.Timestamp
}

switch ($Receipt2.Status) {
    "PASS" { $ConsolidatedReport.Summary.Passed++ }
    "PARTIAL" { $ConsolidatedReport.Summary.Partial++ }
    default { $ConsolidatedReport.Summary.Failed++ }
}

# Test 3: Autonomous Loop
Write-Host ""
Write-Host "TEST 3/4: Autonomous Loop"
Write-Host "----------------------------------------------"
& "$Root\scripts\certify-autonomous-loop.ps1"

$Receipt3 = Get-Content "$Root\Archive\receipts\capability-proofs\autonomous-loop-audit.json" -Raw | ConvertFrom-Json
$ConsolidatedReport.Tests += @{
    Name = "Autonomous Loop"
    Status = $Receipt3.Status
    Timestamp = $Receipt3.Timestamp
}

switch ($Receipt3.Status) {
    "PASS" { $ConsolidatedReport.Summary.Passed++ }
    "PARTIAL" { $ConsolidatedReport.Summary.Partial++ }
    default { $ConsolidatedReport.Summary.Failed++ }
}

# Test 4: Learning Loop
Write-Host ""
Write-Host "TEST 4/4: Learning Loop"
Write-Host "----------------------------------------------"
& "$Root\scripts\certify-learning-loop.ps1"

$Receipt4 = Get-Content "$Root\Archive\receipts\capability-proofs\learning-loop-audit.json" -Raw | ConvertFrom-Json
$ConsolidatedReport.Tests += @{
    Name = "Learning Loop"
    Status = $Receipt4.Status
    Timestamp = $Receipt4.Timestamp
}

switch ($Receipt4.Status) {
    "PASS" { $ConsolidatedReport.Summary.Passed++ }
    "PARTIAL" { $ConsolidatedReport.Summary.Partial++ }
    default { $ConsolidatedReport.Summary.Failed++ }
}

# Generate consolidated report
Write-Host ""
Write-Host "=============================================="
Write-Host "  CERTIFICATION SUMMARY"
Write-Host "=============================================="
Write-Host ""

foreach ($Test in $ConsolidatedReport.Tests) {
    $StatusSymbol = switch ($Test.Status) {
        "PASS" { "[PASS]" }
        "PARTIAL" { "[PART]" }
        default { "[FAIL]" }
    }
    
    Write-Host "$StatusSymbol $($Test.Name): $($Test.Status)"
}

Write-Host ""
Write-Host "----------------------------------------------"
Write-Host "Total Tests:    $($ConsolidatedReport.Summary.Total)"
Write-Host "Passed:         $($ConsolidatedReport.Summary.Passed)"
Write-Host "Partial:        $($ConsolidatedReport.Summary.Partial)"
Write-Host "Failed:         $($ConsolidatedReport.Summary.Failed)"
Write-Host "----------------------------------------------"
Write-Host ""

# Determine overall status
$OverallStatus = if ($ConsolidatedReport.Summary.Passed -eq 4) {
    "FULLY OPERATIONAL"
} elseif ($ConsolidatedReport.Summary.Failed -eq 4) {
    "NOT OPERATIONAL"
} else {
    "PARTIALLY OPERATIONAL"
}

$ConsolidatedReport.OverallStatus = $OverallStatus

Write-Host "Overall Status: $OverallStatus"
Write-Host ""

# Write consolidated receipt
$ConsolidatedReceiptPath = Join-Path $Root "Archive\receipts\capability-proofs\consolidated-certification-report.json"
$ConsolidatedReport | ConvertTo-Json -Depth 10 | Set-Content $ConsolidatedReceiptPath -Encoding UTF8

Write-Host "Consolidated report written to:"
Write-Host $ConsolidatedReceiptPath
Write-Host ""
Write-Host "Individual receipts available at:"
Write-Host "  Archive\receipts\capability-proofs\"
Write-Host ""
Write-Host "=============================================="
Write-Host ""

# Return exit code based on results
if ($ConsolidatedReport.Summary.Failed -gt 0) {
    exit 1
} else {
    exit 0
}

# Made with Bob
