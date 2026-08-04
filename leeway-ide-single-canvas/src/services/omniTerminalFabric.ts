/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: RUNTIME
 * TAG: RUNTIME.OMNI_TERMINAL.TRUTH_CLIENT
 * PURPOSE: Truth-bound IDE client for LeeWay Omni-Terminal Fabric status, sessions, devices, command plans, and receipts.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Omni-Terminal Fabric status and command-plan client
 * WHY = Prevent fake terminal/device readiness while exposing honest Runtime Fabric state to the IDE
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/services/omniTerminalFabric.ts
 * WHEN = 2026-06-07
 * HOW = Same-origin Runtime Fabric proxy calls with explicit required/not-connected fallback states
 *
 * CHAIN: Standards -> Runtime Truth -> Omni-Terminal -> IDE Nodes -> Receipts
 * LICENSE: PROPRIETARY
 */

import {
  extractArrayPayload,
  loadRuntimeConnectionSnapshot,
  probeById,
} from "./runtimeConnectionService";
import type { RuntimeEndpointProbe } from "./runtimeConnectionService";

export type OmniTerminalTruthCode =
  | "RUNTIME_CONNECTED"
  | "RUNTIME_FABRIC_UNREACHABLE"
  | "OMNI_TERMINAL_FABRIC_REQUIRED"
  | "OMNI_TERMINAL_BOUND"
  | "OMNI_TERMINAL_HEALTHY"
  | "OMNI_TERMINAL_DEGRADED"
  | "LOCAL_DEVICE_BRIDGE_REQUIRED"
  | "NO_DEVICE_BRIDGE_CONNECTED"
  | "NO_TERMINAL_SESSIONS"
  | "NO_DEVICE_REGISTRY_BOUND"
  | "COMMAND_PLAN_REQUIRED"
  | "COMMAND_RECEIPT_REQUIRED"
  | "COMMAND_APPROVAL_REQUIRED"
  | "COMMAND_BLOCKED_BY_POLICY";

export type ProtocolBridgeState =
  | "Available"
  | "Connected"
  | "Bridge Required"
  | "Permission Required"
  | "Disabled"
  | "Error";

export interface OmniTerminalProtocolStatus {
  id: string;
  label: string;
  status: ProtocolBridgeState;
  code: OmniTerminalTruthCode;
  details: string;
}

export interface OmniTerminalSession {
  sessionId: string;
  label: string;
  protocol: string;
  tag: string;
  status: string;
  heartbeat?: string;
  cwd?: string;
  activeCommand?: string;
  lastOutput?: string;
  permissionLevel?: string;
  receiptStatus?: string;
}

export interface OmniTerminalDeviceRecord {
  deviceId: string;
  displayName: string;
  protocol: string;
  tags: string[];
  connectionStatus: string;
  manufacturer?: string;
  model?: string;
  capabilities?: string[];
  allowedActions?: string[];
  blockedActions?: string[];
  lastSeen?: string;
  lastReceipt?: string;
  trustLevel?: string;
}

export interface OmniTerminalDeviceTag {
  tag: string;
  deviceCount: number;
  defaultProtocol: string;
  allowedActions: string[];
  approvalMode: string;
}

export interface OmniTerminalReceiptSummary {
  receiptId: string;
  status: string;
  timestamp?: string;
  riskLevel?: string;
}

export interface OmniTerminalSnapshot {
  runtimeEndpoint: string;
  localDeviceBridgeEndpoint?: string | null;
  runtimeStatus: OmniTerminalTruthCode;
  terminalFabricStatus: OmniTerminalTruthCode;
  localBridgeStatus: OmniTerminalTruthCode;
  sessionStatus: OmniTerminalTruthCode;
  deviceRegistryStatus: OmniTerminalTruthCode;
  defaultApprovalMode: "default" | "required" | "manual-only";
  activeSessionCount: number;
  deviceRegistryCount: number;
  deviceTagCount: number;
  blockedCommandCount: number;
  approvalQueueCount: number;
  lastCommand: string;
  lastReceipt?: OmniTerminalReceiptSummary;
  protocols: OmniTerminalProtocolStatus[];
  sessions: OmniTerminalSession[];
  devices: OmniTerminalDeviceRecord[];
  tags: OmniTerminalDeviceTag[];
  endpointsChecked: RuntimeEndpointProbe[];
  updatedAt: string;
  details: string;
}

