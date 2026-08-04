import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_FILES = [
    "cerebral_mcp_server.py",
    "cerebral_daemon.py",
    "tools/port_fixup.py",
    "tools/env_check.py",
    "tools/os_enumerate.py",
]


def file_sha256(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(repo_root: Path):
    records = []
    for relative in DEFAULT_FILES:
        file_path = repo_root / relative
        if not file_path.exists():
            records.append({"path": relative, "exists": False})
            continue
        records.append(
            {
                "path": relative,
                "exists": True,
                "sha256": file_sha256(file_path),
                "size": file_path.stat().st_size,
            }
        )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest_type": "insforge_integrity_prover_shim",
        "records": records,
    }


def main():
    parser = argparse.ArgumentParser(description="Generate local integrity manifest.")
    parser.add_argument("--output", default="tools/reports/insforge_manifest.json")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    output = repo_root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    manifest = build_manifest(repo_root)
    output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"status": "ok", "output": str(output)}, indent=2))


if __name__ == "__main__":
    main()
