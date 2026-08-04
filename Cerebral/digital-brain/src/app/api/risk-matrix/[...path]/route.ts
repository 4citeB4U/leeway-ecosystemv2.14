import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const riskMatrix = [
  { actionFamily: 'read_only_status', riskLevel: 'LOW', futureContractRequired: true, allowedWithoutUnlock: true },
  { actionFamily: 'ui_navigation_patch', riskLevel: 'LOW_MEDIUM', futureContractRequired: true, allowedWithoutUnlock: true },
  { actionFamily: 'report_generation', riskLevel: 'LOW', futureContractRequired: true, allowedWithoutUnlock: true },
  { actionFamily: 'identity_review_state_save', riskLevel: 'MEDIUM', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'single_use_real_alpha_action', riskLevel: 'HIGH', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'printer_action', riskLevel: 'HIGH', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'phone_action', riskLevel: 'HIGH', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'router_action', riskLevel: 'CRITICAL', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'network_scan_or_port_scan', riskLevel: 'HIGH', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'bridge_or_protocol_translator_deploy', riskLevel: 'HIGH', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'authority_unlock', riskLevel: 'CRITICAL', futureContractRequired: true, allowedWithoutUnlock: false },
  { actionFamily: 'physical_action_lane', riskLevel: 'CRITICAL', futureContractRequired: true, allowedWithoutUnlock: false }
];

const draftState = {
  contractType: 'SINGLE_USE_APPROVAL_CONTRACT_DRAFT',
  draftOnly: true,
  approvedNow: false,
  unlockedNow: false,
  executionAuthorizedNow: false,
  physicalActionAuthorizedNow: false,
  draftedActionFamilies: 12
};

function safety() {
  return {
    locked: true,
    displayOnly: true,
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
    authority: 'GET_ONLY_RISK_MATRIX_NO_APPROVAL_NO_UNLOCK_NO_ACTION',
    page: '/risk-matrix',
    apiBase: '/api/risk-matrix',
    actionFamilies: riskMatrix.length,
    draftedActionFamilies: draftState.draftedActionFamilies,
    criticalFamilies: riskMatrix.filter((x) => x.riskLevel === 'CRITICAL').length,
    safety: safety()
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const routePath = (params.path ?? ['summary']).join('/');

  if (routePath === 'families') {
    return NextResponse.json({ ...basePayload('families'), families: riskMatrix });
  }

  if (routePath === 'draft') {
    return NextResponse.json({ ...basePayload('draft'), draft: draftState });
  }

  if (routePath === 'safety') {
    return NextResponse.json({ ok: true, route: 'safety', locked: true, authority: 'GET_ONLY_RISK_MATRIX_NO_APPROVAL_NO_UNLOCK_NO_ACTION', safety: safety() });
  }

  if (routePath === 'proof-chain') {
    return NextResponse.json({
      ...basePayload('proof-chain'),
      proofChain: {
        uiContract: 'LEEWAY_PHASE_46_RISK_MATRIX_UI_CONTRACT_374_NO_EXECUTE_CLEAN',
        singleUseDraft: 'LEEWAY_PHASE_46_SINGLE_USE_APPROVAL_CONTRACT_DRAFT_FINAL_SUMMARY_373_CLEAN',
        riskMatrix: 'LEEWAY_PHASE_46_ACTION_FAMILY_RISK_MATRIX_FINAL_SUMMARY_371_CLEAN',
        masterCloseout: 'LEEWAY_DEVICE_LAYER_LINKS_MASTER_CLOSEOUT_369_CLEAN',
        hold: 'LEEWAY_PHASE_45_DEVICE_LAYER_HOLD_AND_LOCK_FINAL_SUMMARY_358_CLEAN'
      }
    });
  }

  return NextResponse.json({
    ...basePayload('summary'),
    summary: {
      status: 'LIVE_GET_ONLY_RISK_MATRIX_NO_ACTION',
      actionFamilies: riskMatrix.length,
      criticalFamilies: riskMatrix.filter((x) => x.riskLevel === 'CRITICAL').length,
      deniedByDefault: 13,
      approvalGranted: false,
      authorityUnlocked: false,
      executionPerformed: false,
      deviceControlPerformed: false,
      physicalActionLanePerformed: false
    }
  });
}

export async function POST() {
  return NextResponse.json({ ok: false, locked: true, error: 'POST_BLOCKED_RISK_MATRIX_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, locked: true, error: 'PUT_BLOCKED_RISK_MATRIX_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}

export async function PATCH() {
  return NextResponse.json({ ok: false, locked: true, error: 'PATCH_BLOCKED_RISK_MATRIX_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, locked: true, error: 'DELETE_BLOCKED_RISK_MATRIX_NO_APPROVAL_NO_UNLOCK_NO_EXECUTION_NO_PHYSICAL_ACTION', safety: safety() }, { status: 423 });
}