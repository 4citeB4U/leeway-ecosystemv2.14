/**
 * TaskSpinePanel.tsx
 * ==================
 * Slide-out panel (from right) for the Task Execution Spine.
 *
 * Features:
 *  - Preview a multi-step plan (POST /api/task/plan)
 *  - Execute the plan (POST /api/task)
 *  - Display each step with policy tier badge
 *  - Show proof screenshot links
 *  - Model / spine status bar at the top
 */

import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import RuntimeBridgeConsole from "./RuntimeBridgeConsole";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanStep {
  id: number;
  tool: string;
  args: Record<string, unknown>;
  desc: string;
  verify?: string;
  policy_tier?: "ALLOW" | "ALLOW_LOG" | "APPROVE" | "DENY";
  needs_approval?: boolean;
  denied?: boolean;
}

interface Plan {
  goal: string;
  mode: string;
  requires_approval: boolean;
  steps: PlanStep[];
  _source?: "foundry" | "fallback";
}

interface StepResult {
  step_id: number;
  tool: string;
  desc: string;
  policy: string;
  ok: boolean;
  pre_proof?: string;
  post_proof?: string;
  verified?: boolean;
  error?: string;
}

interface SpineStatus {
  spine_ok: boolean;
  policy_ok: boolean;
  planner_ok: boolean;
  intent_classes: string[];
}

interface ModelStatus {
  router_ok: boolean;
  foundry_ok: boolean;
  foundry_base: string;
  foundry_models: string[];
  vl_ok: boolean;
}

interface RuntimeBridgeEvent {
  ts: string;
  event: string;
  payload?: Record<string, unknown>;
}

interface RuntimeBridgeProgress {
  ts: string;
  task_id: string;
  status: string;
  step_id?: number | null;
  tool?: string | null;
  details?: Record<string, unknown>;
}

interface RuntimeBridgeSummary {
  task_count: number;
  agent_count: number;
  active_tasks: number;
  active_agents: number;
  latest_event?: RuntimeBridgeEvent | null;
  latest_progress?: RuntimeBridgeProgress | null;
}

interface RuntimeBridgeSnapshot {
  ok: boolean;
  paths: Record<string, string>;
  state: Record<string, unknown>;
  events: RuntimeBridgeEvent[];
  progress: RuntimeBridgeProgress[];
  sessions: Array<Record<string, unknown>>;
  summary: RuntimeBridgeSummary;
}

interface RuntimeProjectionEntry {
  id: string;
  status: string;
  tool?: string | null;
  updated_at?: string;
  details?: Record<string, unknown>;
}

interface RuntimeSessionEntry {
  ts: string;
  session_id: string;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  ALLOW: "bg-green-900/50 text-green-300 border-green-700",
  ALLOW_LOG: "bg-blue-900/50 text-blue-300 border-blue-700",
  APPROVE: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  DENY: "bg-red-900/50 text-red-300 border-red-700",
};

const RUNTIME_STATUS_COLORS: Record<string, string> = {
  queued: "text-white/50 border-white/10 bg-white/5",
  classified: "text-sky-300 border-sky-800/60 bg-sky-950/30",
  planned: "text-indigo-300 border-indigo-800/60 bg-indigo-950/30",
  running: "text-emerald-300 border-emerald-800/60 bg-emerald-950/30",
  completed: "text-green-300 border-green-800/60 bg-green-950/30",
  approval_required: "text-yellow-300 border-yellow-800/60 bg-yellow-950/30",
  blocked: "text-red-300 border-red-800/60 bg-red-950/30",
  failed: "text-rose-300 border-rose-800/60 bg-rose-950/30",
};

function formatRuntimeTime(ts?: string) {
  if (!ts) return "--:--:--";
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) return ts;
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function summarizeRuntimeObject(value?: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) return "";
  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function summarizeRuntimeText(value?: string, maxLen = 96) {
  const text = (value || "").trim();
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
}

function getProjectionEntries(
  state: Record<string, unknown> | undefined,
  bucket: "tasks" | "agents",
) {
  const collection = state?.[bucket];
  if (!collection || typeof collection !== "object") return [];

  return Object.entries(collection as Record<string, Record<string, unknown>>)
    .map(([id, value]) => {
      const details =
        value?.details && typeof value.details === "object"
          ? (value.details as Record<string, unknown>)
          : undefined;

      return {
        id,
        status: String(value?.status || "unknown"),
        tool:
          typeof value?.tool === "string"
            ? value.tool
            : typeof details?.tool === "string"
              ? details.tool
              : null,
        updated_at:
          typeof value?.updated_at === "string" ? value.updated_at : undefined,
        details,
      };
    })
    .sort((left, right) => {
      const leftTs = new Date(left.updated_at || 0).getTime();
      const rightTs = new Date(right.updated_at || 0).getTime();
      return rightTs - leftTs;
    });
}

