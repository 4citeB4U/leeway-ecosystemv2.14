/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: RUNTIME
 * TAG: RUNTIME.CONNECTION.TRUTH_CLIENT
 * PURPOSE: Real Runtime Fabric connection snapshot and probe service for the Omni-Terminal truth client.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Same-origin Runtime Fabric connection service
 * WHY = The IDE must never fabricate runtime readiness; every claim comes from the governed BFF proxy
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/services/runtimeConnectionService.ts
 * WHEN = 2026-08-02 (MIG-008D candidate compatibility correction)
 * HOW = Probes /api/leeway/runtime-fabric/* through the same-origin Next.js BFF proxy with timeouts and honest failure states
 *
 * CHAIN: Standards -> Runtime Truth -> Connection Snapshot -> Omni-Terminal -> Receipts
 * LICENSE: PROPRIETARY
 */

const RUNTIME_PROXY_BASE = "/api/leeway/runtime-fabric";

const PROBE_TIMEOUT_MS = 4000;

export type RuntimeEndpointSource = "bff-runtime-fabric-proxy";

export interface RuntimeEndpoint {
  id: string;
  label: string;
  path: string;
  source: RuntimeEndpointSource;
}

export interface RuntimeProbeDetails {
  statusText: string;
  contentType: string | null;
  resolvedUrl: string;
  malformed: boolean;
  bytes: number;
}

export interface RuntimeProbeResult {
  id: string;
  endpoint: string;
  path: string;
  statusCode: number;
  ok: boolean;
  status: number;
  payload: unknown;
  error: string | null;
  checkedAt: string;
  latencyMs: number;
  source: string;
  details?: RuntimeProbeDetails | string;
}

export interface RuntimeConfigurationState {
  runtimeFabricUrl: string;
  localDeviceBridgeUrl: string | null;
  runtimeProxyBase: string;
  probeTimeoutMs: number;
}

export interface RuntimeConnectionSnapshot {
  endpoints: RuntimeEndpoint[];
  checkedAt: string;
  runtimeReachable: boolean;
  config: RuntimeConfigurationState;
  probes: RuntimeProbeResult[];
  details: string;
  localDeviceBridgeStatus: string;
}

export type RuntimeEndpointProbe = RuntimeProbeResult;

export const RUNTIME_CONNECTION_ENDPOINTS: RuntimeEndpoint[] = [
  { id: "health", label: "Runtime Fabric Health", path: "/health", source: "bff-runtime-fabric-proxy" },
  { id: "runtimeStatus", label: "Runtime Status", path: "/runtime/status", source: "bff-runtime-fabric-proxy" },
  { id: "terminalStatus", label: "Terminal Fabric Status", path: "/terminal/status", source: "bff-runtime-fabric-proxy" },
  { id: "terminalSessions", label: "Terminal Sessions", path: "/terminal/sessions", source: "bff-runtime-fabric-proxy" },
  { id: "devices", label: "Device Registry", path: "/devices", source: "bff-runtime-fabric-proxy" },
  { id: "deviceTags", label: "Device Tags", path: "/device-tags", source: "bff-runtime-fabric-proxy" },
  { id: "protocols", label: "Protocol Adapters", path: "/protocols", source: "bff-runtime-fabric-proxy" },
  { id: "commandReceipts", label: "Command Receipts", path: "/receipts/commands", source: "bff-runtime-fabric-proxy" },
  { id: "localWorkerStatus", label: "Local Worker Status", path: "/local-worker/status", source: "bff-runtime-fabric-proxy" },
];

export function extractArrayPayload<T>(input: unknown, path?: string): T[] {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (path && Array.isArray(record[path])) return record[path] as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.results)) return record.results as T[];
    if (Array.isArray(record.entries)) return record.entries as T[];
  }
  return [];
}

