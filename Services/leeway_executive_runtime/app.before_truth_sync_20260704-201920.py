import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

import requests
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

STATE_DIR = Path(os.environ.get("LEEWAY_EXECUTIVE_STATE", "/state"))
TASK_DIR = STATE_DIR / "tasks"
PHRASE_DIR = STATE_DIR / "phrases"
DECISION_DIR = STATE_DIR / "decisions"
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

WORKBOARD_URL = os.environ.get("LEEWAY_WORKBOARD_URL", "http://leeway_workboard_runtime:5339").rstrip("/")
DISCOVERY_URL = os.environ.get("LEEWAY_DISCOVERY_URL", "http://leeway_agent_skills:5327").rstrip("/")
SKILL_ROUTER_URL = os.environ.get("LEEWAY_SKILL_ROUTER_URL", "http://leeway_skill_router:5324").rstrip("/")
POWER_LEVEL = int(os.environ.get("LEEWAY_POWER_LEVEL", "10"))

for d in [STATE_DIR, TASK_DIR, PHRASE_DIR, DECISION_DIR, RECEIPT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Leeway Executive Operating Layer", version="1.0.0")


class ExecutiveRequest(BaseModel):
    request: str = Field(..., min_length=1)
    source: str = "telegram"
    user_id: str = "owner"
    urgency: str = "normal"
    require_approval: Optional[bool] = None
    metadata: Dict[str, Any] = {}


class ExecutiveUpdate(BaseModel):
    task_id: str
    status: str
    message: str = ""
    completed_step: Optional[int] = None
    blocker: str = ""
    artifact_path: str = ""
    artifact_url: str = ""
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def receipt(kind: str, payload: Dict[str, Any]):
    data = {
        "verdict": payload.get("verdict", "LEEWAY_EXECUTIVE_RUNTIME_RECEIPT"),
        "runtime": "leeway_executive_runtime",
        "kind": kind,
        "created_at": now_iso(),
        "power_level": POWER_LEVEL,
        **payload
    }
    path = RECEIPT_DIR / f"executive_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    write_json(path, data)
    write_json(RECEIPT_DIR / "latest.receipt.json", data)
    data["receipt_path"] = str(path)
    return data


EXECUTIVE_ACCORD = [
    {
        "id": 1,
        "name": "Real Job",
        "rule": "Protect the user's attention, coordinate work, filter noise, route routine items, escalate urgent decisions, and reduce friction."
    },
    {
        "id": 2,
        "name": "Executive Support Standard",
        "rule": "Manage correspondence, scheduling, documents, follow-ups, logistics, and executive attention like a chief-of-staff grade assistant."
    },
    {
        "id": 3,
        "name": "Attention Protection",
        "rule": "Classify every item by urgency, importance, risk, approval need, deadline, and operational lane."
    },
    {
        "id": 4,
        "name": "Professional Discretion",
        "rule": "Protect confidential information and require approval before external, sensitive, destructive, public, or financial action."
    },
    {
        "id": 5,
        "name": "R and D Integrity",
        "rule": "Convert uncertainty into evidence, evidence into design decisions, and design decisions into shippable artifacts."
    },
    {
        "id": 6,
        "name": "Research Behavior",
        "rule": "Research must produce a decision foundation: problem, evidence, risks, hypotheses, unknowns, and next experiment."
    },
    {
        "id": 7,
        "name": "Hypothesis Driven Development",
        "rule": "Convert ideas into testable claims with acceptance criteria, failure criteria, evidence, and next decision."
    },
    {
        "id": 8,
        "name": "Prototype Discipline",
        "rule": "Use the right prototype type for the unknown: POC, functional, integration, user-facing, pre-production, automation, or creative."
    },
    {
        "id": 9,
        "name": "Evidence Based Definition of Done",
        "rule": "Never mark complete without proof: file exists, health passes, draft exists, event exists, artifact opens, or receipt exists."
    },
    {
        "id": 10,
        "name": "Productization Mindset",
        "rule": "Make work repeatable, supportable, observable, versioned, documented, recoverable, and maintainable."
    },
    {
        "id": 11,
        "name": "Visible Operational Trace",
        "rule": "Expose status as THINKING, DISCOVERING, PLANNING, WAITING_APPROVAL, EXECUTING, VALIDATING, BLOCKED, or COMPLETE."
    },
    {
        "id": 12,
        "name": "To Do Enforcement",
        "rule": "Every serious task gets a to-do list with PENDING, ACTIVE, DONE, BLOCKED, or SKIPPED_WITH_REASON states."
    },
    {
        "id": 13,
        "name": "Creative Production Standard",
        "rule": "Creative work must become a pipeline with concept, audience, style, assets, plan, execution, validation, delivery, and receipt."
    },
    {
        "id": 14,
        "name": "Skill and Runtime Routing",
        "rule": "Use the Leeway runtime fabric before generic chat: discovery, router, workboard, document, artifact, voice, image, email, calendar, phone, browser, desktop, performance."
    },
    {
        "id": 15,
        "name": "Automation Builder Behavior",
        "rule": "Turn repeatable work into reusable workflows, schedules, templates, background jobs, dashboards, and receipts."
    },
    {
        "id": 16,
        "name": "Proactive Executive Communication",
        "rule": "Push useful updates for blockers, approvals, deadlines, completed milestones, failed containers, and ready artifacts without spamming."
    },
    {
        "id": 17,
        "name": "Accessibility Support Standard",
        "rule": "Use one voice message before text, short spoken summaries, large controls, repeat status, emergency stop, and clear approval phrases."
    },
    {
        "id": 18,
        "name": "Persona With Professional Integrity",
        "rule": "Use grounded, rhythmic, confident style without repetitive bot phrases, overdone slang, or loss of clarity."
    },
    {
        "id": 19,
        "name": "Full Executive Accord",
        "rule": "Capture, classify, plan, route, execute, validate, report, protect attention, and produce receipts."
    },
    {
        "id": 20,
        "name": "Required Operating Loop",
        "rule": "Capture request, classify, check context, check discovery, create Workboard task, build to-do, route lanes, voice status, plan, approve, execute, update, validate, deliver, receipt, learn."
    }
]

BANNED_STARTUP_PHRASES = [
    "agent lee is online",
    "i am online",
    "i'm online",
    "online and ready",
    "how can i help you today",
    "ready to assist"
]

NATURAL_STATUS_LINES = [
    "I'm up. What are we building?",
    "I'm with you. Let me map it.",
    "I got it. I'm checking the lanes now.",
    "Say less. I'm lining up the work.",
    "I'm here. Let's tighten it up.",
    "I see the task. I'm building the list.",
    "I'm on it. First I am checking capability.",
    "I got you. I'm turning it into a work plan."
]


RUNTIME_MAP = {
    "research": ["leeway_research_lane", "leeway_open_notebook", "leeway_document_runtime"],
    "website": ["leeway_open_notebook", "leeway_artifact_viewer", "leeway_browser_runtime"],
    "story": ["leeway_open_notebook", "leeway_document_runtime", "agent-lee-sdxl-lightning-image-lane", "leeway_artifact_viewer"],
    "pdf": ["leeway_document_runtime", "leeway_artifact_viewer"],
    "image": ["agent-lee-sdxl-lightning-image-lane", "leeway_artifact_viewer"],
    "movie": ["leeway_open_notebook", "leeway_performance_runtime", "agent-lee-sdxl-lightning-image-lane", "leeway_document_runtime"],
    "song": ["leeway_performance_runtime", "agent-lee-qwen-voice"],
    "rap": ["leeway_performance_runtime", "agent-lee-qwen-voice"],
    "email": ["leeway_email_runtime"],
    "calendar": ["leeway_calendar_runtime"],
    "phone": ["leeway_phone_runtime"],
    "browser": ["leeway_browser_runtime"],
    "desktop": ["leeway_desktop_runtime"],
    "system": ["leeway_agent_skills", "leeway_skill_router", "leeway_api_gateway"],
    "general": ["leeway_skill_router", "leeway_workboard_runtime", "leeway_agent_skills"]
}


APPROVAL_KEYWORDS = [
    "send email", "email them", "call", "phone call", "text them", "sms",
    "delete", "purchase", "buy", "post", "publish", "install",
    "change setting", "forward", "share", "message them"
]


def normalize(text: str):
    return re.sub(r"\s+", " ", str(text or "").strip())


def classify_request(text: str):
    t = normalize(text).lower()

    if any(x in t for x in ["research", "investigate", "study", "prior art", "market"]):
        return "research"
    if any(x in t for x in ["website", "web site", "landing page", "homepage"]):
        return "website"
    if any(x in t for x in ["story", "storybook", "book", "chapter"]):
        return "story"
    if any(x in t for x in ["pdf", "document", "proposal", "report"]):
        return "pdf"
    if any(x in t for x in ["image", "picture", "draw", "render", "poster", "logo"]):
        return "image"
    if any(x in t for x in ["movie", "film", "script", "screenplay", "trailer"]):
        return "movie"
    if any(x in t for x in ["song", "sing", "chorus", "melody"]):
        return "song"
    if any(x in t for x in ["rap", "bars", "verse", "spit"]):
        return "rap"
    if any(x in t for x in ["email", "inbox", "correspondence"]):
        return "email"
    if any(x in t for x in ["calendar", "schedule", "meeting", "appointment"]):
        return "calendar"
    if any(x in t for x in ["call", "phone"]):
        return "phone"
    if any(x in t for x in ["browser", "web search", "click", "open page"]):
        return "browser"
    if any(x in t for x in ["desktop", "mouse", "keyboard", "cursor", "screen"]):
        return "desktop"
    if any(x in t for x in ["docker", "container", "health", "runtime", "system"]):
        return "system"

    return "general"


def requires_approval(text: str, explicit: Optional[bool]):
    if explicit is not None:
        return bool(explicit)
    t = normalize(text).lower()
    return any(k in t for k in APPROVAL_KEYWORDS)


def request_complexity(text: str):
    t = normalize(text).lower()
    if any(x in t for x in ["full", "complete", "build", "create", "generate", "movie", "website", "storybook", "automation", "system"]):
        return "serious"
    if len(t) > 140:
        return "serious"
    return "simple"


def create_todo(task_type: str, text: str, approval: bool):
    base = [
        "Capture the request exactly.",
        "Classify task type, urgency, risk, and approval requirement.",
        "Check discovery and available runtime lanes.",
        "Create Workboard task and visible status.",
        "Build work breakdown and to-do list.",
        "Route to required runtime lanes.",
    ]

    if task_type == "research":
        base += [
            "Build problem dossier.",
            "Collect prior art, competitors, constraints, and evidence.",
            "Create risk register and hypothesis set.",
            "Recommend next experiment or decision."
        ]
    elif task_type == "website":
        base += [
            "Create site map and page strategy.",
            "Draft copy and visual direction.",
            "Generate or collect assets.",
            "Build preview package.",
            "Validate files, links, and preview."
        ]
    elif task_type == "story":
        base += [
            "Create title, characters, world, and outline.",
            "Write story draft.",
            "Create cover and scene image plan.",
            "Generate images where available.",
            "Assemble PDF/story package.",
            "Validate exported file exists."
        ]
    elif task_type == "movie":
        base += [
            "Create logline and synopsis.",
            "Build treatment and character bible.",
            "Create scene list, script, and shot list.",
            "Create storyboard prompts and music direction.",
            "Package pitch deck or PDF."
        ]
    elif task_type in ["song", "rap"]:
        base += [
            "Create theme, hook, verses, bridge, outro, and performance notes.",
            "Prepare one voice-first performance summary.",
            "Send lyrics and truth status.",
            "Write receipt."
        ]
    elif task_type in ["email", "calendar", "phone"]:
        base += [
            "Prepare draft/action plan.",
            "Check contact, time, or recipient details.",
            "Wait for approval before external action.",
            "Execute only after approval.",
            "Write receipt."
        ]
    elif task_type == "system":
        base += [
            "Inventory relevant containers.",
            "Check health routes.",
            "Check capability state.",
            "Create repair recommendations.",
            "Write proof receipt."
        ]
    else:
        base += [
            "Create plan or work order.",
            "Execute safe steps.",
            "Validate output.",
            "Write receipt."
        ]

    if approval:
        base.append("Pause at approval gate before external, sensitive, destructive, or public action.")

    base += [
        "Update visible operational trace after major steps.",
        "Validate against original request.",
        "Deliver result or exact blocker.",
        "Store receipt and learning event if needed."
    ]

    return base


def phrase_memory_path():
    return PHRASE_DIR / "recent_phrases.json"


def load_recent_phrases():
    path = phrase_memory_path()
    if not path.exists():
        return []
    try:
        return read_json(path).get("phrases", [])
    except Exception:
        return []


def remember_phrase(phrase: str):
    phrases = load_recent_phrases()
    phrases.append(phrase)
    phrases = phrases[-50:]
    write_json(phrase_memory_path(), {"phrases": phrases, "updated_at": now_iso()})


def choose_status_phrase():
    recent = set(load_recent_phrases())
    for phrase in NATURAL_STATUS_LINES:
        if phrase not in recent:
            remember_phrase(phrase)
            return phrase
    phrase = NATURAL_STATUS_LINES[int(time.time()) % len(NATURAL_STATUS_LINES)]
    remember_phrase(phrase)
    return phrase


def output_guard(text: str):
    low = normalize(text).lower()
    for banned in BANNED_STARTUP_PHRASES:
        if banned in low:
            return False
    return True


def try_get(url: str, timeout=5):
    try:
        r = requests.get(url, timeout=timeout)
        return {"ok": True, "status_code": r.status_code, "text": r.text[:2000]}
    except Exception as e:
        return {"ok": False, "error": repr(e)}


def try_post(url: str, payload: Dict[str, Any], timeout=12):
    try:
        r = requests.post(url, json=payload, timeout=timeout)
        data = None
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text[:4000]}
        return {"ok": 200 <= r.status_code < 300, "status_code": r.status_code, "data": data}
    except Exception as e:
        return {"ok": False, "error": repr(e)}


