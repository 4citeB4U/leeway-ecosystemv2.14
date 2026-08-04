export type PhoneSatelliteResponse = {
  ok: boolean;
  route?: string;
  locked?: boolean;
  targetAsset?: string;
  authority?: string;
  safety?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  readiness?: unknown[];
  hardBlocks?: unknown[];
  passiveProbeSummary?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<PhoneSatelliteResponse> {
  const res = await fetch('/api/phone-satellite/' + path, { cache: 'no-store' });
  return res.json();
}

export const phoneSatelliteClient = {
  summary: () => getJson('summary'),
  readiness: () => getJson('readiness'),
  safety: () => getJson('safety'),
  probes: () => getJson('probes')
};