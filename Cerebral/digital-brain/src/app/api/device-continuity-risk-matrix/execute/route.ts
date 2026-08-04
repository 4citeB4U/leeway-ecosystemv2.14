export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    name: "Device Continuity Risk Matrix Execute Lock",
    route: "/api/device-continuity-risk-matrix/execute",
    locked: true,
    contractOnly: true,
    noExecute: true,
    approvalGranted: false,
    authorityUnlocked: false,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    physicalActionAuthorized: false,
    message: "Execution route exists only to prove lock behavior."
  }, { status: 200 });
}

export async function POST() {
  return Response.json({
    ok: false,
    locked: true,
    status: 423,
    reason: "LOCKED. No Device Continuity execution is authorized in this lane.",
    approvalRequired: true,
    approvalGranted: false,
    authorityUnlocked: false,
    executionAuthorized: false,
    deviceControlAuthorized: false,
    physicalActionAuthorized: false,
    blockedActions: [
      "adb_pair",
      "adb_connect",
      "scrcpy_control",
      "dex_launch",
      "smart_view_cast",
      "smartthings_action",
      "apple_control",
      "quick_share_transfer",
      "bluetooth_pairing",
      "screen_recording",
      "camera_activation",
      "microphone_activation",
      "network_scan",
      "port_scan",
      "physical_action"
    ]
  }, { status: 423 });
}
