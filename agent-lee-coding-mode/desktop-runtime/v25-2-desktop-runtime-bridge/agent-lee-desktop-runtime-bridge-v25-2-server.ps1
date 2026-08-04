param(
    [string]$Root,
    [int]$BridgePort,
    [string]$BridgeName,
    [string]$DiscoveryDir,
    [string]$RuntimeFabricDir,
    [string]$BridgeRoot,
    [string]$StateFile,
    [string]$LogFile
)

$ErrorActionPreference = "Continue"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $line = "{0} [{1}] {2}" -f (Get-Date).ToString("o"), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Write-JsonFile {
    param([string]$Path, $Object, [int]$Depth = 100)
    $parent = Split-Path -Parent $Path
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, ($Object | ConvertTo-Json -Depth $Depth), [System.Text.UTF8Encoding]::new($false))
}

function Test-Endpoint {
    param([string]$Url)

    try {
        Invoke-RestMethod -Uri $Url -TimeoutSec 4 | Out-Null
        return [pscustomobject]@{
            ready = $true
            status = "READY"
            url = $Url
            error = ""
        }
    } catch {
        return [pscustomobject]@{
            ready = $false
            status = "CHECK_REQUIRED"
            url = $Url
            error = $_.Exception.Message
        }
    }
}

function Invoke-PostJson {
    param(
        [string]$Url,
        $Body,
        [int]$TimeoutSec = 12
    )

    try {
        $json = $Body | ConvertTo-Json -Depth 20
        $r = Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
        return [pscustomobject]@{
            ok = $true
            status = "READY"
            url = $Url
            response = $r
            error = ""
        }
    } catch {
        return [pscustomobject]@{
            ok = $false
            status = "CHECK_REQUIRED"
            url = $Url
            response = $null
            error = $_.Exception.Message
        }
    }
}

function Get-DockerSummary {
    $containers = @()

    try {
        $lines = docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"
        foreach ($line in $lines) {
            $parts = $line -split "\|", 4
            if ($parts.Count -lt 4) { continue }

            $name = $parts[0]
            if ($name -match "leeway|agent|kernel|ollama|fabric|media|voice|vision|creation") {
                $containers += [pscustomobject]@{
                    name = $parts[0]
                    image = $parts[1]
                    status = $parts[2]
                    ports = $parts[3]
                }
            }
        }
    } catch {
        Write-Log "Docker summary failed: $($_.Exception.Message)" "WARN"
    }

    return $containers
}

function Get-DockerInspectSummary {
    $names = @(
        "agent_lee_code_mode",
        "leeway_runtime_fabric",
        "leeway_ollama",
        "leeway_hybrid_fabric",
        "leeway_agent_center",
        "leeway_mcp_agent_center",
        "leeway_worker_center",
        "leeway_mcp_center",
        "leeway_media_ingestion_layer",
        "leeway_media_router",
        "agent-lee-voice-kernel",
        "agent-lee-vision-kernel",
        "agent-lee-creation-kernel"
    )

    $items = @()

    foreach ($name in $names) {
        try {
            $raw = docker inspect $name 2>$null
            if ($LASTEXITCODE -eq 0 -and $raw) {
                $j = $raw | ConvertFrom-Json
                $c = $j[0]
                $items += [pscustomobject]@{
                    name = $name
                    exists = $true
                    running = [bool]$c.State.Running
                    status = $c.State.Status
                    image = $c.Config.Image
                    networkMode = $c.HostConfig.NetworkMode
                    labels = $c.Config.Labels
                }
            } else {
                $items += [pscustomobject]@{
                    name = $name
                    exists = $false
                    running = $false
                    status = "NOT_FOUND"
                }
            }
        } catch {
            $items += [pscustomobject]@{
                name = $name
                exists = $false
                running = $false
                status = "INSPECT_FAILED"
                error = $_.Exception.Message
            }
        }
    }

    return $items
}

function Get-DeviceSummary {
    $audio = @()
    $cameras = @()
    $printers = @()
    $video = @()

    try {
        $audio = @(Get-CimInstance Win32_SoundDevice | Select-Object Name,Status,Manufacturer)
    } catch {}

    try {
        $cameras = @(Get-CimInstance Win32_PnPEntity | Where-Object {
            $_.Name -match "camera|webcam|usb video|integrated camera"
        } | Select-Object Name,Status,PNPDeviceID)
    } catch {}

    try {
        $printers = @(Get-CimInstance Win32_Printer | Select-Object Name,Default,WorkOffline,PrinterStatus)
    } catch {}

    try {
        $video = @(Get-CimInstance Win32_VideoController | Select-Object Name,Status,DriverVersion,VideoProcessor)
    } catch {}

    return [pscustomobject]@{
        audioDevices = $audio
        cameraDevices = $cameras
        printers = $printers
        videoControllers = $video
    }
}

