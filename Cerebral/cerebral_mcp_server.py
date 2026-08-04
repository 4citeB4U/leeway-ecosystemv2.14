import asyncio
import json
import subprocess
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from mcp.server.fastmcp import FastMCP

# Ensure agents dir is importable
sys.path.insert(0, str(Path(__file__).parent))

# Initialize FastMCP Server
mcp = FastMCP("Cerebral")

CEREBRAL_API = "http://127.0.0.1:8765/action"
REPO_ROOT = Path(r"C:\Cerebral")
REPORT_DIR = REPO_ROOT / "tools" / "reports"
APPLY_APPROVAL_TOKEN = "COMMANDER_LEE_APPROVED"
_LAST_STAGE_APPLY_UTC = None
STAGE_APPLY_MIN_SECONDS = 5


def _python_executable():
    candidate = REPO_ROOT / ".venv" / "Scripts" / "python.exe"
    return str(candidate) if candidate.exists() else "python"


def _run_process(command):
    result = subprocess.run(command, capture_output=True, text=True)
    return {
        "command": command,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def _rate_limit_stage_apply():
    global _LAST_STAGE_APPLY_UTC
    now = datetime.now(timezone.utc)
    if _LAST_STAGE_APPLY_UTC is None:
        _LAST_STAGE_APPLY_UTC = now
        return None
    elapsed = (now - _LAST_STAGE_APPLY_UTC).total_seconds()
    if elapsed < STAGE_APPLY_MIN_SECONDS:
        return STAGE_APPLY_MIN_SECONDS - elapsed
    _LAST_STAGE_APPLY_UTC = now
    return None

@mcp.tool()
def desktop_action(action: str, args: dict = None, confirm: bool = False):
    """
    Executes a desktop command via Cerebral.
    Actions: open_app, focus_window, close_window, move_window_to_monitor, 
             list_dir, find_large_files, organize_downloads, temp_cleanup_preview, 
             temp_cleanup_execute, browser_cache_clear, list_top_processes.
    """
    payload = {
        "action": action,
        "args": args or {},
        "confirm": confirm,
        "caller": "agent_lee_os_mcp"
    }
    try:
        response = requests.post(CEREBRAL_API, json=payload, timeout=15)
        return response.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}

@mcp.tool()
def get_system_health():
    """Returns CPU, RAM, Disk, and Uptime from the Cerebral Commander."""
    try:
        response = requests.get("http://127.0.0.1:8765/health", timeout=5)
        return response.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}


@mcp.tool()
def run_env_check():
    """Runs prerequisite checks for SAP7 toolchain and returns JSON report."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    output = REPORT_DIR / f"EnvCheck_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    command = [_python_executable(), str(REPO_ROOT / "tools" / "env_check.py"), "--output", str(output)]
    result = _run_process(command)
    result["report"] = str(output)
    return result


@mcp.tool()
def discovery_wave1(root: str = r"C:\Cerebral"):
    """Wave1 discovery: maps system topology and creates Wave1 discovery report."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    output = REPORT_DIR / "Wave1_Discovery.json"
    command = [
        _python_executable(),
        str(REPO_ROOT / "tools" / "os_enumerate.py"),
        "--output",
        str(output),
        "--root",
        root,
    ]
    result = _run_process(command)
    result["report"] = str(output)
    return result


@mcp.tool()
def hardware_baseline():
    """Wave1 hardware baseline: captures OS and hardware telemetry."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    output = REPORT_DIR / "Wave1_Hardware.json"
    command = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(REPO_ROOT / "tools" / "hardware_guardian.ps1"),
        "-Output",
        str(output),
    ]
    result = _run_process(command)
    result["report"] = str(output)
    return result


@mcp.tool()
def audit_wave2(
    sample_size: int = 10,
    audit_log: str = "",
    audit_verify_output: str = "",
    audit_strict: bool = True,
):
    """Wave2 audit: verifies sampled nodes from Wave1 and checks topology breaches."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    input_path = REPORT_DIR / "Wave1_Discovery.json"
    output = REPORT_DIR / "Wave2_Audit.json"
    command = [
        _python_executable(),
        str(REPO_ROOT / "tools" / "os_audit.py"),
        "--wave1",
        str(input_path),
        "--output",
        str(output),
        "--sample-size",
        str(sample_size),
    ]
    if audit_log:
        command.extend(["--audit-log", audit_log])
    if audit_verify_output:
        command.extend(["--audit-verify-output", audit_verify_output])
    if audit_strict:
        command.append("--audit-strict")
    result = _run_process(command)
    result["audit_strict"] = bool(audit_strict)
    result["report"] = str(output)
    return result


