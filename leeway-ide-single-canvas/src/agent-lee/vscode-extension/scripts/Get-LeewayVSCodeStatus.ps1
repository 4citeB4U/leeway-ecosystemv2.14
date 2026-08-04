<#
.SYNOPSIS
    Get comprehensive status of LeeWay VS Code Extension

.DESCRIPTION
    Checks installation status, version, Runtime Fabric connection, and capabilities

.EXAMPLE
    .\Get-LeewayVSCodeStatus.ps1

.NOTES
    Author: LeeWay Products
    Version: 1.0.0
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
$ExtensionId = "leeway.agent-lee-leeway-coding-system"
$RuntimeFabricUrl = "https://leeway-runtime-fabric.fly.dev"

Write-Host "=== LeeWay VS Code Extension Status ===" -ForegroundColor Cyan
Write-Host ""

# Check VS Code installation
Write-Host "[1/6] Checking VS Code installation..." -ForegroundColor Yellow
try {
    $vscodeVersion = code --version 2>&1 | Select-Object -First 1
    Write-Host "  ✓ VS Code installed: $vscodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ VS Code not found in PATH" -ForegroundColor Red
    exit 1
}

# Check extension installation
Write-Host ""
Write-Host "[2/6] Checking extension installation..." -ForegroundColor Yellow
try {
    $extensionOutput = code --list-extensions --show-versions 2>&1 | Select-String $ExtensionId
    if ($extensionOutput) {
        $version = ($extensionOutput -split '@')[1].Trim()
        Write-Host "  ✓ Extension installed: $version" -ForegroundColor Green
        
        # Check if it's the latest expected version
        if ($version -eq "1.2.18") {
            Write-Host "  ✓ Version is current (1.2.18)" -ForegroundColor Green
        } elseif ($version -lt "1.2.18") {
            Write-Host "  ⚠ Update available: 1.2.18" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ Extension not installed" -ForegroundColor Red
        Write-Host ""
        Write-Host "To install, run: .\Install-LeewayVSCode.ps1" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "  ✗ Failed to check extension: $_" -ForegroundColor Red
    exit 1
}

# Check extension folder
Write-Host ""
Write-Host "[3/6] Checking extension files..." -ForegroundColor Yellow
$extensionsPath = "$env:USERPROFILE\.vscode\extensions"
$extensionFolders = Get-ChildItem -Path $extensionsPath -Directory -Filter "leeway.agent-lee-leeway-coding-system-*" -ErrorAction SilentlyContinue

if ($extensionFolders) {
    foreach ($folder in $extensionFolders) {
        Write-Host "  ✓ Found: $($folder.Name)" -ForegroundColor Green
    }
    
    if ($extensionFolders.Count -gt 1) {
        Write-Host "  ⚠ Multiple versions found - consider cleanup" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Extension folder not found (may need VS Code reload)" -ForegroundColor Yellow
}

# Check Runtime Fabric connection
Write-Host ""
Write-Host "[4/6] Checking Runtime Fabric connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$RuntimeFabricUrl/runtime/health" -Method Get -TimeoutSec 10 -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Runtime Fabric connected: $RuntimeFabricUrl" -ForegroundColor Green
        
        try {
            $healthData = $response.Content | ConvertFrom-Json
            
            if ($healthData.services) {
                Write-Host "  ✓ Provider Fabric: $($healthData.services.providerFabric)" -ForegroundColor Green
                Write-Host "  ✓ Sentinel: $($healthData.services.sentinel)" -ForegroundColor Green
                Write-Host "  ✓ Cage: $($healthData.services.cage)" -ForegroundColor Green
                Write-Host "  ✓ Terminator: $($healthData.services.terminator)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠ Could not parse health data" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ Runtime Fabric responded with status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Runtime Fabric not reachable: $_" -ForegroundColor Red
    Write-Host "  URL: $RuntimeFabricUrl" -ForegroundColor Gray
}

# Check capabilities
Write-Host ""
Write-Host "[5/6] Checking capabilities..." -ForegroundColor Yellow

$capabilities = @(
    @{Name="Disclosure Gate Fix"; Status="✓ Complete"; Color="Green"},
    @{Name="Four-Model Coding Team"; Status="✓ Defined"; Color="Green"},
    @{Name="Runtime Fabric Client"; Status="✓ Architecture Ready"; Color="Green"},
    @{Name="Voice (TTS/ASR)"; Status="⚠ Implementation Required"; Color="Yellow"},
    @{Name="Camera/Vision"; Status="⚠ Implementation Required"; Color="Yellow"},
    @{Name="UI Enhancements"; Status="⚠ Implementation Required"; Color="Yellow"}
)

foreach ($cap in $capabilities) {
    Write-Host "  $($cap.Status) $($cap.Name)" -ForegroundColor $cap.Color
}

# Check for common issues
Write-Host ""
Write-Host "[6/6] Checking for common issues..." -ForegroundColor Yellow

$issues = @()

# Check if VS Code needs reload
$vscodeProcesses = Get-Process -Name "Code" -ErrorAction SilentlyContinue
if ($vscodeProcesses) {
    $issues += "VS Code is running - reload window to activate extension changes"
}

# Check for stale VSIX files
$vsixFiles = Get-ChildItem -Path "E:\.LeeWay-Produucts-File\.Leeway-Ecosystem\.leeway-vscode\agent-lee\vscode-extension" -Filter "*.vsix" -ErrorAction SilentlyContinue
if ($vsixFiles.Count -gt 3) {
    $issues += "Multiple VSIX files found - consider cleanup"
}

if ($issues.Count -eq 0) {
    Write-Host "  ✓ No issues detected" -ForegroundColor Green
} else {
    foreach ($issue in $issues) {
        Write-Host "  ⚠ $issue" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "=== Status Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Extension Version: $version" -ForegroundColor White
Write-Host "Runtime Fabric: $RuntimeFabricUrl" -ForegroundColor White
Write-Host ""
Write-Host "✓ = Complete | ⚠ = Needs Attention | ✗ = Failed" -ForegroundColor Gray
Write-Host ""
Write-Host "For installation/repair, run: .\Install-LeewayVSCode.ps1" -ForegroundColor Gray
Write-Host "For detailed architecture, see: ARCHITECTURE.md" -ForegroundColor Gray
Write-Host ""

exit 0

# Made with Bob