export function createDefaultRuntimeConfig(): RuntimeConfigurationState {
  const runtimeFabricUrl =
    typeof window !== "undefined"
      ? (window as any).__LEEWAY_RUNTIME_FABRIC_URL__ || "http://127.0.0.1:4001"
      : process.env.LEEWAY_RUNTIME_FABRIC_URL || "http://127.0.0.1:4001";

  return {
    runtimeFabricUrl,
    localDeviceBridgeUrl:
      typeof window !== "undefined"
        ? null
        : process.env.LOCAL_DEVICE_BRIDGE_URL || null,
    runtimeProxyBase: RUNTIME_PROXY_BASE,
    probeTimeoutMs: PROBE_TIMEOUT_MS,
  };
}

export async function probeRuntimeEndpoint(
  endpoint: RuntimeEndpoint,
  config: RuntimeConfigurationState
): Promise<RuntimeProbeResult> {
  const startedAt = Date.now();
  const url = `${config.runtimeProxyBase}${endpoint.path}`;
  const base: Omit<RuntimeProbeResult, "checkedAt" | "latencyMs"> = {
    id: endpoint.id,
    endpoint: url,
    path: endpoint.path,
    statusCode: 0,
    ok: false,
    status: 0,
    payload: null,
    error: null,
    source: endpoint.source,
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(config.probeTimeoutMs),
      cache: "no-store",
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type");
    const latencyMs = Date.now() - startedAt;

    let payload: unknown = null;
    let malformed = false;
    if (text.trim().length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        malformed = true;
        payload = { raw: text.slice(0, 4096) };
      }
    }

    return {
      ...base,
      ok: response.ok && !malformed,
      status: response.status,
      statusCode: response.status,
      payload,
      error: !response.ok
        ? `HTTP ${response.status} ${response.statusText}`
        : malformed
          ? "MALFORMED_RESPONSE"
          : null,
      checkedAt: new Date(startedAt).toISOString(),
      latencyMs,
      details: {
        statusText: response.statusText,
        contentType,
        resolvedUrl: url,
        malformed,
        bytes: text.length,
      },
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startedAt;
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      ...base,
      status: 0,
      error: isTimeout ? "TIMEOUT" : error?.message || String(error),
      checkedAt: new Date(startedAt).toISOString(),
      latencyMs,
      details: {
        statusText: isTimeout ? "timeout" : "error",
        contentType: null,
        resolvedUrl: url,
        malformed: false,
        bytes: 0,
      },
    };
  }
}

export async function loadRuntimeConnectionSnapshot(): Promise<RuntimeConnectionSnapshot> {
  const config = createDefaultRuntimeConfig();
  const checkedAt = new Date().toISOString();
  const probes = await Promise.all(
    RUNTIME_CONNECTION_ENDPOINTS.map((endpoint) => probeRuntimeEndpoint(endpoint, config))
  );

  const healthProbe = probes.find((probe) => probe.id === "health");
  const okProbes = probes.filter((probe) => probe.ok);
  const runtimeReachable = Boolean(healthProbe?.ok) || okProbes.length > 0;

  const devicesProbe = probes.find((probe) => probe.id === "devices");
  const localDeviceBridgeStatus = devicesProbe?.ok
    ? "OMNI_TERMINAL_BOUND"
    : devicesProbe && !devicesProbe.ok
      ? "LOCAL_DEVICE_BRIDGE_REQUIRED"
      : "LOCAL_DEVICE_BRIDGE_REQUIRED";

  const details = runtimeReachable
    ? okProbes.length === probes.length
      ? `Runtime Fabric reachable through the governed BFF. All ${probes.length} probes returned truth.`
      : `Runtime Fabric reachable through the governed BFF, but ${probes.length - okProbes.length} of ${probes.length} probes failed.`
    : "Runtime Fabric is not reachable through the governed BFF. No probe returned a healthy response.";

  return {
    endpoints: RUNTIME_CONNECTION_ENDPOINTS,
    checkedAt,
    runtimeReachable,
    config,
    probes,
    details,
    localDeviceBridgeStatus,
  };
}

export function probeById(
  connection: RuntimeConnectionSnapshot,
  probeId: string
): RuntimeProbeResult | undefined {
  if (!connection || !Array.isArray(connection.probes)) return undefined;
  return connection.probes.find((probe) => probe.id === probeId);
}
