export type DeviceReadinessApiResponse<T = any> = {
  ok: boolean;
  source?: string;
  route?: string;
  writeScope?: string;
  executionAuthorized?: boolean;
  deviceControlAuthorized?: boolean;
  onboardingAuthorized?: boolean;
  pairingAuthorized?: boolean;
  protocolTranslatorAuthorized?: boolean;
  iotBridgeAuthorized?: boolean;
  physicalActionAuthorized?: boolean;
  data?: T;
  error?: string;
  message?: string;
};

async function getDeviceReadiness<T>(path: string): Promise<DeviceReadinessApiResponse<T>> {
  const response = await fetch(`/api/device-readiness/${path}`, {
    method: "GET",
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok) {
    return { ok: false, error: payload?.error || "device_readiness_request_failed", message: payload?.message };
  }

  return payload;
}

export function getDeviceReadinessSummary() {
  return getDeviceReadiness("summary");
}

export function getDeviceReadinessGroups() {
  return getDeviceReadiness("groups");
}

export function getDeviceReadinessProtocolCandidateDrafts() {
  return getDeviceReadiness("protocol-candidate-drafts");
}

export function getDeviceReadinessSafety() {
  return getDeviceReadiness("safety");
}

export function getDeviceReadinessRecommendations() {
  return getDeviceReadiness("recommendations");
}
