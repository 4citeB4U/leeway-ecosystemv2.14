"""
body_state.py — Cerebral Live System Body Map
==============================================
Produces a compact, structured snapshot of Cerebral's "body" — services,
drives, devices, and tool bridge health — injected into every system prompt
so the model always knows what it can and cannot actually do.

Usage:
    from body_state import build_body_state_block
    block = build_body_state_block()   # returns a plain-text string
"""

import os
import json
import socket
import subprocess
import time
import threading
import requests
import psutil

# ── Configurable workspace roots ─────────────────────────────────────────────
WORKSPACE_ROOTS = [
    r"C:\Cerebral",
    r"C:\Tools\Portable-VSCode-MCP-Kit",
]

# Ports Cerebral cares about (name → port)
KNOWN_PORTS = {
    "CerebralDaemon": 8765,
    "FoundryLLM":     56995,
    "MCPBridge":      6001,
    "DesktopHands":   6004,
    "VSCodeConnector":8002,
}

# Settings path (mirrors CerebralDaemon constant)
_SETTINGS_PATH = os.path.join(os.path.dirname(__file__), "settings.json")

# ── Port probe helper ─────────────────────────────────────────────────────────

def _probe_port(port: int, host: str = "127.0.0.1", timeout: float = 0.35) -> bool:
    """Return True if something is listening on `port`."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


# ── Sub-collectors ────────────────────────────────────────────────────────────

def _get_service_health() -> dict:
    """Probe all known service ports and return health map."""
    results = {}
    threads = []

    def probe(name, port):
        results[name] = "OK" if _probe_port(port) else "OFFLINE"

    for name, port in KNOWN_PORTS.items():
        t = threading.Thread(target=probe, args=(name, port), daemon=True)
        threads.append(t)
        t.start()
    for t in threads:
        t.join(timeout=1.0)

    return results


def _get_drive_summary() -> list[dict]:
    """Return a compact list of mounted drives with usage."""
    drives = []
    try:
        for part in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(part.mountpoint)
                drives.append({
                    "mount": part.mountpoint,
                    "fstype": part.fstype,
                    "total_gb": round(usage.total / 1e9, 1),
                    "free_gb":  round(usage.free  / 1e9, 1),
                    "pct_used": usage.percent,
                })
            except (PermissionError, OSError):
                pass
    except Exception:
        pass
    return drives


def _get_active_ports() -> list[str]:
    """Return list of ports with LISTEN status (short form)."""
    listening = []
    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.status == psutil.CONN_LISTEN and conn.laddr:
                listening.append(str(conn.laddr.port))
    except Exception:
        pass
    listening = sorted(set(listening), key=lambda p: int(p))
    return listening[:20]  # cap to avoid flooding


def _get_devices() -> dict:
    """Best-effort detection of available I/O devices."""
    devices = {}

    # Camera: check if any VideoCapture device is accessible
    try:
        import cv2  # type: ignore
        cap = cv2.VideoCapture(0)
        devices["camera"] = "available" if cap.isOpened() else "not detected"
        cap.release()
    except ImportError:
        devices["camera"] = "unknown (cv2 not installed)"
    except Exception:
        devices["camera"] = "not detected"

    # Microphone: check sounddevice
    try:
        import sounddevice as sd  # type: ignore
        devs = [d for d in sd.query_devices() if d["max_input_channels"] > 0]
        devices["microphone"] = f"{len(devs)} input device(s)"
    except Exception:
        devices["microphone"] = "unknown"

    # Speaker
    try:
        import sounddevice as sd  # type: ignore
        devs = [d for d in sd.query_devices() if d["max_output_channels"] > 0]
        devices["speaker"] = f"{len(devs)} output device(s)"
    except Exception:
        devices["speaker"] = "unknown"

    return devices


def _get_user_name() -> str:
    """Load operator name from settings.json if available."""
    try:
        if os.path.exists(_SETTINGS_PATH):
            with open(_SETTINGS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("user_name", "")
    except Exception:
        pass
    return ""


def _get_cpu_mem_quick() -> dict:
    """Quick CPU + RAM snapshot (non-blocking)."""
    try:
        cpu = psutil.cpu_percent(interval=None)
        ram = psutil.virtual_memory()
        return {
            "cpu_pct": cpu,
            "ram_used_gb": round(ram.used / 1e9, 1),
            "ram_total_gb": round(ram.total / 1e9, 1),
            "ram_pct": ram.percent,
        }
    except Exception:
        return {}


# ── Cache (refreshed every 8 s so repeated requests stay fast) ───────────────

_cache_lock = threading.Lock()
_cache: dict = {}
_cache_ts: float = 0.0
_CACHE_TTL = 8.0  # seconds


def _refresh_cache() -> dict:
    svc = _get_service_health()
    snap = {
        "ts":         time.time(),
        "services":   svc,
        "drives":     _get_drive_summary(),
        "active_ports": _get_active_ports(),
        "devices":    _get_devices(),
        "roots":      [r for r in WORKSPACE_ROOTS if os.path.isdir(r)],
        "operator":   _get_user_name(),
        "cpu_mem":    _get_cpu_mem_quick(),

        # Convenience booleans used by tool_router
        "filesystem_ok":  True,   # local filesystem always available
        "desktop_ok":     svc.get("DesktopHands", "OFFLINE") == "OK",
        "mcp_ok":         svc.get("MCPBridge", "OFFLINE") == "OK",
        "vscode_ok":      svc.get("VSCodeConnector", "OFFLINE") == "OK",
        "foundry_ok":     svc.get("FoundryLLM", "OFFLINE") == "OK",
    }
    return snap


def get_body_state(force: bool = False) -> dict:
    """Return the cached body-state dict, refreshing if stale."""
    global _cache, _cache_ts
    with _cache_lock:
        now = time.time()
        if force or (now - _cache_ts) > _CACHE_TTL or not _cache:
            _cache = _refresh_cache()
            _cache_ts = now
        return dict(_cache)


# ── Formatted text block (injected into system prompt) ───────────────────────

def build_body_state_block(state: dict | None = None) -> str:
    """
    Return a short, structured text block for injection into the system prompt.
    Format is terse to avoid consuming too many context tokens.
    """
    if state is None:
        state = get_body_state()

    svc = state.get("services", {})
    drives = state.get("drives", [])
    roots = state.get("roots", [])
    ports = state.get("active_ports", [])
    devices = state.get("devices", {})
    hwm = state.get("cpu_mem", {})
    operator = state.get("operator", "")

    # ── Service health ────────────────────────────────────────────────────────
    def _badge(name):
        return "OK" if svc.get(name) == "OK" else "OFFLINE"

    lines = [
        "─── CEREBRAL BODY STATE ─────────────────────────────────────",
        f"Operator  : {operator or '(unknown — ask for name)'}",
        f"CPU {hwm.get('cpu_pct', '?'):>5.1f}%   RAM {hwm.get('ram_pct', '?'):>5.1f}%  ({hwm.get('ram_used_gb','?')} / {hwm.get('ram_total_gb','?')} GB)",
        "",
        "Control Bridges:",
        f"  FilesystemBridge : OK (always available)",
        f"  DesktopHands     : {_badge('DesktopHands')}",
        f"  MCPBridge        : {_badge('MCPBridge')}",
        f"  VSCodeConnector  : {_badge('VSCodeConnector')}",
        f"  FoundryLLM       : {_badge('FoundryLLM')}",
        "",
        "Workspace Roots:",
    ]
    for r in roots:
        lines.append(f"  {r}")
    if not roots:
        lines.append("  (none detected)")

    if drives:
        lines.append("")
        lines.append("Drives:")
        for d in drives[:6]:
            lines.append(
                f"  {d['mount']:<6} {d['total_gb']:>6.1f}GB total, {d['free_gb']:>6.1f}GB free ({d['pct_used']}% used)"
            )

    lines.append("")
    lines.append("Devices:")
    for dev, status in devices.items():
        lines.append(f"  {dev:<12}: {status}")

    active_named = [f"{n}:{p}" for n, p in KNOWN_PORTS.items() if str(p) in ports]
    if active_named:
        lines.append("")
        lines.append(f"Active Ports: {', '.join(active_named)}")

    # ── Policy reminders ──────────────────────────────────────────────────────
    lines.append("")
    lines.append("Policy:")
    lines.append("  If bridge is OFFLINE → speak 1 sentence + propose exact recovery step.")
    lines.append("  File overwrite operations are HIGH RISK → require confirmation.")
    lines.append("  Prefer outputting to NEW files, never silently overwrite.")
    lines.append("─────────────────────────────────────────────────────────────")

    return "\n".join(lines)
