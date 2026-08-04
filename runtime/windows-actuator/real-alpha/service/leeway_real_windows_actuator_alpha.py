from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, Optional
from pathlib import Path

APP_VERSION = "LEEWAY_EXECUTE_APPROVED_TYPE_TEXT_ONE_ACTION_THEN_LOCKBACK_2026-07-05"
MODE = "APPROVAL_ONLY_LOCKED_AFTER_209"
REAL_EXECUTION_ENABLED = False
PHYSICAL_EXECUTION_ENABLED = False
READ_ONLY_STATUS_ENABLED = False
APPROVED_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate\ledger\approved")
EXECUTED_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate\ledger\executed")
RECEIPT_DIR = Path(r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\receipts")

app = FastAPI(title="Leeway Real Windows Actuator Alpha", version=APP_VERSION)

class RealRequest(BaseModel):
    request_id: Optional[str] = None
    requested_by: Optional[str] = None
    source: Optional[str] = None
    target_device_id: Optional[str] = None
    approval_id: Optional[str] = None
    action: Optional[str] = None
    dry_run: Optional[bool] = False
    payload: Optional[Dict[str, Any]] = None

def blocked(action: str):
    return {
        "ok": True,
        "allowed": False,
        "executed": False,
        "reason": "real_alpha_locked_after_209_blocks_" + action,
        "mode": MODE,
        "real_execution_enabled": REAL_EXECUTION_ENABLED,
        "physical_execution_enabled": PHYSICAL_EXECUTION_ENABLED,
        "read_only_status_enabled": READ_ONLY_STATUS_ENABLED,
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
    }

@app.get("/status")
def status():
    return health()

@app.get("/policy")
def policy():
    return {
        "ok": True,
        "mode": MODE,
        "all_real_actions_blocked": True,
        "real_execution_enabled": REAL_EXECUTION_ENABLED,
        "physical_execution_enabled": PHYSICAL_EXECUTION_ENABLED,
        "read_only_status_enabled": READ_ONLY_STATUS_ENABLED,
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
    path = APPROVED_DIR / f"{approval_id}.approval.json"
    return {
        "ok": True,
        "found": path.exists(),
        "allowed": False,
        "reason": "real_alpha_locked_after_209",
        "approval_id": approval_id,
    }

@app.post("/real/open-app")
def real_open_app(req: RealRequest):
    return blocked("open_app")

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

# =====================================================================
# LEEWAY_284D_SINGLE_APPROVED_ACTION_WINDOW_PATCH
# Source patch only. Adds one-time approval-artifact-backed open-app
# execution window for real_open_app -> notepad.exe only.
# No general unlock. No permanent enable. No shell commands.
# =====================================================================

import os as _leeway_284d_os
import time as _leeway_284d_time
import uuid as _leeway_284d_uuid
import json as _leeway_284d_json
import subprocess as _leeway_284d_subprocess

try:
    from fastapi import Request as _Leeway284DRequest
except Exception:
    _Leeway284DRequest = None

_LEEWAY_284D_ROOT = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4"
_LEEWAY_284D_LATEST = _leeway_284d_os.path.join(_LEEWAY_284D_ROOT, "runtime", "agent-lee-approval-gated-action-lanes", "latest")
_LEEWAY_284D_APPROVED_LATEST = _leeway_284d_os.path.join(_LEEWAY_284D_LATEST, "approved-request-latest.json")
_LEEWAY_284D_VALIDATION_LATEST = _leeway_284d_os.path.join(_LEEWAY_284D_LATEST, "blocked-until-execution-validation-latest.json")
_LEEWAY_284D_ARMED_WINDOWS = {}

def _leeway_284d_load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return _leeway_284d_json.load(f)

def _leeway_284d_payload_app(payload):
    if not isinstance(payload, dict):
        return ""
    return str(payload.get("app") or payload.get("app_name") or "").strip().lower()

def _leeway_284d_validate_approved_window_request(body):
    approved = _leeway_284d_load_json(_LEEWAY_284D_APPROVED_LATEST)
    validation = _leeway_284d_load_json(_LEEWAY_284D_VALIDATION_LATEST)

    request_id = str(body.get("request_id") or "")
    approval_id = str(body.get("approval_id") or "")
    target_device_id = str(body.get("target_device_id") or "")
    action = str(body.get("action") or "")
    payload = body.get("payload") or {}
    app_name = _leeway_284d_payload_app(payload)

    if approved.get("request_id") != request_id:
        return False, "request_id_mismatch", None
    if approved.get("approval_id") != approval_id:
        return False, "approval_id_mismatch", None
    if approved.get("approval_state") != "APPROVED":
        return False, "approval_state_not_approved", None
    if approved.get("execution_performed") is True:
        return False, "approved_request_already_executed", None
    if approved.get("action") != "real_open_app":
        return False, "approved_action_not_real_open_app", None
    if action != "real_open_app":
        return False, "requested_action_not_real_open_app", None
    if approved.get("target_device_id") != target_device_id:
        return False, "target_device_id_mismatch", None
    if str(approved.get("app_name") or "").strip().lower() != "notepad.exe":
        return False, "approved_app_not_notepad", None
    if app_name != "notepad.exe":
        return False, "requested_app_not_notepad", None
    if validation.get("blocked_until_execution_validated") is not True:
        return False, "blocked_until_execution_validation_missing", None
    if validation.get("approval_id") != approval_id:
        return False, "validation_approval_id_mismatch", None

    return True, "approved_window_valid", approved

async def _leeway_284d_request_json(request):
    if request is None:
        return {}
    if hasattr(request, "json"):
        return await request.json()
    return {}

@app.post("/real/arm-approved-action")
async def leeway_284d_arm_approved_action(request: _Leeway284DRequest):
    body = await _leeway_284d_request_json(request)
    ok, reason, approved = _leeway_284d_validate_approved_window_request(body)

    if not ok:
        return {
            "armed": False,
            "executed": False,
            "reason": reason,
            "scope": "real_open_app_notepad_only",
            "general_unlock": False,
        }

    ttl_seconds = int(body.get("ttl_seconds") or 60)
    if ttl_seconds < 1 or ttl_seconds > 120:
        ttl_seconds = 60

    token = "lee284d-" + _leeway_284d_uuid.uuid4().hex
    now = _leeway_284d_time.time()

    _LEEWAY_284D_ARMED_WINDOWS[approved["approval_id"]] = {
        "token": token,
        "request_id": approved["request_id"],
        "approval_id": approved["approval_id"],
        "target_device_id": approved["target_device_id"],
        "action": "real_open_app",
        "app_name": "notepad.exe",
        "created_at": now,
        "expires_at": now + ttl_seconds,
        "consumed": False,
        "execute_once": True,
    }

    return {
        "armed": True,
        "executed": False,
        "token": token,
        "request_id": approved["request_id"],
        "approval_id": approved["approval_id"],
        "action": "real_open_app",
        "app_name": "notepad.exe",
        "ttl_seconds": ttl_seconds,
        "expires_at": now + ttl_seconds,
        "execute_once": True,
        "general_unlock": False,
        "reason": "single_approved_action_window_armed",
    }

async def leeway_284d_guarded_real_open_app(request: _Leeway284DRequest):
    body = await _leeway_284d_request_json(request)

    approval_id = str(body.get("approval_id") or "")
    request_id = str(body.get("request_id") or "")
    target_device_id = str(body.get("target_device_id") or "")
    action = str(body.get("action") or "")
    payload = body.get("payload") or {}
    app_name = _leeway_284d_payload_app(payload)

    window = _LEEWAY_284D_ARMED_WINDOWS.get(approval_id)

    if not window:
        return {
            "executed": False,
            "reason": "real_alpha_locked_after_209_blocks_open_app",
            "armed_window": False,
            "lockback": True,
            "general_unlock": False,
        }

    now = _leeway_284d_time.time()

    if window.get("consumed") is True:
        return {"executed": False, "reason": "approved_window_already_consumed", "lockback": True}
    if now > float(window.get("expires_at") or 0):
        window["consumed"] = True
        return {"executed": False, "reason": "approved_window_expired", "lockback": True}
    if window.get("request_id") != request_id:
        return {"executed": False, "reason": "request_id_mismatch", "lockback": True}
    if window.get("target_device_id") != target_device_id:
        return {"executed": False, "reason": "target_device_id_mismatch", "lockback": True}
    if action != "real_open_app":
        return {"executed": False, "reason": "action_not_allowed_by_window", "lockback": True}
    if app_name != "notepad.exe":
        return {"executed": False, "reason": "app_not_allowed_by_window", "lockback": True}

    window["consumed"] = True

    try:
        _leeway_284d_subprocess.Popen(["notepad.exe"], shell=False)
        return {
            "executed": True,
            "reason": "single_approved_action_executed_once",
            "request_id": request_id,
            "approval_id": approval_id,
            "action": "real_open_app",
            "app_name": "notepad.exe",
            "lockback": True,
            "general_unlock": False,
        }
    except Exception as exc:
        return {
            "executed": False,
            "reason": "subprocess_open_app_failed",
            "error": repr(exc),
            "lockback": True,
            "general_unlock": False,
        }

try:
    from fastapi.routing import APIRoute as _Leeway284DAPIRoute
    app.router.routes = [
        route for route in app.router.routes
        if not (
            isinstance(route, _Leeway284DAPIRoute)
            and getattr(route, "path", "") == "/real/open-app"
            and "POST" in getattr(route, "methods", set())
        )
    ]
    app.post("/real/open-app")(leeway_284d_guarded_real_open_app)
except Exception as _leeway_284d_route_patch_exc:
    LEEWAY_284D_ROUTE_PATCH_ERROR = repr(_leeway_284d_route_patch_exc)

# =====================================================================
# END LEEWAY_284D_SINGLE_APPROVED_ACTION_WINDOW_PATCH
# =====================================================================

# =====================================================================
# LEEWAY_284E_FIX_ARM_ENDPOINT_VALIDATION_UTF8SIG_PATCH
# Fix:
#   Make /real/arm-approved-action validation non-throwing.
#   Read PowerShell-written JSON with utf-8-sig.
#   Re-register /real/arm-approved-action and /real/open-app safely.
#   No execution is performed by this source patch.
# =====================================================================

def _leeway_284e_fix_load_json(path):
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            return _leeway_284d_json.load(f)
    except Exception as exc:
        return {"__leeway_load_error__": repr(exc), "__leeway_path__": path}

def _leeway_284e_fix_payload_app(payload):
    if not isinstance(payload, dict):
        return ""
    return str(payload.get("app") or payload.get("app_name") or "").strip().lower()

def _leeway_284d_validate_approved_window_request(body):
    try:
        if not isinstance(body, dict):
            return False, "request_body_not_dict", None

        approved = _leeway_284e_fix_load_json(_LEEWAY_284D_APPROVED_LATEST)
        validation = _leeway_284e_fix_load_json(_LEEWAY_284D_VALIDATION_LATEST)

        if approved.get("__leeway_load_error__"):
            return False, "approved_json_load_error", None
        if validation.get("__leeway_load_error__"):
            return False, "validation_json_load_error", None

        request_id = str(body.get("request_id") or "")
        approval_id = str(body.get("approval_id") or "")
        target_device_id = str(body.get("target_device_id") or "")
        action = str(body.get("action") or "")
        payload = body.get("payload") or {}
        app_name = _leeway_284e_fix_payload_app(payload)

        approved_request_id = str(approved.get("request_id") or "")
        approved_approval_id = str(approved.get("approval_id") or "")
        approved_target = str(approved.get("target_device_id") or approved.get("target") or "")
        approved_action = str(approved.get("action") or "")
        approved_app = str(approved.get("app_name") or approved.get("app") or "").strip().lower()
        approved_state = str(approved.get("approval_state") or "")
        approved_executed = approved.get("execution_performed") is True

        validation_approval_id = str(validation.get("approval_id") or "")
        validation_ready = validation.get("blocked_until_execution_validated") is True

        if approved_request_id != request_id:
            return False, "request_id_mismatch", None
        if approved_approval_id != approval_id:
            return False, "approval_id_mismatch", None
        if approved_state != "APPROVED":
            return False, "approval_state_not_approved", None
        if approved_executed:
            return False, "approved_request_already_executed", None
        if approved_action != "real_open_app":
            return False, "approved_action_not_real_open_app", None
        if action != "real_open_app":
            return False, "requested_action_not_real_open_app", None
        if approved_target and approved_target != target_device_id:
            return False, "target_device_id_mismatch", None
        if approved_app != "notepad.exe":
            return False, "approved_app_not_notepad", None
        if app_name != "notepad.exe":
            return False, "requested_app_not_notepad", None
        if not validation_ready:
            return False, "blocked_until_execution_validation_missing", None
        if validation_approval_id and validation_approval_id != approval_id:
            return False, "validation_approval_id_mismatch", None

        approved["target_device_id"] = target_device_id
        approved["app_name"] = "notepad.exe"
        return True, "approved_window_valid", approved

    except Exception as exc:
        return False, "validation_exception_" + repr(exc), None

@app.post("/real/arm-approved-action")
async def leeway_284e_fix_arm_approved_action(request: _Leeway284DRequest):
    body = await _leeway_284d_request_json(request)
    ok, reason, approved = _leeway_284d_validate_approved_window_request(body)

    if not ok:
        return {
            "armed": False,
            "executed": False,
            "reason": reason,
            "scope": "real_open_app_notepad_only",
            "general_unlock": False,
            "fix": "LEEWAY_284E_FIX_ARM_ENDPOINT_VALIDATION_UTF8SIG_PATCH",
        }

    ttl_seconds = int(body.get("ttl_seconds") or 60)
    if ttl_seconds < 1 or ttl_seconds > 120:
        ttl_seconds = 60

    token = "lee284e-" + _leeway_284d_uuid.uuid4().hex
    now = _leeway_284d_time.time()

    _LEEWAY_284D_ARMED_WINDOWS[approved["approval_id"]] = {
        "token": token,
        "request_id": approved["request_id"],
        "approval_id": approved["approval_id"],
        "target_device_id": str(body.get("target_device_id") or approved.get("target_device_id") or ""),
        "action": "real_open_app",
        "app_name": "notepad.exe",
        "created_at": now,
        "expires_at": now + ttl_seconds,
        "consumed": False,
        "execute_once": True,
    }

    return {
        "armed": True,
        "executed": False,
        "token": token,
        "request_id": approved["request_id"],
        "approval_id": approved["approval_id"],
        "action": "real_open_app",
        "app_name": "notepad.exe",
        "ttl_seconds": ttl_seconds,
        "expires_at": now + ttl_seconds,
        "execute_once": True,
        "general_unlock": False,
        "reason": "single_approved_action_window_armed",
        "fix": "LEEWAY_284E_FIX_ARM_ENDPOINT_VALIDATION_UTF8SIG_PATCH",
    }

try:
    from fastapi.routing import APIRoute as _Leeway284EFixAPIRoute
    app.router.routes = [
        route for route in app.router.routes
        if not (
            isinstance(route, _Leeway284EFixAPIRoute)
            and getattr(route, "path", "") in ["/real/arm-approved-action", "/real/open-app"]
            and "POST" in getattr(route, "methods", set())
        )
    ]
    app.post("/real/arm-approved-action")(leeway_284e_fix_arm_approved_action)
    app.post("/real/open-app")(leeway_284d_guarded_real_open_app)
except Exception as _leeway_284e_fix_route_patch_exc:
    LEEWAY_284E_FIX_ROUTE_PATCH_ERROR = repr(_leeway_284e_fix_route_patch_exc)

# =====================================================================
# END LEEWAY_284E_FIX_ARM_ENDPOINT_VALIDATION_UTF8SIG_PATCH
# =====================================================================
