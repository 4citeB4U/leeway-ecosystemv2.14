export interface RuntimeEndpointProbe {
  id: string;
  endpoint: string;
  ok: boolean;
  status: number;
  details?: string;
}

export function extractArrayPayload<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray((input as any)?.items)) return (input as any).items as T[];
  if (Array.isArray((input as any)?.results)) return (input as any).results as T[];
  return [];
}

export function loadRuntimeConnectionSnapshot() {
  return {
    endpoints: [] as RuntimeEndpointProbe[],
    checkedAt: new Date().toISOString(),
  };
}

export async function probeById(id: string): Promise<RuntimeEndpointProbe> {
  return {
    id,
    endpoint: `/api/leeway/runtime-fabric/${id}`,
    ok: false,
    status: 503,
    details: "Runtime Fabric probe unavailable in this environment.",
  };
}
