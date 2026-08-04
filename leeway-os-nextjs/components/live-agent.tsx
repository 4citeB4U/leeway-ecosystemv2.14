"use client";

import { useState } from "react";

const CAPABILITIES = [
  { id: "echo.ping", label: "echo.ping (low risk)" },
  { id: "model.ping", label: "model.ping (low risk)" },
  { id: "artifact.hash", label: "artifact.hash (low risk)" },
  { id: "task.slow", label: "task.slow (slow, diagnostic)" }
];

interface ReqState {
  ok?: boolean;
  error?: string;
  request?: {
    requestId?: string;
    capabilityId?: string;
    state?: string;
    receiptId?: string;
    correlationId?: string;
    outputHash?: string;
  };
  requestId?: string;
  correlationId?: string;
  degradedReasons?: string[];
}

export default function LiveAgent() {
  const [cap, setCap] = useState("echo.ping");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReqState | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const corr = new URLSearchParams(window.location.search).get("corr");
      const res = await fetch("/api/leeway/request" + (corr ? `?correlationId=${encodeURIComponent(corr)}` : ""), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ capabilityId: cap, note: note || undefined })
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 w-full rounded-xl border border-[#4b8eff]/30 bg-[#121317]/90 p-4 font-mono text-xs">
      <div className="mb-2 font-bold text-[#adc6ff]">LIVE: Kernel Request (UI -&gt; BFF -&gt; kernel -&gt; proof gate -&gt; receipt)</div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          className="rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-gray-200"
        >
          {CAPABILITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional)"
          className="flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-gray-200 placeholder:text-gray-600"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-lg bg-[#4b8eff] px-4 py-1.5 font-bold text-white hover:bg-[#3d7ae0] disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send request"}
        </button>
      </div>
      {result && (
        <div className="mt-3 space-y-1 rounded-lg border border-white/10 bg-black/30 p-2 text-gray-300">
          {result.error && <div className="text-red-300">error: {result.error}</div>}
          <div>
            requestId <span className="text-emerald-300">{result.request?.requestId || result.requestId}</span>
          </div>
          <div>
            correlationId <span className="text-emerald-300">{result.request?.correlationId || result.correlationId || "generated"}</span>
          </div>
          <div>
            state <span className="text-[#adc6ff]">{result.request?.state}</span>
          </div>
          {result.request?.receiptId && <div className="truncate">receipt {result.request.receiptId}</div>}
          {result.request?.outputHash && <div className="truncate text-emerald-300">output {result.request.outputHash.slice(0, 32)}...</div>}
          {result.degradedReasons?.map((d, i) => (
            <div key={i} className="text-amber-300">
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
