export type DeviceLayerLink = {
  title: string;
  href: string;
  apiBase: string;
  purpose: string;
  actionAuthority: boolean;
};

export type DeviceLayerLinksResponse = {
  ok: boolean;
  locked?: boolean;
  authority?: string;
  page?: string;
  apiBase?: string;
  linkCount?: number;
  links?: DeviceLayerLink[];
  safety?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  proofChain?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<DeviceLayerLinksResponse> {
  const res = await fetch('/api/device-layer-links/' + path, { cache: 'no-store' });
  return res.json();
}

export const deviceLayerLinksClient = {
  summary: () => getJson('summary'),
  links: () => getJson('links'),
  safety: () => getJson('safety'),
  proofChain: () => getJson('proof-chain')
};