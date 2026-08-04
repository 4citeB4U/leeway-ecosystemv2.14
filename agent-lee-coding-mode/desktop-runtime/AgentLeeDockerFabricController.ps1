$ErrorActionPreference = "Stop"

<#
.SYNOPSIS
Agent Lee Docker Fabric Controller - Loads and manages the Docker endpoint registry

.DESCRIPTION
Loads the canonical Docker endpoint registry and uses it to route commands through Agent Lee's
service fabric. Does not rediscover ports; uses the exported registry as source of truth.

.REQUIRES
Docker endpoint registry JSON at:
C:\Users\Leona\LeeWay-Runtime\docker-fabric\state\agentlee-docker-endpoint-registry.json
#>

param(
    [string]$Mode = "load"
)

# Paths
$RuntimeRoot = "C:\Users\Leona\LeeWay-Runtime"
$RegistryPath = Join-Path $RuntimeRoot "docker-fabric\state\agentlee-docker-endpoint-registry.json"
$StateOutputPath = Join-Path $RuntimeRoot "docker-fabric\state\agentlee-os-shell-state.json"
$ReceiptDir = Join-Path $RuntimeRoot "Archive\receipts\agent-lee-full-desktop-os"

New-Item -ItemType Directory -Force -Path (Split-Path $StateOutputPath) | Out-Null
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

# ============================================================
# LOAD REGISTRY
# ============================================================

function Load-DockerEndpointRegistry {
    param([string]$RegistryPath)
    
    if (-not (Test-Path $RegistryPath)) {
        throw "Registry not found: $RegistryPath"
    }
    
    try {
        $registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json
        
        if (-not $registry.services) {
            throw "Registry missing services key"
        }
        
        Write-Host "✓ Docker endpoint registry loaded" -ForegroundColor Green
        Write-Host "  Services: $($registry.services.Count)" -ForegroundColor Cyan
        
        # Verify all required services are accessible
        $missingHealth = @()
        $healthyServices = @()
        
        foreach ($service in $registry.services) {
            if ($service.requiredForAgentLeeOS -eq $true) {
                $healthUrl = $service.healthyHttpUrl
                if ($healthUrl) {
                    try {
                        $response = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 2 -ErrorAction SilentlyContinue
                        if ($response.StatusCode -eq 200) {
                            $healthyServices += $service.key
                        } else {
                            $missingHealth += $service.key
                        }
                    } catch {
                        $missingHealth += $service.key
                    }
                }
            }
        }
        
        Write-Host ""
        Write-Host "Required services health check:" -ForegroundColor Cyan
        Write-Host "  Healthy: $($healthyServices.Count)" -ForegroundColor Green
        Write-Host "  Unhealthy: $($missingHealth.Count)" -ForegroundColor $(if ($missingHealth.Count -eq 0) { "Green" } else { "Yellow" })
        
        if ($missingHealth.Count -gt 0) {
            Write-Host "  Missing: $($missingHealth -join ', ')" -ForegroundColor Yellow
        }
        
        return $registry
    }
    catch {
        Write-Host "✗ Failed to load registry: $_" -ForegroundColor Red
        throw
    }
}

# ============================================================
# WRITE OS SHELL STATE
# ============================================================

function Write-OSShellState {
    param(
        [object]$Registry,
        [string]$OutputPath
    )
    
    $state = [ordered]@{
        timestamp = Get-Date -Format "o"
        status = "AGENTLEE_OS_SHELL_LOADED"
        registryPath = $RegistryPath
        registryVersion = $Registry.registryVersion
        totalServices = $Registry.services.Count
        requiredServices = @($Registry.services | Where-Object { $_.requiredForAgentLeeOS -eq $true } | Select-Object -ExpandProperty key)
        serviceMap = @{}
    }
    
    # Build service map for quick lookup
    foreach ($service in $Registry.services) {
        $state.serviceMap[$service.key] = @{
            displayName = $service.displayName
            baseUrl = $service.baseUrl
            healthyUrl = $service.healthyHttpUrl
            role = $service.role
            required = $service.requiredForAgentLeeOS
        }
    }
    
    $state | ConvertTo-Json -Depth 10 | Set-Content $OutputPath -Encoding UTF8
    
    Write-Host "✓ OS shell state written" -ForegroundColor Green
    Write-Host "  Path: $OutputPath" -ForegroundColor Cyan
}

