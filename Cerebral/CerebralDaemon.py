import threading
import time
import os
import sys
import io
import json
import shutil
import subprocess
from datetime import datetime
import typing
from typing import Any, cast, Dict, List, Optional, Union

# Ensure stdout/stderr use UTF-8 to avoid UnicodeEncodeError on Windows consoles
try:
    pass
    # if hasattr(sys.stdout, "reconfigure"):
    #     sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    # if hasattr(sys.stderr, "reconfigure"):
    #     sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    try:
        import codecs
        sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer)  # pyre-ignore
        sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer)  # pyre-ignore
    except Exception:
        os.environ.setdefault("PYTHONIOENCODING", "utf-8")

# CoreBus task processor
COREBUS_ROOT = r"C:\AgentLee\CoreBus"
TASKS_DIR = os.path.join(COREBUS_ROOT, "tasks")
OUTBOX_DIR = os.path.join(COREBUS_ROOT, "outbox")

def system_info():
    import platform
    return {
        "hostname": platform.node(),
        "system": platform.system(),
        "version": platform.version(),
        "architecture": platform.machine()
    }


def _json_safe(value: Any):
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="replace")
        except Exception:
            return str(value)
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    return value


def _decode_windows_output(output: Any) -> str:
    if output is None:
        return ""
    if isinstance(output, bytes):
        raw = output
    else:
        raw = str(output).encode("utf-8", errors="ignore")
    if not raw:
        return ""
    if b"\x00" in raw:
        utf16 = raw.decode("utf-16le", errors="ignore").replace("\x00", "")
        if utf16.strip():
            return utf16
    return raw.decode("utf-8", errors="ignore")


def _run_version_check(command: str, args: List[str], timeout: int = 12) -> Dict[str, Any]:
    try:
        result = subprocess.run([command, *args], capture_output=True, text=True, timeout=timeout)
        stdout = (result.stdout or "").strip()
        stderr = (result.stderr or "").strip()
        return {
            "available": result.returncode == 0,
            "path": shutil.which(command),
            "version": stdout or None,
            "stdout": stdout or None,
            "stderr": stderr or None,
            "exitCode": result.returncode,
        }
    except Exception as exc:
        return {
            "available": False,
            "path": shutil.which(command),
            "version": None,
            "stdout": None,
            "stderr": str(exc),
            "exitCode": None,
        }


def _read_wsl_status() -> Dict[str, Any]:
    wsl_path = shutil.which("wsl.exe")
    if not wsl_path:
        return {
            "available": False,
            "path": None,
            "distros": [],
            "defaultDistro": None,
            "ubuntu": {"installed": False, "running": False, "available": False, "distro": None, "name": None, "state": "Unavailable", "version": None, "stderr": "wsl.exe not installed", "exitCode": None},
        }

    try:
        result = subprocess.run([wsl_path, "-l", "-v"], capture_output=True, text=False, timeout=15)
        decoded_stdout = _decode_windows_output(result.stdout)
        lines = [line.strip() for line in decoded_stdout.splitlines() if line.strip()]
        distros = []
        for line in lines:
            if line.lower().startswith("name") or set(line) <= {"-", " "}:
                continue
            is_default = line.startswith("*")
            clean_line = line.lstrip("*").strip()
            parts = [part.strip() for part in clean_line.split() if part.strip()]
            if len(parts) >= 3:
                distros.append({"name": parts[0], "state": parts[1], "version": parts[2], "default": is_default})
            else:
                distros.append({"name": clean_line, "state": "unknown", "version": None, "default": is_default})
        ubuntu = next((distro for distro in distros if distro["name"].lower().startswith("ubuntu")), None)
        default_distro = next((distro["name"] for distro in distros if distro.get("default")), distros[0]["name"] if distros else None)
        ubuntu_state = ubuntu.get("state") if ubuntu else "Unavailable"
        return {
            "available": True,
            "path": wsl_path,
            "distros": distros,
            "defaultDistro": default_distro,
            "ubuntu": {
                "installed": bool(ubuntu),
                "running": str(ubuntu_state).lower() == "running",
                "available": bool(ubuntu),
                "distro": ubuntu["name"] if ubuntu else None,
                "name": ubuntu["name"] if ubuntu else None,
                "state": ubuntu_state,
                "version": ubuntu.get("version") if ubuntu else None,
                "stdout": decoded_stdout.strip() or None,
                "stderr": _decode_windows_output(result.stderr).strip() or None,
                "exitCode": result.returncode,
            },
        }
    except Exception as exc:
        return {
            "available": True,
            "path": wsl_path,
            "distros": [],
            "defaultDistro": None,
            "ubuntu": {"installed": False, "running": False, "available": False, "distro": None, "name": None, "state": "Unavailable", "version": None, "stdout": None, "stderr": str(exc), "exitCode": None},
        }


def _runtime_wsl_status() -> Dict[str, Any]:
    try:
        response = requests.get("http://127.0.0.1:4001/device/wsl/status", timeout=5)
        data = response.json()
        if response.ok:
            return data
        return {"ok": False, "available": False, "error": data.get("error", "RUNTIME_WSL_STATUS_FAILED"), "runtimeStatus": response.status_code, "fallback": _read_wsl_status()}
    except Exception as exc:
        fallback = _read_wsl_status()
        return {"ok": False, "available": fallback.get("available", False), "error": "RUNTIME_FABRIC_UNREACHABLE", "message": str(exc), **fallback}


def _runtime_wsl_start(distro: str = "Ubuntu") -> Dict[str, Any]:
    try:
        response = requests.post("http://127.0.0.1:4001/device/wsl/start", json={"distro": distro or "Ubuntu"}, timeout=45)
        data = response.json()
        data["runtimeStatus"] = response.status_code
        return data
    except Exception as exc:
        return {"ok": False, "available": False, "error": "RUNTIME_FABRIC_UNREACHABLE", "message": str(exc), "status": _read_wsl_status()}


def _probe_local_ports() -> List[Dict[str, Any]]:
    ports = [4001, 8111, 8080, 8091, 8765, 11434, 3000, 5173]
    listening = []
    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.status == "LISTEN" and conn.laddr and conn.laddr.port in ports:
                listening.append({
                    "port": conn.laddr.port,
                    "processId": conn.pid,
                    "address": conn.laddr.ip,
                    "state": conn.status,
                })
    except Exception:
        pass
    return listening


def _build_local_device_status() -> Dict[str, Any]:
    powershell = _run_version_check("powershell.exe", ["-NoProfile", "-Command", '$PSVersionTable.PSVersion.ToString()'])
    pwsh_path = shutil.which("pwsh.exe")
    powerShell7 = _run_version_check("pwsh.exe", ["-NoProfile", "-Command", '$PSVersionTable.PSVersion.ToString()']) if pwsh_path else {"available": False, "path": None, "version": None, "stdout": None, "stderr": "pwsh.exe not installed", "exitCode": None}
    wsl = _read_wsl_status()
    node = _run_version_check("node", ["--version"])
    npm = _run_version_check("npm", ["--version"])
    python = _run_version_check("python", ["--version"])
    ollama_path = shutil.which("ollama")
    try:
        ollama_response = requests.get("http://127.0.0.1:11434/api/tags", timeout=3)
        ollama_models = ollama_response.json().get("models", []) if ollama_response.ok else []
    except Exception:
        ollama_response = None
        ollama_models = []
    terminal_status = None
    try:
        terminal_status = requests.get("http://127.0.0.1:4001/terminal/status", timeout=3).json()
    except Exception:
        terminal_status = None
    return {
        "ok": True,
        "platform": "windows",
        "hostname": __import__("platform").node(),
        "user": os.environ.get("USERNAME") or os.environ.get("USER") or "unknown",
        "workspaceRoot": r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4",
        "terminalFabricStatus": (terminal_status or {}).get("status") or "OMNI_TERMINAL_WORKER_READY" if powershell.get("available") else "OMNI_TERMINAL_FABRIC_REQUIRED",
        "terminalFabric": "online" if powershell.get("available") else "offline",
        "receiptRequired": True,
        "powershell": {**powershell, "command": "powershell.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'"},
        "powershell7": {**powerShell7, "command": "pwsh.exe -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'"},
        "wsl": wsl,
        "node": node,
        "npm": npm,
        "python": python,
        "ollama": {
            "available": bool(ollama_response and ollama_response.ok),
            "path": ollama_path,
            "online": bool(ollama_response and ollama_response.ok),
            "models": ollama_models,
            "modelCount": len(ollama_models),
            "status": "online" if ollama_response and ollama_response.ok else "offline",
            "responseCode": ollama_response.status_code if ollama_response else None,
        },
        "ports": {
            "monitored": [4001, 8111, 8080, 8091, 8765, 11434, 3000, 5173],
            "listening": _probe_local_ports(),
        },
        "resources": {
            "cpuCount": psutil.cpu_count(logical=True),
            "freeMemoryBytes": psutil.virtual_memory().available,
            "totalMemoryBytes": psutil.virtual_memory().total,
            "platform": __import__("platform").platform(),
            "release": __import__("platform").release(),
            "arch": __import__("platform").machine(),
            "uptimeSeconds": int(time.time() - psutil.boot_time()),
        },
    }


def _build_terminal_status() -> Dict[str, Any]:
    local = _build_local_device_status()
    wsl_ubuntu = local["wsl"].get("ubuntu", {})
    return {
        "ok": True,
        "terminalFabric": local["terminalFabric"],
        "platform": local["platform"],
        "shells": {
            "windowsPowerShell": {
                "available": bool(local["powershell"].get("available")),
                "path": local["powershell"].get("path") or "powershell.exe",
                "version": local["powershell"].get("version"),
            },
            "powerShell7": {
                "available": bool(local["powershell7"].get("available")),
                "path": local["powershell7"].get("path"),
                "version": local["powershell7"].get("version"),
            },
            "wslUbuntu": {
                "available": bool(wsl_ubuntu.get("installed") or wsl_ubuntu.get("available")),
                "running": bool(wsl_ubuntu.get("running")),
                "path": local["wsl"].get("path"),
                "distros": local["wsl"].get("distros", []),
                "defaultDistro": local["wsl"].get("defaultDistro"),
                "ubuntu": wsl_ubuntu,
            },
        },
        "workspaceRoot": local["workspaceRoot"],
        "receiptRequired": True,
        "status": local["terminalFabricStatus"],
        "sessions": [],
        "message": "Local terminal fabric is online and ready to plan receipt-backed commands." if local["terminalFabric"] == "online" else "Local terminal fabric is offline.",
    }

def process_tasks():
    for file in os.listdir(TASKS_DIR):
        if not file.endswith(".json"):
            continue
        path = os.path.join(TASKS_DIR, file)
        try:
            with open(path) as f:
                task = json.load(f)
            cmd = task.get("command")
            tid = task.get("task_id")
            if cmd == "system_info":
                result = system_info()
            else:
                result = {"error": "unknown_command"}
            output = {
                "task_id": tid,
                "timestamp": datetime.utcnow().isoformat(),
                "result": result
            }
            with open(os.path.join(OUTBOX_DIR, f"{tid}.json"), "w") as f:
                json.dump(output, f, indent=2)
            os.remove(path)
        except Exception as e:
            print("Task error:", e)

def task_watcher_loop():
    print("[CerebralDaemon] Task watcher started.")
    while True:
        try:
            process_tasks()
        except Exception as e:
            print("Task watcher error:", e)
        time.sleep(2)
import pythoncom  # pyre-ignore
import threading
import requests  # pyre-ignore
import time
import subprocess
import psutil  # pyre-ignore
import os
import json
import winsound
from collections import deque
from datetime import datetime, timezone
from flask import Flask, jsonify, request, Response, send_from_directory, stream_with_context  # pyre-ignore
from flask_cors import CORS  # pyre-ignore
import win32com.client  # pyre-ignore

from memory_engine import append_memory  # pyre-ignore
from file_engine import analyze_file, list_large_files, move_file, suggest_drive_redistribution  # pyre-ignore
from task_queue import add_task  # pyre-ignore
from planner_engine import generate_plan, validate_plan  # pyre-ignore
from policy_engine import requires_approval, check as _policy_check  # pyre-ignore
from audit_log import log_event  # pyre-ignore
from persona import CEREBRAL_SYSTEM_PROMPT, CEREBRAL_PERSONA_REMINDER, CEREBRAL_FAST_PROMPT  # pyre-ignore
from body_state import get_body_state, build_body_state_block  # pyre-ignore
from tool_router import route as _tool_route, TOOL_CONTRACT_BLOCK  # pyre-ignore
from file_indexer import build_repo_map, search_index, summarise_file, compare_files  # pyre-ignore
from desktop_hands import get_hands  # pyre-ignore
from convert_tools import convert as _convert_file  # pyre-ignore
from runtime_live_bridge import get_live_bridge_paths, invoke_agent_tool  # pyre-ignore
from model_registry import load_registry, get_models, as_simple_list  # pyre-ignore
try:
    from model_router import call as _mr_call, call_json as _mr_call_json, health as _mr_health, FOUNDRY_BASE as _MR_FOUNDRY_BASE, MODELS as _MR_MODELS  # pyre-ignore
    _MR_OK = True
except Exception as _mr_e:
    _MR_OK = False
    _MR_MODELS = {}
    _MR_FOUNDRY_BASE = "unknown"
    def _mr_health(): return {"foundry_ok": False, "vl_ok": False}
try:
    from task_spine import run_spine, classify_intent, Intent, spine_result_to_dict  # pyre-ignore
    _SPINE_OK = True
except Exception as _spine_e:
    _SPINE_OK = False
    def classify_intent(m): return "chat"
    class Intent:
        CHAT = "chat"; TOOL = "tool"; PLAN = "plan"; VISION = "vision"
try:
    from agents import AGENT_REGISTRY, get_agent as _get_agent  # pyre-ignore
    _AGENTS_OK = True
except Exception as _ae:
    _AGENTS_OK = False
    AGENT_REGISTRY = {}
    def _get_agent(name): raise RuntimeError(f"Agents not loaded: {_ae}")
try:
    from vision_tools import capture_and_analyse as _capture_vision  # pyre-ignore
    _VISION_OK = True
except ImportError:
    _VISION_OK = False
    _capture_vision = None

# ── Request-type classifiers ──────────────────────────────────────────────────
import re as _clf_re

_VISION_PATTERNS = _clf_re.compile(
    r'\b(camera|webcam|see|look|wearing|wear|outfit|clothes|clothing|'
    r'background|behind me|in front|face|hair|shirt|pants|appearance|describe me|'
    r'what do you see|show me|can you see|what.?s there|who.?s there|'
    r'what am i|how do i look|what color|what colour|look at me|check me out|'
    r'surroundings|room|holding|sitting|standing)\b',
    _clf_re.IGNORECASE
)

_TOOL_PATTERNS = _clf_re.compile(
    r'\b(open|read|write|save|create|delete|find|search|list|'
    r'launch|start|run|screenshot|convert|compare|summarize|summarise|'
    r'repo.?map|index|file|folder|directory|window|focus|'
    r'click|type|press|drag|scroll|key|keyboard|mouse|'
    r'power.?plan|powercfg|ipconfig|tasklist|control.?panel|task.?manager|'
    r'status|health|port|service|browse|navigate)\b',
    _clf_re.IGNORECASE
)

def _is_vision_request(msg: str) -> bool:
    return bool(_VISION_PATTERNS.search(msg))

def _is_tool_request(msg: str) -> bool:
    return bool(_TOOL_PATTERNS.search(msg)) and not _is_vision_request(msg)
import queue as _qmod

# TTS event queue: receives 'start'/'stop' from the TTS worker, forwarded to
# the frontend via the /api/tts/events SSE endpoint so the speaking animation
# syncs with actual audio playback instead of a word-count timer.
_tts_event_queue: _qmod.Queue = _qmod.Queue(maxsize=200)

# Base URL for Foundry service — auto-discovered at startup
# Foundry Local assigns a dynamic port; we probe to find it
import re as _re
import re

