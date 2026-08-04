import { NextRequest, NextResponse } from 'next/server';

const RUNTIME_FABRIC_URL = process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001';

async function proxyRuntimeFabric(req: NextRequest, fabricPath: string) {
  try {
    const method = req.method.toUpperCase();
    const response = await fetch(`${RUNTIME_FABRIC_URL}${fabricPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Leeway-Surface': 'leeway-ide-single-canvas',
      },
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(await req.json().catch(() => ({}))),
    });

    const text = await response.text();
    if (!response.ok && response.status === 404) {
      return NextResponse.json({
        status: 'RUNTIME_FABRIC_UNREACHABLE',
        error: 'LEEWAY_RUNTIME_FABRIC_UNREACHABLE',
        details: `Runtime Fabric did not expose ${fabricPath}.`,
        requestedPath: fabricPath,
        resolvedPath: fabricPath,
      }, { status: 503 });
    }
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'RUNTIME_FABRIC_UNREACHABLE',
      error: 'LEEWAY_RUNTIME_FABRIC_UNREACHABLE',
      details: error?.message || 'Runtime Fabric request failed',
      requestedPath: fabricPath,
      resolvedPath: fabricPath,
    }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/leeway/runtime-fabric', '');
  return proxyRuntimeFabric(req, path || '/');
}