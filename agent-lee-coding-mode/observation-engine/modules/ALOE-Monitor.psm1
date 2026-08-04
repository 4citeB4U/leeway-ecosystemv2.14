# ALOE-Monitor.psm1
# Agent Lee Observation Engine - Monitor Detection Module
# Purpose: Robust multi-source monitor detection with fallback chain

function Get-ALOE-Monitors {
    [CmdletBinding()]
    param()
    
    $result = @{
        count = 0
        primary = 0
        bounds = @()
        dpi = @()
        detectionMethod = "UNKNOWN"
        fallbackUsed = $false
        errors = @()
        timestamp = (Get-Date -Format "o")
    }
    
    # Method 1: WinForms.Screen (preferred)
    try {
        Write-Verbose "Attempting WinForms.Screen detection..."
        $screens = [System.Windows.Forms.Screen]::AllScreens
        
        if ($screens -and $screens.Count -gt 0) {
            $result.count = $screens.Count
            $result.bounds = $screens | ForEach-Object {
                @{
                    x = $_.Bounds.X
                    y = $_.Bounds.Y
                    width = $_.Bounds.Width
                    height = $_.Bounds.Height
                }
            }
            $result.dpi = $screens | ForEach-Object { 96 }
            $result.detectionMethod = "WinForms.Screen"
            
            for ($i = 0; $i -lt $screens.Count; $i++) {
                if ($screens[$i].Primary) {
                    $result.primary = $i
                    break
                }
            }
            
            Write-Verbose "✓ WinForms.Screen: $($result.count) monitors detected"
            return $result
        }
    }
    catch {
        $result.errors += "WinForms.Screen failed: $($_.Exception.Message)"
        Write-Verbose "✗ WinForms.Screen failed: $($_.Exception.Message)"
    }
    
    # Method 2: Win32 API fallback
    try {
        Write-Verbose "Attempting Win32 API detection..."
        
        $code = @"
using System;
using System.Runtime.InteropServices;
public class MonitorDetector {
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
    
    public static int GetMonitorCount() {
        return GetSystemMetrics(80);
    }
    
    public static int GetScreenWidth() {
        return GetSystemMetrics(0);
    }
    
    public static int GetScreenHeight() {
        return GetSystemMetrics(1);
    }
}
"@
        
        Add-Type -TypeDefinition $code -ErrorAction Stop
        
        $count = [MonitorDetector]::GetMonitorCount()
        if ($count -gt 0) {
            $result.count = $count
            $result.detectionMethod = "Win32.GetSystemMetrics"
            $result.fallbackUsed = $true
            
            $width = [MonitorDetector]::GetScreenWidth()
            $height = [MonitorDetector]::GetScreenHeight()
            
            $result.bounds = @(
                @{
                    x = 0
                    y = 0
                    width = $width
                    height = $height
                }
            )
            
            Write-Verbose "✓ Win32 API: $count monitors detected"
            return $result
        }
    }
    catch {
        $result.errors += "Win32 API failed: $($_.Exception.Message)"
        Write-Verbose "✗ Win32 API failed: $($_.Exception.Message)"
    }
    
    # Method 3: WMI fallback
    try {
        Write-Verbose "Attempting WMI detection..."
        $monitors = Get-WmiObject -Class Win32_DesktopMonitor -ErrorAction Stop
        
        if ($monitors) {
            $result.count = @($monitors).Count
            $result.detectionMethod = "WMI.Win32_DesktopMonitor"
            $result.fallbackUsed = $true
            
            Write-Verbose "✓ WMI: $($result.count) monitors detected"
            return $result
        }
    }
    catch {
        $result.errors += "WMI failed: $($_.Exception.Message)"
        Write-Verbose "✗ WMI failed: $($_.Exception.Message)"
    }
    
    $result.detectionMethod = "FAILED"
    Write-Warning "All monitor detection methods failed"
    return $result
}

Export-ModuleMember -Function Get-ALOE-Monitors

# Made with Bob
