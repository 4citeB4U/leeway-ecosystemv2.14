import { NextRequest } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { kernelFetch } from "@/src/lib/kernel-client";
import { makeEnvelope, correlationFrom } from "@/src/lib/bff-envelope";

const exec = promisify(execFile);

export const dynamic = "force-dynamic";

const VERSION = {
  app: "leeway-os-nextjs",
  version: "0.1.0-mig008b",
  stack: "next.js-app-router + react + typescript",
  kernel: "leeway-runtime-kernel (4002)",
  frontendAuthority: "CANONICAL_FACE_OF_LEEWAY_OPERATING_SYSTEM"
};

const SERVICES = [
  { id: "runtime-fabric", name: "Runtime Fabric", endpoint: "http://127.0.0.1:4001", status: "CONNECTED_WITH_GAPS", note: "container /health ok; /runtime/status 500 (stale image, rebuild pending)" },
  { id: "runtime-kernel", name: "Runtime Kernel", endpoint: "http://127.0.0.1:4002", status: "LIVE", note: "kernel service from MIG-008A" },
  { id: "master-publisher", name: "Master Publisher", endpoint: "http://127.0.0.1:8876", status: "CONNECTED_WITH_GAPS", note: "root 404; /api/projects 500 disk I/O (documented gap)" },
  { id: "cerebral", name: "Cerebral", endpoint: "http://127.0.0.1:8765", status: "LIVE", note: "daemon responds" },
  { id: "desktop-runtime", name: "Desktop Runtime", endpoint: "http://127.0.0.1:8091", status: "LIVE", note: "server.mjs running" },
  { id: "ollama", name: "Model Fabric (Ollama)", endpoint: "http://127.0.0.1:11434", status: "LIVE", note: "listening" }
];

const APPLICATIONS = [
  { id: "workspaces", name: "Workspaces", status: "DEFINED_NOT_CONNECTED" },
  { id: "marketplace", name: "Marketplace", status: "DEFINED_NOT_CONNECTED" },
  { id: "files", name: "LeeWay Files", status: "DEFINED_NOT_CONNECTED" },
  { id: "communications", name: "Communications", status: "DEFINED_NOT_CONNECTED" },
  { id: "device-center", name: "Device Center", status: "DEFINED_NOT_CONNECTED" },
  { id: "evidence-center", name: "Evidence Center", status: "LIVE_READ_ONLY", note: "backed by kernel /receipts/latest" },
  { id: "agent-interaction", name: "Agent Lee Interaction", status: "LIVE_READ_ONLY", note: "requests created through kernel" },
  { id: "github-import", name: "GitHub Import Tool", status: "DEFINED_NOT_CONNECTED" }
];

const WORKS = [
  { id: "first-workspace", name: "First Workspace", status: "DEFINED_NOT_CONNECTED" },
  { id: "workspace-2", name: "Workspace 2", status: "DEFINED_NOT_CONNECTED" },
  { id: "workspace-3", name: "Workspace 3", status: "DEFINED_NOT_CONNECTED" }
];

async function dockerPs(): Promise<{ ok: boolean; containers: unknown[]; error?: string }> {
  try {
    const { stdout } = await exec("docker", ["ps", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}"], { timeout: 8000, windowsHide: true });
    const containers = stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [name, image, status] = line.split("\t");
        return { name, image, status };
      });
    return { ok: true, containers };
  } catch (err) {
    return { ok: false, containers: [], error: String((err as Error).message) };
  }
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

async function securityProfile() {
  const evRoot = "D:\\Leeway-Ecosystem v2.1.4\\LeeWay-Enterprise-Transit-Hub\\_evidence\\MIG-008B-P0-LeeWay-OS-Live-Embodiment-20260801-181012";
  const profilePath = path.join(evRoot, "LEEWAY-SECURITY-PROFILE.json");
  try {
    const raw = fs.readFileSync(profilePath, "utf8");
    return { profile: JSON.parse(raw), source: "LEEWAY-SECURITY-PROFILE.json" };
  } catch {
    return { profile: null, source: "not-yet-generated (Phase 8 pending)" };
  }
}

