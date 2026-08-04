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