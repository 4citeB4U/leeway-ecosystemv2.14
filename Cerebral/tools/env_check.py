import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def _run_version(command):
    exe = shutil.which(command)
    if not exe:
        return {"path": None, "version": None}
    try:
        arg = "-version" if command == "ffmpeg" else "--version"
        if command == "npm":
            result = subprocess.run(["cmd", "/c", "npm", arg], capture_output=True, text=True, timeout=15)
        else:
            result = subprocess.run([command, arg], capture_output=True, text=True, timeout=10)
        version = (result.stdout or result.stderr).strip().splitlines()
        return {"path": exe, "version": version[0] if version else None}
    except Exception as exc:
        return {"path": exe, "version": None, "error": str(exc)}


def _find_venv_python(repo_root: Path):
    candidates = [
        repo_root / ".venv" / "Scripts" / "python.exe",
        repo_root / ".venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return None


def _has_package(python_exe: str, package: str):
    if not python_exe:
        return None
    code = (
        "import importlib.util;"
        f"print('true' if importlib.util.find_spec('{package}') else 'false')"
    )
    try:
        result = subprocess.run([python_exe, "-c", code], capture_output=True, text=True, timeout=10)
        return result.stdout.strip().lower() == "true"
    except Exception:
        return None


def run_checks(repo_root: Path):
    venv_python = _find_venv_python(repo_root)
    system_python = shutil.which("python") or sys.executable
    data = {
        "repo_root": str(repo_root),
        "venv_present": bool((repo_root / ".venv").exists()),
        "venv_python": venv_python,
        "python": {
            "path": system_python,
            "mcp_installed": _has_package(system_python, "mcp"),
        },
        "venv": {
            "mcp_installed": _has_package(venv_python, "mcp"),
        },
        "node": _run_version("node"),
        "npm": _run_version("npm"),
        "ffmpeg": _run_version("ffmpeg"),
        "status": "ok",
    }
    return data


def main():
    parser = argparse.ArgumentParser(description="Check local environment prerequisites.")
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    result = run_checks(repo_root)

    if args.output:
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
