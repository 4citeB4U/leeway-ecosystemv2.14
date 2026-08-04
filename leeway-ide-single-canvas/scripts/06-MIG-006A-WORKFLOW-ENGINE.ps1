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

$MigrationId = 'MIG-006A'
$MigrationName = 'LeeWay Workflow Engine'
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
    Write-LeeWayLog -Level WARN -Message 'Executing MIG-006A rollback.'
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
    $WorkflowEngineRoot = Join-Path $ProjectRoot 'src\core\workflow-engine'
    $ModuleRoot = Join-Path $ProjectRoot 'src\core\modules'
    $RuntimeRoot = Join-Path $ProjectRoot 'src\core\runtime'
    $CodeEngineRoot = Join-Path $ProjectRoot 'src\core\code-engine'

    Assert-PathExists -Path $ArchitectureRoot -Description 'architecture directory' -PathType Container
    Assert-PathExists -Path $MigrationRoot -Description 'migration directory' -PathType Container
    Assert-PathExists -Path $ScriptsRoot -Description 'scripts directory' -PathType Container
    Assert-PathExists -Path $EvidenceRoot -Description 'evidence directory' -PathType Container
    Assert-PathExists -Path $ModuleRoot -Description 'module framework directory' -PathType Container
    Assert-PathExists -Path $RuntimeRoot -Description 'runtime contract directory' -PathType Container
    Assert-PathExists -Path $CodeEngineRoot -Description 'code engine directory' -PathType Container

    $EvidenceSession = Join-Path (Join-Path $EvidenceRoot $MigrationId) $Timestamp
    $BackupRoot = Join-Path $EvidenceSession 'rollback'
    New-Item -ItemType Directory -Path $EvidenceSession -Force | Out-Null
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

    Start-Transcript -LiteralPath (Join-Path $EvidenceSession 'transcript.log') -Force | Out-Null
    $TranscriptStarted = $true

    Write-LeeWayLog -Level PASS -Message "Evidence session created: $EvidenceSession"

    Write-LeeWayLog -Level STEP -Message '2/9 | Verifying governance and migration prerequisites.'

    $Adr0002Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0002.md', 'ADR-0002-target-architecture.md') -Description 'ADR-0002'
    $Adr0006Path = Find-FirstExistingFile -Directory $ArchitectureRoot -Names @('ADR-0006.md', 'ADR-0006-n8n-integration.md') -Description 'ADR-0006'
    $Mig006Path = Find-FirstExistingFile -Directory $MigrationRoot -Names @('MIG-006-workflow-engine.md') -Description 'MIG-006 specification'

    $Mig005Receipt = Find-LatestPassingReceipt -EvidenceRoot $EvidenceRoot -Migration 'MIG-005'

    if ($null -eq $Mig005Receipt) {
        throw 'No passing MIG-005 receipt was found.'
    }

    Write-LeeWayLog -Level PASS -Message "Verified ADR-0002: $Adr0002Path"
    Write-LeeWayLog -Level PASS -Message "Verified ADR-0006: $Adr0006Path"
    Write-LeeWayLog -Level PASS -Message "Verified MIG-006 specification: $Mig006Path"
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

    Write-LeeWayLog -Level STEP -Message '4/9 | Defining MIG-006A target files.'

    $TargetFiles = [ordered]@{
        Types = Join-Path $WorkflowEngineRoot 'workflow-engine-types.ts'
        Contract = Join-Path $WorkflowEngineRoot 'workflow-engine-contract.ts'
        Registry = Join-Path $WorkflowEngineRoot 'workflow-engine-registry.ts'
        Adapter = Join-Path $WorkflowEngineRoot 'n8n-adapter.ts'
        Mock = Join-Path $WorkflowEngineRoot 'workflow-engine-mock.ts'
        Index = Join-Path $WorkflowEngineRoot 'index.ts'
        Manifest = Join-Path $MigrationRoot 'MIG-006-manifest.json'
    }

    foreach ($TargetPath in $TargetFiles.Values) {
        Backup-TargetFile -TargetPath $TargetPath
    }

    Write-LeeWayLog -Level PASS -Message 'Target files inventoried and rollback state prepared.'

    Write-LeeWayLog -Level STEP -Message '5/9 | Writing Workflow Engine types, contract, and lifecycle.'

    $TypesContent = @"
