# Invoke-LeeWayProductionReadinessGate.ps1
# Leeway Ecosystem v2.1.4 - Production Readiness Gate
#
# Probes all services, checks Windows service, evaluates receipts, computes score.
# Exit 0 = all critical checks pass. Exit 1 = failures.

param(
    [switch]$NoExitOnFail,
    [switch]$VerboseRaw
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$ReportsRoot = Join-Path $WorkspaceRoot "Archive\reports"
$ReceiptsRoot = Join-Path $WorkspaceRoot "Archive\receipts"

New-Item -ItemType Directory -Force -Path $ReportsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ReceiptsRoot | Out-Null

$StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$Timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Leeway Production Readiness Gate v2.1.4" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Started: $StartedAt"
Write-Host ""

function Test-Http {
    param([string]$Url, [int]$TimeoutSec = 6, [string]$Label = "")
    $l = if ($Label) { $Label } else { $Url }
    Write-Host " Probing: $l ... " -NoNewline
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        Write-Host "PASS ($($r.StatusCode))" -ForegroundColor Green
        return [ordered]@{ ok = $true; statusCode = $r.StatusCode; url = $Url }
    } catch {
        Write-Host "FAIL ($($_.Exception.Message -replace '\r?\n',''))" -ForegroundColor Red
        return [ordered]@{ ok = $false; error = $_.Exception.Message; url = $Url }
    }
}

$checks = [ordered]@{}

# --- Critical Service Probes ---
Write-Host "--- Critical Services ---" -ForegroundColor White
$checks['runtimeFabric']  = Test-Http "http://127.0.0.1:4001/health"  -Label "Runtime Fabric (4001)"
$checks['router']         = Test-Http "http://127.0.0.1:8080/health"  -Label "Router (8080)"
$checks['ollama']         = Test-Http "http://127.0.0.1:11434/api/tags" -Label "Ollama (11434)"
$checks['voiceKernel']   = Test-Http "http://127.0.0.1:8092/health"  -Label "Voice Kernel (8092)"
$checks['desktopRuntime'] = Test-Http "http://127.0.0.1:8091/runtime/status" -Label "Desktop Runtime (8091)" -TimeoutSec 5
$checks['vscodeTurbo']   = Test-Http "http://127.0.0.1:8787/health"  -Label "VSCode Turbo Adapter (8787)" -TimeoutSec 3
$checks['cerebral']      = Test-Http "http://127.0.0.1:8765/health"  -Label "Cerebral Daemon (8765)"     -TimeoutSec 3
$checks['seafile']       = Test-Http "http://127.0.0.1:8082/"        -Label "Seafile (8082)"              -TimeoutSec 12

Write-Host ""
Write-Host "--- Infrastructure Checks ---" -ForegroundColor White

# Windows Service check - CRITICAL BLOCKER if not Running
Write-Host " Checking AgentLee Windows Service... " -NoNewline
try {
    $svc = Get-Service -Name "AgentLee" -ErrorAction Stop
    $svcStatus = $svc.Status.ToString()
    $svcStart  = $svc.StartType.ToString()
    if ($svc.Status -eq "Running") {
        Write-Host "PASS (Running, StartType: $svcStart)" -ForegroundColor Green
        $checks['agentLeeService'] = [ordered]@{ ok = $true; criticalBlocker = $false; status = $svcStatus; startType = $svcStart }
    } else {
        Write-Host "CRITICAL-BLOCK (Exists but $svcStatus - PRODUCTION BLOCKED)" -ForegroundColor Red
        $checks['agentLeeService'] = [ordered]@{ ok = $false; criticalBlocker = $true; status = $svcStatus; startType = $svcStart }
    }
} catch {
    Write-Host "CRITICAL-BLOCK (Service not found - PRODUCTION BLOCKED)" -ForegroundColor Red
    $checks['agentLeeService'] = [ordered]@{ ok = $false; criticalBlocker = $true; error = "Service not found" }
}

