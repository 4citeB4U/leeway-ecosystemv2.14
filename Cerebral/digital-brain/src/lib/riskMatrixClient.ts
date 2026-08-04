export type RiskMatrixResponse = {
  ok: boolean;
  locked?: boolean;
  authority?: string;
  page?: string;
  apiBase?: string;
  actionFamilies?: number;
  draftedActionFamilies?: number;
  criticalFamilies?: number;
  safety?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  families?: Array<Record<string, unknown>>;
  draft?: Record<string, unknown>;
  proofChain?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<RiskMatrixResponse> {
  const res = await fetch('/api/risk-matrix/' + path, { cache: 'no-store' });
  return res.json();
}

export const riskMatrixClient = {
  summary: () => getJson('summary'),
  families: () => getJson('families'),
  draft: () => getJson('draft'),
  safety: () => getJson('safety'),
  proofChain: () => getJson('proof-chain')
};