/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.APPLICATIONS.LAUNCHER.MAIN
 * DESCRIPTION: Default Applications Launcher - governed launcher for LeeWay default applications through the Runtime Kernel Application Registry BFF
 * AUTHORITY: LeeWay-Standards
 *
 * 5WH:
 * WHAT = Default Applications Launcher panel
 * WHY = Launch/stop/open LeeWay default applications (IDE, Employment Center, SVG Creator, Open Notebook) through the governed registry BFF
 * WHO = Agent Lee / operator
 * WHERE = leeway-ide-single-canvas/src/components/ApplicationsLauncher.tsx
 * WHEN = 2026-08-02
 * HOW = React panel consuming http://127.0.0.1:4002/api/leeway/applications
 *
 * CHAIN: Standards → Application Registry → BFF → Applications
 * LICENSE: PROPRIETARY
 */

import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Rocket, Square, AppWindow, ShieldCheck, Activity } from "lucide-react";
import { useWindowManager } from "./WindowManager";

const DEFAULT_BFF_URL = "http://127.0.0.1:4002";

interface RegistryApplication {
  applicationId: string;
  applicationName: string;
  installClass: string;
  lifecycleState: string;
  version: string;
  port?: number;
  endpoints?: Record<string, string>;
  proofLevel?: string;
  frameColor?: string;
  lastStateChangeAt?: string;
}

interface ApplicationsLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

interface AppState extends RegistryApplication {
  bffUrl: string;
  health?: { pass?: boolean; http?: number } | null;
  actionBusy?: string;
}

const STATE_COLORS: Record<string, string> = {
  READY: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  RUNNING: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  STOPPED: "text-gray-400 border-gray-500/40 bg-gray-500/10",
  FAILED: "text-red-400 border-red-500/40 bg-red-500/10",
  BLOCKED: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  INSTALLED: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
};

function endpointFor(app: RegistryApplication): string | null {
  if (app.endpoints?.root) return app.endpoints.root;
  if (app.endpoints?.health) return app.endpoints.health;
  if (app.port) return `http://localhost:${app.port}`;
  return null;
}