@mcp.tool()
def stage_wave2(
    limit: int = 20,
    staging_path: str = r"C:\Cerebral\staging",
    apply_mode: bool = False,
    approval_token: str = "",
    operator: str = "mcp",
    audit_path: str = "",
):
    """Wave2 stager: plans staging by default; copy requires apply_mode + approval token."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    approval_token_present = bool(approval_token)

    if apply_mode and approval_token != APPLY_APPROVAL_TOKEN:
        return {
            "status": "denied",
            "reason": "invalid_approval_token",
            "approval_token_present": approval_token_present,
        }

    if apply_mode:
        wait_seconds = _rate_limit_stage_apply()
        if wait_seconds is not None:
            return {
                "status": "denied",
                "reason": "rate_limited",
                "retry_after_seconds": round(wait_seconds, 2),
                "approval_token_present": approval_token_present,
            }

    input_path = REPORT_DIR / "Wave1_Discovery.json"
    output = REPORT_DIR / "Wave2_Staging.json"
    command = [
        _python_executable(),
        str(REPO_ROOT / "tools" / "stager.py"),
        "--wave1",
        str(input_path),
        "--staging",
        staging_path,
        "--limit",
        str(limit),
        "--output",
        str(output),
        "--operator",
        operator,
    ]
    if audit_path:
        command.extend(["--audit", audit_path])
    if approval_token_present:
        command.append("--approval-token-present")
    if apply_mode:
        command.append("--apply")
    result = _run_process(command)
    try:
        parsed_stdout = json.loads((result.get("stdout") or "").strip())
        if isinstance(parsed_stdout, dict):
            result["audit_log"] = parsed_stdout.get("audit_log")
            result["latest_audit_pointer"] = parsed_stdout.get("latest_audit_pointer")
            result["audit_strict_recommended"] = parsed_stdout.get("audit_strict_recommended")
    except Exception:
        pass
    result["apply_mode"] = apply_mode
    result["approval_token_present"] = approval_token_present
    result["report"] = str(output)
    return result


@mcp.tool()
def repair_wave3():
    """Wave3 planner: creates draft repair strategy from Wave2 report."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    input_path = REPORT_DIR / "Wave2_Audit.json"
    output = REPORT_DIR / "Wave3_RepairDraft.json"
    command = [
        _python_executable(),
        str(REPO_ROOT / "tools" / "repair_templater.py"),
        "--wave2",
        str(input_path),
        "--output",
        str(output),
    ]
    result = _run_process(command)
    result["report"] = str(output)
    return result


@mcp.tool()
def executive_handshake():
    """Returns executive approval prompt after Wave1 and Wave2."""
    return {
        "status": "ready_for_approval",
        "message": "Commander Lee, Wave 1 and 2 have concluded. The verifiers have verified the verifiers. We are at 100% readiness. Do we have your permission to execute?",
    }


