import { NextRequest, NextResponse } from 'next/server';

const ROUTER_URL = process.env.LEEWAY_ROUTER_URL || 'http://127.0.0.1:8080';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const response = await fetch(`${ROUTER_URL}/agent-lee/apps/close-owned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: id }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: 'AGENT_LEE_APP_CLOSE_UNREACHABLE', details: error?.message ?? String(error) },
      { status: 503 },
    );
  }
}
