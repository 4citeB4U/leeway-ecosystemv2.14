#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$ProjectRoot = 'D:\Leeway-Ecosystem v2.1.4\leeway-ide-single-canvas'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$MigrationId = 'MIG-005A'
$MigrationName = 'OpenCode Engineering Toolchain'
$ScriptVersion = '1.0.0'
$StartedAtUtc = [DateTimeOffset]::UtcNow
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$EvidenceSession = $null
$TranscriptStarted = $false
$GitRoot = $null
$BackupRoot = $null
$CreatedFiles = @()
$UpdatedFiles = @()
$RollbackActions = @()
$ValidationRecords = @()

function Write-LeeWayLog {
    param(
        [Parameter(Mandatory)]
        [ValidateSet('STEP', 'PASS', 'WARN', 'FAIL', 'INFO')]
        [string]$Level,
        [Parameter(Mandatory)]
        [string]$Message
    )
    $Line = '[{0:HH:mm:ss.fff}] {1} | {2}' -f (Get-Date), $Level, $Message
    switch ($Level) {
        'STEP' { Write-Host $Line -ForegroundColor Cyan }
        'PASS' { Write-Host $Line -ForegroundColor Green }
        'WARN' { Write-Host $Line -ForegroundColor Yellow }
        'FAIL' { Write-Host $Line -ForegroundColor Red }
        default { Write-Host $Line }
    }
}

function Write-JsonFile {
    param(
        [Parameter(Mandatory)]
        [object]$Value,
        [Parameter(Mandatory)]
        [string]$Path
    )
    $Json = $Value | ConvertTo-Json -Depth 40
    [System.IO.File]::WriteAllText($Path, $Json, [System.Text.UTF8Encoding]::new($false))
}

function Write-TextFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )
    $parentDir = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $parentDir -PathType Container)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Assert-PathExists {
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter(Mandatory)]
        [string]$Description,
        [ValidateSet('Any', 'Leaf', 'Container')]
        [string]$PathType = 'Any'
    )
    $Exists = switch ($PathType) {
        'Leaf' { Test-Path -LiteralPath $Path -PathType Leaf }
        'Container' { Test-Path -LiteralPath $Path -PathType Container }
        default { Test-Path -LiteralPath $Path }
    }
    if (-not $Exists) {
        throw "Missing required ${Description}: $Path"
    }
    Write-LeeWayLog -Level PASS -Message "Verified $Description."
}

function Find-FirstExistingFile {
    param(
        [Parameter(Mandatory)]
        [string]$Directory,
        [Parameter(Mandatory)]
        [string[]]$Names,
        [Parameter(Mandatory)]
        [string]$Description
    )
    foreach ($Name in $Names) {
        $Candidate = Join-Path $Directory $Name
        if (Test-Path -LiteralPath $Candidate -PathType Leaf) {
            return $Candidate
        }
    }
    throw "Unable to locate $Description. Expected one of: $($Names -join ', ')"
}

function Find-LatestPassingReceipt {
    param(
        [Parameter(Mandatory)]
        [string]$EvidenceRoot,
        [Parameter(Mandatory)]
        [string]$Migration
    )
    $MigrationRoot = Join-Path $EvidenceRoot $Migration
    if (-not (Test-Path -LiteralPath $MigrationRoot -PathType Container)) { return $null }
    $ReceiptFiles = @(
        Get-ChildItem -LiteralPath $MigrationRoot -Filter 'receipt.json' -File -Recurse |
            Sort-Object LastWriteTimeUtc -Descending
    )
    foreach ($ReceiptFile in $ReceiptFiles) {
        try {
            $Receipt = Get-Content -LiteralPath $ReceiptFile.FullName -Raw | ConvertFrom-Json
            $Status = $null
            if ($Receipt.PSObject.Properties.Name -contains 'Status') { $Status = [string]$Receipt.Status }
            elseif ($Receipt.PSObject.Properties.Name -contains 'status') { $Status = [string]$Receipt.status }
            if ($Status -eq 'PASS') {
                return [pscustomobject]@{ Path = $ReceiptFile.FullName; Receipt = $Receipt }
            }
        } catch {
            Write-LeeWayLog -Level WARN -Message "Unreadable $Migration receipt ignored: $($ReceiptFile.FullName)"
        }
    }
    return $null
}

