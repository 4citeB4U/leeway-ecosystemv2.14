import { NextRequest } from "next/server";
import { kernelBinding, kernelFetch } from "@/src/lib/kernel-client";
import {
  ECOSYSTEM_AUTHORITY_URL,
  authorityById,
  loadEcosystemAuthority,
  publicApplicationAuthorities,
  runtimeBindingFor,
  type LeeWayAuthority
} from "@/src/lib/ecosystem-authority";
import { makeEnvelope, correlationFrom } from "@/src/lib/bff-envelope";

export const dynamic = "force-dynamic";

const VERSION = {
  app: "leeway-os-nextjs",
  version: "0.1.0-mig008b-github-authority",
  stack: "next.js-app-router + react + typescript",
  frontendAuthority: "CANONICAL_FACE_OF_LEEWAY_OPERATING_SYSTEM",
  ecosystemAuthority: ECOSYSTEM_AUTHORITY_URL,
  migrationLaw: "PRESERVE_EXACT_FRONTEND_AND_ADAPT_RUNTIME_BEHIND_IT"
};

const WORKS = [
  { id: "first-workspace", name: "First Workspace", status: "DEFINED_NOT_CONNECTED" },
  { id: "workspace-2", name: "Workspace 2", status: "DEFINED_NOT_CONNECTED" },
  { id: "workspace-3", name: "Workspace 3", status: "DEFINED_NOT_CONNECTED" }
];

function authorityView(a: LeeWayAuthority | null) {
  if (!a) return null;
  const binding = runtimeBindingFor(a.id);
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    authorityClass: a.authorityClass,
    repository: `https://github.com/${a.repo}`,
    approvedCommit: a.approvedCommit || null,
    pages: a.pages || null,
    visibility: a.visibility,
    capabilities: a.capabilities || [],
    dependencies: a.dependencies || [],
    executionEligible: a.executionEligible !== false,
    runtimeBinding: binding
  };
}

async function probe(url: string, timeoutMs = 3000): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: String((err as Error).message || err) } };
  } finally {
    clearTimeout(timer);
  }
}

async function runtimeAuthorityState(a: LeeWayAuthority) {
  const base = runtimeBindingFor(a.id);
  if (!base.configured || !base.endpoint) {
    return { ...authorityView(a), runtimeState: "UNBOUND", runtimeProof: "NOT_EXECUTED" };
  }

  const healthPath =
    a.id === "runtime-fabric" ? "/runtime/health" :
    a.id === "formula" ? "/runtime/formula/v1/health" :
    null;

  if (!healthPath) {
    return { ...authorityView(a), runtimeState: "CONFIGURED_UNVERIFIED", runtimeProof: "NOT_EXECUTED" };
  }

  const result = await probe(`${base.endpoint}${healthPath}`);
  return {
    ...authorityView(a),
    runtimeState: result.ok ? "HEALTH_ENDPOINT_PASS" : "HEALTH_ENDPOINT_BLOCKED",
    runtimeProof: result.ok ? "OBSERVED_RUNTIME_HEALTH" : "RUNTIME_HEALTH_NOT_PROVEN",
    http: result.status,
    health: result.body
  };
}

