import argparse
import hashlib
import hmac
import json
import os
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_EXCLUDE_MARKERS = {
    ".venv",
    "node_modules",
    "__pycache__",
    "Cerebral_backup",
    "staging",
}

ALLOWED_STAGING_ROOT = Path(r"C:\Cerebral\staging").resolve()
DEFAULT_AUDIT_LOG = Path(r"C:\Cerebral\tools\reports\Wave2_Staging_Audit.jsonl")
LATEST_AUDIT_POINTER = Path(r"C:\Cerebral\tools\reports\LATEST_AUDIT_LOG.txt")
DEFAULT_VERIFY_OUTPUT = Path(r"C:\Cerebral\tools\reports\AuditVerify_latest.json")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256_file(path: Path):
    if not path or not path.exists() or not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def audit_append(audit_path: Path, entry: dict):
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    with audit_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _audit_key():
    value = os.environ.get("CEREBRAL_AUDIT_HMAC_KEY", "")
    return value.encode("utf-8") if value else None


def _canonical_for_sig(entry: dict):
    data = {key: entry[key] for key in entry.keys() if key not in ("sig", "sig_v")}
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign_entry(entry: dict):
    signed = dict(entry)
    key = _audit_key()
    signed["sig_v"] = "hmac-sha256/v1"
    if not key:
        signed["sig"] = None
        signed["sig_v"] = "none"
        return signed
    message = _canonical_for_sig(signed).encode("utf-8")
    signed["sig"] = hmac.new(key, message, hashlib.sha256).hexdigest()
    return signed


def audit_path_for_run(apply_mode: bool):
    if not apply_mode:
        return DEFAULT_AUDIT_LOG
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    return Path(rf"C:\Cerebral\tools\reports\Wave2_Staging_Audit_{timestamp}.jsonl")


def write_latest_audit_pointer(path: Path, apply_mode: bool, operator: str):
    LATEST_AUDIT_POINTER.parent.mkdir(parents=True, exist_ok=True)
    with LATEST_AUDIT_POINTER.open("w", encoding="utf-8") as handle:
        handle.write(f"audit_log={path}\n")
        handle.write(f"ts_utc={utc_now_iso()}\n")
        handle.write(f"apply_mode={str(bool(apply_mode)).lower()}\n")
        handle.write(f"operator={operator}\n")


def verify_latest_audit_strict(audit_path: Path, verify_output: Path = DEFAULT_VERIFY_OUTPUT):
    command = [
        sys.executable,
        str(Path(__file__).resolve().parent / "verify_audit.py"),
        "--audit",
        str(audit_path),
        "--output",
        str(verify_output),
        "--strict",
    ]
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
    parsed["verify_output"] = str(verify_output)
    return parsed


def _is_excluded(path: Path, markers):
    parts = {part.lower() for part in path.parts}
    for marker in markers:
        if marker.lower() in parts:
            return True
    return False


def stage_files(
    wave1_path: Path,
    staging_dir: Path,
    limit: int,
    apply: bool,
    exclude_markers,
    operator: str,
    audit_path: Path,
    approval_token_present: bool,
):
    wave1 = load_json(wave1_path)
    files = wave1.get("topology", {}).get("sampled_files", [])
    staged = []
    copied_count = 0
    markers = set(DEFAULT_EXCLUDE_MARKERS)
    markers.update(exclude_markers or [])

    for item in files:
        if len(staged) >= limit:
            break
        src = Path(item.get("path", ""))
        target = staging_dir / src.name
        dst_before = sha256_file(target)
        src_hash = sha256_file(src)
        dst_exists = target.exists()

        entry_base = {
            "op_id": str(uuid.uuid4()),
            "ts_utc": utc_now_iso(),
            "operator": operator,
            "approval_token_present": bool(approval_token_present),
            "apply_mode": bool(apply),
            "src": str(src),
            "dst": str(target),
            "dst_exists": dst_exists,
            "before_hash": dst_before,
            "src_hash": src_hash,
        }

        if _is_excluded(src, markers):
            staged.append({"source": str(src), "staged": False, "reason": "excluded"})
            audit_append(
                audit_path,
                sign_entry({
                    **entry_base,
                    "action": "deny",
                    "after_hash": None,
                    "bytes": None,
                    "reason": "excluded_path",
                    "result": "denied",
                }),
            )
            continue
        if not src.exists() or not src.is_file():
            staged.append({"source": str(src), "staged": False, "reason": "missing"})
            audit_append(
                audit_path,
                sign_entry({
                    **entry_base,
                    "action": "skip",
                    "after_hash": None,
                    "bytes": None,
                    "reason": "missing_source",
                    "result": "skip",
                }),
            )
            continue

        if not apply:
            staged.append({"source": str(src), "target": str(target), "staged": False, "planned": True})
            audit_append(
                audit_path,
                sign_entry({
                    **entry_base,
                    "action": "plan",
                    "after_hash": None,
                    "bytes": None,
                    "reason": "plan_only",
                    "result": "ok",
                }),
            )
            continue
        try:
            bytes_copied = src.stat().st_size
            shutil.copy2(src, target)
            dst_after = sha256_file(target)
            staged.append({"source": str(src), "target": str(target), "staged": True})
            copied_count += 1
            audit_append(
                audit_path,
                sign_entry({
                    **entry_base,
                    "action": "copy",
                    "after_hash": dst_after,
                    "bytes": bytes_copied,
                    "reason": "apply_copy",
                    "result": "ok",
                }),
            )
        except Exception as exc:
            staged.append({"source": str(src), "staged": False, "reason": str(exc)})
            audit_append(
                audit_path,
                sign_entry({
                    **entry_base,
                    "action": "skip",
                    "after_hash": None,
                    "bytes": None,
                    "reason": str(exc),
                    "result": "error",
                }),
            )
    return staged, copied_count, markers