# ============================================================
# ROUTE COMMAND
# ============================================================

function Route-Command {
    param(
        [object]$Registry,
        [string]$Command,
        [hashtable]$Context = @{}
    )
    
    # Parse command intent
    $intent = Parse-CommandIntent -Command $Command
    
    Write-Host ""
    Write-Host "ROUTING COMMAND" -ForegroundColor Cyan
    Write-Host "  Command: $Command" -ForegroundColor Yellow
    Write-Host "  Intent: $($intent.category)" -ForegroundColor Cyan
    Write-Host "  Service: $($intent.targetService)" -ForegroundColor Cyan
    Write-Host ""
    
    # Route to appropriate service
    switch ($intent.category) {
        "voice" {
            # Route to XTTS voice kernel only - no fallback
            $service = $Registry.services | Where-Object { $_.key -eq "voiceKernel" }
            if ($service) {
                return @{
                    route = "voice"
                    service = $service.key
                    endpoint = $service.baseUrl
                    action = "speak"
                    text = $intent.text
                }
            }
        }
        "vision" {
            # Route to vision kernel
            $service = $Registry.services | Where-Object { $_.key -eq "visionKernel" }
            if ($service) {
                return @{
                    route = "vision"
                    service = $service.key
                    endpoint = $service.baseUrl
                    action = "snapshot"
                }
            }
        }
        "hearing" {
            # Route to ears kernel
            $service = $Registry.services | Where-Object { $_.key -eq "earsKernel" }
            if ($service) {
                return @{
                    route = "hearing"
                    service = $service.key
                    endpoint = $service.baseUrl
                    action = "listen"
                }
            }
        }
        "action" {
            # Route through desktop runtime or runtime fabric
            $service = $Registry.services | Where-Object { $_.key -eq "desktopRuntime" }
            if ($service) {
                return @{
                    route = "action"
                    service = $service.key
                    endpoint = $service.baseUrl
                    action = $intent.action
                }
            }
        }
        default {
            # Route unknown commands through agent fabric
            $service = $Registry.services | Where-Object { $_.key -eq "runtimeFabric" }
            if ($service) {
                return @{
                    route = "brain"
                    service = $service.key
                    endpoint = $service.baseUrl
                    action = "route"
                    nextHops = @("agentCenter", "workerCenter", "mcpCenter", "ollama")
                }
            }
        }
    }
    
    return $null
}

# ============================================================
# PARSE COMMAND INTENT
# ============================================================

function Parse-CommandIntent {
    param([string]$Command)
    
    $commandLower = $Command.ToLower()
    
    # Determine category and action
    $category = "unknown"
    $action = $null
    $text = $null
    
    if ($commandLower -match "speak|say|voice|tell") {
        $category = "voice"
        $text = $Command -replace "^.*(speak|say|tell)\s+", ""
    }
    elseif ($commandLower -match "see|look|camera|vision|snapshot") {
        $category = "vision"
        $action = "snapshot"
    }
    elseif ($commandLower -match "hear|listen|inbox|command") {
        $category = "hearing"
        $action = "listen"
    }
    elseif ($commandLower -match "open|click|move|type|app|cursor|desktop") {
        $category = "action"
        if ($commandLower -match "open") { $action = "open-app" }
        elseif ($commandLower -match "click") { $action = "click" }
        elseif ($commandLower -match "move") { $action = "move-cursor" }
        elseif ($commandLower -match "type") { $action = "type-text" }
    }
    else {
        $category = "brain"
        $action = "route"
    }
    
    return @{
        category = $category
        action = $action
        text = $text
        targetService = if ($category -eq "voice") { "voiceKernel" } `
                       elseif ($category -eq "vision") { "visionKernel" } `
                       elseif ($category -eq "hearing") { "earsKernel" } `
                       elseif ($category -eq "action") { "desktopRuntime" } `
                       else { "runtimeFabric" }
    }
}