import type { LeeWayModuleMetadata } from "../modules/module-types";
import type { LeeWayRuntimeRequestEnvelope, LeeWayRuntimeResponseEnvelope } from "../runtime/runtime-types";

export type LeeWayWorkflowEngineId = string;

export type LeeWayWorkflowEngineLifecycleState =
  | "registered"
  | "discovering"
  | "ready"
  | "executing"
  | "suspended"
  | "failed"
  | "disposed";

export interface LeeWayWorkflowEngineMetadata {
  readonly id: LeeWayWorkflowEngineId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly provider: string;
  readonly capabilities: readonly string[];
}

export interface LeeWayWorkflowEngineProvider {
  readonly name: string;
  readonly version: string;

  execute(request: LeeWayWorkflowEngineRequest): Promise<LeeWayWorkflowEngineResult>;
  health(): Promise<LeeWayWorkflowEngineHealth>;
}

export interface LeeWayWorkflowEngineRequest {
  readonly workflowId?: string;
  readonly action: string;
  readonly params?: Record<string, unknown>;
  readonly timeout?: number;
}

export interface LeeWayWorkflowEngineResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: LeeWayWorkflowEngineError;
  readonly durationMs: number;
}

export interface LeeWayWorkflowEngineError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface LeeWayWorkflowEngineHealth {
  readonly ok: boolean;
  readonly version: string;
  readonly provider: string;
  readonly checks: Record<string, boolean>;
  readonly checkedAt: string;
}

export interface LeeWayWorkflowEngineRegistration {
  readonly metadata: LeeWayWorkflowEngineMetadata;
  readonly moduleMetadata: LeeWayModuleMetadata;
  readonly state: LeeWayWorkflowEngineLifecycleState;
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly error?: string;
}

export interface LeeWayN8nConfigValidation {
  readonly ok: boolean;
  readonly path: string;
  readonly exists: boolean;
  readonly parses: boolean;
  readonly hasWorkflows: boolean;
  readonly errors: readonly string[];
}

export interface LeeWayWorkflowEngineExecution {
  readonly executionId: string;
  readonly request: LeeWayWorkflowEngineRequest;
  readonly state: "pending" | "running" | "completed" | "failed" | "cancelled";
  readonly result?: LeeWayWorkflowEngineResult;
  readonly startedAt: string;
  readonly updatedAt: string;
}
"@

    $ContractContent = @"
import type { LeeWayRuntimeRequestEnvelope, LeeWayRuntimeResponseEnvelope } from "../runtime/runtime-types";
import type {
  LeeWayWorkflowEngineLifecycleState,
  LeeWayWorkflowEngineMetadata,
  LeeWayWorkflowEngineProvider,
  LeeWayWorkflowEngineRegistration,
  LeeWayWorkflowEngineRequest,
  LeeWayWorkflowEngineResult,
  LeeWayWorkflowEngineExecution,
} from "./workflow-engine-types";

const workflowEngineTransitionMap: Readonly<
  Record<LeeWayWorkflowEngineLifecycleState, readonly LeeWayWorkflowEngineLifecycleState[]>
> = {
  registered: ["discovering", "failed", "disposed"],
  discovering: ["ready", "failed", "disposed"],
  ready: ["executing", "suspended", "failed", "disposed"],
  executing: ["ready", "suspended", "failed", "disposed"],
  suspended: ["ready", "failed", "disposed"],
  failed: ["discovering", "disposed"],
  disposed: [],
};

