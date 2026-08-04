import { NextResponse } from "next/server";

const DEVICE_OPERATOR_BASE_URL = process.env.DEVICE_OPERATOR_URL || "http://127.0.0.1:5323";

const ALLOWED_DEVICE_LAYER_PATHS = new Set([
  "capability-map",
  "families",
  "read-only-routes",
  "approval-required-actions",
  "lock-state",
]);

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const pathParts = params.path ?? [];
  const requestedPath = pathParts.join("/");

  if (!ALLOWED_DEVICE_LAYER_PATHS.has(requestedPath)) {
    return NextResponse.json({ ok: false, error: "DEVICE_LAYER_PROXY_ROUTE_NOT_ALLOWED", requestedPath }, { status: 404 });
  }

  const upstreamUrl = DEVICE_OPERATOR_BASE_URL.replace(/\/$/, "") + "/agent-lee/device-layer/" + requestedPath;
  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}