def create_workboard_task(req: ExecutiveRequest, task_type: str, todo: List[str]):
    payload = {
        "request": req.request,
        "source": req.source,
        "user_id": req.user_id,
        "task_type": task_type,
        "status": "THINKING",
        "todo": todo,
        "metadata": {
            "created_by": "leeway_executive_runtime",
            "power_level": POWER_LEVEL,
            **req.metadata
        }
    }
    return try_post(WORKBOARD_URL + "/task/create", payload, timeout=10)


def update_workboard(task_id: str, status: str, message: str, completed_step: Optional[int] = None, blocker: str = ""):
    payload = {
        "task_id": task_id,
        "status": status,
        "message": message,
        "completed_step": completed_step,
        "blocker": blocker
    }
    return try_post(WORKBOARD_URL + "/task/update", payload, timeout=10)


def get_discovery_snapshot():
    result = {
        "health": try_get(DISCOVERY_URL + "/health", timeout=4),
        "capabilities": try_get(DISCOVERY_URL + "/discovery/agent-lee-capabilities", timeout=5),
        "containers": try_get(DISCOVERY_URL + "/discovery/containers", timeout=5),
        "routes": try_get(DISCOVERY_URL + "/discovery/routes", timeout=5)
    }
    return result


def create_execution_packet(req: ExecutiveRequest):
    text = normalize(req.request)
    task_type = classify_request(text)
    approval = requires_approval(text, req.require_approval)
    complexity = request_complexity(text)
    lanes = RUNTIME_MAP.get(task_type, RUNTIME_MAP["general"])
    todo = create_todo(task_type, text, approval)
    status_phrase = choose_status_phrase()

    workboard = create_workboard_task(req, task_type, todo)
    workboard_task_id = ""
    try:
        workboard_task_id = workboard.get("data", {}).get("task", {}).get("task_id", "")
    except Exception:
        workboard_task_id = ""

    discovery = get_discovery_snapshot()

    router_plan = {}
    if complexity == "serious":
        router_payload = {
            "text": text,
            "source": req.source,
            "user_id": req.user_id,
            "executive_layer": True,
            "task_type": task_type,
            "required_lanes": lanes,
            "approval_required": approval
        }
        router_plan = try_post(SKILL_ROUTER_URL + "/route", router_payload, timeout=20)

    packet_id = f"exec-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    visible_trace = {
        "state": "THINKING",
        "message": "Request captured. Capability and routing checks are active.",
        "steps": [
            {"index": i + 1, "text": item, "status": "ACTIVE" if i == 0 else "PENDING"}
            for i, item in enumerate(todo)
        ]
    }

    packet = {
        "packet_id": packet_id,
        "request": text,
        "source": req.source,
        "user_id": req.user_id,
        "task_type": task_type,
        "complexity": complexity,
        "approval_required": approval,
        "required_lanes": lanes,
        "workboard_task_id": workboard_task_id,
        "status_phrase": status_phrase,
        "visible_trace": visible_trace,
        "accord_applied": [x["id"] for x in EXECUTIVE_ACCORD],
        "workboard": workboard,
        "discovery": discovery,
        "router_plan": router_plan,
        "created_at": now_iso(),
        "status": "EXECUTIVE_PACKET_CREATED"
    }

    write_json(TASK_DIR / f"{packet_id}.json", packet)
    write_json(TASK_DIR / "latest-executive-packet.json", packet)

    rec = receipt("packet_created", {
        "verdict": "LEEWAY_EXECUTIVE_PACKET_CREATED",
        "packet_id": packet_id,
        "task_type": task_type,
        "approval_required": approval,
        "required_lanes": lanes,
        "workboard_task_id": workboard_task_id
    })

    packet["receipt"] = rec
    return packet


