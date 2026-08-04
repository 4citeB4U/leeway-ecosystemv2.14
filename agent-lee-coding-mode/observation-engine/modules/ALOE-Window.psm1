# ALOE-Window.psm1
# Agent Lee Observation Engine - Window Detection Module
# Purpose: Detect and track active windows

Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;
    
    public class WindowHelper {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }
    }
"@

function Get-ALOE-ActiveWindow {
    [CmdletBinding()]
    param()
    
    $result = @{
        success = $false
        window = $null
        timestamp = (Get-Date -Format "o")
        error = $null
    }
    
    try {
        $hwnd = [WindowHelper]::GetForegroundWindow()
        
        if ($hwnd -eq [IntPtr]::Zero) {
            throw "No active window found"
        }
        
        # Get window title
        $title = New-Object System.Text.StringBuilder 256
        $null = [WindowHelper]::GetWindowText($hwnd, $title, $title.Capacity)
        
        # Get process ID
        $processId = 0
        $null = [WindowHelper]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        
        # Get process info
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        # Get window bounds
        $rect = New-Object WindowHelper+RECT
        $null = [WindowHelper]::GetWindowRect($hwnd, [ref]$rect)
        
        $result.window = @{
            handle = $hwnd.ToInt64()
            title = $title.ToString()
            processId = $processId
            processName = $process.ProcessName
            bounds = @{
                left = $rect.Left
                top = $rect.Top
                right = $rect.Right
                bottom = $rect.Bottom
                width = $rect.Right - $rect.Left
                height = $rect.Bottom - $rect.Top
            }
        }
        
        $result.success = $true
        Write-Verbose "Active window: $($result.window.title)"
        
    } catch {
        $result.error = $_.Exception.Message
        Write-Error "Window detection failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Get-ALOE-ActiveWindow