export interface OmniTerminalCommandPlanRequest {
  prompt: string;
  source: "agent-lee-overlay" | "console-panel" | "node";
  nodeId?: string;
  targetTag?: string;
  targetDeviceId?: string;
}

export interface OmniTerminalCommandPlanResult {
  ok: boolean;
  status: OmniTerminalTruthCode;
  plan?: Record<string, any>;
  receipt?: OmniTerminalReceiptSummary;
  details: string;
}

export interface OmniTerminalCommandExecutionResult {
  ok: boolean;
  status: OmniTerminalTruthCode;
  receipt?: OmniTerminalReceiptSummary;
  payload?: Record<string, any>;
  details: string;
}

export const OMNI_TERMINAL_NODE_ID = "LEEWAY_APP::IDE_SINGLE_CANVAS::OMNI_TERMINAL::TRUTH_CLIENT";

const runtimeProxyBase = "/api/leeway/runtime-fabric";

const requiredProtocols: Array<{ id: string; label: string }> = [
  { id: "local-shell", label: "Local Shell" },
  { id: "ssh", label: "SSH" },
  { id: "adb", label: "ADB" },
  { id: "serial", label: "Serial" },
  { id: "ble", label: "BLE" },
  { id: "hid", label: "HID" },
  { id: "printer", label: "Printer" },
  { id: "mqtt", label: "MQTT" },
  { id: "docker", label: "Docker" },
  { id: "browser-automation", label: "Browser Automation" },
];

export function createRequiredOmniTerminalSnapshot(reason = "Runtime Fabric status has not been loaded."): OmniTerminalSnapshot {
  const now = new Date().toISOString();

  return {
    runtimeEndpoint: runtimeProxyBase,
    runtimeStatus: "RUNTIME_FABRIC_UNREACHABLE",
    terminalFabricStatus: "OMNI_TERMINAL_FABRIC_REQUIRED",
    localBridgeStatus: "LOCAL_DEVICE_BRIDGE_REQUIRED",
    sessionStatus: "NO_TERMINAL_SESSIONS",
    deviceRegistryStatus: "NO_DEVICE_REGISTRY_BOUND",
    defaultApprovalMode: "required",
    activeSessionCount: 0,
    deviceRegistryCount: 0,
    deviceTagCount: 0,
    blockedCommandCount: 0,
    approvalQueueCount: 0,
    lastCommand: "No command executed",
    protocols: requiredProtocols.map((protocol) => ({
      ...protocol,
      status: protocol.id === "sdr" ? "Disabled" : "Bridge Required",
      code: protocol.id === "sdr" ? "COMMAND_BLOCKED_BY_POLICY" : "LOCAL_DEVICE_BRIDGE_REQUIRED",
      details: protocol.id === "sdr"
        ? "SDR transmit remains blocked unless explicitly enabled by policy and approval."
        : "No Runtime Fabric protocol adapter has reported this bridge as connected.",
    })),
    sessions: [],
    devices: [],
    tags: [],
    endpointsChecked: [],
    updatedAt: now,
    details: reason,
  };
}

