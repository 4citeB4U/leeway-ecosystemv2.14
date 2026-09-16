import json
import os
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse

APP = "leeway_artifact_viewer"
VERSION = "0.1.0-artifact-room-viewer"

STATE_DIR = Path(os.environ.get("LEEWAY_VIEWER_STATE", "/viewer-state"))
DOC_DIR = Path(os.environ.get("LEEWAY_DOCUMENTS_DIR", "/documents"))
NOTEBOOK_DIR = Path(os.environ.get("LEEWAY_NOTEBOOKS_DIR", "/notebooks"))
PUBLIC_BASE_URL = os.environ.get("LEEWAY_PUBLIC_BASE_URL", "http://localhost:5328").rstrip("/")

STATE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, data):
    Path(path).write_text(json.dumps(data, indent=2), encoding="utf-8")


def latest_document_manifest():
    path = DOC_DIR / "latest-document.json"
    if path.exists():
        return read_json(path)
    return None


def latest_notebook_manifest():
    path = NOTEBOOK_DIR / "latest-notebook.json"
    if path.exists():
        return read_json(path)
    return None


def room_html(title, body):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>{title}</title>
  <style>
    body {{
      margin:0;
      background:#080b12;
      color:#f2f6ff;
      font-family: Arial, sans-serif;
    }}
    header {{
      padding:18px 28px;
      background:#111827;
      border-bottom:1px solid #334155;
    }}
    .wrap {{
      display:grid;
      grid-template-columns: 360px 1fr;
      gap:16px;
      padding:16px;
      height:calc(100vh - 78px);
      box-sizing:border-box;
    }}
    .panel {{
      background:#0f172a;
      border:1px solid #334155;
      border-radius:14px;
      padding:16px;
      overflow:auto;
    }}
    iframe {{
      width:100%;
      height:100%;
      border:0;
      background:white;
      border-radius:14px;
    }}
    a {{
      color:#7dd3fc;
    }}
    pre {{
      white-space:pre-wrap;
      line-height:1.45;
    }}
    .badge {{
      display:inline-block;
      padding:4px 8px;
      border-radius:999px;
      background:#1e293b;
      color:#93c5fd;
      margin-right:6px;
      font-size:12px;
    }}
  </style>
</head>
<body>
<header>
  <span class="badge">Agent Lee Artifact Room</span>
  <strong>{title}</strong>
</header>
{body}
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
        "purpose": "Viewable rooms and public artifact links for PDFs, notebooks, websites, images, and 3D viewers.",
        "public_base_url": PUBLIC_BASE_URL,
        "endpoints": [
            "/health",
            "/status",
            "/artifacts/latest",
            "/artifacts/pdf/{filename}",
            "/rooms/latest",
            "/rooms/create/latest",
            "/receipts/latest"
        ],
        "created_at": now_iso()
    }


@app.get("/artifacts/pdf/{filename}")
def pdf_file(filename: str):
    safe = Path(filename).name
    path = DOC_DIR / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF not found.")
    return FileResponse(str(path), filename=safe, media_type="application/pdf")


@app.get("/artifacts/latest")
def latest_artifact():
    doc = latest_document_manifest()
    nb = latest_notebook_manifest()
    if not doc and not nb:
        return {"ok": False, "message": "No latest artifacts found."}

    pdf_url = ""
    if doc and doc.get("filename"):
        pdf_url = f"{PUBLIC_BASE_URL}/artifacts/pdf/{doc.get('filename')}"

    return {
        "ok": True,
        "document": doc,
        "notebook": nb,
        "pdf_url": pdf_url,
        "room_url": f"{PUBLIC_BASE_URL}/rooms/latest"
    }


