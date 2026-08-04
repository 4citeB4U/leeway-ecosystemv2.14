# windows_local_actuator_service_stub.py
# Stub only. Do not use for physical control yet.
# Future dry-run service scaffold for Leeway Windows local actuator.

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, Optional
from datetime import datetime
import uuid

APP = "leeway_windows_local_actuator_stub"
VERSION = "LEEWAY_WINDOWS_LOCAL_ACTUATOR_SERVICE_STUB_2026-07-05"

app = FastAPI(title=APP, version=VERSION)

class ExecuteRequest(BaseModel):
    request_id: Optional[str] = ""
    requested_by: Optional[str] = "agent_lee"
    source: Optional[str] = "device_operator"
    target_device_id: Optional[str] = "windows-agent-lee"
    approval_id: Optional[str] = ""
    dry_run: bool = True
    payload: Dict[str, Any] = {}

def receipt(action: str, payload: Dict[str, Any]):
    return {
        "receipt_id": "stub-" + uuid.uuid4().hex[:12],
        "created_at": datetime.utcnow().isoformat(),
        "action": action,
        "dry_run": True,
        "executed": False,
        "payload": payload,
        "message": "Stub only. No physical action executed."
    }

@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "physical_execution_enabled": False
    }

@app.get("/status")
def status():
    return {
        "ok": True,
        "status": "stub_contract_only",
        "running_physical_actuator": False,
        "message": "This is a scaffold for the future dry-run actuator service."
    }

@app.get("/capabilities")
def capabilities():
    return {
        "ok": True,
        "capabilities": [
            "open_app_dry_run",
            "open_url_dry_run",
            "browser_search_dry_run",
            "mouse_move_dry_run",
            "mouse_click_dry_run",
            "type_text_dry_run",
            "hotkey_dry_run",
            "screenshot_dry_run",
            "print_dry_run"
        ],
        "physical_execution_enabled": False
    }

@app.post("/execute/open-app")
def execute_open_app(req: ExecuteRequest):
    return {"ok": True, "result": receipt("open_app", req.model_dump())}

@app.post("/execute/open-url")
def execute_open_url(req: ExecuteRequest):
    return {"ok": True, "result": receipt("open_url", req.model_dump())}

@app.post("/execute/mouse-click")
def execute_mouse_click(req: ExecuteRequest):
    return {"ok": True, "result": receipt("mouse_click", req.model_dump())}

@app.post("/execute/type-text")
def execute_type_text(req: ExecuteRequest):
    return {"ok": True, "result": receipt("type_text", req.model_dump())}
