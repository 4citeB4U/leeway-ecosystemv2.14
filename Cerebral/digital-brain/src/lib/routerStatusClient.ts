export type RouterStatusResponse = {
  ok: boolean;
  route?: string;
  locked?: boolean;
  targetAsset?: string;
  alternateAsset?: string;
  authority?: string;
  safety?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  readiness?: unknown[];
  hardBlocks?: unknown[];
  passiveNetwork?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<RouterStatusResponse> {
  const res = await fetch('/api/router-status/' + path, { cache: 'no-store' });
  return res.json();
}

export const routerStatusClient = {
  summary: () => getJson('summary'),
  readiness: () => getJson('readiness'),
  passiveNetwork: () => getJson('passive-network'),
  safety: () => getJson('safety')
};