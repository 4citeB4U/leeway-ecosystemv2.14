import { NextResponse } from 'next/server';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const ROOT = 'E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4';
const INDEX_347F = ROOT + '\\\\runtime\\\\phase-44-device-layer-index-contract\\\\latest\\\\phase-44-device-layer-index-contract-latest.json';
const ROUTER_346 = ROOT + '\\\\runtime\\\\phase-44-router-status-ui-final-summary\\\\latest\\\\phase-44-router-status-ui-final-summary-latest.json';
const PHONE_339 = ROOT + '\\\\runtime\\\\phase-43-phone-satellite-ui-final-summary\\\\latest\\\\phase-43-phone-satellite-ui-final-summary-latest.json';
const PRINTER_332 = ROOT + '\\\\runtime\\\\phase-43-printer-ipp-locked-stub-ui-final-summary\\\\latest\\\\phase-43-printer-ipp-locked-stub-ui-final-summary-latest.json';
const READINESS_319 = ROOT + '\\\\runtime\\\\phase-42-device-readiness-final-summary\\\\latest\\\\phase-42-device-readiness-final-summary-latest.json';

function lockedSafety() {
  return {
    locked: true,
    getOnly: true,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    physicalActionAuthorized: false,
    printAuthorized: false,
    printerQueueMutationAuthorized: false,
    ippRequestAuthorized: false,
    phoneControlAuthorized: false,
    adbAuthorized: false,
    bluetoothPairingAuthorized: false,
    routerLoginAuthorized: false,
    routerCredentialUseAuthorized: false,
    networkScanAuthorized: false,
    configMutationAuthorized: false,
    bridgeDeployAuthorized: false,
    protocolTranslatorAuthorized: false,
    noPrinterAction: true,
    noPhoneAction: true,
    noRouterAction: true,
    noExecution: true,
    noDeviceControl: true,
    noOnboarding: true,
    noBridgeDeploy: true,
    noPhysicalActionLane: true
  };
}

function readJson(path: string) {
  try {
    const raw = fs.readFileSync(path, 'utf8');
    return JSON.parse(raw.replace(/^\\uFEFF/, ''));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), path };
  }
}

function basePayload(route: string) {
  const indexContract = readJson(INDEX_347F);
  const routerSummary = readJson(ROUTER_346);
  const phoneSummary = readJson(PHONE_339);
  const printerSummary = readJson(PRINTER_332);
  const readinessSummary = readJson(READINESS_319);
  const completedLanes = indexContract.completed_lanes ?? [];
  return {
    ok: true,
    route,
    locked: true,
    interface: 'device-layer-index',
    authority: 'GET_ONLY_COMPLETED_LANES_INDEX_NO_EXECUTE',
    page: '/device-layer-index',
    apiBase: '/api/device-layer-index',
    safety: lockedSafety(),
    completedLanes,
    proofChain: { indexContract, routerSummary, phoneSummary, printerSummary, readinessSummary }
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'pages') {
    const payload = basePayload('pages');
    return NextResponse.json({
      ...payload,
      pages: payload.completedLanes.map((lane: any) => ({ lane: lane.lane, page: lane.page, apiBase: lane.api_base, complete: lane.complete, authority: lane.authority }))
    });
  }

  if (routePath === 'safety') {
    const payload = basePayload('safety');
    return NextResponse.json({
      ...payload,
      globalNoActionPolicy: payload.proofChain.indexContract.global_no_action_policy ?? lockedSafety(),
      forbiddenRoutes: payload.proofChain.indexContract.forbidden_routes ?? []
    });
  }

  if (routePath === 'proof-chain') {
    const payload = basePayload('proof-chain');
    return NextResponse.json({
      ...payload,
      proofChainStatus: {
        indexContractVerdict: payload.proofChain.indexContract.verdict,
        routerVerdict: payload.proofChain.routerSummary.verdict,
        phoneVerdict: payload.proofChain.phoneSummary.verdict,
        printerVerdict: payload.proofChain.printerSummary.verdict,
        readinessVerdict: payload.proofChain.readinessSummary.verdict
      }
    });
  }

  const payload = basePayload('summary');
  return NextResponse.json({
    ...payload,
    summary: {
      page: '/device-layer-index',
      apiBase: '/api/device-layer-index',
      completedLaneCount: payload.completedLanes.length,
      status: 'LOCKED_GET_ONLY_COMPLETED_LANES_INDEX',
      printerActionPerformed: false,
      phoneActionPerformed: false,
      routerActionPerformed: false,
      executionPerformed: false,
      deviceControlPerformed: false,
      onboardingPerformed: false,
      physicalActionLanePerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}