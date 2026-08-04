import argparse
import hashlib
import json
import os
import random
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path


CRITICAL_FILES = [
    "cerebral_mcp_server.py",
    "cerebral_daemon.py",
    "CerebralDaemon.py",
    "tools/orchestrate_restart.ps1",
    "tools/port_fixup.py",
]

DEFAULT_EXCLUDE_DIR_MARKERS = {
    ".venv",
    "node_modules",
    "__pycache__",
    "staging",
    "Cerebral_backup",
}


def _sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _powershell_json(command: str):
    full = ["powershell", "-NoProfile", "-Command", command]
    try:
        result = subprocess.run(full, capture_output=True, text=True, timeout=30)
        text = result.stdout.strip()
        if not text:
            return []
        return json.loads(text)
    except Exception:
        return []


def collect_processes(limit: int):
    script = (
        "Get-Process | Select-Object Id, ProcessName, CPU, WS | "
        "Sort-Object -Property Id | ConvertTo-Json"
    )
    rows = _powershell_json(script)
    if isinstance(rows, dict):
        rows = [rows]
    return rows[:limit]


def collect_services(limit: int):
    script = (
        "Get-Service | Select-Object Name, Status, StartType | "
        "Sort-Object -Property Name | ConvertTo-Json"
    )
    rows = _powershell_json(script)
    if isinstance(rows, dict):
        rows = [rows]
    return rows[:limit]


def collect_listeners(limit: int):
    listeners = []
    try:
        netstat = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=20)
        for line in netstat.stdout.splitlines():
            line = line.strip()
            if not line.startswith("TCP") and not line.startswith("UDP"):
                continue
            parts = [p for p in line.split(" ") if p]
            if len(parts) < 4:
                continue
            proto = parts[0]
            local = parts[1]
            state = parts[3] if proto == "TCP" and len(parts) >= 5 else None
            pid = parts[-1]
            listeners.append({"protocol": proto, "local": local, "state": state, "pid": pid})
    except Exception:
        return []
    return listeners[:limit]


def _should_exclude(path: Path, custom_excludes):
    markers = set(DEFAULT_EXCLUDE_DIR_MARKERS)
    markers.update(custom_excludes or [])
    path_parts = {part.lower() for part in path.parts}
    for marker in markers:
        if marker.lower() in path_parts:
            return True
    return False


def collect_nodes(root: Path, node_limit: int, exclude_markers):
    files = []
    directories = []
    for current_root, dirs, file_names in os.walk(root):
        current = Path(current_root)
        if _should_exclude(current, exclude_markers):
            dirs[:] = []
            continue

        dirs[:] = [
            directory for directory in dirs if not _should_exclude(current / directory, exclude_markers)
        ]

        directories.append(str(current))
        for file_name in file_names:
            candidate = current / file_name
            if _should_exclude(candidate, exclude_markers):
                continue
            files.append(str(candidate))
        if len(files) >= node_limit:
            break
    random.shuffle(files)
    selected = files[:node_limit]
    node_objects = [{"path": path, "type": "file"} for path in selected]
    return {
        "sampled_files": node_objects,
        "sampled_directories": directories[: min(200, len(directories))],
    }


def collect_critical_hashes(repo_root: Path):
    hashes = []
    for relative in CRITICAL_FILES:
        path = repo_root / relative
        if not path.exists():
            hashes.append({"path": relative, "exists": False})
            continue
        hashes.append({"path": relative, "exists": True, "sha256": _sha256(path)})
    return hashes


def main():
    parser = argparse.ArgumentParser(description="Wave1 discovery script (read-only).")
    parser.add_argument("--output", required=True)
    parser.add_argument("--root", default="C:\\Cerebral")
    parser.add_argument("--process-limit", type=int, default=150)
    parser.add_argument("--service-limit", type=int, default=150)
    parser.add_argument("--listener-limit", type=int, default=300)
    parser.add_argument("--node-limit", type=int, default=500)
    parser.add_argument(
        "--exclude-dir",
        action="append",
        default=[],
        help="Additional directory markers to exclude from topology sampling",
    )
    args = parser.parse_args()

    root = Path(args.root)
    repo_root = Path(__file__).resolve().parents[1]

    payload = {
        "wave": 1,
        "name": "BackStraightVerification",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "host": socket.gethostname(),
        "root": str(root),
        "status": "read_only",
        "processes": collect_processes(args.process_limit),
        "services": collect_services(args.service_limit),
        "listeners": collect_listeners(args.listener_limit),
        "topology": collect_nodes(root, args.node_limit, args.exclude_dir),
        "exclusions": sorted(list(DEFAULT_EXCLUDE_DIR_MARKERS.union(set(args.exclude_dir or [])))),
        "critical_hashes": collect_critical_hashes(repo_root),
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "output": str(output), "wave": 1}, indent=2))


if __name__ == "__main__":
    main()
