import { NextResponse } from 'next/server';

export async function GET() {
  const runtimeFabricUrl = process.env.LEEWAY_RUNTIME_FABRIC_URL || 'http://127.0.0.1:4001';
  const localDeviceBridgeUrl = process.env.LOCAL_DEVICE_BRIDGE_URL || null;

  const config = {
    runtimeFabricUrl,
    localDeviceBridgeUrl,
    localDeviceBridgeConfigured: Boolean(localDeviceBridgeUrl),
    localDeviceBridgeApiKeyConfigured: Boolean(process.env.LOCAL_DEVICE_BRIDGE_API_KEY),
    endpoints: {
      health: '/runtime/health',
      runtimeStatus: '/runtime/status',
      terminalStatus: '/terminal/status',
      terminalSessions: '/terminal/sessions',
      devices: '/devices',
      wslStatus: '/device/wsl/status',
      wslStart: '/device/wsl/start',
      deviceTags: '/device-tags',
      protocols: '/protocols',
      commandPlan: '/command/plan',
      commandExecute: '/command/execute',
      commandReceipts: '/receipts/commands',
      localWorkerStatus: '/local-worker/status',
    },
  };

  return NextResponse.json({
    ...config,
    localDeviceBridgeApiKeyConfigured: Boolean(process.env.LOCAL_DEVICE_BRIDGE_API_KEY),
  });
}