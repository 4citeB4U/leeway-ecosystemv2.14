import { NextRequest, NextResponse } from 'next/server';

const MASTER_PUBLISHER_URL = process.env.LEEWAY_MASTER_PUBLISHER_URL || 'http://127.0.0.1:8876';

async function proxyMasterPublisher(req: NextRequest, mpPath: string) {
  try {
    const method = req.method.toUpperCase();
    const targetUrl = `${MASTER_PUBLISHER_URL}${mpPath}`;

    const body = ['GET', 'HEAD'].includes(method)
      ? undefined
      : JSON.stringify(await req.json().catch(() => ({})));

    const response = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Leeway-Surface': 'leeway-ide-single-canvas',
      },
      body,
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'MASTER_PUBLISHER_UNREACHABLE',
      error: 'LEEWAY_MASTER_PUBLISHER_UNREACHABLE',
      details: error?.message || 'Master Publisher request failed',
      requestedPath: mpPath,
    }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/leeway/master-publisher', '');
  return proxyMasterPublisher(req, path || '/');
}

export async function POST(req: NextRequest) {
  return GET(req);
}

export async function PUT(req: NextRequest) {
  return GET(req);
}

export async function DELETE(req: NextRequest) {
  return GET(req);
}

export async function PATCH(req: NextRequest) {
  return GET(req);
}
