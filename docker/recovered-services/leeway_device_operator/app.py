import json
import os
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

import requests
from fastapi import FastAPI
from pydantic import BaseModel, Field

APP = "leeway_device_operator"
VERSION = "0.1.0-device-operator-control-plane"

STATE_DIR = Path(os.environ.get("LEEWAY_DEVICE_STATE_DIR", "/device-state"))
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
API_GATEWAY_URL = os.environ.get("LEEWAY_API_GATEWAY_URL", "http://leeway_api_gateway:5320").rstrip("/")

STATE_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class CursorProfile(BaseModel):
    mode: str = "blue"
    label: str = "Agent Lee"
    meaning: str = "listening_thinking_safe_navigation"
    glow: bool = True
    tap_to_talk: bool = True


class DeviceRegisterRequest(BaseModel):
    device_id: str = Field(..., min_length=1)
    device_type: str = Field(..., min_length=1)
    platform: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    capabilities: List[str] = []
    adapter_url: Optional[str] = ""
    owner: Optional[str] = "customer"


class ChannelRegisterRequest(BaseModel):
    channel_type: str = Field(..., min_length=1)
    channel_name: str = Field(..., min_length=1)
    config: Dict[str, Any] = {}
    enabled: bool = True


class DeviceActionRequest(BaseModel):
    action_type: str = Field(..., min_length=1)
    target_device_id: Optional[str] = "default"
    command: Dict[str, Any] = {}
    requested_by: Optional[str] = "agent_lee"
    requires_approval: bool = True
    source: Optional[str] = "telegram"


class VoiceSessionRequest(BaseModel):
    source: str = "cursor"
    device_id: str = "default"
    mode: str = "push_to_talk"
    language: str = "English"


class LicenseProfileRequest(BaseModel):
    customer_name: str = Field(..., min_length=1)
    license_id: str = Field(..., min_length=1)
    expires_at: Optional[str] = ""
    allowed_channels: List[str] = ["telegram", "pwa", "email", "phone"]
    allowed_device_types: List[str] = ["windows", "linux", "macos", "android", "ios"]
    allowed_actions: List[str] = ["search", "voice", "crm", "approval_queue"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_receipt(kind: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    receipt = {
        "verdict": payload.get("verdict", f"{APP}_{kind.upper()}_RECEIPT"),
        "lane": APP,
        "version": VERSION,
        "kind": kind,
        "created_at": now_iso(),
        **payload,
    }
    path = RECEIPT_DIR / f"{APP}_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    write_json(path, receipt)
    write_json(RECEIPT_DIR / "latest.receipt.json", receipt)
    receipt["receipt_path"] = str(path)
    return receipt


def state_file(name: str) -> Path:
    return STATE_DIR / name


def append_jsonl(path: Path, data: Dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(data) + "\n")


def call_gateway_approval(action: DeviceActionRequest) -> Dict[str, Any]:
    payload = {
        "target_name": action.target_device_id or "device",
        "purpose": f"Device action requested: {action.action_type}",
        "script": json.dumps(action.command, indent=2),
        "requested_by": action.requested_by or "agent_lee",
        "source": action.source or "device_operator",
    }
    r = requests.post(API_GATEWAY_URL + "/approval/request-phone-call", json=payload, timeout=30)
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:4000]}
    return {"status": r.status_code, "data": data}


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    devices_path = state_file("devices.json")
    channels_path = state_file("channels.json")
    license_path = state_file("license-profile.json")

    devices = read_json(devices_path) if devices_path.exists() else {"devices": []}
    channels = read_json(channels_path) if channels_path.exists() else {"channels": []}
    license_profile = read_json(license_path) if license_path.exists() else {"licensed": False}

    return {
        "app": APP,
        "version": VERSION,
        "purpose": "Dockerized Leeway control plane for cursor, device channels, phone/email/PWA/Telegram control surfaces, and approved device actions.",
        "device_model": {
            "docker_control_plane": True,
            "host_or_mobile_adapter_required_for_physical_ui_actions": True,
            "all_actions_route_through_leeway_api_gateway": True,
            "approval_required_for_risky_actions": True,
        },
        "cursor_modes": {
            "blue": "listening_thinking_safe_navigation",
            "green": "approved_action_active_execution",
            "red": "blocked_needs_approval_risky_action",
            "gold": "owner_admin_mode",
            "purple": "agent_creation_mode",
        },
        "endpoints": [
            "/health",
            "/status",
            "/cursor/profile",
            "/cursor/set-profile",
            "/devices/register",
            "/devices/list",
            "/channels/register",
            "/channels/list",
            "/voice/session/start",
            "/device/action/request",
            "/license/profile",
            "/receipts/latest",
            "/openapi.json",
        ],
        "devices": devices,
        "channels": channels,
        "license_profile": license_profile,
        "created_at": now_iso(),
    }


@app.get("/cursor/profile")
def cursor_profile():
    path = state_file("cursor-profile.json")
    if not path.exists():
        profile = CursorProfile().model_dump()
        write_json(path, profile)
    else:
        profile = read_json(path)
    return {"ok": True, "cursor_profile": profile}


@app.post("/cursor/set-profile")
def set_cursor_profile(req: CursorProfile):
    data = req.model_dump()
    write_json(state_file("cursor-profile.json"), data)
    receipt = write_receipt("cursor_profile_set", {
        "verdict": "LEEWAY_AGENT_LEE_CURSOR_PROFILE_SET",
        "profile": data,
    })
    return {"ok": True, "cursor_profile": data, "receipt": receipt}


@app.post("/devices/register")
def register_device(req: DeviceRegisterRequest):
    path = state_file("devices.json")
    data = read_json(path) if path.exists() else {"devices": []}
    devices = [d for d in data.get("devices", []) if d.get("device_id") != req.device_id]
    record = req.model_dump()
    record["registered_at"] = now_iso()
    record["status"] = "REGISTERED_NOT_PHYSICAL_PROVEN"
    devices.append(record)
    data["devices"] = devices
    write_json(path, data)

    receipt = write_receipt("device_registered", {
        "verdict": "LEEWAY_DEVICE_REGISTERED",
        "device": record,
        "note": "Device is registered in the Docker control plane. Physical UI control requires a matching approved adapter.",
    })

    return {"ok": True, "device": record, "receipt": receipt}


@app.get("/devices/list")
def list_devices():
    path = state_file("devices.json")
    data = read_json(path) if path.exists() else {"devices": []}
    return {"ok": True, **data}


@app.post("/channels/register")
def register_channel(req: ChannelRegisterRequest):
    path = state_file("channels.json")
    data = read_json(path) if path.exists() else {"channels": []}
    channels = [c for c in data.get("channels", []) if c.get("channel_name") != req.channel_name]
    record = req.model_dump()
    record["registered_at"] = now_iso()
    channels.append(record)
    data["channels"] = channels
    write_json(path, data)

    receipt = write_receipt("channel_registered", {
        "verdict": "LEEWAY_CHANNEL_REGISTERED",
        "channel_type": req.channel_type,
        "channel_name": req.channel_name,
        "enabled": req.enabled,
    })

    return {"ok": True, "channel": record, "receipt": receipt}


@app.get("/channels/list")
def list_channels():
    path = state_file("channels.json")
    data = read_json(path) if path.exists() else {"channels": []}
    return {"ok": True, **data}


@app.post("/voice/session/start")
def voice_session_start(req: VoiceSessionRequest):
    session = {
        "voice_session_id": f"voice-{int(time.time())}-{uuid.uuid4().hex[:8]}",
        "source": req.source,
        "device_id": req.device_id,
        "mode": req.mode,
        "language": req.language,
        "status": "REQUESTED",
        "note": "This control-plane endpoint records voice session intent. Audio transport remains through Telegram, PWA mic, phone runtime, or voice lane.",
        "created_at": now_iso(),
    }
    append_jsonl(state_file("voice-sessions.jsonl"), session)
    receipt = write_receipt("voice_session_requested", {
        "verdict": "LEEWAY_VOICE_SESSION_REQUESTED",
        "voice_session": session,
    })
    return {"ok": True, "voice_session": session, "receipt": receipt}


@app.post("/device/action/request")
def device_action_request(req: DeviceActionRequest):
    action = req.model_dump()
    action["action_id"] = f"device-action-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    action["created_at"] = now_iso()

    if req.requires_approval:
        approval = call_gateway_approval(req)
        action["approval"] = approval
        action["status"] = "PENDING_APPROVAL"
    else:
        action["status"] = "RECORDED_SAFE_ACTION_NOT_EXECUTED"
        action["note"] = "No physical adapter execution is enabled in v0.1."

    append_jsonl(state_file("device-actions.jsonl"), action)

    receipt = write_receipt("device_action_requested", {
        "verdict": "LEEWAY_DEVICE_ACTION_REQUESTED",
        "action": action,
    })

    return {
        "ok": True,
        "action": action,
        "receipt": receipt,
        "message": "Device action request recorded. Physical execution requires approved adapter lane.",
    }


@app.post("/license/profile")
def license_profile(req: LicenseProfileRequest):
    data = req.model_dump()
    data["licensed"] = True
    data["updated_at"] = now_iso()
    write_json(state_file("license-profile.json"), data)
    receipt = write_receipt("license_profile_recorded", {
        "verdict": "LEEWAY_DEVICE_OPERATOR_LICENSE_PROFILE_RECORDED",
        "license_profile": data,
    })
    return {"ok": True, "license_profile": data, "receipt": receipt}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "lane": APP, "message": "No receipt exists yet."}
    return read_json(path)


# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_device_operator"

    @app.get("/")
    def leeway_standard_root():
        return {
            "ok": True,
            "service": _leeway_service_name,
            "version": "2.1.4",
            "health": "/health",
            "status": "/status",
            "routes": "/routes",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }

    @app.get("/status")
    def leeway_standard_status():
        return {
            "ok": True,
            "status": "running",
            "service": _leeway_service_name,
            "time": datetime.utcnow().isoformat()
        }

    @app.get("/routes")
    def leeway_standard_routes():
        return {
            "ok": True,
            "service": _leeway_service_name,
            "routes": [
                "/",
                "/health",
                "/status",
                "/routes",
                "/docs",
                "/openapi.json",
                "/system-health/report"
            ]
        }

    @app.post("/system-health/report")
    def leeway_system_health_report(payload: Dict[str, Any]):
        return {
            "ok": True,
            "accepted": True,
            "service": _leeway_service_name,
            "receivedAt": datetime.utcnow().isoformat(),
            "message": "System health report received by " + _leeway_service_name,
            "nextAction": "Route this payload to Agent Lee reasoning lane or local assistant bridge."
        }