def _discover_foundry_url():
    """Probe common Foundry ports to find a live service."""
    # 1. Try `foundry service status` to get the current URL
    try:
        result = subprocess.run(
            ["foundry", "service", "status"],
            capture_output=True, text=True, timeout=5
        )
        match = _re.search(r'(http://127\.0\.0\.1:\d+)', result.stdout)
        if match:
            base = match.group(1).rstrip('/')
            # Verify it responds
            try:
                r = requests.get(f"{base}/v1/models", timeout=2)
                if r.status_code == 200:
                    print(f"[CerebralDaemon] Foundry discovered via CLI: {base}")
                    return base
            except Exception:
                pass
    except Exception:
        pass

    # 2. Probe known ports
    env_url = os.environ.get("CEREBRAL_FOUNDRY_BASE", "")
    candidates = ["http://127.0.0.1:56995"]
    if env_url and env_url not in candidates:
        candidates.append(env_url)
    candidates.extend(["http://127.0.0.1:8000", "http://127.0.0.1:5273"])
    
    for base in candidates:
        try:
            r = requests.get(f"{base.rstrip('/')}/v1/models", timeout=2)
            if r.status_code == 200:
                print(f"[CerebralDaemon] Foundry discovered at: {base}")
                return base
        except Exception:
            continue
    
    print("[CerebralDaemon] WARNING: No live Foundry service found. Using fallback URL.")
    return "http://127.0.0.1:56995"

CEREBRAL_FOUNDRY_BASE = _discover_foundry_url()
FOUNDRY_URL = f"{CEREBRAL_FOUNDRY_BASE}/v1/chat/completions"
# Model identifiers to try — Phi-3.5-mini-instruct CPU is the primary cached model
MODEL_LIST = ["Phi-3.5-mini-instruct-generic-cpu:1"]
# Port used when attempting to auto-start the Foundry local service
CEREBRAL_FOUNDRY_PORT = os.environ.get("CEREBRAL_FOUNDRY_PORT", "56995")

# Agent Lee OS2 — the one true frontend
# Resolved relative to this file so it works from the ecosystem root.
_DAEMON_DIR = os.path.dirname(os.path.abspath(__file__))
UI_DIST = os.environ.get(
    "CEREBRAL_UI_DIST",
    os.path.join(_DAEMON_DIR, "agent-lee-os2", "dist")
)
app = Flask(__name__, static_folder=UI_DIST, static_url_path="")
CORS(app)

# Register Cerebral Bridge Control Plane
from cerebral_bridge import bridge_bp  # pyre-ignore
app.register_blueprint(bridge_bp)

# TTS Integration (edge-tts neural voices — gracefully degrades if packages missing)
try:
    from audio.piper_voices import list_voices, get_voice_info  # pyre-ignore
    from audio.barge_in_controller import SpeechAgent  # pyre-ignore
    from audio.piper_tts_worker import register_tts_listener  # pyre-ignore
    speech_agent = SpeechAgent()
    _tts_available = True
    # Wire TTS start/stop events to the event queue for SSE delivery
    def _tts_event_cb(event: str):
        try:
            _tts_event_queue.put_nowait(event)
        except Exception:
            pass
    register_tts_listener(_tts_event_cb)
    print("[CerebralDaemon] Neural TTS loaded OK")
except Exception as _tts_err:
    list_voices = lambda: []
    get_voice_info = lambda vid: None
    speech_agent = None
    _tts_available = False
    print(f"[CerebralDaemon] TTS unavailable (SAPI fallback): {_tts_err}")

