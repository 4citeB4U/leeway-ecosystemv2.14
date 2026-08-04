export type IdentityConfirmationSummary = {
  ok: boolean;
  mode: string;
  noExecution: boolean;
  noDeviceControl?: boolean;
  noOnboarding: boolean;
  clearSkies: boolean;
  writeScope?: string;
  totals: { candidates: number; network: number; bluetooth: number; printers: number; reviewed?: number };
  candidates: any[];
  families: { network: any[]; bluetooth: any[]; printers: any[] };
  policy: any;
  safety: Record<string, boolean>;
  reviewState?: any;
  plan?: any;
  contract?: any;
  phase40?: any;
};

export type HumanIdentityReviewInput = {
  identity_candidate_id: string;
  confirmed_asset_name: string;
  asset_type: string;
  location_or_room: string;
  owner_or_responsible_person?: string;
  trust_level: string;
  disposition: string;
  notes?: string;
  reviewed_by?: string;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch("/api/identity-confirmation/" + path, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Identity confirmation read failed: " + response.status);
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch("/api/identity-confirmation/" + path, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = Array.isArray(data?.errors) ? data.errors.join("; ") : data?.error || "Review-state save failed";
    throw new Error(message);
  }
  return data as T;
}

export async function fetchIdentityConfirmationSummary(): Promise<IdentityConfirmationSummary> {
  return getJson<IdentityConfirmationSummary>("summary");
}

export async function fetchIdentityCandidates(): Promise<{ ok: boolean; candidates: any[] }> {
  return getJson<{ ok: boolean; candidates: any[] }>("candidates");
}

export async function fetchNetworkIdentityCandidates(): Promise<{ ok: boolean; candidates: any[] }> {
  return getJson<{ ok: boolean; candidates: any[] }>("candidates/network");
}

export async function fetchBluetoothIdentityCandidates(): Promise<{ ok: boolean; candidates: any[] }> {
  return getJson<{ ok: boolean; candidates: any[] }>("candidates/bluetooth");
}

export async function fetchPrinterIdentityCandidates(): Promise<{ ok: boolean; candidates: any[] }> {
  return getJson<{ ok: boolean; candidates: any[] }>("candidates/printers");
}

export async function fetchIdentityPolicy(): Promise<{ ok: boolean; policy: any }> {
  return getJson<{ ok: boolean; policy: any }>("policy");
}

export async function fetchHumanIdentityReviewState(): Promise<{ ok: boolean; reviewState: any }> {
  return getJson<{ ok: boolean; reviewState: any }>("review-state");
}

export async function saveHumanIdentityReviewState(payload: HumanIdentityReviewInput): Promise<{ ok: boolean; saved: boolean; record: any; totals: { reviewed: number } }> {
  return postJson<{ ok: boolean; saved: boolean; record: any; totals: { reviewed: number } }>("review-state/save", payload);
}