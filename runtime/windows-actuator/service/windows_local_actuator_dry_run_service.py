import json
import os
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from fastapi import FastAPI
from pydantic import BaseModel

APP = "leeway_windows_local_actuator_dry_run"
VERSION = "LEEWAY_WINDOWS_LOCAL_ACTUATOR_DRY_RUN_SERVICE_2026-07-05"

ROOT = Path(os.environ.get("LEEWAY_ROOT", r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4"))
DEVICE_ID = os.environ.get("LEEWAY_WINDOWS_DEVICE_ID", "windows-agent-lee")
ACTUATOR_DEVICE_ID = os.environ.get("LEEWAY_ACTUATOR_DEVICE_ID", DEVICE_ID + "-local-actuator-dry-run")
DEVICE_OPERATOR_URL = os.environ.get("LEEWAY_DEVICE_OPERATOR_URL", "http://127.0.0.1:5323")
RECEIPT_DIR = Path(os.environ.get("LEEWAY_ACTUATOR_RECEIPT_DIR", str(ROOT / "runtime" / "windows-actuator" / "receipts")))

RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)

SAFE_READ_ROUTES = [
    "/health",
    "/status",
    "/capabilities",
    "/policy",
    "/allowlist",
    "/monitors",
    "/screen/status",
    "/camera/status",
    "/audio/status",
    "/apps/list-allowlist",
    "/receipts",
    "/receipts/{receipt_id}"
]

DRY_RUN_EXECUTE_ROUTES = [
    "/execute/open-app",
    "/execute/open-url",
    "/execute/browser-search",
    "/execute/mouse-move",
    "/execute/mouse-click",
    "/execute/type-text",
    "/execute/hotkey",
    "/execute/screenshot",
    "/execute/file-open",
    "/execute/file-reveal",
    "/execute/print",
    "/execute/cast",
    "/execute/shell-allowed-command"
]

BLOCKED_ACTIONS = [
    "credential_extraction",
    "bypass_security",
    "disable_security_tool",
    "hidden_surveillance",
    "stealth_remote_control",
    "unapproved_keystroke_capture",
    "unapproved_clipboard_read",
    "unapproved_clipboard_write",
    "unapproved_file_delete",
    "unapproved_mass_message_send",
    "malware_behavior",
    "persistence_without_owner_approval",
    "destructive_bulk_cleanup",
    "docker_prune_without_owner_approval"
]

class ExecuteRequest(BaseModel):
    request_id: Optional[str] = ""
    requested_by: Optional[str] = "agent_lee"
    source: Optional[str] = "device_operator"
    target_device_id: Optional[str] = DEVICE_ID
    approval_id: Optional[str] = ""
    dry_run: bool = True
    action: Optional[str] = ""
    payload: Dict[str, Any] = {}

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def read_json(path: Path, fallback: Any) -> Any:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return fallback

def write_receipt(action: str, payload: Dict[str, Any], result: Dict[str, Any]) -> Dict[str, Any]:
    receipt_id = "dryrun-" + str(int(time.time() * 1000)) + "-" + uuid.uuid4().hex[:8]
    receipt = {
        "receipt_id": receipt_id,
        "app": APP,
        "version": VERSION,
        "created_at": now_iso(),
        "action": action,
        "device_id": DEVICE_ID,
        "actuator_device_id": ACTUATOR_DEVICE_ID,
        "dry_run": True,
        "executed": False,
        "physical_execution_enabled": False,
        "payload": payload,
        "result": result,
        "safety": {
            "mouse_moved": False,
            "mouse_clicked": False,
            "keyboard_typed": False,
            "app_opened": False,
            "url_opened": False,
            "message_sent": False,
            "phone_call_made": False,
            "file_deleted": False,
            "docker_prune": False,
            "destructive_cleanup": False
        }
    }
    path = RECEIPT_DIR / (receipt_id + "-" + action.replace("/", "_") + ".receipt.json")
    write_json(path, receipt)
    write_json(RECEIPT_DIR / "latest.dry-run.receipt.json", receipt)
    return {
        "receipt_id": receipt_id,
        "receipt_path": str(path),
        "receipt": receipt
    }

def dry_result(action: str, req: ExecuteRequest) -> Dict[str, Any]:
    payload = req.model_dump()
    result = {
        "ok": True,
        "action": action,
        "dry_run": True,
        "executed": False,
        "physical_execution_enabled": False,
        "message": "Dry-run only. No physical Windows action executed.",
        "time": now_iso()
    }
    rec = write_receipt(action, payload, result)
    return {
        "ok": True,
        "action": action,
        "dry_run": True,
        "executed": False,
        "result": result,
        "receipt": rec
    }

@app.get("/")
def root():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "health": "/health",
        "status": "/status",
        "capabilities": "/capabilities",
        "dry_run_only": True,
        "physical_execution_enabled": False
    }

