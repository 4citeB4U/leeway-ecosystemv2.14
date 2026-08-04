[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot "AgentLeeRuntimeCommon.ps1")

$Root        = Get-LeewayWorkspaceRoot
$Stamp       = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportJson  = Join-Path $Root "Archive\reports\leeway-validator-integrity-audit-report.json"
$ReportMd    = Join-Path $Root "Archive\reports\leeway-validator-integrity-audit-report.md"
$ReceiptPath = Join-Path $Root "Archive\receipts\leeway-system-completion\leeway-validator-integrity-audit-$Stamp.json"

New-LeewayDirectory -Path (Split-Path $ReportJson) | Out-Null
New-LeewayDirectory -Path (Split-Path $ReceiptPath) | Out-Null

$governingStandards = @(
    "000-URGENT-LEEWAY-ASSISTANT-LAW/READ-FIRST.md",
    "LeeWay-Standards/standards/BOOK-54-ASSISTANT-EMBODIMENT-AND-BEHAVIOR-LAW.md",
    "LeeWay-Standards/standards/BOOK-55-ASSISTANT-RECORDING-AND-LEARNING-LAW.md",
    "LeeWay-Standards/standards/BOOK-80-ABSOLUTE-PROOF-AND-NO-FALSE-COMPLETION-LAW.md"
)

$ScriptDir   = Join-Path $Root "scripts"
$allScripts  = @()
Get-ChildItem $ScriptDir -Filter "Test-*.ps1" -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
    $allScripts += $_
}
Get-ChildItem $ScriptDir -Filter "Get-AgentLee*.ps1" -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
    $allScripts += $_
}

$validators  = [System.Collections.Generic.List[object]]::new()
$summary     = [ordered]@{
    VALIDATOR_TRUSTED       = 0
    VALIDATOR_WRAPPER_ONLY  = 0
    VALIDATOR_DEAD_PROOF_CODE = 0
    VALIDATOR_DUPLICATE_BODY  = 0
    VALIDATOR_BROKEN          = 0
    VALIDATOR_MISSING         = 0
}

foreach ($file in $allScripts) {
    $name   = $file.Name
    $path   = $file.FullName
    $lines  = @(Get-Content $path -ErrorAction SilentlyContinue)
    $lc     = $lines.Count
    $body   = $lines -join "`n"

    # Detection flags
    $isWrapperOnly   = ($lc -le 12 -and $body -match "Invoke-LeeWayMasterTotalEcosystemCompletion")
    $hasWrapperCall  = $body -match "Invoke-LeeWayMasterTotalEcosystemCompletion"
    $cmdCount        = ([regex]::Matches($body, '\[CmdletBinding\(\)\]')).Count
    $paramCount      = ([regex]::Matches($body, '(?m)^\s*param\s*\(')).Count

    # Find all exit line numbers
    $exitLineNums = @()
    for ($i = 0; $i -lt $lc; $i++) {
        if ($lines[$i] -match '^\s*exit\b') { $exitLineNums += ($i + 1) }
    }
    $firstExitLine = if ($exitLineNums.Count -gt 0) { $exitLineNums[0] } else { -1 }
    $lastExitLine  = if ($exitLineNums.Count -gt 0) { $exitLineNums[-1] } else { -1 }

    # Dead code: meaningful lines after last exit
    $hasDeadCode    = $false
    $deadCodeLines  = 0
    if ($lastExitLine -gt 0 -and $lastExitLine -lt $lc) {
        $afterExit = $lines[$lastExitLine..($lc-1)]
        $meaningful = @($afterExit | Where-Object { $_ -notmatch '^\s*$' -and $_ -notmatch '^\s*#' })
        $deadCodeLines = $meaningful.Count
        $hasDeadCode   = $deadCodeLines -gt 0
    }

    # Early exit: exit that is NOT the last non-blank line
    $hasEarlyExit = $false
    if ($exitLineNums.Count -gt 0 -and $firstExitLine -lt $lc) {
        $afterFirst = $lines[$firstExitLine..($lc-1)]
        $meaningfulAfter = @($afterFirst | Where-Object { $_ -notmatch '^\s*$' -and $_ -notmatch '^\s*#' })
        if ($meaningfulAfter.Count -gt 0) { $hasEarlyExit = $true }
    }

    $writesReport   = $body -match "ReportPath|report.*json|Write-LeewayJson.*[Rr]eport|Set-Content.*[Rr]eport"
    $writesReceipt  = $body -match "ReceiptPath|receipt|Write-LeewayJson.*[Rr]eceipt|Set-Content.*[Rr]eceipt"
    $writesRawProof = $body -match "ProofDir|RawPath|raw.*proof|proofs\\\\|Archive.proofs"
    $isDuplicate    = ($cmdCount -gt 1 -or $paramCount -gt 1)

    # Classify
    $status = if ($isWrapperOnly) {
        "VALIDATOR_WRAPPER_ONLY"
    } elseif ($hasDeadCode -and -not $isWrapperOnly) {
        "VALIDATOR_DEAD_PROOF_CODE"
    } elseif ($isDuplicate) {
        "VALIDATOR_DUPLICATE_BODY"
    } elseif (-not $writesReport -and $lc -gt 20) {
        "VALIDATOR_BROKEN"
    } else {
        "VALIDATOR_TRUSTED"
    }

    $summary[$status]++

    $validators.Add([ordered]@{
        name          = $name
        path          = $path
        lineCount     = $lc
        status        = $status
        isWrapperOnly = $isWrapperOnly
        hasWrapperCall= $hasWrapperCall
        cmdletBindingCount = $cmdCount
        paramBlockCount    = $paramCount
        firstExitLine      = $firstExitLine
        lastExitLine       = $lastExitLine
        hasEarlyExit       = $hasEarlyExit
        hasDeadCode        = $hasDeadCode
        deadCodeLineCount  = $deadCodeLines
        writesReport       = $writesReport
        writesReceipt      = $writesReceipt
        writesRawProof     = $writesRawProof
        isDuplicateBody    = $isDuplicate
    })
}

