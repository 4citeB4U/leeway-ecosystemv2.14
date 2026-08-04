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