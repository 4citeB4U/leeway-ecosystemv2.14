"use client";

import { useEffect, useState } from "react";

export default function LiveRuntime() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leeway/runtime", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        setData(b?.data ?? null);
        if (!b?.ok) setErr(b?.degradedReasons?.[0] || null);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const d = data || {};
  return (
    <div className="mt-4 w-full rounded-xl border border-[#4b8eff]/30 bg-[#121317]/90 p-4 font-mono text-xs">
      <div className="mb-2 font-bold text-[#adc6ff]">LIVE: Runtime Status (kernel /runtime/status)</div>
      {err && <div className="text-red-300">degraded: {err}</div>}
      <div className="grid grid-cols-2 gap-2">
        <Cell label="kernel" value={d?.controlPlane?.status || "?"} />
        <Cell label="readiness" value={d?.readiness || "?"} />
        <Cell label="model appliance" value={d?.modelAppliance?.status || "?"} />
        <Cell label="ledger valid" value={String(d?.ledger?.valid ?? "?")} />
        <Cell label="ledger records" value={String(d?.ledger?.recordCount ?? "?")} />
        <Cell label="publisher bound" value={String(d?.publisher?.bound ?? "?")} />
      </div>
      {Array.isArray(d?.modelAppliance?.models) && (
        <div className="mt-2 text-gray-400">models: {d.modelAppliance.models.join(", ")}</div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <div className="text-gray-500">{label}</div>
      <div className="text-gray-200">{value}</div>
    </div>
  );
}
