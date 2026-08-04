"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  label: string;
  state: string;
  detail?: string;
  ok: boolean;
};

async function fetchStatus(path: string): Promise<Status> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    const body = await res.json();
    return { label: path, state: body?.status ?? "OK", detail: body?.ok ? "live" : "no data", ok: res.ok };
  } catch {
    return { label: path, state: "UNREACHABLE", ok: false };
  }
}

const NAV = [
  { href: "/s/leeway_home_1", label: "Home" },
  { href: "/s/workspaces", label: "Workspaces" },
  { href: "/s/evidence_center", label: "Evidence" },
  { href: "/s/agent_lee_interaction", label: "Agent Lee" },
  { href: "/s/control_center", label: "Runtime" },
  { href: "/s/security_setup", label: "Security" },
  { href: "/s/app_launcher_1", label: "Apps" },
  { href: "/s/appearance_settings", label: "Settings" }
];

export default function OsShell() {
  const [hidden, setHidden] = useState(false);
  const [kernel, setKernel] = useState<Status | null>(null);
  const [agent, setAgent] = useState<Status | null>(null);
  const [sessions, setSessions] = useState<Status | null>(null);

  useEffect(() => {
    fetchStatus("/api/leeway/health").then(setKernel);
    fetchStatus("/api/leeway/agent-lee").then(setAgent);
    fetchStatus("/api/leeway/session").then(setSessions);
  }, []);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed top-3 right-3 z-[9999] text-[11px] font-mono px-2 py-1 rounded-full border border-white/20 bg-[#121317]/90 text-gray-300"
      >
        LeeWay OS shell
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9990]">
      <div className="leeway-shell-dock rounded-t-xl mx-auto max-w-5xl px-4 pt-2 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#adc6ff] font-bold">LeeWay OS</span>
            <span className="px-1.5 py-0.5 rounded-full border border-white/15 text-gray-400">v0.1-mig008b</span>
            <span
              title={kernel ? JSON.stringify(kernel) : undefined}
              className={`px-2 py-0.5 rounded-full border ${
                kernel?.ok ? "border-emerald-400/40 text-emerald-300" : "border-red-400/40 text-red-300"
              }`}
            >
              kernel {kernel ? (kernel.ok ? "UP" : "DEGRADED") : "?"}
            </span>
            <span
              title={agent ? JSON.stringify(agent) : undefined}
              className={`px-2 py-0.5 rounded-full border ${
                agent?.ok ? "border-emerald-400/40 text-emerald-300" : "border-red-400/40 text-red-300"
              }`}
            >
              agent-lee {agent ? (agent.ok ? "LIVE" : "DOWN") : "?"}
            </span>
            <span
              title={sessions ? JSON.stringify(sessions) : undefined}
              className="px-2 py-0.5 rounded-full border border-white/15 text-gray-300"
            >
              sessions {sessions?.ok ? String(sessions.detail ?? "") : "?"}
            </span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-2.5 py-1 rounded-lg text-[12px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                {n.label}
              </Link>
            ))}
            <button
              onClick={() => setHidden(true)}
              className="px-2.5 py-1 rounded-lg text-[12px] text-gray-400 hover:bg-white/10"
            >
              Hide
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
