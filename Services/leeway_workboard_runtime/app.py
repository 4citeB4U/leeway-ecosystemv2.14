import json
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

STATE_DIR = Path(__import__("os").environ.get("LEEWAY_WORKBOARD_STATE", "/state"))
TASK_DIR = STATE_DIR / "tasks"
TIMELINE_DIR = STATE_DIR / "timeline"
RECEIPT_DIR = Path(__import__("os").environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

STATE_DIR.mkdir(parents=True, exist_ok=True)
TASK_DIR.mkdir(parents=True, exist_ok=True)
TIMELINE_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Leeway Workboard Runtime", version="0.1.0")


class TaskCreate(BaseModel):
    request: str = Field(..., min_length=1)
    source: str = "telegram"
    user_id: str = "owner"
    task_type: str = "general"
    status: str = "THINKING"
    todo: List[str] = []
    metadata: Dict[str, Any] = {}


class TaskUpdate(BaseModel):
    task_id: str
    status: Optional[str] = None
    message: Optional[str] = None
    current_step: Optional[int] = None
    completed_step: Optional[int] = None
    blocker: Optional[str] = None
    artifact_url: Optional[str] = None
    artifact_path: Optional[str] = None
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def task_path(task_id: str):
    return TASK_DIR / f"{task_id}.json"


def latest_path():
    return TASK_DIR / "latest-task.json"


def receipt(kind: str, payload: Dict[str, Any]):
    data = {
        "verdict": payload.get("verdict", "LEEWAY_WORKBOARD_RECEIPT"),
        "runtime": "leeway_workboard_runtime",
        "kind": kind,
        "created_at": now_iso(),
        **payload
    }
    path = RECEIPT_DIR / f"workboard_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    write_json(path, data)
    write_json(RECEIPT_DIR / "latest.receipt.json", data)
    data["receipt_path"] = str(path)
    return data


def add_timeline(task_id: str, event: Dict[str, Any]):
    path = TIMELINE_DIR / f"{task_id}.jsonl"
    event = {
        "task_id": task_id,
        "created_at": now_iso(),
        **event
    }
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")
    write_json(TIMELINE_DIR / "latest-event.json", event)
    return event


def default_todo(request: str, task_type: str):
    t = (task_type or "general").lower()
    r = (request or "").lower()

    if t in ["website", "story", "movie", "creative", "artifact"] or any(x in r for x in ["website", "story", "movie", "image", "pdf", "song", "rap", "deck", "proposal"]):
        return [
            "Capture the request exactly.",
            "Check discovery for available runtime lanes.",
            "Create the plan and production to-do list.",
            "Identify required containers and artifacts.",
            "Wait for approval if external action or major build is required.",
            "Execute the approved steps.",
            "Create artifacts, links, files, or exact blockers.",
            "Write receipts and report completion."
        ]

    return [
        "Capture the request exactly.",
        "Check discovery for available skills.",
        "Create a plan.",
        "Execute or ask for approval.",
        "Report result with receipt."
    ]


@app.get("/health")
def health():
    return {
        "ok": True,
        "runtime": "leeway_workboard_runtime",
        "lane": "workboard",
        "port": 5339,
        "created_at": now_iso()
    }


@app.get("/status")
def status():
    tasks = list(TASK_DIR.glob("task-*.json"))
    return {
        "ok": True,
        "runtime": "leeway_workboard_runtime",
        "lane": "workboard",
        "capabilities": [
            "visible_operational_trace",
            "thinking_status",
            "todo_list",
            "step_completion",
            "approval_waiting_state",
            "execution_state",
            "blocker_state",
            "artifact_state",
            "receipts"
        ],
        "task_count": len(tasks),
        "created_at": now_iso()
    }


@app.post("/task/create")
def task_create(req: TaskCreate):
    task_id = f"task-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    todo = req.todo or default_todo(req.request, req.task_type)

    task = {
        "task_id": task_id,
        "request": req.request,
        "source": req.source,
        "user_id": req.user_id,
        "task_type": req.task_type,
        "status": req.status,
        "message": "Thinking through the request and preparing the plan.",
        "current_step": 1,
        "todo": [
            {
                "index": i + 1,
                "text": item,
                "status": "PENDING"
            }
            for i, item in enumerate(todo)
        ],
        "blocker": "",
        "artifact_url": "",
        "artifact_path": "",
        "metadata": req.metadata,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }

    if task["todo"]:
        task["todo"][0]["status"] = "ACTIVE"

    write_json(task_path(task_id), task)
    write_json(latest_path(), task)

    add_timeline(task_id, {
        "event": "TASK_CREATED",
        "status": task["status"],
        "message": task["message"]
    })

    rec = receipt("task_created", {
        "verdict": "LEEWAY_WORKBOARD_TASK_CREATED",
        "task_id": task_id,
        "status": task["status"]
    })

    return {"ok": True, "task": task, "receipt": rec}


@app.post("/task/update")
def task_update(req: TaskUpdate):
    path = task_path(req.task_id)
    if not path.exists():
        return {"ok": False, "error": "Task not found", "task_id": req.task_id}

    task = read_json(path)

    if req.status:
        task["status"] = req.status
    if req.message:
        task["message"] = req.message
    if req.current_step:
        task["current_step"] = req.current_step
        for item in task.get("todo", []):
            if item["index"] == req.current_step and item["status"] == "PENDING":
                item["status"] = "ACTIVE"
    if req.completed_step:
        for item in task.get("todo", []):
            if item["index"] == req.completed_step:
                item["status"] = "DONE"
            if item["index"] == req.completed_step + 1 and item["status"] == "PENDING":
                item["status"] = "ACTIVE"
        task["current_step"] = req.completed_step + 1
    if req.blocker:
        task["blocker"] = req.blocker
        task["status"] = "BLOCKED"
    if req.artifact_url:
        task["artifact_url"] = req.artifact_url
    if req.artifact_path:
        task["artifact_path"] = req.artifact_path
    if req.metadata:
        task.setdefault("metadata", {}).update(req.metadata)

    task["updated_at"] = now_iso()

    write_json(path, task)
    write_json(latest_path(), task)

    event = add_timeline(req.task_id, {
        "event": "TASK_UPDATED",
        "status": task.get("status"),
        "message": task.get("message"),
        "current_step": task.get("current_step"),
        "completed_step": req.completed_step,
        "blocker": req.blocker or ""
    })

    return {"ok": True, "task": task, "event": event}


@app.get("/task/latest")
def task_latest():
    path = latest_path()
    if not path.exists():
        return {"ok": False, "message": "No task exists yet."}
    return {"ok": True, "task": read_json(path)}


@app.get("/task/{task_id}")
def task_get(task_id: str):
    path = task_path(task_id)
    if not path.exists():
        return {"ok": False, "error": "Task not found", "task_id": task_id}
    return {"ok": True, "task": read_json(path)}


@app.get("/timeline/{task_id}")
def timeline_get(task_id: str):
    path = TIMELINE_DIR / f"{task_id}.jsonl"
    if not path.exists():
        return {"ok": True, "events": []}

    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                events.append(json.loads(line))
            except Exception:
                pass

    return {"ok": True, "task_id": task_id, "events": events}


@app.get("/receipts/latest")
def receipts_latest():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


@app.get("/", response_class=HTMLResponse)
def home():
    latest = {}
    if latest_path().exists():
        latest = read_json(latest_path())

    todo_html = ""
    for item in latest.get("todo", []):
        mark = "[ ]"
        if item.get("status") == "DONE":
            mark = "[x]"
        elif item.get("status") == "ACTIVE":
            mark = "[...]"
        todo_html += f"<li><b>{mark}</b> {item.get('text')}</li>"

    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Leeway Workboard</title>
<style>
body {{ margin:0; background:#07101f; color:#f4f8ff; font-family:Segoe UI,Arial; }}
main {{ width:min(1100px,94vw); margin:0 auto; padding:36px 0; }}
.card {{ border:1px solid #294766; background:#101d32; border-radius:24px; padding:26px; margin-bottom:18px; }}
.badge {{ color:#58c7ff; font-weight:900; letter-spacing:2px; text-transform:uppercase; }}
h1 {{ font-size:42px; }}
li {{ margin:10px 0; }}
.status {{ color:#8ef6c1; font-weight:900; }}
</style>
</head>
<body>
<main>
<section class="card">
<div class="badge">Agent Lee Workboard</div>
<h1>Visible Operational Trace</h1>
<p>Status: <span class="status">{latest.get('status', 'NO_ACTIVE_TASK')}</span></p>
<p>{latest.get('message', 'No active task yet.')}</p>
</section>
<section class="card">
<h2>Current To-Do List</h2>
<ul>{todo_html}</ul>
</section>
</main>
</body>
</html>"""


