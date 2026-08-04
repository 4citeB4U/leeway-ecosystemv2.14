import { NextResponse } from 'next/server';
import fs from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const ROOT = 'E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4';
const CONTRACT_340 = ROOT + '\\\\runtime\\\\phase-44-router-read-only-status-contract\\\\latest\\\\phase-44-router-read-only-status-contract-latest.json';
const PLAN_341 = ROOT + '\\\\runtime\\\\phase-44-router-read-only-status-readiness-plan\\\\latest\\\\phase-44-router-read-only-status-readiness-plan-latest.json';
const INTERFACE_342 = ROOT + '\\\\runtime\\\\phase-44-router-read-only-status-interface-contract\\\\latest\\\\phase-44-router-read-only-status-interface-contract-latest.json';
const UI_CONTRACT_343 = ROOT + '\\\\runtime\\\\phase-44-router-read-only-status-get-only-ui-contract\\\\latest\\\\phase-44-router-read-only-status-get-only-ui-contract-latest.json';

function lockedSafety() {
  return {
    locked: true,
    getOnly: true,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    routerLoginAuthorized: false,
    credentialUseAuthorized: false,
    adminPageAccessAuthorized: false,
    networkScanAuthorized: false,
    portScanAuthorized: false,
    configReadAuthorized: false,
    configMutationAuthorized: false,
    rebootAuthorized: false,
    firmwareUpdateAuthorized: false,
    wifiMutationAuthorized: false,
    dnsMutationAuthorized: false,
    dhcpMutationAuthorized: false,
    firewallMutationAuthorized: false,
    snmpAuthorized: false,
    upnpAuthorized: false,
    mqttPublishAuthorized: false,
    protocolTranslatorAuthorized: false,
    iotBridgeAuthorized: false,
    physicalActionAuthorized: false,
    noRouterLogin: true,
    noCredentials: true,
    noAdminPage: true,
    noNetworkScan: true,
    noPortScan: true,
    noConfigRead: true,
    noConfigMutation: true,
    noReboot: true,
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
  const contract340 = readJson(CONTRACT_340);
  const plan341 = readJson(PLAN_341);
  const interface342 = readJson(INTERFACE_342);
  const uiContract343 = readJson(UI_CONTRACT_343);
  return {
    ok: true,
    route,
    locked: true,
    interface: 'router-read-only-status',
    targetAsset: 'SAX2V1S Home Router',
    alternateAsset: 'SAX2V1S.lan',
    authority: 'LOCKED_READ_ONLY_DRAFT_NO_EXECUTE',
    safety: lockedSafety(),
    proofChain: { contract340, plan341, interface342, uiContract343 }
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'readiness') {
    const payload = basePayload('readiness');
    return NextResponse.json({
      ...payload,
      readiness: payload.proofChain.plan341.readiness_checklist ?? [],
      routerReadinessModel: payload.proofChain.plan341.router_readiness_model ?? {}
    });
  }

  if (routePath === 'passive-network') {
    const payload = basePayload('passive-network');
    return NextResponse.json({
      ...payload,
      passiveNetwork: payload.proofChain.plan341.passive_probe_summary ?? {}
    });
  }

  if (routePath === 'safety') {
    const payload = basePayload('safety');
    return NextResponse.json({
      ...payload,
      hardBlocks: payload.proofChain.plan341.hard_blocks ?? [],
      forbiddenRoutes: payload.proofChain.interface342.forbidden_routes ?? []
    });
  }

  const payload = basePayload('summary');
  return NextResponse.json({
    ...payload,
    summary: {
      page: '/router-status',
      apiBase: '/api/router-status',
      targetAsset: 'SAX2V1S Home Router',
      alternateAsset: 'SAX2V1S.lan',
      status: 'LOCKED_GET_ONLY_DRAFT_UI',
      routerLoginPerformed: false,
      routerCredentialsUsed: false,
      routerAdminPageOpened: false,
      routerConfigRead: false,
      routerConfigMutated: false,
      routerRebooted: false,
      networkScanPerformed: false,
      portScanPerformed: false,
      protocolTranslatorDeployed: false,
      physicalActionLanePerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_NO_ROUTER_LOGIN_NO_SCAN_NO_CONFIG_CHANGE_NO_CONTROL', safety: lockedSafety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_NO_ROUTER_LOGIN_NO_SCAN_NO_CONFIG_CHANGE_NO_CONTROL', safety: lockedSafety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_NO_ROUTER_LOGIN_NO_SCAN_NO_CONFIG_CHANGE_NO_CONTROL', safety: lockedSafety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_NO_ROUTER_LOGIN_NO_SCAN_NO_CONFIG_CHANGE_NO_CONTROL', safety: lockedSafety() }, { status: 423 });
}