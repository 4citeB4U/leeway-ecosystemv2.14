"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDeviceOnboardingSummary, type DeviceOnboardingSummary } from "../src/lib/deviceOnboardingReviewClient";

function Badge(props: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
      {props.children}
    </span>
  );
}

function WarningBadge(props: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200">
      {props.children}
    </span>
  );
}

function AssetTable(props: { title: string; assets: any[]; empty: string }) {
  const assets = props.assets || [];

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{props.title}</h2>
        <Badge>{assets.length} discovered</Badge>
      </div>

      {assets.length === 0 ? (
        <p className="text-sm text-slate-400">{props.empty}</p>
      ) : (
        <div className="max-h-96 overflow-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="p-3">Asset</th>
                <th className="p-3">Family</th>
                <th className="p-3">Status</th>
                <th className="p-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => {
                const label =
                  asset.display_name ||
                  asset.friendly_name ||
                  asset.name ||
                  asset.reverse_dns_name ||
                  asset.ip ||
                  asset.asset_id ||
                  "Unknown asset";

                const family = asset.classification?.family || "unclassified";
                const status = asset.onboarding_status || asset.control_status || "review_required";
                const risk = asset.classification?.control_risk || asset.control_status || "approval_required";

                return (
                  <tr key={asset.asset_id || index} className="border-t border-white/10">
                    <td className="p-3 text-slate-100">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-slate-500">{asset.asset_id || asset.instance_id || asset.mac || ""}</div>
                    </td>
                    <td className="p-3 text-slate-300">{family}</td>
                    <td className="p-3 text-slate-300">{status}</td>
                    <td className="p-3 text-slate-400">{risk}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AgentLeeDeviceOnboardingReviewPanel() {
  const [data, setData] = useState<DeviceOnboardingSummary | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result = await fetchDeviceOnboardingSummary();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    return data?.totals || { network: 0, bluetooth: 0, printers: 0, queue: 0 };
  }, [data]);

  const queue = data?.queue || [];
  const network = data?.assets?.network || [];
  const bluetooth = data?.assets?.bluetooth || [];
  const printers = data?.assets?.printers || [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Agent Lee Device Onboarding</p>
              <h1 className="mt-2 text-3xl font-bold text-white">Physical Rolodex Review</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Read-only review lane for discovered network, Bluetooth, and printer assets. This page cannot pair, print, deploy,
                publish MQTT, arm Real Alpha, or control devices.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {data?.clearSkies ? <Badge>Clear Skies</Badge> : <WarningBadge>Clear Skies Unknown</WarningBadge>}
              <Badge>GET-only</Badge>
              <Badge>No execution buttons</Badge>
              <button
                type="button"
                onClick={load}
                className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
              >
                Refresh read-only data
              </button>
            </div>
          </div>
        </header>

        {loading && <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-slate-300">Loading read-only onboarding data...</div>}
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">{error}</div>}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-slate-400">Network assets</p>
                <p className="mt-2 text-3xl font-bold text-white">{totals.network}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-slate-400">Bluetooth assets</p>
                <p className="mt-2 text-3xl font-bold text-white">{totals.bluetooth}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-slate-400">Printer assets</p>
                <p className="mt-2 text-3xl font-bold text-white">{totals.printers}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm text-slate-400">Safe onboarding queue</p>
                <p className="mt-2 text-3xl font-bold text-white">{totals.queue}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
              <h2 className="text-lg font-semibold text-yellow-100">Blocked until explicit approval</h2>
              <p className="mt-2 text-sm text-yellow-100/80">
                No port scans, Bluetooth onboarding, GATT writes, print submissions, container IoT staging, broker outbound message, Real Alpha arm,
                or device control exists on this page.
              </p>
            </section>

            <AssetTable title="Safe Onboarding Queue" assets={queue} empty="No onboarding queue items." />
            <AssetTable title="Network Assets" assets={network} empty="No network assets discovered." />
            <AssetTable title="Bluetooth Assets" assets={bluetooth} empty="No Bluetooth assets discovered." />
            <AssetTable title="Printer Assets" assets={printers} empty="No printers discovered." />
          </>
        )}
      </div>
    </main>
  );
}