function Get-Endpoints {
    return [pscustomobject]@{
        agentLee = Test-Endpoint "http://127.0.0.1:8080/health"
        runtimeFabric = Test-Endpoint "http://127.0.0.1:4001/runtime/health"
        hybridFabric = Test-Endpoint "http://127.0.0.1:8777/state"
        ollama = Test-Endpoint "http://127.0.0.1:11434/api/tags"
        agentCenter = Test-Endpoint "http://127.0.0.1:8860/health"
        mcpAgentCenter = Test-Endpoint "http://127.0.0.1:8861/health"
        workerCenter = Test-Endpoint "http://127.0.0.1:8862/health"
        mcpCenter = Test-Endpoint "http://127.0.0.1:8863/health"
        mediaIngestion = Test-Endpoint "http://127.0.0.1:5300/media-ingestion/health"
        mediaRouter = Test-Endpoint "http://127.0.0.1:5301/health"
        voiceKernel = Test-Endpoint "http://127.0.0.1:8092/health"
        visionKernel = Test-Endpoint "http://127.0.0.1:8093/health"
        creationKernel = Test-Endpoint "http://127.0.0.1:8094/health"
    }
}

function Get-CloneVoiceRoutes {
    return @(
        "http://127.0.0.1:8092/speak",
        "http://127.0.0.1:8092/voice/speak",
        "http://127.0.0.1:8092/tts",
        "http://127.0.0.1:8092/v1/tts",
        "http://127.0.0.1:8092/synthesize",
        "http://127.0.0.1:8092/v1/synthesize",
        "http://127.0.0.1:8092/clone/speak",
        "http://127.0.0.1:8092/clone-voice/speak"
    )
}

function Speak-CloneVoiceOnly {
    param([string]$Text)

    $voiceHealth = Test-Endpoint "http://127.0.0.1:8092/health"

    if (-not $voiceHealth.ready) {
        return [pscustomobject]@{
            ok = $false
            status = "CLONE_VOICE_KERNEL_NOT_READY"
            rule = "NO_WINDOWS_TTS_FALLBACK"
            text = $Text
            health = $voiceHealth
        }
    }

    $payloads = @(
        [pscustomobject]@{
            text = $Text
            voice = "agent-lee-clone"
            voiceId = "agent-lee-clone"
            mode = "clone"
            requestedBy = "agent-lee-desktop-runtime-bridge-v25-2"
        },
        [pscustomobject]@{
            input = $Text
            voice = "agent-lee-clone"
            cloneVoice = $true
            requestedBy = "agent-lee-desktop-runtime-bridge-v25-2"
        },
        [pscustomobject]@{
            message = $Text
            speaker = "agent-lee"
            voiceMode = "clone"
            requestedBy = "agent-lee-desktop-runtime-bridge-v25-2"
        }
    )

    $attempts = @()

    foreach ($url in Get-CloneVoiceRoutes) {
        foreach ($payload in $payloads) {
            $result = Invoke-PostJson -Url $url -Body $payload -TimeoutSec 15
            $attempts += $result

            if ($result.ok) {
                Write-Log "Clone voice route succeeded: $url"
                return [pscustomobject]@{
                    ok = $true
                    status = "CLONE_VOICE_DISPATCHED_THROUGH_DOCKER"
                    rule = "NO_WINDOWS_TTS_FALLBACK"
                    text = $Text
                    endpoint = $url
                    result = $result
                }
            }
        }
    }

    return [pscustomobject]@{
        ok = $false
        status = "CLONE_VOICE_ROUTE_NOT_PROVEN"
        rule = "NO_WINDOWS_TTS_FALLBACK"
        text = $Text
        message = "Voice kernel is healthy, but none of the tested clone-voice POST endpoints accepted the request. Add the real voice kernel speak endpoint to V25.2."
        attemptedRoutes = $attempts
    }
}

