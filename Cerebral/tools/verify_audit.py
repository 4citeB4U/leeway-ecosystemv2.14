import argparse
import hashlib
import hmac
import json
import os
import sys
from datetime import datetime
from pathlib import Path


def _audit_key():
    value = os.environ.get("CEREBRAL_AUDIT_HMAC_KEY", "")
    return value.encode("utf-8") if value else None


def _canonical_for_sig(entry: dict):
    data = {key: entry[key] for key in entry.keys() if key not in ("sig", "sig_v")}
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _parse_ts(ts_value: str):
    if not ts_value:
        return None
    ts_normalized = ts_value.replace("Z", "+00:00")
    return datetime.fromisoformat(ts_normalized)


def verify_audit_file(audit_path: Path, strict: bool = False):
    key = _audit_key()
    verified_count = 0
    failed_count = 0
    unsigned_count = 0
    total_count = 0
    failures = []
    seen_op_ids = set()
    duplicate_op_id_count = 0
    monotonic_violations = 0
    missing_key_with_signed = False
    previous_ts = None

    with audit_path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            line = raw.strip()
            if not line:
                continue
            total_count += 1

            try:
                entry = json.loads(line)
            except Exception as exc:
                failed_count += 1
                failures.append({"line": line_number, "reason": f"invalid_json: {exc}"})
                continue

            op_id = entry.get("op_id")
            if op_id:
                if op_id in seen_op_ids:
                    duplicate_op_id_count += 1
                    failures.append({"line": line_number, "reason": "duplicate_op_id", "op_id": op_id})
                else:
                    seen_op_ids.add(op_id)

            ts_value = entry.get("ts_utc")
            try:
                current_ts = _parse_ts(ts_value)
            except Exception:
                current_ts = None
                failures.append({"line": line_number, "reason": "invalid_ts", "ts_utc": ts_value})

            if previous_ts and current_ts and current_ts < previous_ts:
                monotonic_violations += 1
                failures.append({"line": line_number, "reason": "non_monotonic_ts"})
            if current_ts:
                previous_ts = current_ts

            sig_v = entry.get("sig_v")
            sig = entry.get("sig")
            if sig_v in (None, "none"):
                unsigned_count += 1
                continue

            if sig_v != "hmac-sha256/v1":
                failed_count += 1
                failures.append({"line": line_number, "reason": "unsupported_sig_v", "sig_v": sig_v})
                continue

            if not key:
                missing_key_with_signed = True
                continue

            expected = hmac.new(key, _canonical_for_sig(entry).encode("utf-8"), hashlib.sha256).hexdigest()
            if not sig or not hmac.compare_digest(str(sig), expected):
                failed_count += 1
                failures.append({"line": line_number, "reason": "signature_mismatch"})
                continue

            verified_count += 1

    status = "verified"
    if missing_key_with_signed:
        status = "failed_missing_key" if strict else "missing_key"
    elif failed_count > 0:
        status = "failed"
    elif strict and unsigned_count > 0:
        status = "failed_unsigned"
    elif unsigned_count > 0:
        status = "verified_with_unsigned"

    return {
        "strict": bool(strict),
        "status": status,
        "audit": str(audit_path),
        "total_count": total_count,
        "verified_count": verified_count,
        "failed_count": failed_count,
        "unsigned_count": unsigned_count,
        "duplicate_op_id_count": duplicate_op_id_count,
        "monotonic_violations": monotonic_violations,
        "missing_key_with_signed": missing_key_with_signed,
        "failures": failures[:20],
    }


def main():
    parser = argparse.ArgumentParser(description="Verify signed JSONL audit entries.")
    parser.add_argument("--audit", required=True)
    parser.add_argument("--output")
    parser.add_argument("--strict", action="store_true", help="Fail when unsigned entries are present")
    args = parser.parse_args()

    audit_path = Path(args.audit)
    if not audit_path.exists():
        result = {
            "status": "failed",
            "audit": str(audit_path),
            "reason": "missing_audit_file",
            "failed_count": 1,
        }
        print(json.dumps(result, indent=2))
        sys.exit(2)

    result = verify_audit_file(audit_path, strict=args.strict)

    exit_code = 0
    if result.get("missing_key_with_signed"):
        exit_code = 3
    elif result.get("failed_count", 0) > 0:
        exit_code = 2
    elif args.strict and result.get("unsigned_count", 0) > 0:
        exit_code = 2
    result["exit_code"] = exit_code

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, indent=2))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
