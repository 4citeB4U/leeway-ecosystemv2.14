from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, Optional
from pathlib import Path
from datetime import datetime
from urllib.parse import quote_plus
import json
import subprocess

APP_VERSION = "LEEWAY_EXECUTE_APPROVED_BROWSER_SEARCH_ONE_ACTION_THEN_LOCKBACK_2026-07-05"
MODE = "ONE_ACTION_APPROVED_BROWSER_SEARCH_202"
REAL_EXECUTION_ENABLED = True
PHYSICAL_EXECUTION_ENABLED = True
READ_ONLY_STATUS_ENABLED = False
APPROVAL_ID = "pending-real_browser_search-20260705-194718"
APPROVED_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate\ledger\approved")
EXECUTED_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate\ledger\executed")
RECEIPT_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\receipts")
EXPECTED_QUERY = "Leeway Agent Lee post-execution proof"

app = FastAPI(title="Leeway Real Windows Actuator Alpha 202", version=APP_VERSION)

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
    return json.loads(path.read_text(encoding="utf-8-sig"))

def write_json(path: Path, data: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")

def approval_valid(approval_id: str, query: str):
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
    if approval.get("action") != "real_browser_search":
        return False, "approval_action_mismatch", approval
    if approval.get("execution_status") != "APPROVED_NOT_EXECUTED":
        return False, "approval_execution_status_mismatch", approval
    payload = approval.get("payload") or {}
    approved_query = payload.get("query") or ""
    if approved_query != query:
        return False, "approval_query_mismatch", approval
    return True, "approval_valid", approval

def blocked(action: str):
    return {
        "ok": True,
        "allowed": False,
        "executed": False,
        "reason": "one_action_202_blocks_" + action,
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
        "allowed_action": "real_browser_search",
        "approval_id": APPROVAL_ID,
        "query": EXPECTED_QUERY,
        "all_other_actions_blocked": True,
        "bom_safe_json_read": True,
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
    valid, reason, approval = approval_valid(approval_id, EXPECTED_QUERY)
    return {
        "ok": True,
        "found": approval is not None,
        "allowed": valid,
        "reason": reason,
        "approval_id": approval_id,
    }

@app.post("/real/browser-search")
def real_browser_search(req: RealRequest):
    payload = req.payload or {}
    query = payload.get("query") or ""
    valid, reason, approval = approval_valid(req.approval_id or "", query)

    if not valid:
        return {"ok": True, "allowed": False, "executed": False, "reason": reason, "mode": MODE}

    search_url = "https://www.bing.com/search?q=" + quote_plus(query)
    proc = subprocess.Popen(["cmd", "/c", "start", "", search_url], shell=False)

    executed = {
        "approval_id": req.approval_id,
        "executed_at": now(),
        "action": "real_browser_search",
        "query": query,
        "search_url": search_url,
        "launcher_pid": proc.pid,
        "execution_status": "EXECUTED",
        "used": True,
        "source": "script_202_isolated_browser_search_module",
    }

    executed_path = EXECUTED_DIR / f"{req.approval_id}.executed-real-browser-search-202.approval.json"
    receipt_path = RECEIPT_DIR / f"real-browser-search-202-{req.approval_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.receipt.json"

    write_json(executed_path, executed)
    write_json(receipt_path, executed)

    return {
        "ok": True,
        "allowed": True,
        "executed": True,
        "reason": "approved_one_action_real_browser_search_executed_202",
        "mode": MODE,
        "approval_id": req.approval_id,
        "query": query,
        "search_url": search_url,
        "launcher_pid": proc.pid,
        "executed_path": str(executed_path),
        "receipt_path": str(receipt_path),
    }

@app.post("/real/open-app")
def real_open_app(req: RealRequest):
    return blocked("open_app")

@app.post("/real/open-url")
def real_open_url(req: RealRequest):
    return blocked("open_url")

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
