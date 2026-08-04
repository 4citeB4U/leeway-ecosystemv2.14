"""Compute GEC runtime metrics from router shadow logs.

Usage:
    python scripts/compute_gec_metrics.py [shadow_jsonl] [out_json]

Defaults:
    shadow_jsonl: agent-lee-coding-mode/Archive/receipts/gec_shadow_actions.jsonl
    out_json: agent-lee-coding-mode/Archive/receipts/gec_metrics.json
"""
import sys
import os
from leeway_gec.metrics import compute_metrics_from_shadow_jsonl


def main(argv=None):
    argv = argv or sys.argv[1:]
    default_shadow = os.path.join("agent-lee-coding-mode", "Archive", "receipts", "gec_shadow_actions.jsonl")
    default_out = os.path.join("agent-lee-coding-mode", "Archive", "receipts", "gec_metrics.json")

    shadow = argv[0] if len(argv) >= 1 else default_shadow
    out = argv[1] if len(argv) >= 2 else default_out

    metrics = compute_metrics_from_shadow_jsonl(shadow)
    # ensure output dir
    od = os.path.dirname(out) or "."
    os.makedirs(od, exist_ok=True)
    metrics.dump(out)
    print("Wrote metrics:", out)


if __name__ == "__main__":
    main()
