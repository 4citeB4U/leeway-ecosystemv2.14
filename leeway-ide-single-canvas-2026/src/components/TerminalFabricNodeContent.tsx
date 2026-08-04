/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.OMNI_TERMINAL.NODE_CONTENT
 * PURPOSE: Truth-bound Omni-Terminal Fabric node renderer for sessions, devices, command plans, receipts, monitors, and governance gates.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Terminal Fabric node content
 * WHY = Give Agent Lee and the owner a governed commandable device canvas without fake sessions or fake devices
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = leeway-ide-single-canvas/src/components/TerminalFabricNodeContent.tsx
 * WHEN = 2026-06-07
 * HOW = React node content backed by OmniTerminalSnapshot and custom command-plan events
 *
 * CHAIN: Standards -> Runtime Truth -> Terminal Fabric Nodes -> Command Plans -> Receipts
 * LICENSE: PROPRIETARY
 */

import { FormEvent, useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle, Clock, Cpu, Database, FileText, Radio, ShieldCheck, Terminal, Zap } from "lucide-react";
import { NodeInstance } from "../types/nodeTypes";
import { OmniTerminalSnapshot, createRequiredOmniTerminalSnapshot, isOmniTerminalCommandPlanApproved } from "../services/omniTerminalFabric";

interface TerminalFabricNodeContentProps {
  node: NodeInstance;
  runtimeSnapshot?: OmniTerminalSnapshot;
  onUpdate?: (id: string, updates: Partial<NodeInstance>) => void;
}

type TerminalNodeFamily = "session" | "device" | "command" | "monitor" | "governance";

const sessionTypes = new Set([
  "terminal.local-shell",
  "terminal.powershell",
  "terminal.bash",
  "terminal.cmd",
  "terminal.ssh",
  "terminal.adb",
  "terminal.serial-console",
  "terminal.docker-shell",
  "terminal.runtime-shell",
]);

const deviceTypes = new Set([
  "terminal.device-scanner",
  "terminal.device-registry",
  "terminal.device-tag-group",
  "terminal.printer-device",
  "terminal.ble-device",
  "terminal.usb-hid-device",
  "terminal.iot-device",
  "terminal.robot-device",
  "terminal.camera-device",
  "terminal.audio-device",
  "terminal.phone-device",
  "terminal.tv-device",
]);

const governanceTypes = new Set([
  "terminal.approval-gate",
  "terminal.risk-classifier",
  "terminal.policy-check",
  "terminal.receipt-validator",
  "terminal.sentinel-review",
  "terminal.rollback-plan",
]);

function nodeFamily(nodeType: string): TerminalNodeFamily {
  if (sessionTypes.has(nodeType)) return "session";
  if (deviceTypes.has(nodeType)) return "device";
  if (governanceTypes.has(nodeType)) return "governance";
  if (nodeType.includes("monitor")) return "monitor";
  return "command";
}

