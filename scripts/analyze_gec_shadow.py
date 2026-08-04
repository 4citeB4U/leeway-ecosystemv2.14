#!/usr/bin/env python3
import os
import sys
import json
import datetime
from collections import Counter

ROOT = os.getcwd()
LOG_PATH = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "gec_shadow_actions.jsonl")
OUT_JSON = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "gec_drift_report.json")
OUT_TXT = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "gec_drift_report.txt")


def parse_iso(ts):
    if not ts:
        return None
    try:
        if ts.endswith("Z"):
            ts = ts.replace("Z", "+00:00")
        return datetime.datetime.fromisoformat(ts)
    except Exception:
        # best-effort fallback
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.datetime.strptime(ts, fmt)
            except Exception:
                pass
    return None


def analyze(path):
    if not os.path.exists(path):
        print(f"Log not found: {path}")
        sys.exit(1)

    total = 0
    allowed = 0
    rule_counts = Counter()
    effect_counts = Counter()
    path_counts = Counter()
    times = []

    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            raw = raw.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except Exception:
                continue

            total += 1
            at = obj.get("at") or obj.get("timestamp")
            if at:
                dt = parse_iso(at)
                if dt:
                    times.append(dt)

            decision = obj.get("decision") or {}
            allowed_flag = decision.get("allowed") if isinstance(decision, dict) else None
            if allowed_flag is None:
                # try top-level allowed
                allowed_flag = obj.get("allowed")
            if allowed_flag is True:
                allowed += 1

            hits = []
            if isinstance(decision, dict):
                hits = decision.get("policy_hits", []) or []
            else:
                hits = obj.get("policy_hits", []) or []

            for hit in hits:
                rule = hit.get("rule") or "<unknown>"
                effect = hit.get("effect") or "<unknown>"
                rule_counts[rule] += 1
                effect_counts[effect] += 1

            # simulated action path
            sim = None
            if isinstance(decision, dict):
                sim = decision.get("simulated_action")
            if not sim:
                sim = obj.get("simulated_action") or obj.get("action")

            sim_path = None
            if isinstance(sim, dict):
                sim_path = sim.get("path")
            elif isinstance(sim, str):
                sim_path = sim

            if sim_path:
                norm = sim_path.replace("\\", "/").lower()
                path_counts[norm] += 1

    blocked = total - allowed
    start = min(times) if times else None
    end = max(times) if times else None
    duration = (end - start).total_seconds() if start and end else 0
    rpm = round(total / (duration / 60), 2) if duration and duration > 0 else None

    report = {
        "total_entries": total,
        "allowed": allowed,
        "blocked": blocked,
        "blocked_pct": round(100.0 * (blocked / total), 2) if total else 0.0,
        "top_rules": rule_counts.most_common(10),
        "top_effects": effect_counts.most_common(),
        "top_paths": path_counts.most_common(10),
        "time_start": start.isoformat() if start else None,
        "time_end": end.isoformat() if end else None,
        "duration_seconds": duration,
        "entries_per_minute": rpm,
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as jf:
        json.dump(report, jf, indent=2, default=str)

    with open(OUT_TXT, "w", encoding="utf-8") as tf:
        tf.write("GEC Shadow Drift Report\n")
        tf.write("========================\n\n")
        tf.write(f"Total entries: {report['total_entries']}\n")
        tf.write(f"Allowed: {report['allowed']}\n")
        tf.write(f"Blocked: {report['blocked']} ({report['blocked_pct']}%)\n")
        tf.write(f"Time range: {report['time_start']} -> {report['time_end']}\n")
        tf.write(f"Duration (s): {report['duration_seconds']}\n")
        tf.write(f"Entries/minute: {report['entries_per_minute']}\n\n")
        tf.write("Top rules:\n")
        for r, c in report['top_rules']:
            tf.write(f" - {r}: {c}\n")
        tf.write("\nTop effects:\n")
        for e, c in report['top_effects']:
            tf.write(f" - {e}: {c}\n")
        tf.write("\nTop target paths:\n")
        for p, c in report['top_paths']:
            tf.write(f" - {p}: {c}\n")

    print(json.dumps(report, indent=2, default=str))
    print(f"Wrote: {OUT_JSON} and {OUT_TXT}")


if __name__ == '__main__':
    analyze(LOG_PATH)
