# ALOE-State.psm1
# Agent Lee Observation Engine - State Assembly Module
# Purpose: Assemble complete system state from all observation modules

function Get-ALOE-State {
    [CmdletBinding()]
    param()
    
    $timestamp = Get-Date -Format "o"
    $pulse = [int]((Get-Date).ToFileTime() / 10000000)
    $observationId = "aloe-obs-$(Get-Date -Format 'yyyyMMdd-HHmmss')-$([guid]::NewGuid().ToString().Substring(0,8))"
    
    $startTime = Get-Date
    
    # Gather all observations
    $monitors = Get-ALOE-Monitors
    $cursor = Get-ALOE-Cursor
    $processes = Get-ALOE-Processes
    
    $duration = (Get-Date) - $startTime
    
    # Assemble state model
    $state = @{
        schema = "leeway.agent-lee.aloe.state.v1"
        timestamp = $timestamp
        pulse = $pulse
        observationId = $observationId
        monitors = $monitors
        cursor = $cursor
        processes = $processes
        metadata = @{
            observationDuration = $duration.TotalSeconds
            detectionErrors = @($monitors.errors) | Where-Object {$_}
            warnings = @()
        }
    }
    
    return $state
}

function Get-ALOE-Cursor {
    [CmdletBinding()]
    param()
    
    $result = @{
        x = 0
        y = 0
        visible = $true
        errors = @()
    }
    
    try {
        $pos = [System.Windows.Forms.Cursor]::Position
        $result.x = $pos.X
        $result.y = $pos.Y
    }
    catch {
        $result.errors += "Cursor detection failed: $($_.Exception.Message)"
    }
    
    return $result
}

function Get-ALOE-Processes {
    [CmdletBinding()]
    param()
    
    $result = @{
        count = 0
        active = "unknown"
        topCpu = @()
        errors = @()
    }
    
    try {
        $allProcesses = Get-Process | Where-Object {$_.CPU -ne $null} | Sort-Object CPU -Descending | Select-Object -First 5
        
        $result.count = (Get-Process).Count
        $result.topCpu = $allProcesses | ForEach-Object {
            @{
                name = $_.ProcessName
                pid = $_.Id
                cpu = [math]::Round($_.CPU, 2)
                memory = $_.WorkingSet64
            }
        }
        
        if ($allProcesses.Count -gt 0) {
            $result.active = $allProcesses[0].ProcessName
        }
    }
    catch {
        $result.errors += "Process detection failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Get-ALOE-State, Get-ALOE-Cursor, Get-ALOE-Processes

# Made with Bob
