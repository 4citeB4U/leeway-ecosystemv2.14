# Leeway System Hardening Script
# Purpose: Apply enterprise-grade security hardening to all Leeway services
# Classification: CRITICAL_INFRASTRUCTURE

param(
    [switch]$Validate,
    [switch]$Report,
    [switch]$Fix
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportPath = Join-Path $Root "Archive\reports\hardening\hardening-report-$Timestamp.json"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Leeway System Hardening" -ForegroundColor Cyan
Write-Host "  Enterprise Production Security" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$HardeningChecks = @{
    "Authentication" = @()
    "Network" = @()
    "Data" = @()
    "Monitoring" = @()
    "Compliance" = @()
    "Infrastructure" = @()
}

function Test-ServiceBinding {
    param([string]$Service, [int]$Port, [bool]$ShouldBeLocal)
    
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    
    if (-not $listeners) {
        return @{
            Service = $Service
            Port = $Port
            Status = "NOT_RUNNING"
            Severity = "WARNING"
            Message = "Service not running on port $Port"
        }
    }
    
    $isLocal = $listeners | Where-Object { $_.LocalAddress -eq "127.0.0.1" -or $_.LocalAddress -eq "::1" }
    
    if ($ShouldBeLocal -and -not $isLocal) {
        return @{
            Service = $Service
            Port = $Port
            Status = "FAIL"
            Severity = "CRITICAL"
            Message = "Service bound to public interface (should be 127.0.0.1)"
            Fix = "Update service configuration to bind to 127.0.0.1"
        }
    }
    
    if (-not $ShouldBeLocal -and $isLocal) {
        return @{
            Service = $Service
            Port = $Port
            Status = "FAIL"
            Severity = "WARNING"
            Message = "Service bound to localhost (should be public)"
            Fix = "Update service configuration to bind to 0.0.0.0"
        }
    }
    
    return @{
        Service = $Service
        Port = $Port
        Status = "PASS"
        Severity = "INFO"
        Message = "Service binding correct"
    }
}

function Test-FilePermissions {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        return @{
            Path = $Path
            Status = "NOT_FOUND"
            Severity = "WARNING"
            Message = "Path does not exist"
        }
    }
    
    $acl = Get-Acl $Path
    $hasEveryoneAccess = $acl.Access | Where-Object { $_.IdentityReference -eq "Everyone" }
    
    if ($hasEveryoneAccess) {
        return @{
            Path = $Path
            Status = "FAIL"
            Severity = "CRITICAL"
            Message = "Everyone has access to sensitive directory"
            Fix = "icacls `"$Path`" /inheritance:r /grant:r `"SYSTEM:(OI)(CI)F`" `"Administrators:(OI)(CI)F`""
        }
    }
    
    return @{
        Path = $Path
        Status = "PASS"
        Severity = "INFO"
        Message = "File permissions correct"
    }
}

function Test-EnvironmentSecrets {
    param([string]$ServicePath)
    
    $envFiles = Get-ChildItem -Path $ServicePath -Filter ".env" -Recurse -ErrorAction SilentlyContinue
    $issues = @()
    
    foreach ($envFile in $envFiles) {
        $content = Get-Content $envFile.FullName -Raw
        
        # Check for default passwords
        if ($content -match "password.*=.*(admin|password|123|test|demo|default)") {
            $issues += @{
                File = $envFile.FullName
                Status = "FAIL"
                Severity = "CRITICAL"
                Message = "Default or weak password detected"
                Fix = "Generate strong random password"
            }
        }
        
        # Check for exposed secrets
        if ($content -match "(api[_-]?key|secret|token|password).*=.*[^X]{8,}") {
            $issues += @{
                File = $envFile.FullName
                Status = "WARNING"
                Severity = "HIGH"
                Message = "Plaintext secrets in .env file"
                Fix = "Use encrypted vault or environment injection"
            }
        }
    }
    
    if ($issues.Count -eq 0) {
        return @{
            Path = $ServicePath
            Status = "PASS"
            Severity = "INFO"
            Message = "No obvious secret issues"
        }
    }
    
    return $issues
}

