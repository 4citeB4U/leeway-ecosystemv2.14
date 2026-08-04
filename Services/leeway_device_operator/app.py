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
