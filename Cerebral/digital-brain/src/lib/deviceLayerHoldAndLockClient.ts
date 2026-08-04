export type DeviceLayerHoldAndLockResponse = {
  ok: boolean;
  route?: string;
  locked?: boolean;
  authority?: string;
  page?: string;
  apiBase?: string;
  safety?: Record<string, unknown>;
  heldLanes?: unknown[];
  hardStopRules?: string[];
  allowedWhileHeld?: string[];
  forbiddenWhileHeld?: string[];
  summary?: Record<string, unknown>;
  proofChainStatus?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<DeviceLayerHoldAndLockResponse> {
  const res = await fetch('/api/device-layer-hold-and-lock/' + path, { cache: 'no-store' });
  return res.json();
}

export const deviceLayerHoldAndLockClient = {
  summary: () => getJson('summary'),
  lanes: () => getJson('lanes'),
  rules: () => getJson('rules'),
  proofChain: () => getJson('proof-chain')
};