@app.get("/health")
def health():
    return {
        "ok": True,
        "runtime": "leeway_executive_runtime",
        "lane": "executive_operating_layer",
        "port": 5340,
        "power_level": POWER_LEVEL,
        "created_at": now_iso()
    }


@app.get("/status")
def status():
    return {
        "ok": True,
        "runtime": "leeway_executive_runtime",
        "power_level": POWER_LEVEL,
        "accord_count": len(EXECUTIVE_ACCORD),
        "capabilities": [
            "executive_attention_filter",
            "r_and_d_integrity_loop",
            "hypothesis_driven_planning",
            "prototype_discipline",
            "definition_of_done",
            "visible_operational_trace",
            "todo_enforcement",
            "runtime_lane_routing",
            "approval_gate_detection",
            "anti_repetition_persona_guard",
            "automation_builder_intent",
            "accessibility_voice_policy",
            "receipt_generation"
        ],
        "connected_services": {
            "workboard": WORKBOARD_URL,
            "discovery": DISCOVERY_URL,
            "skill_router": SKILL_ROUTER_URL
        },
        "created_at": now_iso()
    }


@app.get("/accord")
def accord():
    return {
        "ok": True,
        "runtime": "leeway_executive_runtime",
        "accord": EXECUTIVE_ACCORD
    }


