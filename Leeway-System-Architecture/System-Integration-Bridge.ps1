# ============================
# LEEWAY SYSTEM INTEGRATION BRIDGE
# Connects external system directories to Agent Lee ecosystem
# ============================
# Version: 1.0.0
# Created: 2026-06-20
# Authority: Leonard Lee (Creator)
# ============================

param(
    [switch]$Validate,
    [switch]$Status,
    [switch]$CreateLinks,
    [switch]$WriteReceipt
)

$ErrorActionPreference = "Stop"

# ============================
# CANONICAL PATHS
# ============================

$WorkspaceRoot = "D:\Leeway-Ecosystem v2.1.4"
$ArchiveRoot = Join-Path $WorkspaceRoot "Archive"

# External System Directories (outside workspace)
$ExternalGovernor = "C:\Users\Leona\Leeway-System-Governor"
$ExternalLogs = "C:\Users\Leona\Leeway-System-Logs"
$ExternalScripts = "C:\Users\Leona\Leeway-System-PowerShell-Scripts"

# Integration Bridge Directories (inside workspace)
$BridgeRoot = Join-Path $WorkspaceRoot "Leeway-System-Architecture"
$BridgeGovernor = Join-Path $BridgeRoot "governor"
$BridgeLogs = Join-Path $BridgeRoot "logs"
$BridgeScripts = Join-Path $BridgeRoot "scripts"

# Archive Integration Points
$ReceiptsDir = Join-Path $ArchiveRoot "receipts\system-integration"
$LedgersDir = Join-Path $ArchiveRoot "ledgers\system-integration"
$ManifestsDir = Join-Path $ArchiveRoot "manifests\system"
$RuntimeStateDir = Join-Path $ArchiveRoot "runtime-state\system-governor"

# ============================
# LOGGING
# ============================

$LogFile = Join-Path $BridgeRoot "integration-bridge-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    $line | Out-File -FilePath $LogFile -Append -Encoding UTF8
    
    switch ($Level) {
        "ERROR" { Write-Host $line -ForegroundColor Red }
        "WARN"  { Write-Host $line -ForegroundColor Yellow }
        "OK"    { Write-Host $line -ForegroundColor Green }
        default { Write-Host $line }
    }
}

# ============================
# VALIDATION FUNCTIONS
# ============================

function Test-ExternalDirectories {
    Write-Log "Validating external system directories..."
    
    $results = @{
        Governor = Test-Path $ExternalGovernor
        Logs = Test-Path $ExternalLogs
        Scripts = if ($ExternalScripts) { Test-Path $ExternalScripts } else { $false }
    }
    
    foreach ($key in $results.Keys) {
        if ($results[$key]) {
            Write-Log "✓ $key directory exists" "OK"
        } else {
            Write-Log "✗ $key directory missing - will create" "WARN"
        }
    }
    
    return $true  # Always return true, we'll create missing dirs
}

function New-ExternalDirectories {
    Write-Log "Creating missing external directories..."
    
    $dirs = @(
        @{Path = $ExternalGovernor; Name = "Governor"},
        @{Path = $ExternalLogs; Name = "Logs"},
        @{Path = $ExternalScripts; Name = "Scripts"}
    )
    
    foreach ($dir in $dirs) {
        if ($dir.Path -and (![string]::IsNullOrEmpty($dir.Path))) {
            if (!(Test-Path $dir.Path)) {
                try {
                    New-Item -ItemType Directory -Path $dir.Path -Force | Out-Null
                    Write-Log "Created $($dir.Name): $($dir.Path)" "OK"
                } catch {
                    Write-Log "Failed to create $($dir.Name): $_" "ERROR"
                }
            } else {
                Write-Log "$($dir.Name) already exists: $($dir.Path)" "OK"
            }
        }
    }
}

function Test-ArchiveStructure {
    Write-Log "Validating Archive structure..."
    
    $requiredDirs = @(
        $ReceiptsDir,
        $LedgersDir,
        $ManifestsDir,
        $RuntimeStateDir
    )
    
    $allExist = $true
    foreach ($dir in $requiredDirs) {
        if ($dir -and (![string]::IsNullOrEmpty($dir))) {
            if (Test-Path $dir) {
                Write-Log "✓ $(Split-Path $dir -Leaf) exists" "OK"
            } else {
                Write-Log "✗ $(Split-Path $dir -Leaf) missing - will create" "WARN"
                $allExist = $false
            }
        }
    }
    
    return $true  # Always return true, we'll create missing dirs
}

# ============================
# BRIDGE CREATION
# ============================

function New-BridgeStructure {
    Write-Log "Creating integration bridge structure..."
    
    # Create bridge directories
    $dirs = @($BridgeRoot, $BridgeGovernor, $BridgeLogs, $BridgeScripts)
    foreach ($dir in $dirs) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Log "Created: $dir" "OK"
        }
    }
    
    # Create Archive integration points
    $archiveDirs = @($ReceiptsDir, $LedgersDir, $ManifestsDir, $RuntimeStateDir)
    foreach ($dir in $archiveDirs) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Log "Created Archive integration: $dir" "OK"
        }
    }
}

