import { NextResponse } from 'next/server';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const ROOT = 'E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4';
const MASTER_351 = ROOT + '\\\\runtime\\\\phase-45-device-layer-master-status-contract\\\\latest\\\\phase-45-device-layer-master-status-contract-latest.json';
const INDEX_350 = ROOT + '\\\\runtime\\\\phase-44-device-layer-index-final-summary\\\\latest\\\\phase-44-device-layer-index-final-summary-latest.json';
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
    printerActionAuthorized: false,
    phoneActionAuthorized: false,
    routerActionAuthorized: false,
    bridgeDeployAuthorized: false,
    protocolTranslatorAuthorized: false,
    authorityUnlockAuthorized: false,
    noExecution: true,
    noDeviceControl: true,
    noOnboarding: true,
    noPrinterAction: true,
    noPhoneAction: true,
    noRouterAction: true,
    noBridgeDeploy: true,
    noProtocolTranslatorDeploy: true,
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
  const masterContract = readJson(MASTER_351);
  const indexSummary = readJson(INDEX_350);
  const routerSummary = readJson(ROUTER_346);
  const phoneSummary = readJson(PHONE_339);
  const printerSummary = readJson(PRINTER_332);
  const readinessSummary = readJson(READINESS_319);
  const indexedLanes = masterContract.indexed_lanes ?? [];
  return {
    ok: true,
    route,
    locked: true,
    interface: 'device-layer-master-status',
    authority: 'GET_ONLY_MASTER_STATUS_NO_EXECUTE',
    page: '/device-layer-master-status',
    apiBase: '/api/device-layer-master-status',
    safety: lockedSafety(),
    indexedLanes,
    proofChain: { masterContract, indexSummary, routerSummary, phoneSummary, printerSummary, readinessSummary }
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'lanes') {
    const payload = basePayload('lanes');
    return NextResponse.json({
      ...payload,
      lanes: payload.indexedLanes.map((lane: any) => ({ lane: lane.lane, page: lane.page, apiBase: lane.api_base, status: lane.status, finalVerdict: lane.final_verdict, actionAuthority: false }))
    });
  }

  if (routePath === 'safety') {
    const payload = basePayload('safety');
    return NextResponse.json({
      ...payload,
      globalNoActionPolicy: payload.proofChain.masterContract.global_no_action_policy ?? lockedSafety(),
      forbiddenRoutes: payload.proofChain.masterContract.forbidden_routes ?? []
    });
  }

  if (routePath === 'proof-chain') {
    const payload = basePayload('proof-chain');
    return NextResponse.json({
      ...payload,
      proofChainStatus: {
        masterContractVerdict: payload.proofChain.masterContract.verdict,
        indexVerdict: payload.proofChain.indexSummary.verdict,
        routerVerdict: payload.proofChain.routerSummary.verdict,
        phoneVerdict: payload.proofChain.phoneSummary.verdict,
        printerVerdict: payload.proofChain.printerSummary.verdict,
        readinessVerdict: payload.proofChain.readinessSummary.verdict
      }
    });
  }

  if (routePath === 'next') {
    const payload = basePayload('next');
    return NextResponse.json({
      ...payload,
      nextSafeOptions: payload.proofChain.masterContract.next_safe_options ?? []
    });
  }

  const payload = basePayload('summary');
  return NextResponse.json({
    ...payload,
    summary: {
      page: '/device-layer-master-status',
      apiBase: '/api/device-layer-master-status',
      indexedLaneCount: payload.indexedLanes.length,
      status: 'LOCKED_GET_ONLY_MASTER_STATUS',
      executionPerformed: false,
      deviceControlPerformed: false,
      onboardingPerformed: false,
      printerActionPerformed: false,
      phoneActionPerformed: false,
      routerActionPerformed: false,
      bridgeDeployPerformed: false,
      physicalActionLanePerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_MASTER_STATUS_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_MASTER_STATUS_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_MASTER_STATUS_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_MASTER_STATUS_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}