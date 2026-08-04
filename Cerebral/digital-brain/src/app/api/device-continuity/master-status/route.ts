export const dynamic = "force-dynamic";

const payload = {
  ok: true,
  name: "Device Continuity Master Status",
  route: "/api/device-continuity/master-status",
  locked: true,
  contractOnly: false,
  lockedStatusSurface: true,
  noExecute: true,
  approvalGranted: false,
  authorityUnlocked: false,
  executionAuthorized: false,
  deviceControlAuthorized: false,
  physicalActionAuthorized: false,
  proofChain: {
    contract388: "LEEWAY_DEVICE_CONTINUITY_EXPANSION_CONTRACT_388_NO_EXECUTE_CLEAN",
    risk389: "LEEWAY_DEVICE_CONTINUITY_RISK_MATRIX_CONTRACT_389_NO_EXECUTE_CLEAN",
    stubs390: "LEEWAY_DEVICE_CONTINUITY_UI_API_STUBS_CONTRACT_390_NO_EXECUTE_CLEAN",
    created391: "LEEWAY_DEVICE_CONTINUITY_LOCKED_UI_API_STUBS_391_CREATED_CLEAN",
    index392: "LEEWAY_DEVICE_CONTINUITY_LOCKED_STUBS_INDEX_392_VERIFIED_CLEAN"
  },
  counts: {
    uiPages: 8,
    apiRoutes: 10,
    apiPostsBlocked: 10,
    criticalRiskFamilies: 5,
    highRiskFamilies: 8,
    mediumRiskFamilies: 1,
    lowRiskFamilies: 0
  },
  navLinks: [
    "/device-continuity",
    "/device-continuity-index",
    "/device-continuity-risk-matrix",
    "/android-samsung-continuity",
    "/wireless-debugging-locked-stub",
    "/smartthings-locked-stub",
    "/apple-continuity-locked-stub",
    "/display-casting-locked-stub"
  ],
  safety: {
    noAdb: true,
    noDex: true,
    noSmartView: true,
    noSmartThingsControl: true,
    noAppleControl: true,
    noBluetoothPairing: true,
    noQuickShare: true,
    noScreenRecording: true,
    noCamera: true,
    noMicrophone: true,
    noNetworkScan: true,
    noPortScan: true,
    noPhysicalAction: true
  }
};

export async function GET() {
  return Response.json(payload, { status: 200 });
}

export async function POST() {
  return Response.json({
    ok: false,
    locked: true,
    status: 423,
    reason: "LOCKED. Device Continuity master status is informational only. Execution requires a future owner-approved single-use unlock contract.",
    approvalRequired: true,
    approvalGranted: false,
    authorityUnlocked: false,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    physicalActionAuthorized: false
  }, { status: 423 });
}
