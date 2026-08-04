import { NextRequest, NextResponse } from 'next/server';

const ROUTER_URL = process.env.LEEWAY_ROUTER_URL || 'http://127.0.0.1:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const applicationId = String(body?.applicationId || body?.appId || '').trim();
    if (!applicationId) {
      return NextResponse.json({ ok: false, error: 'APPLICATION_ID_REQUIRED' }, { status: 400 });
    }
    const response = await fetch(`${ROUTER_URL}/agent-lee/apps/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: applicationId }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await response.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'AGENT_LEE_APP_LAUNCH_UNREACHABLE', details: error?.message ?? String(error) },
      { status: 503 },
    );
  }
}
