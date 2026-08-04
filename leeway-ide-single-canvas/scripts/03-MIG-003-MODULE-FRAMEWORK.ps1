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

$MigrationId = 'MIG-003'
$MigrationName = 'LeeWay Module Framework'
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

    [System.IO.File]::WriteAllText(
        $Path,
        $Json,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Write-TextFile {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$Content
    )

    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        [System.Text.UTF8Encoding]::new($false)
    )
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

    if (-not (Test-Path -LiteralPath $MigrationRoot -PathType Container)) {
        return $null
    }

    $ReceiptFiles = @(
        Get-ChildItem `
            -LiteralPath $MigrationRoot `
            -Filter 'receipt.json' `
            -File `
            -Recurse |
        Sort-Object LastWriteTimeUtc -Descending
    )

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
                    Path = $ReceiptFile.FullName
                    Receipt = $Receipt
                }
            }
        }
        catch {
            Write-LeeWayLog `
                -Level WARN `
                -Message "Unreadable $Migration receipt ignored: $($ReceiptFile.FullName)"
        }
    }

    return $null
}

function Get-FileHashOrNull {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }

    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Backup-TargetFile {
    param(
        [Parameter(Mandatory)]
        [string]$TargetPath
    )

    $RelativePath = [System.IO.Path]::GetRelativePath(
        $ProjectRoot,
        $TargetPath
    )

    if (Test-Path -LiteralPath $TargetPath -PathType Leaf) {
        $BackupPath = Join-Path $BackupRoot $RelativePath

        New-Item `
            -ItemType Directory `
            -Path (Split-Path -Parent $BackupPath) `
            -Force |
            Out-Null

        Copy-Item `
            -LiteralPath $TargetPath `
            -Destination $BackupPath `
            -Force

        $UpdatedFiles += $TargetPath

        $RollbackActions += [pscustomobject]@{
            action = 'restore'
            target = $TargetPath
            source = $BackupPath
        }

        Write-LeeWayLog `
            -Level INFO `
            -Message "Backed up existing file: $RelativePath"
    }
    else {
        $CreatedFiles += $TargetPath

        $RollbackActions += [pscustomobject]@{
            action = 'remove'
            target = $TargetPath
            source = $null
        }
    }
}

function Invoke-Rollback {
    Write-LeeWayLog -Level WARN -Message 'Executing MIG-003 rollback.'

    foreach ($Action in @($RollbackActions | Select-Object -Reverse)) {
        try {
            if ($Action.action -eq 'restore') {
                New-Item `
                    -ItemType Directory `
                    -Path (Split-Path -Parent $Action.target) `
                    -Force |
                    Out-Null

                Copy-Item `
                    -LiteralPath $Action.source `
                    -Destination $Action.target `
                    -Force

                Write-LeeWayLog `
                    -Level WARN `
                    -Message "Restored: $($Action.target)"
            }
            elseif ($Action.action -eq 'remove') {
                if (Test-Path -LiteralPath $Action.target -PathType Leaf) {
                    Remove-Item -LiteralPath $Action.target -Force

                    Write-LeeWayLog `
                        -Level WARN `
                        -Message "Removed created file: $($Action.target)"
                }
            }
        }
        catch {
            Write-LeeWayLog `
                -Level FAIL `
                -Message "Rollback action failed for $($Action.target): $($_.Exception.Message)"
        }
    }
}

