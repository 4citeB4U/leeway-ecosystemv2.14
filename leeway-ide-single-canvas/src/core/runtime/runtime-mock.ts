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