function Test-TLSConfiguration {
    param([string]$Service, [string]$Url)
    
    try {
        $request = [System.Net.WebRequest]::Create($Url)
        $request.Timeout = 5000
        $response = $request.GetResponse()
        
        if ($response.ResponseUri.Scheme -ne "https") {
            return @{
                Service = $Service
                Status = "FAIL"
                Severity = "CRITICAL"
                Message = "Service not using HTTPS"
                Fix = "Enable TLS/SSL"
            }
        }
        
        return @{
            Service = $Service
            Status = "PASS"
            Severity = "INFO"
            Message = "TLS enabled"
        }
    } catch {
        return @{
            Service = $Service
            Status = "UNKNOWN"
            Severity = "WARNING"
            Message = "Could not test TLS: $($_.Exception.Message)"
        }
    }
}

function Test-LoggingConfiguration {
    param([string]$ServicePath)
    
    $logDirs = @(
        "logs",
        "_logs",
        "Archive\logs"
    )
    
    $hasLogging = $false
    foreach ($dir in $logDirs) {
        $fullPath = Join-Path $ServicePath $dir
        if (Test-Path $fullPath) {
            $hasLogging = $true
            break
        }
    }
    
    if (-not $hasLogging) {
        return @{
            Path = $ServicePath
            Status = "FAIL"
            Severity = "HIGH"
            Message = "No logging directory found"
            Fix = "Configure structured logging to Archive/logs/"
        }
    }
    
    return @{
        Path = $ServicePath
        Status = "PASS"
        Severity = "INFO"
        Message = "Logging configured"
    }
}

function Test-BackupConfiguration {
    $seafileCompose = Join-Path $Root "seafile\docker-compose.yml"
    
    if (-not (Test-Path $seafileCompose)) {
        return @{
            Component = "Seafile"
            Status = "FAIL"
            Severity = "CRITICAL"
            Message = "Seafile backup infrastructure not found"
            Fix = "Deploy Seafile using seafile/docker-compose.yml"
        }
    }
    
    # Check if Seafile is running
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8082/api2/ping/" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            return @{
                Component = "Seafile"
                Status = "PASS"
                Severity = "INFO"
                Message = "Seafile backup running"
            }
        }
    } catch {
        return @{
            Component = "Seafile"
            Status = "FAIL"
            Severity = "CRITICAL"
            Message = "Seafile not running"
            Fix = "Start Seafile: cd seafile && .\start-seafile.ps1"
        }
    }
}

Write-Host "Running hardening checks..." -ForegroundColor Yellow
Write-Host ""

# Network Security Checks
Write-Host "[1/6] Network Security..." -ForegroundColor Cyan
$HardeningChecks.Network += Test-ServiceBinding -Service "Agent Lee Code Mode" -Port 8080 -ShouldBeLocal $true
$HardeningChecks.Network += Test-ServiceBinding -Service "Runtime Fabric" -Port 4001 -ShouldBeLocal $true
$HardeningChecks.Network += Test-ServiceBinding -Service "Execution Broker" -Port 5200 -ShouldBeLocal $true
$HardeningChecks.Network += Test-ServiceBinding -Service "Desktop Runtime" -Port 8091 -ShouldBeLocal $true
$HardeningChecks.Network += Test-ServiceBinding -Service "Media Ingestion" -Port 5300 -ShouldBeLocal $true
$HardeningChecks.Network += Test-ServiceBinding -Service "Agent Lee OS2" -Port 5100 -ShouldBeLocal $false
$HardeningChecks.Network += Test-ServiceBinding -Service "Seafile" -Port 8082 -ShouldBeLocal $false

# Data Security Checks
Write-Host "[2/6] Data Security..." -ForegroundColor Cyan
$HardeningChecks.Data += Test-FilePermissions -Path (Join-Path $Root "Archive")
$HardeningChecks.Data += Test-FilePermissions -Path (Join-Path $Root "seafile")
$HardeningChecks.Data += Test-EnvironmentSecrets -ServicePath (Join-Path $Root "seafile")
$HardeningChecks.Data += Test-EnvironmentSecrets -ServicePath (Join-Path $Root "media-ingestion-layer")
$HardeningChecks.Data += Test-EnvironmentSecrets -ServicePath (Join-Path $Root "agent-lee-os2")

# Monitoring Checks
Write-Host "[3/6] Monitoring..." -ForegroundColor Cyan
$HardeningChecks.Monitoring += Test-LoggingConfiguration -ServicePath (Join-Path $Root "agent-lee-coding-mode")
$HardeningChecks.Monitoring += Test-LoggingConfiguration -ServicePath (Join-Path $Root "Leeway Runtime Fabric")
$HardeningChecks.Monitoring += Test-LoggingConfiguration -ServicePath (Join-Path $Root "media-ingestion-layer")