except Exception as _leeway_patch_error:
    pass
# LEEWAY_STANDARD_OPENAPI_PATCH_END


# LEEWAY_DEVICE_LAYER_163_EXTENSION_START
# Added by 163-patch-leeway-device-operator-missing-routes.ps1
# This extension keeps leeway_device_operator as the master Device Layer.
# It adds registry/contract routes for satellites, IoT, printers, casting, shells, approvals, receipts, network, and admin status.
# Physical execution is intentionally contract-safe until approved satellite runtimes are registered.

from typing import Any, Dict, List, Optional
from fastapi import Body
import os
import json
import uuid
import time
import subprocess
from pathlib import Path

LEEWAY_DEVICE_LAYER_VERSION = "LEEWAY_DEVICE_LAYER_163_EXTENSION_2026-07-05"
LEEWAY_DEVICE_STATE_DIR = Path(os.environ.get("LEEWAY_DEVICE_STATE_DIR", "/device-state"))
LEEWAY_RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

LEEWAY_DEVICE_STATE_DIR.mkdir(parents=True, exist_ok=True)
LEEWAY_RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")

def _json_path(name: str) -> Path:
    return LEEWAY_DEVICE_STATE_DIR / name

def _read_json_file(path: Path, fallback: Any):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return fallback

def _write_json_file(path: Path, obj: Any):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")
    return str(path)

def _receipt(action: str, status: str, payload: Any = None, result: Any = None):
    receipt_id = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:10]}"
    receipt = {
        "receipt_id": receipt_id,
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "time": _now(),
        "action": action,
        "status": status,
        "payload": payload,
        "result": result,
        "device_layer": "leeway_device_operator:5323"
    }
    path = LEEWAY_RECEIPT_DIR / f"{receipt_id}-{action.replace('/', '_')}.json"
    _write_json_file(path, receipt)
    return {"receipt_id": receipt_id, "receipt_path": str(path), "receipt": receipt}

def _devices():
    return _read_json_file(_json_path("devices.json"), {})

def _save_devices(devices: Dict[str, Any]):
    return _write_json_file(_json_path("devices.json"), devices)

def _satellites():
    return _read_json_file(_json_path("satellites.json"), {})

def _save_satellites(satellites: Dict[str, Any]):
    return _write_json_file(_json_path("satellites.json"), satellites)

def _iot_devices():
    return _read_json_file(_json_path("iot-devices.json"), {})

def _save_iot_devices(items: Dict[str, Any]):
    return _write_json_file(_json_path("iot-devices.json"), items)

def _approval_store():
    return _read_json_file(_json_path("approvals.json"), {})

def _save_approval_store(items: Dict[str, Any]):
    return _write_json_file(_json_path("approvals.json"), items)

def _shell_store():
    return _read_json_file(_json_path("shells.json"), {
        "telegram": {"status": "registered_contract", "kind": "remote_control_shell"},
        "whatsapp": {"status": "registered_contract", "kind": "remote_control_shell"},
        "email": {"status": "registered_contract", "kind": "communication_shell"},
        "sms": {"status": "registered_contract", "kind": "phone_shell"}
    })

def _safe_not_executed(message: str, payload: Any = None):
    return {
        "ok": True,
        "executed": False,
        "status": "CONTRACT_REGISTERED_NOT_PHYSICAL_EXECUTION",
        "message": message,
        "payload": payload,
        "time": _now()
    }