@app.get("/rooms/latest", response_class=HTMLResponse)
def latest_room():
    doc = latest_document_manifest()
    nb = latest_notebook_manifest()

    if not doc and not nb:
        return room_html("No artifact yet", "<div class='wrap'><div class='panel'>No artifact found.</div></div>")

    title = "Latest Agent Lee Artifact"
    if nb and nb.get("title"):
        title = nb.get("title")
    elif doc and doc.get("title"):
        title = doc.get("title")

    pdf_frame = "<div class='panel'>No PDF found yet.</div>"
    pdf_link = ""
    if doc and doc.get("filename"):
        pdf_url = f"/artifacts/pdf/{doc.get('filename')}"
        pdf_link = f"<p><a href='{pdf_url}' target='_blank'>Open PDF directly</a></p>"
        pdf_frame = f"<iframe src='{pdf_url}'></iframe>"

    content = ""
    if nb and nb.get("content"):
        content = nb.get("content")
    elif doc and doc.get("text_path") and Path(doc.get("text_path")).exists():
        content = Path(doc.get("text_path")).read_text(encoding="utf-8")

    left = f"""
    <div class="panel">
      <h2>{title}</h2>
      <p><strong>Room URL:</strong><br>{PUBLIC_BASE_URL}/rooms/latest</p>
      {pdf_link}
      <h3>Stored Content</h3>
      <pre>{content[:12000]}</pre>
    </div>
    """

    body = f"<div class='wrap'>{left}<div class='panel'>{pdf_frame}</div></div>"
    return room_html(title, body)


@app.post("/rooms/create/latest")
def create_latest_room():
    room_id = f"room-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    doc = latest_document_manifest()
    nb = latest_notebook_manifest()

    room = {
        "room_id": room_id,
        "document": doc,
        "notebook": nb,
        "room_url": f"{PUBLIC_BASE_URL}/rooms/latest",
        "latest_artifact_url": f"{PUBLIC_BASE_URL}/artifacts/latest",
        "created_at": now_iso()
    }

    write_json(STATE_DIR / f"{room_id}.json", room)
    write_json(STATE_DIR / "latest-room.json", room)
    write_json(STATE_DIR / "latest.receipt.json", {
        "verdict": "LEEWAY_ARTIFACT_ROOM_CREATED",
        "lane": APP,
        "version": VERSION,
        "room": room,
        "created_at": now_iso()
    })

    return {"ok": True, "room": room}


@app.get("/receipts/latest")
def latest_receipt():
    path = STATE_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


# ---------------------------------------------------------------------
# LEEWAY ARTIFACT VIEWER WEBSITE ROOM
# Proxies Open Notebook's latest website render as an actual website room.
# ---------------------------------------------------------------------

OPEN_NOTEBOOK_URL = os.environ.get("LEEWAY_OPEN_NOTEBOOK_URL", "http://leeway_open_notebook:5326").rstrip("/")


@app.get("/rooms/website/latest", response_class=HTMLResponse)
def leeway_website_latest_room():
    try:
        r = requests.get(OPEN_NOTEBOOK_URL + "/creative/latest/render/website", timeout=60)
        return HTMLResponse(r.text, status_code=r.status_code)
    except Exception as e:
        return HTMLResponse("<h1>Website room unavailable</h1><pre>" + str(e) + "</pre>", status_code=500)


@app.get("/website/latest.html", response_class=HTMLResponse)
def leeway_website_latest_html():
    try:
        r = requests.get(OPEN_NOTEBOOK_URL + "/creative/latest/render/website", timeout=60)
        return HTMLResponse(r.text, status_code=r.status_code)
    except Exception as e:
        return HTMLResponse("<h1>Website room unavailable</h1><pre>" + str(e) + "</pre>", status_code=500)



# ---------------------------------------------------------------------
# LEEWAY PLAN ROOM
# Shows Agent Lee's plan, tools, mockups, failovers, and approval request.
# ---------------------------------------------------------------------

SKILL_STATE_DIR = Path(os.environ.get("LEEWAY_SKILL_STATE_DIR", "/skill-state"))


def leeway_plan_escape(value):
    try:
        return html.escape(str(value or ""))
    except Exception:
        return str(value or "")


