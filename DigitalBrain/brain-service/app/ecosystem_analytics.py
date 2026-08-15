"""Ecosystem Learning (P7): engagement, retention, and error-pattern analytics
computed deterministically over the Experience Fabric. No ML, no LLM: pure
SQL + stdlib statistics so results are reproducible and auditable."""

import json
import time

from . import store

META_ANALYTICS = "lw_eco_analytics"
META_ANALYTICS_AT = "lw_eco_analytics_at"


def _day(ts):
    """ISO timestamp -> YYYY-MM-DD (UTC)."""
    try:
        return time.strftime("%Y-%m-%d", time.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S"))
    except (ValueError, TypeError):
        return "unknown"


def compute(conn, days=14):
    """Compute ecosystem analytics snapshot (deterministic)."""
    engagements = {}
    top = {}
    failures = {}
    fingerprints = {}
    active_days = set()
    capability_days = {}
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    cutoff = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - days * 86400))
    rows = conn.execute(
        "SELECT timestamp, capability_id, outcome, negative_outcome_reason, receipt_refs_json"
        " FROM experiences WHERE timestamp >= ?", (cutoff,)
    ).fetchall()
    for r in rows:
        d = _day(r["timestamp"])
        if d != "unknown":
            active_days.add(d)
            engagements[d] = engagements.get(d, 0) + 1
            capability_days.setdefault(r["capability_id"], set()).add(d)
        top[r["capability_id"]] = top.get(r["capability_id"], 0) + 1
        if r["outcome"] in ("FAILURE", "PARTIAL", "UNKNOWN"):
            failures[r["capability_id"]] = failures.get(r["capability_id"], 0) + 1
            fp = r["negative_outcome_reason"] or "unclassified"
            key = f"{r['capability_id']}::{fp}"
            fingerprints[key] = fingerprints.get(key, 0) + 1
    top_caps = sorted(top.items(), key=lambda kv: kv[1], reverse=True)[:12]
    fail_caps = sorted(failures.items(), key=lambda kv: kv[1], reverse=True)[:12]
    fp_top = sorted(fingerprints.items(), key=lambda kv: kv[1], reverse=True)[:12]
    total_caps = len(top)
    recurring = {c: len(days) for c, days in capability_days.items() if len(days) >= 2}
    recurring_top = sorted(recurring.items(), key=lambda kv: kv[1], reverse=True)[:12]
    engagement = {"days": days, "activeDays": sorted(active_days), "perDay": {d: engagements.get(d, 0) for d in sorted(active_days)},
                  "topCapabilities": [{"capability": c, "experiences": n} for c, n in top_caps], "capabilityCount": total_caps}
    retention = {"activeDaysCount": len(active_days), "repeatCapabilities": [{"capability": c, "activeDays": n} for c, n in recurring_top],
                 "repeatRate": round(len(recurring) / total_caps, 4) if total_caps else 0.0}
    error_patterns = {"failedExperiences": sum(failures.values()), "byCapability": [{"capability": c, "failures": n} for c, n in fail_caps],
                      "topFingerprints": [{"fingerprint": k, "count": n} for k, n in fp_top]}
    return {"computedAt": now, "windowDays": days, "engagement": engagement, "retention": retention, "errorPatterns": error_patterns}


def refresh(conn, days=14):
    snap = compute(conn, days=days)
    store.set_meta(conn, META_ANALYTICS, json.dumps(snap))
    store.set_meta(conn, META_ANALYTICS_AT, snap["computedAt"])
    conn.commit()
    return snap


def snapshot(conn):
    raw = store.get_meta(conn, META_ANALYTICS)
    at = store.get_meta(conn, META_ANALYTICS_AT)
    if not raw:
        return {"computedAt": None, "windowDays": 0, "engagement": {}, "retention": {}, "errorPatterns": {}}
    snap = json.loads(raw)
    snap["computedAt"] = at
    return snap