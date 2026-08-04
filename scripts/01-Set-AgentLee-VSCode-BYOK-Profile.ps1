[CmdletBinding()]
param(
    [string]$Root = "",
    [string]$AgentLeeOpenAIBaseUrl = "http://127.0.0.1:8080/v1",
    [string]$AgentLeeModel = "agent-lee",
    [string]$AgentLeeApiKey = "leeway-local-agent-lee"
)

if ([string]::IsNullOrWhiteSpace($Root)) {
    $CandidateRoot = Split-Path -Parent $PSScriptRoot
    $Loader = Join-Path $CandidateRoot ".leeway-runtime\Import-LeewayRuntime.ps1"
    if (Test-Path $Loader) {
        . $Loader
        $Root = $env:LEEWAY_ROOT
    } elseif ($env:LEEWAY_ROOT -and (Test-Path $env:LEEWAY_ROOT)) {
        $Root = $env:LEEWAY_ROOT
    } else {
        $Root = $CandidateRoot
    }
}
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
$ErrorActionPreference = "Stop"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

$VsCodeDir = Join-Path $Root ".vscode"
$SettingsPath = Join-Path $VsCodeDir "settings.json"
$ArchiveDir = Join-Path $Root "Archive"
$ReceiptsDir = Join-Path $ArchiveDir "receipts"
$BackupsDir = Join-Path $ArchiveDir "backups"
$ByokDocPath = Join-Path $Root "AGENT-LEE-VSCODE-BYOK.md"
$CandidateSettingsPath = Join-Path $VsCodeDir "agent-lee-byok-candidate-settings.json"
$ReceiptPath = Join-Path $ReceiptsDir "agent-lee-vscode-byok-setup-$Stamp.json"

New-Item -ItemType Directory -Force -Path $VsCodeDir, $ReceiptsDir, $BackupsDir | Out-Null

$receipt = [ordered]@{
    finalStatus = "PARTIAL_WITH_BLOCKERS"
    root = $Root
    timestamp = (Get-Date).ToString("o")
    agentLeeOpenAIBaseUrl = $AgentLeeOpenAIBaseUrl
    agentLeeModel = $AgentLeeModel
    filesChanged = @()
    backupsCreated = @()
    endpointProof = @()
    blockers = @()
    manualConfigureValues = [ordered]@{
        provider = "OpenAI-compatible / Custom OpenAI"
        baseUrl = $AgentLeeOpenAIBaseUrl
        apiKey = $AgentLeeApiKey
        model = $AgentLeeModel
        utilityModel = $AgentLeeModel
    }
}

function Save-Receipt {
    $script:receipt.timestamp = (Get-Date).ToString("o")
    $script:receipt | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
}

function Add-Blocker {
    param([string]$Message)
    if ([string]::IsNullOrWhiteSpace($Message)) { return }
    $script:receipt.blockers += $Message
    Write-Host "BLOCKER: $Message" -ForegroundColor Red
    Save-Receipt
}

function Backup-IfExists {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path) {
        $safe = ($Path.Replace($Root, "").TrimStart("\") -replace "[:\\\/]", "__")
        $backup = Join-Path $BackupsDir "$safe.bak-$Stamp"
        Copy-Item -LiteralPath $Path -Destination $backup -Force
        $script:receipt.backupsCreated += $backup
        return $backup
    }
    return $null
}

function Write-TextFile {
    param([string]$Path, [string]$Content)
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
    Backup-IfExists -Path $Path | Out-Null
    Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
    $script:receipt.filesChanged += $Path
    Save-Receipt
}

function Invoke-AgentLeeEndpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [object]$Body = $null,
        [int]$TimeoutSec = 60
    )

    $entry = [ordered]@{
        name = $Name
        method = $Method
        uri = $Uri
        ok = $false
        error = $null
        responsePath = Join-Path $ReceiptsDir "agent-lee-byok-$Stamp-$($Name -replace '[^a-zA-Z0-9_-]', '_').json"
    }

    try {
        if ($Method -eq "POST") {
            $json = $Body | ConvertTo-Json -Depth 20
            $resp = Invoke-RestMethod -Uri $Uri -Method Post -ContentType "application/json" -Body $json -TimeoutSec $TimeoutSec
        } else {
            $resp = Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec $TimeoutSec
        }

        $entry.ok = $true
        $resp | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $entry.responsePath -Encoding UTF8
    }
    catch {
        $entry.error = $_.Exception.Message
        Add-Blocker "$Name failed: $($_.Exception.Message)"
    }

    $script:receipt.endpointProof += $entry
    Save-Receipt
    return [pscustomobject]$entry
}

