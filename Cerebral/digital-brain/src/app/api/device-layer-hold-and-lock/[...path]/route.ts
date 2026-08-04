import { NextResponse } from 'next/server';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const ROOT = 'E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4';
const HOLD_355 = ROOT + '\\\\runtime\\\\phase-45-device-layer-hold-and-lock-contract\\\\latest\\\\phase-45-device-layer-hold-and-lock-contract-latest.json';
const MASTER_354 = ROOT + '\\\\runtime\\\\phase-45-device-layer-master-status-final-summary\\\\latest\\\\phase-45-device-layer-master-status-final-summary-latest.json';

function lockedSafety() {
  return {
    locked: true,
    getOnly: true,
    holdMode: 'HOLD_ALL_COMPLETED_DEVICE_LANES_GET_ONLY',
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    physicalActionAuthorized: false,
    authorityUnlockAuthorized: false,
    printerActionAuthorized: false,
    phoneActionAuthorized: false,
    routerActionAuthorized: false,
    bridgeDeployAuthorized: false,
    protocolTranslatorAuthorized: false,
    noExecution: true,
    noDeviceControl: true,
    noOnboarding: true,
    noAuthorityUnlock: true,
    noPhysicalActionLane: true,
    noPrinterAction: true,
    noPhoneAction: true,
    noRouterAction: true,
    noBridgeDeploy: true,
    noProtocolTranslatorDeploy: true
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
  const holdContract = readJson(HOLD_355);
  const masterSummary = readJson(MASTER_354);
  return {
    ok: true,
    route,
    locked: true,
    interface: 'device-layer-hold-and-lock',
    authority: 'GET_ONLY_HOLD_AND_LOCK_NO_EXECUTE',
    page: '/device-layer-hold-and-lock',
    apiBase: '/api/device-layer-hold-and-lock',
    safety: lockedSafety(),
    holdContract,
    masterSummary
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'lanes') {
    const payload = basePayload('lanes');
    return NextResponse.json({ ...payload, heldLanes: payload.holdContract.held_lanes ?? [] });
  }

  if (routePath === 'rules') {
    const payload = basePayload('rules');
    return NextResponse.json({
      ...payload,
      hardStopRules: payload.holdContract.hard_stop_rules ?? [],
      allowedWhileHeld: payload.holdContract.allowed_while_held ?? [],
      forbiddenWhileHeld: payload.holdContract.forbidden_while_held ?? []
    });
  }

  if (routePath === 'proof-chain') {
    const payload = basePayload('proof-chain');
    return NextResponse.json({
      ...payload,
      proofChainStatus: {
        holdContractVerdict: payload.holdContract.verdict,
        masterSummaryVerdict: payload.masterSummary.verdict
      }
    });
  }

  const payload = basePayload('summary');
  return NextResponse.json({
    ...payload,
    summary: {
      page: '/device-layer-hold-and-lock',
      apiBase: '/api/device-layer-hold-and-lock',
      heldLaneCount: (payload.holdContract.held_lanes ?? []).length,
      hardStopRuleCount: (payload.holdContract.hard_stop_rules ?? []).length,
      status: 'LOCKED_HOLD_ALL_COMPLETED_DEVICE_LANES_GET_ONLY',
      executionPerformed: false,
      deviceControlPerformed: false,
      onboardingPerformed: false,
      authorityUnlockPerformed: false,
      physicalActionLanePerformed: false,
      printerActionPerformed: false,
      phoneActionPerformed: false,
      routerActionPerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_HOLD_AND_LOCK_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_HOLD_AND_LOCK_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_HOLD_AND_LOCK_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_HOLD_AND_LOCK_NO_EXECUTION_NO_DEVICE_CONTROL_NO_PHYSICAL_ACTION', safety: lockedSafety() }, { status: 423 });
}