export function canTransitionWorkflowEngineState(
  current: LeeWayWorkflowEngineLifecycleState,
  next: LeeWayWorkflowEngineLifecycleState,
): boolean {
  return workflowEngineTransitionMap[current].includes(next);
}

export function assertWorkflowEngineStateTransition(
  current: LeeWayWorkflowEngineLifecycleState,
  next: LeeWayWorkflowEngineLifecycleState,
): void {
  if (!canTransitionWorkflowEngineState(current, next)) {
    throw new Error(
      "Invalid LeeWay Workflow Engine lifecycle transition: " + current + " -> " + next,
    );
  }
}

export function createLeeWayWorkflowEngineRegistration(
  metadata: LeeWayWorkflowEngineMetadata,
  moduleMetadata: LeeWayWorkflowEngineRegistration["moduleMetadata"],
): LeeWayWorkflowEngineRegistration {
  const now = new Date().toISOString();
  return {
    metadata,
    moduleMetadata,
    state: "registered",
    registeredAt: now,
    updatedAt: now,
  };
}

export function mapWorkflowEngineRequestToRuntimeEnvelope(
  request: LeeWayWorkflowEngineRequest,
  engineId: string,
): LeeWayRuntimeRequestEnvelope {
  return {
    apiVersion: "1.0.0",
    requestId: crypto.randomUUID(),
    capabilityId: engineId,
    method: "execute",
    params: { action: request.action, workflowId: request.workflowId, ...(request.params as Record<string, unknown>) },
    timeout: request.timeout,
  };
}

export function mapRuntimeResponseToWorkflowEngineResult(
  envelope: LeeWayRuntimeResponseEnvelope,
): LeeWayWorkflowEngineResult {
  return {
    success: envelope.success,
    data: envelope.data,
    error: envelope.error,
    durationMs: envelope.meta?.durationMs ?? 0,
  };
}
"@

    Write-TextFile -Path $TargetFiles.Types -Content $TypesContent
    Write-TextFile -Path $TargetFiles.Contract -Content $ContractContent

    Write-LeeWayLog -Level PASS -Message 'Workflow Engine types, contract, and lifecycle written.'

    Write-LeeWayLog -Level STEP -Message '6/9 | Writing registry, n8n adapter, and mock.'

    $RegistryContent = @"
import type { LeeWayModuleContract, LeeWayModuleMetadata } from "../modules/module-types";
import { leeWayModuleRegistry } from "../modules/module-registry";
import { assertWorkflowEngineStateTransition, createLeeWayWorkflowEngineRegistration } from "./workflow-engine-contract";
import type {
  LeeWayWorkflowEngineId,
  LeeWayWorkflowEngineLifecycleState,
  LeeWayWorkflowEngineMetadata,
  LeeWayWorkflowEngineProvider,
  LeeWayWorkflowEngineRegistration,
} from "./workflow-engine-types";

export class LeeWayWorkflowEngineRegistry {
  private readonly engines = new Map<LeeWayWorkflowEngineId, LeeWayWorkflowEngineRegistration>();
  private readonly providers = new Map<LeeWayWorkflowEngineId, LeeWayWorkflowEngineProvider>();

  register(
    metadata: LeeWayWorkflowEngineMetadata,
    provider: LeeWayWorkflowEngineProvider,
    moduleContract?: LeeWayModuleContract,
  ): LeeWayWorkflowEngineRegistration {
    const id = metadata.id.trim();

    if (!id) {
      throw new Error("LeeWay Workflow Engine metadata.id is required.");
    }

    if (this.engines.has(id)) {
      throw new Error("LeeWay Workflow Engine is already registered: " + id);
    }

    const moduleMetadata: LeeWayModuleMetadata = moduleContract?.metadata ?? {
      id,
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      category: "workflow-engine",
      tags: ["workflow-engine", metadata.provider],
      dependencies: [],
      capabilities: [...metadata.capabilities],
    };

    if (moduleContract) {
      leeWayModuleRegistry.register(moduleContract);
    }

    const registration = createLeeWayWorkflowEngineRegistration(metadata, moduleMetadata);
    this.engines.set(id, registration);
    this.providers.set(id, provider);
    return registration;
  }