export function ApplicationsLauncher({ isOpen, onClose, accentColor }: ApplicationsLauncherProps) {
  const { openWindow } = useWindowManager();
  const [bffUrl, setBffUrl] = useState<string>(() => {
    const saved = localStorage.getItem("leeway.applications.bffUrl");
    return saved || DEFAULT_BFF_URL;
  });
  const [apps, setApps] = useState<AppState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const loadApps = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${bffUrl}/api/leeway/applications`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`registry BFF returned ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data?.applications) ? data.applications : Array.isArray(data) ? data : [];
      setApps(list.map((a: RegistryApplication) => ({ ...a, bffUrl })));
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      setError(`Cannot reach registry BFF at ${bffUrl} (${(e as Error).message}). Keep the Runtime Kernel running on port 4002.`);
      if (!silent) setApps([]);
    } finally {
      setLoading(false);
    }
  }, [bffUrl]);

  useEffect(() => {
    if (isOpen) loadApps();
  }, [isOpen, loadApps]);

  const refreshHealth = async (id: string) => {
    setApps((prev) => prev.map((a) => (a.applicationId === id ? { ...a, actionBusy: "health" } : a)));
    try {
      const res = await fetch(`${bffUrl}/api/leeway/applications/${id}/health`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      const pass = data?.health?.pass ?? data?.ok;
      const http = data?.health?.http;
      setApps((prev) => prev.map((a) => (a.applicationId === id ? { ...a, health: { pass: Boolean(pass), http: http ?? undefined }, actionBusy: undefined } : a)));
    } catch {
      setApps((prev) => prev.map((a) => (a.applicationId === id ? { ...a, health: { pass: false }, actionBusy: undefined } : a)));
    }
  };

  const act = async (id: string, action: "launch" | "stop", label: string) => {
    setApps((prev) => prev.map((a) => (a.applicationId === id ? { ...a, actionBusy: label } : a)));
    try {
      const url = action === "launch" ? `${bffUrl}/api/leeway/applications/launch` : `${bffUrl}/api/leeway/applications/${id}/stop`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "launch" ? JSON.stringify({ applicationId: id }) : undefined,
        signal: AbortSignal.timeout(60000),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || `BFF rejected ${action}`);
      await loadApps(true);
      await refreshHealth(id);
    } catch (e) {
      setError(`${action} ${id} failed: ${(e as Error).message}`);
      setApps((prev) => prev.map((a) => (a.applicationId === id ? { ...a, actionBusy: undefined } : a)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" id="applications-launcher-overlay">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center" style={accentColor ? { borderColor: `${accentColor}55` } : undefined}>
              <AppWindow className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Default Applications</h2>
              <p className="text-[10px] text-gray-500 font-mono">governed by Runtime Kernel Application Registry BFF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && <span className="text-[9px] font-mono text-gray-600">updated {lastRefresh}</span>}
            <button onClick={() => loadApps()} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors" title="Refresh registry">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors" title="Close launcher">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BFF selector */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-[#30363d] bg-[#0d1117]">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Registry BFF</span>
          <input
            value={bffUrl}
            onChange={(e) => {
              setBffUrl(e.target.value);
              localStorage.setItem("leeway.applications.bffUrl", e.target.value);
            }}
            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1 text-[10px] font-mono text-gray-300 focus:outline-none focus:border-blue-500/50"
          />
          <button onClick={() => loadApps()} className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-[9px] font-bold text-blue-400 hover:bg-blue-500/20 transition-all">
            APPLY
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-mono text-red-400" id="applications-launcher-error">
            {error}
          </div>
        )}

        {/* App list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {apps.length === 0 && !loading && (
            <div className="text-center py-10 text-[11px] font-mono text-gray-500">
              No applications registered. Is the Runtime Kernel (4002) running?
            </div>
          )}
          {apps.map((app) => {
            const stateClass = STATE_COLORS[app.lifecycleState] || "text-gray-400 border-gray-500/40 bg-gray-500/10";
            const ep = endpointFor(app);
            return (
              <div key={app.applicationId} className="border border-[#30363d] bg-[#161b22]/60 rounded-xl p-4 flex items-start gap-4" data-application-id={app.applicationId}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold text-white">{app.applicationName}</span>
                    <span className="text-[9px] font-mono text-gray-600">{app.applicationId}</span>
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${stateClass}`}>{app.lifecycleState}</span>
                    {app.proofLevel && (
                      <span className="text-[9px] font-mono text-cyan-500/80 border border-cyan-500/30 rounded px-1.5 py-0.5" title="Registry-recorded proof level">
                        <ShieldCheck className="inline w-2.5 h-2.5 mr-1" />{app.proofLevel}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-gray-500 flex-wrap">
                    {app.frameColor && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }} title="Application frame color from the Application Registry">
                        <span style={{ width: 8, height: 8, borderRadius: "9999px", background: app.frameColor, display: "inline-block" }} aria-hidden="true" />
                        frame {app.frameColor}
                      </span>
                    )}
                    <span>v{app.version}</span>
                    <span>port {app.port ?? "-"}</span>
                    <span>{app.installClass}</span>
                    {app.health && (
                      <span className={app.health.pass ? "text-emerald-400" : "text-red-400"}>
                        <Activity className="inline w-2.5 h-2.5 mr-0.5" />
                        health {app.health.pass ? `pass${app.health.http ? ` ${app.health.http}` : ""}` : "fail"}
                      </span>
                    )}
                    {app.lastStateChangeAt && <span className="text-[9px]">changed {new Date(app.lastStateChangeAt).toLocaleTimeString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {app.lifecycleState !== "READY" && app.lifecycleState !== "RUNNING" && (
                    <button
                      onClick={() => act(app.applicationId, "launch", "launch")}
                      disabled={Boolean(app.actionBusy)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/40 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/25 transition-all disabled:opacity-50"
                    >
                      <Rocket className="w-3 h-3" />
                      {app.actionBusy === "launch" ? "Launching..." : "Launch"}
                    </button>
                  )}
                  {(app.lifecycleState === "READY" || app.lifecycleState === "RUNNING") && (
                    <button
                      onClick={() => act(app.applicationId, "stop", "stop")}
                      disabled={Boolean(app.actionBusy)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/40 rounded-lg text-[10px] font-bold text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50"
                    >
                      <Square className="w-3 h-3" />
                      {app.actionBusy === "stop" ? "Stopping..." : "Stop"}
                    </button>
                  )}
                  {ep && (
                    <button
                      onClick={() => openWindow({ applicationId: app.applicationId, applicationName: app.applicationName, lifecycleState: app.lifecycleState, port: app.port, frameColor: app.frameColor })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/40 rounded-lg text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all"
                      title="Open inside an OS-managed window on the LeeWay desktop"
                    >
                      <AppWindow className="w-3 h-3" />
                      Open
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-2.5 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between">
          <span className="text-[9px] font-mono text-gray-600">
            All actions are governed by the Application Registry state machine. READY requires registry-recorded evidence.
          </span>
          <button onClick={() => apps.forEach((a) => refreshHealth(a.applicationId))} className="text-[9px] font-mono text-blue-400 hover:text-blue-300">
            CHECK ALL HEALTH
          </button>
        </div>
      </div>
    </div>
  );
}