function Build-State {
    $endpoints = Get-Endpoints

    $required = @(
        $endpoints.agentLee.ready,
        $endpoints.runtimeFabric.ready,
        $endpoints.ollama.ready,
        $endpoints.agentCenter.ready,
        $endpoints.workerCenter.ready,
        $endpoints.mcpCenter.ready,
        $endpoints.mediaIngestion.ready,
        $endpoints.mediaRouter.ready
    )

    $ready = (($required | Where-Object { $_ -ne $true }).Count -eq 0)

    $state = [pscustomobject]@{
        schema = "agent-lee-desktop-runtime-bridge-v25-2"
        status = if ($ready) { "AGENT_LEE_DESKTOP_RUNTIME_BRIDGE_V25_2_READY" } else { "AGENT_LEE_DESKTOP_RUNTIME_BRIDGE_V25_2_DEGRADED" }
        recordedAt = (Get-Date).ToUniversalTime().ToString("o")
        bridge = [pscustomobject]@{
            name = $BridgeName
            port = $BridgePort
            endpoint = "http://127.0.0.1:$BridgePort"
            processId = $PID
            mode = "BACKGROUND_LOCALHOST_HOST_BRIDGE_DOCKER_GOVERNED"
        }
        voice = [pscustomobject]@{
            requiredMode = "LEEWAY_DOCKER_CLONE_VOICE_ONLY"
            windowsSpeechFallback = "DISABLED"
            systemSpeech = "NOT_USED"
            voiceKernelHealth = $endpoints.voiceKernel
            attemptedCloneRoutes = Get-CloneVoiceRoutes
        }
        dockerGovernance = [pscustomobject]@{
            required = $true
            note = "Desktop bridge runs on Windows host for desktop access, but all runtime truth and voice tests are routed through Leeway Docker services."
            dockerContainers = Get-DockerSummary
            dockerInspect = Get-DockerInspectSummary
        }
        safety = [pscustomobject]@{
            arbitraryCommands = "NOT_ALLOWED"
            physicalActions = "APPROVAL_REQUIRED_IN_JSON"
            mouseKeyboardAutomation = "NOT_ENABLED"
            printing = "NOT_ENABLED"
            antivirusBypass = "NOT_USED"
        }
        endpoints = $endpoints
        devices = Get-DeviceSummary
    }

    Write-JsonFile -Path $StateFile -Object $state
    Write-JsonFile -Path (Join-Path $DiscoveryDir "AGENT_LEE_DESKTOP_RUNTIME_BRIDGE_V25.json") -Object $state
    Write-JsonFile -Path (Join-Path $RuntimeFabricDir "AGENT_LEE_DESKTOP_RUNTIME_BRIDGE_V25_STATE.json") -Object $state

    return $state
}

function Read-BodyJson {
    param($Request)

    try {
        $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
        $body = $reader.ReadToEnd()
        if (-not $body) { return [pscustomobject]@{} }
        return $body | ConvertFrom-Json -ErrorAction Stop
    } catch {
        return [pscustomobject]@{
            parseError = $_.Exception.Message
        }
    }
}

function Send-Json {
    param($Response, [int]$Code, $Object)

    $json = $Object | ConvertTo-Json -Depth 100
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Response.StatusCode = $Code
    $Response.ContentType = "application/json; charset=utf-8"
    $Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $Response.Headers.Add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    $Response.Headers.Add("Access-Control-Allow-Headers", "content-type")
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Response.OutputStream.Close()
}