$wrapperNames   = @($validators | Where-Object { $_.status -eq "VALIDATOR_WRAPPER_ONLY" }  | ForEach-Object { $_.name })
$deadCodeNames  = @($validators | Where-Object { $_.status -eq "VALIDATOR_DEAD_PROOF_CODE" } | ForEach-Object { $_.name })
$brokenNames    = @($validators | Where-Object { $_.status -eq "VALIDATOR_BROKEN" }          | ForEach-Object { $_.name })
$trustedNames   = @($validators | Where-Object { $_.status -eq "VALIDATOR_TRUSTED" }         | ForEach-Object { $_.name })

$result = [ordered]@{
    reportId               = "leeway-validator-integrity-audit-$Stamp"
    generatedAt            = (Get-Date).ToUniversalTime().ToString("o")
    assistantBodyRole      = "CODEX_ASSISTANT_BODY"
    assistantObjectId      = "LEEWAY-ASSISTANT-0002"
    governingStandardsRead = $governingStandards
    totalScanned           = $validators.Count
    summary                = $summary
    wrapperOnlyList        = $wrapperNames
    deadCodeList           = $deadCodeNames
    brokenList             = $brokenNames
    trustedList            = $trustedNames
    validators             = $validators
    receiptsWritten        = @($ReceiptPath)
    reportsWritten         = @($ReportJson, $ReportMd)
}

Write-LeewayJson -Path $ReportJson  -Object $result | Out-Null
Write-LeewayJson -Path $ReceiptPath -Object $result | Out-Null

# Write markdown summary
$md = @"
# Leeway Validator Integrity Audit Report

**Generated:** $(Get-Date -Format "o")
**Total Scanned:** $($validators.Count)

## Summary

| Status | Count |
|---|---|
| VALIDATOR_TRUSTED | $($summary.VALIDATOR_TRUSTED) |
| VALIDATOR_WRAPPER_ONLY | $($summary.VALIDATOR_WRAPPER_ONLY) |
| VALIDATOR_DEAD_PROOF_CODE | $($summary.VALIDATOR_DEAD_PROOF_CODE) |
| VALIDATOR_DUPLICATE_BODY | $($summary.VALIDATOR_DUPLICATE_BODY) |
| VALIDATOR_BROKEN | $($summary.VALIDATOR_BROKEN) |

## Wrapper-Only Validators ($($wrapperNames.Count))
$($wrapperNames | ForEach-Object { "- $_" } | Out-String)

## Dead-Code Validators ($($deadCodeNames.Count))
$($deadCodeNames | ForEach-Object { "- $_" } | Out-String)

## Broken Validators ($($brokenNames.Count))
$($brokenNames | ForEach-Object { "- $_" } | Out-String)

## Trusted Validators ($($trustedNames.Count))
$($trustedNames | ForEach-Object { "- $_" } | Out-String)
"@
Set-Content -Path $ReportMd -Value $md -Encoding UTF8

Write-Host "=== VALIDATOR INTEGRITY AUDIT ==="
Write-Host "Total scanned   : $($validators.Count)"
Write-Host "TRUSTED         : $($summary.VALIDATOR_TRUSTED)"
Write-Host "WRAPPER_ONLY    : $($summary.VALIDATOR_WRAPPER_ONLY)"
Write-Host "DEAD_CODE       : $($summary.VALIDATOR_DEAD_PROOF_CODE)"
Write-Host "BROKEN          : $($summary.VALIDATOR_BROKEN)"
Write-Host "Report          : $ReportJson"
Write-Host "Receipt         : $ReceiptPath"

exit 0
