export const ECOSYSTEM_AUTHORITY_URL =
  process.env.LEEWAY_ECOSYSTEM_AUTHORITY_URL ||
  "https://raw.githubusercontent.com/4citeB4U/LeeWay-Standards/main/standards/leeway-ecosystem-authority.v1.json";

export type LeeWayAuthority = {
  id: string;
  name: string;
  repo: string;
  role: string;
  authorityClass: string;
  visibility: "public" | "private";
  approvedCommit?: string | null;
  pages?: string | null;
  capabilities?: string[];
  dependencies?: string[];
  executionEligible?: boolean;
};

export type LeeWayEcosystemRegistry = {
  schemaVersion: string;
  registryId: "LEEWAY_ECOSYSTEM_AUTHORITY_V1";
  executionLaw: {
    sourceControl: string;
    runtimeAuthority: string;
    deviceExecutionAuthority: string;
    dockerRole: string;
    recoveryRole: string;
    pagesRole: string;
    serverRole: string;
  };
  requiredCoreIds: string[];
  authorities: LeeWayAuthority[];
  truthLaws: string[];
  openSourceLineage?: {
    authorityRepo: string;
    registryPath: string;
    publicPath: string;
  };
};

export type AuthorityLoadResult = {
  ok: boolean;
  status: number;
  source: string;
  registry: LeeWayEcosystemRegistry | null;
  error?: string;
};

export async function loadEcosystemAuthority(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 5000
): Promise<AuthorityLoadResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetchImpl(ECOSYSTEM_AUTHORITY_URL, {
      cache: "no-store",
      signal: ctrl.signal
    });
    if (!response.ok) {
      return { ok: false, status: response.status, source: ECOSYSTEM_AUTHORITY_URL, registry: null, error: `HTTP_${response.status}` };
    }
    const registry = (await response.json()) as LeeWayEcosystemRegistry;
    if (registry?.registryId !== "LEEWAY_ECOSYSTEM_AUTHORITY_V1") {
      return { ok: false, status: 502, source: ECOSYSTEM_AUTHORITY_URL, registry: null, error: "REGISTRY_ID_INVALID" };
    }
    const ids = new Set(registry.authorities.map((x) => x.id));
    for (const id of registry.requiredCoreIds || []) {
      if (!ids.has(id)) {
        return { ok: false, status: 502, source: ECOSYSTEM_AUTHORITY_URL, registry: null, error: `REQUIRED_AUTHORITY_MISSING:${id}` };
      }
    }
    return { ok: true, status: 200, source: ECOSYSTEM_AUTHORITY_URL, registry };
  } catch (error) {
    return { ok: false, status: 0, source: ECOSYSTEM_AUTHORITY_URL, registry: null, error: String((error as Error)?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

export function authorityById(registry: LeeWayEcosystemRegistry | null, id: string) {
  return registry?.authorities.find((x) => x.id === id) || null;
}

export function publicApplicationAuthorities(registry: LeeWayEcosystemRegistry | null) {
  return (registry?.authorities || []).filter(
    (x) => x.authorityClass !== "EVIDENCE_ONLY" && ["APPLICATION", "PRIMARY_UI", "PROJECTION", "CORE_PROJECTION"].includes(x.authorityClass)
  );
}

export function runtimeBindingFor(id: string) {
  const envById: Record<string, string> = {
    "runtime-fabric": "LEEWAY_RUNTIME_FABRIC_BASE",
    "device-bridge": "LEEWAY_DEVICE_BRIDGE_BASE",
    formula: "LEEWAY_FORMULA_BASE"
  };
  const env = envById[id];
  if (!env) return { env: null, endpoint: null, configured: false };
  const endpoint = String(process.env[env] || "").trim();
  return { env, endpoint: endpoint || null, configured: Boolean(endpoint) };
}