function Read-SettingsJson {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return [ordered]@{}
    }

    $raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        return [ordered]@{}
    }

    try {
        $obj = $raw | ConvertFrom-Json
$map = @{}
foreach ($p in $obj.PSObject.Properties) {
    $map[$p.Name] = $p.Value
}
return $map
    }
    catch {
        Add-Blocker "VS Code settings.json is not valid JSON. Remove invalid tokens like CLS. Path: $Path Error: $($_.Exception.Message)"
        throw
    }
}

function Write-SettingsJson {
    param([string]$Path, [hashtable]$Settings)
    $json = $Settings | ConvertTo-Json -Depth 50
    Write-TextFile -Path $Path -Content $json
}

try {
    Write-Host "=== Agent Lee VS Code BYOK setup ===" -ForegroundColor Green
    Write-Host "Root: $Root" -ForegroundColor Green
    Write-Host "Agent Lee OpenAI-compatible base URL: $AgentLeeOpenAIBaseUrl" -ForegroundColor Green
    Save-Receipt

    if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
        Add-Blocker "Root path does not exist: $Root"
        throw "Root path does not exist."
    }

    Invoke-AgentLeeEndpoint -Name "agent lee health 8080" -Method "GET" -Uri "http://127.0.0.1:8080/health" -TimeoutSec 30 | Out-Null

    $chatBody = @{
        model = $AgentLeeModel
        messages = @(
            @{
                role = "user"
                content = "Agent Lee, answer in one sentence: confirm you are the local Leeway-governed VS Code BYOK model endpoint."
            }
        )
    }

    Invoke-AgentLeeEndpoint -Name "agent lee openai chat completions" -Method "POST" -Uri "$AgentLeeOpenAIBaseUrl/chat/completions" -Body $chatBody -TimeoutSec 180 | Out-Null

    $settings = Read-SettingsJson -Path $SettingsPath

    $settings["python.analysis.autoSearchPaths"] = $true
    $settings["python.analysis.useLibraryCodeForTypes"] = $true
    $settings["python.analysis.extraPaths"] = @(
        (Join-Path $Root "Cerebral\.venv")
    )
    $settings["python.defaultInterpreterPath"] = (Join-Path $Root "Cerebral\.venv\Scripts\python.exe")

    $settings["terminal.integrated.env.windows"] = [ordered]@{
        OPENAI_API_KEY = $AgentLeeApiKey
        OPENAI_BASE_URL = $AgentLeeOpenAIBaseUrl
        OPENAI_MODEL = $AgentLeeModel
        AGENT_LEE_OPENAI_BASE_URL = $AgentLeeOpenAIBaseUrl
        AGENT_LEE_MODEL = $AgentLeeModel
        LEEWAY_AGENT_LEE_CORE = (Join-Path $Root "agent-lee-coding-mode")
        LEEWAY_RUNTIME_FABRIC = "http://127.0.0.1:4001"
    }

    $settings["leeway.agentLee.byok"] = [ordered]@{
        provider = "openai-compatible"
        baseUrl = $AgentLeeOpenAIBaseUrl
        model = $AgentLeeModel
        apiKeyEnv = "OPENAI_API_KEY"
        utilityModel = $AgentLeeModel
        runtimeFabric = "http://127.0.0.1:4001"
        routerHealth = "http://127.0.0.1:8080/health"
        note = "Use VS Code Chat/Codex Configure BYOK UI with baseUrl, apiKey, and model from AGENT-LEE-VSCODE-BYOK.md."
    }

    Write-SettingsJson -Path $SettingsPath -Settings $settings

    $envPath = Join-Path $Root ".env.local"
    $envContent = @"
