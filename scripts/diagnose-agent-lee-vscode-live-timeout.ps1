Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Continue"

$Root = "D:\Leeway-Ecosystem v2.1.4"
Set-Location -LiteralPath $Root

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReceiptDir = Join-Path $Root "Archive\receipts"
$DiagDir = Join-Path $Root "Archive\diagnostics\agent-lee-vscode-live-timeout-$Stamp"
New-Item -ItemType Directory -Force -Path $ReceiptDir, $DiagDir | Out-Null

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-vscode-live-timeout-deep-diagnostic-$Stamp.json"

$AdapterUrl = "http://127.0.0.1:8787"
$RouterUrl = "http://127.0.0.1:8080"
$RuntimeFabricUrl = "http://127.0.0.1:4001"
$DesktopRuntimeUrl = "http://127.0.0.1:8091"
$OllamaUrl = "http://127.0.0.1:11434"

$ExtensionDir = Join-Path $Root ".leeway-vscode\extensions\leeway-agent-lee-chat"
$ExtensionJs = Join-Path $ExtensionDir "extension.js"
$ExtensionPackage = Join-Path $ExtensionDir "package.json"
$AdapterServer = Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter\server.cjs"
$RouterServer = Join-Path $Root "agent-lee-coding-mode\router\server-brainfix.mjs"
$RuntimeServer = Join-Path $Root "Leeway Runtime Fabric\server\index.cjs"
$DesktopServer = Join-Path $Root "agent-lee-coding-mode\desktop-runtime\server.mjs"

$TimeoutNeedles = @(
    "Agent Lee is online, but the downstream model backend did not respond within the VS Code chat window",
    "Backend note: request timed out",
    "downstream model backend did not respond",
    "selected model is cold",
    "model backend",
    "request timed out"
)

$SourceRoots = @(
    ".leeway-vscode",
    "agent-lee-coding-mode",
    "Leeway Runtime Fabric",
    "scripts"
)

$SourceExtensions = @(
    "*.js",
    "*.cjs",
    "*.mjs",
    "*.ts",
    "*.json",
    "*.ps1"
)

function Write-JsonFile {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)]$Object
    )

    $Json = $Object | ConvertTo-Json -Depth 100
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Json + [Environment]::NewLine, $Utf8NoBom)
}

function Read-TextSafe {
    param([Parameter(Mandatory=$true)][string]$Path)

    try {
        if (Test-Path -LiteralPath $Path -PathType Leaf) {
            return [System.IO.File]::ReadAllText($Path)
        }

        return $null
    }
    catch {
        return $null
    }
}

function Test-PortOpen {
    param([int]$Port)

    try {
        $Client = New-Object System.Net.Sockets.TcpClient
        $Async = $Client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $Ok = $Async.AsyncWaitHandle.WaitOne(1000, $false)

        if ($Ok) {
            $Client.EndConnect($Async)
            $Client.Close()
            return $true
        }

        $Client.Close()
        return $false
    }
    catch {
        return $false
    }
}

function Get-PortOwners {
    param([int[]]$Ports)

    $Rows = @()

    foreach ($Port in $Ports) {
        try {
            $Connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

            foreach ($Connection in $Connections) {
                $OwnerProcessId = $Connection.OwningProcess
                $Proc = Get-Process -Id $OwnerProcessId -ErrorAction SilentlyContinue

                $CommandLine = $null
                try {
                    $Cim = Get-CimInstance Win32_Process -Filter "ProcessId=$OwnerProcessId" -ErrorAction SilentlyContinue
                    if ($Cim) {
                        $CommandLine = $Cim.CommandLine
                    }
                }
                catch {
                }

                $Rows += [ordered]@{
                    port = $Port
                    processId = $OwnerProcessId
                    processName = $(if ($Proc) { $Proc.ProcessName } else { $null })
                    path = $(if ($Proc) { $Proc.Path } else { $null })
                    commandLine = $CommandLine
                }
            }
        }
        catch {
            $Rows += [ordered]@{
                port = $Port
                error = $_.Exception.Message
            }
        }
    }

    return @($Rows)
}

