# ALOE-Screen.psm1
# Agent Lee Observation Engine - Screen Capture Module
# Purpose: Capture screen content for vision analysis

function Capture-ALOE-Screen {
    [CmdletBinding()]
    param(
        [string]$OutputPath = ".",
        [int]$MonitorIndex = 0,
        [switch]$AllMonitors
    )
    
    $result = @{
        success = $false
        screenshots = @()
        timestamp = (Get-Date -Format "o")
        error = $null
    }
    
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $screens = [System.Windows.Forms.Screen]::AllScreens
        
        if ($AllMonitors) {
            $monitorsToCapture = $screens
        } else {
            $monitorsToCapture = @($screens[$MonitorIndex])
        }
        
        foreach ($screen in $monitorsToCapture) {
            $bounds = $screen.Bounds
            $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            
            $graphics.CopyFromScreen(
                $bounds.Location,
                [System.Drawing.Point]::Empty,
                $bounds.Size
            )
            
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
            $filename = "screen-capture-$timestamp.png"
            $filepath = Join-Path $OutputPath $filename
            
            $bitmap.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
            
            $result.screenshots += @{
                path = $filepath
                width = $bounds.Width
                height = $bounds.Height
                x = $bounds.X
                y = $bounds.Y
            }
            
            $graphics.Dispose()
            $bitmap.Dispose()
        }
        
        $result.success = $true
        Write-Verbose "Captured $($result.screenshots.Count) screenshots"
        
    } catch {
        $result.error = $_.Exception.Message
        Write-Error "Screen capture failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Capture-ALOE-Screen
