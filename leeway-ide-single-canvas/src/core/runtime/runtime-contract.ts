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