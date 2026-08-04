# leeway-smoke-tests.ps1
# Leeway Ecosystem v2.1.4 — Smoke Test Suite
#
# Tests all live service endpoints and one chat completion.
# Usage: .\leeway-smoke-tests.ps1

param([switch]$NoExitOnFail)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$ReportsRoot = Join-Path $WorkspaceRoot "Archive\reports"
$ReceiptsRoot = Join-Path $WorkspaceRoot "Archive\receipts"
New-Item -ItemType Directory -Force -Path $ReportsRoot | Out-Null

$StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Leeway Smoke Test Suite v2.1.4" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$tests = @()
$fails = 0

function Run-Test {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Body = $null,
        [int]$TimeoutSec = 10,
        [scriptblock]$Validate = $null
    )

    $started = Get-Date
    Write-Host " [$Method] $Name ... " -NoNewline

    try {
        $params = @{
            Uri           = $Url
            Method        = $Method
            TimeoutSec    = $TimeoutSec
            UseBasicParsing = $true
            ErrorAction   = "Stop"
        }
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Compress)
            $params.ContentType = "application/json"
        }
        $r = Invoke-WebRequest @params
        $elapsed = [int]((Get-Date) - $started).TotalMilliseconds

        $content = $r.Content
        $parsed = $null
        try { $parsed = $content | ConvertFrom-Json } catch {}

        $pass = $true
        $validationNote = ""
        if ($Validate) {
            try {
                $pass = & $Validate $parsed $r
                if (-not $pass) { $validationNote = " (validation failed)" }
            } catch {
                $pass = $false
                $validationNote = " ($($_.Exception.Message))"
            }
        }

        if ($pass) {
            Write-Host "PASS (${elapsed}ms, HTTP $($r.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "FAIL (validation)$validationNote" -ForegroundColor Red
            $script:fails++
        }

        $test = [ordered]@{
            name       = $Name
            method     = $Method
            url        = $Url
            status     = if ($pass) { "PASS" } else { "FAIL" }
            statusCode = $r.StatusCode
            elapsedMs  = $elapsed
            validation = $validationNote
        }
        $script:tests += $test
        return $pass
    } catch {
        $elapsed = [int]((Get-Date) - $started).TotalMilliseconds
        Write-Host "FAIL (${elapsed}ms, $($_.Exception.Message -replace '\r?\n',''))" -ForegroundColor Red
        $script:fails++
        $test = [ordered]@{
            name      = $Name
            method    = $Method
            url       = $Url
            status    = "FAIL"
            elapsedMs = $elapsed
            error     = $_.Exception.Message
        }
        $script:tests += $test
        return $false
    }
}

# ── Service Health Tests ──────────────────────────────────────────────────────
Write-Host "─ Service Health ─────────────────────────────────" -ForegroundColor White

Run-Test -Name "Runtime Fabric /health" -Url "http://127.0.0.1:4001/health" `
    -Validate { param($j) $j -and ($j.ok -eq $true -or $j.status -match 'ACTIVE|healthy') }

Run-Test -Name "Router /health" -Url "http://127.0.0.1:8081/health" `
    -Validate { param($j) $j -ne $null }

Run-Test -Name "Voice Kernel /health" -Url "http://127.0.0.1:8092/health" `
    -Validate { param($j) $j -and $j.status -match 'healthy' }

Run-Test -Name "Ollama /api/tags" -Url "http://127.0.0.1:11434/api/tags" `
    -Validate { param($j) $j -and $j.models -and $j.models.Count -gt 0 }

Run-Test -Name "Desktop Runtime /status" -Url "http://127.0.0.1:8091/status" -TimeoutSec 5 `
    -Validate { param($j) $j -and $j.ok -eq $true }

Run-Test -Name "VSCode Turbo Adapter /health" -Url "http://127.0.0.1:8787/health" -TimeoutSec 3

Write-Host ""
Write-Host "─ Functional Tests ───────────────────────────────" -ForegroundColor White

# Router routes list
Run-Test -Name "Router /routes" -Url "http://127.0.0.1:8081/routes" `
    -Validate { param($j) $j -ne $null }

# Ollama model list
Run-Test -Name "Ollama models present" -Url "http://127.0.0.1:11434/api/tags" `
    -Validate {
        param($j)
        $modelNames = $j.models | ForEach-Object { $_.name }
        ($modelNames | Where-Object { $_ -match 'qwen' }).Count -gt 0
    }

# Chat completion test (short, timeout 30s)
Write-Host ""
Write-Host "─ Chat Completion ────────────────────────────────" -ForegroundColor White
Run-Test -Name "Router /v1/chat/completions (1-token ping)" `
    -Method "POST" `
    -Url "http://127.0.0.1:8081/v1/chat/completions" `
    -TimeoutSec 30 `
    -Body @{
        model = "agent-lee"
        max_tokens = 5
        messages = @(@{ role = "user"; content = "Reply with just: OK" })
    } `
    -Validate { param($j) $j -and ($j.choices -or $j.content -or $j.message) }

Write-Host ""
Write-Host "──────────────────────────────────────────────────"

$total = $tests.Count
$passed = ($tests | Where-Object { $_.status -eq "PASS" }).Count
Write-Host ""
Write-Host " Results: $passed/$total PASS | $fails FAIL" -ForegroundColor $(if($fails -eq 0){"Green"}else{"Red"})
Write-Host ""

$EndedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$report = [ordered]@{
    schema      = "leeway.smoke-test-report.v1"
    generatedAt = $EndedAt
    startedAt   = $StartedAt
    summary     = [ordered]@{ total = $total; pass = $passed; fail = $fails }
    tests       = $tests
}
$reportPath = Join-Path $ReportsRoot "smoke-test-latest.json"
$report | ConvertTo-Json -Depth 20 | Set-Content -Path $reportPath -Encoding UTF8
Write-Host " Report: $reportPath" -ForegroundColor Gray

# Write receipt
. "$ScriptDir\leeway-receipt-helper.ps1" -ErrorAction SilentlyContinue
try {
    $rPath = Write-LeeWayReceipt `
        -Action "smoke-tests" `
        -Result @{ ok = ($fails -eq 0); passed = $passed; failed = $fails; total = $total } `
        -Metadata @{ agentId = "agent-lee"; controlSurface = "direct-powershell" } `
        -StartedAt $StartedAt
    if ($rPath) { Write-Host " Receipt: $rPath" -ForegroundColor Gray }
} catch {}

if (-not $NoExitOnFail -and $fails -gt 0) { exit 1 }
exit 0
