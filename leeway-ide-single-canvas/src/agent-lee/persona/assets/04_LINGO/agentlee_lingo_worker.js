/**
 * @license
 * SPDX-License-Identifier: MIT
 */

/* ============================================================================
   LEEWAY HEADER — DO NOT REMOVE
   PROFILE: LEEWAY-ORDER
   TAG: TOOLS.WORKER.LINGO.MAIN
   REGION: 🟣 MCP
   VERSION: 1.0.0
   DISCOVERY_PIPELINE:
     Voice: "update slang", "refresh lingo", "learn new terms"
     Intent: LINGO_RESEARCH_REFRESH
     Location: MCP/WORKERS
     Vertical: ASSISTANT
     Ranking: SECONDARY
     Render: BACKGROUND_TASK
   ============================================================================ */

/**
 * agentlee_lingo_worker.js
 * Purpose:
 * - Fetch candidates (pluggable providers)
 * - Score + filter (safety + diffusion + formality)
 * - Write /lexicon/slang_pack.json into Memory Lake (IndexedDB)
 * - Mirror to backend via Memory Lake Bridge endpoints (best-effort)
 *
 * Integration assumptions:
 * - Frontend has an mlAdapter compatible with Memory Lake Bridge.
 * - Backend mirror endpoints exist (optional):
 *    POST /api/lake/put
 *
 * NOTE:
 * - This module does NOT hardcode a single public data source.
 * - You provide providers based on your deployment constraints.
 */

/** @type {const} */
const DEFAULTS = {
  path: "/lexicon/slang_pack.json",
  minConfidence: 0.70,
  maxFormalityRisk: 0.35,
  maxItems: 250,
  decayPerWeek: 0.05,
  denylist: [
    // Hard block: slurs/hate/profanity placeholders (expand in your private list)
    "slur_placeholder_1",
    "slur_placeholder_2"
  ]
};

/**
 * A provider returns candidate terms.
 * @typedef {Object} LingoProvider
 * @property {string} name
 * @property {(opts: any) => Promise<{ term: string, hint?: string, source?: string }[]>} fetchCandidates
 * @property {(term: string, opts: any) => Promise<{ meaning?: string, examples?: string[], regionHints?: string[] }>} enrichMeaning
 * @property {(term: string, opts: any) => Promise<{ velocity?: number, persistenceDays?: number }>} scoreDiffusion
 */

/**
 * Safe normalization.
 * @param {string} s
 */
