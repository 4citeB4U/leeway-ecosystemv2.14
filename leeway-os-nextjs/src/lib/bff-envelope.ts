export interface BffEnvelope {
  schema: string;
  route: string;
  requestId: string;
  correlationId: string;
  timestamp: string;
  sourceService: string;
  proofClassification: string;
  status: "ok" | "degraded" | "error";
  data: unknown;
  degradedReasons: string[];
  blockers: string[];
  evidenceReferences: string[];
}

export function makeEnvelope(
  route: string,
  correlationId: string,
  data: unknown,
  opts: {
    proof?: string;
    status?: BffEnvelope["status"];
    degradedReasons?: string[];
    blockers?: string[];
    evidenceReferences?: string[];
  } = {}
): BffEnvelope {
  return {
    schema: "leeway.bff.v1",
    route,
    requestId: randomId("bff"),
    correlationId,
    timestamp: new Date().toISOString(),
    sourceService: "leeway-os-bff",
    proofClassification: opts.proof || "DEFINED_NOT_CONNECTED",
    status: opts.status || (opts.degradedReasons?.length ? "degraded" : "ok"),
    data,
    degradedReasons: opts.degradedReasons || [],
    blockers: opts.blockers || [],
    evidenceReferences: opts.evidenceReferences || []
  };
}

export function randomId(prefix: string): string {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  return `${prefix}-${crypto.randomUUID()}`;
}

export function correlationFrom(req: Request): string {
  const h = req.headers.get("x-correlation-id");
  if (h) return h;
  const url = new URL(req.url);
  const q = url.searchParams.get("correlationId");
  if (q) return q;
  return randomId("corr");
}