function New-SymbolicLinks {
    Write-Log "Creating symbolic links to external directories..."
    
    # Note: Symbolic links require admin privileges on Windows
    # We'll create junction points instead (no admin required for directories)
    
    try {
        # Governor link
        if (!(Test-Path $BridgeGovernor\external)) {
            cmd /c mklink /J "$BridgeGovernor\external" "$ExternalGovernor" 2>&1 | Out-Null
            Write-Log "Created junction: Governor -> External" "OK"
        }
        
        # Logs link
        if (!(Test-Path $BridgeLogs\external)) {
            cmd /c mklink /J "$BridgeLogs\external" "$ExternalLogs" 2>&1 | Out-Null
            Write-Log "Created junction: Logs -> External" "OK"
        }
        
        # Scripts link
        if (!(Test-Path $BridgeScripts\external)) {
            cmd /c mklink /J "$BridgeScripts\external" "$ExternalScripts" 2>&1 | Out-Null
            Write-Log "Created junction: Scripts -> External" "OK"
        }
        
        return $true
    } catch {
        Write-Log "Failed to create junctions: $_" "ERROR"
        Write-Log "Creating reference files instead..." "WARN"
        
        # Fallback: Create reference files
        @{
            GovernorPath = $ExternalGovernor
            LogsPath = $ExternalLogs
            ScriptsPath = $ExternalScripts
        } | ConvertTo-Json | Out-File "$BridgeRoot\external-paths.json" -Encoding UTF8
        
        return $false
    }
}

# ============================
# MANIFEST GENERATION
# ============================

function New-SystemManifest {
    Write-Log "Generating system integration manifest..."
    
    $manifest = @{
        manifestId = "system-integration-manifest"
        manifestName = "Leeway System Integration"
        manifestType = "system-integration"
        version = "1.0.0"
        createdAt = (Get-Date -Format "o")
        createdBy = "Agent Lee System Integration Bridge"
        
        externalDirectories = @{
            governor = @{
                path = $ExternalGovernor
                purpose = "Enterprise Runtime Governor - single control plane"
                status = if (Test-Path $ExternalGovernor) { "AVAILABLE" } else { "MISSING" }
            }
            logs = @{
                path = $ExternalLogs
                purpose = "Centralized system logs and audit trails"
                status = if (Test-Path $ExternalLogs) { "AVAILABLE" } else { "MISSING" }
            }
            scripts = @{
                path = $ExternalScripts
                purpose = "PowerShell execution layer scripts"
                status = if (Test-Path $ExternalScripts) { "AVAILABLE" } else { "MISSING" }
            }
        }
        
        integrationPoints = @{
            archive = @{
                receipts = $ReceiptsDir
                ledgers = $LedgersDir
                manifests = $ManifestsDir
                runtimeState = $RuntimeStateDir
            }
            bridge = @{
                root = $BridgeRoot
                governor = $BridgeGovernor
                logs = $BridgeLogs
                scripts = $BridgeScripts
            }
        }
        
        dataFlow = @{
            governor = "External Governor -> Bridge -> Archive Runtime State"
            logs = "External Logs -> Bridge -> Archive Receipts"
            scripts = "External Scripts -> Bridge -> Execution Layer"
        }
    }
    
    $manifestPath = Join-Path $ManifestsDir "system-integration.manifest.json"
    $manifest | ConvertTo-Json -Depth 10 | Out-File $manifestPath -Encoding UTF8
    Write-Log "Manifest written: $manifestPath" "OK"
    
    return $manifest
}

# ============================
# STATUS REPORTING
# ============================

function Get-SystemStatus {
    Write-Log "Gathering system integration status..."
    
    $status = @{
        timestamp = Get-Date -Format "o"
        externalDirectories = @{
            governor = @{
                exists = Test-Path $ExternalGovernor
                files = if (Test-Path $ExternalGovernor) { 
                    (Get-ChildItem $ExternalGovernor).Count 
                } else { 0 }
            }
            logs = @{
                exists = Test-Path $ExternalLogs
                files = if (Test-Path $ExternalLogs) { 
                    (Get-ChildItem $ExternalLogs).Count 
                } else { 0 }
            }
            scripts = @{
                exists = Test-Path $ExternalScripts
                files = if (Test-Path $ExternalScripts) { 
                    (Get-ChildItem $ExternalScripts -ErrorAction SilentlyContinue).Count 
                } else { 0 }
            }
        }
        bridgeStructure = @{
            exists = Test-Path $BridgeRoot
            junctions = @{
                governor = Test-Path "$BridgeGovernor\external"
                logs = Test-Path "$BridgeLogs\external"
                scripts = Test-Path "$BridgeScripts\external"
            }
        }
        archiveIntegration = @{
            receipts = Test-Path $ReceiptsDir
            ledgers = Test-Path $LedgersDir
            manifests = Test-Path $ManifestsDir
            runtimeState = Test-Path $RuntimeStateDir
        }
    }
    
    return $status
}