# Docker check
Write-Host " Checking Docker containers... " -NoNewline
try {
    $dockerOut = & docker ps --format "{{.Names}}" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $containers = $dockerOut | Where-Object { $_ -match 'leeway|agent-lee|voice' }
        Write-Host "PASS ($($containers.Count) Leeway containers)" -ForegroundColor Green
        $checks['docker'] = [ordered]@{ ok = $true; leewayContainers = @($containers) }
    } else {
        Write-Host "FAIL (docker ps failed)" -ForegroundColor Red
        $checks['docker'] = [ordered]@{ ok = $false; error = $dockerOut }
    }
} catch {
    Write-Host "FAIL ($($_.Exception.Message))" -ForegroundColor Red
    $checks['docker'] = [ordered]@{ ok = $false; error = $_.Exception.Message }
}

# Receipts check
Write-Host " Checking Archive/receipts/... " -NoNewline
$receiptFiles = Get-ChildItem $ReceiptsRoot -Filter "*.json" -ErrorAction SilentlyContinue
$receiptCount = ($receiptFiles | Measure-Object).Count
if ($receiptCount -gt 0) {
    Write-Host "PASS ($receiptCount receipts)" -ForegroundColor Green
    $checks['receipts'] = [ordered]@{ ok = $true; count = $receiptCount }
} else {
    Write-Host "WARN (0 receipts)" -ForegroundColor Yellow
    $checks['receipts'] = [ordered]@{ ok = $false; warning = $true; count = 0 }
}

# .env.local check
Write-Host " Checking .env.local... " -NoNewline
$envLocal = Join-Path $WorkspaceRoot ".env.local"
if (Test-Path $envLocal) {
    Write-Host "PASS (exists)" -ForegroundColor Green
    $checks['envLocal'] = [ordered]@{ ok = $true; path = $envLocal }
} else {
    Write-Host "WARN (not found - copy .env.example to .env.local)" -ForegroundColor Yellow
    $checks['envLocal'] = [ordered]@{ ok = $false; warning = $true }
}

# leeway-version.json check
Write-Host " Checking leeway-version.json... " -NoNewline
$versionFile = Join-Path $WorkspaceRoot "leeway-version.json"
if (Test-Path $versionFile) {
    Write-Host "PASS (exists)" -ForegroundColor Green
    $checks['versionJson'] = [ordered]@{ ok = $true }
} else {
    Write-Host "WARN (not found)" -ForegroundColor Yellow
    $checks['versionJson'] = [ordered]@{ ok = $false; warning = $true }
}

# Governance manifest check
Write-Host " Checking governance manifest... " -NoNewline
$govManifest = Join-Path $WorkspaceRoot "LeeWay-Standards\runtime-governance-manifest.json"
if (Test-Path $govManifest) {
    Write-Host "PASS (exists)" -ForegroundColor Green
    $checks['governanceManifest'] = [ordered]@{ ok = $true }
} else {
    Write-Host "FAIL (not found)" -ForegroundColor Red
    $checks['governanceManifest'] = [ordered]@{ ok = $false }
}

# Standards root drift firewall
Write-Host " Checking standards root drift firewall... " -NoNewline
$driftScript = Join-Path $ScriptDir "Test-LeeWayDriftFirewall.ps1"
if (Test-Path $driftScript) {
    try {
        $driftResult = & $driftScript -NoExitOnFail -VerboseRaw:$VerboseRaw
        $driftOk = $null -ne $driftResult -and $driftResult.productionAllowed -eq $true
        $checks['standardsRootFirewall'] = [ordered]@{
            ok = $driftOk
            verdict = if ($driftResult) { $driftResult.verdict } else { "UNAVAILABLE" }
            reportPath = Join-Path $ReportsRoot "leeway-standards-root-drift-firewall.json"
        }
        Write-Host $(if ($driftOk) { "PASS" } else { "FAIL" }) -ForegroundColor $(if ($driftOk) { "Green" } else { "Red" })
    } catch {
        $checks['standardsRootFirewall'] = [ordered]@{
            ok = $false
            error = $_.Exception.Message
            reportPath = Join-Path $ReportsRoot "leeway-standards-root-drift-firewall.json"
        }
        Write-Host "FAIL ($($_.Exception.Message -replace '\r?\n',''))" -ForegroundColor Red
    }
} else {
    $checks['standardsRootFirewall'] = [ordered]@{
        ok = $false
        error = "Script not found"
        reportPath = Join-Path $ReportsRoot "leeway-standards-root-drift-firewall.json"
    }
    Write-Host "FAIL (script missing)" -ForegroundColor Red
}