@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "device_id": DEVICE_ID,
        "actuator_device_id": ACTUATOR_DEVICE_ID,
        "dry_run_only": True,
        "physical_execution_enabled": False,
        "created_at": now_iso()
    }

@app.get("/status")
def status():
    return {
        "ok": True,
        "status": "running_dry_run_only",
        "app": APP,
        "version": VERSION,
        "device_id": DEVICE_ID,
        "actuator_device_id": ACTUATOR_DEVICE_ID,
        "device_operator_url": DEVICE_OPERATOR_URL,
        "receipt_dir": str(RECEIPT_DIR),
        "dry_run_only": True,
        "physical_execution_enabled": False,
        "message": "Service is live for dry-run contract validation only."
    }

@app.get("/capabilities")
def capabilities():
    return {
        "ok": True,
        "device_id": DEVICE_ID,
        "actuator_device_id": ACTUATOR_DEVICE_ID,
        "safe_read_routes": SAFE_READ_ROUTES,
        "dry_run_execute_routes": DRY_RUN_EXECUTE_ROUTES,
        "blocked_actions": BLOCKED_ACTIONS,
        "physical_execution_enabled": False
    }

@app.get("/policy")
def policy():
    return {
        "ok": True,
        "policy": {
            "dry_run_only": True,
            "physical_execution_enabled": False,
            "approval_required_for_real_execution": True,
            "receipts_required": True,
            "blocked_actions": BLOCKED_ACTIONS
        }
    }

@app.get("/allowlist")
def allowlist():
    return {
        "ok": True,
        "allowed_apps": ["notepad", "explorer", "edge", "chrome", "powershell", "pwsh", "vscode"],
        "note": "Allowlist is informational in dry-run mode. No app is opened by this service."
    }

@app.get("/monitors")
def monitors():
    return {
        "ok": True,
        "dry_run": True,
        "monitors": [],
        "message": "Monitor enumeration is disabled in this dry-run service."
    }

@app.get("/screen/status")
def screen_status():
    return {
        "ok": True,
        "dry_run": True,
        "screen_available": "not_checked_in_dry_run",
        "message": "Screen status route is live. No screenshot captured."
    }

@app.get("/camera/status")
def camera_status():
    return {
        "ok": True,
        "dry_run": True,
        "camera_available": "not_checked_in_dry_run",
        "message": "Camera status route is live. No camera access performed."
    }

@app.get("/audio/status")
def audio_status():
    return {
        "ok": True,
        "dry_run": True,
        "audio_available": "not_checked_in_dry_run",
        "message": "Audio status route is live. No mic or speaker access performed."
    }

@app.get("/apps/list-allowlist")
def apps_list_allowlist():
    return allowlist()

@app.get("/receipts")
def receipts():
    files = sorted(RECEIPT_DIR.glob("*.receipt.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    return {
        "ok": True,
        "count": len(files),
        "receipts": [str(p) for p in files[:50]]
    }

@app.get("/receipts/{receipt_id}")
def receipt_get(receipt_id: str):
    for p in RECEIPT_DIR.glob("*.receipt.json"):
        if receipt_id in p.name:
            return read_json(p, {"ok": False, "message": "Could not read receipt."})
    return {"ok": False, "message": "Receipt not found.", "receipt_id": receipt_id}

@app.post("/execute/open-app")
def execute_open_app(req: ExecuteRequest):
    return dry_result("open_app", req)

@app.post("/execute/open-url")
def execute_open_url(req: ExecuteRequest):
    return dry_result("open_url", req)

@app.post("/execute/browser-search")
def execute_browser_search(req: ExecuteRequest):
    return dry_result("browser_search", req)

@app.post("/execute/mouse-move")
def execute_mouse_move(req: ExecuteRequest):
    return dry_result("mouse_move", req)

@app.post("/execute/mouse-click")
def execute_mouse_click(req: ExecuteRequest):
    return dry_result("mouse_click", req)

@app.post("/execute/type-text")
def execute_type_text(req: ExecuteRequest):
    return dry_result("type_text", req)

@app.post("/execute/hotkey")
def execute_hotkey(req: ExecuteRequest):
    return dry_result("hotkey", req)

@app.post("/execute/screenshot")
def execute_screenshot(req: ExecuteRequest):
    return dry_result("screenshot", req)

@app.post("/execute/file-open")
def execute_file_open(req: ExecuteRequest):
    return dry_result("file_open", req)

@app.post("/execute/file-reveal")
def execute_file_reveal(req: ExecuteRequest):
    return dry_result("file_reveal", req)

@app.post("/execute/print")
def execute_print(req: ExecuteRequest):
    return dry_result("print", req)

@app.post("/execute/cast")
def execute_cast(req: ExecuteRequest):
    return dry_result("cast", req)

@app.post("/execute/shell-allowed-command")
def execute_shell_allowed_command(req: ExecuteRequest):
    return dry_result("shell_allowed_command", req)
