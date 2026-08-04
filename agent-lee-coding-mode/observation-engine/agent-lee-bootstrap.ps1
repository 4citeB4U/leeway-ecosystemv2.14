# agent-lee-bootstrap.ps1
# SINGLE ENTRY POINT FOR AGENT LEE OBSERVATION ENGINE
# This is the ONLY valid entry into the ALOE system

[CmdletBinding()]
param(
    [switch]$NoLoop,
    [int]$IntervalMs = 1000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$AloeRoot = Join-Path $Root "agent-lee-coding-mode\observation-engine"
$ModulesDir = Join-Path $AloeRoot "modules"
$LogsDir = Join-Path $AloeRoot "logs"
$StateLogDir = Join-Path $LogsDir "state"
$ReceiptsDir = Join-Path $LogsDir "receipts"
$DiagnosticsDir = Join-Path $LogsDir "diagnostics"
$ArchiveReceiptsDir = Join-Path $Root "Archive\receipts\aloe"

Write-Host "=== AGENT LEE OBSERVATION ENGINE BOOTSTRAP ===" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor Gray
Write-Host "ALOE Root: $AloeRoot" -ForegroundColor Gray

# STEP 1: DIRECTORY BOOTSTRAP (CRITICAL FIX)
Write-Host "`n[1/5] Bootstrapping directories..." -ForegroundColor Yellow

$directories = @(
    $LogsDir,
    $StateLogDir,
    $ReceiptsDir,
    $DiagnosticsDir,
    $ArchiveReceiptsDir,
    (Join-Path $ArchiveReceiptsDir "$(Get-Date -Format 'yyyy')"),
    (Join-Path $ArchiveReceiptsDir "$(Get-Date -Format 'yyyy')\$(Get-Date -Format 'MM')"),
    (Join-Path $ArchiveReceiptsDir "$(Get-Date -Format 'yyyy')\$(Get-Date -Format 'MM')\$(Get-Date -Format 'dd')")
)

$dirResults = @{
    created = @()
    failed = @()
}

foreach ($dir in $directories) {
    try {
        if (-not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Force -Path $dir -ErrorAction Stop | Out-Null
            $dirResults.created += $dir
            Write-Host "  ✓ Created: $dir" -ForegroundColor Green
        } else {
            Write-Verbose "  ✓ Exists: $dir"
        }
    }
    catch {
        $dirResults.failed += @{
            directory = $dir
            error = $_.Exception.Message
        }
        Write-Warning "  ✗ Failed: $dir - $($_.Exception.Message)"
    }
}

if ($dirResults.failed.Count -gt 0) {
    Write-Error "Directory bootstrap failed. Cannot continue."
    exit 1
}

Write-Host "  ✓ All directories ready" -ForegroundColor Green

# STEP 2: ASSEMBLY INITIALIZATION (CRITICAL FIX)
Write-Host "`n[2/5] Initializing .NET assemblies..." -ForegroundColor Yellow

$assemblies = @(
    "System.Windows.Forms",
    "System.Drawing"
)

$assemblyResults = @{
    loaded = @()
    failed = @()
}

foreach ($assembly in $assemblies) {
    try {
        Add-Type -AssemblyName $assembly -ErrorAction Stop
        $assemblyResults.loaded += $assembly
        Write-Host "  ✓ Loaded: $assembly" -ForegroundColor Green
    }
    catch {
        $assemblyResults.failed += @{
            assembly = $assembly
            error = $_.Exception.Message
        }
        Write-Warning "  ✗ Failed: $assembly - $($_.Exception.Message)"
    }
}

if ($assemblyResults.failed.Count -gt 0) {
    Write-Warning "Some assemblies failed to load. Observation may be degraded."
}

# STEP 3: MODULE IMPORT (CRITICAL FIX)
Write-Host "`n[3/5] Importing ALOE modules..." -ForegroundColor Yellow

$modules = @(
    (Join-Path $ModulesDir "ALOE-Monitor.psm1"),
    (Join-Path $ModulesDir "ALOE-State.psm1")
)

$moduleResults = @{
    imported = @()
    failed = @()
}

foreach ($module in $modules) {
    try {
        if (Test-Path -LiteralPath $module) {
            Import-Module $module -Force -ErrorAction Stop
            $moduleResults.imported += $module
            Write-Host "  ✓ Imported: $(Split-Path -Leaf $module)" -ForegroundColor Green
        } else {
            $moduleResults.failed += @{
                module = $module
                error = "File not found"
            }
            Write-Warning "  ✗ Not found: $module"
        }
    }
    catch {
        $moduleResults.failed += @{
            module = $module
            error = $_.Exception.Message
        }
        Write-Warning "  ✗ Failed: $(Split-Path -Leaf $module) - $($_.Exception.Message)"
    }
}

if ($moduleResults.failed.Count -gt 0) {
    Write-Error "Module import failed. Cannot continue."
    exit 1
}

Write-Host "  ✓ All modules imported" -ForegroundColor Green

# STEP 4: VALIDATION TEST
Write-Host "`n[4/5] Running validation test..." -ForegroundColor Yellow

try {
    $testState = Get-ALOE-State -ErrorAction Stop
    Write-Host "  ✓ State assembly: OK" -ForegroundColor Green
    Write-Host "    Monitors: $($testState.monitors.count)" -ForegroundColor Cyan
    Write-Host "    Cursor: ($($testState.cursor.x), $($testState.cursor.y))" -ForegroundColor Cyan
    Write-Host "    Processes: $($testState.processes.count)" -ForegroundColor Cyan
    Write-Host "    Active: $($testState.processes.active)" -ForegroundColor Cyan
}
catch {
    Write-Error "Validation test failed: $($_.Exception.Message)"
    exit 1
}

# STEP 5: WRITE BOOTSTRAP RECEIPT
$bootstrapReceipt = @{
    schema = "leeway.agent-lee.aloe.bootstrap.v1"
    timestamp = Get-Date -Format "o"
    status = "SUCCESS"
    directories = $dirResults
    assemblies = $assemblyResults
    modules = $moduleResults
    validationTest = @{
        status = "PASS"
        monitors = $testState.monitors.count
        cursor = @{
            x = $testState.cursor.x
            y = $testState.cursor.y
        }
        processes = $testState.processes.count
    }
}

$receiptPath = Join-Path $ArchiveReceiptsDir "$(Get-Date -Format 'yyyy')\$(Get-Date -Format 'MM')\$(Get-Date -Format 'dd')\aloe-bootstrap-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$bootstrapReceipt | ConvertTo-Json -Depth 10 | Set-Content -Path $receiptPath -Encoding UTF8

Write-Host "`n✓ Bootstrap complete" -ForegroundColor Green
Write-Host "Receipt: $receiptPath" -ForegroundColor Gray

# STEP 6: START OBSERVATION LOOP (if not disabled)
if (-not $NoLoop) {
    Write-Host "`n[6/6] Starting observation loop..." -ForegroundColor Yellow
    Write-Host "Interval: $IntervalMs ms" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    
    $stateLogPath = Join-Path $StateLogDir "state.jsonl"
    $loopId = [guid]::NewGuid().ToString().Substring(0,8)
    $observationCount = 0
    $errorCount = 0
    
    try {
        while ($true) {
            try {
                $state = Get-ALOE-State
                
                # Write to JSONL log
                $state | ConvertTo-Json -Depth 10 -Compress | Add-Content -Path $stateLogPath -Encoding UTF8
                
                $observationCount++
                
                # Status update every 60 observations
                if ($observationCount % 60 -eq 0) {
                    Write-Host "[ALOE] $observationCount observations, $errorCount errors, monitors: $($state.monitors.count)" -ForegroundColor Cyan
                }
            }
            catch {
                $errorCount++
                Write-Warning "Observation error: $($_.Exception.Message)"
                
                if ($errorCount -gt 100) {
                    Write-Error "Too many errors ($errorCount), stopping loop"
                    break
                }
            }
            
            Start-Sleep -Milliseconds $IntervalMs
        }
    }
    finally {
        Write-Host "`n✓ Observation loop stopped" -ForegroundColor Yellow
        Write-Host "Total observations: $observationCount" -ForegroundColor Cyan
        Write-Host "Total errors: $errorCount" -ForegroundColor Cyan
    }
} else {
    Write-Host "`n✓ Bootstrap complete (loop disabled)" -ForegroundColor Green
}

# Made with Bob