function getSessionEntries(sessions: Array<Record<string, unknown>>) {
  return sessions
    .map((entry) => ({
      ts: String(entry.ts || ""),
      session_id: String(entry.session_id || "unknown-session"),
      role: String(entry.role || "unknown"),
      content: String(entry.content || ""),
      metadata:
        entry.metadata && typeof entry.metadata === "object"
          ? (entry.metadata as Record<string, unknown>)
          : undefined,
    }))
    .filter((entry) => entry.content)
    .sort(
      (left, right) =>
        new Date(right.ts || 0).getTime() - new Date(left.ts || 0).getTime(),
    );
}

const TierBadge: React.FC<{ tier?: string }> = ({ tier }) => {
  if (!tier) return null;
  return (
    <span
      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TIER_COLORS[tier] ?? "bg-white/10 text-white/40 border-white/10"}`}
    >
      {tier}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const TaskSpinePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  onOpenRuntimeConsole?: () => void;
}> = ({ open, onClose, onOpenRuntimeConsole }) => {
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [proofs, setProofs] = useState<string[]>([]);
  const [speak, setSpeak] = useState<string | null>(null);
  const [spineStatus, setSpineStatus] = useState<SpineStatus | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [runtimeBridge, setRuntimeBridge] =
    useState<RuntimeBridgeSnapshot | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const runtimeTasks = getProjectionEntries(runtimeBridge?.state, "tasks");
  const runtimeAgents = getProjectionEntries(runtimeBridge?.state, "agents");
  const runtimeSessions = getSessionEntries(runtimeBridge?.sessions ?? []);

  // Fetch spine + model status on open
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/spine/status")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/models")
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/runtime/bridge?limit=12")
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([ss, ms, rb]) => {
      if (ss) setSpineStatus(ss);
      if (ms) setModelStatus(ms);
      if (rb) setRuntimeBridge(rb);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const fetchRuntimeBridge = async () => {
      try {
        const res = await fetch("/api/runtime/bridge?limit=12");
        const data = await res.json();
        if (mounted) setRuntimeBridge(data);
      } catch {
        if (mounted) setRuntimeBridge(null);
      }
    };

    fetchRuntimeBridge();
    const timer = window.setInterval(fetchRuntimeBridge, 2000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [open]);

  const reset = () => {
    setPlan(null);
    setIntent(null);
    setPlanNote(null);
    setStepResults([]);
    setProofs([]);
    setSpeak(null);
  };

  const handlePreview = useCallback(async () => {
    if (!goal.trim()) return;
    setPreviewing(true);
    reset();
    try {
      const res = await fetch("/api/task/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: goal }),
      });
      const data = await res.json();
      setIntent(data.intent ?? null);
      setPlan(data.plan ?? null);
      setPlanNote(data.note ?? null);
    } catch {
      setPlanNote("Error contacting daemon");
    } finally {
      setPreviewing(false);
    }
  }, [goal]);

  const handleExecute = useCallback(
    async (approveAll = false) => {
      if (!goal.trim()) return;
      setExecuting(true);
      setStepResults([]);
      setProofs([]);
      setSpeak(null);
      try {
        const res = await fetch("/api/task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: goal, approve_all: approveAll }),
        });
        const data = await res.json();
        setStepResults(data.steps ?? []);
        setProofs(data.proofs ?? []);
        setSpeak(data.speak ?? null);
      } catch {
        setSpeak("Error: could not contact daemon");
      } finally {
        setExecuting(false);
      }
    },
    [goal],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handlePreview();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="ts-panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-120 z-70 flex flex-col bg-black/80 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-white/70">
                  Task Spine
                </span>
                {spineStatus && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${spineStatus.spine_ok ? "text-green-400 border-green-800 bg-green-950/50" : "text-red-400 border-red-800 bg-red-950/50"}`}
                  >
                    {spineStatus.spine_ok ? "READY" : "OFFLINE"}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white transition-colors text-lg leading-none px-2"
                aria-label="Close Task Spine panel"
              >
                ×
              </button>
            </div>

            {/* Model status bar */}
            {modelStatus && (
              <div className="flex items-center gap-3 px-5 py-2 bg-black/30 border-b border-white/5 text-[10px] font-mono text-white/40">
                <span
                  className={
                    modelStatus.foundry_ok ? "text-green-500" : "text-red-500"
                  }
                >
                  ● Foundry {modelStatus.foundry_ok ? "OK" : "OFFLINE"}
                </span>
                {modelStatus.foundry_ok &&
                  modelStatus.foundry_models.length > 0 && (
                    <span className="text-white/25 truncate max-w-45">
                      {modelStatus.foundry_models[0]}
                    </span>
                  )}
                <span
                  className={
                    modelStatus.vl_ok ? "text-cyan-500" : "text-white/20"
                  }
                >
                  ● VL {modelStatus.vl_ok ? "OK" : "standby"}
                </span>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {runtimeBridge && (
                <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/10 p-4">
                  <RuntimeBridgeConsole
                    variant="compact"
                    enabled={open}
                    onOpenWindow={onOpenRuntimeConsole}
                  />
                </div>
              )}

              {/* Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  Goal (Ctrl+Enter to preview)
                </label>
                <textarea
                  ref={inputRef}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Open Telegram, find Mike, type: I'll call you later…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handlePreview}
                  disabled={previewing || !goal.trim()}
                  className="flex-1 py-2 px-3 text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {previewing ? "Planning…" : "Preview Plan"}
                </button>
                <button
                  onClick={() => handleExecute(false)}
                  disabled={executing || !goal.trim()}
                  className="flex-1 py-2 px-3 text-xs font-mono bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/40 rounded-lg text-blue-300 hover:text-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {executing ? "Running…" : "Run Task"}
                </button>
                <button
                  onClick={() => handleExecute(true)}
                  disabled={executing || !goal.trim()}
                  className="py-2 px-3 text-xs font-mono bg-yellow-900/20 hover:bg-yellow-800/30 border border-yellow-700/30 rounded-lg text-yellow-400 hover:text-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Run with all approvals pre-granted (no policy prompts)"
                >
                  Auto-Approve
                </button>
              </div>

              {/* Intent badge */}
              {intent && (
                <div className="text-[10px] font-mono text-white/40">
                  intent: <span className="text-cyan-400">{intent}</span>
                  {planNote && (
                    <span className="ml-2 text-white/25">{planNote}</span>
                  )}
                </div>
              )}

              {/* Plan preview */}
              {plan && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                      Plan ({plan.steps.length} steps)
                    </span>
                    {plan._source && (
                      <span className="text-[9px] font-mono text-white/20">
                        {plan._source}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {plan.steps.map((step) => (
                      <div
                        key={step.id}
                        className={`rounded-lg border p-2.5 text-xs ${step.denied ? "border-red-800/60 bg-red-950/20" : step.needs_approval ? "border-yellow-800/50 bg-yellow-950/10" : "border-white/8 bg-white/3"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-white/30 text-[9px] font-mono shrink-0">
                              {step.id}
                            </span>
                            <span className="text-white/70 truncate">
                              {step.desc}
                            </span>
                          </div>
                          <TierBadge tier={step.policy_tier} />
                        </div>
                        <div className="text-white/30 font-mono text-[9px] mt-1 truncate">
                          {step.tool}
                          {Object.keys(step.args).length > 0 && (
                            <span className="text-white/20 ml-1">
                              {JSON.stringify(step.args).slice(0, 60)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step execution results */}
              {stepResults.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                    Execution Results
                  </span>
                  {stepResults.map((sr) => (
                    <div
                      key={sr.step_id}
                      className={`rounded-lg border p-2.5 text-xs ${sr.ok ? "border-green-900/40 bg-green-950/10" : "border-red-900/40 bg-red-950/10"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/60 truncate">
                          {sr.desc || sr.tool}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <TierBadge tier={sr.policy} />
                          <span
                            className={`text-[9px] font-mono ${sr.ok ? "text-green-400" : "text-red-400"}`}
                          >
                            {sr.ok ? "✓" : "✗"}
                          </span>
                        </div>
                      </div>
                      {sr.error && (
                        <div className="text-red-400/70 font-mono text-[9px] mt-1 truncate">
                          {sr.error}
                        </div>
                      )}
                      {(sr.pre_proof || sr.post_proof) && (
                        <div className="flex gap-2 mt-1.5">
                          {sr.pre_proof && (
                            <span className="text-[9px] text-white/25 font-mono">
                              pre: {sr.pre_proof.split(/[\\/]/).pop()}
                            </span>
                          )}
                          {sr.post_proof && (
                            <span className="text-[9px] text-white/25 font-mono">
                              post: {sr.post_proof.split(/[\\/]/).pop()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Speak output */}
              {speak && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70 italic">
                  "{speak}"
                </div>
              )}

              {/* Proof screenshots */}
              {proofs.filter(Boolean).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                    Proof Screenshots
                  </span>
                  {proofs.filter(Boolean).map((p, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-mono text-white/30 truncate"
                    >
                      {p.split(/[\\/]/).pop()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/25">
              <span>policy · plan · verify · proof</span>
              <button
                onClick={reset}
                className="hover:text-white/50 transition-colors"
              >
                clear
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskSpinePanel;
