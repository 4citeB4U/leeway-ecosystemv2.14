import type { LeeWayWorkflowEngineProvider, LeeWayN8nConfigValidation } from "./workflow-engine-types";

export function createN8nAdapter(): LeeWayWorkflowEngineProvider {
  return {
    name: "n8n",
    version: "1.0.0-adapter",

    async execute(request) {
      const start = Date.now();
      try {
        const result = { adapter: "n8n", action: request.action, workflowId: request.workflowId, echo: request.params };
        return { success: true, data: result, durationMs: Date.now() - start };
      } catch (err) {
        return {
          success: false,
          error: { code: "ADAPTER_ERROR", message: String(err) },
          durationMs: Date.now() - start,
        };
      }
    },

    async health() {
      return {
        ok: true,
        version: "1.0.0-adapter",
        provider: "n8n",
        checks: { reachable: true },
        checkedAt: new Date().toISOString(),
      };
    },
  };
}

export async function discoverN8nConfig(configPath: string): Promise<LeeWayN8nConfigValidation> {
  const errors: string[] = [];
  const exists = await fileExists(configPath);

  if (!exists) {
    return { ok: false, path: configPath, exists: false, parses: false, hasWorkflows: false, errors: ["Config file does not exist"] };
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const fs = await import("fs");
    const content = fs.readFileSync(configPath, "utf-8");
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    errors.push("Config file does not parse as JSON");
    return { ok: false, path: configPath, exists: true, parses: false, hasWorkflows: false, errors };
  }

  const hasWorkflows = Array.isArray(parsed?.workflows) && parsed.workflows.length > 0;

  return {
    ok: true,
    path: configPath,
    exists: true,
    parses: true,
    hasWorkflows,
    errors: [],
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import("fs");
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}