import type { LeeWayCodeEngineProvider, LeeWayOpenCodeConfigValidation } from "./code-engine-types";

export function createOpenCodeAdapter(): LeeWayCodeEngineProvider {
  return {
    name: "opencode",
    version: "1.0.0-adapter",

    async execute(request) {
      const start = Date.now();
      try {
        const result = { adapter: "opencode", action: request.action, echo: request.params };
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
        provider: "opencode",
        checks: { reachable: true },
        checkedAt: new Date().toISOString(),
      };
    },
  };
}

export function discoverOpenCodeConfig(
  configPath: string,
): LeeWayOpenCodeConfigValidation {
  const errors: string[] = [];
  const exists = awaitFileExists(configPath);

  if (!exists) {
    return { ok: false, path: configPath, exists: false, parses: false, hasSkillsPaths: false, errors: ["Config file does not exist"] };
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    const fs = await import("fs");
    const content = fs.readFileSync(configPath, "utf-8");
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    errors.push("Config file does not parse as JSON");
    return { ok: false, path: configPath, exists: true, parses: false, hasSkillsPaths: false, errors };
  }

  const hasSkillsPaths = hasNestedProperty(parsed, ["skills", "paths"]);
  const schema = typeof parsed["$schema"] === "string" ? parsed["$schema"] : undefined;

  return {
    ok: true,
    path: configPath,
    exists: true,
    parses: true,
    hasSkillsPaths,
    ...(schema ? { schema } : {}),
    errors: [],
  };
}

async function awaitFileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import("fs");
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function hasNestedProperty(
  obj: Record<string, unknown>,
  keys: string[],
): boolean {
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return true;
}