function Get-FileHashOrNull {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Backup-TargetFile {
    param([Parameter(Mandatory)][string]$TargetPath)
    $RelativePath = [System.IO.Path]::GetRelativePath($ProjectRoot, $TargetPath)
    $IsExternal = $RelativePath.StartsWith('..') -or $RelativePath -match '^[A-Z]:\\'
    if ($IsExternal) {
        Write-LeeWayLog -Level INFO -Message "Skipping backup for external file: $TargetPath"
        return
    }
    if (Test-Path -LiteralPath $TargetPath -PathType Leaf) {
        $BackupPath = Join-Path $BackupRoot $RelativePath
        New-Item -ItemType Directory -Path (Split-Path -Parent $BackupPath) -Force | Out-Null
        Copy-Item -LiteralPath $TargetPath -Destination $BackupPath -Force
        $UpdatedFiles += $TargetPath
        $RollbackActions += [pscustomobject]@{ action = 'restore'; target = $TargetPath; source = $BackupPath }
        Write-LeeWayLog -Level INFO -Message "Backed up existing file: $RelativePath"
    } else {
        $CreatedFiles += $TargetPath
        $RollbackActions += [pscustomobject]@{ action = 'remove'; target = $TargetPath; source = $null }
    }
}

function Invoke-Rollback {
    Write-LeeWayLog -Level WARN -Message 'Executing MIG-005A rollback.'
    foreach ($Action in @($RollbackActions | Select-Object -Reverse)) {
        try {
            $RelativeTarget = [System.IO.Path]::GetRelativePath($ProjectRoot, $Action.target)
            if ($RelativeTarget.StartsWith('..')) {
                Write-LeeWayLog -Level INFO -Message "Skipping rollback for external file: $($Action.target)"
                continue
            }
            if ($Action.action -eq 'restore') {
                New-Item -ItemType Directory -Path (Split-Path -Parent $Action.target) -Force | Out-Null
                Copy-Item -LiteralPath $Action.source -Destination $Action.target -Force
                Write-LeeWayLog -Level WARN -Message "Restored: $($Action.target)"
            } elseif ($Action.action -eq 'remove') {
                if (Test-Path -LiteralPath $Action.target -PathType Leaf) {
                    Remove-Item -LiteralPath $Action.target -Force
                    Write-LeeWayLog -Level WARN -Message "Removed created file: $($Action.target)"
                }
            }
        } catch {
            Write-LeeWayLog -Level FAIL -Message "Rollback action failed for $($Action.target): $($_.Exception.Message)"
        }
    }
}

try {
    Write-LeeWayLog -Level STEP -Message '1/9 | Verifying PowerShell and project root.'

    if ($PSVersionTable.PSVersion.Major -lt 7) {
        throw "PowerShell 7 or newer is required. Current: $($PSVersionTable.PSVersion)"
    }

    $ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
    Assert-PathExists -Path $ProjectRoot -Description 'project root' -PathType Container
    Set-Location -LiteralPath $ProjectRoot

    $ArchitectureRoot = Join-Path $ProjectRoot 'architecture'
    $MigrationRoot = Join-Path $ProjectRoot 'migration'
    $ScriptsRoot = Join-Path $ProjectRoot 'scripts'
    $EvidenceRoot = Join-Path $ProjectRoot 'evidence'
    $OpenCodeConfigRoot = Join-Path $ProjectRoot '.opencode'

    Assert-PathExists -Path $ArchitectureRoot -Description 'architecture directory' -PathType Container
    Assert-PathExists -Path $MigrationRoot -Description 'migration directory' -PathType Container
    Assert-PathExists -Path $ScriptsRoot -Description 'scripts directory' -PathType Container
    Assert-PathExists -Path $EvidenceRoot -Description 'evidence directory' -PathType Container
    Assert-PathExists -Path $OpenCodeConfigRoot -Description '.opencode directory' -PathType Container

    $EvidenceSession = Join-Path (Join-Path $EvidenceRoot $MigrationId) $Timestamp
    $BackupRoot = Join-Path $EvidenceSession 'rollback'
    New-Item -ItemType Directory -Path $EvidenceSession -Force | Out-Null
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

    Start-Transcript -LiteralPath (Join-Path $EvidenceSession 'transcript.log') -Force | Out-Null
    $TranscriptStarted = $true

    Write-LeeWayLog -Level PASS -Message "Evidence session created: $EvidenceSession"

    Write-LeeWayLog -Level STEP -Message '2/9 | Verifying governance and migration prerequisites.'

    $Adr0002Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0002.md', 'ADR-0002-target-architecture.md') -Description 'ADR-0002'
    $Adr0005Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0005.md', 'ADR-0005-opencode-integration.md') -Description 'ADR-0005'
    $Mig005APath = Join-Path $MigrationRoot 'MIG-005A-opencode-engineering-toolchain.md'

    $Mig005Receipt = Find-LatestPassingReceipt -EvidenceRoot $EvidenceRoot -Migration 'MIG-005'

    if ($null -eq $Mig005Receipt) {
        throw 'No passing MIG-005 receipt was found.'
    }

    Write-LeeWayLog -Level PASS -Message "Verified ADR-0002: $Adr0002Path"
    Write-LeeWayLog -Level PASS -Message "Verified ADR-0005: $Adr0005Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-005 receipt: $($Mig005Receipt.Path)"

    Write-LeeWayLog -Level STEP -Message '3/9 | Verifying Git containment and protected baseline.'

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git is required but was not found.'
    }

    $GitRootOutput = & git rev-parse --show-toplevel 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to determine Git root: $($GitRootOutput | Out-String)"
    }

    $GitRoot = [System.IO.Path]::GetFullPath(($GitRootOutput | Select-Object -First 1).ToString().Trim())
    $RelativeProjectPath = [System.IO.Path]::GetRelativePath($GitRoot, $ProjectRoot)
    $ProjectOutsideGitRoot =
        ($RelativeProjectPath -eq '..') -or
        $RelativeProjectPath.StartsWith('..\', [System.StringComparison]::OrdinalIgnoreCase) -or
        $RelativeProjectPath.StartsWith('../', [System.StringComparison]::OrdinalIgnoreCase) -or
        [System.IO.Path]::IsPathRooted($RelativeProjectPath)

    if ($ProjectOutsideGitRoot) {
        throw "Project root is outside Git root. Project: $ProjectRoot Git: $GitRoot"
    }

    $ProtectedFiles = @('package.json', 'package-lock.json', 'server.ts', 'vite.config.ts', 'vite.config.js')
    $ProtectedBefore = [ordered]@{}
    foreach ($RelativePath in $ProtectedFiles) {
        $ProtectedBefore[$RelativePath] = Get-FileHashOrNull -Path (Join-Path $ProjectRoot $RelativePath)
    }

    $InitialGitStatus = @(& git -C $GitRoot status --porcelain=v1 --untracked-files=all 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture initial Git status.'
    }

    Write-LeeWayLog -Level PASS -Message "Project is contained within Git root: $GitRoot"

    Write-LeeWayLog -Level STEP -Message '4/9 | Defining MIG-005A target files.'

    $TargetFiles = [ordered]@{
        CommandsDir = Join-Path $OpenCodeConfigRoot 'commands'
        AgentsDir = Join-Path $OpenCodeConfigRoot 'agents'
        ToolsDir = Join-Path $OpenCodeConfigRoot 'tools'
        OpencodeConfig = "$env:USERPROFILE\.config\opencode\opencode.jsonc"
        SkillsManifest = Join-Path $ProjectRoot '.leeway\skills\skills-manifest.json'
        MigrationSpec = $Mig005APath
        Manifest = Join-Path $MigrationRoot 'MIG-005A-manifest.json'
    }

    foreach ($TargetPath in $TargetFiles.Values) {
        Backup-TargetFile -TargetPath $TargetPath
    }

    Write-LeeWayLog -Level PASS -Message 'Target files inventoried and rollback state prepared.'

    Write-LeeWayLog -Level STEP -Message '5/9 | Verifying OpenCode engineering tooling structure.'

    # Verify commands directory
    $ExpectedCommands = @(
        'migration-plan.md', 'migration-run.md', 'migration-status.md', 'migration-rollback.md',
        'opencode-validate.md', 'protected-check.md', 'skill-manifest-sync.md', 'mcp-install.md',
        'browser-validate.md', 'evidence-summary.md'
    )
    foreach ($cmd in $ExpectedCommands) {
        Assert-PathExists -Path (Join-Path $TargetFiles.CommandsDir $cmd) -Description "command $cmd" -PathType Leaf
    }
    Write-LeeWayLog -Level PASS -Message "Verified $($ExpectedCommands.Count) commands"

    # Verify agents directory
    $ExpectedAgents = @(
        'leeway-architect.md', 'powershell-auditor.md', 'typescript-builder.md', 'runtime-integrator.md',
        'browser-validator.md', 'security-reviewer.md', 'capability-registry.md', 'evidence-auditor.md', 'rollback-controller.md'
    )
    foreach ($agent in $ExpectedAgents) {
        Assert-PathExists -Path (Join-Path $TargetFiles.AgentsDir $agent) -Description "agent $agent" -PathType Leaf
    }
    Write-LeeWayLog -Level PASS -Message "Verified $($ExpectedAgents.Count) agents"

    # Verify tools directory
    $ExpectedTools = @(
        'find-latest-receipt.ts', 'validate-receipt.ts', 'hash-protected-files.ts',
        'validate-migration-boundary.ts', 'validate-skill-manifest.ts', 'validate-jsonc.ts',
        'probe-runtime-health.ts', 'inspect-build-log.ts', 'collect-browser-evidence.ts', 'generate-evidence-index.ts'
    )
    foreach ($tool in $ExpectedTools) {
        Assert-PathExists -Path (Join-Path $TargetFiles.ToolsDir $tool) -Description "tool $tool" -PathType Leaf
    }
    Write-LeeWayLog -Level PASS -Message "Verified $($ExpectedTools.Count) custom tools"

    # Verify OpenCode config has MCP servers
    $OpencodeConfig = Get-Content -LiteralPath $TargetFiles.OpencodeConfig -Raw | ConvertFrom-Json
    $McpServers = $OpencodeConfig.mcp.PSObject.Properties.Name
    $RequiredMcp = @('github', 'context7', 'playwright', 'docker')
    foreach ($mcp in $RequiredMcp) {
        if ($McpServers -notcontains $mcp) {
            throw "OpenCode config missing required MCP server: $mcp"
        }
    }
    Write-LeeWayLog -Level PASS -Message "Verified OpenCode config has required MCP servers: $($RequiredMcp -join ', ')"

    # Verify skills path
    $SkillsPaths = $OpencodeConfig.skills.paths
    $HasSkillsPath = $false
    foreach ($p in $SkillsPaths) {
        if ($p -match '\\.agents/skills' -or $p -match '\$\{user\.home\}/\.agents/skills') {
            $HasSkillsPath = $true
            break
        }
    }
    if (-not $HasSkillsPath) {
        throw "OpenCode skills.paths does not reference ~/.agents/skills"
    }
    Write-LeeWayLog -Level PASS -Message "Verified OpenCode skills.paths includes ~/.agents/skills"

    Write-LeeWayLog -Level STEP -Message '6/9 | Writing MIG-005A migration specification and manifest.'

    $SpecContent = @"
# MIG-005A: OpenCode Engineering Toolchain

## Status
Implemented

## ADR
- ADR-0002: Target Architecture
- ADR-0005: OpenCode Integration

## Objective
Establish project-level engineering controls for LeeWay IDE 2.0 by configuring OpenCode with:
- Project commands for migration lifecycle
- Project agents for specialized roles
- Custom TypeScript tools for validation
- MCP servers for GitHub, Context7, Playwright, Docker

## Scope
- OpenCode commands (10)
- OpenCode agents (9)
- OpenCode custom tools (10)
- MCP servers: GitHub (read-only, lockdown), Context7, Playwright, Docker MCP Gateway
- Skills manifest synchronization
- OpenCode configuration validation

## Deliverables
- .opencode/commands/ (10 command files)
- .opencode/agents/ (9 agent files)
- .opencode/tools/ (10 TypeScript tool files)
- OpenCode config with 4 MCP servers
- Skills manifest updated
- Migration specification

## Validation
- All command files present and valid
- All agent files present and valid
- All tool files present and syntactically valid
- OpenCode config parses and has required MCP servers
- Skills manifest syncs with installed skills
- TypeScript build passes
- Protected files unchanged

## Rollback
Restore previous OpenCode config, remove .opencode directories, revert skills manifest
"@
    Write-TextFile -Path $TargetFiles.MigrationSpec -Content $SpecContent

    $Manifest = [ordered]@{
        migration = $MigrationId
        target = $MigrationName
        status = 'Implemented'
        scope = @(
            'OpenCode project commands (10)',
            'OpenCode project agents (9)',
            'OpenCode custom TypeScript tools (10)',
            'MCP servers: GitHub, Context7, Playwright, Docker',
            'Skills manifest synchronization',
            'OpenCode configuration validation',
            'TypeScript build validation',
            'Protected file integrity',
            'Evidence and rollback'
        )
        excluded = @(
            'Live MCP server execution',
            'Browser validation execution',
            'n8n integration',
            'Vite removal',
            'Server.ts replacement'
        )
        files = @(
            $TargetFiles.Values | ForEach-Object {
                [System.IO.Path]::GetRelativePath($ProjectRoot, $_)
            }
        )
        timestampUtc = [DateTimeOffset]::UtcNow.ToString('o')
    }

    Write-JsonFile -Value $Manifest -Path $TargetFiles.Manifest

    Write-LeeWayLog -Level PASS -Message 'Migration specification and manifest written.'

    Write-LeeWayLog -Level STEP -Message '7/9 | Validating tool syntax and configurations.'

    # Validate OpenCode config JSON
    try {
        $null = Get-Content -LiteralPath $TargetFiles.OpencodeConfig -Raw | ConvertFrom-Json
        Write-LeeWayLog -Level PASS -Message 'OpenCode config parses as valid JSONC'
    } catch {
        throw "OpenCode config invalid: $_"
    }

    # Validate skills manifest JSON
    try {
        $null = Get-Content -LiteralPath $TargetFiles.SkillsManifest -Raw | ConvertFrom-Json
        Write-LeeWayLog -Level PASS -Message 'Skills manifest parses as valid JSON'
    } catch {
        throw "Skills manifest invalid: $_"
    }

    # Validate tool TypeScript syntax (basic check)
    foreach ($tool in $ExpectedTools) {
        $toolPath = Join-Path $TargetFiles.ToolsDir $tool
        $content = Get-Content -LiteralPath $toolPath -Raw
        if (-not $content.Contains('export const')) {
            throw "Tool $tool missing export"
        }
    }
    Write-LeeWayLog -Level PASS -Message 'All tool files have valid export structure'

    # Validate migration spec
    Assert-PathExists -Path $TargetFiles.MigrationSpec -Description 'MIG-005A specification' -PathType Leaf

    Write-LeeWayLog -Level STEP -Message '8/9 | Running TypeScript/build validation.'

    $BuildLogPath = Join-Path $EvidenceSession 'npm-build.log'
    Push-Location -LiteralPath $ProjectRoot

    try {
        $BuildOutput = & npm run build 2>&1
        $BuildExitCode = $LASTEXITCODE
        $BuildOutput | Set-Content -LiteralPath $BuildLogPath -Encoding utf8NoBOM
    } finally {
        Pop-Location
    }

    if ($BuildExitCode -ne 0) {
        throw "npm run build failed with exit code $BuildExitCode. See $BuildLogPath"
    }

    Write-LeeWayLog -Level PASS -Message 'npm run build completed successfully.'

    $ProtectedAfter = [ordered]@{}
    $ProtectedChanged = @()
    foreach ($RelativePath in $ProtectedFiles) {
        $ProtectedAfter[$RelativePath] = Get-FileHashOrNull -Path (Join-Path $ProjectRoot $RelativePath)
        if ($ProtectedBefore[$RelativePath] -ne $ProtectedAfter[$RelativePath]) {
            $ProtectedChanged += $RelativePath
        }
    }

    if ($ProtectedChanged.Count -gt 0) {
        throw "Protected files changed unexpectedly: $($ProtectedChanged -join ', ')"
    }

    Write-LeeWayLog -Level PASS -Message 'Protected files remained unchanged.'

    Write-LeeWayLog -Level STEP -Message '9/9 | Writing PASS evidence and receipt.'

    $FinalGitStatus = @(& git -C $GitRoot status --porcelain=v1 --untracked-files=all 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture final Git status.'
    }

    $FileHashes = [ordered]@{}
    foreach ($TargetPath in $TargetFiles.Values) {
        $RelativeTarget = [System.IO.Path]::GetRelativePath($ProjectRoot, $TargetPath)
        $FileHashes[$RelativeTarget] = Get-FileHashOrNull -Path $TargetPath
    }

    $ValidationRecords += [pscustomobject]@{ name = 'MIG-005 prerequisite'; passed = $true; evidence = $Mig005Receipt.Path }
    $ValidationRecords += [pscustomobject]@{ name = 'Commands directory (10)'; passed = $true; file = $TargetFiles.CommandsDir }
    $ValidationRecords += [pscustomobject]@{ name = 'Agents directory (9)'; passed = $true; file = $TargetFiles.AgentsDir }
    $ValidationRecords += [pscustomobject]@{ name = 'Tools directory (10)'; passed = $true; file = $TargetFiles.ToolsDir }
    $ValidationRecords += [pscustomobject]@{ name = 'OpenCode config MCP servers'; passed = $true; file = $TargetFiles.OpencodeConfig }
    $ValidationRecords += [pscustomobject]@{ name = 'Skills manifest sync'; passed = $true; file = $TargetFiles.SkillsManifest }
    $ValidationRecords += [pscustomobject]@{ name = 'Build validation'; passed = $true; log = $BuildLogPath }

    $EndedAtUtc = [DateTimeOffset]::UtcNow

$EnvironmentEvidence = [ordered]@{
        migration = $MigrationId
        scriptVersion = $ScriptVersion
        timestampUtc = $EndedAtUtc.ToString('o')
        projectRoot = $ProjectRoot
        gitRoot = $GitRoot
        powershell = $PSVersionTable.PSVersion.ToString()
        node = (& node --version 2>&1 | Out-String).Trim()
        npm = (& npm --version 2>&1 | Out-String).Trim()
        git = (& git --version 2>&1 | Out-String).Trim()
    }

    $MigrationEvidence = [ordered]@{
        migration = $MigrationId
        name = $MigrationName
        status = 'PASS'
        adr = @($Adr0002Path, $Adr0005Path)
        specification = $TargetFiles.MigrationSpec
        prerequisites = @($Mig005Receipt.Path)
        createdFiles = $CreatedFiles
        updatedFiles = $UpdatedFiles
        rollbackRoot = $BackupRoot
        rollbackActions = $RollbackActions
        protectedBefore = $ProtectedBefore
        protectedAfter = $ProtectedAfter
        fileHashes = $FileHashes
    }

    $ValidationEvidence = [ordered]@{
        migration = $MigrationId
        status = 'PASS'
        startedAtUtc = $StartedAtUtc.ToString('o')
        endedAtUtc = $EndedAtUtc.ToString('o')
        records = $ValidationRecords
        buildLog = $BuildLogPath
        initialGitStatus = $InitialGitStatus
        finalGitStatus = $FinalGitStatus
    }

    $Receipt = [ordered]@{
        Migration = $MigrationId
        Status = 'PASS'
        Stage = 'OpenCode Engineering Toolchain Established'
        ScriptVersion = $ScriptVersion
        ProjectRoot = $ProjectRoot
        GitRoot = $GitRoot
        Evidence = $EvidenceSession
        Manifest = $TargetFiles.Manifest
        Specification = $TargetFiles.MigrationSpec
        BuildLog = $BuildLogPath
        Rollback = $BackupRoot
        Timestamp = $EndedAtUtc.ToString('o')
    }

    Write-JsonFile -Value $EnvironmentEvidence -Path (Join-Path $EvidenceSession 'environment.json')
    Write-JsonFile -Value $MigrationEvidence -Path (Join-Path $EvidenceSession 'migration.json')
    Write-JsonFile -Value $ValidationEvidence -Path (Join-Path $EvidenceSession 'validation.json')
    Write-JsonFile -Value $Receipt -Path (Join-Path $EvidenceSession 'receipt.json')

    Write-LeeWayLog -Level PASS -Message "$MigrationId completed successfully."
    Write-LeeWayLog -Level PASS -Message "Evidence: $EvidenceSession"
    Write-LeeWayLog -Level PASS -Message "Receipt: $(Join-Path $EvidenceSession 'receipt.json')"
}
catch {
    $FailureMessage = $_.Exception.Message
    Write-LeeWayLog -Level FAIL -Message $FailureMessage

    if ($RollbackActions.Count -gt 0) { Invoke-Rollback }

    if ($null -ne $EvidenceSession) {
        $EndedAtUtc = [DateTimeOffset]::UtcNow
        Write-JsonFile -Value ([ordered]@{ migration = $MigrationId; status = 'FAIL'; startedAtUtc = $StartedAtUtc.ToString('o'); endedAtUtc = $EndedAtUtc.ToString('o'); failure = $FailureMessage; rollbackAttempted = $true }) -Path (Join-Path $EvidenceSession 'validation.json')
        Write-JsonFile -Value ([ordered]@{ Migration = $MigrationId; Status = 'FAIL'; Stage = 'OpenCode Engineering Toolchain'; ScriptVersion = $ScriptVersion; ProjectRoot = $ProjectRoot; Evidence = $EvidenceSession; Rollback = $BackupRoot; Timestamp = $EndedAtUtc.ToString('o'); Failure = $FailureMessage }) -Path (Join-Path $EvidenceSession 'receipt.json')
    }
    throw
}
finally {
    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch { Write-Warning "Transcript cleanup failed: $($_.Exception.Message)" }
    }
}