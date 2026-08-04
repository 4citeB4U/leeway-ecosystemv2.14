"use client";

import { useEffect, useMemo, useState } from "react";
import { deviceLayerCapabilityClient, type DeviceLayerApprovalRequiredActionsResponse, type DeviceLayerCapabilityMap, type DeviceLayerFamiliesResponse, type DeviceLayerLockState, type DeviceLayerReadOnlyRoutesResponse } from "../src/lib/deviceLayerCapabilityClient";

type PanelState = {
  capabilityMap: DeviceLayerCapabilityMap | null;
  families: DeviceLayerFamiliesResponse | null;
  readOnlyRoutes: DeviceLayerReadOnlyRoutesResponse | null;
  approvalActions: DeviceLayerApprovalRequiredActionsResponse | null;
  lockState: DeviceLayerLockState | null;
};

type Props = { deviceOperatorBaseUrl?: string; showDisabledActions?: boolean; showProofLinks?: boolean; allowExecutionControls?: false; };

const emptyState: PanelState = { capabilityMap: null, families: null, readOnlyRoutes: null, approvalActions: null, lockState: null };

function safetyIsClean(state: PanelState): boolean {
  return Boolean(
    state.capabilityMap?.execution_enabled === false &&
    state.capabilityMap?.execute_buttons_visible === false &&
    state.capabilityMap?.physical_actions_executed === 0 &&
    state.lockState?.windows_locked === true &&
    state.lockState?.blocked_probe_executed === false &&
    state.lockState?.post_execution_routes_added === false &&
    state.readOnlyRoutes?.route_count === 46 &&
    state.families?.family_count === 11 &&
    state.approvalActions?.action_cards_enabled === false &&
    state.approvalActions?.approval_required === true
  );
}

export default function AgentLeeDeviceLayerCapabilityPanel({ deviceOperatorBaseUrl, showDisabledActions = true, showProofLinks = true }: Props) {
  const [state, setState] = useState<PanelState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [capabilityMap, families, readOnlyRoutes, approvalActions, lockState] = await Promise.all([
        deviceLayerCapabilityClient.getCapabilityMap(),
        deviceLayerCapabilityClient.getFamilies(),
        deviceLayerCapabilityClient.getReadOnlyRoutes(),
        deviceLayerCapabilityClient.getApprovalRequiredActions(),
        deviceLayerCapabilityClient.getLockState(),
      ]);
      setState({ capabilityMap, families, readOnlyRoutes, approvalActions, lockState });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Device Layer capability map unavailable.");
      setState(emptyState);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const clean = useMemo(() => safetyIsClean(state), [state]);
  const routeCount = state.readOnlyRoutes?.route_count ?? state.capabilityMap?.read_only_route_count ?? 0;
  const familyCount = state.families?.family_count ?? state.capabilityMap?.completed_family_count ?? 0;
  const actionCount = state.approvalActions?.action_count ?? 0;

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-5 text-slate-100 shadow-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Agent Lee Device Layer</p>
          <h2 className="mt-2 text-2xl font-semibold">Governed Capability Map</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">Read-only dashboard for the full Device Layer. Execution controls are intentionally hidden and disabled.</p>
        </div>
        <button type="button" onClick={refresh} className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/10">Refresh map</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3"><p className="text-xs text-emerald-200">Lock state</p><p className="mt-1 text-lg font-semibold">{state.lockState?.windows_locked ? "Locked Clean" : "Unknown"}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400">Families</p><p className="mt-1 text-lg font-semibold">{familyCount}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400">Read-only routes</p><p className="mt-1 text-lg font-semibold">{routeCount}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400">Physical actions</p><p className="mt-1 text-lg font-semibold">{state.capabilityMap?.physical_actions_executed ?? 0}</p></div>
      </div>

      {loading && <p className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm">Loading Device Layer map...</p>}
      {error && <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">Device Operator route warning: {error}</div>}

      {!loading && !error && (
        <>
          <div className={clean ? "mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100" : "mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100"}>
            {clean ? "No-execute safety verified: execution=false, buttons=false, POST execution routes=false, physical actions=0." : "Safety warning: one or more no-execute invariants failed. Do not expose action controls."}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Device families</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(state.families?.families ?? state.capabilityMap?.family_cards ?? []).map((family) => (
                <article key={family.family} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm font-semibold">{family.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{family.family}</p>
                  <p className="mt-3 rounded-lg bg-slate-800 px-2 py-1 text-xs text-cyan-100">{family.status}</p>
                  <p className="mt-2 text-xs text-amber-200">{family.execution_default ?? "DISABLED_APPROVAL_REQUIRED"}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Read-only routes</h3>
            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-400"><tr><th className="px-3 py-2">Method</th><th className="px-3 py-2">Path</th><th className="px-3 py-2">Execution</th></tr></thead>
              <tbody>{(state.readOnlyRoutes?.routes ?? state.capabilityMap?.read_only_routes ?? []).map((route) => <tr key={route.path} className="border-t border-slate-800"><td className="px-3 py-2 text-cyan-200">{route.method}</td><td className="px-3 py-2 font-mono text-xs">{route.path}</td><td className="px-3 py-2 text-emerald-200">No execute</td></tr>)}</tbody></table>
            </div>
          </div>

          {showDisabledActions && <div className="mt-6"><h3 className="text-lg font-semibold">Approval-required actions</h3><p className="mt-1 text-sm text-slate-400">{actionCount} future action cards are visible for planning only. They are disabled by policy.</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{(state.approvalActions?.actions ?? []).slice(0, 18).map((action, index) => <div key={`${action.family}-${action.action}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm"><p className="font-medium">{action.action}</p><p className="mt-1 text-xs text-slate-400">{action.family}</p><p className="mt-2 text-xs text-amber-200">Approval required - disabled</p></div>)}</div></div>}

          {showProofLinks && <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4 text-xs text-slate-300"><p className="font-semibold text-slate-100">Proof state</p><p className="mt-2">Phase: {state.capabilityMap?.phase ?? 38}</p><p>Mode: {state.capabilityMap?.mode ?? "READ_ONLY_UI_MAP_NO_EXECUTE"}</p><p>Status: {state.capabilityMap?.device_layer_status ?? "FULL_MULTI_FAMILY_DEVICE_LAYER_READY_LOCKED_CLEAN"}</p></div>}
        </>
      )}
    </section>
  );
}
