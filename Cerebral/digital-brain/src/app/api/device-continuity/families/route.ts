export const dynamic = "force-dynamic";

const payload = {
  ok: true,
  name: "Device Continuity Families",
  route: "/api/device-continuity/families",
  purpose: "Return 14 continuity families from 388.",
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
  data: {"families":14,"source":"388-device-continuity-expansion-contract"}
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