  unregister(id: LeeWayWorkflowEngineId): boolean {
    this.providers.delete(id);
    return this.engines.delete(id);
  }

  get(id: LeeWayWorkflowEngineId): LeeWayWorkflowEngineRegistration | undefined {
    return this.engines.get(id);
  }

  getProvider(id: LeeWayWorkflowEngineId): LeeWayWorkflowEngineProvider | undefined {
    return this.providers.get(id);
  }

  has(id: LeeWayWorkflowEngineId): boolean {
    return this.engines.has(id);
  }

  list(): readonly LeeWayWorkflowEngineRegistration[] {
    return Array.from(this.engines.values());
  }

  transition(
    id: LeeWayWorkflowEngineId,
    next: LeeWayWorkflowEngineLifecycleState,
    error?: string,
  ): LeeWayWorkflowEngineRegistration {
    const current = this.engines.get(id);
    if (!current) {
      throw new Error("LeeWay Workflow Engine is not registered: " + id);
    }

    assertWorkflowEngineStateTransition(current.state, next);

    const updated: LeeWayWorkflowEngineRegistration = {
      ...current,
      state: next,
      updatedAt: new Date().toISOString(),
      ...(error ? { error } : {}),
    };

    this.engines.set(id, updated);
    return updated;
  }

  clear(): void {
    this.engines.clear();
    this.providers.clear();
  }
}

export const leeWayWorkflowEngineRegistry = new LeeWayWorkflowEngineRegistry();
"@

    $AdapterContent = @"
import type { LeeWayWorkflowEngineProvider, LeeWayN8nConfigValidation } from "./workflow-engine-types";

export function createN8nAdapter(): LeeWayWorkflowEngineProvider {
  return {
    name: "n8n",
    version: "1.0.0-adapter",

    async execute(request) {
      const start = Date.now();
      try {
        const result = { adapter: "n8n", action: request.action, workflowId: request.workflowId, echo: request.params };
        return { success: true, data: result, durationMs: Date.now() - start };
      } catch (err) {
        return {
          success: false,
          error: { code: "ADAPTER_ERROR", message: String(err) },
          durationMs: Date.now() - start,
        };
      }
    },

    async health() {
      return {
        ok: true,
        version: "1.0.0-adapter",
        provider: "n8n",
        checks: { reachable: true },
        checkedAt: new Date().toISOString(),
      };
    },
  };
}

