import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch('http://127.0.0.1:8765/api/local-voice/agent-lee-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Leeway-Surface': 'leeway-ide-single-canvas' },
      body: JSON.stringify(body ?? {}),
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: 'CEREBRAL_DAEMON_8765_UNREACHABLE',
      message: 'Local voice capture needs CerebralDaemon on 127.0.0.1:8765.',
      details: error?.message || 'CerebralDaemon voice route failed',
    }, { status: 503 });
  }
}