def leeway_load_latest_plan():
    path = SKILL_STATE_DIR / "plans" / "latest-plan.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def leeway_render_plan_room(plan):
    title = "Agent Lee Plan Room"
    pid = leeway_plan_escape(plan.get("plan_id", ""))
    depth = leeway_plan_escape(plan.get("planning_depth", ""))
    domain = leeway_plan_escape(plan.get("domain", ""))
    status = leeway_plan_escape(plan.get("status", ""))
    request = leeway_plan_escape(plan.get("original_request", ""))

    steps = ""
    for i, step in enumerate(plan.get("steps", []), start=1):
        steps += f"<li><span>{i:02d}</span>{leeway_plan_escape(step)}</li>"

    tools = ""
    for tool in plan.get("tools", []):
        tools += f"""
        <div class="tool">
          <h3>{leeway_plan_escape(tool.get("tool"))}</h3>
          <p>{leeway_plan_escape(tool.get("role"))}</p>
        </div>
        """

    mockups = ""
    for m in plan.get("mockups", []):
        mockups += f"""
        <section class="mockup">
          <div class="mockupTop">Mockup {leeway_plan_escape(m.get("mockup_id"))}</div>
          <h3>{leeway_plan_escape(m.get("name"))}</h3>
          <p>{leeway_plan_escape(m.get("description"))}</p>
        </section>
        """

    if not mockups:
        mockups = "<p class='muted'>No visual mockups required for this planning level.</p>"

    failovers = ""
    for f in plan.get("failovers", []):
        failovers += f"""
        <div class="fail">
          <strong>{leeway_plan_escape(f.get("plan"))}</strong>
          <p>{leeway_plan_escape(f.get("rule"))}</p>
        </div>
        """

    standards = ""
    for s in plan.get("standards", []):
        standards += f"<li>{leeway_plan_escape(s)}</li>"

    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title}</title>
