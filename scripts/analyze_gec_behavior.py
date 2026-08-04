"""Analyze GEC shadow actions, metrics, voice invocations, and runtime checks.

Produces a JSON report and prints a short human summary.
"""
import os
import sys
import json
from collections import Counter, defaultdict


ROOT = os.getcwd()
SHADOW = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "gec_shadow_actions.jsonl")
METRICS = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "gec_metrics.json")
RUNTIME_CHECKS = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "agent-lee-runtime-checks.jsonl")
CONV_HISTORY = os.path.join(ROOT, "agent-lee-coding-mode", "runtime", "conversation-history.jsonl")
OUT = os.path.join(ROOT, "agent-lee-coding-mode", "Archive", "receipts", "gec_behavior_report.json")


def read_jsonl(path):
    if not os.path.exists(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except Exception:
                # skip malformed
                continue
    return out


def read_json(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def find_voice_invocations(conv_lines, lookback=1000):
    # Try to detect speak/transcribe events in conversation history
    invocations = []
    for entry in conv_lines[-lookback:]:
        try:
            if isinstance(entry, str):
                obj = json.loads(entry)
            else:
                obj = entry
        except Exception:
            continue
        # heuristic: fields mentioning 'voice' or 'speak' or 'audio'
        txt = json.dumps(obj).lower()
        if "voice" in txt or "speak" in txt or "audio" in txt or "transcribe" in txt:
            invocations.append(obj)
    return invocations


def analyze():
    shadow = read_jsonl(SHADOW)
    metrics = read_json(METRICS)
    runtime = read_jsonl(RUNTIME_CHECKS)
    conv = read_jsonl(CONV_HISTORY)

    report = {}

    # Rule trigger counts from shadow logs
    rule_counter = Counter()
    suppressed_count = 0
    blocked_count = 0
    allowed_count = 0
    noisy_rules = Counter()

    for rec in shadow:
        # rec shape: {at, action, decision}
        decision = rec.get("decision") or {}

        # extract policy hits from nested decision or top-level fallbacks
        hits = []
        if isinstance(decision, dict):
            hits = decision.get("policy_hits") or decision.get("rules") or rec.get("policy_hits") or rec.get("rules") or []
        else:
            hits = rec.get("policy_hits") or rec.get("rules") or []

        # normalize hit names
        hit_names = []
        if isinstance(hits, list):
            for h in hits:
                if isinstance(h, str):
                    hit_names.append(h)
                elif isinstance(h, dict):
                    hit_names.append(h.get("rule") or h.get("name"))
        elif isinstance(hits, dict):
            for k in hits.keys():
                hit_names.append(k)

        # determine decision status
        status = None
        if isinstance(decision, dict):
            if decision.get("allowed") is True:
                status = "allowed"
                allowed_count += 1
            elif decision.get("suppressed"):
                status = "suppressed"
                suppressed_count += 1
            elif decision.get("allowed") is False:
                status = "blocked"
                blocked_count += 1
            else:
                status = decision.get("status")
        else:
            if rec.get("allowed") is True:
                status = "allowed"
                allowed_count += 1
            elif rec.get("allowed") is False:
                status = "blocked"
                blocked_count += 1

        # increment counters for each hit
        for reason in hit_names:
            if not reason:
                continue
            rule_counter[reason] += 1
            if status == "suppressed":
                noisy_rules[reason] += 1

    # Top 10 rules
    top_rules = rule_counter.most_common(10)

    # Frequency distribution
    freq_dist = {
        "total_triggers": sum(rule_counter.values()),
        "unique_rules": len(rule_counter),
        "top_rules": [{"rule": r, "count": c} for r, c in top_rules]
    }

    # suppression events
    suppression_events = suppressed_count

    # Noisy enforcement rules: high suppressions or high frequency
    noisy = []
    for r, c in rule_counter.items():
        if c > 50 or noisy_rules.get(r, 0) > 10:
            noisy.append({"rule": r, "count": c, "suppressed": noisy_rules.get(r, 0)})

    # Voice route anomalies: heuristic from conversation history and shadow logs
    voice_invocations = find_voice_invocations(conv, lookback=2000)
    voice_anomalies = []
    # look for invocations with errors or missing audio
    for inv in voice_invocations:
        # normalize checks
        s = json.dumps(inv)
        if "error" in s.lower() or "failed" in s.lower() or "not found" in s.lower():
            voice_anomalies.append(inv)

    # drift indicator vs previous run: compare metrics.scores or rule_stats if present
    drift = {}
    prev = metrics.get("rule_stats", {}) if isinstance(metrics, dict) else {}
    # simple drift: if previous exists, compute change in total triggers
    prev_total = 0
    curr_total = sum(rule_counter.values())
    try:
        prev_total = sum(prev.get(k, {}).get("count", 0) for k in prev.keys())
    except Exception:
        prev_total = 0

    drift["prev_total_triggers"] = prev_total
    drift["curr_total_triggers"] = curr_total
    drift["delta"] = curr_total - prev_total

    report = {
        "summary": {
            "total_shadow_entries": len(shadow),
            "total_triggers": curr_total,
            "blocked": blocked_count,
            "suppressed": suppressed_count,
            "allowed": allowed_count
        },
        "top_rules": freq_dist["top_rules"],
        "frequency_distribution": {
            "total_triggers": freq_dist["total_triggers"],
            "unique_rules": freq_dist["unique_rules"]
        },
        "suppression_events_count": suppression_events,
        "noisy_rules": noisy,
        "voice_invocation_count": len(voice_invocations),
        "voice_anomalies_count": len(voice_anomalies),
        "voice_anomalies_sample": voice_anomalies[:10],
        "runtime_checks_latest": runtime[-1] if runtime else {},
        "drift": drift
    }

    # write report
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    # print concise human summary
    print(json.dumps({
        "total_shadow_entries": len(shadow),
        "total_triggers": curr_total,
        "top_rules": report["top_rules"],
        "suppressed": suppression_events,
        "voice_anomalies_count": len(voice_anomalies),
        "drift_delta": drift["delta"]
    }, indent=2))


if __name__ == "__main__":
    analyze()
