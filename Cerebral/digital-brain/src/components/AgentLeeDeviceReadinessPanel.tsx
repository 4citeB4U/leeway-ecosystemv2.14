"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDeviceReadinessGroups,
  getDeviceReadinessProtocolCandidateDrafts,
  getDeviceReadinessRecommendations,
  getDeviceReadinessSafety,
  getDeviceReadinessSummary
} from "@/lib/deviceReadinessClient";

type LoadState = {
  loading: boolean;
  error: string;
  summary: any;
  groups: any;
  drafts: any[];
  safety: any;
  recommendations: any;
};

const initialState: LoadState = {
  loading: true,
  error: "",
  summary: null,
  groups: null,
  drafts: [],
  safety: null,
  recommendations: null
};

function CountCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value ?? 0}</div>
    </div>
  );
}

function GroupList({ title, items }: { title: string; items: any[] }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-slate-400">No assets in this group.</div>
        ) : items.map((item, index) => (
          <div key={`${item.identity_candidate_id || title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="font-semibold text-white">{item.confirmed_asset_name || item.identity_candidate_id || "Unnamed asset"}</div>
            <div className="mt-1 text-xs text-slate-400">{item.identity_candidate_id}</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
              <div><span className="text-slate-500">Type:</span> {item.asset_type || "unknown"}</div>
              <div><span className="text-slate-500">Trust:</span> {item.trust_level || "unknown"}</div>
              <div><span className="text-slate-500">Matches:</span> {item.passive_match_count ?? 0}</div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-950 px-3 py-2 text-xs text-amber-200">
              Readiness only. No device action is authorized from this page.
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AgentLeeDeviceReadinessPanel() {
  const [state, setState] = useState<LoadState>(initialState);

  async function load() {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [summary, groups, drafts, safety, recommendations] = await Promise.all([
        getDeviceReadinessSummary(),
        getDeviceReadinessGroups(),
        getDeviceReadinessProtocolCandidateDrafts(),
        getDeviceReadinessSafety(),
        getDeviceReadinessRecommendations()
      ]);

      if (!summary.ok) throw new Error(summary.error || "summary_failed");
      if (!groups.ok) throw new Error(groups.error || "groups_failed");
      if (!drafts.ok) throw new Error(drafts.error || "drafts_failed");

      setState({
        loading: false,
        error: "",
        summary: summary.data,
        groups: groups.data?.groups || {},
        drafts: drafts.data?.protocolCandidateDrafts || [],
        safety: safety.data || {},
        recommendations: recommendations.data || {}
      });
    } catch (error: any) {
      setState((current) => ({ ...current, loading: false, error: error?.message || String(error) }));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = state.summary?.counts || {};
  const stillBlocked = state.safety?.stillBlocked || [];
  const recommendationList = state.recommendations?.recommendations || [];

  const groups = useMemo(() => ({
    readOnly: state.groups?.read_only_monitoring_ready || [],
    futureOnboarding: state.groups?.future_onboarding_draft_only || [],
    researchOnly: state.groups?.research_only || [],
    unmatched: state.groups?.unmatched || []
  }), [state.groups]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">Agent Lee Phase 42</div>
              <h1 className="mt-2 text-4xl font-black text-white">Device Readiness Map</h1>
              <p className="mt-3 max-w-3xl text-slate-300">
                Readiness intelligence only. This page cannot onboard, pair, print, deploy bridges, deploy protocol translators, or execute physical actions.
              </p>
            </div>
            <button
              onClick={load}
              className="rounded-xl border border-cyan-600 bg-cyan-950/50 px-5 py-3 font-semibold text-cyan-100 hover:bg-cyan-900/60"
            >
              Refresh
            </button>
          </div>
          <div className="mt-5 rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100">
            Future onboarding request means draft-only. Protocol candidate means planning hint only. No action lane is authorized here.
          </div>
        </header>

        {state.error ? (
          <div className="rounded-2xl border border-red-700 bg-red-950/40 p-4 text-red-100">{state.error}</div>
        ) : null}

        {state.loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-300">Loading readiness map...</div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <CountCard label="Reviewed" value={counts.reviewed_records_live} />
              <CountCard label="Enriched" value={counts.enriched_records} />
              <CountCard label="Read-only ready" value={counts.read_only_monitoring_ready} />
              <CountCard label="Draft-only onboarding" value={counts.future_onboarding_draft_only} />
              <CountCard label="Protocol drafts" value={counts.protocol_candidate_drafts} />
              <CountCard label="Passive matched" value={counts.passive_inventory_matched} />
              <CountCard label="Unmatched" value={counts.passive_inventory_unmatched} />
              <CountCard label="Research only" value={counts.research_only} />
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
              <h2 className="text-lg font-bold text-white">Readiness Grade</h2>
              <div className="mt-2 text-2xl font-black text-cyan-200">{state.summary?.readinessGrade || "UNKNOWN"}</div>
              <div className="mt-3 text-sm text-slate-400">Write scope: DEVICE_READINESS_GET_ONLY</div>
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
              <GroupList title="Read-only monitoring ready" items={groups.readOnly} />
              <GroupList title="Future onboarding request draft-only" items={groups.futureOnboarding} />
              <GroupList title="Research only" items={groups.researchOnly} />
              <GroupList title="Unmatched / needs review" items={groups.unmatched} />
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
              <h2 className="text-lg font-bold text-white">Protocol Candidate Drafts</h2>
              <div className="mt-4 space-y-3">
                {state.drafts.length === 0 ? <div className="text-sm text-slate-400">No protocol draft candidates.</div> : state.drafts.map((draft, index) => (
                  <div key={`${draft.identity_candidate_id}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="font-semibold text-white">{draft.confirmed_asset_name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(draft.draft_protocol_hints || []).map((hint: string) => (
                        <span key={hint} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-200">{hint}</span>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-amber-200">Draft-only. No translator, bridge, onboarding, or device action authorized.</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
                <h2 className="text-lg font-bold text-white">Recommendations</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
                  {recommendationList.map((item: string) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-red-800/60 bg-red-950/20 p-5">
                <h2 className="text-lg font-bold text-red-100">Still Blocked</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stillBlocked.map((item: string) => (
                    <span key={item} className="rounded-full border border-red-800 bg-red-950/50 px-3 py-1 text-xs text-red-100">{item}</span>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
