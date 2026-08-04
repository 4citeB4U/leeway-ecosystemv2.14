"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchIdentityConfirmationSummary, saveHumanIdentityReviewState, type HumanIdentityReviewInput, type IdentityConfirmationSummary } from "../src/lib/identityConfirmationClient";

const ASSET_TYPES = ["router","computer","phone","tablet","tv","speaker","headset","keyboard","mouse","printer","camera","iot_device","virtual_device","unknown"];
const TRUST_LEVELS = ["trusted","known_but_limited","unknown","untrusted","ignore"];
const DISPOSITIONS = ["ignore","monitor_read_only","prepare_future_onboarding_request","needs_more_research"];

function Badge(props: { children: React.ReactNode }) {
  return <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">{props.children}</span>;
}

function GuardBadge(props: { children: React.ReactNode }) {
  return <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-100">{props.children}</span>;
}

function nameOf(candidate: any) {
  return candidate?.display_name || candidate?.asset_id || candidate?.identity_candidate_id || "Unconfirmed asset";
}

function evidenceText(candidate: any) {
  const evidence = candidate?.observed_evidence || {};
  return [evidence?.ip, evidence?.mac, evidence?.hostname, evidence?.printer_name, evidence?.bluetooth_address].filter(Boolean).join(" | ") || "No extra evidence";
}

function ReviewForm(props: { candidate: any; existing?: any; onSaved: () => Promise<void> }) {
  const candidate = props.candidate;
  const existing = props.existing || {};
  const [form, setForm] = useState<HumanIdentityReviewInput>({
    identity_candidate_id: candidate?.identity_candidate_id || "",
    confirmed_asset_name: existing?.confirmed_asset_name || nameOf(candidate),
    asset_type: existing?.asset_type || "unknown",
    location_or_room: existing?.location_or_room || "",
    owner_or_responsible_person: existing?.owner_or_responsible_person || "",
    trust_level: existing?.trust_level || "unknown",
    disposition: existing?.disposition || "needs_more_research",
    notes: existing?.notes || "",
    reviewed_by: existing?.reviewed_by || "Leonard J Lee",
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  function update(key: keyof HumanIdentityReviewInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      await saveHumanIdentityReviewState(form);
      setStatus("Saved review metadata only. No onboarding or device action was authorized.");
      await props.onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs text-slate-300">Confirmed name<input className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.confirmed_asset_name} onChange={(event) => update("confirmed_asset_name", event.target.value)} /></label>
        <label className="text-xs text-slate-300">Asset type<select className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.asset_type} onChange={(event) => update("asset_type", event.target.value)}>{ASSET_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-xs text-slate-300">Location or room<input className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.location_or_room} onChange={(event) => update("location_or_room", event.target.value)} /></label>
        <label className="text-xs text-slate-300">Responsible person<input className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.owner_or_responsible_person || ""} onChange={(event) => update("owner_or_responsible_person", event.target.value)} /></label>
        <label className="text-xs text-slate-300">Trust level<select className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.trust_level} onChange={(event) => update("trust_level", event.target.value)}>{TRUST_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="text-xs text-slate-300">Disposition<select className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.disposition} onChange={(event) => update("disposition", event.target.value)}>{DISPOSITIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <label className="mt-3 block text-xs text-slate-300">Notes<textarea className="mt-1 min-h-20 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} /></label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving} onClick={save} className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50">{saving ? "Saving..." : "Save review metadata"}</button>
        <span className="text-xs text-slate-400">Save scope: human identity review-state only.</span>
        {status && <span className="text-xs text-yellow-100">{status}</span>}
      </div>
    </div>
  );
}

function CandidateCard(props: { candidate: any; existing?: any; onSaved: () => Promise<void> }) {
  const candidate = props.candidate;
  return (
    <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{nameOf(candidate)}</h3>
          <p className="text-xs text-slate-500">{candidate?.asset_id || candidate?.identity_candidate_id}</p>
          <p className="mt-2 text-xs text-slate-400">{evidenceText(candidate)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{candidate?.source_family || "unknown"}</Badge>
          {props.existing ? <Badge>review saved</Badge> : <GuardBadge>needs review</GuardBadge>}
        </div>
      </div>
      <ReviewForm candidate={candidate} existing={props.existing} onSaved={props.onSaved} />
    </article>
  );
}

export default function AgentLeeIdentityConfirmationPanel() {
  const [data, setData] = useState<IdentityConfirmationSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchIdentityConfirmationSummary();
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

  const totals = useMemo(() => data?.totals || { candidates: 0, network: 0, bluetooth: 0, printers: 0, reviewed: 0 }, [data]);
  const all = data?.candidates || [];
  const records = Array.isArray(data?.reviewState?.records) ? data?.reviewState?.records : [];
  const byCandidate = new Map(records.map((record: any) => [record.identity_candidate_id, record]));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Agent Lee Phase 41</p>
              <h1 className="mt-2 text-3xl font-bold text-white">Identity Confirmation</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">Manual identity review-state only. Saving here records human labels and disposition; it does not authorize onboarding or device action.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data?.clearSkies ? <Badge>Clear Skies</Badge> : <GuardBadge>Clear Skies Unknown</GuardBadge>}
              <Badge>Review-state save lane</Badge>
              <GuardBadge>No device action</GuardBadge>
              <button type="button" onClick={load} className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20">Refresh</button>
            </div>
          </div>
        </header>

        {loading && <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-slate-300">Loading identity confirmation data...</div>}
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">{error}</div>}

        {data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5"><p className="text-sm text-slate-400">Total candidates</p><p className="mt-2 text-3xl font-bold text-white">{totals.candidates}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5"><p className="text-sm text-slate-400">Network</p><p className="mt-2 text-3xl font-bold text-white">{totals.network}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5"><p className="text-sm text-slate-400">Bluetooth</p><p className="mt-2 text-3xl font-bold text-white">{totals.bluetooth}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5"><p className="text-sm text-slate-400">Printers</p><p className="mt-2 text-3xl font-bold text-white">{totals.printers}</p></div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5"><p className="text-sm text-slate-400">Reviewed</p><p className="mt-2 text-3xl font-bold text-white">{totals.reviewed || records.length}</p></div>
            </section>

            <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
              <h2 className="text-lg font-semibold text-yellow-100">Human review-state only</h2>
              <p className="mt-2 text-sm text-yellow-100/80">This save lane records confirmed names, type, room, trust, disposition, and notes. It cannot start onboarding, stage bridge work, submit output jobs, link devices, or authorize physical execution.</p>
            </section>

            <section className="grid gap-4">
              {all.map((candidate: any, index: number) => (
                <CandidateCard key={candidate?.identity_candidate_id || index} candidate={candidate} existing={byCandidate.get(candidate?.identity_candidate_id)} onSaved={load} />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}