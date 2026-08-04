/**
 * TelemetryDashboard — live system metrics with 7 chart types + click-to-enlarge
 *
 * Chart inventory (7 types):
 *  1. Sparkline     — polyline (CPU total, page faults, errors)
 *  2. BarChart      — bars (CPU per-core)
 *  3. PieChart      — filled sector (battery %)
 *  4. Gauge         — semicircle arc (RAM %)
 *  5. AreaChart     — filled gradient area (network, disk)   ← NEW
 *  6. DonutChart    — segmented ring + legend (memory breakdown) ← NEW
 *  7. HeatmapChart  — colour grid rows×cols (per-core history)  ← NEW
 */

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Telemetry = { [k: string]: any };

function usePolling(url: string, interval = 1000) {
  const [data, setData] = useState<Telemetry | null>(null);
  useEffect(() => {
    let mounted = true;
    const fetchOnce = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("http" + res.status);
        const json = await res.json();
        if (mounted) setData(json);
      } catch {}
    };
    fetchOnce();
    const timer = setInterval(fetchOnce, interval);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [url, interval]);
  return data;
}

// ── 1. Sparkline ─────────────────────────────────────────────────────────────
export function Sparkline({
  values = [],
  color = "#60A5FA",
  width = 160,
  height = 40,
}: {
  values?: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const points = useMemo(() => {
    if (!values || values.length < 2) return null;
    const max = Math.max(...values, 1);
    return values
      .map(
        (v, i) =>
          `${(i / (values.length - 1)) * width},${height - (v / max) * height}`,
      )
      .join(" ");
  }, [values, width, height]);
  if (!points) return <div className="text-sm text-white/40">no data</div>;
  return (
    <svg width={width} height={height} className="rounded-md bg-white/3">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── 2. BarChart ───────────────────────────────────────────────────────────────
export function BarChart({
  values = [],
  color = "rgba(96,165,250,0.4)",
  height = 80,
}: {
  values?: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  const list = values.length ? values : new Array(8).fill(0);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {list.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${(v / max) * 100}%`, background: color }}
        />
      ))}
    </div>
  );
}

// ── 3. PieChart ───────────────────────────────────────────────────────────────
export function PieChart({
  value = 0,
  size = 72,
}: {
  value?: number;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const angle = (pct / 100) * Math.PI * 2;
  const x = cx + r * Math.cos(-Math.PI / 2 + angle);
  const y = cy + r * Math.sin(-Math.PI / 2 + angle);
  const large = angle > Math.PI ? 1 : 0;
  const d = `M ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} L ${cx} ${cy}`;
  return (
    <svg width={size} height={size} className="rounded-md">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#0f172a"
        stroke="#374151"
        strokeWidth={4}
      />
      <path d={d} fill="#f59e0b" opacity={0.95} />
      <text
        x={cx}
        y={cy + 4}
        fill="#e6eef8"
        fontSize={size < 100 ? 12 : 22}
        textAnchor="middle"
      >
        {pct}%
      </text>
    </svg>
  );
}

// ── 4. Gauge ──────────────────────────────────────────────────────────────────
export function Gauge({
  value = 0,
  max = 100,
  label = "",
  size = 80,
}: {
  value?: number;
  max?: number;
  label?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, (value ?? 0) / max));
  const angle = pct * Math.PI;
  const r = (size / 2) * 0.85;
  const cx = size / 2;
  const cy = size * 0.62;
  const x = cx + r * Math.cos(Math.PI - angle);
  const y = cy - r * Math.sin(Math.PI - angle);
  const large = angle > Math.PI ? 1 : 0;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
  const stroke = pct > 0.85 ? "#fb7185" : pct > 0.6 ? "#f59e0b" : "#10B981";
  return (
    <div className="flex flex-col items-center text-center">
      <svg width={size} height={size * 0.72}>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke="#374151"
          strokeWidth={8}
          fill="none"
        />
        <path
          d={d}
          stroke={stroke}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill="#e6eef8"
          fontSize={size < 100 ? 12 : 22}
        >
          {Math.round(value ?? 0)}
        </text>
      </svg>
      {label && (
        <div className="text-xs text-white/50 mt-1 max-w-[12rem] truncate">
          {label}
        </div>
      )}
    </div>
  );
}

// ── 5. AreaChart (NEW) ────────────────────────────────────────────────────────
export function AreaChart({
  values = [],
  color = "#60A5FA",
  width = 160,
  height = 50,
}: {
  values?: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const uid = color.replace(/[^a-z0-9]/gi, "").slice(0, 12) + width;
  const pts = useMemo(() => {
    if (!values || values.length < 2) return null;
    const max = Math.max(...values, 1);
    return values.map(
      (v, i) =>
        `${(i / (values.length - 1)) * width},${height - (v / max) * height}`,
    );
  }, [values, width, height]);
  if (!pts) return <div className="text-sm text-white/40">no data</div>;
  const lineD = `M ${pts.join(" L ")}`;
  const areaD = `${lineD} L ${width},${height} L 0,${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      className="rounded-md overflow-hidden bg-white/3"
    >
      <defs>
        <linearGradient id={`ag${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#ag${uid})`} />
      <path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── 6. DonutChart (NEW) ───────────────────────────────────────────────────────
interface DonutSeg {
  label: string;
  value: number;
  color: string;
}
export function DonutChart({
  segments = [],
  size = 100,
}: {
  segments: DonutSeg[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const sw = size * 0.18;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  const arcs = segments.map((seg) => {
    const pct = seg.value / total;
    const da = `${pct * circ} ${circ}`;
    const rot = cum * 360 - 90;
    cum += pct;
    return { ...seg, da, rot };
  });
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="shrink-0">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1e293b"
          strokeWidth={sw}
        />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={sw}
            strokeDasharray={a.da}
            strokeDashoffset={0}
            transform={`rotate(${a.rot} ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1 min-w-0">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-xs leading-tight"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-white/60 truncate">{seg.label}</span>
            <span className="text-white/80 font-mono ml-auto shrink-0">
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7. HeatmapChart (NEW) ─────────────────────────────────────────────────────
export function HeatmapChart({
  data = [],
  cols = 20,
  rows = 8,
  cellW = 8,
  cellH = 10,
}: {
  data?: number[][];
  cols?: number;
  rows?: number;
  cellW?: number;
  cellH?: number;
}) {
  const grid = useMemo(() => {
    if (!data || data.length === 0)
      return Array.from({ length: rows }, () => new Array(cols).fill(0));
    return data.slice(0, rows).map((row) => {
      const sl = [...row].slice(-cols);
      while (sl.length < cols) sl.unshift(0);
      return sl;
    });
  }, [data, cols, rows]);
  const hue = (v: number) => {
    const t = Math.min(1, v / 100);
    if (t < 0.4) return `rgba(16,185,129,${0.3 + t})`;
    if (t < 0.7) return `rgba(245,158,11,${0.4 + t * 0.5})`;
    return `rgba(251,113,133,${0.5 + t * 0.5})`;
  };
  return (
    <div className="inline-flex flex-col gap-px">
      {grid.map((row, ri) => (
        <div key={ri} className="flex gap-px">
          {row.map((v, ci) => (
            <div
              key={ci}
              title={`C${ri}: ${v}%`}
              style={{
                width: cellW,
                height: cellH,
                background: hue(v),
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Universal chart enlarge modal ─────────────────────────────────────────────
interface Active {
  title: string;
  node: React.ReactNode;
}
function ChartModal({
  chart,
  onClose,
}: {
  chart: Active;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-black/90 border border-white/15 rounded-2xl p-6 z-[201]
                      w-[min(92vw,700px)] max-h-[82vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white">{chart.title}</div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center justify-center">{chart.node}</div>
      </div>
    </div>
  );
}

// ── Clickable tile wrapper ────────────────────────────────────────────────────
function Tile({
  title,
  large,
  className = "",
  children,
  open,
}: {
  title: string;
  large: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  open: (c: Active) => void;
}) {
  return (
    <div
      className={`relative group cursor-pointer ring-1 ring-white/0 hover:ring-orange-500/50
        transition-all duration-200 rounded-md ${className}`}
      onClick={() => open({ title, node: large })}
      title={`Click to enlarge: ${title}`}
    >
      {children}
      <div
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          bg-orange-500/80 text-[8px] text-white px-1 py-0.5 rounded font-mono pointer-events-none"
      >
        ⤢ expand
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TelemetryDashboard({
  inline,
}: { inline?: boolean } = {}) {
  const data = usePolling("/api/telemetry", 1000);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Active | null>(null);
  const open = (c: Active) => setActive(c);

  useEffect(() => {
    const h = (ev: any) => {
      if (ev?.detail?.action === "open") setExpanded(true);
      if (ev?.detail?.action === "close") setExpanded(false);
      if (ev?.detail?.action === "toggle") setExpanded((s) => !s);
    };
    window.addEventListener("telemetry-control", h as any);
    const ch = () =>
      open({
        title: "Battery / Charge",
        node: <BattLarge data={data} bp={batteryPercent} />,
      });
    window.addEventListener("open-charge", ch as any);
    return () => {
      window.removeEventListener("telemetry-control", h as any);
      window.removeEventListener("open-charge", ch as any);
    };
  }, [data]);

  // Derived telemetry
  const cpu_total = useMemo(
    () => data?.instant?.cpu ?? data?.cpu_total ?? 0,
    [data],
  );
  const cpuHistory = useMemo(() => {
    const h = data?.history?.cpu_total_history ?? data?.cpu_total_history;
    if (!h || !Array.isArray(h)) return [];
    return h.map((v: any) =>
      typeof v === "object" ? (v.value ?? v.cpu ?? 0) : v,
    );
  }, [data]);
  const cpuPerCore = useMemo(() => {
    const c = data?.instant?.cpu_per_core ?? data?.cpu_per_core;
    return c && Array.isArray(c) ? c : [];
  }, [data]);
  const coreHistories = useMemo(() => {
    const snaps: number[][] = data?.history?.cpu_per_core_history ?? [];
    if (!snaps || snaps.length === 0) return cpuPerCore.map((v: number) => [v]);
    const n = snaps[0]?.length ?? 0;
    return Array.from({ length: n }, (_, ci) =>
      snaps.map((s: number[]) => s[ci] ?? 0),
    );
  }, [data, cpuPerCore]);
  const ram = useMemo(() => {
    const i = data?.instant;
    const u = i?.ram_used ?? data?.ram_used;
    const t = i?.ram_total ?? data?.ram_total;
    const p = i?.ram_percent ?? data?.ram_percent;
    return t && u != null ? Math.round((u / t) * 100) : (p ?? null);
  }, [data]);
  const memSegs = useMemo((): DonutSeg[] => {
    const i = data?.instant;
    const used = i?.ram_used ?? data?.ram_used ?? 0;
    const total = i?.ram_total ?? data?.ram_total ?? 0;
    const cached = i?.ram_cached ?? data?.ram_cached ?? 0;
    const free = Math.max(0, total - used - cached);
    if (!total) return [{ label: "Used", value: 1, color: "#f59e0b" }];
    return [
      { label: "Used", value: used, color: "#f59e0b" },
      { label: "Cached", value: cached, color: "#60a5fa" },
      { label: "Free", value: free, color: "#10b981" },
    ];
  }, [data]);
  const pageFaults = useMemo(() => {
    const h = data?.history?.page_faults_history ?? data?.page_faults_history;
    if (!h || !Array.isArray(h)) return [];
    return h.map((v: any) =>
      typeof v === "object" ? (v.value ?? v.count ?? 0) : v,
    );
  }, [data]);
  const diskQ = data?.instant?.disk_queue ?? data?.disk_queue ?? 0;
  const diskL = data?.instant?.disk_latency_ms ?? data?.disk_latency_ms ?? 0;
  const netUp = data?.instant?.network_up ?? data?.network_up ?? 0;
  const netDown = data?.instant?.network_down ?? data?.network_down ?? 0;
  const diskR = useMemo(() => {
    const h = data?.history?.disk_read_history ?? data?.disk_read_history;
    if (!h || !Array.isArray(h)) return [];
    return h.map((v: any) =>
      typeof v === "object" ? (v.bytes_per_sec ?? v.value ?? 0) : v,
    );
  }, [data]);
  const diskW = useMemo(() => {
    const h = data?.history?.disk_write_history ?? data?.disk_write_history;
    if (!h || !Array.isArray(h)) return [];
    return h.map((v: any) =>
      typeof v === "object" ? (v.bytes_per_sec ?? v.value ?? 0) : v,
    );
  }, [data]);
  const netUpH = useMemo(() => {
    const h = data?.history?.network_up_history ?? data?.network_up_history;
    if (!h || !Array.isArray(h)) return [netUp];
    return h.map((v: any) =>
      typeof v === "object" ? (v.value ?? v.mbps ?? 0) : v,
    );
  }, [data, netUp]);
  const netDnH = useMemo(() => {
    const h = data?.history?.network_down_history ?? data?.network_down_history;
    if (!h || !Array.isArray(h)) return [netDown];
    return h.map((v: any) =>
      typeof v === "object" ? (v.value ?? v.mbps ?? 0) : v,
    );
  }, [data, netDown]);
  const batteryPercent =
    data?.instant?.battery_percent ??
    data?.instant?.charge_percent ??
    data?.battery_percent ??
    data?.charge_percent ??
    0;
  const topProcs = useMemo(() => {
    const p = data?.history?.top_processes ?? data?.top_processes;
    if (!p || !Array.isArray(p)) return null;
    const l = p[p.length - 1];
    return l?.processes ?? p;
  }, [data]);
  const errorH = useMemo(() => {
    const h = data?.history?.error_events_history ?? data?.error_events_history;
    if (!h || !Array.isArray(h)) return [];
    return h.map((v: any) =>
      typeof v === "object" ? (v.count ?? v.value ?? 0) : v,
    );
  }, [data]);

  const _toGB = (b: number | undefined | null) =>
    b != null ? (b / 1073741824).toFixed(1) + " GB" : "—";
  const ramLabel = `${_toGB(data?.instant?.ram_used ?? data?.ram_used)} / ${_toGB(data?.instant?.ram_total ?? data?.ram_total)}`;
  const latColor = diskL > 50 ? "#fb7185" : diskL < 10 ? "#10b981" : "#e6eef8";

  // Large node factories
  const lCpuLine = (
    <Sparkline values={cpuHistory} color="#60A5FA" width={580} height={200} />
  );
  const lCpuBar = (
    <div className="flex flex-col gap-3">
      <BarChart
        values={cpuPerCore.slice(0, 24).map((v: number) => Math.round(v ?? 0))}
        color="#60A5FA"
        height={200}
      />
      <div className="grid grid-cols-8 gap-1 text-xs text-white/50 font-mono">
        {cpuPerCore.map((v: number, i: number) => (
          <div key={i} className="text-center">
            C{i}: {Math.round(v)}%
          </div>
        ))}
      </div>
    </div>
  );
  const lRamGauge = (
    <Gauge value={ram ?? 0} max={100} label={ramLabel} size={200} />
  );
  const lMemDonut = <DonutChart segments={memSegs} size={180} />;
  const lBattery = (
    <div className="flex gap-8 items-center">
      <PieChart value={batteryPercent} size={240} />
      <div className="text-sm text-white/70 space-y-3">
        <div>
          <b className="text-white">Percent:</b> {batteryPercent}%
        </div>
        <div>
          <b className="text-white">Status:</b>{" "}
          {data?.battery_state ?? data?.charging_state ?? "unknown"}
        </div>
        <div>
          <b className="text-white">Charge Watts:</b>{" "}
          {data?.charge_watts ?? "—"}
        </div>
      </div>
    </div>
  );
  const lDiskArea = (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-emerald-400/70 mb-1">Read</div>
        <AreaChart values={diskR} color="#34D399" width={580} height={130} />
      </div>
      <div>
        <div className="text-xs text-blue-400/70 mb-1">Write</div>
        <AreaChart values={diskW} color="#60A5FA" width={580} height={130} />
      </div>
    </div>
  );
  const lNetArea = (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-xs text-violet-400/70 mb-1">Upload (Mbps)</div>
        <AreaChart values={netUpH} color="#a78bfa" width={580} height={150} />
      </div>
      <div>
        <div className="text-xs text-rose-400/70 mb-1">Download (Mbps)</div>
        <AreaChart values={netDnH} color="#fb7185" width={580} height={150} />
      </div>
      <div className="text-sm text-white/50">
        ↑ {netUp} Mbps ↓ {netDown} Mbps
      </div>
    </div>
  );
  const lHeatmap = (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-white/40 mb-1">
        CPU Per-Core History — rows=cores, cols=time samples
      </div>
      <HeatmapChart
        data={coreHistories}
        cols={40}
        rows={Math.min(cpuPerCore.length || 8, 16)}
        cellW={14}
        cellH={18}
      />
      <div className="flex gap-4 text-xs text-white/40 mt-2">
        <span>
          <span className="text-emerald-400">■ </span>low
        </span>
        <span>
          <span className="text-amber-400">■ </span>med
        </span>
        <span>
          <span className="text-rose-400">■ </span>high
        </span>
      </div>
    </div>
  );
  const lErrors = (
    <div className="flex flex-col gap-4 w-full">
      <Sparkline values={errorH} color="#FB7185" width={580} height={200} />
      {data?.recent_errors?.length ? (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/50">
              <th className="text-left pb-1">Time</th>
              <th className="text-left pb-1">Source</th>
              <th className="text-left pb-1">Event</th>
              <th className="text-left pb-1">Message</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_errors.slice(0, 15).map((e: any, i: number) => (
              <tr key={i} className="border-t border-white/5">
                <td className="py-1 pr-2 text-white/60">{e.timestamp}</td>
                <td className="py-1 pr-2 text-white/60">{e.source}</td>
                <td className="py-1 pr-2 text-white/60">{e.event_id}</td>
                <td className="py-1 text-white/60 truncate">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
  const lPageFaults = (
    <Sparkline values={pageFaults} color="#F97316" width={580} height={200} />
  );
  const lTopProcs = (
    <div className="space-y-2 text-sm w-full">
      {(topProcs ?? []).slice(0, 15).map((p: any, i: number) => (
        <div
          key={i}
          className="flex justify-between border-b border-white/5 pb-1"
        >
          <span className="text-white/70">{p.name ?? p.cmd ?? "proc"}</span>
          <span className="text-white/40 font-mono">
            {p.cpu ?? p.cpu_percent ?? 0}%
          </span>
        </div>
      ))}
    </div>
  );

  const t2 = "bg-white/2 p-2 rounded-md";

  // ── INLINE ──────────────────────────────────────────────────────────────────
  if (inline)
    return (
      <div className="w-full bg-transparent">
        {active && (
          <ChartModal chart={active} onClose={() => setActive(null)} />
        )}
        <div className="w-full bg-black/60 backdrop-blur-lg border border-white/8 rounded-xl p-2 text-white">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold">Telemetry — 7 chart types</h4>
            <div className="text-[10px] text-white/40">
              click any chart to enlarge
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Tile
              title="① CPU Total — Sparkline"
              large={lCpuLine}
              open={open}
              className={`col-span-1 ${t2} flex flex-col gap-2`}
            >
              <div className="text-[10px] text-white/60">CPU Total</div>
              {cpuHistory.length ? (
                <Sparkline values={cpuHistory} color="#60A5FA" />
              ) : (
                <div className="text-sm text-white/40">no data</div>
              )}
              <div className="text-xs text-white/40">Now: {cpu_total}%</div>
            </Tile>
            <Tile
              title="② CPU Per-Core — Bar Chart"
              large={lCpuBar}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[10px] text-white/60">CPU Per-Core</div>
              <BarChart
                values={cpuPerCore
                  .slice(0, 12)
                  .map((v: number) => Math.round(v ?? 0))}
              />
            </Tile>
            <Tile
              title="④ RAM — Gauge + ⑥ Memory — Donut"
              large={
                <div className="flex gap-8">
                  {lRamGauge}
                  {lMemDonut}
                </div>
              }
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[10px] text-white/60">RAM / Memory</div>
              <div className="flex items-center gap-2 mt-1">
                {ram != null ? (
                  <Gauge value={ram} max={100} label={ramLabel} size={60} />
                ) : (
                  <div className="text-white/40 text-xs">no data</div>
                )}
                <DonutChart segments={memSegs} size={60} />
              </div>
            </Tile>
            <Tile
              title="③ Battery — Pie Chart"
              large={lBattery}
              open={open}
              className={`col-span-1 ${t2} flex flex-col items-center`}
            >
              <div className="text-[10px] text-white/60 mb-1">Battery</div>
              <PieChart value={batteryPercent} size={56} />
            </Tile>
            <Tile
              title="⑤ Network — Area Chart"
              large={lNetArea}
              open={open}
              className={`col-span-2 ${t2}`}
            >
              <div className="text-[10px] text-white/60 mb-1">
                Network ↑↓ (Area)
              </div>
              <div className="flex gap-1">
                <AreaChart
                  values={netUpH}
                  color="#a78bfa"
                  width={78}
                  height={36}
                />
                <AreaChart
                  values={netDnH}
                  color="#fb7185"
                  width={78}
                  height={36}
                />
              </div>
              <div className="text-xs text-white/40 mt-1">
                ↑ {netUp} ↓ {netDown} Mbps
              </div>
            </Tile>
          </div>
        </div>
      </div>
    );

  // ── FULL EXPANDED ────────────────────────────────────────────────────────────
  return (
    <>
      {active && <ChartModal chart={active} onClose={() => setActive(null)} />}
      {expanded && (
        <div
          className="fixed left-6 top-12 z-50 w-[1000px] max-h-[90vh] overflow-y-auto
                        bg-black/60 backdrop-blur-lg border border-white/8 rounded-xl p-4 text-white shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">
              Telemetry — 7 chart types · click any to enlarge
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 text-[10px] text-white/40 font-mono">
                {[
                  ["#60A5FA", "SparkLine"],
                  ["#60A5FA", "Bar"],
                  ["#f59e0b", "Pie"],
                  ["#10B981", "Gauge"],
                  ["#34D399", "Area"],
                  ["#fb7185", "Donut"],
                  ["#f97316", "Heatmap"],
                ].map(([c, n]) => (
                  <span key={n} className="flex items-center gap-0.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: c }}
                    />
                    {n}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-white/40 px-2 py-1 rounded hover:bg-white/5 flex items-center gap-1"
              >
                <X size={14} /> Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Tile
              title="① CPU Total — Sparkline"
              large={lCpuLine}
              open={open}
              className={`col-span-1 ${t2} flex flex-col gap-2`}
            >
              <div className="text-[11px] text-white/60">
                ① CPU Total — Sparkline
              </div>
              <Sparkline values={cpuHistory} color="#60A5FA" />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>Now: {cpu_total ?? "—"}%</span>
                <span>Alert: &gt;80%</span>
              </div>
            </Tile>

            <Tile
              title="② CPU Per-Core — Bar Chart"
              large={lCpuBar}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[11px] text-white/60">
                ② CPU Per-Core — Bar Chart
              </div>
              <div className="mt-2">
                <BarChart
                  values={(cpuPerCore ?? [])
                    .slice(0, 24)
                    .map((v: number) => Math.round(v ?? 0))}
                />
              </div>
            </Tile>

            <Tile
              title="⑦ CPU Core History — Heatmap"
              large={lHeatmap}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[11px] text-white/60">
                ⑦ Core History — Heatmap
              </div>
              <div className="mt-1">
                <HeatmapChart
                  data={coreHistories}
                  cols={20}
                  rows={Math.min(cpuPerCore.length || 8, 8)}
                  cellW={7}
                  cellH={9}
                />
              </div>
              <div className="flex gap-2 text-[9px] text-white/30 mt-1">
                <span className="text-emerald-400">■ low</span>
                <span className="text-amber-400">■ med</span>
                <span className="text-rose-400">■ high</span>
              </div>
            </Tile>

            <Tile
              title="④ RAM — Gauge"
              large={lRamGauge}
              open={open}
              className={`col-span-1 ${t2} flex flex-col items-center`}
            >
              <div className="text-[11px] text-white/60">④ RAM — Gauge</div>
              <Gauge value={ram ?? 0} max={100} label={ramLabel} size={80} />
            </Tile>

            <Tile
              title="⑥ Memory Breakdown — Donut"
              large={lMemDonut}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[11px] text-white/60">
                ⑥ Memory — Donut Chart
              </div>
              <div className="mt-2">
                <DonutChart segments={memSegs} size={80} />
              </div>
            </Tile>

            <Tile
              title="③ Battery — Pie Chart"
              large={lBattery}
              open={open}
              className={`col-span-1 ${t2} flex flex-col items-center`}
            >
              <div className="text-[11px] text-white/60">
                ③ Battery — Pie Chart
              </div>
              <PieChart value={batteryPercent} size={72} />
              <div className="text-xs text-white/40 mt-1">
                {batteryPercent}%
              </div>
            </Tile>

            <Tile
              title="⑤ Disk Throughput — Area Chart"
              large={lDiskArea}
              open={open}
              className={`col-span-2 ${t2}`}
            >
              <div className="text-[11px] text-white/60">
                ⑤ Disk R/W — Area Chart
              </div>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <div className="text-[9px] text-emerald-400/60 mb-0.5">
                    Read
                  </div>
                  <AreaChart values={diskR} color="#34D399" height={45} />
                </div>
                <div className="flex-1">
                  <div className="text-[9px] text-blue-400/60 mb-0.5">
                    Write
                  </div>
                  <AreaChart values={diskW} color="#60A5FA" height={45} />
                </div>
              </div>
              <div className="text-xs text-white/40 mt-1">
                Q:{diskQ} Lat:{Math.round(diskL)}ms
              </div>
            </Tile>

            <Tile
              title="⑤ Network — Area Chart"
              large={lNetArea}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[11px] text-white/60">
                ⑤ Network — Area Chart
              </div>
              <div className="flex gap-1 mt-1">
                <AreaChart
                  values={netUpH}
                  color="#a78bfa"
                  width={70}
                  height={40}
                />
                <AreaChart
                  values={netDnH}
                  color="#fb7185"
                  width={70}
                  height={40}
                />
              </div>
              <div className="text-xs text-white/40 mt-1">
                ↑{netUp} ↓{netDown} Mbps
              </div>
            </Tile>

            <Tile
              title="Disk Queue"
              large={<div className="text-7xl font-bold">{diskQ}</div>}
              open={open}
              className={`col-span-1 ${t2} flex flex-col items-center justify-center`}
            >
              <div className="text-[11px] text-white/60">Disk Queue</div>
              <div className="text-2xl font-bold mt-2">{diskQ}</div>
              <div className="text-xs text-white/40 mt-1">Alert: &gt;2</div>
            </Tile>

            <Tile
              title="Disk Latency"
              large={
                <div className="text-7xl font-bold" style={{ color: latColor }}>
                  {Math.round(diskL)}ms
                </div>
              }
              open={open}
              className={`col-span-1 ${t2} flex flex-col items-center justify-center`}
            >
              <div className="text-[11px] text-white/60">Disk Latency</div>
              <div
                className="text-2xl font-bold mt-2"
                style={{ color: latColor }}
              >
                {Math.round(diskL)}
              </div>
              <div className="text-xs text-white/40 mt-1">
                green&lt;10 red&gt;50
              </div>
            </Tile>

            <Tile
              title="Top Processes"
              large={lTopProcs}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[11px] text-white/60 mb-1">
                Top Processes
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                {topProcs?.length ? (
                  topProcs.slice(0, 6).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate pr-2">
                        {p.name ?? p.cmd ?? "proc"}
                      </span>
                      <span className="text-white/60">
                        {p.cpu ?? p.cpu_percent ?? 0}%
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40">no data</div>
                )}
              </div>
            </Tile>

            <Tile
              title="① Error Events — Sparkline"
              large={lErrors}
              open={open}
              className={`col-span-2 ${t2}`}
            >
              <div className="text-[11px] text-white/60 mb-1">
                ① Error Events — Sparkline
              </div>
              <Sparkline values={errorH} color="#FB7185" />
              <div className="text-xs text-white/40 mt-1">
                Alert: &gt;5 critical/hour
              </div>
              {data?.recent_errors?.length ? (
                <div className="mt-2 max-h-20 overflow-y-auto text-xs bg-white/5 rounded p-1">
                  {data.recent_errors.slice(0, 4).map((e: any, i: number) => (
                    <div key={i} className="truncate text-white/40">
                      {e.timestamp} · {e.source} · {e.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-white/30 mt-1">
                  No recent errors
                </div>
              )}
            </Tile>

            <Tile
              title="① Page Faults — Sparkline"
              large={lPageFaults}
              open={open}
              className={`col-span-1 ${t2}`}
            >
              <div className="text-[11px] text-white/60 mb-1">
                ① Page Faults — Sparkline
              </div>
              <Sparkline values={pageFaults} color="#F97316" />
              <div className="text-xs text-white/40 mt-1">
                Alert: &gt;1K/sec
              </div>
            </Tile>
          </div>
        </div>
      )}
    </>
  );
}

// Battery large node helper (used in open-charge event)
function BattLarge({ data, bp }: { data: any; bp: number }) {
  return (
    <div className="flex gap-8 items-center">
      <PieChart value={bp} size={240} />
      <div className="text-sm text-white/70 space-y-3">
        <div>
          <b className="text-white">Percent:</b> {bp}%
        </div>
        <div>
          <b className="text-white">Status:</b>{" "}
          {data?.battery_state ?? data?.charging_state ?? "unknown"}
        </div>
        <div>
          <b className="text-white">Charge Watts:</b>{" "}
          {data?.charge_watts ?? "—"}
        </div>
        <div>
          <b className="text-white">Updated:</b> {data?.timestamp ?? "—"}
        </div>
      </div>
    </div>
  );
}
