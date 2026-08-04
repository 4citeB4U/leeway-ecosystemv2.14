# ============================================================
# Start-AgentLeeHybridAutonomicFabricV17.ps1
#
# Agent Lee Hybrid Autonomic Fabric Live Worker
#
# True topology:
# - Agent Lee: agent_lee_code_mode / agent-lee / 8080
# - Runtime Fabric: leeway_runtime_fabric / runtime-fabric / 4001,8111
# - Ollama: leeway_ollama / ollama / 11434
#
# Safe:
# - no Docker build
# - no Docker restart
# - no Docker stop
# - no model retraining
# - no unknown MCP autostart
# ============================================================

param(
    [string]$Root = "D:\Leeway-Ecosystem v2.1.4",
    [int]$IntervalSeconds = 30,
    [int]$AdvisorEveryCycles = 4
)

$ErrorActionPreference = "Continue"

$ScriptDir = Join-Path $Root "scripts"
$DiscoveryDir = Join-Path $Root "agent-lee-coding-mode\discovery-layer"
$RuntimeDir = Join-Path $Root "agent-lee-coding-mode\runtime-fabric"
$DesktopDir = Join-Path $Root "agent-lee-coding-mode\desktop-runtime"
$LearningDir = Join-Path $Root "agent-lee-coding-mode\learning-development"
$ArchiveDir = Join-Path $Root "Archive"
$ProofRoot = Join-Path $ArchiveDir "proofs\agent-lee-hybrid-fabric-v17-4-current"
$LogDir = Join-Path $ProofRoot "logs"
$SnapshotDir = Join-Path $ProofRoot "snapshots"