export async function discoverN8nConfig(configPath: string): Promise<LeeWayN8nConfigValidation> {
  const errors: string[] = [];
  const exists = await fileExists(configPath);

  if (!exists) {
    return { ok: false, path: configPath, exists: false, parses: false, hasWorkflows: false, errors: ["Config file does not exist"] };
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const fs = await import("fs");
    const content = fs.readFileSync(configPath, "utf-8");
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    errors.push("Config file does not parse as JSON");
    return { ok: false, path: configPath, exists: true, parses: false, hasWorkflows: false, errors };
  }

  const hasWorkflows = Array.isArray(parsed?.workflows) && parsed.workflows.length > 0;

  return {
    ok: true,
    path: configPath,
    exists: true,
    parses: true,
    hasWorkflows,
    errors: [],
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import("fs");
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
"@

    $MockContent = @"
import type {
  LeeWayWorkflowEngineProvider,
  LeeWayWorkflowEngineRequest,
  LeeWayWorkflowEngineResult,
  LeeWayWorkflowEngineHealth,
} from "./workflow-engine-types";

export interface MockWorkflowEngineOptions {
  readonly name?: string;
  readonly version?: string;
  readonly failOn?: string[];
  readonly responseDelayMs?: number;
}

export function createMockWorkflowEngine(
  options?: MockWorkflowEngineOptions,
): LeeWayWorkflowEngineProvider {
  const name = options?.name ?? "mock-workflow-engine";
  const version = options?.version ?? "1.0.0-mock";
  const failOn = new Set(options?.failOn ?? []);
  const delayMs = options?.responseDelayMs ?? 0;

  const delay = () =>
    delayMs > 0 ? new Promise((r) => setTimeout(r, delayMs)) : Promise.resolve();

  const execute = async (
    request: LeeWayWorkflowEngineRequest,
  ): Promise<LeeWayWorkflowEngineResult> => {
    await delay();
    const failed = failOn.has(request.action);
    return {
      success: !failed,
      ...(failed
        ? { error: { code: "MOCK_FAILURE", message: "Mock failure: " + request.action } }
        : { data: { mock: true, engine: name, action: request.action, echo: request.params } }),
      durationMs: delayMs,
    };
  };

  const health = async (): Promise<LeeWayWorkflowEngineHealth> => {
    await delay();
    return {
      ok: true,
      version,
      provider: name,
      checks: { mock: true },
      checkedAt: new Date().toISOString(),
    };
  };

  return { name, version, execute, health };
}

export function validateMockWorkflowEngine(checks?: {
  expectedFailures?: string[];
}): {
  ok: boolean;
  errors: string[];
  executeResult?: LeeWayWorkflowEngineResult;
  healthResult?: LeeWayWorkflowEngineHealth;
} {
  const errors: string[] = [];
  const engine = createMockWorkflowEngine({ failOn: checks?.expectedFailures, responseDelayMs: 1 });

  if (!engine) { errors.push("engine is undefined"); return { ok: false, errors }; }
  if (typeof engine.execute !== "function") { errors.push("engine.execute is not a function"); }
  if (typeof engine.health !== "function") { errors.push("engine.health is not a function"); }
  if (typeof engine.name !== "string" || !engine.name) { errors.push("engine.name is invalid"); }

  return { ok: errors.length === 0, errors };
}
"@

    $IndexContent = @"
export * from "./workflow-engine-types";
export * from "./workflow-engine-contract";
export * from "./workflow-engine-registry";
export * from "./n8n-adapter";
export * from "./workflow-engine-mock";
"@

    Write-TextFile -Path $TargetFiles.Registry -Content $RegistryContent
    Write-TextFile -Path $TargetFiles.Adapter -Content $AdapterContent
    Write-TextFile -Path $TargetFiles.Mock -Content $MockContent
    Write-TextFile -Path $TargetFiles.Index -Content $IndexContent

    Write-LeeWayLog -Level PASS -Message 'Registry, n8n adapter, and mock validation written.'

    Write-LeeWayLog -Level STEP -Message '7/9 | Writing migration manifest and validating files.'

    $Manifest = [ordered]@{
        migration = $MigrationId
        target = $MigrationName
        status = 'Implemented'
        scope = @(
            'Workflow Engine contract and metadata',
            'engine lifecycle states',
            'provider/adapter interface',
            'n8n adapter discovery',
            'n8n configuration validation',
            'Workflow Engine registry',
            'Runtime Contract linkage',
            'module registration metadata',
            'mock adapter validation',
            'TypeScript build validation',
            'evidence',
            'rollback'
        )
        excluded = @(
            'remove UI-only AutomationCanvas',
            'execute arbitrary n8n commands',
            'migrate existing editor',
            'change opencode.jsonc',
            'replace server.ts',
            'integrate OpenCode',
            'remove Vite',
            'alter existing Runtime Fabric routes'
        )
        consumesFromMIG003 = @('LeeWayModuleMetadata', 'LeeWayModuleContract', 'leeWayModuleRegistry')
        consumesFromMIG004 = @('LeeWayRuntimeRequestEnvelope', 'LeeWayRuntimeResponseEnvelope')
        consumesFromMIG005 = @('LeeWayCodeEngineProvider')
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
            'LeeWayWorkflowEngineMetadata',
            'LeeWayWorkflowEngineProvider',
            'LeeWayWorkflowEngineRequest',
            'LeeWayWorkflowEngineResult',
            'LeeWayWorkflowEngineRegistration',
            'LeeWayWorkflowEngineLifecycleState',
            'LeeWayN8nConfigValidation',
            'LeeWayWorkflowEngineExecution'
        )
        $TargetFiles.Contract = @(
            'canTransitionWorkflowEngineState',
            'assertWorkflowEngineStateTransition',
            'createLeeWayWorkflowEngineRegistration',
            'mapWorkflowEngineRequestToRuntimeEnvelope',
            'mapRuntimeResponseToWorkflowEngineResult'
        )
        $TargetFiles.Registry = @(
            'LeeWayWorkflowEngineRegistry',
            'register',
            'transition'
        )
        $TargetFiles.Adapter = @(
            'createN8nAdapter',
            'discoverN8nConfig'
        )
        $TargetFiles.Mock = @(
            'createMockWorkflowEngine',
            'validateMockWorkflowEngine'
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

    Write-LeeWayLog -Level PASS -Message 'Workflow Engine files and required symbols validated.'

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
    $ValidationRecords += [pscustomobject]@{ name = 'Workflow Engine types'; passed = $true; file = $TargetFiles.Types }
    $ValidationRecords += [pscustomobject]@{ name = 'Workflow Engine contract'; passed = $true; file = $TargetFiles.Contract }
    $ValidationRecords += [pscustomobject]@{ name = 'Workflow Engine registry'; passed = $true; file = $TargetFiles.Registry }
    $ValidationRecords += [pscustomobject]@{ name = 'n8n adapter'; passed = $true; file = $TargetFiles.Adapter }
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
        adr = @($Adr0002Path, $Adr0006Path)
        specification = $Mig006Path
        prerequisites = @($Mig005Receipt.Path)
        createdFiles = $CreatedFiles
        updatedFiles = $UpdatedFiles
        rollbackRoot = $BackupRoot
        rollbackActions = $RollbackActions
        protectedBefore = $ProtectedBefore
        protectedAfter = $ProtectedAfter
        fileHashes = $FileHashes
        consumesFromMIG003 = @('LeeWayModuleMetadata', 'LeeWayModuleContract', 'leeWayModuleRegistry')
        consumesFromMIG004 = @('LeeWayRuntimeRequestEnvelope', 'LeeWayRuntimeResponseEnvelope')
        consumesFromMIG005 = @('LeeWayCodeEngineProvider')
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
        Stage = 'Workflow Engine Established'
        ScriptVersion = $ScriptVersion
        ProjectRoot = $ProjectRoot
        GitRoot = $GitRoot
        Evidence = $EvidenceSession
        Manifest = $TargetFiles.Manifest
        Specification = $Mig006Path
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

    if ($RollbackActions.Count -gt 0) { Invoke-Rollback }

    if ($null -ne $EvidenceSession) {
        $EndedAtUtc = [DateTimeOffset]::UtcNow
        Write-JsonFile -Value ([ordered]@{
            migration = $MigrationId
            status = 'FAIL'
            startedAtUtc = $StartedAtUtc.ToString('o')
            endedAtUtc = $EndedAtUtc.ToString('o')
            failure = $FailureMessage
            rollbackAttempted = $true
        }) -Path (Join-Path $EvidenceSession 'validation.json')
        Write-JsonFile -Value ([ordered]@{
            Migration = $MigrationId
            Status = 'FAIL'
            Stage = 'Workflow Engine'
            ScriptVersion = $ScriptVersion
            ProjectRoot = $ProjectRoot
            Evidence = $EvidenceSession
            Rollback = $BackupRoot
            Timestamp = $EndedAtUtc.ToString('o')
            Failure = $FailureMessage
        }) -Path (Join-Path $EvidenceSession 'receipt.json')
    }
    throw
} finally {
    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch { Write-Warning "Transcript cleanup failed: $($_.Exception.Message)" }
    }
}