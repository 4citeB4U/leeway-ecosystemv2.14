"use client";

import { useEffect, useState } from "react";

export default function LiveRuntime() {
  const [authority, setAuthority] = useState<any>(null);
  const [runtime, setRuntime] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/leeway/runtime/authority", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/leeway/runtime", { cache: "no-store" }).then((r) => r.json())
    ])
      .then(([a, r]) => {
        setAuthority(a?.data ?? null);
        setRuntime(r?.data ?? null);
        const degraded = [a, r].flatMap((x) => x?.degradedReasons || []);
        if (degraded.length) setErr(degraded[0]);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const commit = authority?.approvedCommit ? String(authority.approvedCommit).slice(0, 12) : "?";
  const binding = authority?.runtimeBinding || {};
  const d = runtime || {};

  return (
    <div className="mt-4 w-full rounded-xl border border-[#4b8eff]/30 bg-[#121317]/90 p-4 font-mono text-xs">
      <div className="mb-2 font-bold text-[#adc6ff]">Runtime Fabric: authority vs. execution</div>
      {err && <div className="mb-2 text-amber-300">degraded: {err}</div>}
      <div className="grid grid-cols-2 gap-2">
        <Cell label="authority repo" value={authority?.repository || "?"} />
        <Cell label="approved commit" value={commit} />
        <Cell label="runtime binding" value={binding?.configured ? "CONFIGURED" : "UNBOUND"} />
        <Cell label="runtime proof" value={authority?.runtimeProof || "NOT_EXECUTED"} />
        <Cell label="kernel readiness" value={d?.readiness || d?.controlPlane?.status || "UNPROVEN"} />
        <Cell label="ledger valid" value={String(d?.ledger?.valid ?? "UNPROVEN")} />
      </div>
      <div className="mt-2 text-gray-400">
        Repository authority does not prove a deployed or healthy runtime.
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <div className="text-gray-500">{label}</div>
      <div className="break-all text-gray-200">{value}</div>
    </div>
  );
}
