#requires -Version 7.0
<#
LeeWay disaster-recovery staging bootstrap.
Creates a NEW staging tree and clones pinned surviving GitHub authorities.
It does NOT write to or repair the damaged D: volume unless the operator explicitly
chooses a target path on D:. It never deletes, formats, cleans, or overwrites existing data.
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$LeeWayRoot,

    [switch]$Execute
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Command {
    param([Parameter(Mandatory)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Assert-NewDirectory {
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path -LiteralPath $Path) {
        throw "Refusing to reuse existing recovery staging path: $Path"
    }
}

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$Args)
    & git @Args
    if ($LASTEXITCODE -ne 0) {
        throw "git failed: git $($Args -join ' ')"
    }
}

function Restore-Repo {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Url,
        [string]$Commit,
        [string]$Branch
    )

    $dest = Join-Path $script:SourceRoot $Name
    if (Test-Path -LiteralPath $dest) {
        throw "Destination already exists: $dest"
    }

    Write-Host "[RESTORE] $Name" -ForegroundColor Cyan
    Invoke-Git -Args @('clone','--no-checkout',$Url,$dest)

    Push-Location $dest
    try {
        if ($Branch) {
            Invoke-Git -Args @('checkout',$Branch)
        }
        elseif ($Commit) {
            Invoke-Git -Args @('checkout','--detach',$Commit)
        }
        else {
            Invoke-Git -Args @('checkout','main')
        }

        $head = (& git rev-parse HEAD).Trim()
        if ($LASTEXITCODE -ne 0) { throw "Unable to resolve HEAD for $Name" }

        [pscustomobject]@{
            Name = $Name
            Url = $Url
            RequestedCommit = $Commit
            RequestedBranch = $Branch
            ResolvedHead = $head
            Path = $dest
        }
    }
    finally {
        Pop-Location
    }
}

$resolvedRoot = [System.IO.Path]::GetFullPath($LeeWayRoot)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$staging = Join-Path $resolvedRoot "_recovery_staging\D-drive-disaster-$stamp"
$script:SourceRoot = Join-Path $staging 'Sources'
$evidenceRoot = Join-Path $staging 'Evidence'

Write-Host "LeeWay recovery staging target: $staging"
Write-Host "Execute mode: $Execute"

if (-not $Execute) {
    Write-Host "PLAN ONLY. No filesystem or Git mutation performed."
    Write-Host "Re-run with -Execute only after confirming the target is NOT the damaged source volume."
    return
}

Assert-Command -Name git
Assert-NewDirectory -Path $staging

if ($PSCmdlet.ShouldProcess($staging, 'Create LeeWay disaster-recovery staging tree')) {
    New-Item -ItemType Directory -Path $script:SourceRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
}

$repos = @(
    @{ Name='LeeWay-Standards'; Url='https://github.com/4citeB4U/LeeWay-Standards.git'; Commit='8ab0b028d829330e1bd22295fa69192696d68b8c' },
    @{ Name='Leeway-Runtime-Fabric'; Url='https://github.com/4citeB4U/Leeway-Runtime-Fabric.git'; Commit='0c703e3a97f305bb1485a3ac3bcb0504fe565d58' },
    @{ Name='LeeWay-Agent-Skills-238'; Url='https://github.com/4citeB4U/LeeWay-Agent-Skills.git'; Branch='feature/full-238-gateway-promotion' },
    @{ Name='Leeway-formula-live'; Url='https://github.com/4citeB4U/Leeway-formula-live.git'; Commit='febaad02c156180c38e90b2b659df003d5d196f9' },
    @{ Name='LEEWAY-DEVICE-BRIDGE'; Url='https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE.git'; Commit='7cb4669d1a67820a8b3074f1e32f45399aa1bee3' },
    @{ Name='LEEWAY-BRIDGE-'; Url='https://github.com/4citeB4U/LEEWAY-BRIDGE-.git'; Commit='2c102504719fc8dd4ea2b9e19238831cb6e416b8' },
    @{ Name='agentleevoice'; Url='https://github.com/4citeB4U/agentleevoice.git'; Commit='fc45fd35c3baa2385e7d3cb15d9773192a9f9e12' },
    @{ Name='Leeway-live'; Url='https://github.com/4citeB4U/Leeway-live.git'; Commit='37c6be76079911cb62b79b08bc6bb46dd21836db' },
    @{ Name='LEEWAY-VSCODE'; Url='https://github.com/4citeB4U/LEEWAY-VSCODE.git'; Commit='735442601bb6e79db47eec91a92cb087f7ea8809' }
)

$results = foreach ($r in $repos) {
    Restore-Repo -Name $r.Name -Url $r.Url -Commit $r.Commit -Branch $r.Branch
}

# Verify Git blob identities for the recovered always-on authority files.
$skillsPath = Join-Path $script:SourceRoot 'LeeWay-Agent-Skills-238'
$blobChecks = @(
    @{ Path='AGENTS.md'; Expected='d60f5e395d64fb6a94bb40bb7e999538b09abee7' },
    @{ Path='skills/leeway-continuity-authority/SKILL.md'; Expected='00a08a37e65b6404eae11b873072aed75d7928bf' },
    @{ Path='skills/leeway-context-engineering/SKILL.md'; Expected='ae6c143c1ec473d38eb8b8c565db475b32f93956' },
    @{ Path='skills/leeway-formula-governance/SKILL.md'; Expected='f5b6d042c6809bc49fadfa578a45b92a052a9d51' },
    @{ Path='skills/leeway-formula-authority-recovery/SKILL.md'; Expected='9b93b01e84af3dc9cf02f00ed58fbc01737025d6' }
)

$blobResults = foreach ($check in $blobChecks) {
    $full = Join-Path $skillsPath $check.Path
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        [pscustomobject]@{ Path=$check.Path; Expected=$check.Expected; Actual=$null; Pass=$false }
        continue
    }
    $actual = (& git -C $skillsPath hash-object -- $check.Path).Trim()
    [pscustomobject]@{
        Path = $check.Path
        Expected = $check.Expected
        Actual = $actual
        Pass = ($actual -eq $check.Expected)
    }
}

$receipt = [ordered]@{
    schema = 'LEEWAY_DISASTER_RECOVERY_STAGING_RECEIPT_V1'
    createdAt = (Get-Date).ToString('o')
    leewayRoot = $resolvedRoot
    stagingRoot = $staging
    sourceRepos = $results
    authorityBlobChecks = $blobResults
    formulaExecutionState = 'NOT_EXECUTED'
    runtimeExecutionState = 'NOT_EXECUTED'
    veritasState = if (($blobResults.Pass -notcontains $false)) { 'SOURCE_INTEGRITY_PARTIAL_PASS' } else { 'FAIL' }
    promotionState = 'STAGED_NOT_CANONICAL'
}

$receiptPath = Join-Path $evidenceRoot 'recovery-staging-receipt.json'
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding utf8

Write-Host ""
Write-Host "Recovery staging complete: $staging" -ForegroundColor Green
Write-Host "Receipt: $receiptPath"
Write-Host "Nothing in this staging tree is canonical until local authority reconciliation and Veritas complete."