function norm(s) {
  return (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Compute a simple confidence score from diffusion + meaning availability.
 */
function computeConfidence({ hasMeaning, velocity, persistenceDays }) {
  const v = Number.isFinite(velocity) ? Math.max(0, Math.min(1, velocity)) : 0.2;
  const p = Number.isFinite(persistenceDays) ? Math.max(0, Math.min(1, persistenceDays / 30)) : 0.2;
  const m = hasMeaning ? 1.0 : 0.4;
  return Math.max(0, Math.min(1, 0.45 * v + 0.35 * p + 0.20 * m));
}

/**
 * Estimate formality risk (lower is safer).
 */
function computeFormalityRisk({ hasMeaning, velocity, persistenceDays }) {
  const v = Number.isFinite(velocity) ? velocity : 0.2;
  const p = Number.isFinite(persistenceDays) ? persistenceDays : 7;
  let risk = 0.55;
  if (hasMeaning) risk -= 0.20;
  if (p >= 21) risk -= 0.15;
  if (v >= 0.6) risk -= 0.10;
  return Math.max(0, Math.min(1, risk));
}

/**
 * Apply time decay to confidence.
 * @param {number} confidence
 * @param {number} ageDays
 */
function decayConfidence(confidence, ageDays, decayPerWeek) {
  const weeks = Math.max(0, ageDays / 7);
  const dec = weeks * decayPerWeek;
  return Math.max(0, Math.min(1, confidence - dec));
}

/**
 * Merge old pack with new items (keep best version by confidence).
 */
function mergePacks(oldPack, newItems) {
  const map = new Map();
  for (const it of (oldPack?.items || [])) map.set(norm(it.term), it);
  for (const it of newItems) {
    const k = norm(it.term);
    const prev = map.get(k);
    if (!prev || (it.confidence ?? 0) >= (prev.confidence ?? 0)) map.set(k, it);
  }
  return Array.from(map.values());
}

/**
 * Write to Memory Lake (IndexedDB) and mirror (best-effort).
 */
async function putAndMirror(mlAdapter, payload, opts = {}) {
  const path = opts.path || DEFAULTS.path;
  const name = path.split("/").pop() || "slang_pack.json";

  const row = await mlAdapter.putFile(path, name, payload, {
    mime: "application/json",
    tags: ["RAG", "LINGO", "SLANG_PACK"],
    driveId: "L",
    slotId: 1,
  });

  try {
    await fetch("/api/lake/put", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
  } catch (e) {
    console.warn("[LingoWorker] Mirror failed", e);
  }
  return row;
}

/**
 * Main: refresh slang pack.
 */
async function refreshSlangPack(args) {
  const {
    mlAdapter,
    providers,
    now = new Date(),
    path = DEFAULTS.path,
    maxItems = DEFAULTS.maxItems,
    minConfidence = DEFAULTS.minConfidence,
    maxFormalityRisk = DEFAULTS.maxFormalityRisk,
    decayPerWeek = DEFAULTS.decayPerWeek,
    denylist = DEFAULTS.denylist,
    regionDefaults = ["National"]
  } = args || {};

  if (!mlAdapter) throw new Error("refreshSlangPack: mlAdapter is required");
  if (!providers || providers.length === 0) throw new Error("refreshSlangPack: providers[] is required");

  let oldPack = null;
  try { oldPack = await mlAdapter.getFile(path); } catch {}

  const candidates = [];
  for (const p of providers) {
    try {
      const got = await p.fetchCandidates({ now });
      for (const c of got || []) candidates.push({ ...c, _provider: p.name });
    } catch (e) {
      console.warn(`[LingoWorker] provider.fetchCandidates failed: ${p.name}`, e);
    }
  }

  const seen = new Set();
  const unique = [];
  for (const c of candidates) {
    const t = norm(c.term);
    if (!t) continue;
    if (denylist.includes(t)) continue;
    if (seen.has(t)) continue;
    if (!/^[a-z0-9][a-z0-9 '\-]{1,23}$/i.test(c.term.trim())) continue;
    seen.add(t);
    unique.push(c);
  }

  const enriched = [];
  for (const c of unique) {
    const term = c.term.trim();
    let meaning = "", examples = [], regionHints = [];
    let velocity = 0.2, persistenceDays = 7;

    for (const p of providers) {
      try {
        const m = await p.enrichMeaning(term, { now });
        meaning = m?.meaning || meaning;
        examples = (m?.examples || examples || []).slice(0, 3);
        regionHints = (m?.regionHints || regionHints || []);
        break;
      } catch {}
    }

    for (const p of providers) {
      try {
        const d = await p.scoreDiffusion(term, { now });
        velocity = Number.isFinite(d?.velocity) ? d.velocity : velocity;
        persistenceDays = Number.isFinite(d?.persistenceDays) ? d.persistenceDays : persistenceDays;
        break;
      } catch {}
    }

    const hasMeaning = Boolean(meaning && meaning.length >= 3);
    const confidence0 = computeConfidence({ hasMeaning, velocity, persistenceDays });
    const formalityRisk = computeFormalityRisk({ hasMeaning, velocity, persistenceDays });
    const confidence = decayConfidence(confidence0, 0, decayPerWeek);

    const regions = (regionHints && regionHints.length)
      ? Array.from(new Set(regionHints))
      : regionDefaults;

    if (confidence < minConfidence) continue;
    if (formalityRisk > maxFormalityRisk) continue;

    enriched.push({
      term,
      meaning: meaning || "—",
      pos: "unknown",
      regions,
      confidence: Number(confidence.toFixed(3)),
      formalityRisk: Number(formalityRisk.toFixed(3)),
      examples,
      allowIn: ["casual", "creative"],
      denyIn: ["legal", "compliance", "medical"],
      source: c.source || c._provider || "unknown",
      updatedAt: now.toISOString(),
    });

    if (enriched.length >= maxItems) break;
  }

  const merged = mergePacks(oldPack, enriched);

  const pack = {
    version: now.toISOString().slice(0, 10),
    updatedAt: now.toISOString(),
    items: merged.slice(0, maxItems),
  };

  await putAndMirror(mlAdapter, pack, { path });
  return { ok: true, path, count: pack.items.length, version: pack.version };
}

/**
 * Example provider stubs (no network).
 */
const ExampleProviders = {
  staticSeed: {
    name: "staticSeed",
    async fetchCandidates() {
      return [
        { term: "locked in", hint: "focused/committed", source: "seed" },
        { term: "run it back", hint: "retry", source: "seed" },
      ];
    },
    async enrichMeaning(term) {
      const t = norm(term);
      if (t === "locked in") return { meaning: "focused, committed, fully engaged", examples: ["We’re locked in."], regionHints: ["National"] };
      if (t === "run it back") return { meaning: "try again; repeat from the start", examples: ["Run it back."], regionHints: ["NY", "CHI", "National"] };
      return { meaning: "", examples: [], regionHints: [] };
    },
    async scoreDiffusion() {
      return { velocity: 0.6, persistenceDays: 60 };
    },
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { refreshSlangPack, ExampleProviders };
}
if (typeof window !== "undefined") {
  window.AgentLeeLingoWorker = { refreshSlangPack, ExampleProviders };
}
