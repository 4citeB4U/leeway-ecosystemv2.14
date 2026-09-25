#requires -Version 7.0
<#
LeeWay project-estate staging restore.
Creates a NEW directory and clones selected GitHub projects at pinned commits.
This script does not modify the damaged source volume unless the operator explicitly
chooses that volume as the destination. Recommended destination is independent storage.
#>

[CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='High')]
param(
    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]$LeeWayRoot,

    [switch]$IncludePrivate,
    [switch]$Execute
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'git is required.'
}

$root = [IO.Path]::GetFullPath($LeeWayRoot)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$destRoot = Join-Path $root "_recovery_staging\LeeWay-Project-Estate-$stamp"

if (-not $Execute) {
    Write-Host "PLAN ONLY: $destRoot"
    Write-Host 'No files or repositories were changed.'
    return
}

if (Test-Path -LiteralPath $destRoot) {
    throw "Refusing existing destination: $destRoot"
}

if ($PSCmdlet.ShouldProcess($destRoot,'Create project-estate recovery staging directory')) {
    New-Item -ItemType Directory -Path $destRoot -Force | Out-Null
}

$projects = @(
    @{Name='leolasliabrary'; Repo='https://github.com/4citeB4U/leolasliabrary.git'; Ref='cb3e7a716f71a6a77983d12436730fb9e4bf5953'; Private=$false},
    @{Name='LeeWay-Edge-GPU'; Repo='https://github.com/4citeB4U/LeeWay-Edge-GPU.git'; Ref='df5196f15df0843b30e6368724f9cf1756447f9f'; Private=$false},
    @{Name='LeeWay-Edge-RTC'; Repo='https://github.com/4citeB4U/LeeWay-Edge-RTC.git'; Ref='9906815adab063c03f4446a0bd65d489955d96e6'; Private=$true},
    @{Name='Leeway-Training'; Repo='https://github.com/4citeB4U/Leeway-Training.git'; Ref='c219ad14e41c6aa005fa8f9d58edef9ac5984f45'; Private=$false},
    @{Name='Agent-Lee-The-Sum-of-All-Systems'; Repo='https://github.com/4citeB4U/Agent-Lee-The-Sum-of-All-Systems.git'; Ref='19b316b67038416600467c4ae84dea5503f3f27e'; Private=$false},
    @{Name='leeway-model-family'; Repo='https://github.com/4citeB4U/leeway-model-family.git'; Ref='c3860139615f8f502ef61f483d181d9a41efe027'; Private=$true},
    @{Name='Leeway-admin-cockpit'; Repo='https://github.com/4citeB4U/Leeway-admin-cockpit.git'; Ref='9f28b033269f1c0f41e098e2fb0bbf2e886a0738'; Private=$true},
    @{Name='leeway-ecosystem-historical'; Repo='https://github.com/4citeB4U/leeway-ecosystem.git'; Ref='891bb3b3b22868ea42526c4dfa1b9ed2e2ae1144'; Private=$false}
)

$selected = @($projects | Where-Object { -not $_.Private -or $IncludePrivate })
$records = New-Object System.Collections.Generic.List[object]

foreach ($p in $selected) {
    $dest = Join-Path $destRoot $p.Name
    Write-Host "[STAGE] $($p.Name)" -ForegroundColor Cyan
    & git clone --no-checkout $p.Repo $dest
    if ($LASTEXITCODE -ne 0) { throw "Clone failed: $($p.Name)" }

    & git -C $dest checkout --detach $p.Ref
    if ($LASTEXITCODE -ne 0) { throw "Checkout failed: $($p.Name) @ $($p.Ref)" }

    $actual = (& git -C $dest rev-parse HEAD).Trim()
    $records.Add([pscustomobject]@{
        Name=$p.Name
        RequestedRef=$p.Ref
        ActualHead=$actual
        Private=$p.Private
        Pass=($actual -eq $p.Ref)
        Path=$dest
    })
}

$receipt = [ordered]@{
    schema='LEEWAY_PROJECT_ESTATE_STAGING_V1'
    createdAt=(Get-Date).ToString('o')
    destination=$destRoot
    includePrivate=[bool]$IncludePrivate
    projects=$records
    promotionState='STAGED_NOT_CANONICAL'
    formulaExecutionState='NOT_EXECUTED'
    runtimeExecutionState='NOT_EXECUTED'
}

$receiptPath = Join-Path $destRoot 'PROJECT-ESTATE-STAGING-RECEIPT.json'
$receipt | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $receiptPath -Encoding utf8

Write-Host "Staged project estate: $destRoot" -ForegroundColor Green
Write-Host "Receipt: $receiptPath"
Write-Host 'Private repositories require existing Git credentials and -IncludePrivate.'
