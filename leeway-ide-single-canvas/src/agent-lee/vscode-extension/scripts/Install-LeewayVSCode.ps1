<#
.SYNOPSIS
    Professional installer for LeeWay VS Code Extension

.DESCRIPTION
    Installs the LeeWay VS Code extension with full verification and health checks.
    Handles cleanup of old versions, installation of new version, and verification.

.PARAMETER Version
    Version to install (default: latest available)

.PARAMETER Force
    Force reinstall even if already installed

.PARAMETER SkipVerification
    Skip post-install verification

.EXAMPLE
    .\Install-LeewayVSCode.ps1
    .\Install-LeewayVSCode.ps1 -Version 1.2.18 -Force

.NOTES
    Author: LeeWay Products
    Version: 1.0.0
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipVerification
)

$ErrorActionPreference = "Stop"
$ExtensionId = "leeway.agent-lee-leeway-coding-system"
$ExtensionDir = "E:\.LeeWay-Produucts-File\.Leeway-Ecosystem\.leeway-vscode\agent-lee\vscode-extension"
$VsixPattern = "agent-lee-leeway-coding-system-*.vsix"

Write-Host "=== LeeWay VS Code Extension Installer ===" -ForegroundColor Cyan
Write-Host ""

# Function to get installed version
function Get-InstalledVersion {
    try {
        $output = code --list-extensions --show-versions 2>&1 | Select-String $ExtensionId
        if ($output) {
            $version = ($output -split '@')[1]
            return $version.Trim()
        }
    } catch {
        return $null
    }
    return $null
}

# Function to find VSIX file
function Find-VsixFile {
    param([string]$RequestedVersion)
    
    if ($RequestedVersion -eq "latest") {
        $vsixFiles = Get-ChildItem -Path $ExtensionDir -Filter $VsixPattern | Sort-Object Name -Descending
        if ($vsixFiles.Count -gt 0) {
            return $vsixFiles[0].FullName
        }
    } else {
        $vsixFile = Join-Path $ExtensionDir "agent-lee-leeway-coding-system-$RequestedVersion.vsix"
        if (Test-Path $vsixFile) {
            return $vsixFile
        }
    }
    return $null
}

# Function to uninstall extension
function Uninstall-Extension {
    Write-Host "Uninstalling old version..." -ForegroundColor Yellow
    try {
        $output = code --uninstall-extension $ExtensionId 2>&1
        Write-Host $output -ForegroundColor Gray
        Start-Sleep -Seconds 2
        return $true
    } catch {
        Write-Host "Warning: Uninstall failed: $_" -ForegroundColor Yellow
        return $false
    }
}

# Function to clean stale folders
function Clean-StaleFolders {
    $extensionsPath = "$env:USERPROFILE\.vscode\extensions"
    $stalePattern = "leeway.agent-lee-leeway-coding-system-*"
    
    Write-Host "Cleaning stale extension folders..." -ForegroundColor Yellow
    
    try {
        $staleFolders = Get-ChildItem -Path $extensionsPath -Directory -Filter $stalePattern -ErrorAction SilentlyContinue
        foreach ($folder in $staleFolders) {
            Write-Host "  Removing: $($folder.Name)" -ForegroundColor Gray
            Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
        return $true
    } catch {
        Write-Host "Warning: Cleanup failed: $_" -ForegroundColor Yellow
        return $false
    }
}

# Function to install extension
function Install-Extension {
    param([string]$VsixPath)
    
    Write-Host "Installing extension from: $VsixPath" -ForegroundColor Yellow
    
    try {
        $output = code --install-extension $VsixPath --force 2>&1
        Write-Host $output -ForegroundColor Gray
        Start-Sleep -Seconds 3
        return $true
    } catch {
        Write-Host "Error: Installation failed: $_" -ForegroundColor Red
        return $false
    }
}

# Function to verify installation
function Verify-Installation {
    param([string]$ExpectedVersion)
    
    Write-Host "Verifying installation..." -ForegroundColor Yellow
    
    $installedVersion = Get-InstalledVersion
    
    if ($installedVersion) {
        Write-Host "  Installed version: $installedVersion" -ForegroundColor Green
        
        if ($ExpectedVersion -and $installedVersion -ne $ExpectedVersion) {
            Write-Host "  Warning: Version mismatch (expected: $ExpectedVersion)" -ForegroundColor Yellow
            return $false
        }
        
        return $true
    } else {
        Write-Host "  Error: Extension not found after installation" -ForegroundColor Red
        return $false
    }
}

# Main installation flow
try {
    # Check current installation
    $currentVersion = Get-InstalledVersion
    if ($currentVersion) {
        Write-Host "Current version: $currentVersion" -ForegroundColor Cyan
        
        if (-not $Force) {
            $response = Read-Host "Extension already installed. Reinstall? (y/n)"
            if ($response -ne 'y') {
                Write-Host "Installation cancelled." -ForegroundColor Yellow
                exit 0
            }
        }
    } else {
        Write-Host "No existing installation found." -ForegroundColor Cyan
    }
    
    # Find VSIX file
    Write-Host ""
    $vsixPath = Find-VsixFile -RequestedVersion $Version
    
    if (-not $vsixPath) {
        Write-Host "Error: VSIX file not found for version: $Version" -ForegroundColor Red
        Write-Host "Location: $ExtensionDir" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "Found VSIX: $(Split-Path $vsixPath -Leaf)" -ForegroundColor Green
    
    # Extract version from VSIX filename
    $vsixVersion = $null
    if ($vsixPath -match 'agent-lee-leeway-coding-system-(\d+\.\d+\.\d+)\.vsix') {
        $vsixVersion = $matches[1]
        Write-Host "Target version: $vsixVersion" -ForegroundColor Cyan
    }
    
    # Uninstall old version
    Write-Host ""
    if ($currentVersion) {
        $uninstallSuccess = Uninstall-Extension
        if (-not $uninstallSuccess) {
            Write-Host "Warning: Proceeding despite uninstall issues..." -ForegroundColor Yellow
        }
    }
    
    # Clean stale folders
    Write-Host ""
    Clean-StaleFolders
    
    # Install new version
    Write-Host ""
    $installSuccess = Install-Extension -VsixPath $vsixPath
    
    if (-not $installSuccess) {
        Write-Host ""
        Write-Host "Installation failed!" -ForegroundColor Red
        exit 1
    }
    
    # Verify installation
    if (-not $SkipVerification) {
        Write-Host ""
        $verifySuccess = Verify-Installation -ExpectedVersion $vsixVersion
        
        if (-not $verifySuccess) {
            Write-Host ""
            Write-Host "Installation completed but verification failed!" -ForegroundColor Yellow
            Write-Host "Please reload VS Code and check manually." -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Success
    Write-Host ""
    Write-Host "=== Installation Complete ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Reload VS Code window (Ctrl+R or Cmd+R)" -ForegroundColor White
    Write-Host "  2. Open Agent Lee panel from Activity Bar" -ForegroundColor White
    Write-Host "  3. Send a test message: 'Hello, Agent Lee.'" -ForegroundColor White
    Write-Host ""
    Write-Host "For status check, run: .\Get-LeewayVSCodeStatus.ps1" -ForegroundColor Gray
    Write-Host ""
    
    exit 0
    
} catch {
    Write-Host ""
    Write-Host "Fatal error during installation: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}

# Made with Bob
