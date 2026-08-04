import { NextRequest } from "next/server";
import { kernelFetch } from "@/src/lib/kernel-client";
import { makeEnvelope, correlationFrom } from "@/src/lib/bff-envelope";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const corr = correlationFrom(req);
  let body: { capabilityId?: string; payload?: unknown; note?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      makeEnvelope("request", corr, null, { status: "error", blockers: ["INVALID_JSON_BODY"] }),
      { status: 400, headers: { "x-correlation-id": corr } }
    );
  }

  if (!body.capabilityId) {
    return Response.json(
      makeEnvelope("request", corr, null, { status: "error", blockers: ["capabilityId required"] }),
      { status: 400, headers: { "x-correlation-id": corr } }
    );
  }

  const r = await kernelFetch("/requests", {
    method: "POST",
    body: JSON.stringify({
      capabilityId: body.capabilityId,
      payload: body.payload || {},
      correlationId: corr,
      origin: "leeway-os-ui"
    })
  });

  return Response.json(
    makeEnvelope("request", corr, r.body, {
      proof: r.ok ? "PROOF_LEVEL_3_RUNTIME_ENDPOINT" : "HOST_RUNTIME_PENDING",
      status: r.ok ? "ok" : "degraded",
      degradedReasons: r.ok ? [] : [`kernel /requests -> ${r.status}`]
    }),
    { status: r.ok ? 200 : 200, headers: { "x-correlation-id": corr, "cache-control": "no-store" } }
  );
}