def _run_text_command(args: List[str], timeout: int = 5):
    try:
        completed = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return {
            "ok": completed.returncode == 0,
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

@app.get("/devices")
def leeway_devices():
    return {
        "ok": True,
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "devices": _devices(),
        "count": len(_devices()),
        "doctrine": "All computers, phones, tablets, IoT devices, printers, cameras, and casting targets belong under the Device Layer."
    }

@app.get("/devices/{device_id}")
def leeway_device_get(device_id: str):
    devices = _devices()
    device = devices.get(device_id)
    if not device:
        return {"ok": False, "status": "DEVICE_NOT_FOUND", "device_id": device_id}
    return {"ok": True, "device_id": device_id, "device": device}

@app.get("/devices/{device_id}/capabilities")
def leeway_device_capabilities(device_id: str):
    devices = _devices()
    device = devices.get(device_id, {})
    return {
        "ok": True,
        "device_id": device_id,
        "capabilities": device.get("capabilities", []),
        "approval_required": device.get("approval_required", []),
        "status": device.get("status", "unknown")
    }

@app.post("/devices/{device_id}/heartbeat")
def leeway_device_heartbeat(device_id: str, payload: Dict[str, Any] = Body(default={})):
    devices = _devices()
    current = devices.get(device_id, {})
    current.update({
        "device_id": device_id,
        "last_heartbeat": _now(),
        "status": "online",
        "heartbeat_payload": payload
    })
    devices[device_id] = current
    _save_devices(devices)
    rec = _receipt("device_heartbeat", "PASS", payload, {"device_id": device_id})
    return {"ok": True, "device_id": device_id, "status": "online", "receipt": rec}

@app.post("/devices/{device_id}/execute")
def leeway_device_execute(device_id: str, payload: Dict[str, Any] = Body(default={})):
    devices = _devices()
    device = devices.get(device_id, {})
    action = payload.get("action", "unspecified")
    result = _safe_not_executed(
        "Device execution contract received. Physical execution requires a registered satellite and approval policy.",
        {"device_id": device_id, "action": action, "device": device}
    )
    rec = _receipt("device_execute_request", "RECORDED", payload, result)
    return {"ok": True, "device_id": device_id, "action": action, "result": result, "receipt": rec}

@app.get("/devices/{device_id}/screen")
def leeway_device_screen(device_id: str):
    result = _safe_not_executed("Screen route exists. Screen streaming requires registered satellite module.", {"device_id": device_id})
    rec = _receipt("device_screen_request", "RECORDED", {"device_id": device_id}, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/devices/{device_id}/camera")
def leeway_device_camera(device_id: str):
    result = _safe_not_executed("Camera route exists. Camera access requires explicit session permission.", {"device_id": device_id})
    rec = _receipt("device_camera_request", "RECORDED", {"device_id": device_id}, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/devices/{device_id}/location")
def leeway_device_location(device_id: str):
    result = _safe_not_executed("Location route exists. GPS requires mobile satellite permission.", {"device_id": device_id})
    rec = _receipt("device_location_request", "RECORDED", {"device_id": device_id}, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/devices/{device_id}/files")
def leeway_device_files(device_id: str):
    result = _safe_not_executed("Files route exists. File access requires satellite path scope and approval rules.", {"device_id": device_id})
    rec = _receipt("device_files_request", "RECORDED", {"device_id": device_id}, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/devices/{device_id}/apps")
def leeway_device_apps(device_id: str):
    result = _safe_not_executed("Apps route exists. App launching requires registered actuator allowlist.", {"device_id": device_id})
    rec = _receipt("device_apps_request", "RECORDED", {"device_id": device_id}, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/devices/{device_id}/notifications")
def leeway_device_notifications(device_id: str):
    result = _safe_not_executed("Notifications route exists. Push requires mobile companion or shell bridge.", {"device_id": device_id})
    rec = _receipt("device_notifications_request", "RECORDED", {"device_id": device_id}, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/satellites")
def leeway_satellites():
    return {"ok": True, "satellites": _satellites(), "count": len(_satellites())}

@app.post("/satellites/register")
def leeway_satellite_register(payload: Dict[str, Any] = Body(default={})):
    satellites = _satellites()
    satellite_id = payload.get("satellite_id") or payload.get("device_id") or f"satellite-{uuid.uuid4().hex[:8]}"
    payload["satellite_id"] = satellite_id
    payload["registered_at"] = _now()
    payload["status"] = payload.get("status", "registered")
    satellites[satellite_id] = payload
    _save_satellites(satellites)
    rec = _receipt("satellite_register", "PASS", payload, {"satellite_id": satellite_id})
    return {"ok": True, "satellite_id": satellite_id, "satellite": payload, "receipt": rec}

@app.post("/satellites/{device_id}/heartbeat")
def leeway_satellite_heartbeat(device_id: str, payload: Dict[str, Any] = Body(default={})):
    satellites = _satellites()
    current = satellites.get(device_id, {})
    current.update({"device_id": device_id, "status": "online", "last_heartbeat": _now(), "heartbeat_payload": payload})
    satellites[device_id] = current
    _save_satellites(satellites)
    rec = _receipt("satellite_heartbeat", "PASS", payload, {"device_id": device_id})
    return {"ok": True, "device_id": device_id, "status": "online", "receipt": rec}

@app.post("/satellites/{device_id}/execute")
def leeway_satellite_execute(device_id: str, payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Satellite execute route recorded. Physical command relay requires satellite token and approval gate.", {"device_id": device_id, "payload": payload})
    rec = _receipt("satellite_execute_request", "RECORDED", payload, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/iot/discover")
def leeway_iot_discover():
    return {
        "ok": True,
        "route": "/iot/discover",
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "discovery_methods": [
            "manual_registration",
            "mdns_zeroconf_contract",
            "upnp_ssdp_contract",
            "ipp_printer_discovery_contract",
            "tailscale_peer_contract"
        ],
        "discovered": _iot_devices(),
        "note": "Discovery contract route is active. This safe GET route does not write receipts. Active scan is added in the next approved implementation layer."
    }
@app.post("/iot/register")
def leeway_iot_register(payload: Dict[str, Any] = Body(default={})):
    items = _iot_devices()
    device_id = payload.get("device_id") or payload.get("name") or f"iot-{uuid.uuid4().hex[:8]}"
    payload["device_id"] = device_id
    payload["registered_at"] = _now()
    payload["status"] = payload.get("status", "registered")
    items[device_id] = payload
    _save_iot_devices(items)
    rec = _receipt("iot_register", "PASS", payload, {"device_id": device_id})
    return {"ok": True, "device_id": device_id, "iot_device": payload, "receipt": rec}

@app.get("/iot/{device_id}/capabilities")
def leeway_iot_capabilities(device_id: str):
    items = _iot_devices()
    item = items.get(device_id, {})
    return {"ok": True, "device_id": device_id, "capabilities": item.get("capabilities", []), "iot_device": item}

@app.post("/iot/{device_id}/execute")
def leeway_iot_execute(device_id: str, payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("IoT execute route recorded. Physical IoT control requires protocol driver and approval policy.", {"device_id": device_id, "payload": payload})
    rec = _receipt("iot_execute_request", "RECORDED", payload, result)
    return {"ok": True, "device_id": device_id, "result": result, "receipt": rec}

@app.get("/printers/discover")
def leeway_printers_discover():
    return {
        "ok": True,
        "route": "/printers/discover",
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "printer_protocols": [
            "IPP",
            "CUPS",
            "Windows Print Spooler",
            "AirPrint"
        ],
        "printers": _read_json_file(_json_path("printers.json"), {}),
        "note": "Printer discovery contract route is active. This safe GET route does not write receipts. Active IPP/CUPS scan is added in the next approved implementation layer."
    }
@app.get("/printers/{printer_id}/status")
def leeway_printer_status(printer_id: str):
    printers = _read_json_file(_json_path("printers.json"), {})
    printer = printers.get(printer_id, {"printer_id": printer_id, "status": "not_registered"})
    return {"ok": True, "printer_id": printer_id, "printer": printer}

@app.post("/printers/{printer_id}/print")
def leeway_printer_print(printer_id: str, payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Print request recorded. Actual printing requires printer registration and approval.", {"printer_id": printer_id, "payload": payload})
    rec = _receipt("printer_print_request", "APPROVAL_REQUIRED", payload, result)
    return {"ok": True, "printer_id": printer_id, "approval_required": True, "result": result, "receipt": rec}

@app.get("/casting/discover")
def leeway_casting_discover():
    return {
        "ok": True,
        "route": "/casting/discover",
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "casting_protocols": [
            "Chromecast",
            "AirPlay",
            "DLNA_UPnP",
            "HDMI_local"
        ],
        "targets": _read_json_file(_json_path("casting-targets.json"), {}),
        "note": "Casting discovery contract route is active. This safe GET route does not write receipts. Active cast discovery is added in the next approved implementation layer."
    }
@app.post("/casting/{target_id}/cast")
def leeway_cast(target_id: str, payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Cast request recorded. Actual casting requires target registration and approval.", {"target_id": target_id, "payload": payload})
    rec = _receipt("cast_request", "APPROVAL_REQUIRED", payload, result)
    return {"ok": True, "target_id": target_id, "approval_required": True, "result": result, "receipt": rec}

@app.post("/casting/{target_id}/stop")
def leeway_cast_stop(target_id: str, payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Stop cast request recorded. Requires registered casting target.", {"target_id": target_id, "payload": payload})
    rec = _receipt("cast_stop_request", "RECORDED", payload, result)
    return {"ok": True, "target_id": target_id, "result": result, "receipt": rec}

@app.get("/shells")
def leeway_shells():
    return {"ok": True, "shells": _shell_store(), "doctrine": "Shells receive/send messages. Device operator performs device-layer routing."}

@app.get("/shells/telegram/status")
def leeway_telegram_status():
    shells = _shell_store()
    return {"ok": True, "shell": "telegram", "status": shells.get("telegram", {})}

@app.post("/shells/telegram/send")
def leeway_telegram_send(payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Telegram send request recorded. Actual send is delegated to agent-lee-telegram-shell.", payload)
    rec = _receipt("telegram_send_request", "RECORDED", payload, result)
    return {"ok": True, "shell": "telegram", "result": result, "receipt": rec}

@app.get("/shells/whatsapp/status")
def leeway_whatsapp_status():
    shells = _shell_store()
    return {"ok": True, "shell": "whatsapp", "status": shells.get("whatsapp", {})}

@app.post("/shells/whatsapp/send")
def leeway_whatsapp_send(payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("WhatsApp send request recorded. Production should use approved WhatsApp Business API or approved local bridge.", payload)
    rec = _receipt("whatsapp_send_request", "RECORDED", payload, result)
    return {"ok": True, "shell": "whatsapp", "result": result, "receipt": rec}

@app.post("/shells/email/send")
def leeway_email_send(payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Email send request recorded. Send action requires approval unless already approved.", payload)
    rec = _receipt("email_send_request", "APPROVAL_REQUIRED", payload, result)
    return {"ok": True, "shell": "email", "approval_required": True, "result": result, "receipt": rec}

@app.post("/shells/sms/send")
def leeway_sms_send(payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("SMS send request recorded. Send action requires approval and Android/carrier bridge.", payload)
    rec = _receipt("sms_send_request", "APPROVAL_REQUIRED", payload, result)
    return {"ok": True, "shell": "sms", "approval_required": True, "result": result, "receipt": rec}

@app.post("/approval/request")
def leeway_approval_request(payload: Dict[str, Any] = Body(default={})):
    approvals = _approval_store()
    approval_id = payload.get("approval_id") or f"approval-{uuid.uuid4().hex[:12]}"
    approval = {
        "approval_id": approval_id,
        "status": "pending",
        "created_at": _now(),
        "payload": payload
    }
    approvals[approval_id] = approval
    _save_approval_store(approvals)
    rec = _receipt("approval_request", "PENDING", payload, {"approval_id": approval_id})
    return {"ok": True, "approval_id": approval_id, "approval": approval, "receipt": rec}

@app.get("/approval/{approval_id}")
def leeway_approval_get(approval_id: str):
    approvals = _approval_store()
    approval = approvals.get(approval_id)
    if not approval:
        return {"ok": False, "status": "APPROVAL_NOT_FOUND", "approval_id": approval_id}
    return {"ok": True, "approval_id": approval_id, "approval": approval}

@app.post("/approval/{approval_id}/approve")
def leeway_approval_approve(approval_id: str, payload: Dict[str, Any] = Body(default={})):
    approvals = _approval_store()
    approval = approvals.get(approval_id, {"approval_id": approval_id, "created_at": _now(), "payload": {}})
    approval["status"] = "approved"
    approval["decided_at"] = _now()
    approval["decision_payload"] = payload
    approvals[approval_id] = approval
    _save_approval_store(approvals)
    rec = _receipt("approval_approve", "APPROVED", payload, {"approval_id": approval_id})
    return {"ok": True, "approval_id": approval_id, "approval": approval, "receipt": rec}

@app.post("/approval/{approval_id}/deny")
def leeway_approval_deny(approval_id: str, payload: Dict[str, Any] = Body(default={})):
    approvals = _approval_store()
    approval = approvals.get(approval_id, {"approval_id": approval_id, "created_at": _now(), "payload": {}})
    approval["status"] = "denied"
    approval["decided_at"] = _now()
    approval["decision_payload"] = payload
    approvals[approval_id] = approval
    _save_approval_store(approvals)
    rec = _receipt("approval_deny", "DENIED", payload, {"approval_id": approval_id})
    return {"ok": True, "approval_id": approval_id, "approval": approval, "receipt": rec}

@app.get("/receipts")
def leeway_receipts():
    files = sorted([p.name for p in LEEWAY_RECEIPT_DIR.glob("*.json")])[-100:]
    return {"ok": True, "receipt_dir": str(LEEWAY_RECEIPT_DIR), "count": len(files), "receipts": files}

@app.get("/receipts/{receipt_id}")
def leeway_receipt_get(receipt_id: str):
    matches = list(LEEWAY_RECEIPT_DIR.glob(f"*{receipt_id}*.json"))
    if not matches:
        return {"ok": False, "status": "RECEIPT_NOT_FOUND", "receipt_id": receipt_id}
    path = matches[-1]
    return {"ok": True, "receipt_id": receipt_id, "path": str(path), "receipt": _read_json_file(path, {})}

@app.get("/network/tailscale/status")
def leeway_tailscale_status():
    result = _run_text_command(["tailscale", "status", "--json"], timeout=6)
    if result.get("ok"):
        try:
            parsed = json.loads(result.get("stdout") or "{}")
            return {"ok": True, "tailscale": parsed}
        except Exception:
            return {"ok": True, "raw": result}
    return {"ok": False, "status": "TAILSCALE_NOT_AVAILABLE_IN_CONTAINER_OR_NOT_CONFIGURED", "result": result}

@app.get("/network/tailscale/peers")
def leeway_tailscale_peers():
    result = _run_text_command(["tailscale", "status", "--json"], timeout=6)
    if result.get("ok"):
        try:
            parsed = json.loads(result.get("stdout") or "{}")
            return {"ok": True, "self": parsed.get("Self"), "peers": parsed.get("Peer", {})}
        except Exception:
            return {"ok": True, "raw": result}
    return {"ok": False, "status": "TAILSCALE_NOT_AVAILABLE_IN_CONTAINER_OR_NOT_CONFIGURED", "result": result}

@app.post("/network/wol")
def leeway_wake_on_lan(payload: Dict[str, Any] = Body(default={})):
    result = _safe_not_executed("Wake-on-LAN route recorded. Actual WOL requires approved MAC/network driver.", payload)
    rec = _receipt("wake_on_lan_request", "APPROVAL_REQUIRED", payload, result)
    return {"ok": True, "approval_required": True, "result": result, "receipt": rec}

@app.get("/admin/device-layer/status")
def leeway_admin_device_layer_status():
    return {
        "ok": True,
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "master_operator": "leeway_device_operator:5323",
        "state_dir": str(LEEWAY_DEVICE_STATE_DIR),
        "receipt_dir": str(LEEWAY_RECEIPT_DIR),
        "devices": len(_devices()),
        "satellites": len(_satellites()),
        "iot_devices": len(_iot_devices()),
        "shells": list(_shell_store().keys()),
        "doctrine": {
            "windows_is_child_actuator": True,
            "telegram_is_shell": True,
            "whatsapp_is_shell": True,
            "iot_under_device_layer": True,
            "receipts_required": True,
            "approval_required_for_risky_actions": True
        }
    }

@app.get("/admin/device-layer/dashboard-data")
def leeway_admin_device_layer_dashboard_data():
    return {
        "ok": True,
        "version": LEEWAY_DEVICE_LAYER_VERSION,
        "devices": _devices(),
        "satellites": _satellites(),
        "iot": _iot_devices(),
        "shells": _shell_store(),
        "approvals": _approval_store(),
        "receipt_summary": leeway_receipts(),
        "routes_added_by_163": [
            "/devices",
            "/devices/{device_id}",
            "/devices/{device_id}/capabilities",
            "/devices/{device_id}/heartbeat",
            "/devices/{device_id}/execute",
            "/devices/{device_id}/screen",
            "/devices/{device_id}/camera",
            "/devices/{device_id}/location",
            "/devices/{device_id}/files",
            "/devices/{device_id}/apps",
            "/devices/{device_id}/notifications",
            "/satellites",
            "/satellites/register",
            "/satellites/{device_id}/heartbeat",
            "/satellites/{device_id}/execute",
            "/iot/discover",
            "/iot/register",
            "/iot/{device_id}/capabilities",
            "/iot/{device_id}/execute",
            "/printers/discover",
            "/printers/{printer_id}/status",
            "/printers/{printer_id}/print",
            "/casting/discover",
            "/casting/{target_id}/cast",
            "/casting/{target_id}/stop",
            "/shells",
            "/shells/telegram/status",
            "/shells/telegram/send",
            "/shells/whatsapp/status",
            "/shells/whatsapp/send",
            "/shells/email/send",
            "/shells/sms/send",
            "/approval/request",
            "/approval/{approval_id}",
            "/approval/{approval_id}/approve",
            "/approval/{approval_id}/deny",
            "/receipts",
            "/receipts/{receipt_id}",
            "/network/tailscale/status",
            "/network/tailscale/peers",
            "/network/wol",
            "/admin/device-layer/status",
            "/admin/device-layer/dashboard-data"
        ]
    }

# LEEWAY_DEVICE_LAYER_163_EXTENSION_END




# LEEWAY_IOT_READ_ONLY_ROUTES_PATCH_218G
# GET-only IoT routes. No IoT control, pairing, printing, casting, shell, or physical action.
_LEEWAY_IOT_REGISTRY_HOST_PATH_218G = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-iot\latest\iot-registry-latest.json"
_LEEWAY_IOT_POLICY_HOST_PATH_218G = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-iot\latest\iot-approval-policy-latest.json"
_LEEWAY_IOT_CONTRACT_HOST_PATH_218G = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-iot\latest\iot-capability-contract-latest.json"
def _leeway_iot_devices_218g():
    return []
@app.get("/iot/status")
def leeway_iot_status_218g():
    devices = _leeway_iot_devices_218g()
    return {"ok": True, "family": "iot", "mode": "READ_ONLY_NO_CONTROL", "patch": "LEEWAY_IOT_READ_ONLY_ROUTES_PATCH_218G", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "devices_route_present": True, "discovered_count": len(devices), "control_enabled": False, "approval_required_for_control": True, "registry_path": _LEEWAY_IOT_REGISTRY_HOST_PATH_218G, "policy_path": _LEEWAY_IOT_POLICY_HOST_PATH_218G, "contract_path": _LEEWAY_IOT_CONTRACT_HOST_PATH_218G, "physical_action_executed": False, "iot_action_executed": False, "device_state_changed": False}
@app.get("/iot/registry")
def leeway_iot_registry_218g():
    return {"ok": True, "family": "iot", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "discovery_ok": True, "discovered_count": 0, "normalized_devices": [], "control_enabled": False, "approval_required": True, "source_path": _LEEWAY_IOT_REGISTRY_HOST_PATH_218G, "physical_action_executed": False, "iot_action_executed": False, "device_state_changed": False, "note": "Read-only route. No IoT control action executed."}
@app.get("/iot/devices")
def leeway_iot_devices_route_218g():
    devices = _leeway_iot_devices_218g()
    return {"ok": True, "family": "iot", "count": len(devices), "devices": devices, "control_enabled": False, "source_path": _LEEWAY_IOT_REGISTRY_HOST_PATH_218G, "physical_action_executed": False, "iot_action_executed": False, "device_state_changed": False}



# LEEWAY_PRINTER_READ_ONLY_ROUTES_PATCH_223
# GET-only printer routes. No print jobs, queue mutation, spooler mutation, driver install, or physical action.
_LEEWAY_PRINTER_REGISTRY_HOST_PATH_223 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-printers\latest\printer-registry-latest.json"
_LEEWAY_PRINTER_POLICY_HOST_PATH_223 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-printers\latest\printer-approval-policy-latest.json"
_LEEWAY_PRINTER_CONTRACT_HOST_PATH_223 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-printers\latest\printer-capability-contract-latest.json"
def _leeway_printer_discovered_count_223():
    try:
        data = leeway_printers_discover()
        for key in ["printers", "devices", "items"]:
            value = data.get(key)
            if isinstance(value, list):
                return len(value)
    except Exception:
        pass
    return 0
def _leeway_printer_registry_payload_223():
    count = _leeway_printer_discovered_count_223()
    return {"version": "LEEWAY_PRINTER_READ_ONLY_ROUTES_PATCH_223", "family": "printers", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "discovered_count": count, "normalized_printers": [], "control_enabled": False, "approval_required_for_print": True, "physical_action_executed": False, "print_job_sent": False, "queue_mutated": False, "spooler_mutated": False, "driver_installed": False, "note": "Read-only route. No print job or printer mutation executed."}
@app.get("/printers/status")
def leeway_printers_status_223():
    count = _leeway_printer_discovered_count_223()
    return {"ok": True, "family": "printers", "mode": "READ_ONLY_NO_PRINT", "patch": "LEEWAY_PRINTER_READ_ONLY_ROUTES_PATCH_223", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "discovered_count": count, "control_enabled": False, "approval_required_for_print": True, "registry_path": _LEEWAY_PRINTER_REGISTRY_HOST_PATH_223, "policy_path": _LEEWAY_PRINTER_POLICY_HOST_PATH_223, "contract_path": _LEEWAY_PRINTER_CONTRACT_HOST_PATH_223, "physical_action_executed": False, "print_job_sent": False, "queue_mutated": False, "spooler_mutated": False, "driver_installed": False}
@app.get("/printers/registry")
def leeway_printers_registry_223():
    payload = _leeway_printer_registry_payload_223()
    payload["ok"] = True
    payload["source_path"] = _LEEWAY_PRINTER_REGISTRY_HOST_PATH_223
    return payload



# LEEWAY_CASTING_READ_ONLY_ROUTES_PATCH_228
# GET-only casting routes. No cast start, cast stop, pairing, TV wake, input switch, or display mutation.
_LEEWAY_CASTING_REGISTRY_HOST_PATH_228 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-casting\latest\casting-registry-latest.json"
_LEEWAY_CASTING_POLICY_HOST_PATH_228 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-casting\latest\casting-approval-policy-latest.json"
_LEEWAY_CASTING_CONTRACT_HOST_PATH_228 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-casting\latest\casting-capability-contract-latest.json"
def _leeway_casting_discovered_count_228():
    try:
        data = leeway_casting_discover()
        for key in ["targets", "devices", "items", "displays"]:
            value = data.get(key)
            if isinstance(value, list):
                return len(value)
    except Exception:
        pass
    return 0
def _leeway_casting_registry_payload_228():
    count = _leeway_casting_discovered_count_228()
    return {"version": "LEEWAY_CASTING_READ_ONLY_ROUTES_PATCH_228", "family": "casting", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "discovered_count": count, "normalized_targets": [], "control_enabled": False, "approval_required_for_cast": True, "physical_action_executed": False, "cast_session_started": False, "cast_session_stopped": False, "pairing_requested": False, "display_mutated": False, "tv_wake_sent": False, "input_switched": False, "note": "Read-only route. No cast or display mutation executed."}
@app.get("/casting/status")
def leeway_casting_status_228():
    count = _leeway_casting_discovered_count_228()
    return {"ok": True, "family": "casting", "mode": "READ_ONLY_NO_CAST", "patch": "LEEWAY_CASTING_READ_ONLY_ROUTES_PATCH_228", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "discovered_count": count, "control_enabled": False, "approval_required_for_cast": True, "registry_path": _LEEWAY_CASTING_REGISTRY_HOST_PATH_228, "policy_path": _LEEWAY_CASTING_POLICY_HOST_PATH_228, "contract_path": _LEEWAY_CASTING_CONTRACT_HOST_PATH_228, "physical_action_executed": False, "cast_session_started": False, "cast_session_stopped": False, "pairing_requested": False, "display_mutated": False, "tv_wake_sent": False, "input_switched": False}
@app.get("/casting/registry")
def leeway_casting_registry_228():
    payload = _leeway_casting_registry_payload_228()
    payload["ok"] = True
    payload["source_path"] = _LEEWAY_CASTING_REGISTRY_HOST_PATH_228
    return payload



# LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233
# GET-only audio/vision routes. No camera activation, microphone activation, speaker playback, capture, recording, or permission mutation.
_LEEWAY_AUDIO_VISION_REGISTRY_HOST_PATH_233 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-audio-vision\latest\audio-vision-registry-latest.json"
_LEEWAY_AUDIO_VISION_POLICY_HOST_PATH_233 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-audio-vision\latest\audio-vision-approval-policy-latest.json"
_LEEWAY_AUDIO_VISION_CONTRACT_HOST_PATH_233 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-audio-vision\latest\audio-vision-capability-contract-latest.json"
def _leeway_audio_vision_empty_devices_233():
    return {"cameras": [], "microphones": [], "speakers": [], "normalized_devices": []}
def _leeway_audio_vision_counts_233():
    devices = _leeway_audio_vision_empty_devices_233()
    camera_count = len(devices["cameras"])
    microphone_count = len(devices["microphones"])
    speaker_count = len(devices["speakers"])
    return camera_count, microphone_count, speaker_count, camera_count + microphone_count + speaker_count
@app.get("/audio-vision/discover")
def leeway_audio_vision_discover_233():
    camera_count, microphone_count, speaker_count, total = _leeway_audio_vision_counts_233()
    devices = _leeway_audio_vision_empty_devices_233()
    return {"ok": True, "family": "audio_vision", "mode": "READ_ONLY_NO_CAPTURE", "patch": "LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233", "discovered_count": total, "camera_count": camera_count, "microphone_count": microphone_count, "speaker_count": speaker_count, "cameras": devices["cameras"], "microphones": devices["microphones"], "speakers": devices["speakers"], "normalized_devices": devices["normalized_devices"], "control_enabled": False, "camera_stream_started": False, "microphone_stream_started": False, "speaker_playback_started": False, "recording_started": False, "permission_mutated": False, "default_device_mutated": False, "note": "Read-only stub. No camera, microphone, speaker, capture, playback, or recording was activated."}
@app.get("/audio-vision/status")
def leeway_audio_vision_status_233():
    camera_count, microphone_count, speaker_count, total = _leeway_audio_vision_counts_233()
    return {"ok": True, "family": "audio_vision", "mode": "READ_ONLY_NO_CAPTURE", "patch": "LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "discovered_count": total, "camera_count": camera_count, "microphone_count": microphone_count, "speaker_count": speaker_count, "control_enabled": False, "approval_required_for_capture": True, "approval_required_for_playback": True, "registry_path": _LEEWAY_AUDIO_VISION_REGISTRY_HOST_PATH_233, "policy_path": _LEEWAY_AUDIO_VISION_POLICY_HOST_PATH_233, "contract_path": _LEEWAY_AUDIO_VISION_CONTRACT_HOST_PATH_233, "physical_action_executed": False, "camera_stream_started": False, "microphone_stream_started": False, "speaker_playback_started": False, "recording_started": False, "permission_mutated": False, "default_device_mutated": False}
@app.get("/audio-vision/registry")
def leeway_audio_vision_registry_233():
    camera_count, microphone_count, speaker_count, total = _leeway_audio_vision_counts_233()
    devices = _leeway_audio_vision_empty_devices_233()
    return {"ok": True, "family": "audio_vision", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233", "discovered_count": total, "camera_count": camera_count, "microphone_count": microphone_count, "speaker_count": speaker_count, "normalized_devices": devices["normalized_devices"], "control_enabled": False, "physical_action_executed": False, "camera_stream_started": False, "microphone_stream_started": False, "speaker_playback_started": False, "recording_started": False, "permission_mutated": False, "default_device_mutated": False, "source_path": _LEEWAY_AUDIO_VISION_REGISTRY_HOST_PATH_233}
@app.get("/cameras/discover")
def leeway_cameras_discover_233():
    return {"ok": True, "family": "audio_vision", "device_type": "cameras", "mode": "READ_ONLY_NO_CAPTURE", "patch": "LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233", "count": 0, "cameras": [], "control_enabled": False, "camera_stream_started": False, "recording_started": False, "permission_mutated": False, "physical_action_executed": False, "note": "Read-only stub. Camera not opened."}
@app.get("/microphones/discover")
def leeway_microphones_discover_233():
    return {"ok": True, "family": "audio_vision", "device_type": "microphones", "mode": "READ_ONLY_NO_CAPTURE", "patch": "LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233", "count": 0, "microphones": [], "control_enabled": False, "microphone_stream_started": False, "recording_started": False, "permission_mutated": False, "physical_action_executed": False, "note": "Read-only stub. Microphone not opened."}
@app.get("/speakers/discover")
def leeway_speakers_discover_233():
    return {"ok": True, "family": "audio_vision", "device_type": "speakers", "mode": "READ_ONLY_NO_CAPTURE", "patch": "LEEWAY_AUDIO_VISION_READ_ONLY_ROUTES_PATCH_233", "count": 0, "speakers": [], "control_enabled": False, "speaker_playback_started": False, "permission_mutated": False, "physical_action_executed": False, "note": "Read-only stub. Speaker playback not started."}



# LEEWAY_ANDROID_READ_ONLY_ROUTES_PATCH_238
# GET-only Android routes. No ADB, no phone connection, no shell command, no tap/swipe/text/call/file/app/permission/device mutation.
_LEEWAY_ANDROID_REGISTRY_HOST_PATH_238 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-android\latest\android-registry-latest.json"
_LEEWAY_ANDROID_POLICY_HOST_PATH_238 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-android\latest\android-approval-policy-latest.json"
_LEEWAY_ANDROID_CONTRACT_HOST_PATH_238 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-android\latest\android-device-shell-actuator-contract-latest.json"
_LEEWAY_ANDROID_SHELL_CONTRACT_HOST_PATH_238 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-android\latest\android-shell-command-contract-latest.json"
def _leeway_android_empty_devices_238():
    return {"android_devices": [], "normalized_devices": []}
def _leeway_android_count_238():
    devices = _leeway_android_empty_devices_238()
    return len(devices["android_devices"])
@app.get("/android/discover")
def leeway_android_discover_238():
    devices = _leeway_android_empty_devices_238()
    count = _leeway_android_count_238()
    return {"ok": True, "family": "android", "mode": "READ_ONLY_NO_ADB", "patch": "LEEWAY_ANDROID_READ_ONLY_ROUTES_PATCH_238", "discovered_count": count, "android_devices": devices["android_devices"], "normalized_devices": devices["normalized_devices"], "adb_invoked": False, "phone_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "shell_command_executed": False, "tap_executed": False, "swipe_executed": False, "text_sent": False, "call_started": False, "file_read": False, "app_installed": False, "permission_mutated": False, "device_mutated": False, "note": "Read-only stub. ADB was not invoked and no phone was connected."}
@app.get("/android/status")
def leeway_android_status_238():
    count = _leeway_android_count_238()
    return {"ok": True, "family": "android", "mode": "READ_ONLY_NO_ADB", "patch": "LEEWAY_ANDROID_READ_ONLY_ROUTES_PATCH_238", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "shell_status_route_present": True, "actuator_status_route_present": True, "discovered_count": count, "adb_available": False, "adb_invoked": False, "phone_connected": False, "shell_enabled": False, "actuator_enabled": False, "approval_required_for_shell": True, "approval_required_for_actuator": True, "registry_path": _LEEWAY_ANDROID_REGISTRY_HOST_PATH_238, "policy_path": _LEEWAY_ANDROID_POLICY_HOST_PATH_238, "contract_path": _LEEWAY_ANDROID_CONTRACT_HOST_PATH_238, "shell_contract_path": _LEEWAY_ANDROID_SHELL_CONTRACT_HOST_PATH_238, "physical_action_executed": False, "shell_command_executed": False, "tap_executed": False, "swipe_executed": False, "text_sent": False, "call_started": False, "file_read": False, "app_installed": False, "permission_mutated": False, "device_mutated": False}
@app.get("/android/registry")
def leeway_android_registry_238():
    devices = _leeway_android_empty_devices_238()
    count = _leeway_android_count_238()
    return {"ok": True, "family": "android", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_ANDROID_READ_ONLY_ROUTES_PATCH_238", "discovered_count": count, "normalized_devices": devices["normalized_devices"], "android_devices": devices["android_devices"], "adb_invoked": False, "phone_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "source_path": _LEEWAY_ANDROID_REGISTRY_HOST_PATH_238}
@app.get("/android/shell/status")
def leeway_android_shell_status_238():
    return {"ok": True, "family": "android", "shell_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_ADB", "patch": "LEEWAY_ANDROID_READ_ONLY_ROUTES_PATCH_238", "adb_invoked": False, "phone_connected": False, "shell_enabled": False, "approval_required": True, "shell_command_executed": False, "physical_action_executed": False, "note": "Shell status only. No ADB or shell command executed."}
@app.get("/android/actuator/status")
def leeway_android_actuator_status_238():
    return {"ok": True, "family": "android", "actuator_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_ADB", "patch": "LEEWAY_ANDROID_READ_ONLY_ROUTES_PATCH_238", "adb_invoked": False, "phone_connected": False, "actuator_enabled": False, "approval_required": True, "physical_action_executed": False, "tap_executed": False, "swipe_executed": False, "text_sent": False, "call_started": False, "file_read": False, "app_installed": False, "permission_mutated": False, "device_mutated": False, "note": "Actuator status only. No Android physical action executed."}



# LEEWAY_IOS_READ_ONLY_ROUTES_PATCH_243
# GET-only iOS routes. No libimobiledevice, no idevice tools, no phone connection, no pairing/trust, no shell command, no tap/swipe/text/call/file/backup/app/permission/device mutation.
_LEEWAY_IOS_REGISTRY_HOST_PATH_243 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-ios\latest\ios-registry-latest.json"
_LEEWAY_IOS_POLICY_HOST_PATH_243 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-ios\latest\ios-approval-policy-latest.json"
_LEEWAY_IOS_CONTRACT_HOST_PATH_243 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-ios\latest\ios-device-shell-actuator-contract-latest.json"
_LEEWAY_IOS_SHELL_CONTRACT_HOST_PATH_243 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-ios\latest\ios-shell-command-contract-latest.json"
def _leeway_ios_empty_devices_243():
    return {"ios_devices": [], "normalized_devices": []}
def _leeway_ios_count_243():
    devices = _leeway_ios_empty_devices_243()
    return len(devices["ios_devices"])
@app.get("/ios/discover")
def leeway_ios_discover_243():
    devices = _leeway_ios_empty_devices_243()
    count = _leeway_ios_count_243()
    return {"ok": True, "family": "ios", "mode": "READ_ONLY_NO_IOS_TOOL", "patch": "LEEWAY_IOS_READ_ONLY_ROUTES_PATCH_243", "discovered_count": count, "ios_devices": devices["ios_devices"], "normalized_devices": devices["normalized_devices"], "libimobiledevice_invoked": False, "idevice_tools_invoked": False, "phone_connected": False, "pairing_started": False, "trust_prompt_started": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "shell_command_executed": False, "tap_executed": False, "swipe_executed": False, "text_sent": False, "call_started": False, "file_read": False, "backup_started": False, "app_installed": False, "permission_mutated": False, "device_mutated": False, "note": "Read-only stub. iOS tools were not invoked and no iPhone was connected."}
@app.get("/ios/status")
def leeway_ios_status_243():
    count = _leeway_ios_count_243()
    return {"ok": True, "family": "ios", "mode": "READ_ONLY_NO_IOS_TOOL", "patch": "LEEWAY_IOS_READ_ONLY_ROUTES_PATCH_243", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "shell_status_route_present": True, "actuator_status_route_present": True, "discovered_count": count, "libimobiledevice_available": False, "libimobiledevice_invoked": False, "idevice_tools_invoked": False, "phone_connected": False, "pairing_started": False, "trust_prompt_started": False, "shell_enabled": False, "actuator_enabled": False, "approval_required_for_shell": True, "approval_required_for_actuator": True, "approval_required_for_pairing": True, "approval_required_for_backup": True, "registry_path": _LEEWAY_IOS_REGISTRY_HOST_PATH_243, "policy_path": _LEEWAY_IOS_POLICY_HOST_PATH_243, "contract_path": _LEEWAY_IOS_CONTRACT_HOST_PATH_243, "shell_contract_path": _LEEWAY_IOS_SHELL_CONTRACT_HOST_PATH_243, "physical_action_executed": False, "shell_command_executed": False, "tap_executed": False, "swipe_executed": False, "text_sent": False, "call_started": False, "file_read": False, "backup_started": False, "app_installed": False, "permission_mutated": False, "device_mutated": False}
@app.get("/ios/registry")
def leeway_ios_registry_243():
    devices = _leeway_ios_empty_devices_243()
    count = _leeway_ios_count_243()
    return {"ok": True, "family": "ios", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_IOS_READ_ONLY_ROUTES_PATCH_243", "discovered_count": count, "normalized_devices": devices["normalized_devices"], "ios_devices": devices["ios_devices"], "libimobiledevice_invoked": False, "idevice_tools_invoked": False, "phone_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "source_path": _LEEWAY_IOS_REGISTRY_HOST_PATH_243}
@app.get("/ios/shell/status")
def leeway_ios_shell_status_243():
    return {"ok": True, "family": "ios", "shell_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_IOS_TOOL", "patch": "LEEWAY_IOS_READ_ONLY_ROUTES_PATCH_243", "libimobiledevice_invoked": False, "idevice_tools_invoked": False, "phone_connected": False, "shell_enabled": False, "approval_required": True, "shell_command_executed": False, "physical_action_executed": False, "note": "Shell status only. No iOS tool or shell command executed."}
@app.get("/ios/actuator/status")
def leeway_ios_actuator_status_243():
    return {"ok": True, "family": "ios", "actuator_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_IOS_TOOL", "patch": "LEEWAY_IOS_READ_ONLY_ROUTES_PATCH_243", "libimobiledevice_invoked": False, "idevice_tools_invoked": False, "phone_connected": False, "actuator_enabled": False, "approval_required": True, "physical_action_executed": False, "tap_executed": False, "swipe_executed": False, "text_sent": False, "call_started": False, "file_read": False, "backup_started": False, "app_installed": False, "permission_mutated": False, "device_mutated": False, "note": "Actuator status only. No iOS physical action executed."}



# LEEWAY_LINUX_READ_ONLY_ROUTES_PATCH_248
# GET-only Linux routes. No SSH, no shell command, no remote host connection, no file/app/UI/process/system mutation.
_LEEWAY_LINUX_REGISTRY_HOST_PATH_248 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-linux\latest\linux-registry-latest.json"
_LEEWAY_LINUX_POLICY_HOST_PATH_248 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-linux\latest\linux-approval-policy-latest.json"
_LEEWAY_LINUX_CONTRACT_HOST_PATH_248 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-linux\latest\linux-actuator-contract-latest.json"
_LEEWAY_LINUX_SHELL_CONTRACT_HOST_PATH_248 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-linux\latest\linux-shell-command-contract-latest.json"
def _leeway_linux_empty_devices_248():
    return {"linux_devices": [], "normalized_devices": []}
def _leeway_linux_count_248():
    devices = _leeway_linux_empty_devices_248()
    return len(devices["linux_devices"])
@app.get("/linux/discover")
def leeway_linux_discover_248():
    devices = _leeway_linux_empty_devices_248()
    count = _leeway_linux_count_248()
    return {"ok": True, "family": "linux", "mode": "READ_ONLY_NO_SHELL", "patch": "LEEWAY_LINUX_READ_ONLY_ROUTES_PATCH_248", "discovered_count": count, "linux_devices": devices["linux_devices"], "normalized_devices": devices["normalized_devices"], "ssh_invoked": False, "shell_invoked": False, "remote_host_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "shell_command_executed": False, "ssh_command_executed": False, "file_read": False, "file_written": False, "app_opened": False, "click_executed": False, "text_entry_executed": False, "hotkey_executed": False, "process_mutated": False, "system_mutated": False, "note": "Read-only stub. No SSH, shell command, or Linux host connection executed."}
@app.get("/linux/status")
def leeway_linux_status_248():
    count = _leeway_linux_count_248()
    return {"ok": True, "family": "linux", "mode": "READ_ONLY_NO_SHELL", "patch": "LEEWAY_LINUX_READ_ONLY_ROUTES_PATCH_248", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "shell_status_route_present": True, "actuator_status_route_present": True, "discovered_count": count, "ssh_available": False, "ssh_invoked": False, "shell_invoked": False, "remote_host_connected": False, "shell_enabled": False, "actuator_enabled": False, "approval_required_for_shell": True, "approval_required_for_actuator": True, "registry_path": _LEEWAY_LINUX_REGISTRY_HOST_PATH_248, "policy_path": _LEEWAY_LINUX_POLICY_HOST_PATH_248, "contract_path": _LEEWAY_LINUX_CONTRACT_HOST_PATH_248, "shell_contract_path": _LEEWAY_LINUX_SHELL_CONTRACT_HOST_PATH_248, "physical_action_executed": False, "shell_command_executed": False, "ssh_command_executed": False, "file_read": False, "file_written": False, "app_opened": False, "click_executed": False, "text_entry_executed": False, "hotkey_executed": False, "process_mutated": False, "system_mutated": False}
@app.get("/linux/registry")
def leeway_linux_registry_248():
    devices = _leeway_linux_empty_devices_248()
    count = _leeway_linux_count_248()
    return {"ok": True, "family": "linux", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_LINUX_READ_ONLY_ROUTES_PATCH_248", "discovered_count": count, "normalized_devices": devices["normalized_devices"], "linux_devices": devices["linux_devices"], "ssh_invoked": False, "shell_invoked": False, "remote_host_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "source_path": _LEEWAY_LINUX_REGISTRY_HOST_PATH_248}
@app.get("/linux/shell/status")
def leeway_linux_shell_status_248():
    return {"ok": True, "family": "linux", "shell_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_SHELL", "patch": "LEEWAY_LINUX_READ_ONLY_ROUTES_PATCH_248", "ssh_invoked": False, "shell_invoked": False, "remote_host_connected": False, "shell_enabled": False, "approval_required": True, "shell_command_executed": False, "ssh_command_executed": False, "physical_action_executed": False, "note": "Shell status only. No SSH or shell command executed."}
@app.get("/linux/actuator/status")
def leeway_linux_actuator_status_248():
    return {"ok": True, "family": "linux", "actuator_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_SHELL", "patch": "LEEWAY_LINUX_READ_ONLY_ROUTES_PATCH_248", "ssh_invoked": False, "shell_invoked": False, "remote_host_connected": False, "actuator_enabled": False, "approval_required": True, "physical_action_executed": False, "app_opened": False, "click_executed": False, "text_entry_executed": False, "hotkey_executed": False, "file_read": False, "file_written": False, "process_mutated": False, "system_mutated": False, "note": "Actuator status only. No Linux physical/system action executed."}



# LEEWAY_MACOS_READ_ONLY_ROUTES_PATCH_253
# GET-only macOS routes. No SSH, no shell command, no AppleScript, no remote host connection, no file/app/UI/accessibility/process/system mutation.
_LEEWAY_MACOS_REGISTRY_HOST_PATH_253 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-macos\latest\macos-registry-latest.json"
_LEEWAY_MACOS_POLICY_HOST_PATH_253 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-macos\latest\macos-approval-policy-latest.json"
_LEEWAY_MACOS_CONTRACT_HOST_PATH_253 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-macos\latest\macos-actuator-contract-latest.json"
_LEEWAY_MACOS_SHELL_CONTRACT_HOST_PATH_253 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-macos\latest\macos-shell-command-contract-latest.json"
def _leeway_macos_empty_devices_253():
    return {"macos_devices": [], "normalized_devices": []}
def _leeway_macos_count_253():
    devices = _leeway_macos_empty_devices_253()
    return len(devices["macos_devices"])
@app.get("/macos/discover")
def leeway_macos_discover_253():
    devices = _leeway_macos_empty_devices_253()
    count = _leeway_macos_count_253()
    return {"ok": True, "family": "macos", "mode": "READ_ONLY_NO_SHELL_APPLESCRIPT", "patch": "LEEWAY_MACOS_READ_ONLY_ROUTES_PATCH_253", "discovered_count": count, "macos_devices": devices["macos_devices"], "normalized_devices": devices["normalized_devices"], "ssh_invoked": False, "shell_invoked": False, "applescript_invoked": False, "remote_host_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "shell_command_executed": False, "ssh_command_executed": False, "applescript_command_executed": False, "file_read": False, "file_written": False, "app_opened": False, "click_executed": False, "text_entry_executed": False, "hotkey_executed": False, "process_mutated": False, "system_mutated": False, "accessibility_mutated": False, "note": "Read-only stub. No SSH, shell, AppleScript, or macOS host connection executed."}
@app.get("/macos/status")
def leeway_macos_status_253():
    count = _leeway_macos_count_253()
    return {"ok": True, "family": "macos", "mode": "READ_ONLY_NO_SHELL_APPLESCRIPT", "patch": "LEEWAY_MACOS_READ_ONLY_ROUTES_PATCH_253", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "shell_status_route_present": True, "actuator_status_route_present": True, "discovered_count": count, "ssh_available": False, "applescript_available": False, "ssh_invoked": False, "shell_invoked": False, "applescript_invoked": False, "remote_host_connected": False, "shell_enabled": False, "actuator_enabled": False, "approval_required_for_shell": True, "approval_required_for_applescript": True, "approval_required_for_actuator": True, "registry_path": _LEEWAY_MACOS_REGISTRY_HOST_PATH_253, "policy_path": _LEEWAY_MACOS_POLICY_HOST_PATH_253, "contract_path": _LEEWAY_MACOS_CONTRACT_HOST_PATH_253, "shell_contract_path": _LEEWAY_MACOS_SHELL_CONTRACT_HOST_PATH_253, "physical_action_executed": False, "shell_command_executed": False, "ssh_command_executed": False, "applescript_command_executed": False, "file_read": False, "file_written": False, "app_opened": False, "click_executed": False, "text_entry_executed": False, "hotkey_executed": False, "process_mutated": False, "system_mutated": False, "accessibility_mutated": False}
@app.get("/macos/registry")
def leeway_macos_registry_253():
    devices = _leeway_macos_empty_devices_253()
    count = _leeway_macos_count_253()
    return {"ok": True, "family": "macos", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_MACOS_READ_ONLY_ROUTES_PATCH_253", "discovered_count": count, "normalized_devices": devices["normalized_devices"], "macos_devices": devices["macos_devices"], "ssh_invoked": False, "shell_invoked": False, "applescript_invoked": False, "remote_host_connected": False, "shell_enabled": False, "actuator_enabled": False, "physical_action_executed": False, "source_path": _LEEWAY_MACOS_REGISTRY_HOST_PATH_253}
@app.get("/macos/shell/status")
def leeway_macos_shell_status_253():
    return {"ok": True, "family": "macos", "shell_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_SHELL_APPLESCRIPT", "patch": "LEEWAY_MACOS_READ_ONLY_ROUTES_PATCH_253", "ssh_invoked": False, "shell_invoked": False, "applescript_invoked": False, "remote_host_connected": False, "shell_enabled": False, "approval_required": True, "shell_command_executed": False, "ssh_command_executed": False, "applescript_command_executed": False, "physical_action_executed": False, "note": "Shell status only. No SSH, shell command, or AppleScript executed."}
@app.get("/macos/actuator/status")
def leeway_macos_actuator_status_253():
    return {"ok": True, "family": "macos", "actuator_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_SHELL_APPLESCRIPT", "patch": "LEEWAY_MACOS_READ_ONLY_ROUTES_PATCH_253", "ssh_invoked": False, "shell_invoked": False, "applescript_invoked": False, "remote_host_connected": False, "actuator_enabled": False, "approval_required": True, "physical_action_executed": False, "app_opened": False, "click_executed": False, "text_entry_executed": False, "hotkey_executed": False, "file_read": False, "file_written": False, "process_mutated": False, "system_mutated": False, "accessibility_mutated": False, "note": "Actuator status only. No macOS physical/system/accessibility action executed."}



# LEEWAY_NETWORK_MESH_READ_ONLY_ROUTES_PATCH_258
# GET-only network mesh and Tailscale policy routes. No Tailscale CLI/API, no auth, no tailnet join, no ACL/firewall/DNS/route/tunnel/network mutation.
_LEEWAY_NETWORK_MESH_REGISTRY_HOST_PATH_258 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-network-mesh\latest\network-mesh-registry-latest.json"
_LEEWAY_NETWORK_MESH_POLICY_HOST_PATH_258 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-network-mesh\latest\network-mesh-tailscale-policy-latest.json"
_LEEWAY_NETWORK_MESH_CONTRACT_HOST_PATH_258 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-network-mesh\latest\network-mesh-tailscale-contract-latest.json"
def _leeway_network_mesh_empty_nodes_258():
    return {"nodes": [], "normalized_nodes": []}
def _leeway_network_mesh_count_258():
    nodes = _leeway_network_mesh_empty_nodes_258()
    return len(nodes["nodes"])
@app.get("/network-mesh/discover")
def leeway_network_mesh_discover_258():
    nodes = _leeway_network_mesh_empty_nodes_258()
    count = _leeway_network_mesh_count_258()
    return {"ok": True, "family": "network_mesh", "mode": "READ_ONLY_NO_TAILSCALE_EXECUTE", "patch": "LEEWAY_NETWORK_MESH_READ_ONLY_ROUTES_PATCH_258", "discovered_count": count, "nodes": nodes["nodes"], "normalized_nodes": nodes["normalized_nodes"], "tailscale_cli_invoked": False, "tailscale_api_invoked": False, "tailnet_authenticated": False, "tailnet_joined": False, "acl_changed": False, "route_advertised": False, "exit_node_enabled": False, "subnet_router_enabled": False, "firewall_mutated": False, "dns_mutated": False, "network_settings_mutated": False, "tunnel_started": False, "network_mutation_executed": False, "physical_action_executed": False, "note": "Read-only stub. No Tailscale CLI/API, tailnet auth, ACL, route, tunnel, firewall, DNS, or network mutation executed."}
@app.get("/network-mesh/status")
def leeway_network_mesh_status_258():
    count = _leeway_network_mesh_count_258()
    return {"ok": True, "family": "network_mesh", "mode": "READ_ONLY_NO_TAILSCALE_EXECUTE", "patch": "LEEWAY_NETWORK_MESH_READ_ONLY_ROUTES_PATCH_258", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "tailscale_status_route_present": True, "tailscale_policy_route_present": True, "discovered_count": count, "tailscale_available": False, "tailscale_cli_invoked": False, "tailscale_api_invoked": False, "tailnet_authenticated": False, "tailnet_joined": False, "acl_changed": False, "route_advertised": False, "exit_node_enabled": False, "subnet_router_enabled": False, "firewall_mutated": False, "dns_mutated": False, "network_settings_mutated": False, "tunnel_started": False, "network_mutation_executed": False, "approval_required_for_tailscale": True, "approval_required_for_network_mutation": True, "registry_path": _LEEWAY_NETWORK_MESH_REGISTRY_HOST_PATH_258, "policy_path": _LEEWAY_NETWORK_MESH_POLICY_HOST_PATH_258, "contract_path": _LEEWAY_NETWORK_MESH_CONTRACT_HOST_PATH_258}
@app.get("/network-mesh/registry")
def leeway_network_mesh_registry_258():
    nodes = _leeway_network_mesh_empty_nodes_258()
    count = _leeway_network_mesh_count_258()
    return {"ok": True, "family": "network_mesh", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_NETWORK_MESH_READ_ONLY_ROUTES_PATCH_258", "discovered_count": count, "normalized_nodes": nodes["normalized_nodes"], "nodes": nodes["nodes"], "tailscale_cli_invoked": False, "tailscale_api_invoked": False, "tailnet_authenticated": False, "tailnet_joined": False, "network_mutation_executed": False, "source_path": _LEEWAY_NETWORK_MESH_REGISTRY_HOST_PATH_258}
@app.get("/tailscale/status")
def leeway_tailscale_status_258():
    return {"ok": True, "family": "network_mesh", "tailscale_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_TAILSCALE_EXECUTE", "patch": "LEEWAY_NETWORK_MESH_READ_ONLY_ROUTES_PATCH_258", "tailscale_available": False, "tailscale_cli_invoked": False, "tailscale_api_invoked": False, "tailnet_authenticated": False, "tailnet_joined": False, "acl_changed": False, "route_advertised": False, "exit_node_enabled": False, "subnet_router_enabled": False, "firewall_mutated": False, "dns_mutated": False, "network_settings_mutated": False, "tunnel_started": False, "network_mutation_executed": False, "approval_required": True, "note": "Tailscale status only. No tailscale command, API request, auth, join, route, ACL, or network mutation executed."}
@app.get("/tailscale/policy")
def leeway_tailscale_policy_258():
    return {"ok": True, "family": "network_mesh", "policy_status": "READ_ONLY_POLICY_ROUTE_ACTIVE", "mode": "READ_ONLY_NO_TAILSCALE_EXECUTE", "patch": "LEEWAY_NETWORK_MESH_READ_ONLY_ROUTES_PATCH_258", "allowed_without_approval": ["GET /network-mesh/discover", "GET /network-mesh/status", "GET /network-mesh/registry", "GET /tailscale/status", "GET /tailscale/policy"], "requires_approval": ["tailscale login", "tailscale up", "tailscale down", "tailnet join", "auth key use", "Tailscale API write", "ACL mutation", "route advertisement", "exit node enablement", "subnet router enablement", "firewall mutation", "DNS mutation", "network settings mutation", "tunnel start"], "tailscale_cli_invoked": False, "tailscale_api_invoked": False, "tailnet_authenticated": False, "tailnet_joined": False, "acl_changed": False, "route_advertised": False, "exit_node_enabled": False, "subnet_router_enabled": False, "firewall_mutated": False, "dns_mutated": False, "network_settings_mutated": False, "tunnel_started": False, "network_mutation_executed": False, "physical_action_executed": False, "source_path": _LEEWAY_NETWORK_MESH_POLICY_HOST_PATH_258}



# LEEWAY_SMART_HOME_READ_ONLY_ROUTES_PATCH_263
# GET-only smart home adapter routes. No Home Assistant/Matter/Zigbee/Z-Wave/MQTT/cloud/local device API call, no device command, no home-state mutation.
_LEEWAY_SMART_HOME_REGISTRY_HOST_PATH_263 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-smart-home\latest\smart-home-registry-latest.json"
_LEEWAY_SMART_HOME_POLICY_HOST_PATH_263 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-smart-home\latest\smart-home-approval-policy-latest.json"
_LEEWAY_SMART_HOME_CONTRACT_HOST_PATH_263 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\device-layer-smart-home\latest\smart-home-adapter-contract-latest.json"
def _leeway_smart_home_empty_devices_263():
    return {"devices": [], "normalized_devices": []}
def _leeway_smart_home_count_263():
    devices = _leeway_smart_home_empty_devices_263()
    return len(devices["devices"])
def _leeway_smart_home_adapters_263():
    return ["home_assistant", "matter", "zigbee", "zwave", "mqtt", "google_home", "amazon_alexa", "apple_homekit", "smartthings", "philips_hue", "nest", "ring"]
@app.get("/smart-home/discover")
def leeway_smart_home_discover_263():
    devices = _leeway_smart_home_empty_devices_263()
    count = _leeway_smart_home_count_263()
    return {"ok": True, "family": "smart_home", "mode": "READ_ONLY_NO_DEVICE_EXECUTE", "patch": "LEEWAY_SMART_HOME_READ_ONLY_ROUTES_PATCH_263", "discovered_count": count, "devices": devices["devices"], "normalized_devices": devices["normalized_devices"], "home_assistant_api_invoked": False, "matter_invoked": False, "zigbee_invoked": False, "zwave_invoked": False, "mqtt_invoked": False, "google_home_api_invoked": False, "alexa_api_invoked": False, "homekit_invoked": False, "cloud_api_invoked": False, "local_device_api_invoked": False, "device_command_executed": False, "home_state_mutation_executed": False, "physical_action_executed": False, "note": "Read-only stub. No adapter, cloud, local device, or home-state action executed."}
@app.get("/smart-home/status")
def leeway_smart_home_status_263():
    count = _leeway_smart_home_count_263()
    return {"ok": True, "family": "smart_home", "mode": "READ_ONLY_NO_DEVICE_EXECUTE", "patch": "LEEWAY_SMART_HOME_READ_ONLY_ROUTES_PATCH_263", "discovery_route_present": True, "status_route_present": True, "registry_route_present": True, "adapter_status_route_present": True, "policy_route_present": True, "discovered_count": count, "adapters_available": _leeway_smart_home_adapters_263(), "home_assistant_api_invoked": False, "matter_invoked": False, "zigbee_invoked": False, "zwave_invoked": False, "mqtt_invoked": False, "google_home_api_invoked": False, "alexa_api_invoked": False, "homekit_invoked": False, "cloud_api_invoked": False, "local_device_api_invoked": False, "device_command_executed": False, "home_state_mutation_executed": False, "lock_unlocked": False, "door_opened": False, "garage_opened": False, "alarm_changed": False, "thermostat_changed": False, "light_changed": False, "camera_stream_opened": False, "microphone_accessed": False, "speaker_playback_started": False, "automation_triggered": False, "approval_required_for_device_command": True, "approval_required_for_home_state_mutation": True, "registry_path": _LEEWAY_SMART_HOME_REGISTRY_HOST_PATH_263, "policy_path": _LEEWAY_SMART_HOME_POLICY_HOST_PATH_263, "contract_path": _LEEWAY_SMART_HOME_CONTRACT_HOST_PATH_263}
@app.get("/smart-home/registry")
def leeway_smart_home_registry_263():
    devices = _leeway_smart_home_empty_devices_263()
    count = _leeway_smart_home_count_263()
    return {"ok": True, "family": "smart_home", "registry_status": "READ_ONLY_REGISTRY_ROUTE_ACTIVE", "version": "LEEWAY_SMART_HOME_READ_ONLY_ROUTES_PATCH_263", "discovered_count": count, "normalized_devices": devices["normalized_devices"], "devices": devices["devices"], "adapter_call_executed": False, "home_assistant_api_invoked": False, "matter_invoked": False, "zigbee_invoked": False, "zwave_invoked": False, "mqtt_invoked": False, "cloud_api_invoked": False, "local_device_api_invoked": False, "device_command_executed": False, "home_state_mutation_executed": False, "physical_action_executed": False, "source_path": _LEEWAY_SMART_HOME_REGISTRY_HOST_PATH_263}
@app.get("/smart-home/adapter/status")
def leeway_smart_home_adapter_status_263():
    return {"ok": True, "family": "smart_home", "adapter_status": "DISABLED_CONTRACT_ONLY", "mode": "READ_ONLY_NO_DEVICE_EXECUTE", "patch": "LEEWAY_SMART_HOME_READ_ONLY_ROUTES_PATCH_263", "adapters": _leeway_smart_home_adapters_263(), "home_assistant_api_invoked": False, "matter_invoked": False, "zigbee_invoked": False, "zwave_invoked": False, "mqtt_invoked": False, "google_home_api_invoked": False, "alexa_api_invoked": False, "homekit_invoked": False, "cloud_api_invoked": False, "local_device_api_invoked": False, "adapter_call_executed": False, "approval_required": True, "device_command_executed": False, "home_state_mutation_executed": False, "physical_action_executed": False, "note": "Adapter status only. No adapter/cloud/local device call executed."}
@app.get("/smart-home/policy")
def leeway_smart_home_policy_263():
    return {"ok": True, "family": "smart_home", "policy_status": "READ_ONLY_POLICY_ROUTE_ACTIVE", "mode": "READ_ONLY_NO_DEVICE_EXECUTE", "patch": "LEEWAY_SMART_HOME_READ_ONLY_ROUTES_PATCH_263", "allowed_without_approval": ["GET /smart-home/discover", "GET /smart-home/status", "GET /smart-home/registry", "GET /smart-home/adapter/status", "GET /smart-home/policy"], "requires_approval": ["Home Assistant API call", "Matter command", "Zigbee command", "Z-Wave command", "MQTT publish", "Google Home API action", "Amazon Alexa API action", "Apple HomeKit action", "SmartThings action", "Philips Hue action", "Nest action", "Ring action", "unlock lock", "open door", "open garage", "arm alarm", "disarm alarm", "change thermostat", "turn light on or off", "change brightness or color", "start camera stream", "start speaker playback", "trigger automation", "run scene", "change routine", "change home security state"], "home_assistant_api_invoked": False, "matter_invoked": False, "zigbee_invoked": False, "zwave_invoked": False, "mqtt_invoked": False, "cloud_api_invoked": False, "local_device_api_invoked": False, "adapter_call_executed": False, "device_command_executed": False, "home_state_mutation_executed": False, "physical_action_executed": False, "source_path": _LEEWAY_SMART_HOME_POLICY_HOST_PATH_263}



# LEEWAY_AGENT_LEE_GOVERNED_CAPABILITY_MAP_UI_ROUTES_PATCH_268
# GET-only Agent Lee UI/runtime capability map routes. No execution routes, no execute buttons, no physical actions.
_LEEWAY_AGENT_LEE_CAPABILITY_MAP_SOURCE_268 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\agent-lee-governed-capability-map\latest\agent-lee-governed-capability-map-latest.json"
_LEEWAY_AGENT_LEE_UI_CONTRACT_SOURCE_268 = r"E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\runtime\agent-lee-governed-capability-map\latest\agent-lee-device-layer-ui-runtime-contract-latest.json"
def _leeway_agent_lee_route_paths_268():
    return ["/iot/discover", "/iot/status", "/iot/registry", "/iot/devices", "/printers/discover", "/printers/status", "/printers/registry", "/casting/discover", "/casting/status", "/casting/registry", "/audio-vision/discover", "/audio-vision/status", "/audio-vision/registry", "/cameras/discover", "/microphones/discover", "/speakers/discover", "/android/discover", "/android/status", "/android/registry", "/android/shell/status", "/android/actuator/status", "/ios/discover", "/ios/status", "/ios/registry", "/ios/shell/status", "/ios/actuator/status", "/linux/discover", "/linux/status", "/linux/registry", "/linux/shell/status", "/linux/actuator/status", "/macos/discover", "/macos/status", "/macos/registry", "/macos/shell/status", "/macos/actuator/status", "/network-mesh/discover", "/network-mesh/status", "/network-mesh/registry", "/tailscale/status", "/tailscale/policy", "/smart-home/discover", "/smart-home/status", "/smart-home/registry", "/smart-home/adapter/status", "/smart-home/policy"]
def _leeway_agent_lee_family_cards_268():
    return [
        {"family": "windows_desktop_control_plane", "title": "Windows Desktop Control Plane", "status": "READY_LOCKED_CLEAN", "execution_default": "LOCKED", "future_approval_required_actions": ["open app", "browser search", "type text", "hotkey", "screen status"]},
        {"family": "iot_read_only_discovery_registry_status", "title": "IoT", "status": "READ_ONLY_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["device command", "relay action", "actuator mutation"]},
        {"family": "printer_read_only_discovery_registry_status", "title": "Printers", "status": "READ_ONLY_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["print job", "cancel job", "change queue"]},
        {"family": "casting_read_only_discovery_registry_status", "title": "Casting", "status": "READ_ONLY_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["cast media", "stop cast", "volume change"]},
        {"family": "audio_vision_read_only_discovery_registry_status", "title": "Audio / Vision", "status": "READ_ONLY_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["open camera stream", "record audio", "start microphone", "start speaker playback"]},
        {"family": "android_device_shell_and_actuator_contract", "title": "Android", "status": "READ_ONLY_ACTUATOR_CONTRACT_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["ADB shell", "tap", "swipe", "text input", "open app"]},
        {"family": "ios_device_shell_and_actuator_contract", "title": "iOS", "status": "READ_ONLY_ACTUATOR_CONTRACT_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["iOS device action", "tap", "backup", "app open"]},
        {"family": "linux_actuator_contract", "title": "Linux", "status": "READ_ONLY_ACTUATOR_CONTRACT_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["SSH command", "shell command", "file read", "file write"]},
        {"family": "macos_actuator_contract", "title": "macOS", "status": "READ_ONLY_ACTUATOR_CONTRACT_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["SSH command", "shell command", "AppleScript", "app open", "click", "type"]},
        {"family": "network_mesh_tailscale_policy", "title": "Network Mesh / Tailscale", "status": "READ_ONLY_POLICY_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["tailscale login", "tailscale up", "tailnet join", "ACL change", "route advertisement"]},
        {"family": "smart_home_adapter_contract", "title": "Smart Home", "status": "READ_ONLY_ADAPTER_CONTRACT_READY", "execution_default": "DISABLED_APPROVAL_REQUIRED", "future_approval_required_actions": ["Home Assistant command", "Matter command", "Zigbee command", "Z-Wave command", "MQTT publish", "unlock", "garage open", "alarm change", "thermostat change", "light change"]}
    ]
def _leeway_agent_lee_read_only_route_records_268():
    return [{"method": "GET", "path": p, "read_only": True, "requires_approval": False, "execution_allowed": False} for p in _leeway_agent_lee_route_paths_268()]
def _leeway_agent_lee_approval_actions_268():
    actions = []
    for card in _leeway_agent_lee_family_cards_268():
        for action in card.get("future_approval_required_actions", []):
            actions.append({"family": card["family"], "action": action, "enabled": False, "approval_required": True, "execute_button_visible": False})
    return actions
def _leeway_agent_lee_base_ui_policy_268():
    return {"phase": 38, "mode": "READ_ONLY_UI_MAP_NO_EXECUTE", "execution_enabled": False, "execute_buttons_visible": False, "post_execution_routes_added": False, "physical_actions_executed": 0, "windows_locked": True, "blocked_probe_executed": False, "default_execution_state": "LOCKED", "approval_required_for_execution": True, "no_silent_execution": True}
@app.get("/agent-lee/device-layer/capability-map")
def leeway_agent_lee_device_layer_capability_map_268():
    policy = _leeway_agent_lee_base_ui_policy_268()
    families = _leeway_agent_lee_family_cards_268()
    routes = _leeway_agent_lee_read_only_route_records_268()
    return {"ok": True, "patch": "LEEWAY_AGENT_LEE_GOVERNED_CAPABILITY_MAP_UI_ROUTES_PATCH_268", "phase": 38, "mode": "READ_ONLY_UI_MAP_NO_EXECUTE", "device_layer_status": "FULL_MULTI_FAMILY_DEVICE_LAYER_READY_LOCKED_CLEAN", "completed_family_count": 11, "remaining_family_count": 0, "all_families_clean": True, "all_read_only_routes_ok": True, "read_only_route_count": len(routes), "family_cards": families, "read_only_routes": routes, "ui_policy": policy, "source_path": _LEEWAY_AGENT_LEE_CAPABILITY_MAP_SOURCE_268, "execution_enabled": False, "execute_buttons_visible": False, "physical_actions_executed": 0}
@app.get("/agent-lee/device-layer/families")
def leeway_agent_lee_device_layer_families_268():
    families = _leeway_agent_lee_family_cards_268()
    return {"ok": True, "phase": 38, "mode": "READ_ONLY_UI_MAP_NO_EXECUTE", "family_count": len(families), "completed_family_count": 11, "remaining_family_count": 0, "families": families, "execution_enabled": False, "execute_buttons_visible": False, "physical_actions_executed": 0}
@app.get("/agent-lee/device-layer/read-only-routes")
def leeway_agent_lee_device_layer_read_only_routes_268():
    routes = _leeway_agent_lee_read_only_route_records_268()
    return {"ok": True, "phase": 38, "mode": "READ_ONLY_UI_MAP_NO_EXECUTE", "route_count": len(routes), "routes": routes, "all_read_only_routes_ok": True, "execution_enabled": False, "execute_buttons_visible": False, "physical_actions_executed": 0}
@app.get("/agent-lee/device-layer/approval-required-actions")
def leeway_agent_lee_device_layer_approval_required_actions_268():
    actions = _leeway_agent_lee_approval_actions_268()
    return {"ok": True, "phase": 38, "mode": "READ_ONLY_UI_MAP_NO_EXECUTE", "action_cards_visible": True, "action_cards_enabled": False, "execute_buttons_visible": False, "approval_required": True, "action_count": len(actions), "actions": actions, "execution_enabled": False, "physical_actions_executed": 0}
@app.get("/agent-lee/device-layer/lock-state")
def leeway_agent_lee_device_layer_lock_state_268():
    return {"ok": True, "phase": 38, "mode": "READ_ONLY_UI_MAP_NO_EXECUTE", "windows_locked": True, "blocked_probe_executed": False, "execution_enabled": False, "execute_buttons_visible": False, "post_execution_routes_added": False, "physical_actions_executed": 0, "real_execution_enabled": False, "physical_execution_enabled": False, "read_only_status_enabled": False, "approval_required_for_execution": True}
