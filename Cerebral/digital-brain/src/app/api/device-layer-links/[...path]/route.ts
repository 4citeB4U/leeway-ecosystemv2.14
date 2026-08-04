import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const linkMap = [
  { title: 'Device Readiness', href: '/device-readiness', apiBase: '/api/device-readiness', purpose: 'Read readiness summaries and safety state.', actionAuthority: false },
  { title: 'Printer IPP Locked Stub', href: '/printer-ipp-locked-stub', apiBase: '/api/printer-ipp-locked-stub', purpose: 'View locked printer stub status. No printing.', actionAuthority: false },
  { title: 'Phone Satellite', href: '/phone-satellite', apiBase: '/api/phone-satellite', purpose: 'View phone satellite draft-only status. No phone action.', actionAuthority: false },
  { title: 'Router Status', href: '/router-status', apiBase: '/api/router-status', purpose: 'View router read-only status. No router action.', actionAuthority: false },
  { title: 'Device Layer Index', href: '/device-layer-index', apiBase: '/api/device-layer-index', purpose: 'View completed Device Layer index.', actionAuthority: false },
  { title: 'Device Layer Master Status', href: '/device-layer-master-status', apiBase: '/api/device-layer-master-status', purpose: 'View master status across completed lanes.', actionAuthority: false },
  { title: 'Device Layer Hold And Lock', href: '/device-layer-hold-and-lock', apiBase: '/api/device-layer-hold-and-lock', purpose: 'View hold-and-lock rules and held lanes.', actionAuthority: false }
];

function safety() {
  return {
    locked: true,
    pageNavigationOnly: true,
    approvalGranted: false,
    authorityUnlocked: false,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    physicalActionAuthorized: false,
    printerActionAuthorized: false,
    phoneActionAuthorized: false,
    routerActionAuthorized: false,
    networkScanAuthorized: false,
    portScanAuthorized: false,
    bridgeDeployAuthorized: false,
    protocolTranslatorAuthorized: false,
    noExecution: true,
    noDeviceControl: true,
    noOnboarding: true,
    noPrinterAction: true,
    noPhoneAction: true,
    noRouterAction: true,
    noNetworkScan: true,
    noPortScan: true,
    noApprovalGrant: true,
    noAuthorityUnlock: true,
    noPhysicalAction: true
  };
}

function basePayload(route: string) {
  return {
    ok: true,
    route,
    locked: true,
    authority: 'GET_ONLY_DEVICE_LAYER_LINKS_NO_ACTION',
    page: '/device-layer-links',
    apiBase: '/api/device-layer-links',
    linkCount: linkMap.length,
    links: linkMap,
    safety: safety()
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'links') {
    return NextResponse.json(basePayload('links'));
  }

  if (routePath === 'safety') {
    return NextResponse.json({
      ok: true,
      route: 'safety',
      locked: true,
      authority: 'GET_ONLY_DEVICE_LAYER_LINKS_NO_ACTION',
      safety: safety()
    });
  }

  if (routePath === 'proof-chain') {
    return NextResponse.json({
      ...basePayload('proof-chain'),
      proofChain: {
        contract: 'LEEWAY_PHASE_45_UI_INDEX_LINKS_CONTRACT_365_NO_EXECUTE_CLEAN',
        hold: 'LEEWAY_PHASE_45_DEVICE_LAYER_HOLD_AND_LOCK_FINAL_SUMMARY_358_CLEAN',
        closeout: 'LEEWAY_PHASE_45_DEVICE_LAYER_CLOSEOUT_REPORT_362_CLEAN',
        template: 'LEEWAY_PHASE_46_HUMAN_APPROVAL_TEMPLATE_FINAL_SUMMARY_364_CLEAN'
      }
    });
  }

  return NextResponse.json({
    ...basePayload('summary'),
    summary: {
      status: 'LIVE_GET_ONLY_LINKS_NO_ACTION',
      page: '/device-layer-links',
      apiBase: '/api/device-layer-links',
      linkCount: linkMap.length,
      approvalGranted: false,
      authorityUnlocked: false,
      executionPerformed: false,
      deviceControlPerformed: false,
      onboardingPerformed: false,
      physicalActionLanePerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_DEVICE_LAYER_LINKS_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_DEVICE_LAYER_LINKS_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_DEVICE_LAYER_LINKS_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_DEVICE_LAYER_LINKS_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}