export async function GET(req: NextRequest, { params }: { params: { route: string[] } }) {
  const corr = correlationFrom(req);
  const route = params.route.join("/");
  const parts = params.route;

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
      const r = await kernelFetch("/health");
      return Response.json(
        makeEnvelope(route, corr, r.body, { proof: r.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING", status: r.ok ? "ok" : "degraded", degradedReasons: r.ok ? [] : ["kernel unreachable"] }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }
    case "readiness":
      return kernel("/runtime/status", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");
    case "version":
      return Response.json(makeEnvelope(route, corr, VERSION, { proof: "PROOF_LEVEL_0_DOCUMENT" }), { status: 200, headers: bffHeaders(corr) });
    case "session":
      return kernel("/sessions?limit=200", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");
    case "agent-lee": {
      const h = await kernelFetch("/health");
      const s = await kernelFetch("/sessions?limit=1");
      const data = {
        identity: h.ok ? h.body : null,
        sessions: s.ok ? (s.body as { count?: number }).count ?? null : null,
        officialPath: "VS Code Chat -> 8787 -> 8080 -> 4001 (proven through kernel when fired)"
      };
      return Response.json(
        makeEnvelope(route, corr, data, {
          proof: h.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING",
          status: h.ok ? "ok" : "degraded",
          degradedReasons: h.ok ? [] : ["kernel unreachable"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }
    case "runtime": {
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
            proof: "PROOF_LEVEL_3_RUNTIME_ENDPOINT",
            status: r.ok ? "ok" : "degraded",
            degradedReasons: r.ok ? [] : ["kernel unreachable"],
            blockers: r.ok ? [] : ["approvals derived from kernel request states; no dedicated approval service"]
          }),
          { status: 200, headers: bffHeaders(corr) }
        );
      }
      return kernel("/runtime/status", "PROOF_LEVEL_3_RUNTIME_ENDPOINT");
    }
    case "services": {
      const probes = await Promise.all(SERVICES.map((s) => probe(s.endpoint).then((p) => ({ ...s, live: p.ok, http: p.status }))));
      return Response.json(
        makeEnvelope(route, corr, { services: probes }, {
          proof: "PROOF_LEVEL_3_RUNTIME_ENDPOINT",
          status: probes.every((p) => p.live) ? "ok" : "degraded",
          degradedReasons: probes.filter((p) => !p.live).map((p) => `${p.id} unreachable`)
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }
    case "providers": {
      const r = await kernelFetch("/model/status");
      const ms = (r.body as { status?: string; models?: string[] }) || {};
      const providers = [{ id: "ollama", type: "local-model-fabric", endpoint: "http://127.0.0.1:11434", status: ms.status === "MODEL_APPLIANCE_PARTIAL" ? "LIVE" : ms.status || "UNKNOWN", models: ms.models || [] }];
      return Response.json(makeEnvelope(route, corr, { providers }, { proof: r.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING", status: r.ok ? "ok" : "degraded", degradedReasons: r.ok ? [] : ["kernel unreachable"] }), { status: 200, headers: bffHeaders(corr) });
    }
    case "models": {
      const r = await kernelFetch("/model/status");
      const ms = (r.body as { status?: string; models?: string[] }) || {};
      return Response.json(makeEnvelope(route, corr, ms, { proof: r.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING", status: r.ok ? "ok" : "degraded", degradedReasons: r.ok ? [] : ["kernel unreachable"] }), { status: 200, headers: bffHeaders(corr) });
    }
    case "containers": {
      const d = await dockerPs();
      return Response.json(
        makeEnvelope(route, corr, d, {
          proof: d.ok ? "PROOF_LEVEL_2_COMMAND_VALIDATION" : "HOST_RUNTIME_PENDING",
          status: d.ok ? "ok" : "degraded",
          degradedReasons: d.ok ? [] : [`docker ps failed: ${d.error}`],
          blockers: d.ok ? [] : ["docker ps is read-only; no docker mutation exposed"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }
    case "devices": {
      const desktop = await probe("http://127.0.0.1:8091/runtime/status");
      const cerebral = await probe("http://127.0.0.1:8765");
      const devices = [
        { id: "desktop-runtime", name: "Desktop Runtime", endpoint: "http://127.0.0.1:8091", status: desktop.ok ? "LIVE" : "UNREACHABLE", http: desktop.status },
        { id: "cerebral", name: "Cerebral", endpoint: "http://127.0.0.1:8765", status: cerebral.ok ? "LIVE" : "UNREACHABLE", http: cerebral.status }
      ];
      return Response.json(
        makeEnvelope(route, corr, { devices }, {
          proof: "PROOF_LEVEL_3_RUNTIME_ENDPOINT",
          status: devices.every((d) => d.status === "LIVE") ? "ok" : "degraded",
          degradedReasons: devices.filter((d) => d.status !== "LIVE").map((d) => `${d.id} unreachable`),
          blockers: ["camera/mic/body capabilities require explicit consent tokens; not exposed via browser by default"]
        }),
        { status: 200, headers: bffHeaders(corr) }
      );
    }
    case "applications":
      return Response.json(makeEnvelope(route, corr, { applications: APPLICATIONS }, { proof: "PROOF_LEVEL_0_DOCUMENT", status: "ok", blockers: APPLICATIONS.filter((a) => a.status === "DEFINED_NOT_CONNECTED").map((a) => `${a.id} not connected to a runtime backend`), degradedReasons: APPLICATIONS.filter((a) => a.status === "DEFINED_NOT_CONNECTED").map((a) => `${a.id} DEFINED_NOT_CONNECTED`) }), { status: 200, headers: bffHeaders(corr) });
    case "workspaces":
      return Response.json(makeEnvelope(route, corr, { workspaces: WORKS }, { proof: "PROOF_LEVEL_0_DOCUMENT", status: "ok", degradedReasons: WORKS.map((w) => `${w.id} DEFINED_NOT_CONNECTED`) }), { status: 200, headers: bffHeaders(corr) });
    case "security": {
      const prof = await securityProfile();
      return Response.json(makeEnvelope(route, corr, prof, { proof: "PROOF_LEVEL_0_DOCUMENT" }), { status: 200, headers: bffHeaders(corr) });
    }
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
