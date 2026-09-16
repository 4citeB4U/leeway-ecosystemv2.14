import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, PlainTextResponse
from pydantic import BaseModel, Field

APP = "leeway_meeting_runtime"
VERSION = "0.1.0-jitsi-link-runtime"

STATE_DIR = Path(os.environ.get("LEEWAY_MEETING_STATE", "/meetings"))
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
PUBLIC_BASE_URL = os.environ.get("LEEWAY_PUBLIC_BASE_URL", "http://localhost:5329").rstrip("/")
JITSI_BASE_URL = os.environ.get("LEEWAY_JITSI_BASE_URL", "https://meet.jit.si").rstrip("/")

STATE_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class MeetingCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    start_time: str = ""
    end_time: str = ""
    timezone: str = "local"
    attendees: List[str] = []
    description: str = ""
    source: str = "agent_lee"
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str):
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return value[:80] or "leeway-meeting"


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_receipt(kind: str, payload: Dict[str, Any]):
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


def meeting_path(meeting_id: str):
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", meeting_id)
    return STATE_DIR / f"{safe}.json"


def save_meeting(meeting: Dict[str, Any]):
    write_json(meeting_path(meeting["meeting_id"]), meeting)
    write_json(STATE_DIR / "latest-meeting.json", meeting)


def load_meeting(meeting_id: str):
    path = meeting_path(meeting_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return read_json(path)


def ics_escape(value: str):
    return str(value or "").replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def make_ics(meeting: Dict[str, Any]):
    uid = meeting["meeting_id"] + "@leeway.local"
    title = ics_escape(meeting.get("title", "Leeway Meeting"))
    desc = ics_escape((meeting.get("description", "") + "\n\nJoin: " + meeting.get("leeway_link", "")).strip())

    # Floating local-time fallback. Calendar runtime will later normalize timezone.
    start = re.sub(r"[^0-9T]", "", meeting.get("start_time", ""))[:15] or datetime.now().strftime("%Y%m%dT%H%M%S")
    end = re.sub(r"[^0-9T]", "", meeting.get("end_time", ""))[:15] or start

    return "\r\n".join([
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Leeway Industries//Agent Lee Meeting Runtime//EN",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{start}",
        f"DTEND:{end}",
        f"SUMMARY:{title}",
        f"DESCRIPTION:{desc}",
        f"URL:{meeting.get('leeway_link', '')}",
        "END:VEVENT",
        "END:VCALENDAR",
        ""
    ])


def meeting_html(meeting: Dict[str, Any]):
    title = meeting.get("title", "Leeway Meeting")
    join = meeting.get("jitsi_url", "")
    leeway = meeting.get("leeway_link", "")
    ics = meeting.get("ics_url", "")
    attendees = ", ".join(meeting.get("attendees", [])) or "Not listed"

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>{title}</title>
  <style>
    body {{
      margin:0;
      background:#07111f;
      color:#f8fafc;
      font-family: Arial, sans-serif;
    }}
    .shell {{
      max-width:920px;
      margin:40px auto;
      padding:28px;
      background:#0f172a;
      border:1px solid #334155;
      border-radius:18px;
      box-shadow:0 30px 80px rgba(0,0,0,.35);
    }}
    .badge {{
      display:inline-block;
      background:#1e293b;
      color:#93c5fd;
      border-radius:999px;
      padding:6px 10px;
      margin-bottom:14px;
      font-size:13px;
    }}
    h1 {{
      margin:0 0 10px 0;
      font-size:34px;
    }}
    .meta {{
      color:#cbd5e1;
      line-height:1.6;
      margin-bottom:24px;
    }}
    .actions a {{
      display:inline-block;
      margin:6px 10px 6px 0;
      padding:12px 16px;
      border-radius:12px;
      text-decoration:none;
      background:#2563eb;
      color:white;
      font-weight:bold;
    }}
    .actions a.secondary {{
      background:#334155;
    }}
    iframe {{
      margin-top:24px;
      width:100%;
      height:520px;
      border:0;
      border-radius:16px;
      background:white;
    }}
    code {{
      color:#7dd3fc;
    }}
  </style>
</head>
<body>
  <div class="shell">
    <div class="badge">Leeway Meeting Room</div>
    <h1>{title}</h1>
    <div class="meta">
      <div><strong>Start:</strong> {meeting.get("start_time", "Not set")}</div>
      <div><strong>End:</strong> {meeting.get("end_time", "Not set")}</div>
      <div><strong>Timezone:</strong> {meeting.get("timezone", "local")}</div>
      <div><strong>Attendees:</strong> {attendees}</div>
      <div><strong>Leeway Link:</strong> <code>{leeway}</code></div>
    </div>
    <div class="actions">
      <a href="{join}" target="_blank">Join Video Meeting</a>
      <a class="secondary" href="{ics}" target="_blank">Download Calendar Invite</a>
    </div>
    <iframe src="{join}" allow="camera; microphone; fullscreen; display-capture"></iframe>
  </div>
</body>
</html>"""


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "purpose": "Creates Leeway meeting links, Jitsi-backed rooms, and calendar invite files.",
        "public_base_url": PUBLIC_BASE_URL,
        "jitsi_base_url": JITSI_BASE_URL,
        "endpoints": [
            "/meeting/create",
            "/meeting/latest",
            "/meeting/{meeting_id}",
            "/meeting/{meeting_id}/join",
            "/meeting/{meeting_id}.ics",
            "/rooms/{meeting_id}",
            "/receipts/latest"
        ],
        "truth": {
            "jitsi_link_generation": "LIVE",
            "leeway_branded_room": "LIVE",
            "ics_generation": "LIVE",
            "calendar_sending": "REQUIRES_LEEWAY_CALENDAR_RUNTIME",
            "email_inviting": "REQUIRES_LEEWAY_EMAIL_RUNTIME"
        },
        "created_at": now_iso()
    }


@app.post("/meeting/create")
def create_meeting(req: MeetingCreateRequest):
    meeting_id = "meet-" + str(int(time.time())) + "-" + uuid.uuid4().hex[:8]
    room_slug = "leeway-" + slugify(req.title) + "-" + meeting_id[-8:]
    jitsi_url = JITSI_BASE_URL + "/" + room_slug
    leeway_link = PUBLIC_BASE_URL + "/rooms/" + meeting_id
    ics_url = PUBLIC_BASE_URL + "/meeting/" + meeting_id + ".ics"

    meeting = {
        "meeting_id": meeting_id,
        "title": req.title,
        "start_time": req.start_time,
        "end_time": req.end_time,
        "timezone": req.timezone,
        "attendees": req.attendees,
        "description": req.description,
        "jitsi_url": jitsi_url,
        "leeway_link": leeway_link,
        "ics_url": ics_url,
        "source": req.source,
        "metadata": req.metadata,
        "created_at": now_iso()
    }

    save_meeting(meeting)

    ics_path = STATE_DIR / f"{meeting_id}.ics"
    ics_path.write_text(make_ics(meeting), encoding="utf-8")

    receipt = write_receipt("meeting_created", {
        "verdict": "LEEWAY_MEETING_LINK_CREATED",
        "meeting": meeting,
        "ics_path": str(ics_path)
    })

    return {"ok": True, "meeting": meeting, "receipt": receipt}


@app.get("/meeting/latest")
def latest_meeting():
    path = STATE_DIR / "latest-meeting.json"
    if not path.exists():
        return {"ok": False, "message": "No meeting exists yet."}
    return {"ok": True, "meeting": read_json(path)}


@app.get("/meeting/{meeting_id}")
def get_meeting(meeting_id: str):
    return {"ok": True, "meeting": load_meeting(meeting_id)}


@app.get("/meeting/{meeting_id}/join")
def join_meeting(meeting_id: str):
    meeting = load_meeting(meeting_id)
    return {"ok": True, "join_url": meeting.get("jitsi_url"), "leeway_link": meeting.get("leeway_link")}


@app.get("/meeting/{meeting_id}.ics")
def meeting_ics(meeting_id: str):
    path = STATE_DIR / f"{meeting_id}.ics"
    if not path.exists():
        meeting = load_meeting(meeting_id)
        path.write_text(make_ics(meeting), encoding="utf-8")
    return FileResponse(str(path), filename=f"{meeting_id}.ics", media_type="text/calendar")


@app.get("/rooms/{meeting_id}", response_class=HTMLResponse)
def meeting_room(meeting_id: str):
    meeting = load_meeting(meeting_id)
    return HTMLResponse(meeting_html(meeting))


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_meeting_runtime"

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

