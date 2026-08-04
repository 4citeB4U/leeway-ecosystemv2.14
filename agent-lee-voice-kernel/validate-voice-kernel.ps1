# Agent Lee Voice Kernel - Validation Script
# Validates Voice Kernel deployment and functionality.

param(
    [switch]$NoExitOnFail,
    [switch]$VerboseRaw
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$receiptPath = "Archive/receipts/voice-kernel/voice-kernel-validation-$timestamp.json"

$validationResults = [ordered]@{
    schema = "leeway.voice-kernel.validation.v1"
    validatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    validator = "validate-voice-kernel.ps1"
    cases = @()
    summary = [ordered]@{
        total = 0
        passed = 0
        failed = 0
        warnings = 0
    }
}

function Add-Case {
    param(
        [string]$Name,
        [string]$Category,
        [scriptblock]$Test
    )

    $result = [ordered]@{
        name = $Name
        category = $Category
        status = "UNKNOWN"
        message = ""
        details = @{}
        testedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }

    try {
        $testResult = & $Test
        if ($testResult.passed) {
            $result.status = "PASS"
            $validationResults.summary.passed++
        } else {
            $result.status = "FAIL"
            $validationResults.summary.failed++
        }
        $result.message = $testResult.message
        $result.details = $testResult.details
    } catch {
        $result.status = "ERROR"
        $result.message = $_.Exception.Message
        $result.details = @{}
        $validationResults.summary.failed++
    }

    $validationResults.cases += $result
    $validationResults.summary.total++
    return $result
}

Write-Host "Agent Lee Voice Kernel - Validation" -ForegroundColor Cyan
Write-Host ""

Add-Case -Name "Voice kernel config JSON parses" -Category "config" -Test {
    $config = Get-Content "agent-lee-voice-kernel/config.json" -Raw | ConvertFrom-Json
    $policy = Get-Content "agent-lee-voice-kernel/voice_enhancement_policy.json" -Raw | ConvertFrom-Json
    @{
        passed = $true
        message = "Configuration JSON parsed successfully"
        details = @{
            engine = $config.voice_kernel.engine
            policySchema = $policy.schema
        }
    }
}

Add-Case -Name "Core voice kernel files exist" -Category "files" -Test {
    $required = @(
        "agent-lee-voice-kernel/Dockerfile",
        "agent-lee-voice-kernel/config.json",
        "agent-lee-voice-kernel/xtts-server.py",
        "agent-lee-voice-kernel/voice_loader.py",
        "agent-lee-voice-kernel/boot-speech.py",
        "agent-lee-voice-kernel/voice_enhancement_policy.json",
        "agent-lee-voice-kernel/voice_audio_quality.py",
        "agent-lee-voice-kernel/voice_event_timeline.py",
        "agent-lee-voice-kernel/voice_response_validator.py",
        "agent-lee-voice-kernel/voice_receipts.py",
        "agent-lee-voice-kernel/voice_enhancement_engine.py",
        "agent-lee-voice-kernel/voice_update_package.json",
        "agent-lee-voice-kernel/voice_update_loader.py",
        "agent-lee-voice-kernel/validate-voice-kernel.ps1"
    )

    $missing = @($required | Where-Object { -not (Test-Path $_) })
    if ($missing.Count -eq 0) {
        return @{
            passed = $true
            message = "All required files exist"
            details = @{ files = $required }
        }
    }
    return @{
        passed = $false
        message = "Missing files: $($missing -join ', ')"
        details = @{ missing = $missing }
    }
}

Add-Case -Name "Enhancement modules parse" -Category "syntax" -Test {
    $modules = @(
        "agent-lee-voice-kernel/xtts-server.py",
        "agent-lee-voice-kernel/voice_loader.py",
        "agent-lee-voice-kernel/boot-speech.py",
        "agent-lee-voice-kernel/voice_audio_quality.py",
        "agent-lee-voice-kernel/voice_event_timeline.py",
        "agent-lee-voice-kernel/voice_response_validator.py",
        "agent-lee-voice-kernel/voice_receipts.py",
        "agent-lee-voice-kernel/voice_enhancement_engine.py"
    )
    foreach ($module in $modules) {
        [System.Management.Automation.PSParser]::Tokenize((Get-Content $module -Raw), [ref]$null) | Out-Null
    }
    return @{
        passed = $true
        message = "Enhancement modules parsed"
        details = @{ modules = $modules }
    }
}

Add-Case -Name "XTTS single-engine rule is present" -Category "architecture" -Test {
    $files = @(
        "agent-lee-voice-kernel/config.json",
        "agent-lee-voice-kernel/Dockerfile",
        "agent-lee-voice-kernel/xtts-server.py",
        "agent-lee-voice-kernel/voice_loader.py",
        "agent-lee-voice-kernel/boot-speech.py",
        "agent-lee-voice-kernel/voice_enhancement_engine.py",
        "agent-lee-voice-kernel/voice_response_validator.py"
    )
    $forbidden = @("RVC", "Piper", "F5-TTS", "Sopro", "Edge-TTS")
    $violations = @()
    foreach ($file in $files) {
        $content = Get-Content $file -Raw
        foreach ($term in $forbidden) {
            if ($content -match $term) {
                $violations += "$file::$term"
            }
        }
    }
    if ($violations.Count -eq 0) {
        return @{
            passed = $true
            message = "Single-engine XTTS enforcement remains in place"
            details = @{ forbiddenTermsChecked = $forbidden }
        }
    }
    return @{
        passed = $false
        message = "Forbidden engine references found: $($violations -join ', ')"
        details = @{ violations = $violations }
    }
}

Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host ("-" * 60)
Write-Host ("Total:   {0}" -f $validationResults.summary.total)
Write-Host ("Passed:  {0}" -f $validationResults.summary.passed)
Write-Host ("Failed:  {0}" -f $validationResults.summary.failed)

$receiptDir = Split-Path $receiptPath -Parent
if (-not (Test-Path $receiptDir)) {
    New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null
}

$validationResults | ConvertTo-Json -Depth 10 | Set-Content $receiptPath -Encoding UTF8
Write-Host "Receipt written to: $receiptPath" -ForegroundColor Cyan

if ($validationResults.summary.failed -gt 0 -and -not $NoExitOnFail) {
    exit 1
}

exit 0
