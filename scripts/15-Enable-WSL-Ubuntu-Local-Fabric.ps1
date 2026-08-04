param(
    [string]$RuntimeFabricBaseUrl = 'http://127.0.0.1:4001',
    [string]$CerebralBaseUrl = 'http://127.0.0.1:8765',
    [string]$Distro = 'Ubuntu',
    [switch]$SkipCerebralProof
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$receiptRoot = Join-Path $repoRoot 'Archive\receipts'
$reportRoot = Join-Path $repoRoot 'Archive\reports\recovery-pack'
$null = New-Item -ItemType Directory -Force -Path $receiptRoot
$null = New-Item -ItemType Directory -Force -Path $reportRoot

$runId = "15-Enable-WSL-Ubuntu-Local-Fabric-$stamp"
$receiptPath = Join-Path $receiptRoot "$runId.json"
$reportPath = Join-Path $reportRoot "$runId.md"

function Invoke-LeewayJson {
    param(
        [Parameter(Mandatory = $true)][ValidateSet('GET','POST')] [string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [object]$Body = $null,
        [int]$TimeoutSec = 60
    )

    $params = @{
        Uri         = $Url
        Method      = $Method
        TimeoutSec   = $TimeoutSec
        ErrorAction  = 'Stop'
        ContentType  = 'application/json'
        Headers      = @{ Accept = 'application/json' }
        UseBasicParsing = $true
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 12)
    }

    $response = Invoke-WebRequest @params
    $json = if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null }
    [pscustomobject]@{
        statusCode = [int]$response.StatusCode
        body = $json
        raw = $response.Content
    }
}

function Require-Truthy {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$ErrorCode,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw [System.InvalidOperationException]::new("${ErrorCode}: $Message")
    }
}

$result = [ordered]@{
    script = '15-Enable-WSL-Ubuntu-Local-Fabric.ps1'
    runId = $runId
    timestamp = (Get-Date).ToString('o')
    runtimeFabricBaseUrl = $RuntimeFabricBaseUrl
    cerebralBaseUrl = $CerebralBaseUrl
    distro = $Distro
    steps = @()
    receipts = @()
    status = 'PENDING'
}

