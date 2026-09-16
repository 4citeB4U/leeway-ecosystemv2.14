import html
import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

APP = "leeway_document_runtime"
VERSION = "0.1.0-real-artifact-writer"

DOC_DIR = Path(os.environ.get("LEEWAY_DOC_DIR", "/documents"))
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

DOC_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class DocumentRequest(BaseModel):
    title: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    author: str = "Agent Lee"
    format: str = "pdf"
    source: str = "agent_lee"
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return value[:80] or "document"


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


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


def write_pdf(path: Path, title: str, body: str, author: str):
    doc = SimpleDocTemplate(str(path), pagesize=letter)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(html.escape(title), styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"By {html.escape(author)}", styles["Normal"]),
        Spacer(1, 18),
    ]
    for line in body.splitlines():
        if line.strip():
            story.append(Paragraph(html.escape(line.strip()), styles["BodyText"]))
            story.append(Spacer(1, 8))
    doc.build(story)


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "purpose": "Creates real PDF artifacts for Agent Lee with receipts.",
        "endpoints": ["/health", "/status", "/document/create", "/documents/latest", "/receipts/latest", "/openapi.json"],
        "created_at": now_iso(),
    }


@app.post("/document/create")
def create_document(req: DocumentRequest):
    fmt = req.format.lower().strip()
    if fmt != "pdf":
        fmt = "pdf"

    doc_id = f"doc-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    base = f"{slugify(req.title)}-{doc_id}"
    path = DOC_DIR / f"{base}.pdf"
    text_path = DOC_DIR / f"{base}.txt"
    text_path.write_text(req.body, encoding="utf-8")

    write_pdf(path, req.title, req.body, req.author)

    manifest = {
        "document_id": doc_id,
        "title": req.title,
        "author": req.author,
        "format": "pdf",
        "path": str(path),
        "filename": path.name,
        "text_path": str(text_path),
        "text_filename": text_path.name,
        "artifact_url": f"/documents/file/{path.name}",
        "text_url": f"/documents/file/{text_path.name}",
        "source": req.source,
        "metadata": req.metadata,
        "created_at": now_iso(),
    }

    manifest_path = DOC_DIR / f"{base}.manifest.json"
    write_json(manifest_path, manifest)
    write_json(DOC_DIR / "latest-document.json", manifest)

    receipt = write_receipt("document_created", {
        "verdict": "LEEWAY_DOCUMENT_CREATED",
        "document_id": doc_id,
        "title": req.title,
        "format": "pdf",
        "path": str(path),
        "filename": path.name,
        "text_path": str(text_path),
        "text_filename": text_path.name,
        "artifact_url": f"/documents/file/{path.name}",
        "text_url": f"/documents/file/{text_path.name}",
        "manifest_path": str(manifest_path),
    })

    return {"ok": True, "document": manifest, "receipt": receipt}


@app.get("/documents/latest")
def latest_document():
    path = DOC_DIR / "latest-document.json"
    if not path.exists():
        return {"ok": False, "message": "No document exists yet."}
    return {"ok": True, "document": json.loads(path.read_text(encoding="utf-8"))}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return json.loads(path.read_text(encoding="utf-8"))

@app.get("/documents/file/{filename}")
def get_document_file(filename: str):
    safe = Path(filename).name
    path = DOC_DIR / safe
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Document file not found.")
    return FileResponse(str(path), filename=safe)


@app.get("/documents/latest/content")
def latest_document_content():
    latest = DOC_DIR / "latest-document.json"
    if not latest.exists():
        return {"ok": False, "message": "No document exists yet."}
    manifest = json.loads(latest.read_text(encoding="utf-8"))
    text_path = manifest.get("text_path")
    if not text_path or not Path(text_path).exists():
        return {"ok": False, "message": "No text content found for latest document.", "document": manifest}
    return {
        "ok": True,
        "document": manifest,
        "content": Path(text_path).read_text(encoding="utf-8")
    }


# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_document_runtime"

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