function statusColor(status: string) {
  if (status.includes("HEALTHY") || status.includes("CONNECTED") || status.includes("READY") || status.includes("ONLINE") || status === "Connected") return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (status.includes("REQUIRED") || status.includes("NO_") || status.includes("UNREACHABLE")) return "text-amber-300 border-amber-500/30 bg-amber-500/10";
  if (status.includes("BLOCKED") || status === "Disabled" || status === "Error") return "text-red-300 border-red-500/30 bg-red-500/10";
  return "text-slate-300 border-white/10 bg-white/5";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${statusColor(status)}`}>
      {status}
    </span>
  );
}

function planValue(plan: Record<string, any> | undefined, keys: string[], fallback: string) {
  if (!plan) return fallback;
  for (const key of keys) {
    const value = key.split(".").reduce((current: any, part) => current?.[part], plan);
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
      return String(value);
    }
  }
  return fallback;
}

function MetricCard({ label, value, status }: { label: string; value: string | number; status?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-white">{value}</p>
      {status && <p className="mt-1 truncate text-[9px] font-mono text-slate-500">{status}</p>}
    </div>
  );
}

export function TerminalFabricNodeContent({ node, runtimeSnapshot, onUpdate }: TerminalFabricNodeContentProps) {
  const snapshot = runtimeSnapshot ?? createRequiredOmniTerminalSnapshot();
  const [commandText, setCommandText] = useState("");
  const family = nodeFamily(node.type);
  const plan = node.data?.commandPlan as Record<string, any> | undefined;
  const receipt = node.data?.commandReceipt as Record<string, any> | undefined;
  const session = snapshot.sessions.find((item) => item.protocol?.toLowerCase().includes(node.title.toLowerCase().split(" ")[0]));
  const sessionStatus = snapshot.terminalFabricStatus === "OMNI_TERMINAL_FABRIC_REQUIRED"
    ? snapshot.terminalFabricStatus
    : session?.status ?? snapshot.sessionStatus;
  const deviceStatus = snapshot.localBridgeStatus === "LOCAL_DEVICE_BRIDGE_REQUIRED"
    ? snapshot.localBridgeStatus
    : snapshot.deviceRegistryStatus;
  const planApproved = isOmniTerminalCommandPlanApproved(plan);
  const nodeStatus = node.data?.status ?? (
    family === "session"
      ? sessionStatus
      : family === "device"
        ? deviceStatus
        : family === "command"
          ? "COMMAND_PLAN_REQUIRED"
          : snapshot.terminalFabricStatus
  );

  const visibleProtocols = useMemo(() => {
    if (node.type.includes("ssh")) return snapshot.protocols.filter((item) => item.id === "ssh");
    if (node.type.includes("adb")) return snapshot.protocols.filter((item) => item.id === "adb");
    if (node.type.includes("serial")) return snapshot.protocols.filter((item) => item.id === "serial");
    if (node.type.includes("ble")) return snapshot.protocols.filter((item) => item.id === "ble");
    if (node.type.includes("printer")) return snapshot.protocols.filter((item) => item.id === "printer");
    if (node.type.includes("docker")) return snapshot.protocols.filter((item) => item.id === "docker");
    if (node.type.includes("local") || node.type.includes("powershell") || node.type.includes("bash") || node.type.includes("cmd")) return snapshot.protocols.filter((item) => item.id === "local-shell");
    return snapshot.protocols.slice(0, 4);
  }, [node.type, snapshot.protocols]);

  const emitPlanRequest = (prompt: string) => {
    window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-plan", {
      detail: {
        nodeId: node.id,
        prompt,
        source: "node",
      },
    }));
  };

  const emitExecuteRequest = () => {
    window.dispatchEvent(new CustomEvent("leeway:omni-terminal-command-execute", {
      detail: {
        nodeId: node.id,
        plan,
      },
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const prompt = commandText.trim();
    if (!prompt) return;
    onUpdate?.(node.id, {
      data: {
        ...(node.data ?? {}),
        activeCommand: prompt,
        status: "COMMAND_PLAN_REQUIRED",
      },
    });
    emitPlanRequest(prompt);
    setCommandText("");
  };

  return (
    <div className="flex h-full min-h-[240px] flex-col text-slate-200">
      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">Omni-Terminal Fabric</p>
            <p className="truncate text-sm font-black uppercase tracking-tight text-white">{node.title}</p>
            <p className="mt-1 truncate font-mono text-[9px] text-slate-500">{node.data?.leewayNodeId ?? "LEEWAY_NODE_PENDING"}</p>
          </div>
          <StatusPill status={String(nodeStatus)} />
        </div>
      </div>

      {family === "session" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Protocol" value={session?.protocol ?? node.title} status={visibleProtocols[0]?.status ?? "Bridge Required"} />
            <MetricCard label="Receipt" value={session?.receiptStatus ?? "COMMAND_RECEIPT_REQUIRED"} />
            <MetricCard label="CWD" value={session?.cwd ?? "No active session"} />
            <MetricCard label="Heartbeat" value={session?.heartbeat ?? "NO_TERMINAL_SESSIONS"} />
          </div>

          <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <Terminal size={13} />
                <span>{node.title}</span>
              </div>
              <StatusPill status={String(sessionStatus)} />
            </div>
            <div className="h-28 overflow-y-auto p-3 font-mono text-[10px] leading-5 text-slate-400">
              <div>{snapshot.terminalFabricStatus}</div>
              <div>{session?.lastOutput ?? "No terminal output stream is bound."}</div>
              <div>{snapshot.details}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              value={commandText}
              onChange={(event) => setCommandText(event.target.value)}
              placeholder="Create command plan..."
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[10px] text-white outline-none focus:border-emerald-500/50"
            />
            <button type="submit" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-300">
              Plan
            </button>
          </form>
        </div>
      )}

      {family === "device" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="Devices" value={snapshot.deviceRegistryCount} status={snapshot.deviceRegistryStatus} />
            <MetricCard label="Tags" value={snapshot.deviceTagCount} />
            <MetricCard label="Bridge" value={snapshot.localBridgeStatus} />
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 custom-scrollbar">
            {snapshot.devices.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Database className="mb-2 h-7 w-7 text-amber-400" />
                <StatusPill status={deviceStatus} />
                <p className="mt-2 px-4 text-[10px] leading-5 text-slate-500">
                  {snapshot.localBridgeStatus === "LOCAL_DEVICE_BRIDGE_REQUIRED" ? "Local Device Bridge has not reported a bound route." : "Runtime Fabric has no device registry records."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshot.devices.map((device) => (
                  <div key={device.deviceId} className="rounded-lg border border-white/10 bg-black/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-black text-white">{device.displayName}</p>
                      <StatusPill status={device.connectionStatus} />
                    </div>
                    <p className="mt-1 truncate font-mono text-[9px] text-slate-500">{device.deviceId} / {device.protocol}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => emitPlanRequest("Scan devices through LeeWay Omni-Terminal Fabric.")}
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-300"
          >
            Request Device Scan Plan
          </button>
        </div>
      )}

      {family === "command" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Plan" value={plan?.planId ?? "COMMAND_PLAN_REQUIRED"} />
            <MetricCard label="Receipt" value={receipt?.receiptId ?? "COMMAND_RECEIPT_REQUIRED"} />
            <MetricCard label="Risk" value={planValue(plan, ["riskLevel", "risk.level", "risk"], "Unclassified")} />
            <MetricCard label="Approval" value={planApproved ? "Approved by Runtime Fabric" : planValue(plan, ["approvalRequirement", "approval.status", "approvalStatus"], "Required for execution")} />
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 custom-scrollbar">
            {node.type === "terminal.command-receipt" ? (
              receipt ? (
                <pre className="whitespace-pre-wrap text-[10px] leading-5 text-slate-300">{JSON.stringify(receipt, null, 2)}</pre>
              ) : (
                <div className="flex h-full min-h-28 items-center justify-center text-center">
                  <div>
                    <FileText className="mx-auto mb-2 h-7 w-7 text-amber-400" />
                    <StatusPill status="COMMAND_RECEIPT_REQUIRED" />
                  </div>
                </div>
              )
            ) : plan ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <MetricCard label="Targets" value={planValue(plan, ["targetDevices", "devices", "targets.devices", "targetDeviceIds"], "No targets reported")} />
                  <MetricCard label="Protocol" value={planValue(plan, ["protocol", "targetProtocol", "transport.protocol"], "No protocol reported")} />
                  <MetricCard label="Rollback" value={planValue(plan, ["rollbackPlan", "rollback.summary", "rollback"], "Rollback required")} />
                  <MetricCard label="Receipt" value={planValue(plan, ["receiptRequirement", "requiresReceipt", "receipt.required"], "COMMAND_RECEIPT_REQUIRED")} />
                </div>
                <pre className="whitespace-pre-wrap text-[10px] leading-5 text-slate-300">{JSON.stringify(plan, null, 2)}</pre>
              </div>
            ) : (
              <div className="space-y-3 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-300" />
                  <span>{snapshot.terminalFabricStatus}</span>
                </div>
                <p>{snapshot.details}</p>
              </div>
            )}
          </div>

          {node.type === "terminal.global-command" && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
                placeholder="Ask for a command plan..."
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[10px] text-white outline-none focus:border-emerald-500/50"
              />
              <button type="submit" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                Plan
              </button>
            </form>
          )}

          {node.type === "terminal.command-plan" && (
            <div className="grid grid-cols-5 gap-1">
              {["Approve", "Edit", "Reject", "Simulate"].map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={!plan}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-[8px] font-black uppercase text-slate-400 disabled:opacity-40"
                  onClick={() => emitPlanRequest(`${label} command plan ${plan?.planId ?? ""}`)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                disabled={!planApproved}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-[8px] font-black uppercase text-emerald-300 disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500 disabled:opacity-40"
                onClick={emitExecuteRequest}
                title={planApproved ? "Execute approved plan through Runtime Fabric" : "Execution requires Runtime Fabric approval"}
              >
                Execute
              </button>
            </div>
          )}
        </div>
      )}

      {family === "monitor" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Runtime" value={snapshot.runtimeStatus} />
            <MetricCard label="Terminal" value={snapshot.terminalFabricStatus} />
            <MetricCard label="Sessions" value={snapshot.activeSessionCount} status={snapshot.sessionStatus} />
            <MetricCard label="Blocked" value={snapshot.blockedCommandCount} />
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 custom-scrollbar">
            <div className="space-y-2">
              {visibleProtocols.map((protocol) => (
                <div key={protocol.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 p-2">
                  <span className="truncate text-[10px] font-bold text-white">{protocol.label}</span>
                  <StatusPill status={protocol.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {family === "governance" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Policy" value={node.type.includes("receipt") ? "Receipt required" : "Approval required"} />
            <MetricCard label="Queue" value={snapshot.approvalQueueCount} status="COMMAND_APPROVAL_REQUIRED" />
            <MetricCard label="Blocked" value={snapshot.blockedCommandCount} status="COMMAND_BLOCKED_BY_POLICY" />
            <MetricCard label="Last receipt" value={snapshot.lastReceipt?.receiptId ?? "None"} />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-start gap-3">
              {node.type.includes("risk") ? <AlertCircle className="h-5 w-5 text-amber-300" /> : node.type.includes("sentinel") ? <Radio className="h-5 w-5 text-blue-300" /> : node.type.includes("approval") ? <CheckCircle className="h-5 w-5 text-emerald-300" /> : node.type.includes("rollback") ? <Clock className="h-5 w-5 text-purple-300" /> : <ShieldCheck className="h-5 w-5 text-slate-300" />}
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">{node.title}</p>
                <p className="mt-2 text-[10px] leading-5 text-slate-400">{snapshot.details}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => emitPlanRequest(`Review governance gate ${node.title}`)}
            className="rounded-lg border border-slate-500/30 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300"
          >
            Request Review
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2 text-[8px] font-mono uppercase tracking-widest text-slate-600">
        <Activity size={11} />
        <span>{snapshot.updatedAt}</span>
        <Cpu size={11} className="ml-auto" />
      </div>
    </div>
  );
}

// Leeway Standards: Omni-Terminal node content surface