foreach ($d in @(
    $DiscoveryDir,
    $RuntimeDir,
    $DesktopDir,
    $LearningDir,
    "$LearningDir\events",
    "$LearningDir\llm-advisor",
    $ProofRoot,
    $LogDir,
    $SnapshotDir
)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$StatePath = Join-Path $DiscoveryDir "AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_STATE.json"
$RegistryPath = Join-Path $DiscoveryDir "AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_REGISTRY.json"
$TopologyPath = Join-Path $DiscoveryDir "AGENT_LEE_CONTAINER_TOPOLOGY.json"
$RuntimeMirrorPath = Join-Path $RuntimeDir "AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_STATE.json"
$DesktopMirrorPath = Join-Path $DesktopDir "AGENT_LEE_HYBRID_AUTONOMIC_FABRIC_STATE.json"
$LearningJournalPath = Join-Path $LearningDir "events\agent-lee-hybrid-learning-events.jsonl"
$LatestAdvicePath = Join-Path $LearningDir "llm-advisor\latest-qwen-advisor-proof.json"
$WorkerLogPath = Join-Path $LogDir "hybrid-worker-events.jsonl"

$cycle = 0

function Write-JsonFile {
    param([string]$Path, $Object, [int]$Depth = 80)

    try {
        if ($Depth -gt 100) { $Depth = 100 }

        $parent = Split-Path -Parent $Path
        if (-not (Test-Path $parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }

        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        $json = $Object | ConvertTo-Json -Depth $Depth
        [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
        return $true
    } catch {
        return $false
    }
}

function Add-JsonLine {
    param([string]$Path, $Object)

    try {
        $line = $Object | ConvertTo-Json -Compress -Depth 80
        Add-Content -Path $Path -Value $line -Encoding UTF8
    } catch {}
}

function Invoke-GetSafe {
    param([string]$Uri, [int]$TimeoutSec = 8)

    try {
        return Invoke-RestMethod -Uri $Uri -TimeoutSec $TimeoutSec
    } catch {
        return [ordered]@{
            status = "BLOCKED"
            error = $_.Exception.Message
        }
    }
}

function Invoke-PostJsonSafe {
    param(
        [string]$Uri,
        $Body,
        [int]$TimeoutSec = 60
    )

    try {
        $json = $Body | ConvertTo-Json -Depth 60
        return Invoke-RestMethod -Uri $Uri -Method POST -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
    } catch {
        return [ordered]@{
            status = "BLOCKED"
            error = $_.Exception.Message
        }
    }
}

function Inspect-Container {
    param([string]$Name)

    try {
        $raw = docker inspect $Name 2>$null

        if (-not $raw) {
            return [ordered]@{
                name = $Name
                exists = $false
                running = $false
                status = "MISSING"
            }
        }

        $c = ($raw | ConvertFrom-Json)[0]

        $aliases = @()
        try {
            foreach ($netName in $c.NetworkSettings.Networks.PSObject.Properties.Name) {
                $net = $c.NetworkSettings.Networks.$netName
                foreach ($a in $net.Aliases) { $aliases += [string]$a }
            }
        } catch {}

        return [ordered]@{
            name = ([string]$c.Name).TrimStart("/")
            exists = $true
            running = [bool]$c.State.Running
            status = [string]$c.State.Status
            health = if ($c.State.Health) { [string]$c.State.Health.Status } else { "" }
            oomKilledHistory = [bool]$c.State.OOMKilled
            image = [string]$c.Config.Image
            id = [string]$c.Id
            shortId = ([string]$c.Id).Substring(0,12)
            composeProject = [string]$c.Config.Labels."com.docker.compose.project"
            composeService = [string]$c.Config.Labels."com.docker.compose.service"
            networkMode = [string]$c.HostConfig.NetworkMode
            aliases = @($aliases | Select-Object -Unique)
            ports = $c.NetworkSettings.Ports
            env = $c.Config.Env
        }
    } catch {
        return [ordered]@{
            name = $Name
            exists = $false
            running = $false
            status = "CHECK_REQUIRED"
            error = $_.Exception.Message
        }
    }
}

function Test-ReadyEndpoint {
    param([string]$Name, [string]$Url)

    $probe = Invoke-GetSafe $Url 8
    $ready = $false

    if ($probe.status -eq "READY" -or $probe.kernel -or $probe.version -or $probe.models) {
        $ready = $true
    } elseif ($probe.status -ne "BLOCKED" -and ($Name -match "agent|runtime")) {
        $ready = $true
    }

    return [ordered]@{
        name = $Name
        url = $Url
        ready = $ready
        status = if ($ready) { "READY" } else { "CHECK_REQUIRED" }
        response = $probe
    }
}

function Invoke-QwenAdvisorProof {
    param(
        [string]$Model = "qwen2.5-coder:7b"
    )

    $body = [ordered]@{
        model = $Model
        prompt = "Return only this exact JSON: {`"advisorStatus`":`"READY`",`"role`":`"ADVISORY_PROCESSOR_NOT_CONTROLLER`"}"
        stream = $false
        keep_alive = "10m"
        options = [ordered]@{
            temperature = 0
            num_predict = 64
        }
    }

    return Invoke-PostJsonSafe "http://127.0.0.1:11434/api/generate" $body 90
}

while ($true) {
    $cycle++
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $now = (Get-Date).ToUniversalTime().ToString("o")

    $agent = Inspect-Container "agent_lee_code_mode"
    $runtime = Inspect-Container "leeway_runtime_fabric"
    $ollama = Inspect-Container "leeway_ollama"

    $agentHealth = Test-ReadyEndpoint "agent-lee-health" "http://127.0.0.1:8080/health"
    $agentRoot = Test-ReadyEndpoint "agent-lee-root" "http://127.0.0.1:8080"

    $runtimeHealth = Test-ReadyEndpoint "runtime-fabric-health" "http://127.0.0.1:4001/health"
    $runtimeRoot = Test-ReadyEndpoint "runtime-fabric-root" "http://127.0.0.1:4001"
    $runtimeAux = Test-ReadyEndpoint "runtime-fabric-aux-8111" "http://127.0.0.1:8111"

    $ollamaRoot = Test-ReadyEndpoint "ollama-root" "http://127.0.0.1:11434"
    $ollamaTags = Test-ReadyEndpoint "ollama-tags" "http://127.0.0.1:11434/api/tags"

    $qwenModels = @()
    try {
        foreach ($m in $ollamaTags.response.models) {
            $name = [string]$m.name
            if ($name -match "qwen") {
                $qwenModels += $name
            }
        }
    } catch {}

    $advisorStatus = "SKIPPED_THIS_CYCLE"
    $advisorProof = $null

    if (($cycle % $AdvisorEveryCycles) -eq 0) {
        $targetModel = if ($qwenModels -contains "qwen2.5-coder:7b") { "qwen2.5-coder:7b" } elseif ($qwenModels.Count -gt 0) { $qwenModels[0] } else { "" }

        if ($targetModel) {
            $advisorProof = Invoke-QwenAdvisorProof -Model $targetModel

            if ($advisorProof.status -eq "BLOCKED") {
                $advisorStatus = "LLM_ADVISOR_BLOCKED"
            } else {
                $advisorStatus = "LLM_ADVISOR_READY"
            }
        } else {
            $advisorStatus = "QWEN_MODEL_CHECK_REQUIRED"
        }
    }

    $checks = [ordered]@{
        agentLeeContainerRunning = [bool]$agent.running
        runtimeFabricContainerRunning = [bool]$runtime.running
        ollamaContainerRunning = [bool]$ollama.running
        ollamaContainerHealthy = ($ollama.health -eq "healthy" -or $ollama.health -eq "")
        agentLeeEndpointReady = [bool]($agentHealth.ready -or $agentRoot.ready)
        runtimeFabricEndpointReady = [bool]($runtimeHealth.ready -or $runtimeRoot.ready)
        ollamaEndpointReady = [bool]($ollamaTags.ready -or $ollamaRoot.ready)
        qwenModelAvailable = [bool]($qwenModels.Count -gt 0)
        hybridWorkerRunning = $true
    }

    $blocking = @()
    foreach ($k in $checks.Keys) {
        if ($checks[$k] -eq $false) {
            $blocking += $k
        }
    }

    $status = if ($blocking.Count -eq 0) {
        "HYBRID_AUTONOMIC_FABRIC_LIVE_READY"
    } else {
        "HYBRID_AUTONOMIC_FABRIC_CHECK_REQUIRED"
    }

    $state = [ordered]@{
        schema = "agent-lee-hybrid-autonomic-fabric-live-state-v17-4"
        updatedAt = $now
        authority = "Discovery Fabric"
        status = $status
        topology = [ordered]@{
            ecosystem = "leeway-ecosystemv214"
            root = $Root
            network = "leeway-ecosystemv214_leeway-net"
            agentLee = [ordered]@{
                container = "agent_lee_code_mode"
                alias = "agent-lee"
                port = 8080
                containerProof = $agent
            }
            runtimeFabric = [ordered]@{
                container = "leeway_runtime_fabric"
                alias = "runtime-fabric"
                ports = @(4001, 8111)
                containerProof = $runtime
            }
            ollama = [ordered]@{
                container = "leeway_ollama"
                alias = "ollama"
                port = 11434
                containerProof = $ollama
            }
        }
        endpoints = [ordered]@{
            agentHealth = $agentHealth
            agentRoot = $agentRoot
            runtimeHealth = $runtimeHealth
            runtimeRoot = $runtimeRoot
            runtimeAux8111 = $runtimeAux
            ollamaRoot = $ollamaRoot
            ollamaTags = $ollamaTags
        }
        qwen = [ordered]@{
            runtime = "leeway_ollama"
            role = "ADVISORY_PROCESSOR_NOT_CONTROLLER"
            availableModels = $qwenModels
            modelAvailable = [bool]($qwenModels.Count -gt 0)
            preferredModel = "qwen2.5-coder:7b"
            advisorStatus = $advisorStatus
            advisorProof = $advisorProof
        }
        checks = $checks
        blocking = $blocking
        worker = [ordered]@{
            script = $PSCommandPath
            running = $true
            processId = $PID
            intervalSeconds = $IntervalSeconds
            advisorEveryCycles = $AdvisorEveryCycles
        }
        guardrails = @(
            "No Docker build",
            "No Docker restart",
            "No Docker stop",
            "No Docker remove",
            "No Docker prune",
            "No model retraining",
            "No unknown MCP autostart",
            "Qwen advisor does not execute actions"
        )
        truth = "V17.4 is the live hybrid worker using actual containers: agent_lee_code_mode, leeway_runtime_fabric, leeway_ollama."
    }

    Write-JsonFile $StatePath $state 80 | Out-Null
    Write-JsonFile $RegistryPath $state 80 | Out-Null
    Write-JsonFile $TopologyPath $state 80 | Out-Null
    Write-JsonFile $RuntimeMirrorPath $state 80 | Out-Null
    Write-JsonFile $DesktopMirrorPath $state 80 | Out-Null
    Write-JsonFile $LatestAdvicePath $state.qwen 80 | Out-Null

    $snapshotPath = Join-Path $SnapshotDir "hybrid-fabric-live-$stamp.json"
    Write-JsonFile $snapshotPath $state 80 | Out-Null

    Add-JsonLine $WorkerLogPath $state
    Add-JsonLine $LearningJournalPath ([ordered]@{
        schema = "agent-lee-hybrid-learning-event-v17-4"
        timestamp = $now
        eventType = "HYBRID_FABRIC_LIVE_SCAN"
        status = $status
        checks = $checks
        qwen = $state.qwen
        learningUse = "Ecosystem readiness, model advisory proof, container truth, MCP activation planning, and runtime fabric continuity."
    })

    Write-Host ("[{0}] Hybrid V17.4 | status={1} | agent={2} | runtime={3} | ollama={4} | qwen={5} | advisor={6}" -f `
        (Get-Date -Format "HH:mm:ss"),
        $status,
        $checks.agentLeeEndpointReady,
        $checks.runtimeFabricEndpointReady,
        $checks.ollamaEndpointReady,
        $checks.qwenModelAvailable,
        $advisorStatus
    ) -ForegroundColor Green

    Start-Sleep -Seconds $IntervalSeconds
}