# --- Agent Capability Checks ---
Write-Host ""
Write-Host "--- Agent Capability Checks ---" -ForegroundColor White

$capabilityResults = $null
try {
    $capScript = Join-Path $ScriptDir "test-agent-capabilities.ps1"
    if (Test-Path $capScript) {
        $capabilityResults = & $capScript -RouterUrl "http://127.0.0.1:8080" -DesktopUrl "http://127.0.0.1:8091" -ErrorAction SilentlyContinue
        $capabilitiesOk   = @('spokenResponse','voicePlayback','mouseKeyboardRouting','consentBlock','threeTurnContinuity','safeDesktopTask')
        $capPassCount     = ($capabilitiesOk | Where-Object { $capabilityResults.$_.ok } | Measure-Object).Count
        $checks['agentCapabilities'] = [ordered]@{ ok = ($capPassCount -ge 5); passCount = $capPassCount; total = 6; results = $capabilityResults }
        if ($capPassCount -ge 5) {
            Write-Host "  Agent Capabilities: PASS ($capPassCount/6 checks passed)" -ForegroundColor Green
        } else {
            Write-Host "  Agent Capabilities: PARTIAL ($capPassCount/6 checks passed)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  Agent Capabilities: SKIP (test-agent-capabilities.ps1 not found)" -ForegroundColor Yellow
        $checks['agentCapabilities'] = [ordered]@{ ok = $false; error = "Capability test script not found" }
    }
} catch {
    Write-Host "  Agent Capabilities: ERROR ($($_.Exception.Message))" -ForegroundColor Red
    $checks['agentCapabilities'] = [ordered]@{ ok = $false; error = $_.Exception.Message }
}

# --- Score Computation ---
Write-Host ""
Write-Host "--- Score Computation ---" -ForegroundColor White

# Critical hard-fail gates (HTTP endpoints that must be alive)
$criticalChecks = @('runtimeFabric', 'router', 'ollama', 'receipts')
$criticalFails = $criticalChecks | Where-Object { -not $checks[$_].ok } | Measure-Object | Select-Object -ExpandProperty Count

# Critical warnings — things that block production even if score is high
$criticalWarnings = 0
if (-not $checks['agentLeeService'].ok) {
    $criticalWarnings++
    Write-Host "  CRITICAL WARNING: AgentLee Windows Service is NOT Running (production blocker)" -ForegroundColor Red
}
if (-not $checks['desktopRuntime'].ok) {
    $criticalWarnings++
    Write-Host "  CRITICAL WARNING: Desktop Runtime (8091) is NOT responding" -ForegroundColor Red
}
if (-not $checks['vscodeTurbo'].ok) {
    $criticalWarnings++
    Write-Host "  CRITICAL WARNING: VSCode Turbo Adapter (8787) is NOT responding" -ForegroundColor Red
}
if (-not $checks['standardsRootFirewall'].ok) {
    $criticalWarnings++
    Write-Host "  CRITICAL WARNING: Standards root drift firewall is not satisfied" -ForegroundColor Red
}

# Scoring model (0-100)
$score = 0
$scoreDetails = @()

# Service persistence (20 pts — 0 if stopped/missing)
$svcScore = 0
if ($checks['agentLeeService'].ok) { $svcScore = 20 }  # Only full score if Running
$score += $svcScore
$statusText = if ($checks['agentLeeService'].status) { $checks['agentLeeService'].status } else { 'NOT FOUND' }
$scoreDetails += "Service persistence: " + $svcScore + "/20 (AgentLee: " + $statusText + ")"

# Core services alive (20 pts: 5 each for fabric, router, ollama, voice)
$coreScore = 0
if ($checks['runtimeFabric'].ok) { $coreScore += 5 }
if ($checks['router'].ok) { $coreScore += 5 }
if ($checks['ollama'].ok) { $coreScore += 5 }
if ($checks['voiceKernel'].ok) { $coreScore += 5 }
$score += $coreScore
$scoreDetails += "Core services (fabric/router/ollama/voice): $coreScore/20"

# Desktop Runtime (15 pts — no partial credit; it either runs or doesn't)
$desktopScore = if ($checks['desktopRuntime'].ok) { 15 } else { 0 }
$score += $desktopScore
$scoreDetails += "Desktop Runtime: " + $desktopScore + "/15 (running: " + $checks['desktopRuntime'].ok + ")"

# Docker (10 pts)
$dockerScore = if ($checks['docker'].ok) { 10 } else { 0 }
$score += $dockerScore
$scoreDetails += "Docker infra: $dockerScore/10"

# Receipts/logging (10 pts)
$receiptScore = 0
if ($checks['receipts'].ok -and $receiptCount -gt 10) { $receiptScore = 10 } elseif ($checks['receipts'].ok) { $receiptScore = 7 }
$score += $receiptScore
$scoreDetails += "Receipts/logging: " + $receiptScore + "/10 (" + $receiptCount + " receipts)"

# Agent capabilities (15 pts)
$capScore = 0
if ($null -ne $capabilityResults) {
    $capPassCount2 = ($checks['agentCapabilities'].passCount)
    $capScore = [Math]::Round(($capPassCount2 / 6) * 15)
}
$score += $capScore
$scoreDetails += "Agent capabilities: $capScore/15 ($($checks['agentCapabilities'].passCount)/6 passed)"

# Config/secrets (10 pts)
$configScore = 0
if ($checks['envLocal'].ok) { $configScore += 5 }
if ($checks['versionJson'].ok) { $configScore += 3 }
if ($checks['governanceManifest'].ok) { $configScore += 2 }
$score += $configScore
$scoreDetails += "Config/governance docs: $configScore/10"

# Production gate blocking (10 pts — only awarded if no critical failures)
$gateScore = if ($criticalFails -eq 0 -and $criticalWarnings -eq 0) { 10 } elseif ($criticalFails -eq 0) { 5 } else { 0 }
$score += $gateScore
$scoreDetails += "Production gate functional: $gateScore/10"

Write-Host ""
foreach ($d in $scoreDetails) { Write-Host "   $d" -ForegroundColor Gray }
Write-Host ""

# --- Strict Verdict Logic ---
# productionAllowed = true ONLY if score >= 99 AND zero critical failures AND zero critical warnings
if ($score -ge 99 -and $criticalFails -eq 0 -and $criticalWarnings -eq 0) {
    $verdict = "LEEWAY_FULL_SYSTEM_99_READY"
    $productionAllowed = $true
} elseif ($score -ge 85) {
    $verdict = "LEEWAY_FULL_SYSTEM_MAJOR_UPLIFT_PARTIAL"
    $productionAllowed = $false
} else {
    $verdict = "LEEWAY_FULL_SYSTEM_BLOCKED"
    $productionAllowed = $false
}

Write-Host " SCORE:           $score / 100"  -ForegroundColor $(if($score -ge 99){"Green"}elseif($score -ge 85){"Yellow"}else{"Red"})
Write-Host " CRITICAL FAILS:  $criticalFails"  -ForegroundColor $(if($criticalFails -eq 0){"Green"}else{"Red"})
Write-Host " CRITICAL WARNS:  $criticalWarnings" -ForegroundColor $(if($criticalWarnings -eq 0){"Green"}else{"Red"})
Write-Host " VERDICT:         $verdict" -ForegroundColor $(if($verdict -eq "LEEWAY_FULL_SYSTEM_99_READY"){"Green"}elseif($verdict -match "PARTIAL"){"Yellow"}else{"Red"})
Write-Host " productionAllowed: $productionAllowed" -ForegroundColor $(if($productionAllowed){"Green"}else{"Red"})
Write-Host ""

if (-not $productionAllowed) {
    Write-Host " Production Blockers:" -ForegroundColor Red
    if ($criticalFails -gt 0) {
        $criticalChecks | Where-Object { -not $checks[$_].ok } | ForEach-Object {
            Write-Host "   [CRITICAL-FAIL] $_" -ForegroundColor Red
        }
    }
    if (-not $checks['agentLeeService'].ok) {
        $svcStatusDisplay = if ($checks['agentLeeService'].status) { $checks['agentLeeService'].status } else { 'NOT FOUND' }
        Write-Host "   [CRITICAL-WARN] AgentLee Windows Service is $svcStatusDisplay - run: Start-Service AgentLee" -ForegroundColor Red
    }
    if (-not $checks['desktopRuntime'].ok) {
        Write-Host "   [CRITICAL-WARN] Desktop Runtime (8091) NOT responding" -ForegroundColor Red
    }
    if (-not $checks['vscodeTurbo'].ok) {
        Write-Host "   [CRITICAL-WARN] VSCode Turbo Adapter (8787) NOT responding" -ForegroundColor Red
    }
    if (-not $checks['standardsRootFirewall'].ok) {
        Write-Host "   [CRITICAL-WARN] Standards root drift firewall failed" -ForegroundColor Red
    }
    Write-Host ""
}

$EndedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Write report
$report = [ordered]@{
    schema            = "leeway.production-gate-report.v2"
    version           = "2.1.4"
    generatedAt       = $EndedAt
    startedAt         = $StartedAt
    score             = $score
    maxScore          = 100
    verdict           = $verdict
    productionAllowed = $productionAllowed
    criticalFails     = $criticalFails
    criticalWarnings  = $criticalWarnings
    scoreDetails      = $scoreDetails
    checks            = $checks
    agentCapabilities = $capabilityResults
    blockers          = @(
        if ($criticalFails -gt 0) { "$criticalFails critical service(s) not responding" }
        if (-not $checks['agentLeeService'].ok) { $svcSt = if ($checks['agentLeeService'].status) { $checks['agentLeeService'].status } else { 'NOT FOUND' }; "AgentLee Windows Service NOT Running (status: $svcSt)" }
        if (-not $checks['desktopRuntime'].ok)  { "Desktop Runtime (8091) NOT running" }
        if (-not $checks['vscodeTurbo'].ok)     { "VSCode Turbo Adapter (8787) NOT running" }
        if (-not $checks['standardsRootFirewall'].ok) { "Standards root drift firewall failed" }
    )
}

$reportPath = Join-Path $ReportsRoot "production-gate-latest.json"
$report | ConvertTo-Json -Depth 20 | Set-Content -Path $reportPath -Encoding UTF8
Write-Host " Report: $reportPath" -ForegroundColor Gray

# Write receipt
. "$ScriptDir\leeway-receipt-helper.ps1" -ErrorAction SilentlyContinue
try {
    $rPath = Write-LeeWayReceipt `
        -Action "production-readiness-gate" `
        -Result @{ ok = ($criticalFails -eq 0); score = $score; verdict = $verdict; productionAllowed = $productionAllowed } `
        -Metadata @{ agentId = "agent-lee"; controlSurface = "direct-powershell"; domain = "production" } `
        -StartedAt $StartedAt
    if ($rPath) { Write-Host " Receipt: $rPath" -ForegroundColor Gray }
} catch {}

Write-Host ""

if (-not $NoExitOnFail -and $criticalFails -gt 0) {
    exit 1
}
exit 0
