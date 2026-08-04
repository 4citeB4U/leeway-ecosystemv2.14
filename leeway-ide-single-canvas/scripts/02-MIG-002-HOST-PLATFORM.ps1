#requires -Version 7.0

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ProjectRoot = 'D:\Leeway-Ecosystem v2.1.4\leeway-ide-single-canvas'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$MigrationId      = 'MIG-002'
$MigrationName    = 'LeeWay IDE Host Platform'
$ScriptVersion    = '2.0.2'
$StartedAtUtc     = [DateTimeOffset]::UtcNow
$Timestamp        = Get-Date -Format 'yyyyMMdd-HHmmss'
$TranscriptActive = $false
$FinalStatus      = 'FAIL'
$FailureMessage   = $null

function Write-LeeWayLog {
    param(
        [Parameter(Mandatory)]
        [ValidateSet('STEP','PASS','WARN','FAIL','INFO')]
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

    $Json = $Value | ConvertTo-Json -Depth 20

    [System.IO.File]::WriteAllText(
        $Path,
        $Json,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Assert-LeeWayPath {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$Description,

        [ValidateSet('Any','Leaf','Container')]
        [string]$Type = 'Any'
    )

    $Exists = switch ($Type) {
        'Leaf' {
            Test-Path -LiteralPath $Path -PathType Leaf
        }

        'Container' {
            Test-Path -LiteralPath $Path -PathType Container
        }

        default {
            Test-Path -LiteralPath $Path
        }
    }

    if (-not $Exists) {
        throw "Missing required ${Description}: $Path"
    }

    Write-LeeWayLog -Level PASS -Message "Verified $Description."
}

function Get-LeeWayCommandVersion {
    param(
        [Parameter(Mandatory)]
        [string]$CommandName
    )

    $Command = Get-Command $CommandName -ErrorAction SilentlyContinue

    if (-not $Command) {
        return [ordered]@{
            installed = $false
            path      = $null
            version   = $null
        }
    }

    $Version = $null

    try {
        $Version = (& $CommandName --version 2>&1 | Out-String).Trim()
    }
    catch {
        $Version = "Version check failed: $($_.Exception.Message)"
    }

    return [ordered]@{
        installed = $true
        path      = $Command.Source
        version   = $Version
    }
}

function Get-LatestPassingMig001Receipt {
    param(
        [Parameter(Mandatory)]
        [string]$EvidenceRoot
    )

    $Mig001Root = Join-Path $EvidenceRoot 'MIG-001'

    if (-not (Test-Path -LiteralPath $Mig001Root -PathType Container)) {
        return $null
    }

    $ReceiptFiles = Get-ChildItem `
        -LiteralPath $Mig001Root `
        -Filter 'receipt.json' `
        -File `
        -Recurse |
        Sort-Object LastWriteTimeUtc -Descending

    foreach ($ReceiptFile in $ReceiptFiles) {
        try {
            $Receipt = Get-Content -LiteralPath $ReceiptFile.FullName -Raw |
                ConvertFrom-Json

            $Status = $null

            if ($Receipt.PSObject.Properties.Name -contains 'Status') {
                $Status = [string]$Receipt.Status
            }
            elseif ($Receipt.PSObject.Properties.Name -contains 'status') {
                $Status = [string]$Receipt.status
            }

            if ($Status -eq 'PASS') {
                return [pscustomobject]@{
                    Path    = $ReceiptFile.FullName
                    Receipt = $Receipt
                }
            }
        }
        catch {
            Write-LeeWayLog `
                -Level WARN `
                -Message "Unreadable MIG-001 receipt ignored: $($ReceiptFile.FullName)"
        }
    }

    return $null
}

function Find-GovernanceFile {
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

    throw "Unable to locate $Description. Expected: $($Names -join ', ')"
}

function New-LeeWayDirectory {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [System.Collections.Generic.List[string]]$Created,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [System.Collections.Generic.List[string]]$Existing
    )

    if (Test-Path -LiteralPath $Path -PathType Container) {
        $Existing.Add($Path)
        Write-LeeWayLog -Level INFO -Message "Already exists: $Path"
        return
    }

    New-Item -ItemType Directory -Path $Path -Force | Out-Null
    $Created.Add($Path)

    Write-LeeWayLog -Level PASS -Message "Created: $Path"
}

$EvidenceSession = $null
$CreatedPaths = [System.Collections.Generic.List[string]]::new()
$ExistingPaths = [System.Collections.Generic.List[string]]::new()
$ValidationRecords = [System.Collections.Generic.List[object]]::new()

try {
    Write-LeeWayLog `
        -Level STEP `
        -Message '1/8 | Verifying PowerShell and project root.'

    if ($PSVersionTable.PSVersion.Major -lt 7) {
        throw "PowerShell 7 or newer is required. Current: $($PSVersionTable.PSVersion)"
    }

    $ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)

    Assert-LeeWayPath `
        -Path $ProjectRoot `
        -Description 'project root' `
        -Type Container

    Set-Location -LiteralPath $ProjectRoot

    $ArchitectureRoot = Join-Path $ProjectRoot 'architecture'
    $MigrationRoot    = Join-Path $ProjectRoot 'migration'
    $ScriptsRoot      = Join-Path $ProjectRoot 'scripts'
    $EvidenceRoot     = Join-Path $ProjectRoot 'evidence'

    Assert-LeeWayPath -Path $ArchitectureRoot -Description 'architecture directory' -Type Container
    Assert-LeeWayPath -Path $MigrationRoot -Description 'migration directory' -Type Container
    Assert-LeeWayPath -Path $ScriptsRoot -Description 'scripts directory' -Type Container
    Assert-LeeWayPath -Path $EvidenceRoot -Description 'evidence directory' -Type Container

    $EvidenceSession = Join-Path (Join-Path $EvidenceRoot $MigrationId) $Timestamp

    New-Item `
        -ItemType Directory `
        -Path $EvidenceSession `
        -Force |
        Out-Null

    $TranscriptPath = Join-Path $EvidenceSession 'transcript.log'

    Start-Transcript -LiteralPath $TranscriptPath -Force | Out-Null
    $TranscriptActive = $true

    Write-LeeWayLog `
        -Level PASS `
        -Message "Evidence session created: $EvidenceSession"

    Write-LeeWayLog `
        -Level STEP `
        -Message '2/8 | Verifying governance prerequisites.'

    $Adr0002Path = Find-GovernanceFile `
        -Directory $ArchitectureRoot `
        -Names @(
            'ADR-0002.md',
            'ADR-0002-target-architecture.md'
        ) `
        -Description 'ADR-0002'

    $Mig002Path = Find-GovernanceFile `
        -Directory $MigrationRoot `
        -Names @(
            'MIG-002-nextjs-shell.md',
            'MIG-002-host-platform.md',
            'MIG-002-leeway-ide-host-platform.md'
        ) `
        -Description 'MIG-002 specification'

    Assert-LeeWayPath -Path $Adr0002Path -Description 'ADR-0002' -Type Leaf
    Assert-LeeWayPath -Path $Mig002Path -Description 'MIG-002 specification' -Type Leaf

    $Mig001Receipt = Get-LatestPassingMig001Receipt `
        -EvidenceRoot $EvidenceRoot

    if (-not $Mig001Receipt) {
        throw 'No passing MIG-001 receipt was found.'
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message "Verified MIG-001 receipt: $($Mig001Receipt.Path)"

    Write-LeeWayLog `
        -Level STEP `
        -Message '3/8 | Verifying repository and application baseline.'

    $GitCommand = Get-Command git -ErrorAction SilentlyContinue

    if (-not $GitCommand) {
        throw 'Git is required but was not found.'
    }

    $GitRoot = (& git rev-parse --show-toplevel 2>&1 | Out-String).Trim()

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to resolve Git root: $GitRoot"
    }

    $NormalizedGitRoot = [System.IO.Path]::GetFullPath($GitRoot)

    $ProjectRelativeToGitRoot = [System.IO.Path]::GetRelativePath(
        $NormalizedGitRoot,
        $ProjectRoot
    )

    $ProjectIsOutsideGitRoot =
        ($ProjectRelativeToGitRoot -eq '..') -or
        $ProjectRelativeToGitRoot.StartsWith(
            '..\',
            [System.StringComparison]::OrdinalIgnoreCase
        ) -or
        $ProjectRelativeToGitRoot.StartsWith(
            '../',
            [System.StringComparison]::OrdinalIgnoreCase
        )

    if ($ProjectIsOutsideGitRoot) {
        throw "Project root is outside the Git repository. Project: $ProjectRoot Git: $NormalizedGitRoot"
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message "Project is contained within Git root: $NormalizedGitRoot"

    $RequiredApplicationPaths = @(
        @{
            Path = Join-Path $ProjectRoot 'package.json'
            Name = 'package.json'
            Type = 'Leaf'
        },
        @{
            Path = Join-Path $ProjectRoot 'server.ts'
            Name = 'server.ts'
            Type = 'Leaf'
        },
        @{
            Path = Join-Path $ProjectRoot 'src'
            Name = 'src directory'
            Type = 'Container'
        },
        @{
            Path = Join-Path $ProjectRoot 'src\components'
            Name = 'src/components directory'
            Type = 'Container'
        },
        @{
            Path = Join-Path $ProjectRoot 'node_modules'
            Name = 'node_modules directory'
            Type = 'Container'
        }
    )

    foreach ($Item in $RequiredApplicationPaths) {
        Assert-LeeWayPath `
            -Path $Item.Path `
            -Description $Item.Name `
            -Type $Item.Type
    }

    $InitialGitStatus = @(
        & git status --porcelain=v1 --untracked-files=all 2>&1
    )

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture initial Git status.'
    }

    if ($InitialGitStatus.Count -gt 0) {
        Write-LeeWayLog `
            -Level WARN `
            -Message 'Repository contains existing uncommitted files. They will be recorded and preserved.'
    }
    else {
        Write-LeeWayLog `
            -Level PASS `
            -Message 'Repository baseline is clean.'
    }

    Write-LeeWayLog `
        -Level STEP `
        -Message '4/8 | Capturing hashes and environment evidence.'

    $ProtectedRelativePaths = @(
        'package.json',
        'package-lock.json',
        'server.ts',
        'vite.config.ts',
        'vite.config.js'
    )

    $ProtectedBefore = [ordered]@{}

    foreach ($RelativePath in $ProtectedRelativePaths) {
        $FullPath = Join-Path $ProjectRoot $RelativePath

        if (Test-Path -LiteralPath $FullPath -PathType Leaf) {
            $ProtectedBefore[$RelativePath] = (
                Get-FileHash -LiteralPath $FullPath -Algorithm SHA256
            ).Hash
        }
        else {
            $ProtectedBefore[$RelativePath] = $null
        }
    }

    $Branch = (& git branch --show-current 2>&1 | Out-String).Trim()
    $Commit = (& git rev-parse HEAD 2>&1 | Out-String).Trim()

    $EnvironmentEvidence = [ordered]@{
        migration     = $MigrationId
        scriptVersion = $ScriptVersion
        timestampUtc  = [DateTimeOffset]::UtcNow.ToString('o')
        projectRoot   = $ProjectRoot
        computerName  = $env:COMPUTERNAME
        userName      = $env:USERNAME

        powershell = [ordered]@{
            version = $PSVersionTable.PSVersion.ToString()
            edition = $PSVersionTable.PSEdition
        }

        os = [ordered]@{
            description = [System.Runtime.InteropServices.RuntimeInformation]::OSDescription
            architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
        }

        node   = Get-LeeWayCommandVersion -CommandName 'node'
        npm    = Get-LeeWayCommandVersion -CommandName 'npm'
        git    = Get-LeeWayCommandVersion -CommandName 'git'
        docker = Get-LeeWayCommandVersion -CommandName 'docker'
        ollama = Get-LeeWayCommandVersion -CommandName 'ollama'
    }

    $MigrationEvidence = [ordered]@{
        migration          = $MigrationId
        name               = $MigrationName
        timestampUtc       = [DateTimeOffset]::UtcNow.ToString('o')
        adr                = $Adr0002Path
        specification      = $Mig002Path
        prerequisiteReceipt = $Mig001Receipt.Path

        repository = [ordered]@{
            root          = $ProjectRoot
            branch        = $Branch
            commit        = $Commit
            initialStatus = $InitialGitStatus
        }

        protectedBefore = $ProtectedBefore
    }

    Write-JsonFile `
        -Value $EnvironmentEvidence `
        -Path (Join-Path $EvidenceSession 'environment.json')

    Write-JsonFile `
        -Value $MigrationEvidence `
        -Path (Join-Path $EvidenceSession 'migration.json')

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Environment and baseline hashes recorded.'

    Write-LeeWayLog `
        -Level STEP `
        -Message '5/8 | Creating approved host-platform directories.'

    $ApprovedDirectories = @(
        'src\app',
        'src\app\api',
        'src\app\(modules)',
        'src\app\layouts',
        'src\core',
        'src\core\runtime',
        'src\core\modules',
        'src\core\providers',
        'src\modules',
        'src\styles',
        'src\types',
        'src\lib'
    )

    foreach ($RelativePath in $ApprovedDirectories) {
        New-LeeWayDirectory `
            -Path (Join-Path $ProjectRoot $RelativePath) `
            -Created $CreatedPaths `
            -Existing $ExistingPaths
    }

    Write-LeeWayLog `
        -Level STEP `
        -Message '6/8 | Writing MIG-002 manifest.'

    $ManifestPath = Join-Path $MigrationRoot 'MIG-002-manifest.json'

    $Manifest = [ordered]@{
        migration        = $MigrationId
        target           = $MigrationName
        status           = 'Initialized'
        framework        = 'Next.js'
        applicationShell = 'Next.js App Router'
        existingFrontend = 'Preserved'
        vite             = 'Preserved'
        runtime          = 'Unmodified'
        packageManifest  = 'Unmodified'
        server           = 'Unmodified'

        engines = [ordered]@{
            openCode = 'Not integrated'
            n8n      = 'Not integrated'
        }

        createdDirectories = @(
            $CreatedPaths | ForEach-Object {
                [System.IO.Path]::GetRelativePath($ProjectRoot, $_)
            }
        )

        existingDirectories = @(
            $ExistingPaths | ForEach-Object {
                [System.IO.Path]::GetRelativePath($ProjectRoot, $_)
            }
        )

        adr           = [System.IO.Path]::GetRelativePath($ProjectRoot, $Adr0002Path)
        specification = [System.IO.Path]::GetRelativePath($ProjectRoot, $Mig002Path)
        timestampUtc  = [DateTimeOffset]::UtcNow.ToString('o')
    }

    Write-JsonFile -Value $Manifest -Path $ManifestPath

    Write-LeeWayLog `
        -Level PASS `
        -Message "Manifest written: $ManifestPath"

    Write-LeeWayLog `
        -Level STEP `
        -Message '7/8 | Validating output and protected files.'

    foreach ($RelativePath in $ApprovedDirectories) {
        Assert-LeeWayPath `
            -Path (Join-Path $ProjectRoot $RelativePath) `
            -Description "host-platform path '$RelativePath'" `
            -Type Container
    }

    Assert-LeeWayPath `
        -Path $ManifestPath `
        -Description 'MIG-002 manifest' `
        -Type Leaf

    $ProtectedAfter = [ordered]@{}
    $ProtectedChanged = [System.Collections.Generic.List[string]]::new()

    foreach ($RelativePath in $ProtectedRelativePaths) {
        $FullPath = Join-Path $ProjectRoot $RelativePath

        if (Test-Path -LiteralPath $FullPath -PathType Leaf) {
            $ProtectedAfter[$RelativePath] = (
                Get-FileHash -LiteralPath $FullPath -Algorithm SHA256
            ).Hash
        }
        else {
            $ProtectedAfter[$RelativePath] = $null
        }

        if ($ProtectedBefore[$RelativePath] -ne $ProtectedAfter[$RelativePath]) {
            $ProtectedChanged.Add($RelativePath)
        }
    }

    if ($ProtectedChanged.Count -gt 0) {
        throw "Protected files changed unexpectedly: $($ProtectedChanged -join ', ')"
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Protected application files are unchanged.'

    $FinalGitStatus = @(
        & git status --porcelain=v1 --untracked-files=all 2>&1
    )

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture final Git status.'
    }

    $ValidationRecords.Add(
        [pscustomobject]@{
            name      = 'MIG-001 prerequisite'
            passed    = $true
            evidence  = $Mig001Receipt.Path
        }
    )

    $ValidationRecords.Add(
        [pscustomobject]@{
            name      = 'Host-platform directories'
            passed    = $true
            count     = $ApprovedDirectories.Count
        }
    )

    $ValidationRecords.Add(
        [pscustomobject]@{
            name      = 'Protected-file hashes'
            passed    = $true
            before    = $ProtectedBefore
            after     = $ProtectedAfter
        }
    )

    Write-LeeWayLog `
        -Level STEP `
        -Message '8/8 | Writing PASS evidence and receipt.'

    $EndedAtUtc = [DateTimeOffset]::UtcNow

    $ValidationEvidence = [ordered]@{
        migration        = $MigrationId
        status           = 'PASS'
        startedAtUtc     = $StartedAtUtc.ToString('o')
        endedAtUtc       = $EndedAtUtc.ToString('o')
        createdPaths     = $CreatedPaths
        existingPaths    = $ExistingPaths
        protectedBefore  = $ProtectedBefore
        protectedAfter   = $ProtectedAfter
        initialGitStatus = $InitialGitStatus
        finalGitStatus   = $FinalGitStatus
        records          = $ValidationRecords
    }

    $Receipt = [ordered]@{
        Migration     = $MigrationId
        Status        = 'PASS'
        Stage         = 'Host Platform Initialized'
        ScriptVersion = $ScriptVersion
        ProjectRoot   = $ProjectRoot
        Evidence      = $EvidenceSession
        Manifest      = $ManifestPath
        Adr           = $Adr0002Path
        Specification = $Mig002Path
        Prerequisite  = $Mig001Receipt.Path
        PowerShell    = $PSVersionTable.PSVersion.ToString()
        GitBranch     = $Branch
        GitCommit     = $Commit
        Timestamp     = $EndedAtUtc.ToString('o')
    }

    Write-JsonFile `
        -Value $ValidationEvidence `
        -Path (Join-Path $EvidenceSession 'validation.json')

    Write-JsonFile `
        -Value $Receipt `
        -Path (Join-Path $EvidenceSession 'receipt.json')

    $FinalStatus = 'PASS'

    Write-LeeWayLog -Level PASS -Message "$MigrationId completed successfully."
    Write-LeeWayLog -Level PASS -Message "Evidence: $EvidenceSession"
    Write-LeeWayLog -Level PASS -Message "Receipt: $(Join-Path $EvidenceSession 'receipt.json')"
}
catch {
    $FailureMessage = $_.Exception.Message

    Write-LeeWayLog -Level FAIL -Message $FailureMessage

    if ($EvidenceSession) {
        $EndedAtUtc = [DateTimeOffset]::UtcNow

        $FailureValidation = [ordered]@{
            migration     = $MigrationId
            status        = 'FAIL'
            startedAtUtc  = $StartedAtUtc.ToString('o')
            endedAtUtc    = $EndedAtUtc.ToString('o')
            failure       = $FailureMessage
        }

        $FailureReceipt = [ordered]@{
            Migration     = $MigrationId
            Status        = 'FAIL'
            Stage         = 'Host Platform Initialization'
            ScriptVersion = $ScriptVersion
            ProjectRoot   = $ProjectRoot
            Evidence      = $EvidenceSession
            Timestamp     = $EndedAtUtc.ToString('o')
            Failure       = $FailureMessage
        }

        Write-JsonFile `
            -Value $FailureValidation `
            -Path (Join-Path $EvidenceSession 'validation.json')

        Write-JsonFile `
            -Value $FailureReceipt `
            -Path (Join-Path $EvidenceSession 'receipt.json')
    }

    throw
}
finally {
    if ($TranscriptActive) {
        try {
            Stop-Transcript | Out-Null
        }
        catch {
            Write-Warning "Transcript cleanup failed: $($_.Exception.Message)"
        }
    }
}
