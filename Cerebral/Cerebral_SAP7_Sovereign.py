import argparse
import base64
import hashlib
import hmac
import json
import os
import secrets
import shutil
import subprocess
import sys
import uuid
import zlib
import importlib.util
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, cast


APP_NAME = "Cerebral SAP7 Sovereign"
APP_ID = "cerebral-sap7-sovereign"
INSTALL_ROOT_DEFAULT = Path(r"C:\Cerebral")
REPORTS_DIR_REL = Path("tools") / "reports"
LATEST_POINTER_REL = REPORTS_DIR_REL / "LATEST_AUDIT_LOG.txt"
DEFAULT_AUDIT_REL = REPORTS_DIR_REL / "Wave2_Staging_Audit.jsonl"
STAGING_REL = Path("staging")
MCP_APPROVAL_TOKEN = "COMMANDER_LEE_APPROVED"
DEFAULT_MANIFEST_REL = Path("build") / "metadata" / "build_manifest.json"
DEFAULT_REBUILD_CHECK_REL = Path("build") / "metadata" / "rebuild_check.json"
DEFAULT_BUILD_PIPELINE_REL = Path("build") / "metadata" / "build_pipeline.json"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _enc_text(text: str) -> str:
    return base64.b64encode(zlib.compress(text.encode("utf-8"))).decode("ascii")


def _dec_text(blob: str) -> bytes:
    return zlib.decompress(base64.b64decode(blob.encode("ascii")))


EMBEDDED_FILES = {
    "agents/Agent.Neural-Cartographer.json": _enc_text(
        json.dumps(
            {
                "name": "Agent.Neural-Cartographer",
                "wave": 1,
                "rank": "Scout",
                "tool": "discovery_wave1",
            },
            indent=2,
        )
    ),
    "agents/Agent.Hardware-Guardian.json": _enc_text(
        json.dumps(
            {
                "name": "Agent.Hardware-Guardian",
                "wave": 1,
                "rank": "Sentry",
                "tool": "hardware_baseline",
            },
            indent=2,
        )
    ),
    "agents/Agent.Sovereign-Auditor.json": _enc_text(
        json.dumps(
            {
                "name": "Agent.Sovereign-Auditor",
                "wave": 2,
                "rank": "Inspector",
                "tool": "audit_wave2",
            },
            indent=2,
        )
    ),
    "tools/SOVEREIGN_NOTICE.txt": _enc_text(
        "Embedded-by-design install. Source of truth is Cerebral_SAP7_Sovereign.py\n"
    ),
}


def approval_gate(value: str):
    if value == "APPROVE":
        return
    raise SystemExit("Installation denied. Type APPROVE to continue.")


def ensure_audit_key(required_for_apply: bool = False):
    key = os.environ.get("CEREBRAL_AUDIT_HMAC_KEY", "")
    if key:
        return {"status": "present", "length": len(key)}
    if required_for_apply:
        return {"status": "missing"}
    generated = secrets.token_hex(32)
    os.environ["CEREBRAL_AUDIT_HMAC_KEY"] = generated
    return {"status": "generated_session", "length": len(generated)}


def env_check():
    return {
        "python": sys.version,
        "python_exe": sys.executable,
        "cwd": str(Path.cwd()),
        "has_mcp": _module_available("mcp.server.fastmcp"),
        "has_ffmpeg": bool(shutil.which("ffmpeg")),
        "has_node": bool(shutil.which("node")),
        "has_npm": bool(shutil.which("npm")),
    }


