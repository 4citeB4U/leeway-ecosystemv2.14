"""Agent Lee Adaptive Body (P8).

Deterministic posture controller over live telemetry:
  ACTIVE      healthy -> full learning cadence
  THROTTLED   cpu >= 80% or mem >= 85% -> defer heavy learning
  SLEEP       disk >= 92% or sustained idle -> minimal work
  RECOVERING  an alert is active -> stabilization only
  UNKNOWN     telemetry missing/empty -> no fabricated state

Energy budget = 100 - max(cpu, mem) clamped to [0, 100]. All recommendations
are lowest-capable-trusted-level (deterministic rules first; LLM never used)."""

import json
import time

from . import harness_engine
from . import store

META_STATE = "lw_adaptive_state"
META_STATE_AT = "lw_adaptive_state_at"

THROTTLE_CPU = 80
THROTTLE_MEM = 85
SLEEP_DISK = 92
ALERT_MEM = 90


def compute(conn, telemetry=None):
    """Compute adaptive body state. telemetry: dict or None; missing fields are
    never invented -- partial telemetry still yields a decision using only
    available fields, and zero telemetry yields UNKNOWN."""
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if telemetry is None:
        row = conn.execute("SELECT * FROM hardware_stats ORDER BY captured_at DESC LIMIT 1").fetchone()
        telemetry = dict(row) if row else {}
    if telemetry:
        cpu = telemetry.get("cpu_pct") if telemetry.get("cpu_pct") is not None else telemetry.get("cpu_usage_pct")
        mem = telemetry.get("mem_pct")
        disk = telemetry.get("disk_brain_pct")
        alerts = telemetry.get("alerts")
        if alerts is None and telemetry.get("alerts_json"):
            try:
                alerts = len(json.loads(telemetry["alerts_json"]))
            except (json.JSONDecodeError, TypeError):
                alerts = None
    else:
        cpu = mem = disk = alerts = None
    if cpu is None and mem is None and disk is None:
        return {"posture": "UNKNOWN", "computedAt": now, "energyBudget": None, "reason": "no telemetry",
                "recommendations": ["collect telemetry before adapting"], "deterministic": True}
    available = [v for v in (cpu, mem, disk) if isinstance(v, (int, float))]
    energy = max(0, min(100, int(100 - max(available)))) if available else None
    recs = []
    if alerts:
        posture = "RECOVERING"
        recs.append("stabilize active alerts before learning")
    elif disk is not None and disk >= SLEEP_DISK:
        posture = "SLEEP"
        recs.append("defer heavy learning until disk headroom returns")
    elif (cpu is not None and cpu >= THROTTLE_CPU) or (mem is not None and mem >= THROTTLE_MEM):
        posture = "THROTTLED"
        recs.append("defer heavy learning; run only light canary checks")
    else:
        posture = "ACTIVE"
        canary_q = conn.execute(
            "SELECT COUNT(*) AS n FROM learning_artifacts WHERE promotion_status = 'CANARY'"
            " AND (canary_status IS NULL OR canary_status != 'rolled_back')"
        ).fetchone()["n"]
        if canary_q > 0:
            recs.append("run canary evaluation window")
        else:
            recs.append("continue corpus ingestion and regression baselines")
    state = {"posture": posture, "computedAt": now, "energyBudget": energy,
             "telemetryUsed": {k: telemetry.get(k) for k in ("cpu_pct", "mem_pct", "disk_brain_pct", "alerts")},
             "recommendations": recs, "deterministic": True}
    store.set_meta(conn, META_STATE, json.dumps(state))
    store.set_meta(conn, META_STATE_AT, now)
    conn.commit()
    return state


def snapshot(conn):
    raw = store.get_meta(conn, META_STATE)
    at = store.get_meta(conn, META_STATE_AT)
    if not raw:
        return {"posture": "UNKNOWN", "computedAt": at, "energyBudget": None, "reason": "no state computed yet",
                "recommendations": [], "deterministic": True}
    state = json.loads(raw)
    state["computedAt"] = at
    return state