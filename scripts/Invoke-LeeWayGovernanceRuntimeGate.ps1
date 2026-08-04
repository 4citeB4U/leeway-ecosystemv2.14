# Invoke-LeeWayGovernanceRuntimeGate.ps1
# Leeway Ecosystem v2.1.4 — Governance Runtime Gate
#
# Probes each domain's health signal, reads governance-index.json,
# computes gate results per domain, and writes output to Archive/reports/

param(
    [switch]$NoExitOnFail,
    [switch]$VerboseRaw
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$GovernanceIndexPath = Join-Path $WorkspaceRoot "LeeWay-Standards\governance-index.json"
$ReportsRoot = Join-Path $WorkspaceRoot "Archive\reports"
$ReceiptsRoot = Join-Path $WorkspaceRoot "Archive\receipts"

New-Item -ItemType Directory -Force -Path $ReportsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ReceiptsRoot | Out-Null

$StartedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$Timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Leeway Governance Runtime Gate" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Started: $StartedAt"
Write-Host ""

# Load governance index
if (-not (Test-Path $GovernanceIndexPath)) {
    Write-Host " FAIL: governance-index.json not found at $GovernanceIndexPath" -ForegroundColor Red
    exit 1
}
$govIndex = Get-Content $GovernanceIndexPath -Raw | ConvertFrom-Json
Write-Host " Loaded governance-index.json (schema: $($govIndex.schema))" -ForegroundColor Green

function Test-HealthSignal {
    param([string]$Url, [int]$TimeoutSec = 5)
    if (-not $Url -or $Url.Trim() -eq "") { return $null }
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return [ordered]@{ ok = $true; statusCode = $response.StatusCode; url = $Url }
    } catch {
        return [ordered]@{ ok = $false; error = $_.Exception.Message; url = $Url }
    }
}

function Count-ReceiptsForDomain {
    param([string]$Domain)
    $pattern = "*${Domain}*"
    $matches = Get-ChildItem $ReceiptsRoot -Filter $pattern -ErrorAction SilentlyContinue
    return ($matches | Measure-Object).Count
}

$gateResults = @()
$criticalFails = 0
$totalDomains = 0

foreach ($domainName in ($govIndex.domains | Get-Member -MemberType NoteProperty).Name) {
    $domain = $govIndex.domains.$domainName
    $totalDomains++

    $healthProbe = $null
    if ($domain.healthSignal) {
        Write-Host " Probing $domainName at $($domain.healthSignal)..." -NoNewline
        $healthProbe = Test-HealthSignal -Url $domain.healthSignal -TimeoutSec 5
        if ($healthProbe.ok) {
            Write-Host " OK ($($healthProbe.statusCode))" -ForegroundColor Green
        } else {
            Write-Host " DEAD ($($healthProbe.error))" -ForegroundColor Red
        }
    } else {
        Write-Host " $domainName — no health signal (runtime status: $($domain.runtimeStatus))" -ForegroundColor Gray
    }

    $receiptCount = Count-ReceiptsForDomain -Domain $domainName

    # Compute gate result
    $gateStatus = switch ($domain.runtimeStatus) {
        "ENFORCED"                  { if ($healthProbe -and $healthProbe.ok) { "PASS" } elseif ($healthProbe) { "FAIL" } else { "PASS" } }
        "DOCUMENTED_NOT_ENFORCED"   { "DOCUMENTED_NOT_ENFORCED" }
        "PARTIAL"                   { "PARTIAL" }
        "LIVE_RUNNING"              { if ($healthProbe -and $healthProbe.ok) { "PASS" } elseif ($healthProbe) { "FAIL" } else { "PASS" } }
        "DEAD_NOT_RUNNING"          { "FAIL" }
        "MISSING"                   { "FAIL" }
        default                     { "UNKNOWN" }
    }

    # Critical domains that must PASS for productionAllowed
    $isCritical = $domainName -in @("runtimeFabric", "router", "desktopRuntime", "vscodeTurboAdapter")
    if ($isCritical -and $gateStatus -eq "FAIL") { $criticalFails++ }

    $gateEntry = [ordered]@{
        domain       = $domainName
        gateStatus   = $gateStatus
        runtimeStatus = $domain.runtimeStatus
        healthSignal = $domain.healthSignal
        healthProbe  = $healthProbe
        receiptCount = $receiptCount
        isCritical   = $isCritical
        ownerService = $domain.ownerService
        notes        = $domain.notes
    }
    $gateResults += $gateEntry

    $color = switch ($gateStatus) {
        "PASS"                    { "Green" }
        "DOCUMENTED_NOT_ENFORCED" { "Yellow" }
        "PARTIAL"                 { "Yellow" }
        "FAIL"                    { "Red" }
        default                   { "Gray" }
    }
    Write-Host "   -> Gate: $gateStatus$(if($isCritical){' [CRITICAL]'})" -ForegroundColor $color
}

Write-Host ""
Write-Host "──────────────────────────────────────────────────"

$passes = ($gateResults | Where-Object { $_.gateStatus -eq "PASS" }).Count
$fails = ($gateResults | Where-Object { $_.gateStatus -eq "FAIL" }).Count
$documented = ($gateResults | Where-Object { $_.gateStatus -eq "DOCUMENTED_NOT_ENFORCED" }).Count
$partial = ($gateResults | Where-Object { $_.gateStatus -eq "PARTIAL" }).Count

Write-Host ""
Write-Host " Summary: $passes PASS | $fails FAIL | $documented DOCUMENTED | $partial PARTIAL" -ForegroundColor $(if($criticalFails -gt 0){"Red"}else{"Green"})
Write-Host " Critical failures: $criticalFails" -ForegroundColor $(if($criticalFails -gt 0){"Red"}else{"Green"})
Write-Host " productionAllowed: $(if($criticalFails -eq 0){'CANDIDATE'}else{'BLOCKED'})" -ForegroundColor $(if($criticalFails -eq 0){"Yellow"}else{"Red"})
Write-Host ""

$EndedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Write report
$report = [ordered]@{
    schema       = "leeway.governance-gate-report.v1"
    generatedAt  = $EndedAt
    startedAt    = $StartedAt
    summary      = [ordered]@{
        total    = $totalDomains
        pass     = $passes
        fail     = $fails
        documentedNotEnforced = $documented
        partial  = $partial
        criticalFails = $criticalFails
        productionAllowed = ($criticalFails -eq 0)
    }
    gateResults  = $gateResults
}

$reportPath = Join-Path $ReportsRoot "governance-gate-latest.json"
$report | ConvertTo-Json -Depth 20 | Set-Content -Path $reportPath -Encoding UTF8
Write-Host " Report: $reportPath" -ForegroundColor Gray

# Write receipt
. "$ScriptDir\leeway-receipt-helper.ps1" -ErrorAction SilentlyContinue
$receiptResult = try {
    Write-LeeWayReceipt `
        -Action "governance-runtime-gate" `
        -Result @{ ok = ($criticalFails -eq 0); passes = $passes; fails = $fails; criticalFails = $criticalFails } `
        -Metadata @{ agentId = "agent-lee"; controlSurface = "direct-powershell"; domain = "governance" } `
        -StartedAt $StartedAt
} catch { $null }
if ($receiptResult) { Write-Host " Receipt: $receiptResult" -ForegroundColor Gray }

if (-not $NoExitOnFail -and $criticalFails -gt 0) {
    exit 1
}
exit 0
