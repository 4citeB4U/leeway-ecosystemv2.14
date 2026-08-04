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