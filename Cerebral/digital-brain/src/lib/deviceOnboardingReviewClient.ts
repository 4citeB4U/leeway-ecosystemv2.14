export type DeviceOnboardingSummary = {
  ok: boolean;
  mode: string;
  noExecution: boolean;
  noPostRoutes: boolean;
  clearSkies: boolean;
  totals: {
    network: number;
    bluetooth: number;
    printers: number;
    queue: number;
  };
  assets: {
    network: any[];
    bluetooth: any[];
    printers: any[];
  };
  queue: any[];
  safety: Record<string, boolean>;
  phase39?: any;
  contract?: any;
  bridgePlan?: any;
  enrichment?: any;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch("/api/device-onboarding/" + path, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Device onboarding read failed: " + response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchDeviceOnboardingSummary(): Promise<DeviceOnboardingSummary> {
  return getJson<DeviceOnboardingSummary>("summary");
}

export async function fetchNetworkAssets(): Promise<{ ok: boolean; assets: any[] }> {
  return getJson<{ ok: boolean; assets: any[] }>("assets/network");
}

export async function fetchBluetoothAssets(): Promise<{ ok: boolean; assets: any[] }> {
  return getJson<{ ok: boolean; assets: any[] }>("assets/bluetooth");
}

export async function fetchPrinterAssets(): Promise<{ ok: boolean; assets: any[] }> {
  return getJson<{ ok: boolean; assets: any[] }>("assets/printers");
}

export async function fetchOnboardingQueue(): Promise<{ ok: boolean; queue: any[] }> {
  return getJson<{ ok: boolean; queue: any[] }>("queue");
}