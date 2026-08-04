"use client";

import { useEffect, useState } from "react";

interface ReceiptLite {
  receiptId?: string;
  requestId?: string;
  capabilityId?: string;
  createdAt?: string;
  state?: string;
  outputHash?: string;
}

export default function LiveEvidence() {
  const [receipts, setReceipts] = useState<ReceiptLite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leeway/runtime/evidence/latest", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        const data = (b?.data?.receipts || []) as ReceiptLite[];
        setReceipts(data);
        if (!b?.ok && !data.length) setError(b?.degradedReasons?.[0] || "no data");
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="mt-4 w-full rounded-xl border border-[#4b8eff]/30 bg-[#121317]/90 p-4 font-mono text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-[#adc6ff]">LIVE: Kernel Evidence (receipts/latest)</span>
        <span className={`rounded-full px-2 py-0.5 ${receipts ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
          {receipts ? `${receipts.length} receipts` : "loading..."}
        </span>
      </div>
      {error && <p className="text-red-300">{error}</p>}
      <div className="space-y-2">
        {(receipts || []).map((r, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-black/30 p-2">
            <div className="flex flex-wrap gap-2 text-gray-300">
              <span className="text-gray-500">{r.requestId}</span>
              <span className="text-[#adc6ff]">{r.capabilityId}</span>
              <span className="text-gray-500">{r.state || ""}</span>
              <span className="text-gray-500">{r.createdAt || ""}</span>
            </div>
            <div className="truncate text-gray-500">{r.receiptId}</div>
            {r.outputHash && <div className="truncate text-emerald-300">output {r.outputHash.slice(0, 32)}...</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
