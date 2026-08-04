import { NextRequest, NextResponse } from 'next/server';

const ROUTER_URL = process.env.LEEWAY_ROUTER_URL || 'http://127.0.0.1:8080';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const response = await fetch(`${ROUTER_URL}/agent-lee/apps/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10000) });
    const text = await response.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return NextResponse.json({
      ok: response.ok,
      http: response.status,
      health: {
        pass: response.ok && Boolean(data?.app),
        http: response.status,
        appId: data?.app?.appId ?? id,
        displayName: data?.app?.displayName ?? null,
      },
      app: data?.app ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, http: 0, health: { pass: false, http: 0, appId: id }, details: error?.message ?? String(error) },
      { status: 503 },
    );
  }
}