def main():
    parser = argparse.ArgumentParser(description="Wave2 stager: copies files to staging only.")
    parser.add_argument("--wave1", required=True)
    parser.add_argument("--staging", default="C:\\Cerebral\\staging")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output", required=True)
    parser.add_argument("--apply", action="store_true", help="Actually copy files into staging")
    parser.add_argument("--operator", default="unknown", help="Human/operator identifier for audit trail")
    parser.add_argument(
        "--audit",
        default=None,
        help="Append-only JSONL audit log path. If omitted and --apply is used, a timestamped file is created.",
    )
    parser.add_argument(
        "--approval-token-present",
        action="store_true",
        help="Indicates whether approval token was supplied upstream",
    )
    parser.add_argument(
        "--exclude-dir",
        action="append",
        default=[],
        help="Additional exclusion markers to skip from staging",
    )
    args = parser.parse_args()

    staging_dir = Path(args.staging).resolve()
    if not str(staging_dir).lower().startswith(str(ALLOWED_STAGING_ROOT).lower()):
        raise SystemExit(f"Denied: staging root must be under {ALLOWED_STAGING_ROOT}")

    resolved_audit_path = Path(args.audit) if args.audit else audit_path_for_run(bool(args.apply))

    if args.apply and _audit_key() is None:
        print(
            json.dumps(
                {
                    "status": "denied",
                    "reason": "missing_audit_hmac_key",
                    "audit_log": str(resolved_audit_path),
                    "latest_audit_pointer": str(LATEST_AUDIT_POINTER),
                    "message": "Set CEREBRAL_AUDIT_HMAC_KEY before apply-mode staging.",
                },
                indent=2,
            )
        )
        sys.exit(3)

    write_latest_audit_pointer(resolved_audit_path, bool(args.apply), args.operator)

    staging_dir.mkdir(parents=True, exist_ok=True)
    staged, copied_count, markers = stage_files(
        Path(args.wave1),
        staging_dir,
        args.limit,
        args.apply,
        args.exclude_dir,
        args.operator,
        resolved_audit_path,
        args.approval_token_present,
    )

    payload = {
        "wave": 2,
        "agent": "Agent.Logistic-Preparer",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "staging_dir": str(staging_dir),
        "apply_mode": bool(args.apply),
        "operator": args.operator,
        "audit_path": str(resolved_audit_path),
        "latest_audit_pointer": str(LATEST_AUDIT_POINTER),
        "approval_token_present": bool(args.approval_token_present),
        "exclusions": sorted(list(markers)),
        "staged": staged,
        "executed_code": False,
    }

    audit_verification = None
    if args.apply:
        audit_verification = verify_latest_audit_strict(resolved_audit_path)
        payload["audit_verification"] = audit_verification

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    if args.apply and audit_verification and audit_verification.get("returncode", 0) != 0:
        print(
            json.dumps(
                {
                    "status": "failed_post_verify",
                    "output": str(output),
                    "audit_log": str(resolved_audit_path),
                    "latest_audit_pointer": str(LATEST_AUDIT_POINTER),
                    "audit_verification": audit_verification,
                    "staged_count": copied_count,
                    "planned_count": len([item for item in staged if item.get("planned")]),
                },
                indent=2,
            )
        )
        sys.exit(audit_verification.get("returncode", 2))

    print(
        json.dumps(
            {
                "status": "ok",
                "output": str(output),
                "audit_log": str(resolved_audit_path),
                "latest_audit_pointer": str(LATEST_AUDIT_POINTER),
                "audit_strict_recommended": True,
                "audit_verification": audit_verification,
                "staged_count": copied_count,
                "planned_count": len([item for item in staged if item.get("planned")]),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
