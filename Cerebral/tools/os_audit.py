import argparse
import hashlib
import json
import random
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sample_nodes(wave1, sample_size: int):
    files = wave1.get("topology", {}).get("sampled_files", [])
    candidates = [Path(item.get("path", "")) for item in files if item.get("path")]
    random.shuffle(candidates)
    return candidates[:sample_size]


def verify_audit_log(audit_log: Path, output: Path = None, strict: bool = False):
    repo_root = Path(__file__).resolve().parents[1]
    command = [
        sys.executable,
        str(repo_root / "tools" / "verify_audit.py"),
        "--audit",
        str(audit_log),
    ]
    if strict:
        command.append("--strict")
    if output:
        command.extend(["--output", str(output)])

    result = subprocess.run(command, capture_output=True, text=True)
    parsed = None
    try:
        parsed = json.loads((result.stdout or "").strip())
    except Exception:
        parsed = {
            "status": "failed",
            "reason": "verify_audit_parse_error",
            "stdout": result.stdout,
            "stderr": result.stderr,
        }

    parsed["returncode"] = result.returncode
    return parsed


def main():
    parser = argparse.ArgumentParser(description="Wave2 audit: verify Wave1 samples.")
    parser.add_argument("--wave1", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--sample-size", type=int, default=10)
    parser.add_argument("--audit-log", help="Optional audit JSONL path to verify integrity")
    parser.add_argument("--audit-verify-output", help="Optional output path for audit verification report")
    parser.add_argument("--audit-strict", action="store_true", help="Treat unsigned audit entries as failure")
    args = parser.parse_args()

    wave1 = load_json(Path(args.wave1))
    sample = sample_nodes(wave1, args.sample_size)

    checks = []
    breach = False
    for node in sample:
        exists = node.exists()
        sha = _sha256(node) if exists and node.is_file() else None
        result = {
            "path": str(node),
            "exists": exists,
            "sha256": sha,
            "status": "ok" if exists else "missing",
        }
        if not exists:
            breach = True
        checks.append(result)

    payload = {
        "wave": 2,
        "name": "InternalAffairsAudit",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sample_size": len(checks),
        "topology_breach": breach,
        "checks": checks,
    }

    if args.audit_log:
        verify_output = Path(args.audit_verify_output) if args.audit_verify_output else None
        payload["audit_integrity"] = verify_audit_log(
            Path(args.audit_log),
            verify_output,
            strict=args.audit_strict,
        )
        payload["audit_integrity"]["strict"] = bool(args.audit_strict)
        payload["audit_integrity"]["exit_code"] = payload["audit_integrity"].get("returncode", 0)
        if args.audit_strict and payload["audit_integrity"].get("returncode", 0) != 0:
            breach = True
            payload["topology_breach"] = True

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "output": str(output), "topology_breach": breach}, indent=2))

    if args.audit_strict and args.audit_log and payload.get("audit_integrity", {}).get("returncode", 0) != 0:
        sys.exit(payload["audit_integrity"].get("returncode", 2))


if __name__ == "__main__":
    main()