function Invoke-HttpGet {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Uri,
        [int]$TimeoutSec = 20
    )

    $Started = Get-Date

    try {
        $Response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec $TimeoutSec
        $BodyText = [string]$Response.Content

        return [ordered]@{
            name = $Name
            ok = $true
            uri = $Uri
            statusCode = $Response.StatusCode
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            bodyPreview = $(if ($BodyText.Length -gt 2000) { $BodyText.Substring(0, 2000) } else { $BodyText })
        }
    }
    catch {
        return [ordered]@{
            name = $Name
            ok = $false
            uri = $Uri
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            error = $_.Exception.Message
        }
    }
}

function Invoke-JsonPost {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Uri,
        [Parameter(Mandatory=$true)]$Body,
        [int]$TimeoutSec = 120
    )

    $Started = Get-Date

    try {
        $JsonBody = $Body | ConvertTo-Json -Depth 60
        $Response = Invoke-RestMethod -Uri $Uri -Method Post -ContentType "application/json" -Body $JsonBody -TimeoutSec $TimeoutSec

        return [ordered]@{
            name = $Name
            ok = $true
            uri = $Uri
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            response = $Response
        }
    }
    catch {
        return [ordered]@{
            name = $Name
            ok = $false
            uri = $Uri
            elapsedSec = [math]::Round(((Get-Date) - $Started).TotalSeconds, 2)
            error = $_.Exception.Message
        }
    }
}

function Invoke-OllamaGenerate {
    param(
        [string]$Model,
        [int]$TimeoutSec,
        [string]$Prompt = "Reply with exactly: OK",
        [int]$NumPredict = 8
    )

    $Body = @{
        model = $Model
        prompt = $Prompt
        stream = $false
        keep_alive = "8h"
        options = @{
            temperature = 0
            num_predict = $NumPredict
            num_ctx = 2048
        }
    }

    return Invoke-JsonPost -Name "ollama-generate-$Model" -Uri "$OllamaUrl/api/generate" -Body $Body -TimeoutSec $TimeoutSec
}

function Get-SourceFiles {
    $Rows = @()

    foreach ($RelativeRoot in $SourceRoots) {
        $FullRoot = Join-Path $Root $RelativeRoot

        if (-not (Test-Path -LiteralPath $FullRoot -PathType Container)) {
            continue
        }

        foreach ($Ext in $SourceExtensions) {
            try {
                $Files = Get-ChildItem -LiteralPath $FullRoot -Recurse -File -Filter $Ext -ErrorAction SilentlyContinue |
                    Where-Object {
                        $_.FullName -notmatch "\\node_modules\\" -and
                        $_.FullName -notmatch "\\Archive\\" -and
                        $_.FullName -notmatch "\\dist\\" -and
                        $_.FullName -notmatch "\.bak" -and
                        $_.Length -lt 5000000
                    }

                foreach ($File in $Files) {
                    $Rows += $File.FullName
                }
            }
            catch {
            }
        }
    }

    return @($Rows | Sort-Object -Unique)
}

