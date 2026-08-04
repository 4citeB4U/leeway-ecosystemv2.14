export type DeviceLayerMasterStatusResponse = {
  ok: boolean;
  route?: string;
  locked?: boolean;
  authority?: string;
  page?: string;
  apiBase?: string;
  safety?: Record<string, unknown>;
  indexedLanes?: unknown[];
  lanes?: unknown[];
  summary?: Record<string, unknown>;
  proofChainStatus?: Record<string, unknown>;
  nextSafeOptions?: unknown[];
  error?: string;
};

async function getJson(path: string): Promise<DeviceLayerMasterStatusResponse> {
  const res = await fetch('/api/device-layer-master-status/' + path, { cache: 'no-store' });
  return res.json();
}

export const deviceLayerMasterStatusClient = {
  summary: () => getJson('summary'),
  lanes: () => getJson('lanes'),
  safety: () => getJson('safety'),
  proofChain: () => getJson('proof-chain'),
  next: () => getJson('next')
};