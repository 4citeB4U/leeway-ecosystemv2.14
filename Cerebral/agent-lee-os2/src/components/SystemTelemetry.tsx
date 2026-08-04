import { Brain } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getTtsEnabled, setTtsEnabled } from "../services/ai";
import TelemetryDashboard from "./TelemetryDashboard";

interface TelemetryData {
  timestamp?: string;
  services?: Array<{
    name: string;
    port: number;
    status: string;
    lastChecked?: string;
  }>;
  overallStatus?: string;
  cpu?: number;
  ram?: number;
  ai?: any;
}

const Sparkline: React.FC<{ values: number[]; color?: string }> = ({
  values,
  color = "cyan",
}) => {
  const width = 400;
  const height = 60;
  const max = Math.max(100, ...values);
  const min = 0;
  const points = values.map(
    (v, i) =>
      `${(i / Math.max(1, values.length - 1)) * width},${height - ((v - min) / (max - min || 1)) * height}`,
  );
  const d = points.length ? `M${points.join(" L ")}` : "";
  const stroke = color === "cyan" ? "#06b6d4" : "#10b981";
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="rounded bg-white/3"
    >
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.length > 0 && (
        <polygon
          points={`${points.join(" ")} ${width},${height} 0,${height}`}
          fill={`url(#grad-${color})`}
          opacity={0.6}
        />
      )}
    </svg>
  );
};