export async function GET(req: NextRequest, { params }: { params: { route: string[] } }) {
  const corr = correlationFrom(req);
  const route = params.route.join("/");
  const parts = params.route;

  const authority = await loadEcosystemAuthority();
  const registry = authority.registry;

  const notFound = () =>
    Response.json(
      makeEnvelope(route, corr, null, {
        proof: "DEFINED_NOT_CONNECTED",
        status: "error",
        blockers: [`NO_BFF_ROUTE ${route}`]
      }),
      { status: 404, headers: bffHeaders(corr) }
    );

  const kernel = async (path: string, proof: string, blockers: string[] = []): Promise<Response> => {
    const r = await kernelFetch(path);
    if (r.ok && r.body) {
      const evidenceRefs = (r.body as { receiptPath?: string })?.receiptPath
        ? [(r.body as { receiptPath: string }).receiptPath]
        : [];
      return Response.json(
        makeEnvelope(route, corr, r.body, { proof, evidenceReferences: evidenceRefs }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }
    return Response.json(
      makeEnvelope(route, corr, r.body, {
        proof: "HOST_RUNTIME_PENDING",
        status: "degraded",
        degradedReasons: [`kernel ${path} -> ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`],
        blockers
      }),
      { status: 200, headers: bffHeaders(corr) }
    );
  };

  switch (parts[0]) {
    case "health": {
      const k = await kernelFetch("/health");
      const status = authority.ok && k.ok ? "ok" : "degraded";
      return Response.json(
        makeEnvelope(route, corr, {
          ecosystemAuthority: { ok: authority.ok, source: authority.source, error: authority.error || null },
          runtimeKernel: { ...kernelBinding(), observedHealthy: k.ok, body: k.body }
        }, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
          status,
          degradedReasons: [
            ...(authority.ok ? [] : [`authority registry unavailable: ${authority.error || authority.status}`]),
            ...(k.ok ? [] : ["runtime kernel not proven"])
          ]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "readiness": {
      const runtime = authorityById(registry, "runtime-fabric");
      return Response.json(
        makeEnvelope(route, corr, {
          registry: { ok: authority.ok, source: authority.source },
          runtimeAuthority: authorityView(runtime),
          kernelBinding: kernelBinding()
        }, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
          status: authority.ok ? "ok" : "degraded",
          degradedReasons: authority.ok ? [] : ["canonical Standards registry unavailable"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "version":
      return Response.json(makeEnvelope(route, corr, VERSION, { proof: "PROOF_LEVEL_0_DOCUMENT" }), { status: 200, headers: bffHeaders(corr) });

    case "ecosystem":
      return Response.json(
        makeEnvelope(route, corr, registry, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
          status: authority.ok ? "ok" : "degraded",
          degradedReasons: authority.ok ? [] : [authority.error || "registry unavailable"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );

    case "session":
      return kernel("/sessions?limit=200", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");

    case "agent-lee": {
      const h = await kernelFetch("/health");
      const s = await kernelFetch("/sessions?limit=1");
      const data = {
        identity: h.ok ? h.body : null,
        sessions: s.ok ? (s.body as { count?: number }).count ?? null : null,
        officialPath: "LeeWay OS -> Standards authority registry -> Runtime Fabric / governed capability -> Veritas -> receipt",
        kernelBinding: kernelBinding()
      };
      return Response.json(
        makeEnvelope(route, corr, data, {
          proof: h.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING",
          status: h.ok ? "ok" : "degraded",
          degradedReasons: h.ok ? [] : ["runtime kernel not configured or unreachable"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "runtime": {
      if (parts[1] === "authority") {
        const runtime = authorityById(registry, "runtime-fabric");
        return Response.json(
          makeEnvelope(route, corr, runtime ? await runtimeAuthorityState(runtime) : null, {
            proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
            status: authority.ok && runtime ? "ok" : "degraded",
            degradedReasons: runtime ? [] : ["Runtime Fabric authority not resolved"]
          }),
          { status: 200, headers: bffHeaders(corr) }
        );
      }
      if (parts[1] === "requests") {
        if (parts[2]) {
          const r = await kernelFetch(`/requests/${parts[2]}`);
          if (!r.ok) return notFound();
          return Response.json(makeEnvelope(route, corr, r.body, { proof: "PROOF_LEVEL_3_RUNTIME_ENDPOINT" }), { status: 200, headers: bffHeaders(corr) });
        }
        return kernel("/requests", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");
      }
      if (parts[1] === "capabilities") return kernel("/capabilities", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");
      if (parts[1] === "evidence" && parts[2] === "latest") return kernel("/receipts/latest", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");
      if (parts[1] === "approvals") {
        const r = await kernelFetch("/requests");
        const requests = (r.body as { requests?: unknown[] })?.requests || [];
        const pending = (requests as { requestId: string; state: string }[]).filter((x) =>
          ["RECEIVED", "POLICY_PENDING", "VERIFYING"].includes(x.state)
        );
        return Response.json(
          makeEnvelope(route, corr, { pendingCount: pending.length, pending }, {
            proof: r.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING",
            status: r.ok ? "ok" : "degraded",
            degradedReasons: r.ok ? [] : ["runtime request store unavailable"]
          }),
          { status: 200, headers: bffHeaders(corr) }
        );
      }
      return kernel("/runtime/status", "PROOF_LEVEL_3_RUNTIME_ENDPOINT", ["Bind LEEWAY_KERNEL_BASE to an authorized Runtime Kernel endpoint."]);
    }

    case "services": {
      if (!registry) {
        return Response.json(makeEnvelope(route, corr, { services: [] }, {
          proof: "AUTHORITY_REGISTRY_PENDING",
          status: "degraded",
          degradedReasons: [authority.error || "registry unavailable"]
        }), { status: 200, headers: bffHeaders(corr) });
      }
      const services = await Promise.all(
        registry.requiredCoreIds.map((id) => authorityById(registry, id)).filter(Boolean).map((a) => runtimeAuthorityState(a as LeeWayAuthority))
      );
      return Response.json(
        makeEnvelope(route, corr, { services }, {
          proof: "GITHUB_AUTHORITY_REGISTRY_OBSERVED",
          status: "ok",
          blockers: ["Repository authority is separate from runtime health. UNBOUND/CONFIGURED_UNVERIFIED entries are not execution proof."]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "providers":
    case "models": {
      const r = await kernelFetch("/model/status");
      const ms = (r.body as { status?: string; models?: string[] }) || {};
      return Response.json(
        makeEnvelope(route, corr, parts[0] === "providers"
          ? { providers: [{ id: "configured-model-fabric", type: "runtime-model-provider", status: ms.status || "UNPROVEN", models: ms.models || [] }] }
          : ms,
        {
          proof: r.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING",
          status: r.ok ? "ok" : "degraded",
          degradedReasons: r.ok ? [] : ["model provider state unavailable until Runtime Kernel is bound"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "containers": {
      return Response.json(
        makeEnvelope(route, corr, {
          dockerRole: registry?.executionLaw?.dockerRole || "OPTIONAL_DEVELOPMENT_QUALIFICATION_PACKAGING_ADAPTER",
          dockerIsAuthority: false,
          mutationExposed: false
        }, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "PROOF_LEVEL_0_DOCUMENT",
          blockers: ["LeeWay OS no longer executes docker ps as ecosystem discovery. Container diagnostics belong behind an authorized host/runtime adapter."]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "devices": {
      const device = authorityById(registry, "device-bridge");
      const binding = runtimeBindingFor("device-bridge");
      return Response.json(
        makeEnvelope(route, corr, {
          authority: authorityView(device),
          runtimeBinding: binding,
          physicalState: "UNVERIFIED_UNTIL_NATIVE_HANDSHAKE"
        }, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
          status: authority.ok && device ? "ok" : "degraded",
          degradedReasons: device ? [] : ["Device Bridge authority unavailable"],
          blockers: ["Repository discovery does not prove a paired or authorized physical device."]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "applications": {
      const applications = publicApplicationAuthorities(registry).map(authorityView);
      return Response.json(
        makeEnvelope(route, corr, { applications }, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
          status: authority.ok ? "ok" : "degraded",
          degradedReasons: authority.ok ? [] : ["canonical application registry unavailable"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "open-source": {
      const thankYou = "https://4citeb4u.github.io/LeeWay-Agent-Skills/thank-you.html";
      return Response.json(
        makeEnvelope(route, corr, {
          dedication: thankYou,
          lineageRegistry: "https://github.com/4citeB4U/LeeWay-Agent-Skills/blob/main/config/open-source-lineage-v1.json",
          authority: registry?.openSourceLineage || null
        }, { proof: "GITHUB_PROVENANCE_AUTHORITY" }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }

    case "workspaces":
      return Response.json(makeEnvelope(route, corr, { workspaces: WORKS }, { proof: "PROOF_LEVEL_0_DOCUMENT", status: "ok", degradedReasons: WORKS.map((w) => `${w.id} DEFINED_NOT_CONNECTED`) }), { status: 200, headers: bffHeaders(corr) });

    case "security":
      return Response.json(
        makeEnvelope(route, corr, {
          source: authority.source,
          truthLaws: registry?.truthLaws || [],
          dockerRole: registry?.executionLaw?.dockerRole || null,
          recoveryRole: registry?.executionLaw?.recoveryRole || null,
          pagesRole: registry?.executionLaw?.pagesRole || null,
          formulaExecutionClaim: "NOT_EXECUTED_BY_SECURITY_VIEW"
        }, {
          proof: authority.ok ? "GITHUB_AUTHORITY_REGISTRY_OBSERVED" : "AUTHORITY_REGISTRY_PENDING",
          status: authority.ok ? "ok" : "degraded",
          degradedReasons: authority.ok ? [] : ["Standards registry unavailable"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );

    default:
      return notFound();
  }
}

function bffHeaders(corr: string) {
  return {
    "x-bff": "leeway-os-nextjs",
    "x-correlation-id": corr,
    "cache-control": "no-store"
  };
}
