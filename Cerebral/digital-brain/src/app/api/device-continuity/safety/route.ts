export const dynamic = "force-dynamic";

const payload = {
  ok: true,
  name: "Device Continuity Safety",
  route: "/api/device-continuity/safety",
  purpose: "Return hard safety flags for Device Continuity.",
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
  data: {"noAdb":true,"noDex":true,"noSmartThingsControl":true,"noScreenRecording":true,"noPhysicalAction":true}
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
