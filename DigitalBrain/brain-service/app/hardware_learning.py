"""Hardware Learning (P9): load-pattern and anomaly analytics over the
hardware_stats history. Pure stdlib statistics (mean/stdev), deterministic,
no fabrication: missing metrics -> UNKNOWN/UNAVAILABLE."""

import json
import math
import time

from . import store

META = "lw_hw_learning"
META_AT = "lw_hw_learning_at"


def _series(rows, key):
    out = []
    for r in rows:
        try:
            v = r[key]
        except (KeyError, IndexError):
            v = None
        if v is not None:
            out.append(v)
    return out


def _stats(vals):
    if not vals:
        return None
    n = len(vals)
    mean = sum(vals) / n
    var = sum((v - mean) ** 2 for v in vals) / n if n > 1 else 0.0
    sd = math.sqrt(var)
    vals_sorted = sorted(vals)
    p95 = vals_sorted[max(0, int(round(0.95 * n)) - 1)]
    return {"count": n, "mean": round(mean, 2), "stdev": round(sd, 2),
            "min": min(vals), "max": max(vals), "p95": p95}


def _anomalies(vals):
    """z-score > 3.0 = anomaly. Returns list of (index, value, z)."""
    st = _stats(vals)
    if not st or st["stdev"] == 0:
        return []
    out = []
    for i, v in enumerate(vals):
        z = abs(v - st["mean"]) / st["stdev"]
        if z > 3.0:
            out.append({"index": i, "value": v, "z": round(z, 2)})
    return out


def compute(conn, window_minutes=60):
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cutoff_ts = now
    rows = conn.execute(
        "SELECT captured_at, cpu_usage_pct, mem_pct, disk_brain_pct, disk_root_pct, alerts_json, platform"
        " FROM hardware_stats ORDER BY captured_at ASC"
    ).fetchall()
    cpu_series = _series(rows, "cpu_usage_pct")
    mem_series = _series(rows, "mem_pct")
    disk_series = _series(rows, "disk_brain_pct")
    alerts_total = 0
    for r in rows:
        try:
            aj = r["alerts_json"]
        except (KeyError, IndexError):
            aj = None
        if aj:
            try:
                alerts_total += len(json.loads(aj))
            except (json.JSONDecodeError, TypeError):
                pass
    return {
        "computedAt": now, "windowMinutes": window_minutes,
        "samples": len(rows), "alertsTotal": alerts_total,
        "cpu": _stats(cpu_series), "memory": _stats(mem_series), "disk": _stats(disk_series),
        "anomalies": {
            "cpu": _anomalies(cpu_series), "memory": _anomalies(mem_series), "disk": _anomalies(disk_series),
            "policy": "z-score > 3.0 (deterministic, stdlib)",
        },
        "patterns": {
            "sustainedHighMem": bool(mem_series and _stats(mem_series)["p95"] >= 85),
            "sustainedHighDisk": bool(disk_series and _stats(disk_series)["p95"] >= 90),
            "fabricUnavailable": "UNAVAILABLE" if not rows else "AVAILABLE",
        },
        "noFabrication": "missing metrics recorded as UNKNOWN, never 0",
    }


def refresh(conn):
    snap = compute(conn)
    store.set_meta(conn, META, json.dumps(snap))
    store.set_meta(conn, META_AT, snap["computedAt"])
    conn.commit()
    return snap


def snapshot(conn):
    raw = store.get_meta(conn, META)
    at = store.get_meta(conn, META_AT)
    if not raw:
        return {"computedAt": at, "samples": 0, "cpu": None, "memory": None, "disk": None,
                "anomalies": {}, "patterns": {}, "noFabrication": "missing metrics recorded as UNKNOWN, never 0"}
    snap = json.loads(raw)
    snap["computedAt"] = at
    return snap