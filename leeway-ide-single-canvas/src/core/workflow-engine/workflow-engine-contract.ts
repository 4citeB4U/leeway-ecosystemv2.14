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