def _play_wave_async(path: str):
    try:
        # winsound.PlaySound is available on Windows and can play asynchronously
        # pyre-ignore
        winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_ASYNC)
        return True
    except Exception:
        try:
            # fallback: attempt to use ffplay if available
            subprocess.Popen(["ffplay", "-nodisp", "-autoexit", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except Exception:
            return False

# Optional endpoints for audio handling
POCKET_AUDIO_UPLOAD_URL = os.environ.get("POCKET_AUDIO_UPLOAD_URL")
FOUNDARY_ASR_URL = os.environ.get("CEREBRAL_FOUNDRY_ASR", f"{CEREBRAL_FOUNDRY_BASE}/v1/audio/transcriptions")


# Serve the built frontend from agent-lee-os2/dist. Visiting `/` returns index.html.
@app.route('/')
def serve_index():
    # pyre-ignore
    from flask import make_response
    resp = make_response(app.send_static_file('index.html'))
    resp.headers['Cache-Control'] = 'no-store, max-age=0'
    resp.headers['Pragma'] = 'no-cache'
    return resp

foundry_alive = False
# In-memory toggle for server-side TTS. Default on; can be toggled via API.
tts_enabled = True
# default background settings
bg_color = "#0a0f1a"
bg_speed = 1.0
SETTINGS_PATH = os.path.join(os.path.dirname(__file__), "settings.json")

# Telemetry state: keep short rolling histories for front-end charts
TELEmetry_WINDOW = 60  # samples (~seconds)
telemetry_state: Dict[str, Any] = {
    "cpu_total_history": deque(maxlen=TELEmetry_WINDOW),
    "cpu_per_core_history": deque(maxlen=TELEmetry_WINDOW),
    "ram_used_history": deque(maxlen=TELEmetry_WINDOW),
    "disk_read_history": deque(maxlen=TELEmetry_WINDOW),
    "disk_write_history": deque(maxlen=TELEmetry_WINDOW),
    "network_up_history": deque(maxlen=TELEmetry_WINDOW),
    "network_down_history": deque(maxlen=TELEmetry_WINDOW),
    "error_events_history": deque(maxlen=TELEmetry_WINDOW),
    "recent_errors": deque(maxlen=50),
    "top_processes": deque(maxlen=TELEmetry_WINDOW),
    "last_sample_ts": None,
}

# Hold last raw counters to compute rates
_last_disk_counters = None
_last_net_counters = None


def load_settings():
    """Load persistent settings from `settings.json` if present."""
    global tts_enabled
    global bg_color, bg_speed
    try:
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
            tts_enabled = bool(data.get('tts_enabled', tts_enabled))
            bg_color = data.get('bg_color', bg_color)
            try:
                bg_speed = float(data.get('bg_speed', bg_speed))
            except Exception:
                pass
    except Exception:
        # ignore errors and keep defaults
        pass


def save_settings():
    """Save current settings to `settings.json`."""
    try:
        with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
            json.dump({
                "tts_enabled": bool(tts_enabled),
                "bg_color": bg_color,
                "bg_speed": float(bg_speed)
            }, f)
    except Exception:
        pass

def monitor_foundry():
    """DECOMMISSIONED — Foundry Local is no longer used for chat.
    All inference now routes through Agent Lee Prime (Router 8080 → Ollama 11434).
    This function is kept as a no-op to avoid import/call errors from other modules.
    """
    global foundry_alive
    print("[CerebralDaemon] monitor_foundry: DECOMMISSIONED — chat routes through Agent Lee Prime")
    foundry_alive = False
    # Do NOT poll or auto-start Foundry — it is no longer part of the chat path.
    # The function exits immediately instead of looping.


def _tail_recent_errors():
    """Try to load recent errors from logs/health.ndjson or health_log.json if present."""
    try:
        ndjson_path = os.path.join(os.path.dirname(__file__), 'logs', 'health.ndjson')
        if os.path.exists(ndjson_path):
            with open(ndjson_path, 'r', encoding='utf-8') as f:
                # pyre-ignore
                lines = f.readlines()[-50:]
            errs = []
            for ln in lines:
                try:
                    obj = json.loads(ln)
                    if obj.get('level') in ('error', 'critical') or 'error' in obj.get('message','').lower():
                        errs.append(obj)
                except Exception:
                    continue
            return errs
    except Exception:
        pass

    try:
        hl = os.path.join(os.path.dirname(__file__), 'health_log.json')
        if os.path.exists(hl):
            with open(hl, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # if it's a list, return tail
            if isinstance(data, list):
                # pyre-ignore
                return data[-50:]
            return [data]
    except Exception:
        pass

    return []


def _tail_ndjson(path: str, limit: int = 30):
    """Return the most recent parseable JSON lines from an ndjson file."""
    if not path or not os.path.exists(path):
        return []

    tail = deque(maxlen=max(1, min(int(limit or 30), 100)))
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    tail.append(json.loads(line))
                except Exception:
                    continue
    except Exception:
        return []
    return list(tail)


def _read_json_file(path: str, default):
    if not path or not os.path.exists(path):
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


def _derive_runtime_task_results(events: Optional[List[Any]] = None, progress: Optional[List[Any]] = None, sessions: Optional[List[Any]] = None):
    # type guards
    if events is None: events = []
    if progress is None: progress = []
    if sessions is None: sessions = []
    
    def _string(value, default=""):
        text = str(value or "").strip()
        return text or default

    records: Dict[str, Any] = {}
    def _get_record(task_id: str) -> Dict[str, Any]:
        if task_id not in records:
            records[task_id] = {
                'task_id': task_id,
                'session_id': task_id,
                'status': 'unknown',
                'tool': None,
                'updated_at': None,
                'assistant_message': None,
                'success': None,
                'proofs': [],
                '_proof_index': set(),
                'steps': [],
                '_step_index': {},
            }
        return cast(Dict[str, Any], records[task_id])

    for entry in progress:
        task_id = _string(entry.get('task_id'))
        if not task_id:
            continue

        record: Dict[str, Any] = _get_record(task_id)
        status = _string(entry.get('status'), 'unknown')
        record['status'] = status
        record['updated_at'] = entry.get('ts') or record.get('updated_at')

        tool = entry.get('tool')
        if isinstance(tool, str) and tool.strip():
            record['tool'] = tool.strip()

        if status == 'completed':
            record['success'] = True
        elif status in {'failed', 'blocked'}:
            record['success'] = False

        step_id = entry.get('step_id')
        if step_id is None:
            continue

        details = entry.get('details') if isinstance(entry.get('details'), dict) else {}
        step_key = str(step_id)
        # pyre-ignore
        _step_index: Dict[str, Any] = record['_step_index']
        step: Dict[str, Any] = _step_index.get(step_key, {
            'step_id': step_id,
            'tool': tool if isinstance(tool, str) else None,
            'status': status,
            'ts': entry.get('ts'),
            'verified': None,
            'error': None,
        })
        # pyre-ignore
        step['status'] = status
        # pyre-ignore
        step['ts'] = entry.get('ts') or step.get('ts')
        if isinstance(tool, str) and tool.strip():
            # pyre-ignore
            step['tool'] = tool.strip()
        if isinstance(details.get('verified'), bool):
            # pyre-ignore
            step['verified'] = details['verified']
        if details.get('error'):
            # pyre-ignore
            step['error'] = str(details['error'])
        # pyre-ignore
        _step_index[step_key] = step

    for entry in events:
        if _string(entry.get('event')) != 'cerebral.proof.captured':
            continue

        payload = entry.get('payload') if isinstance(entry.get('payload'), dict) else {}
        task_id = _string(payload.get('task_id'))
        if not task_id:
            continue

        record: Dict[str, Any] = _get_record(task_id)
        proof_path = _string(payload.get('path'))
        proof_name = os.path.basename(proof_path)
        if not proof_name or proof_name in record['_proof_index']:
            continue

        record['_proof_index'].add(proof_name)
        record['proofs'].append({
            'filename': proof_name,
            'url': f"/api/runtime/artifacts/{proof_name}",
            'label': _string(payload.get('label')),
            'step_id': payload.get('step_id'),
            'ts': entry.get('ts'),
        })

    for entry in sessions:
        session_id = _string(entry.get('session_id'))
        if not session_id:
            continue

        metadata = entry.get('metadata') if isinstance(entry.get('metadata'), dict) else {}
        task_id = _string(metadata.get('task_id'))
        if not task_id and session_id.startswith('task-spine-'):
            task_id = session_id
        if not task_id:
            continue

        record: Dict[str, Any] = _get_record(task_id)
        record['session_id'] = session_id
        record['updated_at'] = entry.get('ts') or record.get('updated_at')

        role = _string(entry.get('role'))
        if role == 'assistant':
            content = _string(entry.get('content'))
            if content:
                record['assistant_message'] = content
            if isinstance(metadata.get('success'), bool):
                record['success'] = metadata['success']

            proof_files = metadata.get('proofs') if isinstance(metadata.get('proofs'), list) else []
            # pyre-ignore
            for name in proof_files:
                proof_name = os.path.basename(_string(name))
                if not proof_name or proof_name in record['_proof_index']:
                    continue
                record['_proof_index'].add(proof_name)
                record['proofs'].append({
                    'filename': proof_name,
                    'url': f"/api/runtime/artifacts/{proof_name}",
                    'label': 'result',
                    'step_id': None,
                    'ts': entry.get('ts'),
                })

            step_results = metadata.get('step_results') if isinstance(metadata.get('step_results'), list) else []
            # pyre-ignore
            for step_result in step_results:
                # pyre-ignore
                if not isinstance(step_result, dict):
                    continue
                # pyre-ignore
                step_id = step_result.get('step_id')
                if step_id is None:
                    continue
                step_key = str(step_id)
                # pyre-ignore
                _step_index: Dict[str, Any] = record['_step_index']
                step: Dict[str, Any] = _step_index.get(step_key, {
                    'step_id': step_id,
                    'tool': None,
                    'status': 'completed' if step_result.get('ok') else 'failed',
                    'ts': entry.get('ts'),
                    'verified': None,
                    'error': None,
                })
                if isinstance(step_result.get('tool'), str) and step_result.get('tool').strip():
                    # pyre-ignore
                    step['tool'] = step_result.get('tool').strip()
                # pyre-ignore
                step['status'] = 'completed' if step_result.get('ok') else 'failed'
                if isinstance(step_result.get('verified'), bool):
                    # pyre-ignore
                    step['verified'] = step_result['verified']
                if step_result.get('error'):
                    # pyre-ignore
                    step['error'] = str(step_result['error'])
                # pyre-ignore
                step['ts'] = entry.get('ts') or step.get('ts')
                # pyre-ignore
                _step_index[step_key] = step

    results = []
    for record in records.values():
        steps = list(record['_step_index'].values())
        steps.sort(key=lambda item: (item.get('step_id') is None, item.get('step_id') or 0))
        record['steps'] = steps
        record['proofs'].sort(key=lambda item: item.get('ts') or '', reverse=True)
        record.pop('_step_index', None)
        record.pop('_proof_index', None)
        results.append(record)

    results.sort(key=lambda item: item.get('updated_at') or '', reverse=True)
    return results


def _runtime_bridge_snapshot(limit: int = 30):
    paths = get_live_bridge_paths()
    state = _read_json_file(paths.get('state_file'), {})
    events = _tail_ndjson(paths.get('event_log'), limit)
    progress = _tail_ndjson(paths.get('progress_log'), limit)
    sessions = _tail_ndjson(paths.get('session_log'), limit)

    tasks = state.get('tasks', {}) if isinstance(state, dict) else {}
    agents = state.get('agents', {}) if isinstance(state, dict) else {}

    active_statuses = {'queued', 'classified', 'planned', 'running', 'approval_required'}
    active_tasks = [task for task in tasks.values() if task.get('status') in active_statuses]
    active_agents = [agent for agent in agents.values() if agent.get('status') in active_statuses]
    task_results = _derive_runtime_task_results(events, progress, sessions)
    proof_count = sum(len(item.get('proofs', [])) for item in task_results)

    return {
        'ok': True,
        'paths': paths,
        'state': state,
        'events': list(reversed(events)),
        'progress': list(reversed(progress)),
        'sessions': list(reversed(sessions)),
        'derived': {
            'task_results': task_results,
            'proof_count': proof_count,
        },
        'summary': {
            'task_count': len(tasks),
            'agent_count': len(agents),
            'active_tasks': len(active_tasks),
            'active_agents': len(active_agents),
            'latest_event': events[-1] if events else None,
            'latest_progress': progress[-1] if progress else None,
        },
    }


def monitor_telemetry(interval: float = 1.0):
    """Background sampler that collects system metrics and maintains short histories."""
    global _last_disk_counters, _last_net_counters
    while True:
        try:
            ts = datetime.now(timezone.utc).isoformat() + 'Z'
            cpu_total = psutil.cpu_percent(interval=None)
            cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
            vm = psutil.virtual_memory()
            ram_used = vm.used
            ram_total = vm.total

            # disk io rates (bytes/sec) computed against previous counters
            disk_counters = psutil.disk_io_counters()
            read_b = 0
            write_b = 0
            if _last_disk_counters:
                elapsed = max(1.0, interval)
                read_b = max(0, disk_counters.read_bytes - _last_disk_counters.read_bytes) / elapsed
                write_b = max(0, disk_counters.write_bytes - _last_disk_counters.write_bytes) / elapsed
            _last_disk_counters = disk_counters

            # net io rates (bytes/sec)
            net_counters = psutil.net_io_counters()
            up_b = 0
            down_b = 0
            if _last_net_counters:
                elapsed = max(1.0, interval)
                up_b = max(0, net_counters.bytes_sent - _last_net_counters.bytes_sent) / elapsed
                down_b = max(0, net_counters.bytes_recv - _last_net_counters.bytes_recv) / elapsed
            _last_net_counters = net_counters

            # top processes by cpu (snapshot)
            top = []
            try:
                procs = []
                for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                    try:
                        procs.append(p.info)
                    except Exception:
                        continue
                # pyre-ignore
                procs_sorted = sorted(procs, key=lambda x: x.get('cpu_percent', 0), reverse=True)[:10]
                top = procs_sorted
            except Exception:
                top = []

            # recent errors read from logs
            recent_errs = _tail_recent_errors()

            telemetry_state['cpu_total_history'].append({'ts': ts, 'value': cpu_total})
            telemetry_state['cpu_per_core_history'].append({'ts': ts, 'value': cpu_per_core})
            telemetry_state['ram_used_history'].append({'ts': ts, 'used': ram_used, 'total': ram_total})
            telemetry_state['disk_read_history'].append({'ts': ts, 'bytes_per_sec': read_b})
            telemetry_state['disk_write_history'].append({'ts': ts, 'bytes_per_sec': write_b})
            telemetry_state['network_up_history'].append({'ts': ts, 'bytes_per_sec': up_b})
            telemetry_state['network_down_history'].append({'ts': ts, 'bytes_per_sec': down_b})
            telemetry_state['top_processes'].append({'ts': ts, 'processes': top})
            # push any recent errors into deque individually
            for e in recent_errs:
                telemetry_state['recent_errors'].append(e)
            telemetry_state['error_events_history'].append({'ts': ts, 'count': len(recent_errs)})
            telemetry_state['last_sample_ts'] = ts

        except Exception:
            # swallow to keep daemon alive
            pass

        time.sleep(interval)


def finalize_ptt_file(session: str, filepath: str):
    """Finalize a PTT recording: transcode WAV, run STT, trigger voice-to-voice LLM response."""
    tmpdir = os.path.join(os.path.dirname(__file__), 'tmp')
    wavpath = None
    try:
        if not os.path.exists(filepath):
            return {"status": "no_file", "session": session}

        wavpath = os.path.join(tmpdir, f'ptt-{session}.wav')
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", filepath,
                 "-ar", "16000", "-ac", "1", "-acodec", "pcm_s16le", wavpath],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            wavpath = None

        result = {"status": "finalized", "session": session,
                  "size": os.path.getsize(filepath)}

        transcript = None
        asr_status  = None
        try:
            # 1. Foundry ASR (Whisper endpoint)
            if wavpath and FOUNDARY_ASR_URL:
                try:
                    with open(wavpath, 'rb') as fh:
                        r = requests.post(FOUNDARY_ASR_URL,
                                          files={'file': fh}, timeout=30)
                    asr_status = r.status_code
                    if r.status_code == 200:
                        try:
                            j = r.json()
                            transcript = (j.get('text') or j.get('transcript')
                                          or j.get('data') or None)
                            if isinstance(transcript, dict):
                                transcript = (transcript.get('text')
                                              or transcript.get('transcript'))
                        except Exception:
                            transcript = None
                except Exception:
                    asr_status = 'error'

            # 2. Local faster-whisper fallback when Foundry ASR unavailable
            if not transcript and wavpath and os.path.exists(wavpath):
                try:
                    from core.streaming_stt import StreamingSTT  # pyre-ignore
                    import numpy as np, wave  # pyre-ignore
                    _stt = StreamingSTT(model_size="base.en", compute_type="int8")
                    with wave.open(wavpath, 'rb') as wf:
                        raw = wf.readframes(wf.getnframes())
                    audio_np = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                    transcript = _stt.transcribe(audio_np) or None
                    asr_status = 'local_whisper'
                except Exception as _stt_e:
                    print(f"[PTT] Local STT error: {_stt_e}")

            # pyre-ignore
            result.update({'wav': wavpath, 'transcript': transcript, 'asr_status': asr_status})

            # LEEWAY SINGLE BRAIN LAW: No independent background reasoning or voice loop.
            # STT should only return the transcript. Let Agent Lee Prime handle conversation & voice.
            pass

        except Exception as e:
            result['error'] = str(e)

        return result
    except Exception as e:
        return {"status": "error", "error": str(e)}


def _write_pcm16_wav(path: str, audio_np, samplerate: int = 16000):
    """Write mono float audio to a PCM16 WAV without extra dependencies."""
    import wave
    import numpy as _np

    audio = _np.asarray(audio_np).reshape(-1)
    audio = _np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(_np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(samplerate)
        wf.writeframes(pcm.tobytes())


def _transcribe_wav_local(wavpath: str):
    try:
        from faster_whisper import WhisperModel  # pyre-ignore
    except Exception as exc:
        return {
            "ok": False,
            "error": "LOCAL_ASR_DEPENDENCY_MISSING",
            "message": f"faster_whisper is not installed in the Cerebral Python environment: {exc}",
        }

    try:
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, info = model.transcribe(
            wavpath,
            task="transcribe",
            beam_size=1,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        transcript = " ".join((segment.text or "").strip() for segment in segments)
        transcript = " ".join(transcript.split()).strip()
        return {
            "ok": bool(transcript),
            "transcript": transcript,
            "language": getattr(info, "language", "") or "",
            "languageProbability": float(getattr(info, "language_probability", 0.0) or 0.0),
            "engine": "faster_whisper",
        }
    except Exception as exc:
        return {
            "ok": False,
            "error": "LOCAL_ASR_TRANSCRIBE_FAILED",
            "message": str(exc),
        }


@app.route('/api/local-voice/agent-lee-capture', methods=['POST'])
def local_voice_agent_lee_capture():
    """Capture from the machine microphone, transcribe locally, route to Agent Lee."""
    data = request.get_json(silent=True) or {}
    seconds = data.get("seconds", 5)
    try:
        seconds = max(1.0, min(float(seconds), 15.0))
    except Exception:
        seconds = 5.0

    tmpdir = os.path.join(os.path.dirname(__file__), 'tmp')
    os.makedirs(tmpdir, exist_ok=True)
    session = data.get("session") or str(int(time.time() * 1000))
    wavpath = os.path.join(tmpdir, f"local-mic-{session}.wav")

    try:
        import sounddevice as sd  # pyre-ignore
        import numpy as np  # pyre-ignore
    except Exception as exc:
        return jsonify({
            "ok": False,
            "error": "LOCAL_MIC_DEPENDENCY_MISSING",
            "message": f"sounddevice/numpy unavailable in Cerebral Python environment: {exc}",
        }), 503

    samplerate = 16000
    try:
        devices = sd.query_devices()
        default_input = sd.default.device[0]
        input_devices = [
            {"index": idx, "name": dev.get("name", ""), "maxInputChannels": dev.get("max_input_channels", 0)}
            for idx, dev in enumerate(devices)
            if dev.get("max_input_channels", 0) > 0
        ]
        audio = sd.rec(
            int(seconds * samplerate),
            samplerate=samplerate,
            channels=1,
            dtype="float32",
        )
        sd.wait()
        audio = np.asarray(audio).reshape(-1)
        rms = float(np.sqrt(np.mean(np.square(audio)))) if audio.size else 0.0
        peak = float(np.max(np.abs(audio))) if audio.size else 0.0
        _write_pcm16_wav(wavpath, audio, samplerate)
    except Exception as exc:
        return jsonify({
            "ok": False,
            "error": "LOCAL_MIC_CAPTURE_FAILED",
            "message": str(exc),
        }), 503

    asr = _transcribe_wav_local(wavpath)
    if not asr.get("ok"):
        return jsonify({
            "ok": False,
            "error": asr.get("error", "LOCAL_ASR_FAILED"),
            "message": asr.get("message", "Local ASR returned no transcript."),
            "wav": wavpath,
            "recording": {"seconds": seconds, "samplerate": samplerate, "rms": rms, "peak": peak},
            "defaultInput": default_input,
            "devices": input_devices,
        }), 503

    transcript = asr.get("transcript", "").strip()
    speak_requested = bool(data.get("speak", True))
    agent_endpoint = "http://127.0.0.1:8765/api/agent-lee/chat"
    try:
        response = requests.post(
            agent_endpoint,
            json={
                "input": transcript,
                "mode": "chat",
                "speak": speak_requested,
                "sessionId": data.get("sessionId"),
                "history": data.get("history", []),
            },
            timeout=180,
        )
        agent_data = response.json()
    except Exception as exc:
        return jsonify({
            "ok": False,
            "error": "AGENT_LEE_ROUTE_FAILED",
            "message": str(exc),
            "endpoint": agent_endpoint,
            "transcript": transcript,
            "wav": wavpath,
        }), 503

    agent_response = (agent_data.get("response") or "").strip()
    if not response.ok or not agent_data.get("ok") or not agent_response:
        return jsonify({
            "ok": False,
            "error": agent_data.get("error", "AGENT_LEE_EMPTY_RESPONSE"),
            "message": agent_data.get("message", f"Agent Lee route returned HTTP {response.status_code}."),
            "endpoint": agent_endpoint,
            "httpStatus": response.status_code,
            "transcript": transcript,
            "agent": agent_data,
            "wav": wavpath,
        }), 502

    if speak_requested and tts_enabled:
        threading.Thread(target=speak_text, args=(agent_response,), daemon=True).start()

    return jsonify({
        "ok": True,
        "agentId": "agent-lee",
        "sourceOfEmbodiment": agent_data.get("sourceOfEmbodiment", "agent-lee-coding-mode"),
        "corePath": agent_data.get("corePath"),
        "transcript": transcript,
        "response": agent_response,
        "route": "local-mic -> faster_whisper -> cerebral-agent-lee-adapter -> runtime-fabric-agent-lee -> agent-lee-coding-mode",
        "mode": "voice",
        "speak": speak_requested,
        "endpoint": agent_endpoint,
        "wav": wavpath,
        "recording": {"seconds": seconds, "samplerate": samplerate, "rms": rms, "peak": peak},
        "asr": asr,
        "defaultInput": default_input,
        "devices": input_devices,
        "trace": agent_data.get("trace"),
        "tools": agent_data.get("tools", []),
    })


@app.route('/api/local-voice/status', methods=['GET'])
def local_voice_status():
    """Truthful local Agent Lee voice inventory for the active LeeWay deployment."""
    try:
        import sounddevice as sd  # pyre-ignore
        mic_devices = [
            {"index": idx, "name": dev.get("name", ""), "maxInputChannels": dev.get("max_input_channels", 0)}
            for idx, dev in enumerate(sd.query_devices())
            if dev.get("max_input_channels", 0) > 0
        ]
        mic_available = len(mic_devices) > 0
    except Exception as exc:
        mic_devices = []
        mic_available = False
        mic_error = str(exc)
    else:
        mic_error = ""

    try:
        import faster_whisper  # pyre-ignore
        asr_available = True
        asr_error = ""
    except Exception as exc:
        asr_available = False
        asr_error = str(exc)

    tts_voices = []
    if speech_agent:
        try:
            tts_voices = [
                {
                    "id": "agent-lee-local",
                    "label": "Agent Lee Local",
                    "name": "Agent Lee Local",
                    "language": "local",
                    "engine": "cerebral-tts",
                    "source": "local",
                    "available": bool(_tts_available),
                }
            ]
        except Exception:
            tts_voices = []

    return jsonify({
        "ok": True,
        "deployment": {
            "id": "leeway-local-agent-lee",
            "name": "LeeWay Local Agent Lee",
            "type": "local-device",
            "active": True,
            "default": True,
            "services": [
                "Runtime Fabric 4001",
                "Runtime Fabric compatibility 8111",
                "Agent Lee brainfix router 8080",
                "Agent Lee desktop runtime/body 8091",
                "Ollama 11434",
                "CerebralDaemon 8765",
                "local ASR faster_whisper",
                "local TTS" if bool(_tts_available) else "local TTS unavailable",
            ],
        },
        "mic": {
            "available": mic_available,
            "devices": mic_devices,
            "error": mic_error,
        },
        "asr": {
            "engine": "faster_whisper",
            "available": asr_available,
            "error": asr_error,
        },
        "tts": {
            "engine": "cerebral-tts" if speech_agent else "sapi_fallback",
            "available": bool(_tts_available or speech_agent),
            "voices": tts_voices,
        },
        "agentLeeVoice": {
            "id": "agent-lee-local",
            "name": "Agent Lee Local",
            "label": "Agent Lee Local",
            "source": "local",
            "available": bool(_tts_available or speech_agent),
        },
    })


def _sapi_speak(text: str):
    """Windows SAPI fallback for when Piper is unavailable."""
    try:
        pythoncom.CoInitialize()
        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        speaker.Speak(text)
    except Exception:
        pass
    finally:
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass

def speak_text(text: str) -> None:
    """
    Speak text via Desktop Runtime 8091 (Agent Lee's canonical voice layer).
    Falls back to Piper speech_agent then Windows SAPI if Desktop Runtime is offline.
    Per AGENTS.md: Desktop Runtime owns mouth/speech output.
    """
    _desktop_runtime_url = "http://127.0.0.1:8091"
    try:
        r = requests.post(
            f"{_desktop_runtime_url}/runtime/speak",
            json={
                "text": text,
                "confirm": "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
            },
            timeout=60,
        )
        try:
            res_json = r.json()
        except Exception:
            res_json = {}
        if r.ok and res_json.get("ok"):
            print(f"[CerebralDaemon] speak_text: Desktop Runtime 8091 speaking: {text[:60]}")
            return
        else:
            print(f"[CerebralDaemon] speak_text: Desktop Runtime returned {r.status_code} ok={res_json.get('ok')}, using Piper fallback")
    except requests.exceptions.ConnectionError:
        print(f"[CerebralDaemon] speak_text: Desktop Runtime 8091 offline, using Piper fallback for: {text[:60]}")
    except Exception as e:
        print(f"[CerebralDaemon] speak_text: Desktop Runtime error ({e}), using Piper fallback")

    # Fallback 1 — Piper speech agent
    try:
        if speech_agent:
            speech_agent.say(text)
            return
    except Exception as e:
        print(f"[CerebralDaemon] speak_text: Piper fallback error: {e}")

    # Fallback 2 — Windows SAPI
    try:
        _sapi_speak(text)
    except Exception as e:
        print(f"[CerebralDaemon] speak_text: SAPI fallback error: {e}")


@app.route("/tools/status")
def tools_status():
    """Return live health of every Cerebral control bridge."""
    state    = get_body_state(force=True)
    svc      = state.get("services", {})
    hands    = get_hands().health() if True else {}
    caps     = hands.get("capabilities", {})
    vl       = hands.get("vl_model", {})
    return jsonify({
        "filesystem":      {"status": "ok"},
        "desktop": {
            "status":           "ok" if caps.get("screenshot") else "degraded",
            "click":            caps.get("click",            False),
            "type":             caps.get("type",             False),
            "key_press":        caps.get("key_press",        False),
            "scroll":           caps.get("scroll",           False),
            "drag":             caps.get("drag",             False),
            "screenshot":       caps.get("screenshot",       False),
            "find_text":        caps.get("find_text",        False),
            "find_text_ai":     caps.get("find_text_ai",     False),
            "describe_screen":  caps.get("describe_screen",  False),
            "find_image":       caps.get("find_image",       False),
            "window_focus":     caps.get("window_focus",     False),
            "run_command":      caps.get("run_command",      True),
        },
        "vl_model": {
            "available":    vl.get("available",     False),
            "loaded":       vl.get("loaded",        False),
            "files_present":vl.get("files_present", False),
            "model":        vl.get("model",         "Qwen2.5-VL-3B-Instruct"),
        },
        "vision": {
            "status":      "ok" if _VISION_OK else "offline",
            "camera_index": 1,
        },
        "mcp":             {"status": svc.get("MCPBridge",       "OFFLINE").lower()},
        "vscode":          {"status": svc.get("VSCodeConnector", "OFFLINE").lower()},
        "foundry":         {"status": svc.get("FoundryLLM",      "OFFLINE").lower()},
        "workspace_roots": state.get("roots", []),
        "operator":        state.get("operator", ""),
        "cpu_pct":         state.get("cpu_mem", {}).get("cpu_pct"),
        "ram_pct":         state.get("cpu_mem", {}).get("ram_pct"),
    })


# ── Vision VL model — on-demand load/unload (Qwen2.5-VL-3B via llama_cpp) ────
_vision_llm_loaded = False

@app.route("/api/vision/load", methods=["POST"])
def vision_load():
    """Load the Qwen2.5-VL-3B-Instruct model into llama_cpp (slow on CPU ~60s).
    POST /api/vision/load
    Returns {"status":"loading"} immediately; poll /tools/status for vl_model.loaded.
    """
    global _vision_llm_loaded
    def _do_load():
        global _vision_llm_loaded
        try:
            # pyre-ignore
            import vision_llm
            vision_llm.load()
            _vision_llm_loaded = True
        except Exception as _e:
            import logging
            logging.error(f"[vision/load] {_e}")
    import threading
    t = threading.Thread(target=_do_load, daemon=True, name="VisionVLLoad")
    t.start()
    return jsonify({"status": "loading", "model": "Qwen2.5-VL-3B-Instruct", "estimated_seconds": 60})

@app.route("/api/vision/unload", methods=["POST"])
def vision_unload():
    """Free the VL model from RAM."""
    global _vision_llm_loaded
    try:
        # pyre-ignore
        import vision_llm
        vision_llm.unload()
        _vision_llm_loaded = False
        return jsonify({"status": "unloaded"})
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500

@app.route("/api/vision/status", methods=["GET"])
def vision_status():
    """Quick check of camera + VL model state."""
    return jsonify({
        "camera_ok": _VISION_OK,
        "vl_model_loaded": _vision_llm_loaded,
        "vl_model": "Qwen2.5-VL-3B-Instruct",
        "vl_model_path": r"C:\models\Qwen2.5-VL-3B-Instruct-q4_k_m.gguf",
    })


@app.route("/api/device/local/status")
def device_local_status():
    return jsonify(_json_safe(_build_local_device_status()))


@app.route("/api/device/wsl/status", methods=["GET"])
def device_wsl_status():
    return jsonify(_json_safe(_runtime_wsl_status()))


@app.route("/api/device/wsl/start", methods=["POST"])
def device_wsl_start():
    data = request.json or {}
    result = _runtime_wsl_start(str(data.get("distro") or "Ubuntu"))
    return jsonify(_json_safe(result)), 200 if result.get("ok") else 409


@app.route("/api/terminal/status")
def terminal_status():
    return jsonify(_json_safe(_build_terminal_status()))


@app.route("/api/health")
def health():
    canonical_agent_lee = _probe_canonical_agent_lee()
    return jsonify({
        "daemon": "online",
        "foundry": foundry_alive,
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        "status": "online" if canonical_agent_lee["ok"] else "degraded",
        "agentLeeCanonical": canonical_agent_lee,
    })


@app.route("/api/telemetry")
def telemetry():
    try:
        # Instantaneous summary
        cpu_now = psutil.cpu_percent()
        cpu_per_core = psutil.cpu_percent(percpu=True)
        vm = psutil.virtual_memory()
        disk_c = psutil.disk_io_counters()
        net_c = psutil.net_io_counters()

        # Snapshot of the telemetry_state histories (convert deques to lists)
        snapshot = {k: list(v) if hasattr(v, '__iter__') and not isinstance(v, (str, bytes)) else v for k, v in telemetry_state.items()}
        return jsonify({
            "instant": {
                "cpu": cpu_now,
                "cpu_per_core": cpu_per_core,
                "ram_percent": vm.percent,
                "ram_used": vm.used,
                "ram_total": vm.total,
                "disk_read_bytes": getattr(disk_c, 'read_bytes', None),
                "disk_write_bytes": getattr(disk_c, 'write_bytes', None),
                "net_bytes_sent": getattr(net_c, 'bytes_sent', None),
                "net_bytes_recv": getattr(net_c, 'bytes_recv', None),
            },
            "history": snapshot
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    global tts_enabled, bg_color, bg_speed
    if request.method == 'GET':
        return jsonify({"tts_enabled": bool(tts_enabled), "bg_color": bg_color, "bg_speed": bg_speed})

    # POST: update settings
    data = request.get_json(force=True) or {}
    updated = False
    if 'tts_enabled' in data:
        try:
            tts_enabled = bool(data.get('tts_enabled'))
            updated = True
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    if 'bg_color' in data:
        try:
            bg_color = str(data.get('bg_color') or bg_color)
            updated = True
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    if 'bg_speed' in data:
        try:
            val = data.get('bg_speed')
            if val is not None:
                bg_speed = float(val)
                updated = True
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    if updated:
        save_settings()
        return jsonify({"tts_enabled": tts_enabled, "bg_color": bg_color, "bg_speed": bg_speed})

    return jsonify({"error": "no supported fields provided"}), 400


# ── Tunnel management ─────────────────────────────────────────────────────────
_tunnel_proc: Optional[subprocess.Popen] = None
_tunnel_log: List[str] = []
_tunnel_url: Optional[str] = None
_tunnel_started_at: Optional[str] = None

CF_TUNNEL_TOKEN = os.environ.get(
    "CF_TUNNEL_TOKEN_CEREBRAL",
    "eyJhIjoiOWM1YzgzZTJlOWI2YTg1Y2Q1NWY0MWIxMzM5Mjk2NTMiLCJ0IjoiZWJkMjEwM2MtNjk4Mi00N2MyLWI4MTQtMzU2MDI3ZjRlMjQ1IiwicyI6IllXSTVZbUppTjJRdFpqUXhPQzAwTW1Wa0xUaGhaVGN0WmpGallURmhaVGN3TUdVdyJ9"
)
CF_CUSTOM_DOMAIN = "cerebral.rapidwebdevelop.com"


def _tunnel_is_alive() -> bool:
    global _tunnel_proc
    if _tunnel_proc is None:
        return False
    if _tunnel_proc.poll() is not None:
        _tunnel_proc = None
        return False
    return True


def _read_tunnel_output():
    """Background thread: read stderr from cloudflared, extract random URL if issued."""
    global _tunnel_url
    import re as _re_t
    url_pat = _re_t.compile(r'(https://[a-zA-Z0-9\-\.]+\.trycloudflare\.com)')
    try:
        if _tunnel_proc and _tunnel_proc.stderr:
            for line in _tunnel_proc.stderr:
                line = line.strip()
                if line:
                    _tunnel_log.append(line)
                    if len(_tunnel_log) > 200:
                        _tunnel_log.pop(0)
                    m = url_pat.search(line)
                    if m and not _tunnel_url:
                        _tunnel_url = m.group(1)
    except Exception:
        pass


@app.route("/api/tunnel/status")
def tunnel_status():
    alive = _tunnel_is_alive()
    url = _tunnel_url or (f"https://{CF_CUSTOM_DOMAIN}" if alive else None)
    return jsonify({
        "running": alive,
        "provider": "cloudflare" if alive else None,
        "url": url,
        "customDomain": CF_CUSTOM_DOMAIN if alive else None,
        # pyre-ignore
        "log": _tunnel_log[-50:],
        "startedAt": _tunnel_started_at,
        "pid": _tunnel_proc.pid if (alive and _tunnel_proc) else None,
    })


@app.route("/api/tunnel/start", methods=["POST"])
def tunnel_start():
    global _tunnel_proc, _tunnel_url, _tunnel_log, _tunnel_started_at
    if _tunnel_is_alive():
        url = _tunnel_url or f"https://{CF_CUSTOM_DOMAIN}"
        return jsonify({
            "running": True, "provider": "cloudflare",
            "url": url, "customDomain": CF_CUSTOM_DOMAIN,
            # pyre-ignore
            "log": _tunnel_log[-50:], "startedAt": _tunnel_started_at,
            "pid": _tunnel_proc.pid if _tunnel_proc else None,
        })
    data = request.get_json(force=True) or {}
    custom_domain = data.get("customDomain") or CF_CUSTOM_DOMAIN
    _tunnel_log = []
    _tunnel_url = f"https://{custom_domain}"
    _tunnel_started_at = datetime.now(timezone.utc).isoformat()
    try:
        cf_exe = r"C:\Tools\cloudflared.exe"
        if not os.path.exists(cf_exe):
            cf_exe = "cloudflared"
        _tunnel_proc = subprocess.Popen(
            [cf_exe, "tunnel", "--no-autoupdate", "run", "--token", CF_TUNNEL_TOKEN],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
        )
        threading.Thread(target=_read_tunnel_output, daemon=True, name="tunnel-reader").start()
        return jsonify({
            "running": True, "provider": "cloudflare",
            "url": _tunnel_url, "customDomain": custom_domain,
            "log": [], "startedAt": _tunnel_started_at,
            "pid": _tunnel_proc.pid if _tunnel_proc else None,
        })
    except Exception as e:
        return jsonify({"running": False, "error": str(e)}), 500


@app.route("/api/tunnel/stop", methods=["POST"])
def tunnel_stop():
    global _tunnel_proc, _tunnel_url, _tunnel_started_at
    if _tunnel_proc and _tunnel_proc.poll() is None:
        try:
            _tunnel_proc.terminate()
            _tunnel_proc.wait(timeout=5)
        except Exception:
            try:
                _tunnel_proc.kill()
            except Exception:
                pass
    _tunnel_proc = None
    _tunnel_url = None
    _tunnel_started_at = None
    return jsonify({"running": False, "provider": None, "url": None,
                    "log": [], "startedAt": None, "pid": None, "customDomain": None})


@app.route("/api/tunnel/telegram", methods=["POST"])
def tunnel_telegram():
    bot_token = os.environ.get("TELEGRAM_CEREBRAL_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN_2")
    chat_id = os.environ.get("TELEGRAM_USER_ID")
    url = _tunnel_url or (f"https://{CF_CUSTOM_DOMAIN}" if _tunnel_is_alive() else None)
    if not bot_token or not chat_id:
        return jsonify({"ok": False, "error": "Telegram credentials not configured"}), 500
    if not url:
        return jsonify({"ok": False, "error": "Tunnel not running"}), 400
    try:
        msg = f"\U0001f9e0 Cerebral is live at: {url}"
        r = requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": msg},
            timeout=10,
        )
        return jsonify({"ok": r.status_code == 200, "status": r.status_code})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/ports")
def api_ports():
    """Return listening status for a set of monitored ports."""
    try:
        listening = set()
        for conn in psutil.net_connections(kind="inet"):
            if conn.status == "LISTEN" and conn.laddr:
                listening.add(conn.laddr.port)
        monitored = list(range(6000, 6021)) + [8765, 56995, 5173, 8787, 8080, 3001, 8001, 3000]
        result = [{"port": p, "online": p in listening} for p in monitored]
        return jsonify({"ports": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health")
def health_page():
    """Compatibility route for front-end/static site which expects /health
    on the daemon host. Returns a compact health summary similar to
    `/api/health` so the UI can fetch status without changing its code.
    """
    canonical_agent_lee = _probe_canonical_agent_lee()
    return jsonify({
        "daemon": "online",
        "foundry": foundry_alive,
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        "status": "online" if canonical_agent_lee["ok"] else "degraded",
        "agentLeeCanonical": canonical_agent_lee,
    })


# Kokoro voices (local ONNX) — add to voice picker alongside edge-tts voices
_KOKORO_VOICE_LIST = [
    {"id": "am_michael", "label": "Michael (Kokoro / American male)",   "engine": "kokoro"},
    {"id": "am_echo",    "label": "Echo (Kokoro / American male)",      "engine": "kokoro"},
    {"id": "am_eric",    "label": "Eric (Kokoro / American male)",      "engine": "kokoro"},
    {"id": "am_fenrir",  "label": "Fenrir (Kokoro / American male)",   "engine": "kokoro"},
    {"id": "am_onyx",    "label": "Onyx (Kokoro / American male)",     "engine": "kokoro"},
    {"id": "bm_daniel",  "label": "Daniel (Kokoro / British male)",   "engine": "kokoro"},
    {"id": "bm_fable",   "label": "Fable (Kokoro / British male)",    "engine": "kokoro"},
    {"id": "bm_george",  "label": "George (Kokoro / British male)",   "engine": "kokoro"},
]

@app.route('/api/tts/voices', methods=['GET'])
def get_voices():
    """Returns all available voices: local Kokoro (fast) + edge-tts (cloud fallback)."""
    edge_voices = [{**v, "engine": "edge-tts"} for v in list_voices()]
    return jsonify({
        "status": "success",
        "voices": _KOKORO_VOICE_LIST + edge_voices,
    })

@app.route('/api/tts/voice', methods=['POST'])
def set_voice():
    """Set active voice. Accepts both Kokoro IDs (am_michael) and edge-tts IDs."""
    data = request.json or {}
    voice_id = data.get("voice_id")
    if not voice_id:
        return jsonify({"error": "missing voice_id"}), 400

    all_ids = [v["id"] for v in _KOKORO_VOICE_LIST] + [v["id"] for v in list_voices()]
    if voice_id not in all_ids:
        return jsonify({"error": f"Voice '{voice_id}' not in allowlist."}), 400

    if not speech_agent:
        return jsonify({"error": "TTS engine not available."}), 503

    success = speech_agent.tts_worker.set_voice(voice_id)
    if success:
        log_event({"action": "set_voice", "voice_id": voice_id})
        return jsonify({"status": "success", "voice_id": voice_id})
    return jsonify({"error": "Failed to set voice."}), 500

@app.route('/api/tts/speed', methods=['POST'])
def set_tts_speed():
    """
    Adjust kokoro speech speed.
    POST {"speed": 1.15}  → 15% faster (default)
    Range: 0.5 (slow) to 2.0 (very fast). 1.1-1.2 sounds natural.
    """
    data = request.json or {}
    try:
        speed = float(data.get("speed", 1.15))
    except (TypeError, ValueError):
        return jsonify({"error": "speed must be a number"}), 400
    if not speech_agent:
        return jsonify({"error": "TTS engine not available."}), 503
    speech_agent.set_speed(speed)
    return jsonify({"status": "ok", "speed": speed})

@app.route('/speak', methods=['POST'])
@app.route('/api/chat/tts', methods=['POST'])
def speak():
    """
    Universal TTS endpoint — proxies to Desktop Runtime 8091 (canonical voice owner).
    Falls back to Piper / SAPI if Desktop Runtime is offline.
    Per AGENTS.md: Desktop Runtime owns mouth/speech output.
    """
    data = request.get_json(force=True) or {}
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "no text provided"}), 400

    _desktop_runtime_url = "http://127.0.0.1:8091"
    # Primary: Desktop Runtime 8091
    try:
        r = requests.post(
            f"{_desktop_runtime_url}/runtime/speak",
            json={
                "text": text,
                "confirm": "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND"
            },
            timeout=60,
        )
        try:
            res_json = r.json()
        except Exception:
            res_json = {}
        if r.ok and res_json.get("ok"):
            threading.Thread(
                target=log_event,
                args=({"action": "tts_invocation", "text_len": len(text), "backend": "desktop-runtime-8091"},),
                daemon=True,
            ).start()
            return jsonify({**res_json, "backend": "desktop-runtime-8091"}), 200
        else:
            print(f"[CerebralDaemon] /api/chat/tts desktop speak returned ok=False or status {r.status_code}")
    except requests.exceptions.ConnectionError:
        pass  # fall through to Piper
    except Exception as exc:
        print(f"[CerebralDaemon] /api/chat/tts Desktop Runtime error: {exc}")

    # Fallback 1: Piper speech agent
    try:
        if speech_agent:
            speech_agent.say(text)
            threading.Thread(
                target=log_event,
                args=({"action": "tts_invocation", "text_len": len(text), "backend": "piper_fallback"},),
                daemon=True,
            ).start()
            return jsonify({"status": "success", "backend": "piper_fallback"}), 200
    except Exception:
        pass

    # Fallback 2: Windows SAPI
    try:
        threading.Thread(target=_sapi_speak, args=(text,), daemon=True).start()
        log_event({"action": "tts_invocation", "text_len": len(text), "backend": "sapi_fallback"})
        return jsonify({"status": "success", "backend": "sapi_fallback"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/speak/test-file', methods=['GET'])
def speak_test_file():
    """Deprecated: reference WAV files are no longer used for TTS."""
    return jsonify({'info': 'PocketTTS is deprecated. Reference WAVs are no longer used.'})


@app.route('/api/tts/events')
def tts_events():
    """
    SSE endpoint — streams 'start' and 'stop' events when the TTS worker
    begins and ends audio playback. The frontend subscribes via EventSource
    and uses this to sync the speaking animation with real audio.
    """
    def _stream():
        while True:
            try:
                event = _tts_event_queue.get(timeout=25)
                yield f'data: {{"event":"{event}"}}\n\n'
            except Exception:
                # keep-alive ping so the connection stays open during silence
                yield 'data: {"event":"ping"}\n\n'
    return Response(
        stream_with_context(_stream()),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


@app.route('/api/user', methods=['GET', 'POST'])
def user_profile():
    """Get or set the operator's identity (name + derived ID)."""
    if request.method == 'GET':
        try:
            if os.path.exists(SETTINGS_PATH):
                with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
                    d = json.load(f)
                return jsonify({'name': d.get('user_name', ''), 'id': d.get('user_id', '')})
        except Exception:
            pass
        return jsonify({'name': '', 'id': ''})

    data = request.get_json(force=True) or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'name required'}), 400
    try:
        d: Dict[str, Any] = {}
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
                d = cast(Dict[str, Any], json.load(f))
        import hashlib
        d['user_name'] = name
        # pyre-ignore
        d['user_id']   = hashlib.sha256(name.lower().encode()).hexdigest()[:12]
        with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
            json.dump(d, f)
        # Greet the operator by speaking their name
        if speech_agent:
            threading.Thread(
                target=speech_agent.say,
                args=(f"Identity established. Welcome, {name}. The system is yours.",),
                daemon=True,
            ).start()
        return jsonify({'name': name, 'id': d['user_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/files/list')
def files_list():
    """List directory contents. ?path=C:\\some\\folder"""
    path = request.args.get('path') or os.path.expanduser('~')
    try:
        entries = []
        for item in os.scandir(path):
            try:
                stat = item.stat()
                entries.append({
                    'name': item.name,
                    'is_dir': item.is_dir(),
                    'size': stat.st_size if item.is_file() else 0,
                    'modified': stat.st_mtime,
                })
            except Exception:
                pass
        entries.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        return jsonify({'path': path, 'entries': entries})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/files/read')
def files_read():
    """Read a text file. ?path=C:\\some\\file.txt"""
    path = request.args.get('path', '')
    if not path:
        return jsonify({'error': 'no path provided'}), 400
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read(50000)  # cap at 50 KB
        return jsonify({'path': path, 'content': content, 'truncated': len(content) >= 50000})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/files/write', methods=['POST'])
def files_write():
    """Write (create or overwrite) a file."""
    data = request.get_json(force=True) or {}
    path    = data.get('path', '')
    content = data.get('content', '')
    if not path:
        return jsonify({'error': 'no path provided'}), 400
    try:
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'status': 'ok', 'path': path})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/files/open')
def files_open():
    """Open a file or folder with its default Windows application."""
    path = request.args.get('path', '')
    mode = request.args.get('mode', '')
    preview = request.args.get('preview', 'false').lower() == 'true'
    if not path:
        return jsonify({'error': 'no path provided'}), 400
    result = get_hands().open_path(path, mode=mode, preview=preview)
    status = 200 if result.get('ok') else 400
    return jsonify(result), status


@app.route('/api/files/search')
def files_search():
    """Recursively search for files matching a query string."""
    base  = request.args.get('path') or os.path.expanduser('~')
    query = request.args.get('query', '').lower()
    results = []
    try:
        skip = {'__pycache__', 'node_modules', '.git', '$Recycle.Bin'}
        for root, dirs, files in os.walk(base):
            # pyre-ignore
            dirs[:] = [d for d in dirs if d not in skip and not d.startswith('.')]
            for fname in files:
                if query in fname.lower():
                    results.append(os.path.join(root, fname))
            if len(results) >= 50:
                break
    except Exception:
        pass
    return jsonify({'results': results})


# ═══════════════════════════════════════════════════════════════════════════════
#  DIRECT ACTION ENDPOINTS — the 5 things Cerebral can always do
#  These bypass the LLM and call bridges directly, useful for frontend panels
#  and for the tool_router when it needs deterministic execution.
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/files/summarize')
def files_summarize():
    """Return a structured summary of a text file for LLM context or display."""
    path = request.args.get('path', '')
    if not path:
        return jsonify({'error': 'no path provided'}), 400
    result = summarise_file(path, max_chars=int(request.args.get('max_chars', 8000)))
    return jsonify(result)


@app.route('/api/files/compare')
def files_compare():
    """Produce a unified diff between two text files."""
    path_a = request.args.get('a', '')
    path_b = request.args.get('b', '')
    if not path_a or not path_b:
        return jsonify({'error': 'provide ?a=<path>&b=<path>'}), 400
    result = compare_files(path_a, path_b,
                           context_lines=int(request.args.get('context', 4)))
    return jsonify(result)


@app.route('/api/files/convert', methods=['POST'])
def files_convert():
    """
    Convert a file.  Body: { conversion, src, out_path?, allow_overwrite?, ...kwargs }
    High-risk (allow_overwrite=true) requires explicit caller intent.
    """
    data = request.get_json(force=True) or {}
    conversion = data.pop('conversion', '')
    src        = data.pop('src', '')
    out_path   = data.pop('out_path', None)
    allow_ow   = bool(data.pop('allow_overwrite', False))
    if not conversion or not src:
        return jsonify({'error': 'conversion and src are required'}), 400
    result = _convert_file(conversion, src, out_path=out_path,
                           allow_overwrite=allow_ow, **data)
    return jsonify(result)


@app.route('/api/repo-map', methods=['POST'])
def api_repo_map():
    """
    Build a repo map across one or more workspace roots.
    Body: { roots?: [str], out_dir?: str }
    This is a potentially slow operation; runs synchronously.
    """
    # pyre-ignore
    from body_state import WORKSPACE_ROOTS as _ROOTS
    data    = request.get_json(force=True) or {}
    roots   = data.get('roots', _ROOTS)
    out_dir = data.get('out_dir', roots[0] if roots else None)
    try:
        result = build_repo_map(roots, out_dir=out_dir)
        return jsonify({
            'ok':          True,
            'json_path':   result['json_path'],
            'md_path':     result['md_path'],
            'total_files': result['total_files'],
            'languages':   result['stats'],
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/desktop/open')
def desktop_open():
    """Open a file or folder path with its default Windows application."""
    path = request.args.get('path', '')
    mode = request.args.get('mode', '')
    preview = request.args.get('preview', 'false').lower() == 'true'
    if not path:
        return jsonify({'error': 'no path provided'}), 400
    result = get_hands().open_path(path, mode=mode, preview=preview)
    status = 200 if result.get('ok') else 400
    return jsonify(result), status


@app.route('/api/desktop/launch', methods=['POST'])
def desktop_launch():
    """Launch an application by friendly name or direct .exe path."""
    data   = request.get_json(force=True) or {}
    app_id = data.get('app_id', '')
    if not app_id:
        return jsonify({'error': 'app_id required'}), 400
    result = get_hands().launch_app(app_id)
    return jsonify(result)


@app.route('/api/desktop/windows')
def desktop_windows():
    """List all open window titles."""
    wins = get_hands().list_windows()
    return jsonify({'windows': [w.get('title') for w in wins]})


@app.route('/api/desktop/focus', methods=['POST'])
def desktop_focus():
    """Bring a window to the foreground by title fragment."""
    data = request.get_json(force=True) or {}
    title = data.get('title', '')
    if not title:
        return jsonify({'error': 'title required'}), 400
    result = get_hands().focus_window(title)
    return jsonify(result)


@app.route('/api/ptt', methods=['POST'])
def ptt():
    """Simple push-to-talk endpoint that accepts chunked audio uploads.

    Clients POST to `/api/ptt?session=<id>` and set header `X-PTT-Event` to
    one of: `start`, `chunk`, `stop`. `start` may contain JSON body. `chunk`
    should POST raw bytes (audio WebM/ogg) which will be appended server-side.
    `stop` marks completion. Files are stored in `tmp/ptt-<session>.webm`.
    """
    session = request.args.get('session')
    if not session:
        return jsonify({"error": "missing session"}), 400

    event = request.headers.get('X-PTT-Event', '').lower()
    tmpdir = os.path.join(os.path.dirname(__file__), 'tmp')
    try:
        os.makedirs(tmpdir, exist_ok=True)
    except Exception:
        pass

    filepath = os.path.join(tmpdir, f'ptt-{session}.webm')

    try:
        if event == 'start':
            # clear any existing file for this session
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception:
                pass
            # optionally accept JSON metadata
            return jsonify({"status": "started", "session": session}), 200

        if event == 'chunk':
            # append raw bytes to file
            try:
                with open(filepath, 'ab') as f:
                    f.write(request.get_data() or b'')
                return jsonify({"status": "chunk_received", "session": session}), 200
            except Exception as e:
                return jsonify({"error": str(e)}), 500

        if event == 'stop':
            if not os.path.exists(filepath):
                return jsonify({"status": "stopped", "session": session, "size": 0}), 200
            res = finalize_ptt_file(session, filepath)
            return jsonify(res), 200

        return jsonify({"error": "unknown event"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Tool-request keyword detector ────────────────────────────────────────────
import re as _re_kw

_VISION_KW = _re_kw.compile(
    r'\b(camera|webcam|see|look|wearing|wear|outfit|clothes|clothing|'
    r'background|behind me|in front|appear|face|hair|skin|shirt|pants|'
    r'what do you see|show me|can you see|what.?s there|who.?s there|'
    r'what am i|how do i look|color|colour|describe me|describe what you see|'
    r'look at me|check me out|what.?s on|holding|sitting|standing|surroundings|room)\b',
    _re_kw.IGNORECASE
)

_TOOL_KEYWORDS = {
    # filesystem
    "file", "folder", "directory", "list files", "read file", "write file",
    "open file", "save", "create file", "delete file", "summarize file",
    "find file", "search file", "compare file", "repo map",
    # desktop
    "launch", "start app", "open app", "focus window", "list windows",
    "screenshot", "convert file", "resize image", "resample audio",
    # act
    "click", "type", "press", "scroll", "drag", "move mouse",
    # terminal
    "run command", "run powercfg", "powercfg", "ipconfig", "tasklist",
    "set power", "power plan", "high performance", "open settings",
    "open control panel", "open task manager",
}

def _is_vision_request(msg: str) -> bool:
    return bool(_VISION_KW.search(msg))

def _needs_tools(msg: str) -> bool:
    """Return True if the message looks like an action request needing a tool."""
    if _is_vision_request(msg):
        return False  # vision handled separately
    low = msg.lower()
    # Check keyword set
    if any(kw in low for kw in _TOOL_KEYWORDS):
        return True
    # Also check regex pattern (catches 'click here', 'run powercfg', etc.)
    return bool(_TOOL_PATTERNS.search(msg))


def _llm_call(messages: list, max_tokens: int = 200, timeout: int = 60):
    """
    DEPRECATED — Shared LLM caller via Foundry Local.
    All chat now routes through Agent Lee Prime (Runtime Fabric 4001 → Router 8080 → Ollama 11434).
    This function is kept for backward compatibility with dead code paths (task_spine, etc.)
    but should NOT be called from new code.
    Returns (text, model_id) or (None, None).
    """
    try:
        r = requests.get(f"{CEREBRAL_FOUNDRY_BASE}/v1/models", timeout=2)
        models = [m.get('id') for m in r.json().get('data', [])] if r.status_code == 200 else MODEL_LIST
        if not models:
            models = MODEL_LIST
    except Exception:
        models = MODEL_LIST

    for model in models:
        try:
            resp = requests.post(
                f"{CEREBRAL_FOUNDRY_BASE.rstrip('/')}/v1/chat/completions",
                json={"model": model, "messages": messages, "max_tokens": max_tokens},
                timeout=timeout,
            )
            if resp.status_code == 200:
                rj = resp.json()
                text = None
                try:
                    text = rj["choices"][0]["message"]["content"]
                except Exception:
                    text = rj.get("response")
                if text:
                    return text, model
        except Exception:
            continue
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# UNIFIED AGENT LEE CHAT ADAPTER  POST /api/agent-lee/chat
#
# Common adapter contract used by all LeeWay apps.
# Routes through Runtime Fabric /agent-lee/chat so Cerebral and the IDE
# always share the same Agent Lee router brain without duplicating it here.
# ─────────────────────────────────────────────────────────────────────────────
_RUNTIME_FABRIC_URL = os.environ.get("LEEWAY_RUNTIME_FABRIC_URL", "http://127.0.0.1:4001")
CANONICAL_AGENT_LEE_FINGERPRINT = "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1"


def _read_identity_fingerprint(payload):
    if not isinstance(payload, dict):
        return None
    return (
        payload.get("identityFingerprint")
        or (payload.get("canonicalCodeMode") or {}).get("identityFingerprint")
        or (payload.get("canonicalAgentLee") or {}).get("identityFingerprint")
        or (payload.get("canonicalProof") or {}).get("expectedIdentityFingerprint")
    )


def _universe_visible(payload):
    if not isinstance(payload, dict):
        return False
    manifest = payload.get("manifest") or payload.get("universe") or ((payload.get("coreMap") or {}).get("universe") or {}).get("manifest")
    if not isinstance(manifest, dict):
        return False
    harness = manifest.get("statefulResearchHarness") or (payload.get("coreMap") or {}).get("statefulResearchHarnessCopies") or {}
    skills = manifest.get("searchPaths", {}).get("skills", []) or (payload.get("coreMap") or {}).get("activeSkillSearchPaths", [])
    capabilities = manifest.get("searchPaths", {}).get("capabilities", []) or (payload.get("coreMap") or {}).get("activeCapabilitySearchPaths", [])
    return bool(
        isinstance(harness, dict)
        and harness.get("activeCopy")
        and any("stateful-research-harness" in str(entry.get("absolute") if isinstance(entry, dict) else entry) for entry in skills)
        and any("capability-registry" in str(entry.get("absolute") if isinstance(entry, dict) else entry) for entry in capabilities)
    )


def _probe_canonical_agent_lee():
    try:
        identity_response = requests.get(f"{_RUNTIME_FABRIC_URL.rstrip('/')}/agent-lee/identity", timeout=5)
        identity = identity_response.json() if identity_response.content else {}
    except Exception as exc:
        return {
            "ok": False,
            "status": "NON_CANONICAL_AGENT_LEE_UNREACHABLE",
            "expectedFingerprint": CANONICAL_AGENT_LEE_FINGERPRINT,
            "fingerprint": None,
            "fingerprintMatches": False,
            "canonical": False,
            "agentMode": None,
            "role": None,
            "instanceContract": None,
            "universeVisible": False,
            "identityStatus": 0,
            "universeStatus": 0,
            "identity": {"error": str(exc)},
            "universe": {"error": str(exc)},
        }

    try:
        universe_response = requests.get(f"{_RUNTIME_FABRIC_URL.rstrip('/')}/agent-lee/universe", timeout=5)
        universe = universe_response.json() if universe_response.content else {}
    except Exception as exc:
        return {
            "ok": False,
            "status": "NON_CANONICAL_AGENT_LEE_UNREACHABLE",
            "expectedFingerprint": CANONICAL_AGENT_LEE_FINGERPRINT,
            "fingerprint": _read_identity_fingerprint(identity),
            "fingerprintMatches": _read_identity_fingerprint(identity) == CANONICAL_AGENT_LEE_FINGERPRINT,
            "canonical": bool(identity.get("canonical") if isinstance(identity, dict) else False),
            "agentMode": (identity.get("agent_mode") if isinstance(identity, dict) else None) or (identity.get("agentMode") if isinstance(identity, dict) else None),
            "role": identity.get("role") if isinstance(identity, dict) else None,
            "instanceContract": (identity.get("instance_contract") if isinstance(identity, dict) else None) or (identity.get("instanceContract") if isinstance(identity, dict) else None),
            "universeVisible": False,
            "identityStatus": getattr(identity_response, "status_code", 0),
            "universeStatus": 0,
            "identity": identity,
            "universe": {"error": str(exc)},
        }

    fingerprint = _read_identity_fingerprint(identity)
    canonical = bool(
        (identity.get("canonical") if isinstance(identity, dict) else False)
        or ((identity.get("canonicalCodeMode") or {}).get("canonical") if isinstance(identity, dict) else False)
        or ((identity.get("canonicalProof") or {}).get("canonical") if isinstance(identity, dict) else False)
    )
    agent_mode = (identity.get("agent_mode") if isinstance(identity, dict) else None) or (identity.get("agentMode") if isinstance(identity, dict) else None)
    role = identity.get("role") if isinstance(identity, dict) else None
    instance_contract = (identity.get("instance_contract") if isinstance(identity, dict) else None) or (identity.get("instanceContract") if isinstance(identity, dict) else None)
    universe_visible = _universe_visible(universe)
    ok = bool(
        getattr(identity_response, "ok", False)
        and getattr(universe_response, "ok", False)
        and canonical
        and fingerprint == CANONICAL_AGENT_LEE_FINGERPRINT
        and agent_mode == "code-mode"
        and role == "supreme-agent-lead"
        and instance_contract == "canonical-agent-lee-code-mode"
        and universe_visible
    )

    return {
        "ok": ok,
        "status": "CANONICAL_AGENT_LEE_CONFIRMED" if ok else "NON_CANONICAL_AGENT_LEE_DETECTED",
        "expectedFingerprint": CANONICAL_AGENT_LEE_FINGERPRINT,
        "fingerprint": fingerprint,
        "fingerprintMatches": fingerprint == CANONICAL_AGENT_LEE_FINGERPRINT,
        "canonical": canonical,
        "agentMode": agent_mode,
        "role": role,
        "instanceContract": instance_contract,
        "universeVisible": universe_visible,
        "identityStatus": getattr(identity_response, "status_code", 0),
        "universeStatus": getattr(universe_response, "status_code", 0),
        "identity": identity,
        "universe": universe,
    }

@app.route("/api/agent-lee/chat", methods=["POST"])
def agent_lee_chat():
    """
    Canonical Agent Lee Prime chat adapter.
    Routes: Cerebral UI → /api/agent-lee/chat (8765) → Runtime Fabric (4001)
            → Agent Lee Router (8080) → Ollama (11434) → qwen3/qwen2.5-coder

    sessionId and history from the UI are forwarded so conversation context
    is maintained across turns inside Agent Lee Prime's router brain.

    The canonical probe runs in soft-fail mode: if Runtime Fabric is offline
    or the probe fails, the request is forwarded anyway with a warning so the
    stack doesn't self-block when the identity endpoint is temporarily unavailable.
    """
    data = request.json or {}
    user_input = (data.get("input") or data.get("message") or "").strip()
    if not user_input:
        return jsonify({"ok": False, "error": "AGENT_LEE_CHAT_INPUT_REQUIRED", "message": "input field required"}), 400

    # Soft-fail canonical probe: log warning but don't block on 409
    try:
        canonical_agent_lee = _probe_canonical_agent_lee()
        if not canonical_agent_lee["ok"]:
            print(f"[CerebralDaemon] WARNING: Canonical probe returned non-ok status: "
                  f"{canonical_agent_lee.get('status')} — forwarding anyway (soft-fail mode)")
    except Exception as _probe_exc:
        print(f"[CerebralDaemon] WARNING: Canonical probe raised {_probe_exc} — forwarding anyway")

    # Forward sessionId from UI so Agent Lee Prime maintains conversation context
    session_id = (data.get("sessionId") or data.get("session_id") or "").strip() or None

    fabric_url = f"{_RUNTIME_FABRIC_URL.rstrip('/')}/agent-lee/chat"
    try:
        r = requests.post(
            fabric_url,
            json={
                "input":     user_input,
                "mode":      data.get("mode", "chat"),
                "speak":     bool(data.get("speak", False)),
                "tools":     data.get("tools", []),
                "history":   data.get("history", []),
                "context":   data.get("context", {}),
                "sessionId": session_id,
            },
            timeout=180,
        )
    except requests.exceptions.ConnectionError:
        return jsonify({
            "ok": False,
            "error": "LEEWAY_RUNTIME_FABRIC_4001_OFFLINE",
            "message": "Runtime Fabric is offline on :4001. Run start-leeway-local-agent-stack.ps1."
        }), 503
    except requests.exceptions.Timeout:
        return jsonify({
            "ok": False,
            "error": "AGENT_LEE_ROUTER_8080_TIMEOUT",
            "message": "Agent Lee router brain timed out. Ollama may be overloaded."
        }), 504

    try:
        result = r.json()
    except Exception:
        return jsonify({"ok": False, "error": "AGENT_LEE_INVALID_RESPONSE", "status": r.status_code}), 502

    return jsonify(result), r.status_code


def _proxy_desktop_runtime(path, payload=None, method="POST", timeout=600):
    url = f"http://127.0.0.1:8091{path}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        else:
            response = requests.post(url, json=payload or {}, timeout=timeout)
    except requests.exceptions.ConnectionError:
        return jsonify({
            "ok": False,
            "error": "AGENT_LEE_DESKTOP_RUNTIME_8091_OFFLINE",
            "message": f"Desktop runtime endpoint offline for {path}.",
            "path": path
        }), 503
    except requests.exceptions.Timeout:
        return jsonify({
            "ok": False,
            "error": "AGENT_LEE_DESKTOP_RUNTIME_TIMEOUT",
            "message": f"Desktop runtime endpoint timed out for {path}.",
            "path": path
        }), 504

    try:
        result = response.json()
    except Exception:
        result = {
            "ok": False,
            "error": "AGENT_LEE_INVALID_RESPONSE",
            "status": response.status_code,
            "raw": response.text
        }

    return jsonify(result), response.status_code


def _generic_proxy(target_base: str, subpath: str = ""):
    """Forward the incoming request to a target base URL + subpath and return the response.
    Used to provide compatibility proxy routes for the frontend (e.g. /brain/* -> 127.0.0.1:8080/*).
    """
    url = f"{target_base.rstrip('/')}/{subpath.lstrip('/')}" if subpath else target_base.rstrip('/')
    try:
        # Forward most request headers but avoid hop-by-hop headers
        headers = {k: v for k, v in request.headers.items() if k.lower() not in ('host', 'content-length', 'accept-encoding', 'connection')}
        method = (request.method or 'GET').upper()
        if method in ('GET', 'DELETE', 'OPTIONS'):
            resp = requests.request(method, url, params=request.args, headers=headers, timeout=15)
        else:
            # Try JSON body first, otherwise raw data
            json_payload = None
            try:
                json_payload = request.get_json(silent=True)
            except Exception:
                json_payload = None
            if json_payload is not None:
                resp = requests.request(method, url, json=json_payload, params=request.args, headers=headers, timeout=30)
            else:
                resp = requests.request(method, url, data=request.get_data(), params=request.args, headers=headers, timeout=30)
    except requests.exceptions.ConnectionError:
        return jsonify({"ok": False, "error": "TARGET_OFFLINE", "target": url}), 503
    except Exception as e:
        return jsonify({"ok": False, "error": "PROXY_ERROR", "message": str(e), "target": url}), 500

    # Build Flask response copying most headers that are safe to forward
    flask_resp = Response(resp.content, status=resp.status_code)
    for k, v in resp.headers.items():
        # Drop hop-by-hop headers per PEP-3333 / RFC7230
        if k.lower() in (
            'content-encoding', 'transfer-encoding', 'connection', 'content-length',
            'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'
        ):
            continue
        try:
            flask_resp.headers[k] = v
        except Exception:
            pass
    return flask_resp


@app.route('/brain', defaults={'subpath': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
@app.route('/brain/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_brain(subpath: str):
    return _generic_proxy('http://127.0.0.1:8080', subpath)


@app.route('/fabric', defaults={'subpath': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
@app.route('/fabric/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_fabric(subpath: str):
    return _generic_proxy('http://127.0.0.1:4001', subpath)


@app.route('/ollama', defaults={'subpath': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
@app.route('/ollama/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_ollama(subpath: str):
    return _generic_proxy('http://127.0.0.1:11434', subpath)


@app.route('/desktop', defaults={'subpath': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
@app.route('/desktop/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_desktop(subpath: str):
    return _generic_proxy('http://127.0.0.1:8091', subpath)


# Model registry endpoints — expose the curated updated-model-routes.json to the UI
@app.route('/api/models/registry', methods=['GET'])
def api_models_registry():
    try:
        data = load_registry()
        return jsonify(data)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/models/list', methods=['GET'])
def api_models_list():
    try:
        return jsonify({"ok": True, "models": as_simple_list()})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/launcher/start', methods=['POST'])
def api_launcher_start():
    """Start the LeeWay local stack via the Start-LeeWay-Local.ps1 script.
    Writes a receipt under Archive/receipts and returns the launched PID.
    """
    try:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        script = os.path.join(repo_root, 'Start-LeeWay-Local.ps1')
        if not os.path.exists(script):
            return jsonify({"ok": False, "error": "SCRIPT_NOT_FOUND", "path": script}), 400

        logs_dir = os.path.join(repo_root, 'logs', 'launcher')
        os.makedirs(logs_dir, exist_ok=True)
        stamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        stdout_log = os.path.join(logs_dir, f'launcher-{stamp}.stdout.log')
        stderr_log = os.path.join(logs_dir, f'launcher-{stamp}.stderr.log')

        data = request.get_json(force=True) or {}
        elevated = bool(data.get('elevated', True))

        out_fd = open(stdout_log, 'w', encoding='utf-8')
        err_fd = open(stderr_log, 'w', encoding='utf-8')

        if os.name == 'nt' and elevated:
            # Use Start-Process -Verb RunAs to request elevation (triggers UAC)
            ps_cmd = f'Start-Process -FilePath "powershell.exe" -ArgumentList \"-NoProfile -ExecutionPolicy Bypass -File \\\"{script}\\\"\" -Verb RunAs'
            proc = subprocess.Popen(['powershell.exe', '-NoProfile', '-Command', ps_cmd], stdout=out_fd, stderr=err_fd, cwd=repo_root)
        else:
            cmd = [
                'powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script
            ]
            proc = subprocess.Popen(cmd, stdout=out_fd, stderr=err_fd, cwd=repo_root)

        receipt_dir = os.path.join(repo_root, 'Archive', 'receipts')
        os.makedirs(receipt_dir, exist_ok=True)
        receipt = {
            'action': 'launcher.start',
            'script': script,
            'elevated': elevated,
            'startedAt': datetime.utcnow().isoformat(),
            'pid': proc.pid,
            'stdout': stdout_log,
            'stderr': stderr_log,
        }
        receipt_path = os.path.join(receipt_dir, f'launcher-start-{stamp}.json')
        with open(receipt_path, 'w', encoding='utf-8') as rf:
            json.dump(receipt, rf, indent=2)

        return jsonify({"ok": True, "pid": proc.pid, "receipt": receipt_path})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/runtime/vision/camera/status", methods=["GET"])
def runtime_vision_camera_status():
    return _proxy_desktop_runtime("/runtime/vision/camera/status", method="GET", timeout=15)


@app.route("/runtime/vision/camera/open", methods=["POST"])
def runtime_vision_camera_open():
    return _proxy_desktop_runtime("/runtime/vision/camera/open", payload=request.json or {}, timeout=180)


@app.route("/runtime/vision/camera/snapshot", methods=["POST"])
def runtime_vision_camera_snapshot():
    return _proxy_desktop_runtime("/runtime/vision/camera/snapshot", payload=request.json or {}, timeout=240)


@app.route("/runtime/vision/camera/analyze-snapshot", methods=["POST"])
def runtime_vision_camera_analyze_snapshot():
    return _proxy_desktop_runtime("/runtime/vision/camera/analyze-snapshot", payload=request.json or {}, timeout=600)


@app.route("/runtime/vision/camera/stop", methods=["POST"])
def runtime_vision_camera_stop():
    return _proxy_desktop_runtime("/runtime/vision/camera/stop", payload=request.json or {}, timeout=60)


@app.route("/runtime/vision/camera/look-now", methods=["POST"])
def runtime_vision_camera_look_now():
    return _proxy_desktop_runtime("/runtime/vision/camera/look-now", payload=request.json or {}, timeout=600)


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    REDIRECTED to Agent Lee Prime via /api/agent-lee/chat.

    The local Foundry/Phi-3.5 path has been decommissioned.
    All chat requests now route: Cerebral (8765) → Runtime Fabric (4001)
    → Agent Lee Router (8080) → Ollama (11434) → qwen3/qwen2.5-coder.

    This function translates the legacy {"message": "..."} payload format
    to the canonical {"input": "..."} format so old callers are not broken.
    """
    data = request.json or {}
    message = (data.get("message") or data.get("input") or "").strip()
    if not message:
        return jsonify({"error": "no message"}), 400

    # Build a canonical /api/agent-lee/chat payload and forward
    fabric_payload = {
        "input":     message,
        "mode":      data.get("mode", "chat"),
        "speak":     bool(data.get("speak", False)),
        "tools":     data.get("tools", []),
        "history":   data.get("history", []),
        "context":   data.get("context", {}),
        "sessionId": (data.get("sessionId") or data.get("session_id") or "").strip() or None,
    }

    fabric_url = f"{_RUNTIME_FABRIC_URL.rstrip('/')}/agent-lee/chat"
    try:
        r = requests.post(fabric_url, json=fabric_payload, timeout=180)
    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "LEEWAY_RUNTIME_FABRIC_4001_OFFLINE",
            "message": "Runtime Fabric is offline on :4001. Run start-leeway-local-agent-stack.ps1.",
            "choices": [{"message": {"role": "assistant", "content": "Agent Lee is offline. Please start the Leeway stack."}}],
        }), 503
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "AGENT_LEE_ROUTER_8080_TIMEOUT",
            "message": "Agent Lee router brain timed out.",
            "choices": [{"message": {"role": "assistant", "content": "Agent Lee timed out. Ollama may be busy."}}],
        }), 504

    try:
        result = r.json()
    except Exception:
        return jsonify({"error": "AGENT_LEE_INVALID_RESPONSE", "status": r.status_code}), 502

    # Normalise response to old {choices:[{message:{content:...}}]} shape
    # so legacy callers (old frontend code) still work
    if result.get("response") and "choices" not in result:
        result["choices"] = [{"message": {"role": "assistant", "content": result["response"]}}]

    # TTS — fire if the response contains a speak flag or tts_enabled
    _speak_text = (result.get("response") or "").strip()
    if _speak_text and (result.get("speak") or tts_enabled):
        threading.Thread(target=speak_text, args=(_speak_text,), daemon=True).start()

    return jsonify(result), r.status_code



    # ── Persona reminder every 5 messages ─────────────────────────────────────
    _persona_add = ""
    try:
        with open('memory.json', 'r', encoding='utf-8') as _mf:
            _mem = json.load(_mf)
        if sum(1 for m in _mem if 'user' in m) % 5 == 0:
            _persona_add = '\n\n' + CEREBRAL_PERSONA_REMINDER
    except Exception:
        pass

    # ── Base system prompt (short — always used) ───────────────────────────────
    _base_sys = CEREBRAL_SYSTEM_PROMPT
    if _user_name:
        _base_sys += f'\n\nThe operator is {_user_name}. Address them by name naturally.'
    _base_sys += _persona_add

    speak_content = None
    route_result  = {"mode": "TALK", "tool_results": [], "policy_blocked": None}
    model_used    = None

    # ── Classify intent via Task Spine (fast, no LLM call) ────────────────────
    _intent = classify_intent(message) if _SPINE_OK else Intent.CHAT

    # ══════════════════════════════════════════════════════════════════════════
    # PLAN PATH — multi-step tasks via Task Execution Spine
    # generate_plan → policy check → execute steps → pre/post proofs → memory log
    # ══════════════════════════════════════════════════════════════════════════
    if _intent == Intent.PLAN and _SPINE_OK:
        try:
            spine = run_spine(
                message,
                user_name=_user_name,
                body_state=get_body_state(),
                on_approve=None,   # approval not pre-granted via chat endpoint
            )
            speak_content = spine.speak
            route_result  = {
                "mode":           "PLAN",
                "intent":         spine.intent,
                "success":        spine.success,
                "steps":          [
                    {"id": s.step_id, "tool": s.tool, "ok": s.ok,
                     "policy": s.policy, "desc": s.desc}
                    for s in spine.steps
                ],
                "proofs":         [os.path.basename(p) for p in spine.proofs],
                "approval_needed": spine.approval_needed,
                "blocked_by_policy": spine.blocked_by_policy,
                "plan_goal":      (spine.plan or {}).get("goal", ""),
                "tool_results":   [],
                "policy_blocked": spine.blocked_by_policy,
            }
        except Exception as _se:
            speak_content = f"Task spine error: {_se}"
            route_result["mode"] = "PLAN_ERROR"

    # ══════════════════════════════════════════════════════════════════════════
    # VISION PATH — capture camera, analyse colour, answer with context
    # One fast LLM call — no tool contract, no JSON needed
    # ══════════════════════════════════════════════════════════════════════════
    elif _is_vision_request(message):
        vision_ctx = ""
        if _VISION_OK and _capture_vision:
            _vr = _capture_vision(camera_index=-1)  # auto-detect best camera
            if _vr.get("ok"):
                cam_idx = _vr.get('camera_index', 'auto')
                vision_ctx = (
                    f"[LIVE CAMERA {cam_idx} — {_vr.get('width','?')}x{_vr.get('height','?')}px] "
                    f"{_vr['description']}"
                )
            else:
                vision_ctx = f"[CAMERA ERROR] {_vr.get('error', 'unavailable')}"
        else:
            vision_ctx = "[CAMERA] Vision module unavailable."

        # Build a specific prompt based on what the user asked about
        _msg_low = message.lower()
        if any(w in _msg_low for w in ["wearing", "wear", "outfit", "clothes", "shirt", "pants"]):
            _vision_focus = "Focus your answer on what the person appears to be wearing — colours and clothing types visible."
        elif any(w in _msg_low for w in ["background", "behind", "room", "surroundings"]):
            _vision_focus = "Focus your answer on the background and environment visible behind the person."
        elif any(w in _msg_low for w in ["face", "look", "how do i look"]):
            _vision_focus = "Describe the person's appearance focusing on face visibility and overall look."
        else:
            _vision_focus = "Describe what the camera sees naturally and directly."

        _vision_sys = (
            _base_sys
            + f"\n\n{vision_ctx}"
            + f"\n\n{_vision_focus} Answer in 1-3 conversational sentences. "
              "Do NOT output JSON. Speak plainly as if describing what you see."
        )
        llm_text, model_used = _llm_call(
            [{"role": "system", "content": _vision_sys},
             {"role": "user",   "content": message}],
            max_tokens=180, timeout=60,
        )
        speak_content = (llm_text or "").strip() or vision_ctx
        # Strip any accidental JSON
        _t = speak_content
        if _t.startswith("{") or _t.startswith("`"):
            try:
                _clean = _re.sub(r'^```[a-z]*\n?', '', _t).rstrip('`').strip()
                _plan  = json.loads(_clean)
                speak_content = (
                    (_plan.get('speak') or {}).get('immediate')
                    or (_plan.get('speak') or {}).get('final')
                    or speak_content
                )
            except Exception:
                speak_content = _re.sub(r'\{[\s\S]*?\}', '', _t).strip() or speak_content
        route_result["mode"] = "VISION"

    # ══════════════════════════════════════════════════════════════════════════
    # TOOL PATH — keyword-gated, injects full contract, parses JSON response
    # ══════════════════════════════════════════════════════════════════════════
    elif _needs_tools(message):
        body       = get_body_state()
        body_block = build_body_state_block(body)

        _tool_sys = (
            _base_sys
            + f"\n\n{body_block}"
            + "\n\nIMPORTANT: Respond ONLY with a JSON object. No prose before or after."
            + "\n" + TOOL_CONTRACT_BLOCK
        )

        llm_text, model_used = _llm_call(
            [{"role": "system", "content": _tool_sys}, {"role": "user", "content": message}],
            max_tokens=400, timeout=120,
        )

        if not llm_text:
            llm_text = '{"mode":"TALK","speak":{"immediate":"The reasoning engine is offline."}}'

        # Parse + execute tools
        try:
            route_result = _tool_route(llm_text, body)
        except Exception:
            route_result = {"mode": "TALK", "speak_final": llm_text, "speak_immediate": "", "tool_results": [], "policy_blocked": None}

        speak_content = route_result.get("speak_final") or route_result.get("speak_immediate") or ""

        # Strip any residual raw JSON from speak content
        # pyre-ignore
        _sc = (speak_content or "").strip()
        if _sc.startswith("{") or _sc.startswith("`"):
            try:
                _clean = _re.sub(r"^```[a-z]*\n?", "", _sc).rstrip("`").strip()
                _plan = json.loads(_clean)
                if isinstance(_plan, dict):
                    # pyre-ignore
                    _spk = _plan.get("speak")
                    if isinstance(_spk, dict):
                        speak_content = _spk.get("final") or _spk.get("immediate") or speak_content
                elif isinstance(_plan, str):
                    speak_content = _plan
            except Exception:
                # pyre-ignore
                speak_content = _re.sub(r'\{[\s\S]*\}', '', _sc).strip() or speak_content

        # After tool execution: compose natural language from results without a second LLM call
        _tool_results: List[Dict[str, Any]] = cast(List[Dict[str, Any]], route_result.get("tool_results", []))
        if _tool_results:
            _parts: List[str] = []
            for _tr in _tool_results:
                if not isinstance(_tr, dict):
                    continue
                if not _tr.get("ok"):
                    _parts.append(f"Error: {str(_tr.get('error', 'unknown'))}")
                elif _tr.get("description"):           # camera capture, etc.
                    _parts.append(str(_tr["description"]))
                elif _tr.get("entries") is not None:   # directory listing
                    _entries = _tr.get("entries")
                    if isinstance(_entries, list):
                        n = len(_entries)
                        _parts.append(f"{n} items found.")
                elif _tr.get("content"):               # file read
                    _parts.append(f"File content: {str(_tr['content'])[:200]}")
                elif _tr.get("path"):                  # write/open
                    _parts.append(f"Done. Path: {str(_tr['path'])}")
                elif _tr.get("results") is not None:   # search
                    _results = _tr.get("results")
                    if isinstance(_results, list):
                        n = len(_results)
                        _parts.append(f"{n} results found.")
            if _parts:
                _inline = " ".join(_parts)
                # pyre-ignore
                if isinstance(speak_content, str):
                    speak_content = (speak_content.rstrip(".") + ". " + _inline).strip() if speak_content else _inline
                else:
                    speak_content = _inline

        if not speak_content:
            speak_content = "I have processed your request."

    # ══════════════════════════════════════════════════════════════════════════
    # FAST PATH — plain conversation, short prompt, natural language only
    # ══════════════════════════════════════════════════════════════════════════
    else:
        _fast_sys = _base_sys + "\n\nRespond in plain natural language only. No JSON. No code blocks. 2-5 lines maximum."

        llm_text, model_used = _llm_call(
            [{"role": "system", "content": _fast_sys}, {"role": "user", "content": message}],
            max_tokens=150, timeout=60,
        )

        if not llm_text:
            speak_content = "The reasoning engine is offline. I am maintaining system watch in diagnostics mode."
        else:
            # Strip any accidental JSON that still crept through
            _t = llm_text.strip()
            if _t.startswith("{") or _t.startswith("`"):
                try:
                    _clean = _re.sub(r"^```[a-z]*\n?", "", _t).rstrip("`").strip()
                    _plan  = json.loads(_clean)
                    speak_content = (
                        (_plan.get("speak") or {}).get("immediate")
                        or (_plan.get("speak") or {}).get("final")
                        or llm_text
                    )
                except Exception:
                    speak_content = _re.sub(r'\{[\s\S]*?\}', '', _t).strip() or llm_text
            else:
                speak_content = llm_text

    # ── Memory + TTS ───────────────────────────────────────────────────────────
    append_memory({"assistant": speak_content})
    if tts_enabled:
        threading.Thread(target=speak_text, args=(speak_content,), daemon=True).start()

    return jsonify({
        "choices": [{"message": {"role": "assistant", "content": speak_content}}],
        "tool_mode":      route_result.get("mode", "TALK"),
        "tool_results":   route_result.get("tool_results", []),
        "policy_blocked": route_result.get("policy_blocked"),
        "model_used":     model_used,
    })


@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    """
    REDIRECTED — streams Agent Lee Prime response as a single SSE chunk.

    The local Foundry streaming path has been decommissioned.
    Agent Lee Prime's router handles streaming internally.
    Cerebral emits the complete response as one SSE delta so the UI
    streaming handler still works without requiring server-sent events
    from Ollama to pass through Cerebral.
    """
    data = request.json or {}
    message = (data.get("message") or data.get("input") or "").strip()
    if not message:
        return jsonify({"error": "no message"}), 400

    session_id = (data.get("sessionId") or data.get("session_id") or "").strip() or None

    def generate_agent_lee_sse():
        fabric_url = f"{_RUNTIME_FABRIC_URL.rstrip('/')}/agent-lee/chat"
        try:
            r = requests.post(
                fabric_url,
                json={
                    "input":     message,
                    "mode":      data.get("mode", "chat"),
                    "speak":     bool(data.get("speak", False)),
                    "history":   data.get("history", []),
                    "sessionId": session_id,
                },
                timeout=180,
            )
            result = r.json()
            response_text = result.get("response") or ""
        except requests.exceptions.ConnectionError:
            response_text = "Agent Lee is offline. Please start the Leeway Runtime Fabric stack."
        except requests.exceptions.Timeout:
            response_text = "Agent Lee timed out. Ollama may be busy."
        except Exception as exc:
            response_text = f"Agent Lee error: {exc}"

        if response_text and tts_enabled:
            threading.Thread(target=speak_text, args=(response_text,), daemon=True).start()

        payload = json.dumps({"choices": [{"delta": {"content": response_text}}]})
        yield f"data: {payload}\n\n"
        yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate_agent_lee_sse()), content_type="text/event-stream")

    # ── User name / persona extras ────────────────────────────────────────────
    try:
        _sd = json.load(open(SETTINGS_PATH, encoding='utf-8')) if os.path.exists(SETTINGS_PATH) else {}
        _uname = _sd.get('user_name', '')
    except Exception:
        _uname = ''
    _base = CEREBRAL_SYSTEM_PROMPT
    if _uname:
        _base += f'\n\nThe operator is {_uname}. Address them by name naturally.'
    try:
        with open('memory.json', 'r', encoding='utf-8') as _mf2:
            _mem2 = json.load(_mf2)
        if sum(1 for m in _mem2 if 'user' in m) % 5 == 0:
            _base += '\n\n' + CEREBRAL_PERSONA_REMINDER
    except Exception:
        pass

    # ══════════════════════════════════════════════════════════════════════════
    # TOOL PATH: run synchronously, emit one clean text SSE chunk, no JSON leak
    # ══════════════════════════════════════════════════════════════════════════
    if _needs_tools(message):
        def generate_tool():
            body       = get_body_state()
            body_block = build_body_state_block(body)
            tool_sys   = (_base
                          + f"\n\n{body_block}"
                          + "\n\nIMPORTANT: Respond ONLY with a JSON object. No prose before or after."
                          + "\n" + TOOL_CONTRACT_BLOCK)

            llm_text, _ = _llm_call(
                [{"role": "system", "content": tool_sys}, {"role": "user", "content": message}],
                max_tokens=400, timeout=120,
            )
            if not llm_text:
                llm_text = '{"mode":"TALK","speak":{"immediate":"The reasoning engine is offline."}}'

            try:
                route_result = _tool_route(llm_text, body)
            except Exception:
                route_result = {"mode": "TALK", "speak_final": llm_text, "speak_immediate": "", "tool_results": [], "policy_blocked": None}

            speak_content = route_result.get("speak_final") or route_result.get("speak_immediate") or ""

            # Strip any raw JSON from speak
            _sc = (speak_content or "").strip()
            if _sc.startswith("{") or _sc.startswith("`"):
                try:
                    _fc = _re.sub(r"^```[a-z]*\n?", "", _sc).rstrip("`").strip()
                    _fp = json.loads(_fc)
                    speak_content = ((_fp.get("speak") or {}).get("final")
                                     or (_fp.get("speak") or {}).get("immediate")
                                     or speak_content)
                except Exception:
                    speak_content = _re.sub(r'\{[\s\S]*\}', '', _sc).strip() or speak_content

            # Compose tool result descriptions inline
            _trs = route_result.get("tool_results", [])
            if _trs:
                _parts = []
                for _tr in _trs:
                    if not _tr.get("ok"):
                        _parts.append(f"Error: {_tr.get('error', 'unknown')}")
                    elif _tr.get("description"):
                        _parts.append(_tr["description"])
                    elif _tr.get("entries") is not None:
                        _parts.append(f"{len(_tr['entries'])} items found.")
                    elif _tr.get("content"):
                        _parts.append(str(_tr["content"])[:200])
                    elif _tr.get("path"):
                        _parts.append(f"Done. {_tr['path']}")
                    elif _tr.get("results") is not None:
                        _parts.append(f"{len(_tr['results'])} results found.")
                if _parts:
                    _inline = " ".join(_parts)
                    speak_content = ((speak_content.rstrip(".") + ". " + _inline).strip()
                                     if speak_content else _inline)

            speak_content = speak_content or "I have processed your request."
            append_memory({"assistant": speak_content})
            if tts_enabled:
                threading.Thread(target=speak_text, args=(speak_content,), daemon=True).start()

            # Emit as a single SSE delta chunk
            payload = json.dumps({"choices": [{"delta": {"content": speak_content}}]})
            yield f"data: {payload}\n\n"
            yield "data: [DONE]\n\n"

        return Response(stream_with_context(generate_tool()), content_type="text/event-stream")

    # ══════════════════════════════════════════════════════════════════════════
    # FAST PATH: stream tokens live, no tool contract
    # ══════════════════════════════════════════════════════════════════════════
    try:
        r = requests.get(f"{CEREBRAL_FOUNDRY_BASE}/v1/models", timeout=2)
        models = [m.get("id") for m in r.json().get("data", [])] if r.status_code == 200 else MODEL_LIST
        if not models:
            models = MODEL_LIST
    except Exception:
        models = MODEL_LIST

    fast_sys = CEREBRAL_FAST_PROMPT + (f"\nThe operator is {_uname}." if _uname else "")

    def generate():
        full_tokens = []
        succeeded   = False
        _live_buf   = []   # tokens since last sentence boundary
        _tts_fired  = False

        for model in models:
            try:
                foundry_url = f"{CEREBRAL_FOUNDRY_BASE.rstrip('/')}/v1/chat/completions"
                with requests.post(
                    foundry_url,
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": fast_sys},
                            {"role": "user",   "content": message},
                        ],
                        "max_tokens": 150,
                        "stream": True,
                    },
                    stream=True,
                    timeout=90,
                ) as resp:
                    if resp.status_code != 200:
                        continue
                    for raw_line in resp.iter_lines():
                        if not raw_line:
                            continue
                        line = raw_line.decode("utf-8", errors="replace")
                        yield f"{line}\n\n"
                        if line.startswith("data: ") and "[DONE]" not in line:
                            try:
                                chunk = json.loads(line[6:])
                                token = chunk["choices"][0]["delta"].get("content", "")
                                if token:
                                    # pyre-ignore
                                    full_tokens.append(token)
                                    # ── Live sentence-by-sentence TTS ──────────────
                                    if tts_enabled and speech_agent:
                                        _live_buf.append(token)
                                        _cur = "".join(_live_buf)
                                        _sm = _re.search(r'[.!?][\s]', _cur)
                                        if _sm:
                                            _sent = _cur[:_sm.end()].strip()
                                            if len(_sent) > 4:
                                                speech_agent.say(_sent)
                                                _tts_fired = True
                                            _live_buf = [_cur[_sm.end():]]
                            except Exception:
                                pass
                    succeeded = True
                    break
            except Exception:
                continue

        if not succeeded:
            mock = "The reasoning engine is offline. I am maintaining system watch in diagnostics mode."
            yield f'data: {{"choices":[{{"delta":{{"content":{json.dumps(mock)}}}}}]}}\n\n'
            yield "data: [DONE]\n\n"
            full_tokens = [mock]

        if full_tokens:
            full_text = "".join(full_tokens)
            # Strip accidental JSON from natural chat response
            _ft = full_text.strip()
            if _ft.startswith("{") or _ft.startswith("`"):
                try:
                    _fc = _re.sub(r"^```[a-z]*\n?", "", _ft).rstrip("`").strip()
                    _fp = json.loads(_fc)
                    full_text = ((_fp.get("speak") or {}).get("immediate")
                                 or (_fp.get("speak") or {}).get("final") or full_text)
                except Exception:
                    full_text = _re.sub(r'\{[\s\S]*?\}', '', _ft).strip() or full_text
            append_memory({"assistant": full_text})
            # Speak tail (last incomplete sentence) or full text if no boundary hit
            _tail = "".join(_live_buf).strip()
            if tts_enabled:
                if _tail and len(_tail) > 3:
                    threading.Thread(target=speak_text, args=(_tail,), daemon=True).start()
                elif not _tts_fired:
                    # Short response with no sentence boundary — speak all at once
                    threading.Thread(target=speak_text, args=(full_text,), daemon=True).start()

    return Response(stream_with_context(generate()), content_type="text/event-stream")


@app.route("/api/analyze_file", methods=["POST"])
def analyze_file_route():
    data = request.json or {}
    path = data.get("path")
    if not path:
        return jsonify({"error": "missing path"}), 400

    result = analyze_file(path)
    return jsonify(result)


@app.route("/api/list_large_files", methods=["POST"])
def list_large_files_route():
    data = request.json or {}
    root = data.get("root", "C:\\")
    min_mb = data.get("min_mb", 1000)
    files = list_large_files(root, min_mb=min_mb)
    return jsonify({"large_files": files})


@app.route("/api/move_file", methods=["POST"])
def move_file_route():
    data = request.json or {}
    src = data.get("source")
    dst = data.get("destination")
    if not src or not dst:
        return jsonify({"error": "missing source or destination"}), 400

    size_mb = 0
    try:
        if src:
            size_mb = os.path.getsize(src) / (1024 * 1024)
    except Exception:
        pass

    if size_mb > 1000 or requires_approval("move_large_file"):
        return jsonify({"approval_required": True, "reason": "Large file redistribution"})

    try:
        res = move_file(src, dst)
        log_event({"action": "move_file", "from": src, "to": dst})
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/collaborate", methods=["POST"])
def collaborate():
    data = request.json or {}
    task = data.get("task")
    payload = data.get("payload")
    log_event({"event": "collaborate", "task": task, "payload": payload})
    return jsonify({"status": "received", "task": task})


@app.route("/api/briefing", methods=["POST"])
def briefing():
    # pyre-ignore
    from briefing_engine import collect_system_snapshot, generate_briefing
    snapshot = collect_system_snapshot()
    report = generate_briefing(snapshot)
    log_event({"event": "daily_briefing_generated"})
    return jsonify({"report": report})


@app.route("/api/agents", methods=["GET"])
def agents_list():
    """List all registered agents and their tools."""
    result = []
    for name, cls in AGENT_REGISTRY.items():
        ag = cls()
        result.append({"name": ag.name, "description": ag.description, "tools": ag.tools})
    return jsonify({"ok": True, "agents": result, "count": len(result)})


@app.route("/api/agents/run", methods=["POST"])
def agents_run():
    """
    Run a tool on a named agent.
    Body: { "agent": "sentinel", "tool": "health_snapshot", "args": {}, "approve": false }
    """
    data   = request.json or {}
    agent  = data.get("agent", "").strip()
    tool   = data.get("tool", "").strip()
    args   = data.get("args", {})
    approve = bool(data.get("approve", False))
    parent_session_id = (data.get("parent_session_id") or "").strip() or None
    goal = (data.get("goal") or f"Run agent {agent}.{tool}").strip()
    if not agent or not tool:
        return jsonify({"ok": False, "error": "agent and tool required"}), 400
    try:
        ag  = _get_agent(agent)
        res = invoke_agent_tool(
            agent_name=agent,
            tool_name=tool,
            args=args if isinstance(args, dict) else {},
            goal=goal,
            runner=lambda: ag.run(tool, args if isinstance(args, dict) else {}),
            approved=approve,
            parent_session_id=parent_session_id,
        )
        if res.get("needs_approval") or res.get("denied"):
            return jsonify(res), 403
        if not res.get("ok", False):
            return jsonify(res), 500
        return jsonify(res)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


def _health_logger_loop():
    """Background thread: write a health snapshot to logs/health.ndjson every 30s."""
    # pyre-ignore
    import psutil as _ps, json as _json
    log_path = os.path.join(os.path.dirname(__file__), "logs", "health.ndjson")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    while True:
        try:
            cpu   = _ps.cpu_percent(interval=1)
            ram   = _ps.virtual_memory()
            disk  = _ps.disk_usage("C:\\")
            entry = {
                "ts":          datetime.now(timezone.utc).isoformat() + "Z",
                "cpu_percent": cpu,
                "ram_percent": ram.percent,
                "ram_used_gb": round(ram.used / 1e9, 2),
                "disk_free_gb": round(disk.free / 1e9, 1),
                "disk_percent": disk.percent,
            }
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(_json.dumps(entry) + "\n")
        except Exception:
            pass
        time.sleep(30)


# ══════════════════════════════════════════════════════════════════════════════
# Task Execution Spine endpoints
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/task", methods=["POST"])
def task_run():
    """
    Explicit multi-step task execution via the Task Spine.
    Always goes through: classify → plan → policy → execute → verify → memory log.

    Body: { "message": "Open Telegram, find Mike, type hello", "approve_all": false }
    Returns full SpineResult including step-by-step proofs.
    """
    if not _SPINE_OK:
        return jsonify({"ok": False, "error": "task_spine not loaded"}), 503

    data        = request.json or {}
    message     = (data.get("message") or "").strip()
    approve_all = bool(data.get("approve_all", False))

    if not message:
        return jsonify({"ok": False, "error": "message required"}), 400

    try:
        _sett     = json.load(open(SETTINGS_PATH, encoding="utf-8")) if os.path.exists(SETTINGS_PATH) else {}
    except Exception:
        _sett = {}
    user_name = _sett.get("user_name", "")

    # on_approve: if approve_all flag, auto-confirm everything
    on_approve = (lambda tool, args: True) if approve_all else None

    append_memory({"user": message})

    spine = run_spine(
        message,
        user_name=user_name,
        body_state=get_body_state(),
        on_approve=on_approve,
    )

    result_dict = spine_result_to_dict(spine)
    speak       = spine.speak

    # Handle pass-through signals (VISION/CHAT/TOOL — let /api/chat handle those)
    if speak in ("__VISION__", "__CHAT__", "__TOOL__"):
        result_dict["redirect"] = "/api/chat"
        result_dict["speak"]    = "Use /api/chat for this request type."
        return jsonify(result_dict)

    append_memory({"assistant": speak})
    if tts_enabled:
        threading.Thread(target=speak_text, args=(speak,), daemon=True).start()

    result_dict["speak"] = speak
    return jsonify(result_dict)


@app.route("/api/task/plan", methods=["POST"])
def task_plan_preview():
    """
    Preview the plan for a message WITHOUT executing it.
    Body: { "message": "..." }
    Returns: { "ok": bool, "intent": "...", "plan": {...} }
    """
    if not _SPINE_OK:
        return jsonify({"ok": False, "error": "task_spine not loaded"}), 503

    data    = request.json or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"ok": False, "error": "message required"}), 400

    intent = classify_intent(message)

    if intent != Intent.PLAN:
        return jsonify({
            "ok":     True,
            "intent": intent,
            "plan":   None,
            "note":   f"This is classified as '{intent}' — no multi-step plan needed.",
        })

    plan = generate_plan(message)
    valid, reason = validate_plan(plan)

    # Attach policy tier to each step
    for step in plan.get("steps", []):
        pc = _policy_check(step.get("tool", ""), step.get("args", {}), plan.get("goal", ""))
        step["policy_tier"]    = pc["tier"]
        step["needs_approval"] = pc["needs_approval"]
        step["denied"]         = pc["denied"]

    return jsonify({
        "ok":     valid,
        "intent": intent,
        "plan":   plan,
        "valid":  valid,
        "reason": reason if not valid else "ok",
    })


@app.route("/api/desktop/proof", methods=["GET"])
def desktop_proof():
    """
    Package current desktop state into a proof bundle:
      - screenshot
      - active window title
      - list of open windows
    Useful for verifying what's on screen after any action.
    """
    hands = get_hands()
    proof = {}

    # Screenshot
    ss = hands.screenshot_proof(label="proof")
    proof["screenshot"] = ss.get("path") if ss.get("ok") else None
    proof["screenshot_ok"] = ss.get("ok", False)

    # Active window
    try:
        # pyre-ignore
        import win32gui
        hwnd = win32gui.GetForegroundWindow()
        proof["active_window"] = win32gui.GetWindowText(hwnd)
    except Exception:
        proof["active_window"] = "unknown"

    # Open windows
    try:
        wins = hands.list_windows()
        proof["open_windows"] = [w.get("title") for w in wins]
    except Exception:
        proof["open_windows"] = []

    proof["ts"] = datetime.now(timezone.utc).isoformat() + "Z"
    proof["ok"] = True
    return jsonify(proof)


@app.route("/api/spine/status", methods=["GET"])
def spine_status():
    """Return Task Spine load state and capabilities."""
    return jsonify({
        "spine_ok":   _SPINE_OK,
        "policy_ok":  True,
        "planner_ok": True,
        "intent_classes": ["chat", "tool", "plan", "vision"],
        "max_retries": 1,
        "proof_dir":  os.path.join(os.path.dirname(__file__), "tmp"),
    })


@app.route("/api/runtime/bridge", methods=["GET"])
def runtime_bridge_status():
    """Return recent runtime bridge events, progress, sessions, and projections."""
    try:
        limit = int(request.args.get("limit", 30))
    except Exception:
        limit = 30

    return jsonify(_runtime_bridge_snapshot(limit=limit))


@app.route("/api/runtime/artifacts/<path:filename>", methods=["GET"])
def runtime_bridge_artifact(filename: str):
    """Serve proof artifacts from tmp/ for operator review."""
    safe_name = os.path.basename((filename or "").strip())
    if not safe_name:
        return jsonify({"ok": False, "error": "filename required"}), 400

    proof_dir = os.path.join(os.path.dirname(__file__), "tmp")
    proof_path = os.path.join(proof_dir, safe_name)
    if not os.path.exists(proof_path):
        return jsonify({"ok": False, "error": "artifact not found"}), 404

    return send_from_directory(proof_dir, safe_name, as_attachment=False, max_age=0)






@app.route("/api/models", methods=["GET"])
def models_status():
    """Return model router health and available model catalogue."""
    mh = _mr_health() if _MR_OK else {"foundry_ok": False, "vl_ok": False}
    return jsonify({
        "router_ok":      _MR_OK,
        "foundry_base":   _MR_FOUNDRY_BASE if _MR_OK else "unavailable",
        "foundry_ok":     mh.get("foundry_ok", False),
        "foundry_models": mh.get("foundry_models", []),
        "vl_ok":          mh.get("vl_ok", False),
        "catalogue":      _MR_MODELS,
    })


if __name__ == "__main__":
    # load persisted settings before starting
    load_settings()
    pythoncom.CoInitialize()
    # DECOMMISSIONED: Foundry monitor no longer needed — chat goes through Agent Lee Prime
    # threading.Thread(target=monitor_foundry, daemon=True).start()
    print("[CerebralDaemon] Foundry monitor: DISABLED (Agent Lee Prime handles all inference)")
    threading.Thread(target=monitor_telemetry, daemon=True).start()
    threading.Thread(target=_health_logger_loop, daemon=True).start()
    try:
        # pyre-ignore
        import websocket_ptt_server
        threading.Thread(target=websocket_ptt_server.run, daemon=True).start()
    except Exception:
        pass
    def _check_mcp_server():
        # pyre-ignore
        import time, psutil, subprocess as _sp
        time.sleep(3)
        mcp_running = any(
            "cerebral_mcp_server" in " ".join(p.cmdline())
            for p in psutil.process_iter(["cmdline"])
            if p.info.get("cmdline")
        )
        if not mcp_running:
            print("[CerebralDaemon] WARNING: cerebral_mcp_server.py is NOT running. MCP tools will be unavailable.")
        else:
            print("[CerebralDaemon] MCP server: running OK")
    threading.Thread(target=_check_mcp_server, daemon=True).start()
    # Start persistent task watcher
    threading.Thread(target=task_watcher_loop, daemon=True).start()
    # DECOMMISSIONED: Model router Foundry check no longer needed
    # Agent Lee Prime (Router 8080 → Ollama 11434) handles all inference.
    if _MR_OK:
        print("[CerebralDaemon] Model router: loaded but Foundry chat path DECOMMISSIONED")
    print("CerebralDaemon starting on http://127.0.0.1:8765")
    try:
        # pyre-ignore
        from waitress import serve as _waitress_serve
        _waitress_serve(app, listen="127.0.0.1:8765 ::1:8765", threads=8, channel_timeout=60)
    except ImportError:
        app.run(host="127.0.0.1", port=8765, threaded=True)