# ============================================================
# WRITE RECEIPT
# ============================================================

function Write-Receipt {
    param(
        [string]$Action,
        [hashtable]$Data,
        [string]$Status
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $receiptFileName = "agent-lee-docker-fabric-$Action-$timestamp.json"
    $receiptPath = Join-Path $ReceiptDir $receiptFileName
    
    $receipt = [ordered]@{
        timestamp = Get-Date -Format "o"
        action = $Action
        status = $Status
        data = $Data
        receiptPath = $receiptPath
    }
    
    $receipt | ConvertTo-Json -Depth 10 | Set-Content $receiptPath -Encoding UTF8
    
    return $receiptPath
}

# ============================================================
# MAIN EXECUTION
# ============================================================

switch ($Mode) {
    "load" {
        Write-Host ""
        Write-Host "AGENT LEE DOCKER FABRIC CONTROLLER" -ForegroundColor Cyan
        Write-Host "Mode: Load Registry" -ForegroundColor Cyan
        Write-Host ""
        
        try {
            $registry = Load-DockerEndpointRegistry -RegistryPath $RegistryPath
            Write-OSShellState -Registry $registry -OutputPath $StateOutputPath
            
            $receiptPath = Write-Receipt -Action "registry-load" -Data @{
                registryPath = $RegistryPath
                servicesLoaded = $registry.services.Count
            } -Status "SUCCESS"
            
            Write-Host ""
            Write-Host "✓ CONTROLLER READY" -ForegroundColor Green
            Write-Host "  Receipt: $receiptPath" -ForegroundColor Cyan
        }
        catch {
            Write-Host ""
            Write-Host "✗ CONTROLLER FAILED: $_" -ForegroundColor Red
            Write-Receipt -Action "registry-load" -Data @{ error = $_.Exception.Message } -Status "FAILED"
            exit 1
        }
    }
    
    "route" {
        # Route a command through the fabric
        $command = $args[0]
        if (-not $command) {
            Write-Host "Usage: $($MyInvocation.MyCommand.Name) route '<command>'" -ForegroundColor Yellow
            exit 1
        }
        
        $registry = Load-DockerEndpointRegistry -RegistryPath $RegistryPath
        $route = Route-Command -Registry $registry -Command $command
        
        if ($route) {
            $route | ConvertTo-Json | Write-Host -ForegroundColor Cyan
        }
        else {
            Write-Host "✗ No route found for command" -ForegroundColor Red
            exit 1
        }
    }
    
    "verify" {
        # Verify all required services
        Write-Host ""
        Write-Host "VERIFYING DOCKER FABRIC" -ForegroundColor Cyan
        Write-Host ""
        
        $registry = Load-DockerEndpointRegistry -RegistryPath $RegistryPath
        
        Write-Host "Service endpoints:" -ForegroundColor Cyan
        foreach ($service in $registry.services | Where-Object { $_.requiredForAgentLeeOS -eq $true }) {
            $statusUrl = $service.healthyHttpUrl
            try {
                $response = Invoke-WebRequest -Uri $statusUrl -TimeoutSec 2 -ErrorAction SilentlyContinue
                $status = if ($response.StatusCode -eq 200) { "✓ OK" } else { "✗ HTTP $($response.StatusCode)" }
                Write-Host "  $($service.key): $status" -ForegroundColor Green
            }
            catch {
                Write-Host "  $($service.key): ✗ UNREACHABLE" -ForegroundColor Red
            }
        }
    }
    
    default {
        Write-Host "Usage: $($MyInvocation.MyCommand.Name) <load|route|verify>" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Modes:" -ForegroundColor Cyan
        Write-Host "  load   - Load Docker registry and write OS shell state" -ForegroundColor Gray
        Write-Host "  route  - Route a command through Docker fabric" -ForegroundColor Gray
        Write-Host "  verify - Verify all required services" -ForegroundColor Gray
    }
}
