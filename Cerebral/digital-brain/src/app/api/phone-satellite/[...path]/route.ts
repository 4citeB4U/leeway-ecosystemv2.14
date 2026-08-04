import { NextResponse } from 'next/server';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const ROOT = 'E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4';
const CONTRACT_333 = ROOT + '\\\\runtime\\\\phase-43-phone-satellite-contract\\\\latest\\\\phase-43-phone-satellite-contract-latest.json';
const PLAN_334 = ROOT + '\\\\runtime\\\\phase-43-phone-satellite-readiness-plan\\\\latest\\\\phase-43-phone-satellite-readiness-plan-latest.json';
const INTERFACE_335 = ROOT + '\\\\runtime\\\\phase-43-phone-satellite-interface-contract\\\\latest\\\\phase-43-phone-satellite-interface-contract-latest.json';
const UI_CONTRACT_336 = ROOT + '\\\\runtime\\\\phase-43-phone-satellite-get-only-ui-contract\\\\latest\\\\phase-43-phone-satellite-get-only-ui-contract-latest.json';

function lockedSafety() {
  return {
    locked: true,
    getOnly: true,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    pairingAuthorized: false,
    adbAuthorized: false,
    bluetoothPairingAuthorized: false,
    tailscaleMutationAuthorized: false,
    phoneAppInstallAuthorized: false,
    phoneControlAuthorized: false,
    touchInputAuthorized: false,
    screenControlAuthorized: false,
    screenCaptureAuthorized: false,
    fileTransferAuthorized: false,
    smsOrCallAuthorized: false,
    cameraOrMicrophoneAuthorized: false,
    notificationAccessAuthorized: false,
    protocolTranslatorAuthorized: false,
    iotBridgeAuthorized: false,
    physicalActionAuthorized: false,
    noAdb: true,
    noPairing: true,
    noTailscaleMutation: true,
    noPhoneControl: true,
    noFileTransfer: true,
    noSmsOrCall: true,
    noCameraOrMicrophone: true,
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
  const contract333 = readJson(CONTRACT_333);
  const plan334 = readJson(PLAN_334);
  const interface335 = readJson(INTERFACE_335);
  const uiContract336 = readJson(UI_CONTRACT_336);
  return {
    ok: true,
    route,
    locked: true,
    interface: 'phone-satellite-status',
    targetAsset: 'Leonard Galaxy Z Fold6',
    authority: 'LOCKED_DRAFT_ONLY_NO_EXECUTE',
    safety: lockedSafety(),
    proofChain: { contract333, plan334, interface335, uiContract336 }
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'readiness') {
    const payload = basePayload('readiness');
    return NextResponse.json({
      ...payload,
      readiness: payload.proofChain.plan334.readiness_checklist ?? [],
      satelliteReadinessModel: payload.proofChain.plan334.satellite_readiness_model ?? {}
    });
  }

  if (routePath === 'safety') {
    const payload = basePayload('safety');
    return NextResponse.json({
      ...payload,
      hardBlocks: payload.proofChain.plan334.hard_blocks ?? [],
      forbiddenRoutes: payload.proofChain.interface335.forbidden_routes ?? []
    });
  }

  if (routePath === 'probes') {
    const payload = basePayload('probes');
    return NextResponse.json({
      ...payload,
      passiveProbeSummary: payload.proofChain.plan334.passive_probe_summary ?? {}
    });
  }

  const payload = basePayload('summary');
  return NextResponse.json({
    ...payload,
    summary: {
      page: '/phone-satellite',
      apiBase: '/api/phone-satellite',
      targetAsset: 'Leonard Galaxy Z Fold6',
      status: 'LOCKED_GET_ONLY_DRAFT_UI',
      adbInvoked: false,
      bluetoothPairingPerformed: false,
      tailscaleInstalled: false,
      tailscaleUpPerformed: false,
      phoneControlPerformed: false,
      fileTransferPerformed: false,
      smsOrCallPerformed: false,
      cameraOrMicrophoneAccessed: false,
      physicalActionLanePerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_NO_ADB_NO_PAIRING_NO_TAILSCALE_NO_PHONE_CONTROL', safety: lockedSafety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_NO_ADB_NO_PAIRING_NO_TAILSCALE_NO_PHONE_CONTROL', safety: lockedSafety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_NO_ADB_NO_PAIRING_NO_TAILSCALE_NO_PHONE_CONTROL', safety: lockedSafety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_NO_ADB_NO_PAIRING_NO_TAILSCALE_NO_PHONE_CONTROL', safety: lockedSafety() }, { status: 423 });
}