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

$MigrationId = 'MIG-004'
$MigrationName = 'LeeWay Runtime Contract'
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
    if (-not (Test-Path -LiteralPath $MigrationRoot -PathType Container)) {
        return $null
    }
    $ReceiptFiles = @(
        Get-ChildItem -LiteralPath $MigrationRoot -Filter 'receipt.json' -File -Recurse |
            Sort-Object LastWriteTimeUtc -Descending
    )
    foreach ($ReceiptFile in $ReceiptFiles) {
        try {
            $Receipt = Get-Content -LiteralPath $ReceiptFile.FullName -Raw | ConvertFrom-Json
            $Status = $null
            if ($Receipt.PSObject.Properties.Name -contains 'Status') {
                $Status = [string]$Receipt.Status
            } elseif ($Receipt.PSObject.Properties.Name -contains 'status') {
                $Status = [string]$Receipt.status
            }
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
    Write-LeeWayLog -Level WARN -Message 'Executing MIG-004 rollback.'
    foreach ($Action in @($RollbackActions | Select-Object -Reverse)) {
        try {
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
    $RuntimeRoot = Join-Path $ProjectRoot 'src\core\runtime'
    $ModuleRoot = Join-Path $ProjectRoot 'src\core\modules'

    Assert-PathExists -Path $ArchitectureRoot -Description 'architecture directory' -PathType Container
    Assert-PathExists -Path $MigrationRoot -Description 'migration directory' -PathType Container
    Assert-PathExists -Path $ScriptsRoot -Description 'scripts directory' -PathType Container
    Assert-PathExists -Path $EvidenceRoot -Description 'evidence directory' -PathType Container
    Assert-PathExists -Path $RuntimeRoot -Description 'runtime contract directory' -PathType Container
    Assert-PathExists -Path $ModuleRoot -Description 'module framework directory' -PathType Container

    $EvidenceSession = Join-Path (Join-Path $EvidenceRoot $MigrationId) $Timestamp
    $BackupRoot = Join-Path $EvidenceSession 'rollback'
    New-Item -ItemType Directory -Path $EvidenceSession -Force | Out-Null
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

    Start-Transcript -LiteralPath (Join-Path $EvidenceSession 'transcript.log') -Force | Out-Null
    $TranscriptStarted = $true

    Write-LeeWayLog -Level PASS -Message "Evidence session created: $EvidenceSession"

    Write-LeeWayLog -Level STEP -Message '2/9 | Verifying governance and migration prerequisites.'

    $Adr0002Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0002.md', 'ADR-0002-target-architecture.md') -Description 'ADR-0002'
    $Adr0004Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0004.md', 'ADR-0004-runtime-fabric-api.md') -Description 'ADR-0004'
    $Mig004Path = Find-FirstExistingFile -Directory $MigrationRoot -Names @('MIG-004-runtime-contract.md') -Description 'MIG-004 specification'

    $Mig003Receipt = Find-LatestPassingReceipt -EvidenceRoot $EvidenceRoot -Migration 'MIG-003'

    if ($null -eq $Mig003Receipt) {
        throw 'No passing MIG-003 receipt was found.'
    }

    Write-LeeWayLog -Level PASS -Message "Verified ADR-0002: $Adr0002Path"
    Write-LeeWayLog -Level PASS -Message "Verified ADR-0004: $Adr0004Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-004 specification: $Mig004Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-003 receipt: $($Mig003Receipt.Path)"

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

    Write-LeeWayLog -Level STEP -Message '4/9 | Defining MIG-004 target files.'

    $TargetFiles = [ordered]@{
        Types = Join-Path $RuntimeRoot 'runtime-types.ts'
        Contract = Join-Path $RuntimeRoot 'runtime-contract.ts'
        Client = Join-Path $RuntimeRoot 'runtime-client.ts'
        Mock = Join-Path $RuntimeRoot 'runtime-mock.ts'
        Index = Join-Path $RuntimeRoot 'index.ts'
        Manifest = Join-Path $MigrationRoot 'MIG-004-manifest.json'
    }

    foreach ($TargetPath in $TargetFiles.Values) {
        Backup-TargetFile -TargetPath $TargetPath
    }

    Write-LeeWayLog -Level PASS -Message 'Target files inventoried and rollback state prepared.'

    Write-LeeWayLog -Level STEP -Message '5/9 | Writing runtime contract types, envelopes, and contracts.'

    $TypesContent = @"
export type LeeWayRuntimeApiVersion = string;

export const LEEWAY_RUNTIME_API_VERSION: LeeWayRuntimeApiVersion = "1.0.0";

export type LeeWayRuntimeCapabilityMethod = "execute" | "query" | "stream" | "subscribe" | "cancel";

export interface LeeWayRuntimeRequestEnvelope {
  readonly apiVersion: LeeWayRuntimeApiVersion;
  readonly requestId: string;
  readonly capabilityId: string;
  readonly method: LeeWayRuntimeCapabilityMethod;
  readonly params?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
}

export interface LeeWayRuntimeResponseEnvelope {
  readonly apiVersion: LeeWayRuntimeApiVersion;
  readonly requestId: string;
  readonly capabilityId: string;
  readonly method: LeeWayRuntimeCapabilityMethod;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: LeeWayRuntimeError;
  readonly meta?: LeeWayRuntimeResponseMeta;
}

export interface LeeWayRuntimeResponseMeta {
  readonly durationMs: number;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface LeeWayRuntimeError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface LeeWayRuntimeHealthStatus {
  readonly ok: boolean;
  readonly version: string;
  readonly uptimeMs: number;
  readonly checks: Record<string, boolean>;
  readonly checkedAt: string;
}

export interface LeeWayRuntimeEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly source: string;
  readonly timestamp: string;
  readonly payload?: Record<string, unknown>;
}

export interface LeeWayRuntimeEventSubscription {
  readonly subscriptionId: string;
  readonly eventTypes: readonly string[];
  readonly source?: string;
  readonly createdAt: string;
}

export interface LeeWayRuntimeCapabilityExecution {
  readonly executionId: string;
  readonly request: LeeWayRuntimeRequestEnvelope;
  readonly status: "pending" | "running" | "completed" | "failed" | "cancelled";
  readonly response?: LeeWayRuntimeResponseEnvelope;
  readonly startedAt: string;
  readonly updatedAt: string;
}

export interface LeeWayRuntimeContract {
  readonly apiVersion: LeeWayRuntimeApiVersion;
  readonly capabilities: readonly string[];
  readonly maxPayloadSize?: number;
  readonly timeout?: number;
  readonly versioned: boolean;
}
"@

    $ContractContent = @"
import {
  LEEWAY_RUNTIME_API_VERSION,
  type LeeWayRuntimeContract,
  type LeeWayRuntimeError,
  type LeeWayRuntimeHealthStatus,
  type LeeWayRuntimeRequestEnvelope,
  type LeeWayRuntimeResponseEnvelope,
} from "./runtime-types";

export function createLeeWayRuntimeContract(
  overrides?: Partial<Pick<LeeWayRuntimeContract, "capabilities" | "maxPayloadSize" | "timeout">>,
): LeeWayRuntimeContract {
  return {
    apiVersion: LEEWAY_RUNTIME_API_VERSION,
    capabilities: overrides?.capabilities ?? [],
    maxPayloadSize: overrides?.maxPayloadSize ?? 10485760,
    timeout: overrides?.timeout ?? 30000,
    versioned: true,
  };
}

export function validateLeeWayRuntimeRequestEnvelope(
  envelope: unknown,
): envelope is LeeWayRuntimeRequestEnvelope {
  if (typeof envelope !== "object" || envelope === null) return false;
  const e = envelope as Record<string, unknown>;
  if (typeof e.apiVersion !== "string") return false;
  if (typeof e.requestId !== "string" || !e.requestId) return false;
  if (typeof e.capabilityId !== "string" || !e.capabilityId) return false;
  if (typeof e.method !== "string") return false;
  const validMethods = ["execute", "query", "stream", "subscribe", "cancel"];
  if (!validMethods.includes(e.method as string)) return false;
  return true;
}

export function validateLeeWayRuntimeResponseEnvelope(
  envelope: unknown,
): envelope is LeeWayRuntimeResponseEnvelope {
  if (typeof envelope !== "object" || envelope === null) return false;
  const e = envelope as Record<string, unknown>;
  if (typeof e.apiVersion !== "string") return false;
  if (typeof e.requestId !== "string" || !e.requestId) return false;
  if (typeof e.capabilityId !== "string" || !e.capabilityId) return false;
  if (typeof e.method !== "string") return false;
  if (typeof e.success !== "boolean") return false;
  return true;
}

export function createLeeWayRuntimeError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): LeeWayRuntimeError {
  return { code, message, ...(details ? { details } : {}) };
}

export function createLeeWayRuntimeHealthStatus(
  checks: Record<string, boolean>,
  version: string,
  uptimeMs: number,
): LeeWayRuntimeHealthStatus {
  const allOk = Object.values(checks).every(Boolean);
  return {
    ok: allOk,
    version,
    uptimeMs,
    checks,
    checkedAt: new Date().toISOString(),
  };
}
"@

    Write-TextFile -Path $TargetFiles.Types -Content $TypesContent
    Write-TextFile -Path $TargetFiles.Contract -Content $ContractContent

    Write-LeeWayLog -Level PASS -Message 'Runtime contract types, envelopes, and contracts written.'

    Write-LeeWayLog -Level STEP -Message '6/9 | Writing client interface and mock validation.'

    $ClientContent = @"
import type {
  LeeWayRuntimeCapabilityExecution,
  LeeWayRuntimeEvent,
  LeeWayRuntimeEventSubscription,
  LeeWayRuntimeHealthStatus,
  LeeWayRuntimeRequestEnvelope,
  LeeWayRuntimeResponseEnvelope,
} from "./runtime-types";

export interface LeeWayRuntimeClient {
  readonly name: string;
  readonly version: string;

  send(request: LeeWayRuntimeRequestEnvelope): Promise<LeeWayRuntimeResponseEnvelope>;
  stream(request: LeeWayRuntimeRequestEnvelope): AsyncIterable<LeeWayRuntimeResponseEnvelope>;
  health(): Promise<LeeWayRuntimeHealthStatus>;
  subscribe(subscription: LeeWayRuntimeEventSubscription): Promise<void>;
  unsubscribe(subscriptionId: string): Promise<void>;
  getExecution(executionId: string): Promise<LeeWayRuntimeCapabilityExecution | undefined>;
}

export function isLeeWayRuntimeClient(value: unknown): value is LeeWayRuntimeClient {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.send === "function" &&
    typeof candidate.stream === "function" &&
    typeof candidate.health === "function" &&
    typeof candidate.subscribe === "function" &&
    typeof candidate.unsubscribe === "function" &&
    typeof candidate.getExecution === "function"
  );
}
"@

    $MockContent = @"
import type {
  LeeWayRuntimeCapabilityExecution,
  LeeWayRuntimeEvent,
  LeeWayRuntimeEventSubscription,
  LeeWayRuntimeHealthStatus,
  LeeWayRuntimeRequestEnvelope,
  LeeWayRuntimeResponseEnvelope,
} from "./runtime-types";
import { createLeeWayRuntimeHealthStatus } from "./runtime-contract";
import type { LeeWayRuntimeClient } from "./runtime-client";

export interface MockRuntimeClientOptions {
  readonly name?: string;
  readonly version?: string;
  readonly failOn?: string[];
  readonly responseDelayMs?: number;
}

export function createMockRuntimeClient(
  options?: MockRuntimeClientOptions,
): LeeWayRuntimeClient {
  const name = options?.name ?? "mock-runtime-client";
  const version = options?.version ?? "1.0.0-mock";
  const failOn = new Set(options?.failOn ?? []);
  const delayMs = options?.responseDelayMs ?? 0;

  const delay = () =>
    delayMs > 0 ? new Promise((r) => setTimeout(r, delayMs)) : Promise.resolve();

  const send = async (
    request: LeeWayRuntimeRequestEnvelope,
  ): Promise<LeeWayRuntimeResponseEnvelope> => {
    await delay();
    const failed = failOn.has(request.capabilityId);
    const now = new Date().toISOString();
    return {
      apiVersion: "1.0.0",
      requestId: request.requestId,
      capabilityId: request.capabilityId,
      method: request.method,
      success: !failed,
      ...(failed
        ? { error: { code: "MOCK_FAILURE", message: "Mock failure: " + request.capabilityId } }
        : { data: { mock: true, echo: request.params } }),
      meta: { durationMs: delayMs, startedAt: now, completedAt: now },
    };
  };

  async function* stream(
    request: LeeWayRuntimeRequestEnvelope,
  ): AsyncIterable<LeeWayRuntimeResponseEnvelope> {
    await delay();
    const now = new Date().toISOString();
    yield {
      apiVersion: "1.0.0",
      requestId: request.requestId,
      capabilityId: request.capabilityId,
      method: request.method,
      success: true,
      data: { mock: true, chunk: 1, echo: request.params },
      meta: { durationMs: delayMs, startedAt: now, completedAt: now },
    };
  }

  const health = async (): Promise<LeeWayRuntimeHealthStatus> => {
    await delay();
    return createLeeWayRuntimeHealthStatus({ mock: true }, "1.0.0-mock", 0);
  };

  const subscriptions = new Map<string, LeeWayRuntimeEventSubscription>();

  const subscribe = async (sub: LeeWayRuntimeEventSubscription): Promise<void> => {
    subscriptions.set(sub.subscriptionId, sub);
  };

  const unsubscribe = async (subscriptionId: string): Promise<void> => {
    subscriptions.delete(subscriptionId);
  };

  const getExecution = async (
    _executionId: string,
  ): Promise<LeeWayRuntimeCapabilityExecution | undefined> => {
    return undefined;
  };

  return { name, version, send, stream, health, subscribe, unsubscribe, getExecution };
}

export function validateMockRuntimeClient(checks?: {
  expectedFailures?: string[];
}): { ok: boolean; sendResult?: LeeWayRuntimeResponseEnvelope; healthResult?: LeeWayRuntimeHealthStatus; errors: string[] } {
  const errors: string[] = [];
  const client = createMockRuntimeClient({
    failOn: checks?.expectedFailures,
    responseDelayMs: 1,
  });

  if (!client) { errors.push("client is undefined"); return { ok: false, errors }; }
  if (typeof client.send !== "function") { errors.push("client.send is not a function"); }
  if (typeof client.stream !== "function") { errors.push("client.stream is not a function"); }
  if (typeof client.health !== "function") { errors.push("client.health is not a function"); }
  if (typeof client.subscribe !== "function") { errors.push("client.subscribe is not a function"); }
  if (typeof client.unsubscribe !== "function") { errors.push("client.unsubscribe is not a function"); }

  return { ok: errors.length === 0, errors };
}
"@

    $IndexContent = @"
export * from "./runtime-types";
export * from "./runtime-contract";
export * from "./runtime-client";
export * from "./runtime-mock";
"@

    Write-TextFile -Path $TargetFiles.Client -Content $ClientContent
    Write-TextFile -Path $TargetFiles.Mock -Content $MockContent
    Write-TextFile -Path $TargetFiles.Index -Content $IndexContent

    Write-LeeWayLog -Level PASS -Message 'Client interface and mock validation written.'

    Write-LeeWayLog -Level STEP -Message '7/9 | Writing migration manifest and validating files.'

    $Manifest = [ordered]@{
        migration = $MigrationId
        target = $MigrationName
        status = 'Implemented'
        scope = @(
            'Runtime Fabric API types',
            'request/response envelopes',
            'health contract',
            'error contract',
            'capability execution contract',
            'event contract',
            'version contract',
            'client interface',
            'mock contract validation',
            'evidence',
            'rollback'
        )
        excluded = @(
            'server.ts replacement',
            'existing route migration',
            'OpenCode integration',
            'n8n integration',
            'studio migration',
            'Vite removal'
        )
        files = @(
            $TargetFiles.Values | ForEach-Object {
                [System.IO.Path]::GetRelativePath($ProjectRoot, $_)
            }
        )
        timestampUtc = [DateTimeOffset]::UtcNow.ToString('o')
    }

    Write-JsonFile -Value $Manifest -Path $TargetFiles.Manifest

    foreach ($TargetPath in $TargetFiles.Values) {
        Assert-PathExists -Path $TargetPath -Description ([System.IO.Path]::GetRelativePath($ProjectRoot, $TargetPath)) -PathType Leaf
    }

    $RequiredSymbols = [ordered]@{
        $TargetFiles.Types = @(
            'LeeWayRuntimeRequestEnvelope',
            'LeeWayRuntimeResponseEnvelope',
            'LeeWayRuntimeError',
            'LeeWayRuntimeHealthStatus',
            'LeeWayRuntimeEvent',
            'LeeWayRuntimeCapabilityExecution',
            'LeeWayRuntimeContract',
            'LEEWAY_RUNTIME_API_VERSION'
        )
        $TargetFiles.Contract = @(
            'createLeeWayRuntimeContract',
            'validateLeeWayRuntimeRequestEnvelope',
            'validateLeeWayRuntimeResponseEnvelope',
            'createLeeWayRuntimeError',
            'createLeeWayRuntimeHealthStatus'
        )
        $TargetFiles.Client = @(
            'LeeWayRuntimeClient',
            'isLeeWayRuntimeClient'
        )
        $TargetFiles.Mock = @(
            'createMockRuntimeClient',
            'validateMockRuntimeClient'
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

    Write-LeeWayLog -Level PASS -Message 'Runtime contract files and required symbols validated.'

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

    $ValidationRecords += [pscustomobject]@{ name = 'MIG-003 prerequisite'; passed = $true; evidence = $Mig003Receipt.Path }
    $ValidationRecords += [pscustomobject]@{ name = 'Runtime API types'; passed = $true; file = $TargetFiles.Types }
    $ValidationRecords += [pscustomobject]@{ name = 'Runtime contracts'; passed = $true; file = $TargetFiles.Contract }
    $ValidationRecords += [pscustomobject]@{ name = 'Client interface'; passed = $true; file = $TargetFiles.Client }
    $ValidationRecords += [pscustomobject]@{ name = 'Mock validation'; passed = $true; file = $TargetFiles.Mock }
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
        adr = @($Adr0002Path, $Adr0004Path)
        specification = $Mig004Path
        prerequisites = @($Mig003Receipt.Path)
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
        Stage = 'Runtime Contract Established'
        ScriptVersion = $ScriptVersion
        ProjectRoot = $ProjectRoot
        GitRoot = $GitRoot
        Evidence = $EvidenceSession
        Manifest = $TargetFiles.Manifest
        Specification = $Mig004Path
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
} catch {
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
            Stage = 'Runtime Contract'
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
} finally {
    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch { Write-Warning "Transcript cleanup failed: $($_.Exception.Message)" }
    }
}
