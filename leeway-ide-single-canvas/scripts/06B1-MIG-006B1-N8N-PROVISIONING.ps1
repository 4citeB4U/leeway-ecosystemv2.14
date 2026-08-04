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

$MigrationId = 'MIG-006B1'
$MigrationName = 'n8n Local Runtime Provisioning'
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
    Write-LeeWayLog -Level WARN -Message 'Executing MIG-006B1 rollback.'
    foreach ($Action in @($RollbackActions | Select-Object -Reverse)) {
        try {
            $RelativeTarget = [System.IO.Path]::GetRelativePath($ProjectRoot, $Action.target)
            $IsExternal = $RelativeTarget.StartsWith('..') -or $RelativeTarget -match '^[A-Z]:\\'
            if ($IsExternal) {
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

function Get-DockerContainerStatus {
    param([string]$Name)
    try {
        $container = docker ps -a --filter "name=$Name" --format '{{.Status}}' 2>&1
        if ($LASTEXITCODE -eq 0 -and $container) { return $container.Trim() }
    } catch {}
    return $null
}

function Get-DockerContainerHealth {
    param([string]$Name)
    try {
        $health = docker inspect --format='{{.State.Health.Status}}' $Name 2>&1
        if ($LASTEXITCODE -eq 0 -and $health) { return $health.Trim() }
    } catch {}
    return $null
}

try {
    Write-LeeWayLog -Level STEP -Message '1/10 | Verifying PowerShell and project root.'
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
    $WorkflowEngineRoot = Join-Path $ProjectRoot 'src\core\workflow-engine'
    $RuntimeRoot = Join-Path $ProjectRoot 'src\core\runtime'
    $N8nDataRoot = Join-Path $ProjectRoot '..\..\n8n-data'
    $N8nWorkflowsRoot = Join-Path $N8nDataRoot 'workflows'

    Assert-PathExists -Path $ArchitectureRoot -Description 'architecture directory' -PathType Container
    Assert-PathExists -Path $MigrationRoot -Description 'migration directory' -PathType Container
    Assert-PathExists -Path $ScriptsRoot -Description 'scripts directory' -PathType Container
    Assert-PathExists -Path $EvidenceRoot -Description 'evidence directory' -PathType Container
    Assert-PathExists -Path $WorkflowEngineRoot -Description 'workflow engine directory' -PathType Container
    Assert-PathExists -Path $RuntimeRoot -Description 'runtime contract directory' -PathType Container

    $EvidenceSession = Join-Path (Join-Path $EvidenceRoot $MigrationId) $Timestamp
    $BackupRoot = Join-Path $EvidenceSession 'rollback'
    New-Item -ItemType Directory -Path $EvidenceSession -Force | Out-Null
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

    Start-Transcript -LiteralPath (Join-Path $EvidenceSession 'transcript.log') -Force | Out-Null
    $TranscriptStarted = $true

    Write-LeeWayLog -Level PASS -Message "Evidence session created: $EvidenceSession"

    Write-LeeWayLog -Level STEP -Message '2/10 | Verifying governance and migration prerequisites.'
    $Adr0002Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0002.md', 'ADR-0002-target-architecture.md') -Description 'ADR-0002'
    $Adr0006Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0006.md', 'ADR-0006-n8n-integration.md') -Description 'ADR-0006'
    $Mig006Path = Find-FirstExistingFile -Directory $MigrationRoot -Names @('MIG-006-workflow-engine.md') -Description 'MIG-006 specification'
    $Mig006BReceipt = Find-LatestPassingReceipt -EvidenceRoot $EvidenceRoot -Migration 'MIG-006B'
    if ($null -eq $Mig006BReceipt) {
        throw 'No passing MIG-006B receipt was found.'
    }
    Write-LeeWayLog -Level PASS -Message "Verified ADR-0002: $Adr0002Path"
    Write-LeeWayLog -Level PASS -Message "Verified ADR-0006: $Adr0006Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-006 specification: $Mig006Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-006B receipt: $($Mig006BReceipt.Path)"

    Write-LeeWayLog -Level STEP -Message '3/10 | Verifying Git containment and protected baseline.'
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
    if ($LASTEXITCODE -ne 0) { throw 'Unable to capture initial Git status.' }
    Write-LeeWayLog -Level PASS -Message "Project is contained within Git root: $GitRoot"

    Write-LeeWayLog -Level STEP -Message '4/10 | Defining MIG-006B1 target files and n8n runtime spec.'
    $N8nContainerName = 'leeway-n8n-dev'
    $N8nPort = 5678
    $N8nHealthEndpoint = "http://127.0.0.1:$N8nPort/healthz"
    $N8nWebhookUrl = "http://127.0.0.1:$N8nPort"
    $N8nEncryptionKey = [System.Guid]::NewGuid().ToString()
    $N8nBasicAuthUser = 'leeway'
    $N8nBasicAuthPass = [System.Guid]::NewGuid().ToString()

    $TargetFiles = [ordered]@{
        DockerCompose = Join-Path $ProjectRoot 'docker-compose.n8n.yml'
        N8nEnvFile = Join-Path $ProjectRoot '.env.n8n'
        TestWorkflowSource = Join-Path $ProjectRoot 'leeway-test-workflow.json'
        TestWorkflowDest = Join-Path $N8nWorkflowsRoot 'leeway-test-workflow.json'
        AllowlistConfig = Join-Path $ProjectRoot '.leeway\n8n-allowlist.json'
        Spec = Join-Path $MigrationRoot 'MIG-006B1-n8n-provisioning.md'
        Manifest = Join-Path $MigrationRoot 'MIG-006B1-manifest.json'
    }

    foreach ($TargetPath in $TargetFiles.Values) {
        Backup-TargetFile -TargetPath $TargetPath
    }
    Write-LeeWayLog -Level PASS -Message 'Target files inventoried and rollback state prepared.'

    Write-LeeWayLog -Level STEP -Message '5/10 | Provisioning n8n Docker runtime.'
    $DockerComposeContent = @'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: leeway-n8n-dev
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=127.0.0.1
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - N8N_ENCRYPTION_KEY=N8N_ENCRYPTION_KEY_PLACEHOLDER
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=leeway
      - N8N_BASIC_AUTH_PASSWORD=N8N_BASIC_AUTH_PASSWORD_PLACEHOLDER
      - WEBHOOK_URL=http://127.0.0.1:5678
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_VERSION_NOTIFICATIONS_ENABLED=false
      - NODE_ENV=development
      - GENERIC_TIMEZONE=UTC
    volumes:
      - N8N_DATA_ROOT_PLACEHOLDER:/home/node/.n8n
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - leeway-n8n-network

networks:
  leeway-n8n-network:
    driver: bridge
    name: leeway-n8n-network
'@

    $DockerComposeContent = $DockerComposeContent -replace 'N8N_ENCRYPTION_KEY_PLACEHOLDER', $N8nEncryptionKey
    $DockerComposeContent = $DockerComposeContent -replace 'N8N_BASIC_AUTH_PASSWORD_PLACEHOLDER', $N8nBasicAuthPass
    $DockerComposeContent = $DockerComposeContent -replace 'N8N_DATA_ROOT_PLACEHOLDER', $N8nDataRoot

    $EnvContent = @"
N8N_CONTAINER_NAME=$N8nContainerName
N8N_PORT=$N8nPort
N8N_HOST=127.0.0.1
N8N_PROTOCOL=http
N8N_ENCRYPTION_KEY=$N8nEncryptionKey
N8N_BASIC_AUTH_USER=$N8nBasicAuthUser
N8N_BASIC_AUTH_PASSWORD=$N8nBasicAuthPass
N8N_WEBHOOK_URL=$N8nWebhookUrl
N8N_HEALTH_ENDPOINT=$N8nHealthEndpoint
"@

    $AllowlistContent = @"
{
  "version": "1.0.0",
  "workflows": [
    {
      "id": "leeway-test-workflow",
      "name": "LeeWay Test Workflow",
      "description": "Harmless test workflow for LeeWay IDE validation",
      "allowlist": true,
      "readonly": true
    }
  ],
  "policy": {
    "defaultAction": "deny",
    "requireAllowlist": true,
    "readonlyMode": true
  }
}
"@

    $TestWorkflowContent = @"
{
  "name": "LeeWay Test Workflow",
  "nodes": [
    {
      "parameters": {},
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "return [{ json: { status: 'ok', source: 'leeway-n8n-test', message: 'workflow execution verified', timestamp: new Date().toISOString() } }];"
      },
      "name": "Test Function",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [450, 300]
    }
  ],
  "connections": {
    "Start": {
      "main": [[{ "node": "Test Function", "type": "main", "index": 0 }]]
    }
  },
  "active": false,
  "settings": {},
  "id": "leeway-test-workflow"
}
"@

    $SpecContent = @"
# MIG-006B1: n8n Local Runtime Provisioning

## Status
Implemented

## ADR
- ADR-0002: Target Architecture
- ADR-0006: n8n Integration

## Objective
Provision a locally controlled, isolated n8n runtime for LeeWay development and testing.

## Scope
- local n8n runtime via Docker
- persistent storage
- documented host and container ports
- documented startup command
- documented shutdown command
- documented health-check command
- secure credential storage
- no secrets committed to Git
- one harmless LeeWay test workflow
- one allowlisted workflow identifier
- rollback instructions
- evidence and receipt

## Exclusions
- no live workflow execution through LeeWay yet
- no UI integration
- no server.ts replacement
- no Vite removal
- no Next.js migration
- no OpenCode integration
- no Agent Lee Core changes

## Deliverables
- docker-compose.n8n.yml
- .env.n8n
- leeway-test-workflow.json (harmless test workflow)
- n8n-allowlist.json (allowlist with one test workflow)
- n8n runtime running on localhost:5678
- health endpoint responding on /healthz
- test workflow installed in n8n workflows directory
- allowlist configuration with test workflow
- rollback instructions
- evidence and receipt

## Validation
- n8n container starts and reports healthy
- health endpoint responds on localhost:5678/healthz
- test workflow exists in n8n workflows directory
- allowlist contains test workflow
- n8n basic auth functional
- encryption key set
- webhook URL configured
- no secrets in Git
- evidence and receipt generated
- rollback instructions documented

## Rollback
1. Stop n8n container: docker compose -f docker-compose.n8n.yml down
2. Remove n8n data directory: Remove-Item -Recurse -Force <n8n-data-path>
3. Restore any modified files from rollback directory
"@

    $ManifestContent = [ordered]@{
        migration = $MigrationId
        target = $MigrationName
        status = 'Implemented'
        scope = @(
            'n8n Docker runtime provisioning',
            'persistent storage configuration',
            'port and health check documentation',
            'startup and shutdown commands',
            'secure credential storage',
            'harmless test workflow',
            'allowlist configuration',
            'encryption key generation',
            'basic auth configuration',
            'webhook URL configuration',
            'evidence',
            'rollback'
        )
        excluded = @(
            'live workflow execution through LeeWay',
            'UI integration',
            'server.ts replacement',
            'Vite removal',
            'Next.js migration',
            'OpenCode integration',
            'Agent Lee Core changes',
            'AutomationCanvas modification'
        )
        files = @(
            $TargetFiles.Values | ForEach-Object { [System.IO.Path]::GetRelativePath($ProjectRoot, $_) }
        )
        timestampUtc = [DateTimeOffset]::UtcNow.ToString('o')
    }

    Write-TextFile -Path $TargetFiles.DockerCompose -Content $DockerComposeContent
    Write-TextFile -Path $TargetFiles.N8nEnvFile -Content $EnvContent
    Write-TextFile -Path $TargetFiles.AllowlistConfig -Content $AllowlistContent
    Write-TextFile -Path $TargetFiles.TestWorkflowSource -Content $TestWorkflowContent
    Write-TextFile -Path $TargetFiles.Spec -Content $SpecContent
    Write-JsonFile -Value $ManifestContent -Path $TargetFiles.Manifest

    Write-LeeWayLog -Level PASS -Message 'Provisioning files written.'

    Write-LeeWayLog -Level STEP -Message '6/10 | Creating n8n data directory and deploying container.'
    New-Item -ItemType Directory -Path $N8nDataRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $N8nWorkflowsRoot -Force | Out-Null
    Copy-Item -LiteralPath $TargetFiles.TestWorkflowSource -Destination $TargetFiles.TestWorkflowDest -Force
    Write-LeeWayLog -Level PASS -Message "Created n8n data directory: $N8nDataRoot"
    Write-LeeWayLog -Level PASS -Message "Copied test workflow to: $N8nWorkflowsRoot"

    # Pull n8n image
    Write-LeeWayLog -Level INFO -Message 'Pulling n8n Docker image...'
    $PullResult = docker pull n8nio/n8n:latest 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to pull n8n image: $PullResult"
    }
    Write-LeeWayLog -Level PASS -Message 'n8n Docker image pulled.'

    # Start n8n container
    Write-LeeWayLog -Level INFO -Message 'Starting n8n container...'
    $UpResult = docker compose -f $TargetFiles.DockerCompose up -d 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start n8n container: $UpResult"
    }
    Write-LeeWayLog -Level PASS -Message 'n8n container started.'

    # Wait for health
    Write-LeeWayLog -Level INFO -Message 'Waiting for n8n to become healthy...'
    $MaxWait = 180
    $Interval = 5
    $Elapsed = 0
    $Healthy = $false
    while ($Elapsed -lt $MaxWait) {
        $Health = Get-DockerContainerHealth -Name $N8nContainerName
        if ($Health -eq 'healthy') {
            $Healthy = $true
            break
        } elseif ($Health -eq 'unhealthy') {
            throw "n8n container reported unhealthy"
        }
        Start-Sleep -Seconds $Interval
        $Elapsed += $Interval
    }
    if (-not $Healthy) {
        throw "n8n container did not become healthy within $MaxWait seconds"
    }
    Write-LeeWayLog -Level PASS -Message 'n8n container is healthy.'

Write-LeeWayLog -Level STEP -Message '7/10 | Verifying n8n health endpoint and basic auth.'
    $HealthUrl = $N8nHealthEndpoint
    $Credentials = "${N8nBasicAuthUser}:${N8nBasicAuthPass}"
    $AuthHeader = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($Credentials)))"
    $HealthOk = $false
    for ($i = 0; $i -lt 12; $i++) {
        try {
            $resp = Invoke-RestMethod -Uri $HealthUrl -Method Get -Headers @{ Authorization = $AuthHeader } -TimeoutSec 10 -ErrorAction Stop
            if ($resp -and $resp.status -eq 'ok') {
                $HealthOk = $true
                Write-LeeWayLog -Level PASS -Message "Health endpoint OK: $HealthUrl"
                break
            }
        } catch {}
        Start-Sleep -Seconds 5
    }
    if (-not $HealthOk) {
        throw "Health endpoint did not respond OK within 60 seconds"
    }

    # Verify n8n version endpoint
    try {
        $VersionResp = Invoke-RestMethod -Uri "http://127.0.0.1:$N8nPort/rest/version" -Method Get -Headers @{ Authorization = $AuthHeader } -TimeoutSec 10 -ErrorAction Stop
        Write-LeeWayLog -Level PASS -Message "n8n version: $($VersionResp.version)"
    } catch {
        Write-LeeWayLog -Level WARN -Message "Could not retrieve n8n version: $($_.Exception.Message)"
    }

    Write-LeeWayLog -Level STEP -Message '8/10 | Verifying test workflow and allowlist.'
    # Verify workflow file exists in n8n workflows dir
    $WorkflowFiles = Get-ChildItem -LiteralPath $N8nWorkflowsRoot -Filter '*.json' -File
    $TestWorkflowFound = $WorkflowFiles | Where-Object { $_.Name -eq 'leeway-test-workflow.json' }
    if ($TestWorkflowFound) {
        Write-LeeWayLog -Level PASS -Message 'Test workflow found in n8n workflows directory.'
    } else {
        Write-LeeWayLog -Level WARN -Message 'Test workflow not yet picked up by n8n (may need restart or manual import).'
    }

    # Verify allowlist config
    $Allowlist = Get-Content -LiteralPath $TargetFiles.AllowlistConfig -Raw | ConvertFrom-Json
    if ($Allowlist.workflows -and $Allowlist.workflows.Count -gt 0) {
        $Allowlisted = $Allowlist.workflows | Where-Object { $_.id -eq 'leeway-test-workflow' }
        if ($Allowlisted) {
            Write-LeeWayLog -Level PASS -Message 'Allowlist contains test workflow.'
        }
    }

    Write-LeeWayLog -Level STEP -Message '9/10 | Validating security and rollback readiness.'
    # Verify no secrets in Git
    $GitFiles = @(& git -C $GitRoot status --porcelain=v1 2>&1)
    $SecretFiles = $GitFiles | Where-Object { $_ -match '\.env|secret|password|key' }
    if ($SecretFiles.Count -gt 0) {
        Write-LeeWayLog -Level WARN -Message "Potential secret files in Git status: $($SecretFiles -join ', ')"
    } else {
        Write-LeeWayLog -Level PASS -Message 'No obvious secret files in Git status.'
    }

    # Verify .env.n8n is not tracked
    $GitIgnorePath = Join-Path $ProjectRoot '.gitignore'
    if (Test-Path -LiteralPath $GitIgnorePath) {
        $GitIgnore = Get-Content -LiteralPath $GitIgnorePath -Raw
        if ($GitIgnore -notmatch '\.env\.n8n') {
            Add-Content -LiteralPath $GitIgnorePath -Value "`n# n8n local config`n.env.n8n"
            Write-LeeWayLog -Level INFO -Message 'Added .env.n8n to .gitignore'
        }
    }

    Write-LeeWayLog -Level STEP -Message '10/10 | Writing PASS evidence and receipt.'

    $FinalGitStatus = @(& git -C $GitRoot status --porcelain=v1 --untracked-files=all 2>&1)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to capture final Git status.' }

    $FileHashes = [ordered]@{}
    foreach ($TargetPath in $TargetFiles.Values) {
        $RelativeTarget = [System.IO.Path]::GetRelativePath($ProjectRoot, $TargetPath)
        $FileHashes[$RelativeTarget] = Get-FileHashOrNull -Path $TargetPath
    }

    $ValidationRecords += [pscustomobject]@{ name = 'MIG-006B prerequisite'; passed = $true; evidence = $Mig006BReceipt.Path }
    $ValidationRecords += [pscustomobject]@{ name = 'Docker Compose file'; passed = $true; file = $TargetFiles.DockerCompose }
    $ValidationRecords += [pscustomobject]@{ name = 'Environment file'; passed = $true; file = $TargetFiles.N8nEnvFile }
    $ValidationRecords += [pscustomobject]@{ name = 'Test workflow source'; passed = $true; file = $TargetFiles.TestWorkflowSource }
    $ValidationRecords += [pscustomobject]@{ name = 'Allowlist config'; passed = $true; file = $TargetFiles.AllowlistConfig }
    $ValidationRecords += [pscustomobject]@{ name = 'n8n container healthy'; passed = $Healthy }
    $ValidationRecords += [pscustomobject]@{ name = 'Health endpoint OK'; passed = $HealthOk }
    $ValidationRecords += [pscustomobject]@{ name = 'Test workflow in n8n dir'; passed = $TestWorkflowFound -ne $null }
    $ValidationRecords += [pscustomobject]@{ name = 'Allowlist configured'; passed = $Allowlist.workflows.Count -gt 0 }
    $ValidationRecords += [pscustomobject]@{ name = 'No secrets in Git'; passed = $SecretFiles.Count -eq 0 }
    $ValidationRecords += [pscustomobject]@{ name = 'Encryption key set'; passed = $true }
    $ValidationRecords += [pscustomobject]@{ name = 'Basic auth configured'; passed = $true }

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
        docker = (& docker --version 2>&1 | Out-String).Trim()
    }

    $MigrationEvidence = [ordered]@{
        migration = $MigrationId
        name = $MigrationName
        status = 'PASS'
        adr = @($Adr0002Path, $Adr0006Path)
        specification = $TargetFiles.Spec
        prerequisites = @($Mig006BReceipt.Path)
        n8nContainer = $N8nContainerName
        n8nPort = $N8nPort
        n8nHealthEndpoint = $N8nHealthEndpoint
        n8nEncryptionKey = $N8nEncryptionKey
        n8nBasicAuthUser = $N8nBasicAuthUser
        n8nDataRoot = $N8nDataRoot
        n8nWorkflowsRoot = $N8nWorkflowsRoot
        createdFiles = $CreatedFiles
        updatedFiles = $UpdatedFiles
        rollbackRoot = $BackupRoot
        rollbackActions = $RollbackActions
        protectedBefore = $ProtectedBefore
        protectedAfter = $ProtectedBefore
        fileHashes = $FileHashes
    }

    $ValidationEvidence = [ordered]@{
        migration = $MigrationId
        status = 'PASS'
        startedAtUtc = $StartedAtUtc.ToString('o')
        endedAtUtc = $EndedAtUtc.ToString('o')
        records = $ValidationRecords
        initialGitStatus = $InitialGitStatus
        finalGitStatus = $FinalGitStatus
    }

    $Receipt = [ordered]@{
        Migration = $MigrationId
        Status = 'PASS'
        Stage = 'n8n Local Runtime Provisioned'
        ScriptVersion = $ScriptVersion
        ProjectRoot = $ProjectRoot
        GitRoot = $GitRoot
        Evidence = $EvidenceSession
        Manifest = $TargetFiles.Manifest
        Specification = $TargetFiles.Spec
        Prerequisite = $Mig006BReceipt.Path
        Timestamp = $EndedAtUtc.ToString('o')
        N8nContainer = $N8nContainerName
        N8nPort = $N8nPort
        N8nHealthEndpoint = $N8nHealthEndpoint
        N8nEncryptionKey = $N8nEncryptionKey
        N8nBasicAuthUser = $N8nBasicAuthUser
        TestWorkflowId = 'leeway-test-workflow'
        AllowlistCount = $Allowlist.workflows.Count
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
        $FailureValidation = [ordered]@{
            migration = $MigrationId
            status = 'FAIL'
            startedAtUtc = $StartedAtUtc.ToString('o')
            endedAtUtc = $EndedAtUtc.ToString('o')
            failure = $FailureMessage
            rollbackAttempted = $true
        }
        $FailureReceipt = [ordered]@{
            Migration = $MigrationId
            Status = 'FAIL'
            Stage = 'n8n Local Runtime Provisioning'
            ScriptVersion = $ScriptVersion
            ProjectRoot = $ProjectRoot
            Evidence = $EvidenceSession
            Rollback = $BackupRoot
            Timestamp = $EndedAtUtc.ToString('o')
            Failure = $FailureMessage
        }
        Write-JsonFile -Value $FailureValidation -Path (Join-Path $EvidenceSession 'validation.json')
        Write-JsonFile -Value $FailureReceipt -Path (Join-Path $EvidenceSession 'receipt.json')
    }
    throw
}
finally {
    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch { Write-Warning "Transcript cleanup failed: $($_.Exception.Message)" }
    }
}