async function fetchJson(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; payload: any; text: string }> {
  const response = await fetch(`${runtimeProxyBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { text };
  }
  return { ok: response.ok, status: response.status, payload, text };
}

function normalizeProtocolStatus(input: any): OmniTerminalProtocolStatus[] {
  const byId = new Map<string, any>();
  const source = Array.isArray(input) ? input : Array.isArray(input?.protocols) ? input.protocols : [];

  source.forEach((item: any) => {
    const id = String(item.id ?? item.protocol ?? item.key ?? "").trim();
    if (id) byId.set(id, item);
  });

  return requiredProtocols.map((protocol) => {
    const item = byId.get(protocol.id);
    if (!item) {
      return {
        ...protocol,
        status: protocol.id === "sdr" ? "Disabled" : "Bridge Required",
        code: protocol.id === "sdr" ? "COMMAND_BLOCKED_BY_POLICY" : "LOCAL_DEVICE_BRIDGE_REQUIRED",
        details: "Protocol adapter has not reported a bound status.",
      };
    }

    const rawStatus = String(item.status ?? item.state ?? "").toLowerCase();
    const connected = rawStatus.includes("connected") || rawStatus.includes("healthy") || rawStatus.includes("online");
    const available = rawStatus.includes("available") || rawStatus.includes("bound");
    const permission = rawStatus.includes("permission");
    const disabled = rawStatus.includes("disabled") || rawStatus.includes("blocked");

    return {
      ...protocol,
      status: connected ? "Connected" : available ? "Available" : permission ? "Permission Required" : disabled ? "Disabled" : "Bridge Required",
      code: connected ? "OMNI_TERMINAL_HEALTHY" : available ? "OMNI_TERMINAL_BOUND" : permission ? "COMMAND_APPROVAL_REQUIRED" : disabled ? "COMMAND_BLOCKED_BY_POLICY" : "LOCAL_DEVICE_BRIDGE_REQUIRED",
      details: item.details ?? item.message ?? "Protocol adapter status reported by Runtime Fabric.",
    };
  });
}

function normalizeReceiptSummary(input: any): OmniTerminalReceiptSummary | undefined {
  if (!input) return undefined;
  const receiptId = input.receiptId ?? input.id ?? input.commandReceiptId ?? input.path ?? input.name;
  if (!receiptId) return undefined;
  return {
    receiptId: String(receiptId),
    status: String(input.status ?? input.result ?? input.state ?? "RECEIPT_REPORTED"),
    timestamp: input.timestamp ?? input.createdAt ?? input.modifiedAt,
    riskLevel: input.riskLevel ?? input.risk,
  };
}

function normalizeSession(input: any, index: number): OmniTerminalSession {
  return {
    sessionId: String(input.sessionId ?? input.id ?? `runtime-session-${index}`),
    label: String(input.label ?? input.name ?? input.title ?? `Runtime Session ${index + 1}`),
    protocol: String(input.protocol ?? input.shell ?? input.type ?? "unknown"),
    tag: String(input.tag ?? input.targetTag ?? "runtime"),
    status: String(input.status ?? input.state ?? "RUNTIME_CONNECTED"),
    heartbeat: input.heartbeat ?? input.lastHeartbeatAt ?? input.updatedAt,
    cwd: input.cwd ?? input.workingDirectory,
    activeCommand: input.activeCommand,
    lastOutput: input.lastOutput ?? input.output,
    permissionLevel: input.permissionLevel ?? input.permissions,
    receiptStatus: input.receiptStatus ?? input.lastReceipt?.status ?? "COMMAND_RECEIPT_REQUIRED",
  };
}

function normalizeDevice(input: any, index: number): OmniTerminalDeviceRecord {
  return {
    deviceId: String(input.deviceId ?? input.id ?? `runtime-device-${index}`),
    displayName: String(input.displayName ?? input.name ?? input.label ?? `Runtime Device ${index + 1}`),
    protocol: String(input.protocol ?? input.kind ?? input.type ?? "unknown"),
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    connectionStatus: String(input.connectionStatus ?? input.status ?? input.state ?? "RUNTIME_CONNECTED"),
    manufacturer: input.manufacturer,
    model: input.model,
    capabilities: Array.isArray(input.capabilities) ? input.capabilities.map(String) : [],
    allowedActions: Array.isArray(input.allowedActions) ? input.allowedActions.map(String) : [],
    blockedActions: Array.isArray(input.blockedActions) ? input.blockedActions.map(String) : [],
    lastSeen: input.lastSeen ?? input.lastHeartbeatAt ?? input.updatedAt,
    lastReceipt: input.lastReceipt ?? input.receiptId,
    trustLevel: input.trustLevel,
  };
}

function normalizeTag(input: any, index: number): OmniTerminalDeviceTag {
  return {
    tag: String(input.tag ?? input.id ?? input.name ?? `tag-${index + 1}`),
    deviceCount: Number(input.deviceCount ?? input.count ?? input.devices?.length ?? 0),
    defaultProtocol: String(input.defaultProtocol ?? input.protocol ?? "runtime"),
    allowedActions: Array.isArray(input.allowedActions) ? input.allowedActions.map(String) : [],
    approvalMode: String(input.approvalMode ?? input.approval ?? "required"),
  };
}

export async function loadOmniTerminalSnapshot(): Promise<OmniTerminalSnapshot> {
  const fallback = createRequiredOmniTerminalSnapshot("Runtime Fabric health endpoint is unreachable.");

  try {
    const connection = await loadRuntimeConnectionSnapshot();
    if (!connection.runtimeReachable) {
      return {
        ...fallback,
        runtimeEndpoint: connection.config.runtimeFabricUrl,
        localDeviceBridgeEndpoint: connection.config.localDeviceBridgeUrl,
        runtimeStatus: "RUNTIME_FABRIC_UNREACHABLE",
        endpointsChecked: connection.probes,
        details: connection.details,
        updatedAt: new Date().toISOString(),
      };
    }

    const terminalProbe = probeById(connection, "terminalStatus");
    const sessionsProbe = probeById(connection, "terminalSessions");
    const devicesProbe = probeById(connection, "devices");
    const tagsProbe = probeById(connection, "deviceTags");
    const protocolsProbe = probeById(connection, "protocols");
    const receiptsProbe = probeById(connection, "commandReceipts");
    const terminalPayload = terminalProbe?.ok ? terminalProbe.payload : null;
    const protocolPayload = protocolsProbe?.ok ? protocolsProbe.payload : terminalPayload;
    const normalizedSessions = sessionsProbe?.ok ? extractArrayPayload(sessionsProbe.payload, "sessions").map(normalizeSession) : [];
    const normalizedDevices = devicesProbe?.ok ? extractArrayPayload(devicesProbe.payload, "devices").map(normalizeDevice) : [];
    const normalizedTags = tagsProbe?.ok ? extractArrayPayload(tagsProbe.payload, "tags").map(normalizeTag) : [];
    const normalizedReceipts = receiptsProbe?.ok ? extractArrayPayload(receiptsProbe.payload, "receipts").map(normalizeReceiptSummary).filter(Boolean) as OmniTerminalReceiptSummary[] : [];
    const fabricOnline = Boolean(terminalProbe?.ok);
    const lastReceipt = normalizeReceiptSummary(terminalPayload?.lastReceipt)
      ?? normalizeReceiptSummary(receiptsProbe?.payload?.lastReceipt)
      ?? normalizedReceipts[0];

    return {
      ...fallback,
      runtimeEndpoint: connection.config.runtimeFabricUrl,
      localDeviceBridgeEndpoint: connection.config.localDeviceBridgeUrl,
      runtimeStatus: "RUNTIME_CONNECTED",
      terminalFabricStatus: fabricOnline ? (terminalPayload.status ?? "OMNI_TERMINAL_BOUND") : "OMNI_TERMINAL_FABRIC_REQUIRED",
      localBridgeStatus: connection.localDeviceBridgeStatus as OmniTerminalTruthCode,
      sessionStatus: normalizedSessions.length > 0 ? "OMNI_TERMINAL_BOUND" : "NO_TERMINAL_SESSIONS",
      deviceRegistryStatus: normalizedDevices.length > 0 ? "OMNI_TERMINAL_BOUND" : "NO_DEVICE_REGISTRY_BOUND",
      defaultApprovalMode: terminalPayload?.defaultApprovalMode ?? "required",
      activeSessionCount: Number(terminalPayload?.activeSessionCount ?? normalizedSessions.length),
      deviceRegistryCount: Number(terminalPayload?.deviceRegistryCount ?? normalizedDevices.length),
      deviceTagCount: Number(terminalPayload?.deviceTagCount ?? normalizedTags.length),
      blockedCommandCount: Number(terminalPayload?.blockedCommandCount ?? 0),
      approvalQueueCount: Number(terminalPayload?.approvalQueueCount ?? 0),
      lastCommand: terminalPayload?.lastCommand ?? (lastReceipt ? "Last command receipt reported by Runtime Fabric." : "No command receipt reported"),
      lastReceipt,
      protocols: normalizeProtocolStatus(protocolPayload ?? terminalPayload),
      sessions: normalizedSessions,
      devices: normalizedDevices,
      tags: normalizedTags,
      endpointsChecked: connection.probes,
      updatedAt: new Date().toISOString(),
      details: fabricOnline
        ? "Runtime Fabric is reachable. Omni-Terminal status is sourced from Runtime Fabric endpoints."
        : "Runtime Fabric is reachable, but Omni-Terminal endpoints are not bound.",
    };
  } catch (error: any) {
    return {
      ...fallback,
      details: error?.message ?? "Runtime Fabric health check failed.",
      updatedAt: new Date().toISOString(),
    };
  }
}

export function isOmniTerminalCommandPlanApproved(plan?: Record<string, any>): boolean {
  if (!plan) return false;
  const values = [
    plan.approved,
    plan.isApproved,
    plan.approvalStatus,
    plan.approval?.approved,
    plan.approval?.status,
    plan.governance?.approvalStatus,
  ].map((value) => String(value ?? "").toLowerCase());

  return values.some((value) => value === "true" || value === "approved" || value === "approval_granted" || value === "command_approved");
}

export async function requestOmniTerminalCommandPlan(request: OmniTerminalCommandPlanRequest): Promise<OmniTerminalCommandPlanResult> {
  try {
    const response = await fetchJson("/command/plan", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        requiresReceipt: true,
        sourceSurface: "leeway-ide-single-canvas",
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 404 ? "OMNI_TERMINAL_FABRIC_REQUIRED" : "COMMAND_PLAN_REQUIRED",
        details: response.payload?.details ?? response.payload?.error ?? "Runtime Fabric command plan endpoint is not available.",
      };
    }

    return {
      ok: true,
      status: response.payload?.status ?? "COMMAND_APPROVAL_REQUIRED",
      plan: response.payload?.plan ?? response.payload,
      receipt: normalizeReceiptSummary(response.payload?.receipt),
      details: response.payload?.details ?? "Command plan returned by Runtime Fabric. Execution still requires approval and receipt.",
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "OMNI_TERMINAL_FABRIC_REQUIRED",
      details: error?.message ?? "Runtime Fabric command plan request failed.",
    };
  }
}

export async function requestOmniTerminalCommandExecution(plan: Record<string, any>, sourceNodeId?: string): Promise<OmniTerminalCommandExecutionResult> {
  if (!isOmniTerminalCommandPlanApproved(plan)) {
    return {
      ok: false,
      status: "COMMAND_APPROVAL_REQUIRED",
      details: "Command execution blocked. Runtime Fabric has not reported this plan as approved.",
    };
  }

  try {
    const response = await fetchJson("/command/execute", {
      method: "POST",
      body: JSON.stringify({
        plan,
        planId: plan.planId ?? plan.id,
        sourceNodeId,
        requiresReceipt: true,
        sourceSurface: "leeway-ide-single-canvas",
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 404 ? "OMNI_TERMINAL_FABRIC_REQUIRED" : "COMMAND_RECEIPT_REQUIRED",
        details: response.payload?.details ?? response.payload?.error ?? "Runtime Fabric command execution endpoint is not available.",
      };
    }

    const receipt = normalizeReceiptSummary(response.payload?.receipt ?? response.payload?.commandReceipt ?? response.payload);
    if (!receipt) {
      return {
        ok: false,
        status: "COMMAND_RECEIPT_REQUIRED",
        payload: response.payload,
        details: "Runtime Fabric responded without a command receipt. Agent Lee will not claim the command ran.",
      };
    }

    return {
      ok: true,
      status: receipt.status as OmniTerminalTruthCode,
      receipt,
      payload: response.payload,
      details: "Runtime Fabric returned a command receipt. Execution may be reported as receipt-backed.",
    };
  } catch (error: any) {
    return {
      ok: false,
      status: "OMNI_TERMINAL_FABRIC_REQUIRED",
      details: error?.message ?? "Runtime Fabric command execution request failed.",
    };
  }
}

export function formatOmniTerminalSummary(snapshot: OmniTerminalSnapshot): string {
  return [
    `Runtime: ${snapshot.runtimeStatus}`,
    `Terminal Fabric: ${snapshot.terminalFabricStatus}`,
    `Local Bridge: ${snapshot.localBridgeStatus}`,
    `Sessions: ${snapshot.activeSessionCount} (${snapshot.sessionStatus})`,
    `Devices: ${snapshot.deviceRegistryCount} (${snapshot.deviceRegistryStatus})`,
    `Receipts: ${snapshot.lastReceipt?.receiptId ?? snapshot.lastCommand}`,
  ].join("\n");
}
