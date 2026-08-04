import type {
  LeeWayCodeEngineProvider,
  LeeWayCodeEngineRequest,
  LeeWayCodeEngineResult,
  LeeWayCodeEngineHealth,
} from "./code-engine-types";

export interface MockCodeEngineOptions {
  readonly name?: string;
  readonly version?: string;
  readonly failOn?: string[];
  readonly responseDelayMs?: number;
}

export function createMockCodeEngine(
  options?: MockCodeEngineOptions,
): LeeWayCodeEngineProvider {
  const name = options?.name ?? "mock-code-engine";
  const version = options?.version ?? "1.0.0-mock";
  const failOn = new Set(options?.failOn ?? []);
  const delayMs = options?.responseDelayMs ?? 0;

  const delay = () =>
    delayMs > 0 ? new Promise((r) => setTimeout(r, delayMs)) : Promise.resolve();

  const execute = async (
    request: LeeWayCodeEngineRequest,
  ): Promise<LeeWayCodeEngineResult> => {
    await delay();
    const failed = failOn.has(request.action);
    return {
      success: !failed,
      ...(failed
        ? { error: { code: "MOCK_FAILURE", message: "Mock failure: " + request.action } }
        : { data: { mock: true, engine: name, action: request.action, echo: request.params } }),
      durationMs: delayMs,
    };
  };

  const health = async (): Promise<LeeWayCodeEngineHealth> => {
    await delay();
    return {
      ok: true,
      version,
      provider: name,
      checks: { mock: true },
      checkedAt: new Date().toISOString(),
    };
  };

  return { name, version, execute, health };
}

export function validateMockCodeEngine(checks?: {
  expectedFailures?: string[];
}): {
  ok: boolean;
  errors: string[];
  executeResult?: LeeWayCodeEngineResult;
  healthResult?: LeeWayCodeEngineHealth;
} {
  const errors: string[] = [];
  const engine = createMockCodeEngine({ failOn: checks?.expectedFailures, responseDelayMs: 1 });

  if (!engine) { errors.push("engine is undefined"); return { ok: false, errors }; }
  if (typeof engine.execute !== "function") { errors.push("engine.execute is not a function"); }
  if (typeof engine.health !== "function") { errors.push("engine.health is not a function"); }
  if (typeof engine.name !== "string" || !engine.name) { errors.push("engine.name is invalid"); }

  return { ok: errors.length === 0, errors };
}