@app.post("/executive/start")
def executive_start(req: ExecutiveRequest):
    packet = create_execution_packet(req)
    return {"ok": True, "packet": packet}


@app.post("/executive/update")
def executive_update(req: ExecutiveUpdate):
    path = TASK_DIR / "latest-executive-packet.json"
    if not path.exists():
        return {"ok": False, "error": "No executive packet exists."}

    packet = read_json(path)
    packet["status"] = req.status
    packet["updated_at"] = now_iso()
    packet["last_message"] = req.message
    packet["blocker"] = req.blocker
    packet["artifact_path"] = req.artifact_path
    packet["artifact_url"] = req.artifact_url
    packet.setdefault("updates", []).append(req.model_dump())

    if packet.get("workboard_task_id"):
        update_workboard(
            packet["workboard_task_id"],
            req.status,
            req.message,
            completed_step=req.completed_step,
            blocker=req.blocker
        )

    write_json(path, packet)
    if packet.get("packet_id"):
        write_json(TASK_DIR / f"{packet['packet_id']}.json", packet)

    rec = receipt("packet_updated", {
        "verdict": "LEEWAY_EXECUTIVE_PACKET_UPDATED",
        "packet_id": packet.get("packet_id"),
        "status": req.status
    })

    return {"ok": True, "packet": packet, "receipt": rec}


