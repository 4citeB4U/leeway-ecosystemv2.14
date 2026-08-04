export const dynamic = "force-dynamic";

const payload = {
  ok: true,
  name: "Android Samsung Continuity Summary",
  route: "/api/android-samsung-continuity/summary",
  purpose: "Return locked Android/Samsung continuity summary.",
  locked: true,
  contractOnly: true,
  noExecute: true,
  approvalGranted: false,
  authorityUnlocked: false,
  executionAuthorized: false,
  deviceControlAuthorized: false,
  physicalActionAuthorized: false,
  patchLane: "391 locked stub creation",
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
  },
  data: {"adbBlocked":true,"dexBlocked":true,"smartViewBlocked":true,"quickShareBlocked":true}
};

export async function GET() {
  return Response.json(payload, { status: 200 });
}

export async function POST() {
  return Response.json({
    ok: false,
    locked: true,
    status: 423,
    reason: "Device Continuity route is locked. Future owner-approved single-use unlock contract required.",
    approvalGranted: false,
    authorityUnlocked: false,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    physicalActionAuthorized: false
  }, { status: 423 });
}
