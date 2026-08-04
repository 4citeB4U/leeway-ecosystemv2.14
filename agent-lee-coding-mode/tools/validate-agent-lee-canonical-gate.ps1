# LEEWAY_HEADER - DO NOT REMOVE
#
# ID: LEEWAY_APP::AGENT_LEE::CANONICAL_IDENTITY_GATE::VALIDATE_AGENT_LEE_CANONICAL_GATE
# CLASSIFICATION: VALIDATION
# OWNER: LeeWay Local Runtime Stabilization
# PURPOSE: Required canonical identity gate for local startup and CI-style validation.
#
# This gate fails if any of the canonical proof scripts fail:
#   - prove-agent-lee-same-instance.ps1
#   - validate-agent-lee-canonical-instance.ps1
#   - validate-agent-lee-vscode-chat.ps1
#   - validate-agent-lee-stateful-research-harness.ps1
#   - validate-agent-lee-vscode-chat-research-e2e.ps1
#   - validate-agent-lee-vscode-chat-e2e.ps1
#   - validate-agent-lee-speech-style.ps1
#   - validate-agent-lee-runtime-execution.ps1
#   - validate-agent-lee-application-runtime.ps1
#   - validate-agent-lee-executable-abilities.ps1
#   - validate-agent-lee-orchestration-runtime.ps1
#   - validate-agent-lee-model-orchestration.ps1
#   - validate-agent-lee-skill-fabric.ps1
#   - validate-agent-lee-3d-ar-pipeline.ps1
#   - Leeway Runtime Fabric/tools/validate-leeway-skill-universe.ps1

[CmdletBinding()]
param(
    [ValidateSet('Fast', 'Full')]
    [string]$Mode = 'Fast',
    [switch]$LocalLiveLatency
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) { Write-Host "  $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "  [OK]  $Message" -ForegroundColor Green }
function Write-Fail([string]$Message) { Write-Host "  [FAIL] $Message" -ForegroundColor Red }

$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ReceiptDir = Join-Path $WorkspaceRoot 'Archive\receipts'
New-Item -ItemType Directory -Force -Path $ReceiptDir | Out-Null

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Scripts = @(
    [ordered]@{
        Name = 'prove-agent-lee-same-instance'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\prove-agent-lee-same-instance.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-canonical-instance'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-canonical-instance.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-vscode-chat'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat.ps1'
    },
    $(if ($LocalLiveLatency) {
        [ordered]@{
            Name = 'validate-agent-lee-chat-latency'
            Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-chat-latency.ps1'
        }
    }),
    [ordered]@{
        Name = 'validate-agent-lee-stateful-research-harness'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-stateful-research-harness.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-vscode-chat-research-e2e'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat-research-e2e.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-vscode-chat-e2e'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-vscode-chat-e2e.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-speech-style'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-speech-style.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-runtime-execution'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-runtime-execution.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-application-runtime'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-application-runtime.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-executable-abilities'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-executable-abilities.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-orchestration-runtime'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-orchestration-runtime.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-model-orchestration'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-model-orchestration.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-skill-fabric'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-skill-fabric.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-3d-ar-pipeline'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-3d-ar-pipeline.ps1'
        Args = @('-Mode', $Mode)
    },
    [ordered]@{
        Name = 'validate-agent-lee-3d-chess-proof'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-3d-chess-proof.ps1'
    },
    [ordered]@{
        Name = 'validate-agent-lee-full-capability'
        Path = Join-Path $WorkspaceRoot 'agent-lee-coding-mode\tools\validate-agent-lee-full-capability.ps1'
    },
    [ordered]@{
        Name = 'validate-leeway-skill-universe'
        Path = Join-Path $WorkspaceRoot 'Leeway Runtime Fabric\tools\validate-leeway-skill-universe.ps1'
    }
)

$Results = @()
$AllOk = $true

Write-Host "`n=== Agent Lee Canonical Identity Gate ===" -ForegroundColor Magenta
Write-Host "Workspace root: $WorkspaceRoot" -ForegroundColor DarkGray

foreach ($script in $Scripts) {
    if ($null -eq $script) {
        continue
    }
    if (-not (Test-Path -LiteralPath $script.Path)) {
        Write-Fail "$($script.Name) missing: $($script.Path)"
        $AllOk = $false
        $Results += [ordered]@{
            name = $script.Name
            path = $script.Path
            status = 'MISSING'
            exitCode = 1
        }
        continue
    }

    Write-Step "Running $($script.Name)"
    if ($script.PSObject.Properties.Name -contains 'Args') {
        $ScriptArgs = @($script.Args)
        & powershell.exe -ExecutionPolicy Bypass -File $script.Path @ScriptArgs
    } else {
        & powershell.exe -ExecutionPolicy Bypass -File $script.Path
    }
    $exitCode = $LASTEXITCODE
    $passed = ($exitCode -eq 0)
    if ($passed) {
        Write-Ok "$($script.Name) passed"
    } else {
        Write-Fail "$($script.Name) failed with exit code $exitCode"
        $AllOk = $false
    }

    $Results += [ordered]@{
        name = $script.Name
        path = $script.Path
        status = if ($passed) { 'PASS' } else { 'FAIL' }
        exitCode = $exitCode
    }
}

$Receipt = [ordered]@{
    gate = 'Agent Lee canonical identity'
    workspaceRoot = $WorkspaceRoot
    timestamp = (Get-Date).ToString('o')
    scripts = $Results
    finalStatus = if ($AllOk) { 'PASS' } else { 'FAIL' }
}

$ReceiptPath = Join-Path $ReceiptDir "agent-lee-canonical-gate-$Stamp.json"
$Receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
Write-Host "Receipt: $ReceiptPath" -ForegroundColor DarkGray

if ($AllOk) {
    Write-Ok 'Agent Lee canonical identity gate passed.'
    exit 0
}

Write-Fail 'Agent Lee canonical identity gate failed.'
exit 1