def _module_available(module_name: str) -> bool:
    try:
        return importlib.util.find_spec(module_name) is not None
    except Exception:
        return False


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def embedded_bundle_sha256() -> str:
    canonical = json.dumps(EMBEDDED_FILES, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _is_within(base: Path, target: Path) -> bool:
    try:
        target.resolve().relative_to(base.resolve())
        return True
    except Exception:
        return False


def _detect_output_binary(dist_dir: Path, name: str) -> Path:
    if os.name == "nt":
        candidate = dist_dir / f"{name}.exe"
        return candidate
    return dist_dir / name


def _pyinstaller_version(install_if_missing: bool = False) -> str:
    result = subprocess.run([sys.executable, "-m", "PyInstaller", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        if not install_if_missing:
            raise SystemExit("PyInstaller is not available in this Python environment.")
        install = subprocess.run(
            [sys.executable, "-m", "pip", "install", "pyinstaller"],
            capture_output=True,
            text=True,
        )
        if install.returncode != 0:
            print(
                json.dumps(
                    {
                        "status": "failed",
                        "reason": "pyinstaller_install_failed",
                        "stdout": install.stdout,
                        "stderr": install.stderr,
                    },
                    indent=2,
                )
            )
            raise SystemExit(install.returncode)
        result = subprocess.run([sys.executable, "-m", "PyInstaller", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            raise SystemExit("PyInstaller installation attempted but module is still unavailable.")
    return (result.stdout or result.stderr).strip().splitlines()[0]


def _pyinstaller_version_optional() -> str:
    result = subprocess.run([sys.executable, "-m", "PyInstaller", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        return "missing"
    lines = (result.stdout or result.stderr).strip().splitlines()
    return lines[0] if lines else "missing"


def build_onefile(
    source_file: Path,
    app_root: Path,
    build_dir: Path,
    dist_dir: Path,
    allow_external: bool,
    emit_spec: bool,
    install_pyinstaller: bool,
):
    app_root = app_root.resolve()
    build_dir = build_dir.resolve()
    dist_dir = dist_dir.resolve()

    if not allow_external:
        if not _is_within(app_root, build_dir) or not _is_within(app_root, dist_dir):
            raise SystemExit(f"Denied: build/dist outputs must remain under {app_root}")

    metadata_dir = build_dir / "metadata"
    metadata_dir.mkdir(parents=True, exist_ok=True)
    dist_dir.mkdir(parents=True, exist_ok=True)

    pyinstaller_version = _pyinstaller_version(install_if_missing=install_pyinstaller)
    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name",
        "Cerebral_SAP7_Sovereign",
        "--distpath",
        str(dist_dir),
        "--workpath",
        str(build_dir / "pyinstaller-work"),
        str(source_file),
    ]

    if emit_spec:
        spec_dir = build_dir
        spec_dir.mkdir(parents=True, exist_ok=True)
        command.extend(["--specpath", str(spec_dir)])

    run = subprocess.run(command, capture_output=True, text=True)
    if run.returncode != 0:
        error_out = {
            "status": "failed",
            "reason": "pyinstaller_failed",
            "stdout": run.stdout,
            "stderr": run.stderr,
            "command_line": command,
        }
        print(json.dumps(error_out, indent=2))
        raise SystemExit(run.returncode)

    output_file = _detect_output_binary(dist_dir, "Cerebral_SAP7_Sovereign")
    if not output_file.exists():
        raise SystemExit(f"Build failed: output binary not found at {output_file}")

    source_sha = sha256_file(source_file)
    output_sha = sha256_file(output_file)

    manifest = {
        "app_id": APP_ID,
        "build_ts_utc": utc_now_iso(),
        "platform": sys.platform,
        "arch": os.environ.get("PROCESSOR_ARCHITECTURE", "unknown"),
        "python_version": sys.version,
        "pyinstaller_version": pyinstaller_version,
        "source_file": str(source_file.resolve()),
        "source_sha256": source_sha,
        "embedded_bundle_sha256": embedded_bundle_sha256(),
        "output_file": str(output_file.resolve()),
        "output_sha256": output_sha,
        "command_line": command,
    }

    manifest_path = metadata_dir / "build_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (metadata_dir / "source_sha256.txt").write_text(source_sha + "\n", encoding="utf-8")
    (metadata_dir / "pyinstaller_version.txt").write_text(pyinstaller_version + "\n", encoding="utf-8")
    (metadata_dir / "python_version.txt").write_text(sys.version + "\n", encoding="utf-8")

    return {
        "status": "ok",
        "output_file": str(output_file),
        "manifest": str(manifest_path),
        "source_sha256": source_sha,
        "output_sha256": output_sha,
    }


def version_info(script_path: Path, build_manifest_path: Optional[Path] = None):
    if build_manifest_path is None:
        default_manifest = Path.cwd() / DEFAULT_MANIFEST_REL
        build_manifest_path = default_manifest if default_manifest.exists() else None

    return {
        "app_id": APP_ID,
        "script_path": str(script_path.resolve()),
        "script_sha256": sha256_file(script_path),
        "embedded_bundle_sha256": embedded_bundle_sha256(),
        "build_manifest_path": str(build_manifest_path.resolve()) if build_manifest_path else None,
    }


def _resolve_manifest_path(root: Path, manifest_arg: str) -> Path | None:
    candidates = []
    if manifest_arg:
        candidates.append(Path(manifest_arg))
    else:
        candidates.append(root / DEFAULT_MANIFEST_REL)
        candidates.append(root / "build_manifest.json")
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def rebuild_check(root: Path, source_file: Path, manifest_arg: str = "", strict: bool = False):
    root = root.resolve()
    report_path = (root / DEFAULT_REBUILD_CHECK_REL).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    manifest_path = _resolve_manifest_path(root, manifest_arg)
    current = {
        "source_sha256": sha256_file(source_file),
        "embedded_bundle_sha256": embedded_bundle_sha256(),
        "python_version": sys.version,
        "pyinstaller_version": _pyinstaller_version_optional(),
        "platform": sys.platform,
        "arch": os.environ.get("PROCESSOR_ARCHITECTURE", "unknown"),
    }

    if manifest_path is None:
        result = {
            "status": "missing_manifest",
            "manifest_path": None,
            "strict": bool(strict),
            "drift": [],
            "current": current,
            "exit_code": 5 if strict else 0,
            "report_path": str(report_path),
        }
        report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    previous = json.loads(manifest_path.read_text(encoding="utf-8"))
    drift = []
    fields = [
        "source_sha256",
        "embedded_bundle_sha256",
        "python_version",
        "pyinstaller_version",
        "platform",
        "arch",
    ]
    for field in fields:
        old = previous.get(field)
        new = current.get(field)
        if old != new:
            drift.append({"field": field, "previous": old, "current": new})

    status = "clean" if not drift else "drift"
    exit_code = 5 if drift else 0

    result = {
        "status": status,
        "manifest_path": str(manifest_path.resolve()),
        "strict": bool(strict),
        "drift": drift,
        "current": current,
        "exit_code": exit_code,
        "report_path": str(report_path),
    }
    report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def _parse_allow_drift_fields(raw: str) -> set[str]:
    if not raw:
        return set()
    return {item.strip() for item in raw.split(",") if item.strip()}


def _run_build_onefile_safe(
    source_file: Path,
    app_root: Path,
    build_dir: Path,
    dist_dir: Path,
    allow_external: bool,
    emit_spec: bool,
    install_pyinstaller: bool,
):
    try:
        result = build_onefile(
            source_file=source_file,
            app_root=app_root,
            build_dir=build_dir,
            dist_dir=dist_dir,
            allow_external=allow_external,
            emit_spec=emit_spec,
            install_pyinstaller=install_pyinstaller,
        )
        return result, 0
    except SystemExit as exc:
        code = exc.code if isinstance(exc.code, int) else 1
        return {"status": "failed", "reason": "build_onefile_failed", "exit_code": code}, 6


def build_pipeline(
    root: Path,
    source_file: Path,
    build_dir: Path,
    dist_dir: Path,
    manifest_arg: str = "",
    strict: bool = True,
    install_pyinstaller: bool = False,
    force_build_on_drift: bool = False,
    allow_drift_fields_raw: str = "",
    allow_missing_manifest: bool = False,
):
    root = root.resolve()
    report_path = (root / DEFAULT_BUILD_PIPELINE_REL).resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)

    allow_drift_fields = _parse_allow_drift_fields(allow_drift_fields_raw)
    precheck = rebuild_check(root=root, source_file=source_file, manifest_arg=manifest_arg, strict=strict)
    pre_status = precheck.get("status")
    drift_entries = cast(list[dict[str, Any]], precheck.get("drift", []))
    drift_fields = {cast(str, entry.get("field")) for entry in drift_entries if entry.get("field")}

    result: dict[str, Any] = {
        "status": "denied",
        "root": str(root),
        "precheck": precheck,
        "decision": "deny",
        "overrides": {
            "allow_missing_manifest": bool(allow_missing_manifest),
            "force_build_on_drift": bool(force_build_on_drift),
            "allow_drift_fields": sorted(list(allow_drift_fields)),
        },
        "build": None,
        "postcheck": None,
        "exit_code": 5,
        "report_path": str(report_path),
    }

    if pre_status == "clean":
        result["decision"] = "build"
        build_result, build_exit = _run_build_onefile_safe(
            source_file=source_file,
            app_root=root,
            build_dir=build_dir,
            dist_dir=dist_dir,
            allow_external=False,
            emit_spec=False,
            install_pyinstaller=install_pyinstaller,
        )
        result["build"] = build_result
        if build_exit != 0:
            result["status"] = "failed"
            result["exit_code"] = 6
            report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
            return result
        postcheck = rebuild_check(root=root, source_file=source_file, manifest_arg=manifest_arg, strict=strict)
        result["postcheck"] = postcheck
        if postcheck.get("status") == "clean":
            result["status"] = "ok"
            result["exit_code"] = 0
        else:
            result["status"] = "failed"
            result["exit_code"] = 7
        report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    if pre_status == "missing_manifest" and not allow_missing_manifest:
        result["status"] = "denied"
        result["decision"] = "deny"
        result["reason"] = "missing_manifest"
        result["exit_code"] = 5
        report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    if pre_status == "missing_manifest" and allow_missing_manifest:
        result["decision"] = "bootstrap_build_missing_manifest_allowed"
        result["pipeline_decision"] = {
            "decision": "bootstrap_build_missing_manifest_allowed",
            "bootstrap_build_no_manifest": True,
            "strict": bool(strict),
            "precheck_status": pre_status,
            "ts_utc": utc_now_iso(),
        }
        build_result, build_exit = _run_build_onefile_safe(
            source_file=source_file,
            app_root=root,
            build_dir=build_dir,
            dist_dir=dist_dir,
            allow_external=False,
            emit_spec=False,
            install_pyinstaller=install_pyinstaller,
        )
        result["build"] = build_result
        if build_exit != 0:
            result["status"] = "failed"
            result["exit_code"] = 6
            report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
            return result
        postcheck = rebuild_check(root=root, source_file=source_file, manifest_arg="", strict=strict)
        result["postcheck"] = postcheck
        if postcheck.get("status") == "clean":
            result["status"] = "ok"
            result["exit_code"] = 0
        else:
            result["status"] = "failed"
            result["exit_code"] = 7
        report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    drift_is_pyinstaller_missing_only = (
        pre_status == "drift"
        and len(drift_entries) == 1
        and cast(dict[str, Any], drift_entries[0]).get("field") == "pyinstaller_version"
        and cast(dict[str, Any], drift_entries[0]).get("current") == "missing"
        and install_pyinstaller
    )

    allowed_drift = bool(drift_fields) and drift_fields.issubset(allow_drift_fields)

    if drift_is_pyinstaller_missing_only:
        result["decision"] = "resolved_drift_then_build"
        build_result, build_exit = _run_build_onefile_safe(
            source_file=source_file,
            app_root=root,
            build_dir=build_dir,
            dist_dir=dist_dir,
            allow_external=False,
            emit_spec=False,
            install_pyinstaller=True,
        )
        result["build"] = build_result
        if build_exit != 0:
            result["status"] = "failed"
            result["exit_code"] = 6
            report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
            return result
        postcheck = rebuild_check(root=root, source_file=source_file, manifest_arg=manifest_arg, strict=strict)
        result["postcheck"] = postcheck
        if postcheck.get("status") == "clean":
            result["status"] = "ok"
            result["exit_code"] = 0
        else:
            result["status"] = "failed"
            result["exit_code"] = 7
        report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    if pre_status == "drift" and (force_build_on_drift or allowed_drift):
        decision = "force_build" if force_build_on_drift else "build_allowed_drift"
        result["decision"] = decision
        result["pipeline_decision"] = {
            "decision": decision,
            "strict": bool(strict),
            "force_build_on_drift": bool(force_build_on_drift),
            "allow_drift_fields": sorted(list(allow_drift_fields)),
            "drift_fields": sorted([field for field in drift_fields if field]),
            "precheck_status": pre_status,
            "ts_utc": utc_now_iso(),
        }
        build_result, build_exit = _run_build_onefile_safe(
            source_file=source_file,
            app_root=root,
            build_dir=build_dir,
            dist_dir=dist_dir,
            allow_external=False,
            emit_spec=False,
            install_pyinstaller=install_pyinstaller,
        )
        result["build"] = build_result
        if build_exit != 0:
            result["status"] = "failed"
            result["exit_code"] = 6
            report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
            return result
        postcheck = rebuild_check(root=root, source_file=source_file, manifest_arg=manifest_arg, strict=strict)
        result["postcheck"] = postcheck
        if postcheck.get("status") == "clean":
            result["status"] = "ok"
            result["exit_code"] = 0
        else:
            result["status"] = "failed"
            result["exit_code"] = 7
        report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result

    result["status"] = "denied"
    result["decision"] = "deny"
    result["reason"] = "drift_requires_explicit_override"
    result["exit_code"] = 5
    report_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def install_workspace(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    written = []
    for rel, blob in EMBEDDED_FILES.items():
        out = root / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(_dec_text(blob))
        written.append(str(out))
    (root / REPORTS_DIR_REL).mkdir(parents=True, exist_ok=True)
    return written


def _audit_key_bytes():
    value = os.environ.get("CEREBRAL_AUDIT_HMAC_KEY", "")
    return value.encode("utf-8") if value else None


def _canonical(entry: dict) -> str:
    data = {k: entry[k] for k in entry.keys() if k not in ("sig", "sig_v")}
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign_entry(entry: dict) -> dict:
    output = dict(entry)
    key = _audit_key_bytes()
    output["sig_v"] = "hmac-sha256/v1"
    if not key:
        output["sig_v"] = "none"
        output["sig"] = None
        return output
    output["sig"] = hmac.new(key, _canonical(output).encode("utf-8"), hashlib.sha256).hexdigest()
    return output


def verify_audit_file(audit_path: Path, strict: bool):
    # Using Any for counters to bypass Pyre internal errors in this function
    total: Any = 0
    verified: Any = 0
    failed: Any = 0
    unsigned: Any = 0
    failures: list[dict[str, Any]] = []
    key = _audit_key_bytes()
    for line_no, raw in enumerate(audit_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not raw.strip():
            continue
        # pyre-ignore[58]
        total = total + 1
        entry = json.loads(raw)
        sig_v = entry.get("sig_v")
        sig = entry.get("sig")
        if sig_v in (None, "none"):
            # pyre-ignore[58]
            unsigned = unsigned + 1
            continue
        if sig_v != "hmac-sha256/v1":
            # pyre-ignore[58]
            failed = failed + 1
            failures.append({"line": line_no, "reason": "unsupported_sig_v"})
            continue
        if not key:
            return {
                "strict": strict,
                "status": "failed_missing_key" if strict else "missing_key",
                "total_count": total,
                "verified_count": verified,
                "failed_count": failed,
                "unsigned_count": unsigned,
                "failures": failures,
                "exit_code": 3,
            }
        assert key is not None
        # pyre-ignore
        expected = hmac.new(key, _canonical(entry).encode("utf-8"), hashlib.sha256).hexdigest()
        if not sig or not hmac.compare_digest(str(sig), expected):
            # pyre-ignore[58]
            failed = failed + 1
            failures.append({"line": line_no, "reason": "signature_mismatch"})
        else:
            # pyre-ignore[58]
            verified = verified + 1

    status = "verified"
    exit_code = 0
    if failed > 0:
        status = "failed"
        exit_code = 2
    elif strict and unsigned > 0:
        status = "failed_unsigned"
        exit_code = 2
    elif unsigned > 0:
        status = "verified_with_unsigned"

    return {
        "strict": strict,
        "status": status,
        "total_count": total,
        "verified_count": verified,
        "failed_count": failed,
        "unsigned_count": unsigned,
        # pyre-ignore[6]
        "failures": failures[:20],
        "exit_code": exit_code,
    }


def write_latest_pointer(root: Path, audit_path: Path, apply_mode: bool, operator: str):
    pointer = root / LATEST_POINTER_REL
    pointer.parent.mkdir(parents=True, exist_ok=True)
    pointer.write_text(
        "\n".join(
            [
                f"audit_log={audit_path}",
                f"ts_utc={utc_now_iso()}",
                f"apply_mode={str(bool(apply_mode)).lower()}",
                f"operator={operator}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return pointer


def resolve_audit_path(root: Path, apply_mode: bool, explicit: str = "") -> Path:
    if explicit:
        return Path(explicit)
    if not apply_mode:
        return root / DEFAULT_AUDIT_REL
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    return root / REPORTS_DIR_REL / f"Wave2_Staging_Audit_{ts}.jsonl"


def stage_wave2(
    root: Path,
    apply_mode: bool,
    operator: str,
    approval_token: str,
    audit_path: str = "",
    limit: int = 1,
    strict_verify: bool = True,
):
    staging_root = (root / STAGING_REL).resolve()
    staging_root.mkdir(parents=True, exist_ok=True)
    resolved_audit = resolve_audit_path(root, apply_mode, audit_path)
    resolved_audit.parent.mkdir(parents=True, exist_ok=True)
    pointer = write_latest_pointer(root, resolved_audit, apply_mode, operator)

    if apply_mode and approval_token != MCP_APPROVAL_TOKEN:
        return {
            "status": "denied",
            "reason": "invalid_approval_token",
            "approval_token_present": bool(approval_token),
            "audit_log": str(resolved_audit),
            "latest_audit_pointer": str(pointer),
        }

    if apply_mode and _audit_key_bytes() is None:
        return {
            "status": "denied",
            "reason": "missing_audit_hmac_key",
            "audit_log": str(resolved_audit),
            "latest_audit_pointer": str(pointer),
        }

    staged = []
    source_candidates = [
        root / "cerebral_mcp_server.py",
        root / "tools" / "SAP7_RUNBOOK.md",
        root / "tools" / "stager.py",
        root / "agents" / "Agent.Neural-Cartographer.json",
    ]
    for i, src in enumerate(source_candidates):
        if i >= max(1, limit):
            break
        dst = staging_root / src.name
        base = {
            "op_id": str(uuid.uuid4()),
            "ts_utc": utc_now_iso(),
            "operator": operator,
            "approval_token_present": bool(approval_token),
            "apply_mode": bool(apply_mode),
            "src": str(src),
            "dst": str(dst),
            "dst_exists": dst.exists(),
            "before_hash": hashlib.sha256(dst.read_bytes()).hexdigest() if dst.exists() else None,
            "src_hash": hashlib.sha256(src.read_bytes()).hexdigest() if src.exists() else None,
        }
        if not src.exists():
            entry = sign_entry({**base, "action": "skip", "after_hash": None, "bytes": None, "reason": "missing_source", "result": "skip"})
            resolved_audit.write_text((resolved_audit.read_text(encoding="utf-8") if resolved_audit.exists() else "") + json.dumps(entry, ensure_ascii=False) + "\n", encoding="utf-8")
            staged.append({"source": str(src), "staged": False, "reason": "missing"})
            continue

        if not apply_mode:
            entry = sign_entry({**base, "action": "plan", "after_hash": None, "bytes": None, "reason": "plan_only", "result": "ok"})
            resolved_audit.write_text((resolved_audit.read_text(encoding="utf-8") if resolved_audit.exists() else "") + json.dumps(entry, ensure_ascii=False) + "\n", encoding="utf-8")
            staged.append({"source": str(src), "target": str(dst), "staged": False, "planned": True})
            continue

        shutil.copy2(src, dst)
        entry = sign_entry(
            {
                **base,
                "action": "copy",
                "after_hash": hashlib.sha256(dst.read_bytes()).hexdigest(),
                "bytes": src.stat().st_size,
                "reason": "apply_copy",
                "result": "ok",
            }
        )
        resolved_audit.write_text((resolved_audit.read_text(encoding="utf-8") if resolved_audit.exists() else "") + json.dumps(entry, ensure_ascii=False) + "\n", encoding="utf-8")
        staged.append({"source": str(src), "target": str(dst), "staged": True})

    verification = verify_audit_file(resolved_audit, strict=strict_verify)
    response = {
        "status": "ok" if verification.get("exit_code", 0) == 0 else "failed_post_verify",
        "apply_mode": bool(apply_mode),
        "audit_log": str(resolved_audit),
        "latest_audit_pointer": str(pointer),
        "audit_verification": verification,
        "staged_count": len([x for x in staged if x.get("staged")]),
        "planned_count": len([x for x in staged if x.get("planned")]),
        "staged": staged,
    }
    return response


def pointer_audit_path(root: Path) -> Path:
    pointer = root / LATEST_POINTER_REL
    if not pointer.exists():
        raise SystemExit(f"Pointer file missing: {pointer}")
    for line in pointer.read_text(encoding="utf-8").splitlines():
        if line.startswith("audit_log="):
            return Path(line.split("=", 1)[1])
    raise SystemExit("Pointer file missing audit_log field")


# ── Cleanup helpers ──────────────────────────────────────────────────────


def _validate_cleanup_target(root: Path, target: Path) -> str | None:
    """Return an error string if *target* is unsafe to delete, else None."""
    root = root.resolve()
    target = target.resolve()
    if target == root:
        return f"Refused: target equals app root ({root})"
    if not _is_within(root, target):
        return f"Refused: target {target} is outside app root ({root})"
    return None


def cleanup_bootstrap_test(root: Path, force: bool = False):
    """Remove tmp/bootstrap-* directories under *root*."""
    root = root.resolve()
    tmp_dir = root / "tmp"
    removed: list[str] = []
    skipped: list[dict] = []

    if not tmp_dir.is_dir():
        return {"status": "nothing", "removed": [], "skipped": [], "root": str(root)}

    candidates = sorted(
        p for p in tmp_dir.iterdir()
        if p.is_dir() and p.name.startswith("bootstrap")
    )

    if not candidates:
        return {"status": "nothing", "removed": [], "skipped": [], "root": str(root)}

    # Safety gate
    for cand in candidates:
        err = _validate_cleanup_target(root, cand)
        if err:
            print(json.dumps({"status": "unsafe", "reason": err, "path": str(cand)}, indent=2))
            raise SystemExit(9)
        if "bootstrap" not in cand.name:
            skipped.append({"path": str(cand), "reason": "name_mismatch"})

    safe = [c for c in candidates if {"path": str(c)} not in [{"path": s["path"]} for s in skipped]]

    if not force:
        print("The following directories will be removed:")
        for d in safe:
            print(f"  • {d}")
        if skipped:
            print("Skipped (name mismatch):")
            for s in skipped:
                print(f"  ✗ {s['path']}")
        answer = input("\nProceed? [y/N] ").strip().lower()
        if answer not in ("y", "yes"):
            print("Aborted.")
            raise SystemExit(0)

    for d in safe:
        shutil.rmtree(d)
        removed.append(str(d))

    status = "ok" if removed else "nothing"
    return {"status": status, "removed": removed, "skipped": skipped, "root": str(root)}


def cleanup_build_artifacts(root: Path, force: bool = False):
    """Remove build/ and dist/ under *root*, never the sovereign source."""
    root = root.resolve()
    sovereign_file = Path(__file__).resolve()

    targets = [root / "build", root / "dist"]
    existing = [t for t in targets if t.is_dir()]
    removed: list[str] = []
    skipped: list[dict] = []

    if not existing:
        return {"status": "nothing", "removed": [], "skipped": [], "root": str(root)}

    # Safety gate
    for t in existing:
        err = _validate_cleanup_target(root, t)
        if err:
            print(json.dumps({"status": "unsafe", "reason": err, "path": str(t)}, indent=2))
            raise SystemExit(9)

    # Ensure sovereign source is NOT inside any target
    for t in existing:
        if _is_within(t, sovereign_file):
            msg = f"Refused: sovereign source {sovereign_file} is inside {t}"
            print(json.dumps({"status": "unsafe", "reason": msg}, indent=2))
            raise SystemExit(9)

    if not force:
        print("The following directories will be removed:")
        for d in existing:
            print(f"  • {d}")
        answer = input("\nProceed? [y/N] ").strip().lower()
        if answer not in ("y", "yes"):
            print("Aborted.")
            raise SystemExit(0)

    for d in existing:
        shutil.rmtree(d)
        removed.append(str(d))

    status = "ok" if removed else "nothing"
    return {"status": status, "removed": removed, "skipped": skipped, "root": str(root)}


def run_mcp(root: Path):
    try:
        # pyre-ignore[21]
        from mcp.server.fastmcp import FastMCP
    except Exception as exc:
        raise SystemExit(f"FastMCP unavailable: {exc}")

    mcp = FastMCP("Cerebral-SAP7-Sovereign")

    @mcp.tool()
    def run_env_check():
        return env_check()

    @mcp.tool()
    def install_sovereign(approve_token: str = ""):
        approval_gate(approve_token)
        written = install_workspace(root)
        return {"status": "ok", "written_count": len(written)}

    @mcp.tool()
    def stage_wave2_tool(
        limit: int = 1,
        apply_mode: bool = False,
        operator: str = "mcp",
        approval_token: str = "",
        audit_path: str = "",
        strict_verify: bool = True,
    ):
        return stage_wave2(root, apply_mode, operator, approval_token, audit_path, limit, strict_verify)

    @mcp.tool()
    def verify_latest_tool(strict: bool = True):
        audit = pointer_audit_path(root)
        return verify_audit_file(audit, strict=strict)

    mcp.run()


def parse_args():
    parser = argparse.ArgumentParser(description=f"{APP_NAME} single-file bootstrap")
    sub = parser.add_subparsers(dest="cmd", required=True)

    install_cmd = sub.add_parser("install", help="Install embedded workspace files")
    install_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    install_cmd.add_argument("--approve", required=True, help="Type APPROVE")

    mcp_cmd = sub.add_parser("run-mcp", help="Run embedded FastMCP control plane")
    mcp_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))

    stage_cmd = sub.add_parser("stage", help="Run inline staging engine")
    stage_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    stage_cmd.add_argument("--apply", action="store_true")
    stage_cmd.add_argument("--operator", default="cli")
    stage_cmd.add_argument("--approval-token", default="")
    stage_cmd.add_argument("--audit", default="")
    stage_cmd.add_argument("--limit", type=int, default=1)
    stage_cmd.add_argument("--no-strict", action="store_true")

    verify_cmd = sub.add_parser("verify-latest", help="Verify audit from pointer file")
    verify_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    verify_cmd.add_argument("--strict", action="store_true")

    build_cmd = sub.add_parser("build-onefile", help="Build onefile executable with metadata manifest")
    build_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    build_cmd.add_argument("--build-dir", default=str(Path.cwd() / "build"))
    build_cmd.add_argument("--dist-dir", default=str(Path.cwd() / "dist"))
    build_cmd.add_argument("--allow-external-build-output", action="store_true")
    build_cmd.add_argument("--emit-spec", action="store_true")
    build_cmd.add_argument("--install-pyinstaller", action="store_true")

    version_cmd = sub.add_parser("version", help="Print script and bundle provenance")
    version_cmd.add_argument("--build-manifest", default="")

    rebuild_cmd = sub.add_parser("rebuild-check", help="Compare current source/toolchain against last build manifest")
    rebuild_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    rebuild_cmd.add_argument("--manifest", default="")
    rebuild_cmd.add_argument("--strict", action="store_true")

    pipeline_cmd = sub.add_parser("build-pipeline", help="Run strict precheck/build/postcheck pipeline with drift policy")
    pipeline_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    pipeline_cmd.add_argument("--build-dir", default=str(Path.cwd() / "build"))
    pipeline_cmd.add_argument("--dist-dir", default=str(Path.cwd() / "dist"))
    pipeline_cmd.add_argument("--manifest", default="")
    pipeline_cmd.add_argument("--strict", dest="strict", action="store_true", default=True)
    pipeline_cmd.add_argument("--no-strict", dest="strict", action="store_false")
    pipeline_cmd.add_argument("--install-pyinstaller", action="store_true")
    pipeline_cmd.add_argument("--force-build-on-drift", action="store_true")
    pipeline_cmd.add_argument("--allow-drift-fields", default="")
    pipeline_cmd.add_argument("--allow-missing-manifest", action="store_true")

    cleanup_bt_cmd = sub.add_parser("cleanup-bootstrap-test", help="Remove temporary bootstrap validation artifacts")
    cleanup_bt_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    cleanup_bt_cmd.add_argument("--force", action="store_true", help="Skip confirmation prompt")

    cleanup_ba_cmd = sub.add_parser("cleanup-build-artifacts", help="Remove build/ and dist/ directories (never deletes sovereign source)")
    cleanup_ba_cmd.add_argument("--root", default=str(INSTALL_ROOT_DEFAULT))
    cleanup_ba_cmd.add_argument("--force", action="store_true", help="Skip confirmation prompt")

    sub.add_parser("env-check", help="Run environment check")
    return parser.parse_args()


def main():
    args = parse_args()
    if args.cmd == "env-check":
        print(json.dumps(env_check(), indent=2))
        return

    if args.cmd == "install":
        approval_gate(args.approve)
        root = Path(args.root)
        key_state = ensure_audit_key(required_for_apply=False)
        written = install_workspace(root)
        print(json.dumps({"status": "ok", "installed_root": str(root), "written_count": len(written), "audit_key": key_state}, indent=2))
        return

    if args.cmd == "run-mcp":
        run_mcp(Path(args.root))
        return

    if args.cmd == "stage":
        root = Path(args.root)
        response = stage_wave2(
            root=root,
            apply_mode=bool(args.apply),
            operator=args.operator,
            approval_token=args.approval_token,
            audit_path=args.audit,
            limit=args.limit,
            strict_verify=not args.no_strict,
        )
        print(json.dumps(response, indent=2))
        if response.get("status") != "ok":
            raise SystemExit(2)
        return

    if args.cmd == "verify-latest":
        root = Path(args.root)
        audit = pointer_audit_path(root)
        result = verify_audit_file(audit, strict=bool(args.strict))
        print(json.dumps(result, indent=2))
        raise SystemExit(result.get("exit_code", 0))

    if args.cmd == "build-onefile":
        script_path = Path(__file__).resolve()
        result = build_onefile(
            source_file=script_path,
            app_root=Path(args.root),
            build_dir=Path(args.build_dir),
            dist_dir=Path(args.dist_dir),
            allow_external=bool(args.allow_external_build_output),
            emit_spec=bool(args.emit_spec),
            install_pyinstaller=bool(args.install_pyinstaller),
        )
        print(json.dumps(result, indent=2))
        return

    if args.cmd == "version":
        manifest = Path(args.build_manifest) if args.build_manifest else None
        print(json.dumps(version_info(Path(__file__).resolve(), manifest), indent=2))
        return

    if args.cmd == "rebuild-check":
        result = rebuild_check(
            root=Path(args.root),
            source_file=Path(__file__).resolve(),
            manifest_arg=args.manifest,
            strict=bool(args.strict),
        )
        print(json.dumps(result, indent=2))
        raise SystemExit(result.get("exit_code", 0))

    if args.cmd == "build-pipeline":
        result = build_pipeline(
            root=Path(args.root),
            source_file=Path(__file__).resolve(),
            build_dir=Path(args.build_dir),
            dist_dir=Path(args.dist_dir),
            manifest_arg=args.manifest,
            strict=bool(args.strict),
            install_pyinstaller=bool(args.install_pyinstaller),
            force_build_on_drift=bool(args.force_build_on_drift),
            allow_drift_fields_raw=args.allow_drift_fields,
            allow_missing_manifest=bool(args.allow_missing_manifest),
        )
        print(json.dumps(result, indent=2))
        raise SystemExit(result.get("exit_code", 0))

    if args.cmd == "cleanup-bootstrap-test":
        result = cleanup_bootstrap_test(root=Path(args.root), force=bool(args.force))
        print(json.dumps(result, indent=2))
        exit_code = 0 if result["status"] == "ok" else 8
        raise SystemExit(exit_code)

    if args.cmd == "cleanup-build-artifacts":
        result = cleanup_build_artifacts(root=Path(args.root), force=bool(args.force))
        print(json.dumps(result, indent=2))
        exit_code = 0 if result["status"] == "ok" else 8
        raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