try {
    Write-LeeWayLog `
        -Level STEP `
        -Message '1/9 | Verifying PowerShell and project root.'

    if ($PSVersionTable.PSVersion.Major -lt 7) {
        throw "PowerShell 7 or newer is required. Current: $($PSVersionTable.PSVersion)"
    }

    $ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)

    Assert-PathExists `
        -Path $ProjectRoot `
        -Description 'project root' `
        -PathType Container

    Set-Location -LiteralPath $ProjectRoot

    $ArchitectureRoot = Join-Path $ProjectRoot 'architecture'
    $MigrationRoot = Join-Path $ProjectRoot 'migration'
    $ScriptsRoot = Join-Path $ProjectRoot 'scripts'
    $EvidenceRoot = Join-Path $ProjectRoot 'evidence'
    $ModuleRoot = Join-Path $ProjectRoot 'src\core\modules'

    Assert-PathExists -Path $ArchitectureRoot -Description 'architecture directory' -PathType Container
    Assert-PathExists -Path $MigrationRoot -Description 'migration directory' -PathType Container
    Assert-PathExists -Path $ScriptsRoot -Description 'scripts directory' -PathType Container
    Assert-PathExists -Path $EvidenceRoot -Description 'evidence directory' -PathType Container
    Assert-PathExists -Path $ModuleRoot -Description 'module framework directory' -PathType Container

    $EvidenceSession = Join-Path `
        (Join-Path $EvidenceRoot $MigrationId) `
        $Timestamp

    $BackupRoot = Join-Path $EvidenceSession 'rollback'

    New-Item -ItemType Directory -Path $EvidenceSession -Force |
        Out-Null

    New-Item -ItemType Directory -Path $BackupRoot -Force |
        Out-Null

    Start-Transcript `
        -LiteralPath (Join-Path $EvidenceSession 'transcript.log') `
        -Force |
        Out-Null

    $TranscriptStarted = $true

    Write-LeeWayLog `
        -Level PASS `
        -Message "Evidence session created: $EvidenceSession"

    Write-LeeWayLog `
        -Level STEP `
        -Message '2/9 | Verifying governance and migration prerequisites.'

    $Adr0002Path = Find-FirstExistingFile `
        -Directory $ArchitectureRoot `
        -Names @(
            'ADR-0002.md',
            'ADR-0002-target-architecture.md'
        ) `
        -Description 'ADR-0002'

    $Adr0003Path = Find-FirstExistingFile `
        -Directory $ArchitectureRoot `
        -Names @(
            'ADR-0003.md',
            'ADR-0003-capability-architecture.md'
        ) `
        -Description 'ADR-0003'

    $Mig003Path = Find-FirstExistingFile `
        -Directory $MigrationRoot `
        -Names @(
            'MIG-003-module-framework.md'
        ) `
        -Description 'MIG-003 specification'

    $Mig002Receipt = Find-LatestPassingReceipt `
        -EvidenceRoot $EvidenceRoot `
        -Migration 'MIG-002'

    $Mig002AReceipt = Find-LatestPassingReceipt `
        -EvidenceRoot $EvidenceRoot `
        -Migration 'MIG-002A'

    if ($null -eq $Mig002Receipt) {
        throw 'No passing MIG-002 receipt was found.'
    }

    if ($null -eq $Mig002AReceipt) {
        throw 'No passing MIG-002A receipt was found.'
    }

    Write-LeeWayLog -Level PASS -Message "Verified ADR-0002: $Adr0002Path"
    Write-LeeWayLog -Level PASS -Message "Verified ADR-0003: $Adr0003Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-003 specification: $Mig003Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-002 receipt: $($Mig002Receipt.Path)"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-002A receipt: $($Mig002AReceipt.Path)"

    Write-LeeWayLog `
        -Level STEP `
        -Message '3/9 | Verifying Git containment and protected baseline.'

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git is required but was not found.'
    }

    $GitRootOutput = & git rev-parse --show-toplevel 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "Unable to determine Git root: $($GitRootOutput | Out-String)"
    }

    $GitRoot = [System.IO.Path]::GetFullPath(
        ($GitRootOutput | Select-Object -First 1).ToString().Trim()
    )

    $RelativeProjectPath = [System.IO.Path]::GetRelativePath(
        $GitRoot,
        $ProjectRoot
    )

    $ProjectOutsideGitRoot =
        ($RelativeProjectPath -eq '..') -or
        $RelativeProjectPath.StartsWith(
            '..\',
            [System.StringComparison]::OrdinalIgnoreCase
        ) -or
        $RelativeProjectPath.StartsWith(
            '../',
            [System.StringComparison]::OrdinalIgnoreCase
        ) -or
        [System.IO.Path]::IsPathRooted($RelativeProjectPath)

    if ($ProjectOutsideGitRoot) {
        throw "Project root is outside Git root. Project: $ProjectRoot Git: $GitRoot"
    }

    $ProtectedFiles = @(
        'package.json',
        'package-lock.json',
        'server.ts',
        'vite.config.ts',
        'vite.config.js'
    )

    $ProtectedBefore = [ordered]@{}

    foreach ($RelativePath in $ProtectedFiles) {
        $ProtectedBefore[$RelativePath] = Get-FileHashOrNull `
            -Path (Join-Path $ProjectRoot $RelativePath)
    }

    $InitialGitStatus = @(
        & git -C $GitRoot status --porcelain=v1 --untracked-files=all 2>&1
    )

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture initial Git status.'
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message "Project is contained within Git root: $GitRoot"

    Write-LeeWayLog `
        -Level STEP `
        -Message '4/9 | Defining MIG-003 target files.'

    $TargetFiles = [ordered]@{
        Types = Join-Path $ModuleRoot 'module-types.ts'
        Lifecycle = Join-Path $ModuleRoot 'module-lifecycle.ts'
        Registry = Join-Path $ModuleRoot 'module-registry.ts'
        Navigation = Join-Path $ModuleRoot 'module-navigation.ts'
        Discovery = Join-Path $ModuleRoot 'module-discovery.ts'
        Index = Join-Path $ModuleRoot 'index.ts'
        Manifest = Join-Path $MigrationRoot 'MIG-003-manifest.json'
    }

    foreach ($TargetPath in $TargetFiles.Values) {
        Backup-TargetFile -TargetPath $TargetPath
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Target files inventoried and rollback state prepared.'

    Write-LeeWayLog `
        -Level STEP `
        -Message '5/9 | Writing module contract, lifecycle, and metadata types.'

    $TypesContent = @"
export type LeeWayModuleId = string;

export type LeeWayModuleLifecycleState =
  | "registered"
  | "discovered"
  | "initializing"
  | "ready"
  | "suspended"
  | "failed"
  | "disposed";

export interface LeeWayModuleMetadata {
  id: LeeWayModuleId;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: readonly string[];
  dependencies: readonly LeeWayModuleId[];
  capabilities: readonly string[];
}

export interface LeeWayModuleNavigationRegistration {
  moduleId: LeeWayModuleId;
  label: string;
  href: string;
  order: number;
  icon?: string;
  parentId?: string;
  hidden?: boolean;
}

export interface LeeWayModuleContext {
  readonly moduleId: LeeWayModuleId;
  readonly runtimeApiVersion: string;
  readonly registeredAt: string;
}

export interface LeeWayModuleContract {
  readonly metadata: LeeWayModuleMetadata;
  readonly navigation?: readonly LeeWayModuleNavigationRegistration[];

  initialize?(context: LeeWayModuleContext): Promise<void> | void;
  suspend?(): Promise<void> | void;
  resume?(): Promise<void> | void;
  dispose?(): Promise<void> | void;
}

export interface LeeWayRegisteredModule {
  readonly contract: LeeWayModuleContract;
  readonly state: LeeWayModuleLifecycleState;
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly error?: string;
}

export interface LeeWayModuleDiscoveryRecord {
  readonly id: LeeWayModuleId;
  readonly metadata: LeeWayModuleMetadata;
  readonly state: LeeWayModuleLifecycleState;
  readonly navigation: readonly LeeWayModuleNavigationRegistration[];
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly error?: string;
}
"@

    $LifecycleContent = @"
import type { LeeWayModuleLifecycleState } from "./module-types";

const transitions: Readonly<
  Record<LeeWayModuleLifecycleState, readonly LeeWayModuleLifecycleState[]>
> = {
  registered: ["discovered", "initializing", "failed", "disposed"],
  discovered: ["initializing", "failed", "disposed"],
  initializing: ["ready", "failed", "disposed"],
  ready: ["suspended", "failed", "disposed"],
  suspended: ["ready", "failed", "disposed"],
  failed: ["initializing", "disposed"],
  disposed: [],
};

export function canTransitionModuleState(
  current: LeeWayModuleLifecycleState,
  next: LeeWayModuleLifecycleState,
): boolean {
  return transitions[current].includes(next);
}

export function assertModuleStateTransition(
  current: LeeWayModuleLifecycleState,
  next: LeeWayModuleLifecycleState,
): void {
  if (!canTransitionModuleState(current, next)) {
    throw new Error(
      "Invalid LeeWay module lifecycle transition: " +
        current +
        " -> " +
        next,
    );
  }
}

export function getAllowedModuleTransitions(
  current: LeeWayModuleLifecycleState,
): readonly LeeWayModuleLifecycleState[] {
  return transitions[current];
}
"@

    Write-TextFile -Path $TargetFiles.Types -Content $TypesContent
    Write-TextFile -Path $TargetFiles.Lifecycle -Content $LifecycleContent

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Module contract, metadata, and lifecycle files written.'

    Write-LeeWayLog `
        -Level STEP `
        -Message '6/9 | Writing registry, navigation, and discovery interfaces.'

    $RegistryContent = @"
import { assertModuleStateTransition } from "./module-lifecycle";
import type {
  LeeWayModuleContract,
  LeeWayModuleId,
  LeeWayModuleLifecycleState,
  LeeWayRegisteredModule,
} from "./module-types";

export class LeeWayModuleRegistry {
  private readonly modules = new Map<LeeWayModuleId, LeeWayRegisteredModule>();

  register(contract: LeeWayModuleContract): LeeWayRegisteredModule {
    const id = contract.metadata.id.trim();

    if (!id) {
      throw new Error("LeeWay module metadata.id is required.");
    }

    if (this.modules.has(id)) {
      throw new Error("LeeWay module is already registered: " + id);
    }

    const timestamp = new Date().toISOString();

    const record: LeeWayRegisteredModule = {
      contract,
      state: "registered",
      registeredAt: timestamp,
      updatedAt: timestamp,
    };

    this.modules.set(id, record);
    return record;
  }

  unregister(id: LeeWayModuleId): boolean {
    return this.modules.delete(id);
  }

  has(id: LeeWayModuleId): boolean {
    return this.modules.has(id);
  }

  get(id: LeeWayModuleId): LeeWayRegisteredModule | undefined {
    return this.modules.get(id);
  }

  list(): readonly LeeWayRegisteredModule[] {
    return Array.from(this.modules.values());
  }

  transition(
    id: LeeWayModuleId,
    next: LeeWayModuleLifecycleState,
    error?: string,
  ): LeeWayRegisteredModule {
    const current = this.modules.get(id);

    if (!current) {
      throw new Error("LeeWay module is not registered: " + id);
    }

    assertModuleStateTransition(current.state, next);

    const updated: LeeWayRegisteredModule = {
      ...current,
      state: next,
      updatedAt: new Date().toISOString(),
      ...(error ? { error } : {}),
    };

    this.modules.set(id, updated);
    return updated;
  }

  clear(): void {
    this.modules.clear();
  }
}

export const leeWayModuleRegistry = new LeeWayModuleRegistry();
"@

    $NavigationContent = @"
import type {
  LeeWayModuleNavigationRegistration,
  LeeWayRegisteredModule,
} from "./module-types";

export function collectModuleNavigation(
  modules: readonly LeeWayRegisteredModule[],
): readonly LeeWayModuleNavigationRegistration[] {
  return modules
    .flatMap((module) => module.contract.navigation ?? [])
    .filter((entry) => entry.hidden !== true)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.label.localeCompare(right.label);
    });
}
"@

    $DiscoveryContent = @"
import type {
  LeeWayModuleDiscoveryRecord,
  LeeWayRegisteredModule,
} from "./module-types";

export interface LeeWayModuleDiscoverySource {
  list(): readonly LeeWayRegisteredModule[];
}

export function discoverLeeWayModules(
  source: LeeWayModuleDiscoverySource,
): readonly LeeWayModuleDiscoveryRecord[] {
  return source.list().map((record) => ({
    id: record.contract.metadata.id,
    metadata: record.contract.metadata,
    state: record.state,
    navigation: record.contract.navigation ?? [],
    registeredAt: record.registeredAt,
    updatedAt: record.updatedAt,
    ...(record.error ? { error: record.error } : {}),
  }));
}
"@

    $IndexContent = @"
export * from "./module-types";
export * from "./module-lifecycle";
export * from "./module-registry";
export * from "./module-navigation";
export * from "./module-discovery";
"@

    Write-TextFile -Path $TargetFiles.Registry -Content $RegistryContent
    Write-TextFile -Path $TargetFiles.Navigation -Content $NavigationContent
    Write-TextFile -Path $TargetFiles.Discovery -Content $DiscoveryContent
    Write-TextFile -Path $TargetFiles.Index -Content $IndexContent

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Module registry, navigation, discovery, and exports written.'

    Write-LeeWayLog `
        -Level STEP `
        -Message '7/9 | Writing migration manifest and validating files.'

    $Manifest = [ordered]@{
        migration = $MigrationId
        target = $MigrationName
        status = 'Implemented'
        scope = @(
            'module contract',
            'module registry',
            'lifecycle states',
            'module metadata',
            'navigation registration',
            'discovery interface',
            'evidence',
            'rollback'
        )
        excluded = @(
            'studio migration',
            'OpenCode integration',
            'n8n integration',
            'Vite removal',
            'runtime execution integration'
        )
        files = @(
            $TargetFiles.Values |
                ForEach-Object {
                    [System.IO.Path]::GetRelativePath($ProjectRoot, $_)
                }
        )
        timestampUtc = [DateTimeOffset]::UtcNow.ToString('o')
    }

    Write-JsonFile -Value $Manifest -Path $TargetFiles.Manifest

    foreach ($TargetPath in $TargetFiles.Values) {
        Assert-PathExists `
            -Path $TargetPath `
            -Description ([System.IO.Path]::GetRelativePath($ProjectRoot, $TargetPath)) `
            -PathType Leaf
    }

    $RequiredSymbols = [ordered]@{
        $TargetFiles.Types = @(
            'LeeWayModuleMetadata',
            'LeeWayModuleContract',
            'LeeWayModuleLifecycleState',
            'LeeWayModuleNavigationRegistration',
            'LeeWayModuleDiscoveryRecord'
        )
        $TargetFiles.Lifecycle = @(
            'canTransitionModuleState',
            'assertModuleStateTransition'
        )
        $TargetFiles.Registry = @(
            'LeeWayModuleRegistry',
            'register',
            'transition'
        )
        $TargetFiles.Navigation = @(
            'collectModuleNavigation'
        )
        $TargetFiles.Discovery = @(
            'LeeWayModuleDiscoverySource',
            'discoverLeeWayModules'
        )
    }

    foreach ($FilePath in $RequiredSymbols.Keys) {
        $FileText = Get-Content -LiteralPath $FilePath -Raw

        foreach ($Symbol in $RequiredSymbols[$FilePath]) {
            if (-not $FileText.Contains($Symbol)) {
                throw "Required symbol '$Symbol' is missing from $FilePath"
            }
        }
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Module framework files and required symbols validated.'

    Write-LeeWayLog `
        -Level STEP `
        -Message '8/9 | Running TypeScript/build validation.'

    $BuildLogPath = Join-Path $EvidenceSession 'npm-build.log'

    Push-Location -LiteralPath $ProjectRoot

    try {
        $BuildOutput = & npm run build 2>&1
        $BuildExitCode = $LASTEXITCODE

        $BuildOutput |
            Set-Content `
                -LiteralPath $BuildLogPath `
                -Encoding utf8NoBOM
    }
    finally {
        Pop-Location
    }

    if ($BuildExitCode -ne 0) {
        throw "npm run build failed with exit code $BuildExitCode. See $BuildLogPath"
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message 'npm run build completed successfully.'

    $ProtectedAfter = [ordered]@{}
    $ProtectedChanged = @()

    foreach ($RelativePath in $ProtectedFiles) {
        $ProtectedAfter[$RelativePath] = Get-FileHashOrNull `
            -Path (Join-Path $ProjectRoot $RelativePath)

        if ($ProtectedBefore[$RelativePath] -ne $ProtectedAfter[$RelativePath]) {
            $ProtectedChanged += $RelativePath
        }
    }

    if ($ProtectedChanged.Count -gt 0) {
        throw "Protected files changed unexpectedly: $($ProtectedChanged -join ', ')"
    }

    Write-LeeWayLog `
        -Level PASS `
        -Message 'Protected files remained unchanged.'

    Write-LeeWayLog `
        -Level STEP `
        -Message '9/9 | Writing PASS evidence and receipt.'

    $FinalGitStatus = @(
        & git -C $GitRoot status --porcelain=v1 --untracked-files=all 2>&1
    )

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to capture final Git status.'
    }

    $FileHashes = [ordered]@{}

    foreach ($TargetPath in $TargetFiles.Values) {
        $RelativeTarget = [System.IO.Path]::GetRelativePath(
            $ProjectRoot,
            $TargetPath
        )

        $FileHashes[$RelativeTarget] = Get-FileHashOrNull -Path $TargetPath
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'MIG-002 prerequisite'
        passed = $true
        evidence = $Mig002Receipt.Path
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'MIG-002A prerequisite'
        passed = $true
        evidence = $Mig002AReceipt.Path
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'Module contract'
        passed = $true
        file = $TargetFiles.Types
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'Module lifecycle'
        passed = $true
        file = $TargetFiles.Lifecycle
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'Module registry'
        passed = $true
        file = $TargetFiles.Registry
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'Navigation registration'
        passed = $true
        file = $TargetFiles.Navigation
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'Discovery interface'
        passed = $true
        file = $TargetFiles.Discovery
    }

    $ValidationRecords += [pscustomobject]@{
        name = 'Build validation'
        passed = $true
        log = $BuildLogPath
    }

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
        adr = @(
            $Adr0002Path,
            $Adr0003Path
        )
        specification = $Mig003Path
        prerequisites = @(
            $Mig002Receipt.Path,
            $Mig002AReceipt.Path
        )
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
        Stage = 'Module Framework Established'
        ScriptVersion = $ScriptVersion
        ProjectRoot = $ProjectRoot
        GitRoot = $GitRoot
        Evidence = $EvidenceSession
        Manifest = $TargetFiles.Manifest
        Specification = $Mig003Path
        BuildLog = $BuildLogPath
        Rollback = $BackupRoot
        Timestamp = $EndedAtUtc.ToString('o')
    }

    Write-JsonFile `
        -Value $EnvironmentEvidence `
        -Path (Join-Path $EvidenceSession 'environment.json')

    Write-JsonFile `
        -Value $MigrationEvidence `
        -Path (Join-Path $EvidenceSession 'migration.json')

    Write-JsonFile `
        -Value $ValidationEvidence `
        -Path (Join-Path $EvidenceSession 'validation.json')

    Write-JsonFile `
        -Value $Receipt `
        -Path (Join-Path $EvidenceSession 'receipt.json')

    Write-LeeWayLog -Level PASS -Message "$MigrationId completed successfully."
    Write-LeeWayLog -Level PASS -Message "Evidence: $EvidenceSession"
    Write-LeeWayLog -Level PASS -Message "Receipt: $(Join-Path $EvidenceSession 'receipt.json')"
}
catch {
    $FailureMessage = $_.Exception.Message

    Write-LeeWayLog -Level FAIL -Message $FailureMessage

    if ($RollbackActions.Count -gt 0) {
        Invoke-Rollback
    }

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
            Stage = 'Module Framework'
            ScriptVersion = $ScriptVersion
            ProjectRoot = $ProjectRoot
            Evidence = $EvidenceSession
            Rollback = $BackupRoot
            Timestamp = $EndedAtUtc.ToString('o')
            Failure = $FailureMessage
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
    if ($TranscriptStarted) {
        try {
            Stop-Transcript | Out-Null
        }
        catch {
            Write-Warning "Transcript cleanup failed: $($_.Exception.Message)"
        }
    }
}