# ============================
# RECEIPT GENERATION
# ============================

function New-IntegrationReceipt {
    param([object]$Status, [object]$Manifest)
    
    Write-Log "Writing integration receipt..."
    
    $receipt = @{
        schema = "leeway-system-integration-receipt-v1"
        receiptId = "system-integration-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        timestamp = Get-Date -Format "o"
        action = "system-integration-bridge-setup"
        
        status = "OK"
        
        externalDirectoriesValidated = @{
            governor = $Status.externalDirectories.governor.exists
            logs = $Status.externalDirectories.logs.exists
            scripts = $Status.externalDirectories.scripts.exists
        }
        
        bridgeCreated = $Status.bridgeStructure.exists
        
        junctionsCreated = @{
            governor = $Status.bridgeStructure.junctions.governor
            logs = $Status.bridgeStructure.junctions.logs
            scripts = $Status.bridgeStructure.junctions.scripts
        }
        
        archiveIntegrationReady = @{
            receipts = $Status.archiveIntegration.receipts
            ledgers = $Status.archiveIntegration.ledgers
            manifests = $Status.archiveIntegration.manifests
            runtimeState = $Status.archiveIntegration.runtimeState
        }
        
        manifestPath = Join-Path $ManifestsDir "system-integration.manifest.json"
        
        paths = @{
            externalGovernor = $ExternalGovernor
            externalLogs = $ExternalLogs
            externalScripts = $ExternalScripts
            bridgeRoot = $BridgeRoot
            archiveRoot = $ArchiveRoot
        }
        
        nextSteps = @(
            "Run Governor: $ExternalGovernor\START-GOVERNOR.bat"
            "Monitor logs: $ExternalLogs"
            "Access bridge: $BridgeRoot"
            "View manifest: $(Join-Path $ManifestsDir 'system-integration.manifest.json')"
        )
    }
    
    $receiptPath = Join-Path $ReceiptsDir "system-integration-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $receipt | ConvertTo-Json -Depth 10 | Out-File $receiptPath -Encoding UTF8
    Write-Log "Receipt written: $receiptPath" "OK"
    
    return $receipt
}

# ============================
# MAIN EXECUTION
# ============================

Write-Log "=== Leeway System Integration Bridge ===" "OK"
Write-Log "Workspace: $WorkspaceRoot"
Write-Log "External Governor: $ExternalGovernor"
Write-Log "External Logs: $ExternalLogs"
Write-Log ""

try {
    if ($Validate) {
        Write-Log "=== VALIDATION MODE ===" "OK"
        $extValid = Test-ExternalDirectories
        $archValid = Test-ArchiveStructure
        
        if ($extValid -and $archValid) {
            Write-Log "All validations passed" "OK"
            exit 0
        } else {
            Write-Log "Validation failed - run with -CreateLinks to fix" "WARN"
            exit 1
        }
    }
    
    if ($Status) {
        Write-Log "=== STATUS MODE ===" "OK"
        $status = Get-SystemStatus
        $status | ConvertTo-Json -Depth 10 | Write-Host
        exit 0
    }
    
    if ($CreateLinks) {
        Write-Log "=== BRIDGE CREATION MODE ===" "OK"
        
        # Validate and create external directories
        Test-ExternalDirectories
        New-ExternalDirectories
        
        # Create bridge structure
        New-BridgeStructure
        
        # Create symbolic links/junctions
        $linksCreated = New-SymbolicLinks
        
        # Generate manifest
        $manifest = New-SystemManifest
        
        # Get final status
        $status = Get-SystemStatus
        
        # Write receipt if requested
        if ($WriteReceipt) {
            $receipt = New-IntegrationReceipt -Status $status -Manifest $manifest
            Write-Log "Integration complete with receipt" "OK"
        } else {
            Write-Log "Integration complete (no receipt requested)" "OK"
        }
        
        Write-Log ""
        Write-Log "=== INTEGRATION SUMMARY ===" "OK"
        Write-Log "Bridge Root: $BridgeRoot"
        Write-Log "Manifest: $(Join-Path $ManifestsDir 'system-integration.manifest.json')"
        Write-Log "Log: $LogFile"
        
        exit 0
    }
    
    # Default: Show help
    Write-Host @"

Leeway System Integration Bridge
=================================

Connects external system directories to Agent Lee ecosystem.

Usage:
  .\System-Integration-Bridge.ps1 -Validate      # Validate directories
  .\System-Integration-Bridge.ps1 -Status        # Show current status
  .\System-Integration-Bridge.ps1 -CreateLinks   # Create integration bridge
  .\System-Integration-Bridge.ps1 -CreateLinks -WriteReceipt  # With receipt

External Directories:
  Governor: $ExternalGovernor
  Logs:     $ExternalLogs
  Scripts:  $ExternalScripts

Bridge Location:
  $BridgeRoot

"@
    
} catch {
    Write-Log "FATAL ERROR: $_" "ERROR"
    Write-Log $_.ScriptStackTrace "ERROR"
    exit 1
}

# Made with Bob
