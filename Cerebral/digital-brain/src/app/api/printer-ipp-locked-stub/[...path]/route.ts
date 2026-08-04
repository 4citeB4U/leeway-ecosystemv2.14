import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const STUB_URL = 'http://127.0.0.1:7341';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function lockedSafety() {
  return {
    locked: true,
    getOnly: true,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    printerActionAuthorized: false,
    ippRequestAuthorized: false,
    printJobAuthorized: false,
    queueMutationAuthorized: false,
    protocolTranslatorAuthorized: false,
    physicalActionAuthorized: false,
    noPrintJob: true,
    noTestPage: true,
    noQueueMutation: true,
    noIppRequestToPrinter: true,
    noProtocolTranslatorDeploy: true,
    noPhysicalActionLane: true
  };
}

async function fetchJson(path: string) {
  const res = await fetch(STUB_URL + path, { cache: 'no-store' });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  try {
    if (routePath === 'health') {
      const health = await fetchJson('/health');
      return NextResponse.json({ ok: true, route: 'health', safety: lockedSafety(), source: health });
    }

    if (routePath === 'policy') {
      const policy = await fetchJson('/policy');
      return NextResponse.json({ ok: true, route: 'policy', safety: lockedSafety(), source: policy });
    }

    if (routePath === 'capabilities') {
      const capabilities = await fetchJson('/capabilities');
      return NextResponse.json({ ok: true, route: 'capabilities', safety: lockedSafety(), source: capabilities });
    }

    if (routePath === 'target-printer') {
      const target = await fetchJson('/target-printer');
      return NextResponse.json({ ok: true, route: 'target-printer', safety: lockedSafety(), source: target });
    }

    if (routePath === 'safety') {
      return NextResponse.json({
        ok: true,
        route: 'safety',
        safety: lockedSafety(),
        blockedRoutes: [
          '/api/printer-ipp-locked-stub/print',
          '/api/printer-ipp-locked-stub/test-page',
          '/api/printer-ipp-locked-stub/ipp/validate-job',
          '/api/printer-ipp-locked-stub/ipp/print-job',
          '/api/printer-ipp-locked-stub/queue/purge',
          '/api/printer-ipp-locked-stub/unlock',
          '/api/printer-ipp-locked-stub/deploy'
        ]
      });
    }

    const health = await fetchJson('/health');
    const policy = await fetchJson('/policy');
    const capabilities = await fetchJson('/capabilities');
    const target = await fetchJson('/target-printer');

    return NextResponse.json({
      ok: true,
      route: 'summary',
      title: 'LeeWay Printer IPP Locked Stub',
      status: 'LOCKED_GET_ONLY_LIVE',
      stubUrl: STUB_URL,
      safety: lockedSafety(),
      endpoints: { health, policy, capabilities, target }
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      route: routePath,
      error: error instanceof Error ? error.message : String(error),
      safety: lockedSafety()
    }, { status: 502 });
  }
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_NO_PRINT_NO_IPP_NO_QUEUE_MUTATION', safety: lockedSafety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_NO_PRINT_NO_IPP_NO_QUEUE_MUTATION', safety: lockedSafety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_NO_PRINT_NO_IPP_NO_QUEUE_MUTATION', safety: lockedSafety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_NO_PRINT_NO_IPP_NO_QUEUE_MUTATION', safety: lockedSafety() }, { status: 423 });
}