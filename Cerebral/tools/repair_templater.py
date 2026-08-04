import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_plan(wave2):
    breach = wave2.get("topology_breach", False)
    actions = []
    if breach:
        actions.append("Investigate missing files from Wave2 checks before any repair execution")
    actions.extend(
        [
            "Run tools/port_fixup.py in --dry-run mode and review proposed replacements",
            "Start backend services using safe orchestrator process filtering",
            "Validate frontend endpoints and TTS connectivity",
            "Request Commander Lee approval prior to apply mode",
        ]
    )
    return {
        "status": "review_required",
        "topology_breach": breach,
        "actions": actions,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate Wave3 repair draft plan.")
    parser.add_argument("--wave2", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    wave2 = load_json(Path(args.wave2))
    draft = build_plan(wave2)
    payload = {
        "wave": 3,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "agent": "Agent.Qwen3-Deep-Brain",
        "repair_draft": draft,
        "executive_message": "Commander Lee, Wave 1 and 2 have concluded. The verifiers have verified the verifiers. We are at readiness pending your permission to execute.",
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