export const SystemTelemetry: React.FC = () => {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [tab, setTab] = useState<"ports" | "adapters" | "missions" | "drift">(
    "ports",
  );
  const [ttsEnabled, setTtsEnabledState] = useState<boolean>(true);
  const [toggleMsg, setToggleMsg] = useState<string | null>(null);

  const [cpuSeries, setCpuSeries] = useState<number[]>([]);
  const [ramSeries, setRamSeries] = useState<number[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry");
        if (!res.ok) return;
        const j = await res.json();
        if (!mounted) return;
        setData(j);
        // Corrected mapping: backend returns { instant: { cpu: X, ram: Y } }
        const cpu = Number(j.instant?.cpu ?? j.cpu ?? 0) || 0;
        const ram = Number(j.instant?.ram ?? j.ram ?? 0) || 0;
        setCpuSeries((s) => [...s.slice(-59), cpu]);
        setRamSeries((s) => [...s.slice(-59), ram]);
      } catch (e) {
        // ignore
      }
    };
    fetchTelemetry();
    const id = setInterval(fetchTelemetry, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await getTtsEnabled();
        setTtsEnabledState(s);
      } catch (e) { }
    })();
  }, []);

  if (!data) return null;

  return (
    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-full shadow-2xl space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
            Sovereign_Intelligence
          </span>
        </div>
        <div
          className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${data.overallStatus === "nominal" ? "bg-cyan-400/20 text-cyan-400" : "bg-red-500/20 text-red-500"}`}
        >
          {data.overallStatus}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[10px] text-white/60">CPU % (1m)</div>
          <div className="text-[18px] font-bold text-cyan-400">
            {cpuSeries[cpuSeries.length - 1] ?? 0}
          </div>
          <div className="text-[9px] text-white/40 mt-1">
            One consolidated CPU metric — single live chart below
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[10px] text-white/60">RAM %</div>
          <div className="text-[18px] font-bold text-purple-400">
            {ramSeries[ramSeries.length - 1] ?? 0}
          </div>
          <div className="text-[9px] text-white/40 mt-1">
            Memory usage (used/total shown in expanded view)
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-[10px] text-white/60">Services</div>
          <div className="text-[18px] font-bold text-emerald-400">
            {data.services?.length ?? 0}
          </div>
          <div className="text-[9px] text-white/40 mt-1">
            Monitored listening services and ports
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="text-[9px] text-white/40 font-mono uppercase">
          Server TTS
        </div>
        <button
          onClick={async () => {
            const newVal = !ttsEnabled;
            const res = await setTtsEnabled(newVal);
            if (!res || (res as any).error) {
              setToggleMsg("Failed to update");
              setTimeout(() => setToggleMsg(null), 3000);
              return;
            }
            setTtsEnabledState(Boolean((res as any).tts_enabled));
            setToggleMsg(
              (res as any).tts_enabled
                ? "Server TTS enabled"
                : "Server TTS disabled",
            );
            setTimeout(() => setToggleMsg(null), 3000);
          }}
          className={`px-3 py-1 text-[10px] rounded-full font-mono uppercase transition-colors ${ttsEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/10 text-red-300"}`}
        >
          {ttsEnabled ? "TTS: ON" : "TTS: OFF"}
        </button>
        {toggleMsg && (
          <div className="ml-3 text-[10px] text-white/60 font-mono">
            {toggleMsg}
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-white/5 rounded-lg p-0.5 mt-3">
        {(["ports", "adapters", "missions", "drift"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-[8px] font-mono uppercase py-1 rounded transition-all ${tab === t ? "bg-cyan-400/20 text-cyan-400" : "text-white/30 hover:text-white/60"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "ports" && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/50 mb-1">
              Ports shows services Cerebral monitors: each row lists service
              name, listening port, protocol (if available), status, and last
              check. Click a row to expand raw details and metrics (response
              time, PID, tags).
            </div>
            {(data.services || []).map((s: any) => (
              <details key={s.port} className="bg-white/5 p-2 rounded-lg">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${s.status === "online" ? "bg-cyan-400" : "bg-red-500"}`}
                    />
                    <div className="text-white/80 font-semibold">
                      {s.name || "service"}
                    </div>
                    <div className="text-white/40">•</div>
                    <div className="text-white/40">
                      {s.port}
                      {s.protocol ? ` / ${s.protocol}` : ""}
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    {s.status}
                    {s.lastChecked
                      ? ` • ${new Date(s.lastChecked).toLocaleTimeString()}`
                      : ""}
                  </div>
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/60">
                  <div>
                    <strong>PID:</strong> {s.pid ?? "—"}
                  </div>
                  <div>
                    <strong>Resp ms:</strong> {s.latency_ms ?? "—"}
                  </div>
                  <div>
                    <strong>Uptime:</strong> {s.uptime ?? "—"}
                  </div>
                  <div>
                    <strong>Protocol:</strong> {s.protocol ?? "tcp/udp"}
                  </div>
                  <div className="col-span-2">
                    <strong>Tags:</strong>{" "}
                    {Array.isArray(s.tags)
                      ? s.tags.join(", ")
                      : (s.tags ?? "—")}
                  </div>
                  <div className="col-span-2 text-[12px] text-white/40 mt-2">
                    Raw details:
                  </div>
                  <div className="col-span-2 bg-black/30 p-2 rounded text-[11px] overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(s, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
        {tab === "adapters" && (
          <div className="text-[10px] text-white/40">
            Adapter performance view (live charts)
          </div>
        )}
        {tab === "missions" && (
          <div className="text-[10px] text-white/40">
            Recent missions and outcomes
          </div>
        )}
        {tab === "drift" && (
          <div className="text-[10px] text-white/40">Drift analytics</div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-[9px] text-white/40 font-mono uppercase">
          Live CPU (%)
        </div>
        <Sparkline values={cpuSeries} color="cyan" />
        <div className="text-[9px] text-white/40 font-mono uppercase">
          Live RAM (%)
        </div>
        <Sparkline values={ramSeries} color="emerald" />

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="text-[9px] text-white/40 font-mono uppercase mb-2">
            System Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('voice-command', { detail: 'Set Power Plan to High Performance' }))}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono text-left transition-colors"
            >
              <div className="text-white">Performance Mode</div>
              <div className="text-[10px] text-white/40">Max Power</div>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('voice-command', { detail: 'Start Remote Access' }))}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono text-left transition-colors"
            >
              <div className="text-white">Remote Access</div>
              <div className="text-[10px] text-white/40">Chrome Remote</div>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('voice-command', { detail: 'Open Task Manager' }))}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono text-left transition-colors"
            >
              <div className="text-white">Task Manager</div>
              <div className="text-[10px] text-white/40">Monitor</div>
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('voice-command', { detail: 'Run Disk Cleanup' }))}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-mono text-left transition-colors"
            >
              <div className="text-white">Disk Cleanup</div>
              <div className="text-[10px] text-white/40">Storage</div>
            </button>
          </div>
        </div>

        {/* Embedded full telemetry dashboard inline under Sovereign Intelligence */}
        <div className="mt-3">
          <TelemetryDashboard inline />
        </div>
      </div>
    </div>
  );
};

export default SystemTelemetry;
