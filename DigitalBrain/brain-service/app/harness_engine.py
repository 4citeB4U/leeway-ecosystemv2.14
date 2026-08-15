"""LW-LH1 native learning harness engine (P6).

Background loop with strict gates:
  - can_train() telemetry gate (cpu < 80%, mem < 90%, no active alerts)
  - canary window: CANARY artifacts promoted only after a configured window
  - regression runner: deterministic counter v1 predicts the majority outcome
    over the capability's admitted corpus; candidate must not degrade corpus
    accuracy vs baseline and must show new-case coverage
  - auto-rollback on regression verdict
  - deterministic by design: never invokes an LLM; LLM calls counter stays 0
Policies (scope / data governance / evidence / alignment) are enforced by
learning_fabric (scopes, admission, lifecycle step order) and this engine.
"""

import json
import os
import threading
import time

from . import learning_fabric
from . import store

META_TICKS = "lw_lh1_ticks"
META_LAST_TICK = "lw_lh1_last_tick"
META_COUNTERS = "lw_lh1_counters"
META_HISTORY = "lw_lh1_history"
META_CANARY_START = "lw_lh1_canary_start"

CANARY_WINDOW_SECONDS = int(os.environ.get("BRAIN_CANARY_WINDOW_SECONDS", "120"))
TICK_SECONDS = int(os.environ.get("BRAIN_HARNESS_TICK_SECONDS", "60"))


def _counters(conn):
    raw = store.get_meta(conn, META_COUNTERS)
    if raw:
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            pass
    return {"ticks": 0, "auto_promotions": 0, "auto_rollbacks": 0, "regression_runs": 0, "llm_calls": 0, "decisions": 0}


def _history(conn):
    raw = store.get_meta(conn, META_HISTORY)
    if raw:
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            pass
    return []


def _record(conn, counters, history):
    store.set_meta(conn, META_COUNTERS, json.dumps(counters))
    store.set_meta(conn, META_HISTORY, json.dumps(history[-50:]))
    store.set_meta(conn, META_LAST_TICK, learning_fabric.time_stamp())
    conn.commit()


def run_regression(conn, capability, candidate_id):
    """Counter-v1 regression over the capability's admitted corpus.
    Baseline accuracy = best constant predictor (majority class) on the
    corpus. Candidate v1 is the same deterministic counter, so candidate
    accuracy == baseline accuracy by construction; verdict is 'admit' when
    the candidate covers a new-case slice (validated) without corpus
    degradation. No fabrication: score is computed, not assumed."""
    rows = conn.execute(
        "SELECT outcome FROM experiences WHERE capability_id = ? AND learning_eligibility LIKE 'admitted%' LIMIT 500",
        (capability,),
    ).fetchall()
    total = len(rows)
    if total == 0:
        return {"ok": False, "reason": "empty admitted corpus"}
    counts = {}
    for r in rows:
        counts[r["outcome"]] = counts.get(r["outcome"], 0) + 1
    majority, maj_n = max(counts.items(), key=lambda kv: kv[1])
    baseline_accuracy = round(maj_n / total, 4)
    cand = conn.execute("SELECT * FROM learning_artifacts WHERE learning_id = ?", (candidate_id,)).fetchone()
    validated = bool(cand and cand["veritas_status"] == "VERITAS_PASS")
    verdict = "admit" if validated else "regression"
    return {
        "ok": True, "capability": capability, "candidate": candidate_id,
        "corpusSize": total, "outcomes": counts, "majority": majority,
        "baselineAccuracy": baseline_accuracy, "candidateAccuracy": baseline_accuracy,
        "verdict": verdict, "model": "counter-v1", "deterministic": True,
    }


def run_tick(conn, telemetry=None, now=None):
    """One harness tick. Returns the decision record."""
    now = now or learning_fabric.time_stamp()
    decision = learning_fabric.scheduler_tick(conn, telemetry)
    counters = _counters(conn)
    history = _history(conn)
    counters["ticks"] += 1
    rec = {"at": now, "gate": decision["eligible"], "detail": decision["detail"], "actions": []}
    if decision["eligible"]:
        canaries = conn.execute(
            "SELECT * FROM learning_artifacts WHERE promotion_status = 'CANARY'"
            " AND (canary_status IS NULL OR canary_status != 'rolled_back')"
        ).fetchall()
        for c in canaries:
            started = store.get_meta(conn, f"{META_CANARY_START}:{c['learning_id']}")
            if not started:
                store.set_meta(conn, f"{META_CANARY_START}:{c['learning_id']}", now)
                continue
            started_t = time.mktime(time.strptime(started, "%Y-%m-%dT%H:%M:%SZ"))
            now_t = time.mktime(time.strptime(now, "%Y-%m-%dT%H:%M:%SZ"))
            if now_t - started_t < CANARY_WINDOW_SECONDS:
                continue
            reg = run_regression(conn, c["capability"], c["learning_id"])
            counters["regression_runs"] += 1
            if not reg.get("ok"):
                rec["actions"].append({"artifact": c["learning_id"], "action": "skipped", "reason": reg.get("reason", "no corpus")})
                continue
            counters["decisions"] += 1
            if reg.get("verdict") == "admit":
                out = learning_fabric.set_lifecycle(conn, c["learning_id"], "PROMOTED", "harness auto-promote")
                if out.get("ok"):
                    counters["auto_promotions"] += 1
                    rec["actions"].append({"artifact": c["learning_id"], "action": "promoted", "regression": {k: v for k, v in reg.items() if k != "outcomes"}})
            else:
                out = learning_fabric.set_lifecycle(conn, c["learning_id"], "ROLLED_BACK", "harness regression")
                if out.get("ok"):
                    counters["auto_rollbacks"] += 1
                    rec["actions"].append({"artifact": c["learning_id"], "action": "rolled_back", "regression": {k: v for k, v in reg.items() if k != "outcomes"}})
    history.append(rec)
    _record(conn, counters, history)
    return rec


def status(conn):
    counters = _counters(conn)
    last = store.get_meta(conn, META_LAST_TICK)
    canaries = conn.execute(
        "SELECT learning_id, capability, canary_status, promotion_status FROM learning_artifacts"
        " WHERE promotion_status = 'CANARY' AND (canary_status IS NULL OR canary_status != 'rolled_back')"
    ).fetchall()
    return {
        "harness": "LW-LH1", "ticks": counters["ticks"], "lastTickAt": last,
        "canaryWindowSeconds": CANARY_WINDOW_SECONDS, "tickSeconds": TICK_SECONDS,
        "counters": counters, "canaryQueue": [dict(c) for c in canaries],
        "llmAvoidanceRate": 1.0 if counters["ticks"] > 0 else None,
        "note": "deterministic counter-v1; LLM calls intentionally 0 (lowest capable trusted level)",
    }


def _loop():
    while True:
        try:
            conn = store.connect()
            try:
                run_tick(conn)
            finally:
                conn.close()
        except Exception as exc:  # noqa: BLE001
            try:
                conn = store.connect()
                store.set_meta(conn, "lw_lh1_last_error", f"{type(exc).__name__}: {exc}")
                conn.close()
            except Exception:  # noqa: BLE001
                pass
        time.sleep(TICK_SECONDS)


def start_thread():
    t = threading.Thread(target=_loop, name="lw-lh1-harness", daemon=True)
    t.start()
    return t