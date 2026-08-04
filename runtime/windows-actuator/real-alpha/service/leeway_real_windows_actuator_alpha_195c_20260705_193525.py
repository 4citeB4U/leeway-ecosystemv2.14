from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, Optional
from pathlib import Path
from datetime import datetime
import json
import subprocess

APP_VERSION = "LEEWAY_EXECUTE_APPROVED_OPEN_APP_ISOLATED_MODULE_THEN_LOCKBACK_2026-07-05"
MODE = "ONE_ACTION_APPROVED_OPEN_APP_NOTEPAD_195C"
REAL_EXECUTION_ENABLED = True
PHYSICAL_EXECUTION_ENABLED = True
READ_ONLY_STATUS_ENABLED = False
APPROVAL_ID = "pending-real_open_app-20260705-192102-246585f2bd4c"
APPROVED_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate\ledger\approved")
EXECUTED_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate\ledger\executed")
RECEIPT_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\receipts")

app = FastAPI(title="Leeway Real Windows Actuator Alpha 195C", version=APP_VERSION)

class RealRequest(BaseModel):
    request_id: Optional[str] = None
    requested_by: Optional[str] = None
    source: Optional[str] = None
    target_device_id: Optional[str] = None
    approval_id: Optional[str] = None
    action: Optional[str] = None
    dry_run: Optional[bool] = False
    payload: Optional[Dict[str, Any]] = None

def now():
    return datetime.now().isoformat(timespec="seconds")

def read_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))

def write_json(path: Path, data: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def approval_valid(approval_id: str, expected_app_id: str):
    if approval_id != APPROVAL_ID:
        return False, "approval_id_not_allowed", None
    path = APPROVED_DIR / f"{approval_id}.approval.json"
    approval = read_json(path)
    if not approval:
        return False, "approval_not_found", None
    if approval.get("approval_state") != "APPROVED":
        return False, "approval_not_approved", approval
    if bool(approval.get("used", False)):
        return False, "approval_already_used", approval
    if approval.get("action") != "real_open_app":
        return False, "approval_action_mismatch", approval
    payload = approval.get("payload") or {}
    if payload.get("app_id") != expected_app_id:
        return False, "approval_target_mismatch", approval
    return True, "approval_valid", approval

def blocked(action: str):
    return {
        "ok": True,
        "allowed": False,
        "executed": False,
        "reason": "one_action_195c_blocks_" + action,
        "mode": MODE,
    }

@app.get("/health")
def health():
    return {
        "ok": True,
        "version": APP_VERSION,
        "mode": MODE,
        "real_execution_enabled": REAL_EXECUTION_ENABLED,
        "physical_execution_enabled": PHYSICAL_EXECUTION_ENABLED,
        "read_only_status_enabled": READ_ONLY_STATUS_ENABLED,
        "approval_id": APPROVAL_ID,
    }

@app.get("/status")
def status():
    return health()

@app.get("/policy")
def policy():
    return {
        "ok": True,
        "mode": MODE,
        "allowed_action": "real_open_app",
        "allowed_app_id": "notepad",
        "approval_id": APPROVAL_ID,
        "all_other_actions_blocked": True,
    }

@app.get("/approval-ledger")
def ledger():
    return {
        "ok": True,
        "approved_count": len(list(APPROVED_DIR.glob("*.approval.json"))) if APPROVED_DIR.exists() else 0,
        "executed_count": len(list(EXECUTED_DIR.glob("*.approval.json"))) if EXECUTED_DIR.exists() else 0,
    }

@app.get("/receipts")
def receipts():
    return {
        "ok": True,
        "receipt_count": len(list(RECEIPT_DIR.glob("*.receipt.json"))) if RECEIPT_DIR.exists() else 0,
    }

@app.get("/debug/approval/{approval_id}")
def debug_approval(approval_id: str):
    valid, reason, approval = approval_valid(approval_id, "notepad")
    return {
        "ok": True,
        "found": approval is not None,
        "allowed": valid,
        "reason": reason,
        "approval_id": approval_id,
    }

@app.post("/real/open-app")
def real_open_app(req: RealRequest):
    payload = req.payload or {}
    app_id = payload.get("app_id")
    valid, reason, approval = approval_valid(req.approval_id or "", "notepad")

    if not valid:
        return {"ok": True, "allowed": False, "executed": False, "reason": reason, "mode": MODE}

    if app_id != "notepad":
        return {"ok": True, "allowed": False, "executed": False, "reason": "payload_app_id_not_allowed", "mode": MODE}

    proc = subprocess.Popen(["notepad.exe"])

    executed = {
        "approval_id": req.approval_id,
        "executed_at": now(),
        "action": "real_open_app",
        "app_id": "notepad",
        "process_pid": proc.pid,
        "execution_status": "EXECUTED",
        "used": True,
        "source": "script_195c_isolated_module",
    }

    executed_path = EXECUTED_DIR / f"{req.approval_id}.executed-real-open-app-195c.approval.json"
    receipt_path = RECEIPT_DIR / f"real-open-app-195c-{req.approval_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.receipt.json"

    write_json(executed_path, executed)
    write_json(receipt_path, executed)

    return {
        "ok": True,
        "allowed": True,
        "executed": True,
        "reason": "approved_one_action_real_open_app_executed_195c",
        "mode": MODE,
        "approval_id": req.approval_id,
        "process_pid": proc.pid,
        "executed_path": str(executed_path),
        "receipt_path": str(receipt_path),
    }

@app.post("/real/open-url")
def real_open_url(req: RealRequest):
    return blocked("open_url")

@app.post("/real/browser-search")
def real_browser_search(req: RealRequest):
    return blocked("browser_search")

@app.post("/real/type-text")
def real_type_text(req: RealRequest):
    return blocked("type_text")

@app.post("/real/hotkey")
def real_hotkey(req: RealRequest):
    return blocked("hotkey")

@app.post("/real/screen-status")
def real_screen_status(req: RealRequest):
    return blocked("screen_status")

@app.post("/real/mouse-click")
def real_mouse_click(req: RealRequest):
    return blocked("mouse_click")

@app.post("/real/shell-allowed-command")
def real_shell_allowed_command(req: RealRequest):
    return blocked("shell_allowed_command")
