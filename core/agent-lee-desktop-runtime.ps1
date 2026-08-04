<#
.SYNOPSIS
    Agent Lee Desktop Runtime (ALDR) - Persistent Autonomous System
.DESCRIPTION
    Continuous runtime loop with Seafile-backed persistent memory
    Repository ID: 3b990071-3f8f-44fb-be91-a76b23510eba
.NOTES
    Schema: agent-lee-desktop-runtime-v1
    This is NOT a chatbot. This is a persistent desktop runtime system.
#>

[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Status
)

$ErrorActionPreference = "Continue"
$Root = "D:\Leeway-Ecosystem v2.1.4"

# Discovery helpers (discovery-first lookups)
$DiscoveryModule = Join-Path $Root "agent-lee-coding-mode\tools\discovery.ps1"
if (Test-Path $DiscoveryModule) {
    try {
        . $DiscoveryModule
        Write-Host "[DISCOVERY] Loaded discovery helpers from $DiscoveryModule" -ForegroundColor Cyan
    } catch {
        Write-Host "[DISCOVERY] Failed to load discovery helpers: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[DISCOVERY] Discovery helpers not found at $DiscoveryModule" -ForegroundColor Yellow
}

# ============================================================================
# CONFIGURATION
# ============================================================================

$Config = @{
    SeafileUrl = "http://127.0.0.1:8082"
    RepoId = "3b990071-3f8f-44fb-be91-a76b23510eba"
    AdminEmail = "admin@leeway.local"
    AdminPassword = "leeway-admin-2026"
    HeartbeatInterval = 5  # seconds
    RetryAttempts = 3
    RetryDelay = 2  # seconds
}

$Identity = @{
    AgentId = "agent-lee"
    AgentMode = "desktop-runtime"
    Role = "persistent-autonomous-system"
    CanonicalFingerprint = "leeway.agent-lee.desktop-runtime.v1"
}

# ============================================================================
# SEAFILE API FUNCTIONS
# ============================================================================

function Get-SeafileToken {
    param([int]$Attempt = 1)
    
    try {
        $Response = Invoke-RestMethod `
            -Uri "$($Config.SeafileUrl)/api2/auth-token/" `
            -Method Post `
            -Body @{
                username = $Config.AdminEmail
                password = $Config.AdminPassword
            } `
            -TimeoutSec 10
        
        return $Response.token
    }
    catch {
        if ($Attempt -lt $Config.RetryAttempts) {
            Start-Sleep -Seconds $Config.RetryDelay
            return Get-SeafileToken -Attempt ($Attempt + 1)
        }
        throw "Failed to authenticate after $($Config.RetryAttempts) attempts: $_"
    }
}

function Write-SeafileFile {
    param(
        [string]$Path,
        [string]$Content,
        [hashtable]$Headers,
        [int]$Attempt = 1
    )
    
    try {
        # Get upload link
        $UploadLink = Invoke-RestMethod `
            -Uri "$($Config.SeafileUrl)/api2/repos/$($Config.RepoId)/upload-link/" `
            -Method Get `
            -Headers $Headers `
            -TimeoutSec 10
        
        # Create temp file
        $TempFile = Join-Path $env:TEMP "aldr-$(Get-Random).json"
        $Content | Set-Content -Path $TempFile -Encoding UTF8
        
        # Extract directory and filename
        $ParentDir = Split-Path $Path -Parent
        if ([string]::IsNullOrEmpty($ParentDir)) { $ParentDir = "/" }
        # (filename is embedded in the temp file upload; parent_dir is the relevant field)
        
        # Upload file
        $Form = @{
            file = Get-Item $TempFile
            parent_dir = $ParentDir
            replace = "1"
        }
        
        Invoke-RestMethod `
            -Uri $UploadLink `
            -Method Post `
            -Headers $Headers `
            -Form $Form `
            -TimeoutSec 10 | Out-Null
        
        Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
        return $true
    }
    catch {
        Remove-Item $TempFile -Force -ErrorAction SilentlyContinue
        
        if ($Attempt -lt $Config.RetryAttempts) {
            Start-Sleep -Seconds $Config.RetryDelay
            return Write-SeafileFile -Path $Path -Content $Content -Headers $Headers -Attempt ($Attempt + 1)
        }
        throw "Failed to write file after $($Config.RetryAttempts) attempts: $_"
    }
}

function Read-SeafileFile {
    param(
        [string]$Path,
        [hashtable]$Headers,
        [int]$Attempt = 1
    )
    
    try {
        $EncodedPath = [System.Web.HttpUtility]::UrlEncode($Path)
        $null = Invoke-RestMethod `
            -Uri "$($Config.SeafileUrl)/api2/repos/$($Config.RepoId)/file/detail/?p=$EncodedPath" `
            -Method Get `
            -Headers $Headers `
            -TimeoutSec 10
        
        $DownloadLink = Invoke-RestMethod `
            -Uri "$($Config.SeafileUrl)/api2/repos/$($Config.RepoId)/file/?p=$EncodedPath" `
            -Method Get `
            -Headers $Headers `
            -TimeoutSec 10
        
        $Content = Invoke-RestMethod `
            -Uri $DownloadLink `
            -Method Get `
            -TimeoutSec 10
        
        return $Content
    }
    catch {
        if ($Attempt -lt $Config.RetryAttempts) {
            Start-Sleep -Seconds $Config.RetryDelay
            return Read-SeafileFile -Path $Path -Headers $Headers -Attempt ($Attempt + 1)
        }
        return $null
    }
}

function Write-RuntimeLog {
    param(
        [string]$Category,
        [string]$Message,
        [hashtable]$Headers,
        [string]$Level = "INFO"
    )
    
    $LogEntry = @{
        timestamp = Get-Date -Format "o"
        level = $Level
        category = $Category
        message = $Message
        agentId = $Identity.AgentId
    }
    
    $LogJson = $LogEntry | ConvertTo-Json -Compress
    
    # Write to local log
    $LocalLogDir = Join-Path $Root "Logs\desktop-runtime"
    New-Item -Path $LocalLogDir -ItemType Directory -Force | Out-Null
    $LocalLogFile = Join-Path $LocalLogDir "runtime-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $LocalLogFile -Value $LogJson
    
    # Write to Seafile (async, don't block on failure)
    try {
        $LogPath = "/logs/$Category/$(Get-Date -Format 'yyyyMMdd').jsonl"
        Write-SeafileFile -Path $LogPath -Content $LogJson -Headers $Headers -ErrorAction SilentlyContinue
    }
    catch {
        # Log write failure is not fatal
    }
}

# ============================================================================
# BOOT SEQUENCE
# ============================================================================

function Start-RuntimeBoot {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  AGENT LEE DESKTOP RUNTIME (ALDR)" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Boot Sequence Initiated..." -ForegroundColor Yellow
    Write-Host ""
    
    # Step 1: Authenticate
    Write-Host "[1/6] Authenticating to Seafile..." -ForegroundColor Cyan
    try {
        $Token = Get-SeafileToken
        $Headers = @{ Authorization = "Token $Token" }
        Write-Host "      [+] Authenticated" -ForegroundColor Green
    }
    catch {
        Write-Host "      [-] FATAL: Authentication failed" -ForegroundColor Red
        Write-Host "      Error: $_" -ForegroundColor Red
        return $null
    }
    
    # Step 2: Verify repository
    Write-Host "[2/6] Verifying repository access..." -ForegroundColor Cyan
    try {
        $Repos = Invoke-RestMethod `
            -Uri "$($Config.SeafileUrl)/api2/repos/" `
            -Method Get `
            -Headers $Headers `
            -TimeoutSec 10
        
        $Repo = $Repos | Where-Object { $_.id -eq $Config.RepoId }
        if ($Repo) {
            Write-Host "      [+] Repository accessible: $($Repo.name)" -ForegroundColor Green
        }
        else {
            throw "Repository not found"
        }
    }
    catch {
        Write-Host "      [-] FATAL: Repository verification failed" -ForegroundColor Red
        return $null
    }
    
    # Step 3: Read core identity
    Write-Host "[3/6] Loading core identity..." -ForegroundColor Cyan
    $CoreIdentityPath = "/core-memory/identity/agent-identity.json"
    $CoreIdentity = Read-SeafileFile -Path $CoreIdentityPath -Headers $Headers
    
    if ($CoreIdentity) {
        Write-Host "      [+] Identity loaded" -ForegroundColor Green
    }
    else {
        Write-Host "      [*] Identity not found, will create" -ForegroundColor Yellow
    }
    
    # Step 4: Load working context
    Write-Host "[4/6] Loading working context..." -ForegroundColor Cyan
    $ContextPath = "/working/current-context/runtime-context.json"
    $Context = Read-SeafileFile -Path $ContextPath -Headers $Headers
    
    if ($Context) {
        Write-Host "      [+] Context loaded" -ForegroundColor Green
    }
    else {
        Write-Host "      [*] No previous context" -ForegroundColor Yellow
        $Context = @{
            lastBoot = Get-Date -Format "o"
            sessionId = [guid]::NewGuid().ToString()
        }
    }
    
    # Step 5: Write runtime status
    Write-Host "[5/6] Writing runtime status..." -ForegroundColor Cyan
    $RuntimeStatus = @{
        status = "ONLINE"
        agentId = $Identity.AgentId
        agentMode = $Identity.AgentMode
        bootedAt = Get-Date -Format "o"
        sessionId = $Context.sessionId
        repoId = $Config.RepoId
        heartbeat = Get-Date -Format "o"
    }
    
    $StatusJson = $RuntimeStatus | ConvertTo-Json -Depth 10
    try {
        Write-SeafileFile -Path "/working/current-context/runtime-status.json" -Content $StatusJson -Headers $Headers
        Write-Host "      [+] Status written" -ForegroundColor Green
    }
    catch {
        Write-Host "      [-] WARNING: Failed to write status" -ForegroundColor Yellow
    }
    
    # Step 6: Log boot event
    Write-Host "[6/6] Logging boot event..." -ForegroundColor Cyan
    Write-RuntimeLog -Category "execution" -Message "Runtime boot completed" -Headers $Headers -Level "INFO"
    Write-Host "      [+] Boot logged" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  RUNTIME ONLINE" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host ""
    
    return @{
        Token = $Token
        Headers = $Headers
        Context = $Context
        Status = $RuntimeStatus
    }
}

# ============================================================================
# RUNTIME LOOP
# ============================================================================

function Start-RuntimeLoop {
    param([hashtable]$BootState)
    
    $Headers = $BootState.Headers
    $Context = $BootState.Context
    $LoopCount = 0
    
    Write-Host "Entering runtime loop..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        $LoopCount++
        # Loop iteration start (timing tracked via heartbeat timestamp)
        
        try {
            # 1. Update heartbeat
            $RuntimeStatus = @{
                status = "ONLINE"
                agentId = $Identity.AgentId
                heartbeat = Get-Date -Format "o"
                loopCount = $LoopCount
                sessionId = $Context.sessionId
            }
            
            $StatusJson = $RuntimeStatus | ConvertTo-Json -Compress
            Write-SeafileFile -Path "/working/current-context/runtime-status.json" -Content $StatusJson -Headers $Headers -ErrorAction SilentlyContinue
            
            # 2. Check for tasks (placeholder - extend this)
            # Future: Read from /working/active-tasks/
            
            # 3. Log heartbeat (every 10 loops)
            if ($LoopCount % 10 -eq 0) {
                Write-RuntimeLog -Category "execution" -Message "Heartbeat: Loop $LoopCount" -Headers $Headers -Level "INFO"
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Heartbeat: Loop $LoopCount" -ForegroundColor Green
            }
            
            # 4. Sleep
            Start-Sleep -Seconds $Config.HeartbeatInterval
        }
        catch {
            Write-RuntimeLog -Category "errors" -Message "Loop error: $_" -Headers $Headers -Level "ERROR"
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERROR: $_" -ForegroundColor Red
            Start-Sleep -Seconds $Config.HeartbeatInterval
        }
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if ($Install) {
    Write-Host "Installing Agent Lee Desktop Runtime as Windows service..." -ForegroundColor Yellow
    Write-Host "This feature requires the Initialize-AgentLee-Memory-System-Fixed.ps1 script first" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

if ($Uninstall) {
    Write-Host "Uninstalling Agent Lee Desktop Runtime..." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

if ($Status) {
    Write-Host "Checking Agent Lee Desktop Runtime status..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $Token = Get-SeafileToken
        $Headers = @{ Authorization = "Token $Token" }
        
        $Status = Read-SeafileFile -Path "/working/current-context/runtime-status.json" -Headers $Headers
        
        if ($Status) {
            $StatusObj = $Status | ConvertFrom-Json
            Write-Host "Status:    $($StatusObj.status)" -ForegroundColor Green
            Write-Host "Agent ID:  $($StatusObj.agentId)" -ForegroundColor Cyan
            Write-Host "Heartbeat: $($StatusObj.heartbeat)" -ForegroundColor Cyan
            Write-Host "Loop:      $($StatusObj.loopCount)" -ForegroundColor Cyan
        }
        else {
            Write-Host "Status: OFFLINE" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Status: UNKNOWN" -ForegroundColor Yellow
        Write-Host "Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
    exit 0
}

# Default: Start runtime
$BootState = Start-RuntimeBoot

if ($BootState) {
    Start-RuntimeLoop -BootState $BootState
}
else {
    Write-Host ""
    Write-Host "FATAL: Boot sequence failed" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Made with Bob