<style>
:root {{
  --bg:#07101f;
  --panel:#101d32;
  --panel2:#142540;
  --text:#f4f8ff;
  --muted:#aebcd0;
  --accent:#58c7ff;
  --green:#8ef6c1;
  --warn:#ffd166;
}}
* {{ box-sizing:border-box; }}
body {{
  margin:0;
  background:
    radial-gradient(circle at 12% 10%, rgba(88,199,255,.22), transparent 25%),
    radial-gradient(circle at 84% 12%, rgba(142,246,193,.16), transparent 22%),
    linear-gradient(135deg,#050914,var(--bg));
  color:var(--text);
  font-family:Segoe UI, Inter, Arial, sans-serif;
}}
header {{
  padding:18px 30px;
  border-bottom:1px solid rgba(255,255,255,.1);
  background:rgba(5,9,20,.74);
  backdrop-filter:blur(10px);
  position:sticky;
  top:0;
  z-index:10;
}}
.badge {{
  display:inline-block;
  padding:7px 11px;
  border-radius:999px;
  background:rgba(88,199,255,.10);
  border:1px solid rgba(88,199,255,.35);
  color:var(--accent);
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-size:12px;
}}
.wrap {{
  width:min(1220px,94vw);
  margin:0 auto;
  padding:32px 0 48px;
}}
.hero {{
  border:1px solid rgba(88,199,255,.32);
  border-radius:30px;
  padding:34px;
  background:linear-gradient(135deg, rgba(16,29,50,.95), rgba(20,37,64,.86));
  box-shadow:0 28px 80px rgba(0,0,0,.44);
}}
h1 {{
  margin:20px 0 12px;
  font-size:clamp(42px,7vw,84px);
  line-height:.92;
  letter-spacing:-.065em;
}}
.lead {{
  color:var(--muted);
  font-size:20px;
  line-height:1.45;
  max-width:980px;
}}
.meta {{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
  margin-top:24px;
}}
.meta div, .panel {{
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.055);
  border-radius:22px;
  padding:18px;
}}
.meta strong {{
  color:var(--accent);
  display:block;
  margin-bottom:5px;
}}
.grid {{
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:20px;
  margin-top:22px;
}}
ol {{
  list-style:none;
  padding:0;
  margin:0;
}}
ol li {{
  margin:12px 0;
  padding:14px 16px;
  border-radius:16px;
  background:rgba(255,255,255,.06);
  color:var(--muted);
}}
ol li span {{
  color:var(--green);
  font-weight:900;
  margin-right:12px;
}}
.tools {{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
  gap:14px;
}}
.tool, .mockup, .fail {{
  border:1px solid rgba(255,255,255,.12);
  border-radius:20px;
  padding:18px;
  background:rgba(0,0,0,.20);
}}
.tool h3, .mockup h3 {{
  margin:0 0 8px;
}}
.tool p, .mockup p, .fail p, .muted {{
  color:var(--muted);
  line-height:1.45;
}}
.mockups {{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(310px,1fr));
  gap:16px;
}}
.mockupTop {{
  color:var(--warn);
  font-weight:900;
  letter-spacing:.1em;
  text-transform:uppercase;
  font-size:12px;
}}
.approval {{
  margin-top:22px;
  border:1px solid rgba(142,246,193,.35);
  background:rgba(142,246,193,.10);
  padding:22px;
  border-radius:24px;
}}
code {{
  color:var(--green);
  font-size:18px;
}}
@media(max-width:900px) {{
  .grid, .meta {{ grid-template-columns:1fr; }}
}}
</style>
</head>
<body>
<header><span class="badge">Agent Lee Plan Room</span></header>
<main class="wrap">
<section class="hero">
  <span class="badge">{depth} Planning</span>
  <h1>Plan before execution.</h1>
  <p class="lead">Agent Lee translated the request into a structured Leeway to-do list, selected tools, created failovers, and marked the approval point before heavy execution.</p>

  <section class="meta">
    <div><strong>Plan ID</strong>{pid}</div>
    <div><strong>Domain</strong>{domain}</div>
    <div><strong>Depth</strong>{depth}</div>
    <div><strong>Status</strong>{status}</div>
  </section>

  <section class="panel" style="margin-top:20px;">
    <strong>Original Request</strong>
    <p class="muted">{request}</p>
  </section>

  <section class="grid">
    <div class="panel">
      <h2>To-do list</h2>
      <ol>{steps}</ol>
    </div>
    <div class="panel">
      <h2>Fail-safes</h2>
      {failovers}
    </div>
  </section>

  <section class="panel" style="margin-top:20px;">
    <h2>Visual / Concept Previews</h2>
    <div class="mockups">{mockups}</div>
  </section>

  <section class="panel" style="margin-top:20px;">
    <h2>Tools, workers, and lanes</h2>
    <div class="tools">{tools}</div>
  </section>

  <section class="panel" style="margin-top:20px;">
    <h2>Leeway Standards</h2>
    <ul>{standards}</ul>
  </section>

  <section class="approval">
    <h2>Approval command</h2>
    <p>Send one of these in Telegram when ready:</p>
    <p><code>approve the plan</code></p>
    <p><code>run the plan</code></p>
    <p><code>edit the plan: ...</code></p>
  </section>
</section>
</main>
</body>
</html>"""


@app.get("/rooms/plan/latest", response_class=HTMLResponse)
def leeway_plan_room_latest():
    plan = leeway_load_latest_plan()
    if not plan:
        return HTMLResponse("<h1>No plan found.</h1>", status_code=404)
    return HTMLResponse(leeway_render_plan_room(plan))


@app.get("/plan/latest.html", response_class=HTMLResponse)
def leeway_plan_latest_html():
    plan = leeway_load_latest_plan()
    if not plan:
        return HTMLResponse("<h1>No plan found.</h1>", status_code=404)
    return HTMLResponse(leeway_render_plan_room(plan))



# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_artifact_viewer"

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

