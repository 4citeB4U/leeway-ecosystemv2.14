import { Tool } from "opencode";

export interface ProbeRuntimeHealthParams {
  endpoint?: string;
}

export interface ProbeRuntimeHealthResult {
  ok: boolean;
  endpoint: string;
  status?: number;
  response?: {
    ok: boolean;
    version: string;
    uptimeMs: number;
    checks: Record<string, boolean>;
    checkedAt: string;
  };
  error?: string;
}

export const probeRuntimeHealth: Tool<ProbeRuntimeHealthParams, ProbeRuntimeHealthResult> = {
  name: "probe-runtime-health",
  description: "Probe LeeWay Runtime Fabric health endpoint",
  parameters: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        description: "Runtime Fabric health endpoint (default: http://127.0.0.1:4001/health)",
      },
    },
  },
  async execute({ endpoint = "http://127.0.0.1:4001/health" }) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          ok: false,
          endpoint,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      const expectedFields = ["ok", "version", "uptimeMs", "checks", "checkedAt"];
      const missing = expectedFields.filter(f => !(f in data));
      
      if (missing.length > 0) {
        return {
          ok: false,
          endpoint,
          status: response.status,
          error: `Missing fields in health response: ${missing.join(", ")}`,
        };
      }

      return {
        ok: true,
        endpoint,
        status: response.status,
        response: data,
      };
    } catch (e) {
      return {
        ok: false,
        endpoint,
        error: String(e),
      };
    }
  },
};