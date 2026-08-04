import type { LeeWayRuntimeRequestEnvelope, LeeWayRuntimeResponseEnvelope } from "../runtime/runtime-types";
import type {
  LeeWayCodeEngineLifecycleState,
  LeeWayCodeEngineMetadata,
  LeeWayCodeEngineProvider,
  LeeWayCodeEngineRegistration,
} from "./code-engine-types";

const engineTransitionMap: Readonly<
  Record<LeeWayCodeEngineLifecycleState, readonly LeeWayCodeEngineLifecycleState[]>
> = {
  registered: ["discovering", "failed", "disposed"],
  discovering: ["ready", "failed", "disposed"],
  ready: ["executing", "suspended", "failed", "disposed"],
  executing: ["ready", "suspended", "failed", "disposed"],
  suspended: ["ready", "failed", "disposed"],
  failed: ["discovering", "disposed"],
  disposed: [],
};

export function canTransitionEngineState(
  current: LeeWayCodeEngineLifecycleState,
  next: LeeWayCodeEngineLifecycleState,
): boolean {
  return engineTransitionMap[current].includes(next);
}

export function assertEngineStateTransition(
  current: LeeWayCodeEngineLifecycleState,
  next: LeeWayCodeEngineLifecycleState,
): void {
  if (!canTransitionEngineState(current, next)) {
    throw new Error(
      "Invalid LeeWay Code Engine lifecycle transition: " + current + " -> " + next,
    );
  }
}

export function createLeeWayCodeEngineRegistration(
  metadata: LeeWayCodeEngineMetadata,
  moduleMetadata: LeeWayCodeEngineRegistration["moduleMetadata"],
): LeeWayCodeEngineRegistration {
  const now = new Date().toISOString();
  return {
    metadata,
    moduleMetadata,
    state: "registered",
    registeredAt: now,
    updatedAt: now,
  };
}

export function mapEngineRequestToRuntimeEnvelope(
  request: LeeWayCodeEngineRequest,
  engineId: string,
): LeeWayRuntimeRequestEnvelope {
  return {
    apiVersion: "1.0.0",
    requestId: crypto.randomUUID(),
    capabilityId: engineId,
    method: "execute",
    params: { action: request.action, ...(request.params as Record<string, unknown>) },
    timeout: request.timeout,
  };
}

import type { LeeWayCodeEngineRequest } from "./code-engine-types";