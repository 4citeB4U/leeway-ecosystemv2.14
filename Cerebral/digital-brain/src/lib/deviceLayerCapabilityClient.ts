export type DeviceLayerFamilyCard = { family: string; title: string; status: string; execution_default?: string; future_approval_required_actions?: string[]; };
export type DeviceLayerReadOnlyRoute = { method: "GET"; path: string; read_only: boolean; requires_approval: boolean; execution_allowed: boolean; };
export type DeviceLayerApprovalAction = { family: string; action: string; enabled: boolean; approval_required: boolean; execute_button_visible: boolean; };

export type DeviceLayerCapabilityMap = {
  ok: boolean;
  phase: number;
  mode: string;
  device_layer_status: string;
  completed_family_count: number;
  remaining_family_count: number;
  all_families_clean: boolean;
  all_read_only_routes_ok: boolean;
  read_only_route_count: number;
  family_cards: DeviceLayerFamilyCard[];
  read_only_routes: DeviceLayerReadOnlyRoute[];
  execution_enabled: boolean;
  execute_buttons_visible: boolean;
  physical_actions_executed: number;
};

export type DeviceLayerLockState = { ok: boolean; windows_locked: boolean; blocked_probe_executed: boolean; execution_enabled: boolean; execute_buttons_visible: boolean; post_execution_routes_added: boolean; physical_actions_executed: number; };
export type DeviceLayerFamiliesResponse = { ok: boolean; family_count: number; families: DeviceLayerFamilyCard[]; completed_family_count: number; remaining_family_count: number; execution_enabled: boolean; execute_buttons_visible: boolean; physical_actions_executed: number; };
export type DeviceLayerReadOnlyRoutesResponse = { ok: boolean; route_count: number; routes: DeviceLayerReadOnlyRoute[]; all_read_only_routes_ok: boolean; execution_enabled: boolean; execute_buttons_visible: boolean; physical_actions_executed: number; };
export type DeviceLayerApprovalRequiredActionsResponse = { ok: boolean; action_cards_visible: boolean; action_cards_enabled: boolean; execute_buttons_visible: boolean; approval_required: boolean; action_count: number; actions: DeviceLayerApprovalAction[]; execution_enabled: boolean; physical_actions_executed: number; };

const SAME_ORIGIN_DEVICE_LAYER_PROXY = "/api/device-layer";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(SAME_ORIGIN_DEVICE_LAYER_PROXY + path, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) { throw new Error("Device Layer GET failed: " + response.status + " " + response.statusText + " " + path); }
  return response.json() as Promise<T>;
}

export const deviceLayerCapabilityClient = {
  getCapabilityMap() { return getJson<DeviceLayerCapabilityMap>("/capability-map"); },
  getFamilies() { return getJson<DeviceLayerFamiliesResponse>("/families"); },
  getReadOnlyRoutes() { return getJson<DeviceLayerReadOnlyRoutesResponse>("/read-only-routes"); },
  getApprovalRequiredActions() { return getJson<DeviceLayerApprovalRequiredActionsResponse>("/approval-required-actions"); },
  getLockState() { return getJson<DeviceLayerLockState>("/lock-state"); },
};