@mcp.tool()
def insforge_generate_shim():
    """Generates local integrity manifest (insforge shim)."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    output = REPORT_DIR / "insforge_manifest.json"
    command = [_python_executable(), str(REPO_ROOT / "tools" / "insforge_shim.py"), "--output", str(output)]
    result = _run_process(command)
    result["report"] = str(output)
    return result


# ══════════════════════════════════════════════════════════════════════════════
# AGENT TOOLS — Sentinel, Navigator, CodeScout, Archivist
# Each MCP tool is a thin proxy to the agent's run() method.
# ══════════════════════════════════════════════════════════════════════════════

def _call_agent(agent_name: str, tool: str, args: dict = None) -> dict:
    """Route a tool call through the live Cerebral daemon agent endpoint."""
    try:
        r = requests.post(
            "http://127.0.0.1:8765/api/agents/run",
            json={"agent": agent_name, "tool": tool, "args": args or {}},
            timeout=120,
        )
        return r.json()
    except Exception as e:
        # Fallback: import and run directly if daemon is not reachable
        try:
            from agents import get_agent
            return get_agent(agent_name).run(tool, args or {})
        except Exception as e2:
            return {"ok": False, "error": f"daemon: {e} | direct: {e2}"}


# ── Sentinel (health watchdog) ────────────────────────────────────────────────

@mcp.tool()
def sentinel_health_snapshot() -> dict:
    """Take a live CPU/RAM/disk snapshot and return it. Writes to health.ndjson."""
    return _call_agent("sentinel", "health_snapshot")


@mcp.tool()
def sentinel_process_list(sort_by: str = "cpu", n: int = 15) -> dict:
    """List top N processes sorted by cpu or memory usage."""
    return _call_agent("sentinel", "process_list", {"sort_by": sort_by, "n": n})


@mcp.tool()
def sentinel_kill_process(pid: int = 0, name: str = "") -> dict:
    """Kill a process by PID or name. Protected system processes are blocked."""
    return _call_agent("sentinel", "kill_process", {"pid": pid, "name": name})


@mcp.tool()
def sentinel_check_service(host: str = "127.0.0.1", port: int = 8765, url: str = "") -> dict:
    """Probe a TCP port and optional HTTP URL to check if a service is alive."""
    return _call_agent("sentinel", "check_service", {"host": host, "port": port, "url": url})


@mcp.tool()
def sentinel_disk_usage() -> dict:
    """Return space breakdown for all attached drives."""
    return _call_agent("sentinel", "disk_usage")


@mcp.tool()
def sentinel_health_history(n: int = 20) -> dict:
    """Return the last N health log entries from logs/health.ndjson."""
    return _call_agent("sentinel", "health_history", {"n": n})


# ── Navigator (Playwright browser automation) ─────────────────────────────────

@mcp.tool()
def navigator_healthcheck() -> dict:
    """Verify Playwright and Chromium are installed and launchable."""
    return _call_agent("navigator", "healthcheck")


@mcp.tool()
def navigator_open_url(url: str, wait_ms: int = 2000, headless: bool = True) -> dict:
    """Open a URL in a headless Chromium browser. Returns title and HTTP status."""
    return _call_agent("navigator", "open_url", {"url": url, "wait_ms": wait_ms, "headless": headless})


@mcp.tool()
def navigator_screenshot_page(label: str = "screenshot", full_page: bool = True) -> dict:
    """Take a full-page screenshot of the current browser page. Returns the file path."""
    return _call_agent("navigator", "screenshot_page", {"label": label, "full_page": full_page})


@mcp.tool()
def navigator_extract_text(max_chars: int = 4000) -> dict:
    """Extract visible body text from the currently open page."""
    return _call_agent("navigator", "extract_text", {"max_chars": max_chars})


@mcp.tool()
def navigator_search_web(query: str, n: int = 5, engine: str = "duckduckgo") -> dict:
    """Search the web via DuckDuckGo/Bing/Google and return top N result links."""
    return _call_agent("navigator", "search_web", {"query": query, "n": n, "engine": engine})


@mcp.tool()
def navigator_run_script(script: str) -> dict:
    """Run arbitrary JavaScript in the current browser page and return the result."""
    return _call_agent("navigator", "run_script", {"script": script})


@mcp.tool()
def navigator_close_browser() -> dict:
    """Close the browser session and free all resources."""
    return _call_agent("navigator", "close_browser")


# ── CodeScout (code intelligence) ────────────────────────────────────────────

@mcp.tool()
def code_scout_scan_repo(root: str = r"C:\Cerebral") -> dict:
    """Scan the repository and return language breakdown and file list."""
    return _call_agent("code_scout", "scan_repo", {"root": root})


@mcp.tool()
def code_scout_find_symbol(symbol: str, exts: list = None) -> dict:
    """Search for a function/class/variable name across all source files."""
    return _call_agent("code_scout", "find_symbol", {"symbol": symbol, "exts": exts or [".py", ".ts", ".tsx", ".js"]})


@mcp.tool()
def code_scout_find_todos(tags: list = None) -> dict:
    """Find all TODO, FIXME, HACK, NOTE comments in the codebase."""
    return _call_agent("code_scout", "find_todos", {"tags": tags or ["TODO", "FIXME", "HACK", "NOTE"]})


@mcp.tool()
def code_scout_analyze_errors(log_path: str = r"C:\Cerebral\daemon.err") -> dict:
    """Parse a log file for Python tracebacks and warnings."""
    return _call_agent("code_scout", "analyze_errors", {"log_path": log_path})


@mcp.tool()
def code_scout_count_loc(root: str = r"C:\Cerebral") -> dict:
    """Count lines of code by language (code / blank / comment)."""
    return _call_agent("code_scout", "count_loc", {"root": root})


@mcp.tool()
def code_scout_find_dead_code() -> dict:
    """Heuristic: find Python functions defined but never called (public fns only)."""
    return _call_agent("code_scout", "find_dead_code")


@mcp.tool()
def code_scout_summarize_file(path: str) -> dict:
    """Use Phi-3.5 to generate a 3-5 sentence summary of a source file."""
    return _call_agent("code_scout", "summarize_file", {"path": path})


# ── Archivist (memory & knowledge management) ─────────────────────────────────

@mcp.tool()
def archivist_memory_stats() -> dict:
    """Return statistics about the memory.json knowledge store."""
    return _call_agent("archivist", "memory_stats")


@mcp.tool()
def archivist_memory_search(query: str, n: int = 20) -> dict:
    """Full-text keyword search across all memory.json entries."""
    return _call_agent("archivist", "memory_search", {"query": query, "n": n})


@mcp.tool()
def archivist_memory_write(fact: str, tags: list = None) -> dict:
    """Append a new fact or event to Cerebral's persistent memory."""
    return _call_agent("archivist", "memory_write", {"fact": fact, "tags": tags or []})


@mcp.tool()
def archivist_generate_briefing(last_n: int = 40) -> dict:
    """Generate a structured executive briefing from the last N memory entries using Phi-3.5."""
    return _call_agent("archivist", "generate_briefing", {"last_n": last_n})


@mcp.tool()
def archivist_knowledge_query(question: str, context_n: int = 20) -> dict:
    """Ask Phi-3.5 a question with the last N memory entries injected as context."""
    return _call_agent("archivist", "knowledge_query", {"question": question, "context_n": context_n})


@mcp.tool()
def archivist_session_export(last_n: int = 100) -> dict:
    """Export the last N memory entries to a timestamped JSON file in logs/exports/."""
    return _call_agent("archivist", "session_export", {"last_n": last_n})


if __name__ == "__main__":
    mcp.run()