function Find-NeedlesInFiles {
    param(
        [string[]]$Files,
        [string[]]$Needles
    )

    $Rows = @()

    foreach ($File in $Files) {
        $Text = Read-TextSafe -Path $File

        if ($null -eq $Text) {
            continue
        }

        $Hits = @()

        foreach ($Needle in $Needles) {
            if ($Text.IndexOf($Needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $LineNumbers = @()
                $Lines = $Text -split "`r?`n"

                for ($i = 0; $i -lt $Lines.Count; $i++) {
                    if ($Lines[$i].IndexOf($Needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                        $LineNumbers += ($i + 1)
                    }
                }

                $Hits += [ordered]@{
                    needle = $Needle
                    lines = $LineNumbers
                }
            }
        }

        if ($Hits.Count -gt 0) {
            $Rows += [ordered]@{
                path = $File
                hits = $Hits
            }
        }
    }

    return @($Rows)
}

function Find-RoutesAndTimeouts {
    param([string[]]$Files)

    $Rows = @()

    $Patterns = @(
        "http://127.0.0.1:8787",
        "http://localhost:8787",
        "http://127.0.0.1:8080",
        "http://localhost:8080",
        "timeoutMs",
        "requestTimeoutMs",
        "CHAT_TIMEOUT",
        "AbortController",
        "setTimeout",
        "qwen3:latest",
        "deepseek-coder:latest",
        "qwen2.5-coder:7b",
        "agent-lee-model-override",
        "agent-lee-model-policy"
    )

    foreach ($File in $Files) {
        $Text = Read-TextSafe -Path $File

        if ($null -eq $Text) {
            continue
        }

        $Hits = @()

        foreach ($Pattern in $Patterns) {
            if ($Text.IndexOf($Pattern, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $LineNumbers = @()
                $Lines = $Text -split "`r?`n"

                for ($i = 0; $i -lt $Lines.Count; $i++) {
                    if ($Lines[$i].IndexOf($Pattern, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                        $Preview = $Lines[$i].Trim()
                        if ($Preview.Length -gt 300) {
                            $Preview = $Preview.Substring(0, 300)
                        }

                        $LineNumbers += [ordered]@{
                            line = $i + 1
                            text = $Preview
                        }
                    }
                }

                $Hits += [ordered]@{
                    pattern = $Pattern
                    matches = $LineNumbers
                }
            }
        }

        if ($Hits.Count -gt 0) {
            $Rows += [ordered]@{
                path = $File
                hits = $Hits
            }
        }
    }

    return @($Rows)
}

function Read-PackageJson {
    param([string]$Path)

    try {
        if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
            return [ordered]@{
                exists = $false
                path = $Path
            }
        }

        $Package = [System.IO.File]::ReadAllText($Path) | ConvertFrom-Json

        return [ordered]@{
            exists = $true
            path = $Path
            name = $Package.name
            displayName = $Package.displayName
            version = $Package.version
            activationEvents = $Package.activationEvents
            contributes = $Package.contributes
        }
    }
    catch {
        return [ordered]@{
            exists = $true
            path = $Path
            error = $_.Exception.Message
        }
    }
}

function Get-VSCodeProcesses {
    $Rows = @()

    try {
        $Processes = Get-CimInstance Win32_Process -Filter "name='Code.exe' OR name='code.exe'" -ErrorAction SilentlyContinue

        foreach ($Proc in $Processes) {
            $Rows += [ordered]@{
                processId = $Proc.ProcessId
                commandLine = $Proc.CommandLine
            }
        }
    }
    catch {
        $Rows += [ordered]@{
            error = $_.Exception.Message
        }
    }

    return @($Rows)
}

function Get-RecentLogs {
    $LogRoots = @(
        (Join-Path $Root "Archive\logs"),
        (Join-Path $Root ".leeway-vscode\agent-lee-vscode-adapter"),
        (Join-Path $Root "agent-lee-coding-mode\Archive\logs")
    )

    $Rows = @()

    foreach ($LogRoot in $LogRoots) {
        if (-not (Test-Path -LiteralPath $LogRoot -PathType Container)) {
            continue
        }

        $Files = Get-ChildItem -LiteralPath $LogRoot -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Length -lt 5000000 -and
                ($_.Extension -in @(".log", ".txt", ".json"))
            } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 30

        foreach ($File in $Files) {
            $Tail = $null

            try {
                $Tail = Get-Content -LiteralPath $File.FullName -Tail 80 -ErrorAction SilentlyContinue
            }
            catch {
            }

            $Rows += [ordered]@{
                path = $File.FullName
                lastWriteTime = $File.LastWriteTime.ToString("o")
                length = $File.Length
                tail = $Tail
            }
        }
    }

    return @($Rows)
}

function Get-RecentReceipts {
    $Rows = @()

    if (-not (Test-Path -LiteralPath $ReceiptDir -PathType Container)) {
        return @()
    }

    $Files = Get-ChildItem -LiteralPath $ReceiptDir -File -Filter "*.json" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 25

    foreach ($File in $Files) {
        $Json = $null
        $Summary = $null

        try {
            $Json = Get-Content -LiteralPath $File.FullName -Raw | ConvertFrom-Json
            $Summary = [ordered]@{
                status = $Json.status
                selectedModel = $Json.selectedModel
                selectedLiveChatModel = $Json.selectedLiveChatModel
                policyStatus = $Json.policyStatus
                lockEligible = $Json.lockEligible
                failedCases = $Json.failedCases
                conclusion = $Json.conclusion
            }
        }
        catch {
            $Summary = [ordered]@{
                parseError = $_.Exception.Message
            }
        }

        $Rows += [ordered]@{
            path = $File.FullName
            lastWriteTime = $File.LastWriteTime.ToString("o")
            length = $File.Length
            summary = $Summary
        }
    }

    return @($Rows)
}

Write-Host ""
Write-Host "=== Agent Lee VS Code Live Timeout Deep Diagnostic ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Stamp: $Stamp"
Write-Host ""

$PortStatus = [ordered]@{
    adapter8787 = Test-PortOpen -Port 8787
    router8080 = Test-PortOpen -Port 8080
    runtimeFabric4001 = Test-PortOpen -Port 4001
    desktopRuntime8091 = Test-PortOpen -Port 8091
    ollama11434 = Test-PortOpen -Port 11434
}

Write-Host "Port status:" -ForegroundColor Cyan
foreach ($Entry in $PortStatus.GetEnumerator()) {
    Write-Host "$($Entry.Key): $($Entry.Value)"
}

$PortOwners = Get-PortOwners -Ports @(8787, 8080, 4001, 8091, 11434)

$Health = [ordered]@{
    adapterHealth = Invoke-HttpGet -Name "adapter-health" -Uri "$AdapterUrl/health" -TimeoutSec 20
    adapterModels = Invoke-HttpGet -Name "adapter-models" -Uri "$AdapterUrl/v1/models" -TimeoutSec 20
    routerHealth = Invoke-HttpGet -Name "router-health" -Uri "$RouterUrl/health" -TimeoutSec 20
    routerModels = Invoke-HttpGet -Name "router-models" -Uri "$RouterUrl/v1/models" -TimeoutSec 20
    runtimeFabricHealth = Invoke-HttpGet -Name "runtime-fabric-health" -Uri "$RuntimeFabricUrl/runtime/health" -TimeoutSec 20
    desktopRuntimeStatus = Invoke-HttpGet -Name "desktop-runtime-status" -Uri "$DesktopRuntimeUrl/runtime/status" -TimeoutSec 20
    ollamaTags = Invoke-HttpGet -Name "ollama-tags" -Uri "$OllamaUrl/api/tags" -TimeoutSec 20
    ollamaPs = Invoke-HttpGet -Name "ollama-ps" -Uri "$OllamaUrl/api/ps" -TimeoutSec 20
}

Write-Host ""
Write-Host "Running model probes..." -ForegroundColor Cyan

$ModelProbes = [ordered]@{
    qwen3ColdOrWarm = Invoke-OllamaGenerate -Model "qwen3:latest" -TimeoutSec 180
    qwen3HotShort = Invoke-OllamaGenerate -Model "qwen3:latest" -TimeoutSec 60
    qwen25 = Invoke-OllamaGenerate -Model "qwen2.5-coder:7b" -TimeoutSec 120
    deepseek = Invoke-OllamaGenerate -Model "deepseek-coder:latest" -TimeoutSec 120
}

Write-Host "qwen3 first probe ok: $($ModelProbes.qwen3ColdOrWarm.ok), elapsed: $($ModelProbes.qwen3ColdOrWarm.elapsedSec)"
Write-Host "qwen3 hot probe ok: $($ModelProbes.qwen3HotShort.ok), elapsed: $($ModelProbes.qwen3HotShort.elapsedSec)"

$ChatBodyQwen3 = @{
    model = "qwen3:latest"
    messages = @(
        @{
            role = "user"
            content = "hello"
        }
    )
    temperature = 0
    max_tokens = 80
    provenance = @{
        origin = "deep-diagnostic-powershell"
        workspaceRoot = $Root
        vscodeExtension = "leeway-agent-lee-chat"
        adapterPort = 8787
        routerPort = 8080
        runtimeFabricPort = 4001
    }
}

$ChatBodyNoModel = @{
    messages = @(
        @{
            role = "user"
            content = "hello"
        }
    )
    temperature = 0
    max_tokens = 80
    provenance = @{
        origin = "deep-diagnostic-powershell-no-model"
        workspaceRoot = $Root
        vscodeExtension = "leeway-agent-lee-chat"
        adapterPort = 8787
        routerPort = 8080
        runtimeFabricPort = 4001
    }
}

Write-Host ""
Write-Host "Running route probes..." -ForegroundColor Cyan

$RouteProbes = [ordered]@{
    adapterQwen3Chat = Invoke-JsonPost -Name "adapter-qwen3-chat" -Uri "$AdapterUrl/v1/chat/completions" -Body $ChatBodyQwen3 -TimeoutSec 240
    adapterNoModelChat = Invoke-JsonPost -Name "adapter-no-model-chat" -Uri "$AdapterUrl/v1/chat/completions" -Body $ChatBodyNoModel -TimeoutSec 240
    routerQwen3Chat = Invoke-JsonPost -Name "router-qwen3-chat" -Uri "$RouterUrl/v1/chat/completions" -Body $ChatBodyQwen3 -TimeoutSec 240
    routerNoModelChat = Invoke-JsonPost -Name "router-no-model-chat" -Uri "$RouterUrl/v1/chat/completions" -Body $ChatBodyNoModel -TimeoutSec 240
}

Write-Host "adapter qwen3 chat ok: $($RouteProbes.adapterQwen3Chat.ok), elapsed: $($RouteProbes.adapterQwen3Chat.elapsedSec)"
Write-Host "adapter no-model chat ok: $($RouteProbes.adapterNoModelChat.ok), elapsed: $($RouteProbes.adapterNoModelChat.elapsedSec)"
Write-Host "router qwen3 chat ok: $($RouteProbes.routerQwen3Chat.ok), elapsed: $($RouteProbes.routerQwen3Chat.elapsedSec)"
Write-Host "router no-model chat ok: $($RouteProbes.routerNoModelChat.ok), elapsed: $($RouteProbes.routerNoModelChat.elapsedSec)"

Write-Host ""
Write-Host "Scanning source files..." -ForegroundColor Cyan

$SourceFiles = Get-SourceFiles
$TimeoutMatches = Find-NeedlesInFiles -Files $SourceFiles -Needles $TimeoutNeedles
$RouteAndTimeoutMatches = Find-RoutesAndTimeouts -Files $SourceFiles

Write-Host "source files scanned: $($SourceFiles.Count)"
Write-Host "timeout message matches: $($TimeoutMatches.Count)"
Write-Host "route/timeout/model matches: $($RouteAndTimeoutMatches.Count)"

$ExtensionPackageInfo = Read-PackageJson -Path $ExtensionPackage
$ExtensionText = Read-TextSafe -Path $ExtensionJs
$ExtensionSummary = [ordered]@{
    extensionDir = $ExtensionDir
    extensionJsExists = Test-Path -LiteralPath $ExtensionJs -PathType Leaf
    packageJson = $ExtensionPackageInfo
    extensionJsContains8787 = $(if ($ExtensionText) { $ExtensionText.Contains("127.0.0.1:8787") -or $ExtensionText.Contains("localhost:8787") } else { $false })
    extensionJsContains8080 = $(if ($ExtensionText) { $ExtensionText.Contains("127.0.0.1:8080") -or $ExtensionText.Contains("localhost:8080") } else { $false })
    extensionJsContainsTimeoutMessage = $(if ($ExtensionText) { $ExtensionText.IndexOf("downstream model backend did not respond", [System.StringComparison]::OrdinalIgnoreCase) -ge 0 } else { $false })
}

$ModelPolicyPath = Join-Path $Root ".leeway\agent-lee-model-policy.json"
$ModelOverridePath = Join-Path $Root ".leeway\agent-lee-model-override.json"

$ModelPolicy = $null
$ModelOverride = $null

try {
    if (Test-Path -LiteralPath $ModelPolicyPath -PathType Leaf) {
        $ModelPolicy = Get-Content -LiteralPath $ModelPolicyPath -Raw | ConvertFrom-Json
    }
}
catch {
    $ModelPolicy = [ordered]@{ error = $_.Exception.Message }
}

try {
    if (Test-Path -LiteralPath $ModelOverridePath -PathType Leaf) {
        $ModelOverride = Get-Content -LiteralPath $ModelOverridePath -Raw | ConvertFrom-Json
    }
}
catch {
    $ModelOverride = [ordered]@{ error = $_.Exception.Message }
}

$VSCodeProcesses = Get-VSCodeProcesses
$RecentLogs = Get-RecentLogs
$RecentReceipts = Get-RecentReceipts

$PreliminaryDiagnosis = @()

if ($RouteProbes.adapterQwen3Chat.ok -and $RouteProbes.routerQwen3Chat.ok -and $ExtensionSummary.extensionJsContains8080) {
    $PreliminaryDiagnosis += "Backend adapter/router Qwen3 probes pass, but extension source still contains 8080. VS Code may be bypassing adapter or using direct router fallback."
}

if ($RouteProbes.adapterQwen3Chat.ok -and $ExtensionSummary.extensionJsContainsTimeoutMessage) {
    $PreliminaryDiagnosis += "Adapter Qwen3 probe passes, but extension source contains timeout message. Timeout may be generated by extension-side timeout handling."
}

if ($RouteProbes.adapterQwen3Chat.ok -and $TimeoutMatches.Count -gt 0) {
    $PreliminaryDiagnosis += "Backend route passes. Stale timeout text exists in source. Need identify exact source file before patch."
}

if ($ModelProbes.qwen3ColdOrWarm.ok -and $ModelProbes.qwen3ColdOrWarm.elapsedSec -gt 45) {
    $PreliminaryDiagnosis += "Qwen3 works but cold response exceeds 45s. Any VS Code or adapter timeout below 120s is too short."
}

if ($VSCodeProcesses.Count -gt 0) {
    $DevPathHits = @($VSCodeProcesses | Where-Object { [string]$_.commandLine -match "extensionDevelopmentPath|leeway-agent-lee-chat|\.leeway-vscode" })
    if ($DevPathHits.Count -eq 0) {
        $PreliminaryDiagnosis += "VS Code process command line does not show extensionDevelopmentPath. VS Code may be loading installed/stale extension instead of workspace extension."
    }
}

if ($PreliminaryDiagnosis.Count -eq 0) {
    $PreliminaryDiagnosis += "No single root cause isolated yet. Inspect timeoutMatches, routeAndTimeoutMatches, VSCodeProcesses, and RecentLogs in diagnostic receipt."
}

$Diagnostic = [ordered]@{
    status = "DIAGNOSTIC_ONLY_NO_PATCH"
    checkedAt = (Get-Date).ToString("o")
    root = $Root
    receiptPath = $ReceiptPath
    diagDir = $DiagDir
    portStatus = $PortStatus
    portOwners = $PortOwners
    health = $Health
    modelProbes = $ModelProbes
    routeProbes = $RouteProbes
    extensionSummary = $ExtensionSummary
    modelPolicyPath = $ModelPolicyPath
    modelPolicy = $ModelPolicy
    modelOverridePath = $ModelOverridePath
    modelOverride = $ModelOverride
    timeoutMatches = $TimeoutMatches
    routeAndTimeoutMatches = $RouteAndTimeoutMatches
    vscodeProcesses = $VSCodeProcesses
    recentReceipts = $RecentReceipts
    recentLogs = $RecentLogs
    preliminaryDiagnosis = $PreliminaryDiagnosis
    nextStep = "Do not patch yet. Read this receipt and identify whether timeout is extension-side, wrong VS Code extension path, direct router fallback, or backend timeout."
}

Write-JsonFile -Path $ReceiptPath -Object $Diagnostic

# Also write readable summary.
$SummaryPath = Join-Path $DiagDir "SUMMARY.txt"

$SummaryLines = @()
$SummaryLines += "Agent Lee VS Code Live Timeout Deep Diagnostic"
$SummaryLines += "Timestamp: $Stamp"
$SummaryLines += "Root: $Root"
$SummaryLines += ""
$SummaryLines += "Port status:"
foreach ($Entry in $PortStatus.GetEnumerator()) {
    $SummaryLines += "  $($Entry.Key): $($Entry.Value)"
}
$SummaryLines += ""
$SummaryLines += "Route probes:"
$SummaryLines += "  adapter qwen3: $($RouteProbes.adapterQwen3Chat.ok) elapsed=$($RouteProbes.adapterQwen3Chat.elapsedSec)"
$SummaryLines += "  adapter no-model: $($RouteProbes.adapterNoModelChat.ok) elapsed=$($RouteProbes.adapterNoModelChat.elapsedSec)"
$SummaryLines += "  router qwen3: $($RouteProbes.routerQwen3Chat.ok) elapsed=$($RouteProbes.routerQwen3Chat.elapsedSec)"
$SummaryLines += "  router no-model: $($RouteProbes.routerNoModelChat.ok) elapsed=$($RouteProbes.routerNoModelChat.elapsedSec)"
$SummaryLines += ""
$SummaryLines += "Extension summary:"
$SummaryLines += "  extensionJsExists: $($ExtensionSummary.extensionJsExists)"
$SummaryLines += "  contains8787: $($ExtensionSummary.extensionJsContains8787)"
$SummaryLines += "  contains8080: $($ExtensionSummary.extensionJsContains8080)"
$SummaryLines += "  containsTimeoutMessage: $($ExtensionSummary.extensionJsContainsTimeoutMessage)"
$SummaryLines += ""
$SummaryLines += "Timeout source matches: $($TimeoutMatches.Count)"
foreach ($Match in $TimeoutMatches) {
    $SummaryLines += "  $($Match.path)"
}
$SummaryLines += ""
$SummaryLines += "Preliminary diagnosis:"
foreach ($Line in $PreliminaryDiagnosis) {
    $SummaryLines += "  - $Line"
}
$SummaryLines += ""
$SummaryLines += "Receipt: $ReceiptPath"

$SummaryLines | Set-Content -LiteralPath $SummaryPath -Encoding UTF8

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Green
Write-Host "Receipt: $ReceiptPath"
Write-Host "Summary: $SummaryPath"
Write-Host ""
Write-Host "Preliminary diagnosis:" -ForegroundColor Cyan
foreach ($Line in $PreliminaryDiagnosis) {
    Write-Host "- $Line"
}
Write-Host ""
