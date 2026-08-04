export type PrinterIppLockedStubResponse = {
  ok: boolean;
  route?: string;
  safety?: Record<string, unknown>;
  source?: unknown;
  endpoints?: Record<string, unknown>;
  error?: string;
};

async function getJson(path: string): Promise<PrinterIppLockedStubResponse> {
  const res = await fetch('/api/printer-ipp-locked-stub/' + path, { cache: 'no-store' });
  return res.json();
}

export const printerIppLockedStubClient = {
  summary: () => getJson('summary'),
  health: () => getJson('health'),
  policy: () => getJson('policy'),
  capabilities: () => getJson('capabilities'),
  targetPrinter: () => getJson('target-printer'),
  safety: () => getJson('safety')
};