try {
    $before = Invoke-LeewayJson -Method GET -Url "$RuntimeFabricBaseUrl/device/wsl/status" -TimeoutSec 20
    Require-Truthy ($before.body.ok -eq $true) 'WSL_STATUS_NOT_OK' 'Runtime Fabric did not return ok:true for /device/wsl/status.'
    Require-Truthy ($before.body.available -eq $true) 'WSL_UNAVAILABLE' 'wsl.exe is not available on this Windows device.'

    $ubuntuBefore = $before.body.ubuntu
    Require-Truthy ($ubuntuBefore.installed -eq $true) 'WSL_UBUNTU_NOT_INSTALLED' "$Distro is not installed in WSL."

    $result.steps += [ordered]@{
        name = 'read-wsl-status-before-start'
        ok = $true
        running = [bool]$ubuntuBefore.running
        state = $ubuntuBefore.state
        receiptPath = $null
    }

    $start = Invoke-LeewayJson -Method POST -Url "$RuntimeFabricBaseUrl/device/wsl/start" -Body @{ distro = $Distro } -TimeoutSec 180
    Require-Truthy ($start.body.ok -eq $true) 'WSL_START_FAILED' 'Runtime Fabric could not start Ubuntu WSL.'
    Require-Truthy ([string]::IsNullOrWhiteSpace($start.body.receiptPath) -eq $false) 'WSL_START_NO_RECEIPT' 'WSL start did not return a receipt path.'
    Require-Truthy ([string]::IsNullOrWhiteSpace($start.body.stdout) -eq $false) 'WSL_START_NO_STDOUT' 'WSL start did not return uname -a stdout.'

    $result.receipts += $start.body.receiptPath
    $result.steps += [ordered]@{
        name = 'start-ubuntu-wsl'
        ok = $true
        stdout = $start.body.stdout
        stderr = $start.body.stderr
        exitCode = $start.body.exitCode
        receiptPath = $start.body.receiptPath
        keepaliveReceiptPath = $start.body.keepaliveReceiptPath
    }
    if ($start.body.keepaliveReceiptPath) {
        $result.receipts += $start.body.keepaliveReceiptPath
    }

    Start-Sleep -Seconds 2
    $after = Invoke-LeewayJson -Method GET -Url "$RuntimeFabricBaseUrl/device/wsl/status" -TimeoutSec 20
    Require-Truthy ($after.body.ok -eq $true) 'WSL_STATUS_AFTER_NOT_OK' 'Runtime Fabric did not return ok:true after WSL start.'
    Require-Truthy ($after.body.ubuntu.running -eq $true) 'WSL_NOT_RUNNING' 'Ubuntu WSL did not remain running after start.'

    $result.steps += [ordered]@{
        name = 'read-wsl-status-after-start'
        ok = $true
        running = [bool]$after.body.ubuntu.running
        state = $after.body.ubuntu.state
        receiptPath = $null
    }

    $plan = Invoke-LeewayJson -Method POST -Url "$RuntimeFabricBaseUrl/terminal/plan" -Body @{
        input = 'uname -a'
        shell = 'wslUbuntu'
        cwd = '/home'
    } -TimeoutSec 30
    Require-Truthy ($plan.body.ok -eq $true) 'TERMINAL_PLAN_FAILED' 'Runtime Fabric refused the WSL terminal plan.'

    $result.steps += [ordered]@{
        name = 'plan-wsl-uname'
        ok = $true
        planId = $plan.body.planId
        command = $plan.body.command
        shell = $plan.body.shell
        distro = $plan.body.distro
        cwd = $plan.body.cwd
    }

    $execute = Invoke-LeewayJson -Method POST -Url "$RuntimeFabricBaseUrl/terminal/execute" -Body @{
        planId = $plan.body.planId
        approved = $true
    } -TimeoutSec 180
    Require-Truthy ($execute.body.ok -eq $true) 'TERMINAL_EXECUTION_FAILED' 'Runtime Fabric failed to execute the approved WSL terminal plan.'
    Require-Truthy ([string]::IsNullOrWhiteSpace($execute.body.receiptPath) -eq $false) 'TERMINAL_EXECUTION_NO_RECEIPT' 'Terminal execution did not return a receipt path.'
    Require-Truthy ($execute.body.exitCode -eq 0) 'TERMINAL_EXECUTION_NONZERO' 'WSL terminal execution did not exit with code 0.'
    Require-Truthy (($execute.body.stdout -as [string]) -match '^Linux\s+') 'TERMINAL_EXECUTION_BAD_STDOUT' 'WSL terminal execution did not return Linux uname output.'

    $result.receipts += $execute.body.receiptPath
    $result.steps += [ordered]@{
        name = 'execute-wsl-uname'
        ok = $true
        receiptPath = $execute.body.receiptPath
        stdout = $execute.body.stdout
        stderr = $execute.body.stderr
        exitCode = $execute.body.exitCode
        command = $execute.body.command
        distro = $execute.body.distro
        cwd = $execute.body.cwd
    }

    $cerebralStatus = $null
    $cerebralChat = $null
    if (-not $SkipCerebralProof) {
        try {
            $cerebralStatus = Invoke-LeewayJson -Method GET -Url "$CerebralBaseUrl/api/device/wsl/status" -TimeoutSec 20
            Require-Truthy ($cerebralStatus.body.ubuntu.running -eq $true) 'CEREBRAL_WSL_NOT_RUNNING' 'Cerebral did not surface Ubuntu WSL as running.'
            $cerebralChat = Invoke-LeewayJson -Method POST -Url "$CerebralBaseUrl/api/agent-lee/chat" -Body @{
                input = 'Who are you and what is your lineage?'
                mode = 'chat'
                speak = $false
            } -TimeoutSec 180
            Require-Truthy ($cerebralChat.body.ok -eq $true) 'CEREBRAL_AGENT_CHAT_FAILED' 'Cerebral Agent Lee chat did not return ok:true.'
            $result.steps += [ordered]@{
                name = 'cerebral-proof'
                ok = $true
                wslRunning = [bool]$cerebralStatus.body.ubuntu.running
                agentChatOk = [bool]$cerebralChat.body.ok
                sourceOfEmbodiment = $cerebralChat.body.sourceOfEmbodiment
                corePath = $cerebralChat.body.corePath
                receiptPath = $null
            }
        } catch {
            $result.steps += [ordered]@{
                name = 'cerebral-proof'
                ok = $false
                error = $_.Exception.Message
            }
            throw
        }
    }

    $result.status = 'PASS'
    $result.runtimeFabric = [ordered]@{
        before = $before.body
        start = $start.body
        after = $after.body
        plan = $plan.body
        execute = $execute.body
        cerebralStatus = $cerebralStatus.body
        cerebralChat = $cerebralChat.body
    }
}
catch {
    $result.status = 'FAIL'
    $result.error = $_.Exception.Message
    $result.scriptLine = $_.InvocationInfo.ScriptLineNumber
    $result.scriptFile = $_.InvocationInfo.ScriptName
    throw
}
finally {
    $result | ConvertTo-Json -Depth 16 | Set-Content -Path $receiptPath -Encoding UTF8
    @(
        "# 15 Enable WSL Ubuntu Local Fabric",
        "",
        "Run ID: $runId",
        "Status: $($result.status)",
        "",
        "## Receipts",
        ($result.receipts | ForEach-Object { "- $($_)" }),
        "",
        "## Steps",
        ($result.steps | ConvertTo-Json -Depth 16),
        "",
        "## Result",
        ($result | ConvertTo-Json -Depth 16)
    ) | Set-Content -Path $reportPath -Encoding UTF8
}

$result
