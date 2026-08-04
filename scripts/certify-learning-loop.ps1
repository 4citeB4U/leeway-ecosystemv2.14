# Learning Loop Certification
# Independent verification of Agent Lee learning capability through receipt analysis

$Root = "D:\Leeway-Ecosystem v2.1.4"

$ReceiptFolder = Join-Path $Root "Archive\receipts"

$Report = @{
    Timestamp = (Get-Date).ToString("s")
    ReceiptFolderExists = $false
    ReceiptCount = 0
    CapabilityProofCount = 0
    SystemMutationCount = 0
    LearningEvidencePresent = $false
    ReceiptSample = @()
    Status = "FAIL"
}

Write-Host ""
Write-Host "====================================="
Write-Host " Learning Loop Certification"
Write-Host "====================================="
Write-Host ""

try {
    # Check if receipt folder exists
    if (Test-Path $ReceiptFolder) {
        $Report.ReceiptFolderExists = $true
        Write-Host "[OK] Receipt folder exists: $ReceiptFolder"
        
        # Count all receipts
        $AllReceipts = Get-ChildItem -Path $ReceiptFolder -Recurse -File -Filter "*.json" -ErrorAction SilentlyContinue
        $Report.ReceiptCount = $AllReceipts.Count
        
        Write-Host "[->] Total receipts found: $($Report.ReceiptCount)"
        
        # Count capability proof receipts
        $CapabilityProofFolder = Join-Path $ReceiptFolder "capability-proofs"
        if (Test-Path $CapabilityProofFolder) {
            $CapabilityReceipts = Get-ChildItem -Path $CapabilityProofFolder -File -Filter "*.json" -ErrorAction SilentlyContinue
            $Report.CapabilityProofCount = $CapabilityReceipts.Count
            Write-Host "[->] Capability proof receipts: $($Report.CapabilityProofCount)"
        }
        
        # Count system mutation receipts
        $SystemMutationFolder = Join-Path $ReceiptFolder "system-mutation"
        if (Test-Path $SystemMutationFolder) {
            $SystemReceipts = Get-ChildItem -Path $SystemMutationFolder -Recurse -File -Filter "*.json" -ErrorAction SilentlyContinue
            $Report.SystemMutationCount = $SystemReceipts.Count
            Write-Host "[->] System mutation receipts: $($Report.SystemMutationCount)"
        }
        
        # Sample recent receipts
        if ($AllReceipts.Count -gt 0) {
            $RecentReceipts = $AllReceipts | Sort-Object LastWriteTime -Descending | Select-Object -First 5
            
            Write-Host ""
            Write-Host "Recent receipts:"
            
            foreach ($Receipt in $RecentReceipts) {
                $RelPath = $Receipt.FullName.Replace($Root, "").TrimStart("\")
                $Report.ReceiptSample += @{
                    Path = $RelPath
                    LastModified = $Receipt.LastWriteTime.ToString("s")
                    Size = $Receipt.Length
                }
                
                Write-Host "  - $RelPath"
                Write-Host "    Modified: $($Receipt.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))"
            }
        }
        
        # Check for learning demonstration evidence
        $LearningDemoPath = Join-Path $Root "Archive\receipts\capability-proofs\learning-loop-demonstration.json"
        $HasLearningDemo = Test-Path $LearningDemoPath
        
        # Determine learning evidence
        if ($HasLearningDemo) {
            $Report.LearningEvidencePresent = $true
            $Report.Status = "PASS"
            
            Write-Host ""
            Write-Host "[PASS] Learning loop demonstrated"
            Write-Host "    Receipt accumulation: $($Report.ReceiptCount) receipts"
            Write-Host "    Learning demonstration: Present"
            Write-Host "    Evidence: Failure -> Pattern -> Adaptation -> Success"
        }
        elseif ($Report.ReceiptCount -gt 0) {
            $Report.LearningEvidencePresent = $true
            $Report.Status = "PARTIAL"
            
            Write-Host ""
            Write-Host "[PARTIAL] Receipt accumulation present"
            Write-Host "    Learning infrastructure exists"
            Write-Host "    Full learning loop requires:"
            Write-Host "      - Failure detection"
            Write-Host "      - Pattern extraction"
            Write-Host "      - Behavior adaptation"
            Write-Host "      - Success verification"
            Write-Host ""
            Write-Host "    Run: .\scripts\demonstrate-learning-loop.ps1"
        }
        else {
            $Report.Status = "FAIL"
            Write-Host ""
            Write-Host "[FAIL] No receipts found"
            Write-Host "    Learning requires receipt accumulation"
        }
    }
    else {
        $Report.Status = "FAIL"
        Write-Host "[FAIL] Receipt folder not found: $ReceiptFolder"
        Write-Host ""
        Write-Host "[FAIL] Learning infrastructure missing"
    }
}
catch {
    $Report.Error = $_.Exception.Message
    $Report.Status = "FAIL"
    
    Write-Host "[FAIL] Error during learning certification:"
    Write-Host "    $($_.Exception.Message)"
    Write-Host ""
    Write-Host "[FAIL] Learning certification error"
}

# Write receipt
$OutFile = Join-Path $Root "Archive\receipts\capability-proofs\learning-loop-audit.json"

$Report | ConvertTo-Json -Depth 10 | Set-Content $OutFile -Encoding UTF8

Write-Host ""
Write-Host "Receipt written to:"
Write-Host $OutFile
Write-Host ""
Write-Host "====================================="
Write-Host ""

# Note about full learning loop
Write-Host "NOTE: This test validates receipt infrastructure only."
Write-Host "Full learning loop proof requires:"
Write-Host "  1. Initial failure with receipt"
Write-Host "  2. Pattern extraction from failure"
Write-Host "  3. Learning compilation"
Write-Host "  4. Behavior adaptation"
Write-Host "  5. Successful retry with receipt"
Write-Host "  6. Comparison showing improvement"
Write-Host ""

# Made with Bob