function Invoke-SafeAction {
    param($Body)

    $actionName = [string]$Body.actionName
    $reason = if ($Body.reason) { [string]$Body.reason } else { "No reason provided." }
    $approval = [string]$Body.approval

    $allowed = @(
        "speak-status",
        "open-agent-lee",
        "open-runtime-fabric",
        "open-media-router",
        "open-media-ingestion",
        "open-notepad"
    )

    if ($allowed -notcontains $actionName) {
        return [pscustomobject]@{
            ok = $false
            status = "ACTION_NOT_ALLOWED"
            actionName = $actionName
            allowedActions = $allowed
        }
    }

    if ($approval -ne "YES") {
        return [pscustomobject]@{
            ok = $false
            status = "APPROVAL_REQUIRED"
            actionName = $actionName
            reason = $reason
            required = 'Send JSON with "approval":"YES" to execute this approved local action.'
        }
    }

    try {
        switch ($actionName) {
            "speak-status" {
                return Speak-CloneVoiceOnly "Agent Lee Desktop Bridge V25 point two is online through the Leeway Docker voice lane."
            }
            "open-agent-lee" {
                Start-Process "http://127.0.0.1:8080"
            }
            "open-runtime-fabric" {
                Start-Process "http://127.0.0.1:4001/runtime/health"
            }
            "open-media-router" {
                Start-Process "http://127.0.0.1:5301/health"
            }
            "open-media-ingestion" {
                Start-Process "http://127.0.0.1:5300/media-ingestion/health"
            }
            "open-notepad" {
                Start-Process "notepad.exe"
            }
        }

        Write-Log "Approved action executed: $actionName Reason: $reason"

        return [pscustomobject]@{
            ok = $true
            status = "ACTION_EXECUTED"
            actionName = $actionName
            reason = $reason
        }
    } catch {
        return [pscustomobject]@{
            ok = $false
            status = "ACTION_FAILED"
            actionName = $actionName
            error = $_.Exception.Message
        }
    }
}

Write-Log "Starting V25.2 background bridge on port $BridgePort"

$script:CachedState = Build-State

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$BridgePort/")
$listener.Start()

Write-Log "V25.2 listener active at http://127.0.0.1:$BridgePort/"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.Headers.Add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
                $response.Headers.Add("Access-Control-Allow-Headers", "content-type")
                $response.OutputStream.Close()
                continue
            }

            $path = $request.Url.AbsolutePath.ToLowerInvariant()

            if ($request.HttpMethod -eq "GET" -and $path -eq "/health") {
                Send-Json $response 200 ([pscustomobject]@{
                    schema = "agent-lee-desktop-runtime-bridge-v25-2-health"
                    ready = $true
                    status = "READY"
                    bridge = $BridgeName
                    port = $BridgePort
                    processId = $PID
                    mode = "BACKGROUND_LOCALHOST_HOST_BRIDGE_DOCKER_GOVERNED"
                    voice = "LEEWAY_DOCKER_CLONE_VOICE_ONLY"
                    windowsSpeechFallback = "DISABLED"
                    physicalActions = "APPROVAL_REQUIRED_IN_JSON"
                })
                continue
            }

            if ($request.HttpMethod -eq "GET" -and $path -eq "/state") {
                Send-Json $response 200 $script:CachedState
                continue
            }

            if ($request.HttpMethod -eq "GET" -and $path -eq "/refresh") {
                $script:CachedState = Build-State
                Send-Json $response 200 $script:CachedState
                continue
            }

            if ($request.HttpMethod -eq "GET" -and $path -eq "/docker") {
                Send-Json $response 200 ([pscustomobject]@{
                    containers = Get-DockerSummary
                    inspect = Get-DockerInspectSummary
                    endpoints = Get-Endpoints
                })
                continue
            }

            if ($request.HttpMethod -eq "GET" -and $path -eq "/devices") {
                Send-Json $response 200 (Get-DeviceSummary)
                continue
            }

            if ($request.HttpMethod -eq "GET" -and $path -eq "/voice") {
                Send-Json $response 200 ([pscustomobject]@{
                    requiredMode = "LEEWAY_DOCKER_CLONE_VOICE_ONLY"
                    windowsSpeechFallback = "DISABLED"
                    health = Test-Endpoint "http://127.0.0.1:8092/health"
                    attemptedRoutes = Get-CloneVoiceRoutes
                })
                continue
            }

            if ($request.HttpMethod -eq "POST" -and $path -eq "/speak") {
                $body = Read-BodyJson $request
                $text = if ($body.text) { [string]$body.text } else { "Agent Lee Desktop Bridge V25 point two is online through Leeway Docker clone voice." }
                Send-Json $response 200 (Speak-CloneVoiceOnly $text)
                continue
            }

            if ($request.HttpMethod -eq "POST" -and $path -eq "/action") {
                $body = Read-BodyJson $request
                Send-Json $response 200 (Invoke-SafeAction $body)
                continue
            }

            Send-Json $response 404 ([pscustomobject]@{
                status = "NOT_FOUND"
                path = $path
                allowed = @("/health","/state","/refresh","/docker","/devices","/voice","/speak","/action")
            })
        } catch {
            Send-Json $response 500 ([pscustomobject]@{
                status = "ERROR"
                error = $_.Exception.Message
            })
        }
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }

    Write-Log "V25.2 listener stopped."
}