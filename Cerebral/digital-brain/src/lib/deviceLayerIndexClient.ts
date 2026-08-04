export type DeviceLayerIndexResponse = {
  ok: boolean;
  route?: string;
  locked?: boolean;
  authority?: string;
  page?: string;
  apiBase?: string;
  safety?: Record<string, unknown>;
  completedLanes?: unknown[];
  pages?: unknown[];
  summary?: Record<string, unknown>;
  proofChainStatus?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<DeviceLayerIndexResponse> {
  const res = await fetch('/api/device-layer-index/' + path, { cache: 'no-store' });
  return res.json();
}

export const deviceLayerIndexClient = {
  summary: () => getJson('summary'),
  pages: () => getJson('pages'),
  safety: () => getJson('safety'),
  proofChain: () => getJson('proof-chain')
};