@app.get("/executive/latest")
def executive_latest():
    path = TASK_DIR / "latest-executive-packet.json"
    if not path.exists():
        return {"ok": False, "message": "No executive packet exists yet."}
    return {"ok": True, "packet": read_json(path)}


@app.post("/persona/status-line")
def persona_status_line(payload: Dict[str, Any]):
    phrase = choose_status_phrase()
    if not output_guard(phrase):
        phrase = "I'm with you. Let me map it."
    return {
        "ok": True,
        "phrase": phrase,
        "policy": "No repeated startup loops. No 'Agent Lee is online'."
    }


@app.post("/output/guard")
def output_guard_endpoint(payload: Dict[str, Any]):
    text = payload.get("text", "")
    allowed = output_guard(text)
    return {
        "ok": True,
        "allowed": allowed,
        "reason": "allowed" if allowed else "blocked_repetitive_or_robotic_startup_phrase"
    }


@app.get("/receipts/latest")
def receipts_latest():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


@app.get("/", response_class=HTMLResponse)
def home():
    latest = {}
    path = TASK_DIR / "latest-executive-packet.json"
    if path.exists():
        latest = read_json(path)

    steps_html = ""
    for step in latest.get("visible_trace", {}).get("steps", []):
        marker = "[ ]"
        if step.get("status") == "DONE":
            marker = "[x]"
        elif step.get("status") == "ACTIVE":
            marker = "[...]"
        steps_html += f"<li><b>{marker}</b> {step.get('text')}</li>"

    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Leeway Executive Runtime</title>
