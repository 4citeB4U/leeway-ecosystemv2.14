import type { LeeWayModuleMetadata } from "../modules/module-types";

export type LeeWayCodeEngineId = string;

export type LeeWayCodeEngineLifecycleState =
  | "registered"
  | "discovering"
  | "ready"
  | "executing"
  | "suspended"
  | "failed"
  | "disposed";

export interface LeeWayCodeEngineMetadata {
  readonly id: LeeWayCodeEngineId;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly provider: string;
  readonly capabilities: readonly string[];
}

export interface LeeWayCodeEngineProvider {
  readonly name: string;
  readonly version: string;

  execute(request: LeeWayCodeEngineRequest): Promise<LeeWayCodeEngineResult>;
  health(): Promise<LeeWayCodeEngineHealth>;
}

export interface LeeWayCodeEngineRequest {
  readonly action: string;
  readonly params?: Record<string, unknown>;
  readonly timeout?: number;
}

export interface LeeWayCodeEngineResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: LeeWayCodeEngineError;
  readonly durationMs: number;
}

export interface LeeWayCodeEngineError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface LeeWayCodeEngineHealth {
  readonly ok: boolean;
  readonly version: string;
  readonly provider: string;
  readonly checks: Record<string, boolean>;
  readonly checkedAt: string;
}

export interface LeeWayCodeEngineRegistration {
  readonly metadata: LeeWayCodeEngineMetadata;
  readonly moduleMetadata: LeeWayModuleMetadata;
  readonly state: LeeWayCodeEngineLifecycleState;
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly error?: string;
}

export interface LeeWayOpenCodeConfigValidation {
  readonly ok: boolean;
  readonly path: string;
  readonly exists: boolean;
  readonly parses: boolean;
  readonly hasSkillsPaths: boolean;
  readonly schema?: string;
  readonly errors: readonly string[];
}