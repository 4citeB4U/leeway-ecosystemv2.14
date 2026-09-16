import json
import os
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

RUNTIME_NAME = os.environ.get("LEEWAY_RUNTIME_NAME", "leeway_runtime")
RUNTIME_TITLE = os.environ.get("LEEWAY_RUNTIME_TITLE", "Leeway Runtime")
RUNTIME_LANE = os.environ.get("LEEWAY_RUNTIME_LANE", "runtime")
RUNTIME_PORT = int(os.environ.get("LEEWAY_RUNTIME_PORT", "5330"))

STATE_DIR = Path(os.environ.get("LEEWAY_RUNTIME_STATE", "/state"))
WORK_DIR = STATE_DIR / "work-orders"
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

STATE_DIR.mkdir(parents=True, exist_ok=True)
WORK_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

try:
    TRUTH = json.loads(os.environ.get("LEEWAY_RUNTIME_TRUTH_JSON", "{}"))
except Exception:
    TRUTH = {}

try:
    CAPABILITIES = json.loads(os.environ.get("LEEWAY_RUNTIME_CAPABILITIES_JSON", "[]"))
except Exception:
    CAPABILITIES = []

app = FastAPI(title=RUNTIME_TITLE, version="0.1.1-container-shell")


class WorkOrder(BaseModel):
    request: str = Field(..., min_length=1)
    source: str = "skill_router"
    user_id: str = "owner"
    plan_id: Optional[str] = ""
    approval_state: str = "PENDING_APPROVAL"
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_receipt(kind: str, payload: Dict[str, Any]):
    receipt = {
        "verdict": payload.get("verdict", f"{RUNTIME_NAME}_{kind.upper()}"),
        "runtime": RUNTIME_NAME,
        "title": RUNTIME_TITLE,
        "lane": RUNTIME_LANE,
        "kind": kind,
        "created_at": now_iso(),
        **payload
    }
    path = RECEIPT_DIR / f"{RUNTIME_NAME}_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    write_json(path, receipt)
    write_json(RECEIPT_DIR / "latest.receipt.json", receipt)
    receipt["receipt_path"] = str(path)
    return receipt


@app.get("/health")
def health():
    return {
        "ok": True,
        "runtime": RUNTIME_NAME,
        "title": RUNTIME_TITLE,
        "lane": RUNTIME_LANE,
        "port": RUNTIME_PORT,
        "created_at": now_iso()
    }


@app.get("/status")
def status():
    return {
        "ok": True,
        "runtime": RUNTIME_NAME,
        "title": RUNTIME_TITLE,
        "lane": RUNTIME_LANE,
        "port": RUNTIME_PORT,
        "truth": TRUTH,
        "capabilities": CAPABILITIES,
        "work_order_count": len(list(WORK_DIR.glob("*.json"))),
        "created_at": now_iso()
    }


@app.post("/work/create")
def create_work(order: WorkOrder):
    work_id = f"work-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    data = {
        "work_id": work_id,
        "runtime": RUNTIME_NAME,
        "lane": RUNTIME_LANE,
        "request": order.request,
        "source": order.source,
        "user_id": order.user_id,
        "plan_id": order.plan_id,
        "approval_state": order.approval_state,
        "metadata": order.metadata,
        "status": "WORK_ORDER_CREATED",
        "truth": TRUTH,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }

    write_json(WORK_DIR / f"{work_id}.json", data)
    write_json(WORK_DIR / "latest-work-order.json", data)

    receipt = write_receipt("work_order_created", {
        "verdict": f"{RUNTIME_NAME.upper()}_WORK_ORDER_CREATED",
        "work_id": work_id,
        "approval_state": order.approval_state,
        "plan_id": order.plan_id
    })

    return {
        "ok": True,
        "message": "Work order created. This runtime shell does not pretend provider/device execution is complete.",
        "work_order": data,
        "receipt": receipt
    }


@app.get("/work/latest")
def latest_work():
    path = WORK_DIR / "latest-work-order.json"
    if not path.exists():
        return {"ok": False, "message": "No work order exists yet."}
    return {"ok": True, "work_order": read_json(path)}


@app.get("/work")
def list_work():
    items = []
    for path in sorted(WORK_DIR.glob("work-*.json"), key=lambda x: x.stat().st_mtime, reverse=True)[:100]:
        try:
            items.append(read_json(path))
        except Exception:
            pass
    return {"ok": True, "work_orders": items}


@app.get("/receipts/latest")
def receipts_latest():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


@app.get("/", response_class=HTMLResponse)
def home():
    cards = "".join([f"<li>{c}</li>" for c in CAPABILITIES])
    truth = "".join([f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in TRUTH.items()])
    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>{RUNTIME_TITLE}</title>
<style>
body {{
  margin:0;
  background:#07101f;
  color:#f4f8ff;
  font-family:Segoe UI, Arial, sans-serif;
}}
main {{
  width:min(980px,94vw);
  margin:0 auto;
  padding:40px 0;
}}
.card {{
  border:1px solid #294766;
  border-radius:24px;
  background:#101d32;
  padding:26px;
}}
h1 {{
  font-size:44px;
  letter-spacing:-.04em;
}}
td {{
  border-bottom:1px solid #294766;
  padding:10px;
}}
li {{
  margin:8px 0;
}}
.badge {{
  color:#58c7ff;
  font-weight:900;
}}
</style>
</head>
<body>
<main>
  <section class="card">
    <div class="badge">Leeway Runtime Container</div>
    <h1>{RUNTIME_TITLE}</h1>
    <p>Lane: {RUNTIME_LANE}</p>
    <p>Port: {RUNTIME_PORT}</p>
    <h2>Truth</h2>
    <table>{truth}</table>
    <h2>Capabilities</h2>
    <ul>{cards}</ul>
  </section>
</main>
</body>
</html>"""


# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_desktop_runtime"

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