<style>
body {{ margin:0; background:#060b14; color:#f3f7ff; font-family:Segoe UI,Arial; }}
main {{ width:min(1180px,94vw); margin:0 auto; padding:36px 0; }}
.card {{ border:1px solid #2d4a69; background:#101b2d; border-radius:24px; padding:26px; margin-bottom:18px; }}
.badge {{ color:#5ed2ff; font-weight:900; letter-spacing:2px; text-transform:uppercase; }}
h1 {{ font-size:42px; margin-bottom:6px; }}
.grid {{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }}
li {{ margin:10px 0; }}
.status {{ color:#8ef6c1; font-weight:900; }}
.small {{ color:#a9bad1; }}
</style>
</head>
<body>
<main>
<section class="card">
<div class="badge">Leeway Executive Operating Layer</div>
<h1>Autonomous Executive Agent Runtime</h1>
<p class="small">Attention protection, R and D integrity, routing, workboard, to-do enforcement, approval gates, validation, and receipts.</p>
<p>Status: <span class="status">{latest.get('status', 'NO_ACTIVE_PACKET')}</span></p>
<p>Task type: {latest.get('task_type', 'none')}</p>
<p>Required lanes: {', '.join(latest.get('required_lanes', []))}</p>
</section>
<section class="grid">
<div class="card">
<h2>Visible Operational Trace</h2>
<ul>{steps_html}</ul>
</div>
<div class="card">
<h2>Executive Accord</h2>
<p>20 accord requirements loaded and active.</p>
<p>Power Level: {POWER_LEVEL}</p>
<p>Workboard: {WORKBOARD_URL}</p>
<p>Discovery: {DISCOVERY_URL}</p>
<p>Skill Router: {SKILL_ROUTER_URL}</p>
</div>
</section>
</main>
</body>
</html>"""