OPENAI_API_KEY=$AgentLeeApiKey
OPENAI_BASE_URL=$AgentLeeOpenAIBaseUrl
OPENAI_MODEL=$AgentLeeModel
AGENT_LEE_OPENAI_BASE_URL=$AgentLeeOpenAIBaseUrl
AGENT_LEE_MODEL=$AgentLeeModel
LEEWAY_RUNTIME_FABRIC=http://127.0.0.1:4001
LEEWAY_AGENT_LEE_CORE=$(Join-Path $Root "agent-lee-coding-mode")
"@
    Write-TextFile -Path $envPath -Content $envContent

    $candidate = [ordered]@{
        note = "Candidate profile only. Use VS Code Chat/Codex Configure BYOK UI unless your extension exposes exact setting keys."
        provider = "OpenAI-compatible / Custom OpenAI"
        baseUrl = $AgentLeeOpenAIBaseUrl
        apiKey = $AgentLeeApiKey
        model = $AgentLeeModel
        utilityModel = $AgentLeeModel
        runtimeFabric = "http://127.0.0.1:4001"
    }
    $candidate | ConvertTo-Json -Depth 80 | Set-Content -LiteralPath $CandidateSettingsPath -Encoding UTF8
    $receipt.filesChanged += $CandidateSettingsPath

    $byokDoc = @"
# Agent Lee VS Code BYOK Setup

Use this profile in the VS Code Chat / Codex BYOK Configure UI.

Provider:
OpenAI-compatible / Custom OpenAI

Base URL:
$AgentLeeOpenAIBaseUrl

API key:
$AgentLeeApiKey

Main model:
$AgentLeeModel

Utility model:
$AgentLeeModel

Test router health:
http://127.0.0.1:8080/health

Test chat completions:
$AgentLeeOpenAIBaseUrl/chat/completions

PowerShell proof:

`$body = @{
  model = "$AgentLeeModel"
  messages = @(
    @{
      role = "user"
      content = "Agent Lee, confirm you are the local Leeway-governed VS Code BYOK model endpoint."
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$AgentLeeOpenAIBaseUrl/chat/completions" -Method Post -ContentType "application/json" -Body `$body -TimeoutSec 180 | ConvertTo-Json -Depth 20

Important:
Click Configure in the VS Code Chat BYOK panel and enter the values above.
"@
    Write-TextFile -Path $ByokDocPath -Content $byokDoc

    if ($receipt.blockers.Count -eq 0) {
        $receipt.finalStatus = "AGENT_LEE_VSCODE_BYOK_PROFILE_READY"
    } else {
        $receipt.finalStatus = "PARTIAL_WITH_BLOCKERS"
    }

    Save-Receipt

    Write-Host ""
    Write-Host "FINAL STATUS: $($receipt.finalStatus)" -ForegroundColor Yellow
    Write-Host "RECEIPT: $ReceiptPath" -ForegroundColor Green
    Write-Host "BYOK DOC: $ByokDocPath" -ForegroundColor Green
    Write-Host "CANDIDATE SETTINGS: $CandidateSettingsPath" -ForegroundColor Green

    if ($receipt.blockers.Count -gt 0) {
        Write-Host "BLOCKERS:" -ForegroundColor Red
        $receipt.blockers | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
        exit 1
    }

    exit 0
}
catch {
    Add-Blocker $_.Exception.Message
    $receipt.finalStatus = "PARTIAL_WITH_BLOCKERS"
    Save-Receipt
    Write-Host ""
    Write-Host "FINAL STATUS: PARTIAL_WITH_BLOCKERS" -ForegroundColor Red
    Write-Host "RECEIPT: $ReceiptPath" -ForegroundColor Yellow
    exit 1
}