# Compliance Checks
Write-Host "[4/6] Compliance..." -ForegroundColor Cyan
$HardeningChecks.Compliance += Test-BackupConfiguration

# Infrastructure Checks
Write-Host "[5/6] Infrastructure..." -ForegroundColor Cyan
# Check Docker security
try {
    $dockerInfo = docker info 2>$null | Out-String
    if ($dockerInfo -match "Security Options") {
        $HardeningChecks.Infrastructure += @{
            Component = "Docker"
            Status = "PASS"
            Severity = "INFO"
            Message = "Docker security features available"
        }
    }
} catch {
    $HardeningChecks.Infrastructure += @{
        Component = "Docker"
        Status = "WARNING"
        Severity = "MEDIUM"
        Message = "Could not verify Docker security"
    }
}

# Authentication Checks
Write-Host "[6/6] Authentication..." -ForegroundColor Cyan
# Check if services require authentication
$HardeningChecks.Authentication += @{
    Component = "API Authentication"
    Status = "WARNING"
    Severity = "HIGH"
    Message = "Manual verification required: Ensure all public APIs require authentication"
    Fix = "Implement API key or JWT authentication for all endpoints"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Hardening Report" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$totalChecks = 0
$passedChecks = 0
$failedChecks = 0
$warningChecks = 0
$criticalIssues = @()
$highIssues = @()

foreach ($category in $HardeningChecks.Keys) {
    $checks = $HardeningChecks[$category]
    if ($checks.Count -eq 0) { continue }
    
    Write-Host "[$category]" -ForegroundColor Yellow
    
    foreach ($check in $checks) {
        $totalChecks++
        
        $statusColor = switch ($check.Status) {
            "PASS" { "Green"; $passedChecks++; break }
            "FAIL" { "Red"; $failedChecks++; break }
            "WARNING" { "Yellow"; $warningChecks++; break }
            default { "Gray"; break }
        }
        
        $icon = switch ($check.Status) {
            "PASS" { "✓" }
            "FAIL" { "✗" }
            "WARNING" { "⚠" }
            default { "?" }
        }
        
        Write-Host "  $icon " -NoNewline -ForegroundColor $statusColor
        Write-Host "$($check.Service)$($check.Component)$($check.Path): " -NoNewline
        Write-Host "$($check.Message)" -ForegroundColor $statusColor
        
        if ($check.Severity -eq "CRITICAL") {
            $criticalIssues += $check
        } elseif ($check.Severity -eq "HIGH") {
            $highIssues += $check
        }
        
        if ($check.Fix) {
            Write-Host "    Fix: $($check.Fix)" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total Checks: $totalChecks" -ForegroundColor White
Write-Host "  Passed: $passedChecks" -ForegroundColor Green
Write-Host "  Failed: $failedChecks" -ForegroundColor Red
Write-Host "  Warnings: $warningChecks" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Critical Issues: $($criticalIssues.Count)" -ForegroundColor $(if ($criticalIssues.Count -gt 0) { "Red" } else { "Green" })
Write-Host "  High Issues: $($highIssues.Count)" -ForegroundColor $(if ($highIssues.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Save report
$report = @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    summary = @{
        totalChecks = $totalChecks
        passed = $passedChecks
        failed = $failedChecks
        warnings = $warningChecks
        criticalIssues = $criticalIssues.Count
        highIssues = $highIssues.Count
    }
    checks = $HardeningChecks
    criticalIssues = $criticalIssues
    highIssues = $highIssues
}

$reportDir = Split-Path -Parent $ReportPath
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$report | ConvertTo-Json -Depth 10 | Set-Content -Path $ReportPath -Encoding UTF8

Write-Host "Report saved: $ReportPath" -ForegroundColor Green
Write-Host ""

if ($criticalIssues.Count -gt 0) {
    Write-Host "⚠ CRITICAL ISSUES FOUND - System is NOT production ready" -ForegroundColor Red
    exit 1
} elseif ($highIssues.Count -gt 0) {
    Write-Host "⚠ HIGH PRIORITY ISSUES FOUND - Review before production deployment" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✓ System hardening validation passed" -ForegroundColor Green
    exit 0
}

# Made with Bob
