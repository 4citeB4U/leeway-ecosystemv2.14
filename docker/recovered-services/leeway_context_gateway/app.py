import hashlib
import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from fastapi import FastAPI
from pydantic import BaseModel, Field

APP = "leeway_context_gateway"
VERSION = "0.1.0-local-heuristic-compression"

CONTEXT_DIR = Path(os.environ.get("LEEWAY_CONTEXT_DIR", "/context-store"))
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

ORIGINALS = CONTEXT_DIR / "originals"
COMPRESSED = CONTEXT_DIR / "compressed"
FAILURES = CONTEXT_DIR / "failures"

for p in [ORIGINALS, COMPRESSED, FAILURES, RECEIPT_DIR]:
    p.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class CompressRequest(BaseModel):
    text: str = Field(..., min_length=1)
    content_type: Optional[str] = "text"
    source: Optional[str] = "agent_lee"
    max_chars: Optional[int] = 5000
    preserve_lines_with: List[str] = [
        "ERROR", "FAIL", "Traceback", "Exception", "verdict", "receipt", "http://", "https://",
        "approval_id", "container", "port", "status", "ok", "warning"
    ]
    metadata: Dict[str, Any] = {}


class RetrieveRequest(BaseModel):
    context_id: str = Field(..., min_length=1)


class LearnFailureRequest(BaseModel):
    title: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    evidence: Optional[str] = ""
    metadata: Dict[str, Any] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / 4))


def context_id_for(text: str) -> str:
    digest = hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()[:16]
    return f"ctx-{int(time.time())}-{digest}"


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
    latest = RECEIPT_DIR / "latest.receipt.json"
    write_json(latest, receipt)
    receipt["receipt_path"] = str(path)
    return receipt


def compact_text(text: str, max_chars: int, preserve_terms: List[str]) -> str:
    lines = text.splitlines()
    kept = []
    seen = set()

    # Preserve high-signal lines first.
    for line in lines:
        l = line.strip()
        if not l:
            continue
        if any(term.lower() in l.lower() for term in preserve_terms):
            key = l[:300]
            if key not in seen:
                kept.append(l)
                seen.add(key)

    # Add headings and short structured lines.
    for line in lines:
        l = line.strip()
        if not l:
            continue
        if len(l) <= 220 and (l.endswith(":") or re.match(r"^[-*0-9#. ]{0,8}[A-Za-z0-9_ -]{3,80}", l)):
            key = l[:300]
            if key not in seen:
                kept.append(l)
                seen.add(key)

    # Add beginning and ending context.
    if lines:
        kept.insert(0, "BEGIN CONTEXT SAMPLE:")
        kept.extend([x.strip() for x in lines[:12] if x.strip()])
        kept.append("END CONTEXT SAMPLE:")
        kept.extend([x.strip() for x in lines[-12:] if x.strip()])

    out = "\n".join(kept)
    out = re.sub(r"\n{3,}", "\n\n", out).strip()

    if len(out) > max_chars:
        out = out[:max_chars] + "\n\n[COMPRESSED_TRUNCATION: retrieve original with /retrieve using context_id]"

    if not out:
        out = text[:max_chars]

    return out


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
    return {
        "app": APP,
        "version": VERSION,
        "purpose": "Local-first context compression and retrieval gateway for Leeway sovereign runtime.",
        "endpoints": [
            "/health",
            "/status",
            "/compress",
            "/retrieve",
            "/stats",
            "/learn/failure",
            "/receipts/latest",
            "/openapi.json",
        ],
        "rules": {
            "receipts_remain_complete": True,
            "originals_retrievable": True,
            "external_services_used": False,
            "headroom_full_engine": "planned optional v0.2",
        },
        "context_dir": str(CONTEXT_DIR),
        "created_at": now_iso(),
    }


@app.post("/compress")
def compress(req: CompressRequest):
    original = req.text
    cid = context_id_for(original)
    compressed = compact_text(original, req.max_chars or 5000, req.preserve_lines_with)

    before_tokens = estimate_tokens(original)
    after_tokens = estimate_tokens(compressed)
    saved_tokens = max(0, before_tokens - after_tokens)
    reduction_percent = round((saved_tokens / before_tokens) * 100, 2) if before_tokens else 0.0

    original_record = {
        "context_id": cid,
        "source": req.source,
        "content_type": req.content_type,
        "metadata": req.metadata,
        "text": original,
        "created_at": now_iso(),
    }

    compressed_record = {
        "context_id": cid,
        "source": req.source,
        "content_type": req.content_type,
        "compressed_text": compressed,
        "before_tokens_estimate": before_tokens,
        "after_tokens_estimate": after_tokens,
        "saved_tokens_estimate": saved_tokens,
        "reduction_percent_estimate": reduction_percent,
        "created_at": now_iso(),
    }

    write_json(ORIGINALS / f"{cid}.json", original_record)
    write_json(COMPRESSED / f"{cid}.json", compressed_record)

    receipt = write_receipt("compress", {
        "verdict": "LEEWAY_CONTEXT_COMPRESSED",
        "context_id": cid,
        "source": req.source,
        "content_type": req.content_type,
        "before_tokens_estimate": before_tokens,
        "after_tokens_estimate": after_tokens,
        "saved_tokens_estimate": saved_tokens,
        "reduction_percent_estimate": reduction_percent,
        "original_path": str(ORIGINALS / f"{cid}.json"),
        "compressed_path": str(COMPRESSED / f"{cid}.json"),
    })

    return {
        "ok": True,
        "context_id": cid,
        "compressed_text": compressed,
        "before_tokens_estimate": before_tokens,
        "after_tokens_estimate": after_tokens,
        "saved_tokens_estimate": saved_tokens,
        "reduction_percent_estimate": reduction_percent,
        "receipt": receipt,
    }


@app.post("/retrieve")
def retrieve(req: RetrieveRequest):
    path = ORIGINALS / f"{req.context_id}.json"
    if not path.exists():
        receipt = write_receipt("retrieve_failed", {
            "verdict": "LEEWAY_CONTEXT_RETRIEVE_NOT_FOUND",
            "context_id": req.context_id,
        })
        return {
            "ok": False,
            "message": "Context id not found.",
            "receipt": receipt,
        }

    record = read_json(path)
    receipt = write_receipt("retrieve", {
        "verdict": "LEEWAY_CONTEXT_RETRIEVED",
        "context_id": req.context_id,
        "source": record.get("source"),
    })
    return {
        "ok": True,
        "record": record,
        "receipt": receipt,
    }


@app.get("/stats")
def stats():
    compressed_files = list(COMPRESSED.glob("*.json"))
    total_before = 0
    total_after = 0
    for p in compressed_files:
        try:
            d = read_json(p)
            total_before += int(d.get("before_tokens_estimate", 0))
            total_after += int(d.get("after_tokens_estimate", 0))
        except Exception:
            pass

    saved = max(0, total_before - total_after)
    reduction = round((saved / total_before) * 100, 2) if total_before else 0.0

    return {
        "ok": True,
        "compressed_count": len(compressed_files),
        "before_tokens_estimate": total_before,
        "after_tokens_estimate": total_after,
        "saved_tokens_estimate": saved,
        "reduction_percent_estimate": reduction,
    }


@app.post("/learn/failure")
def learn_failure(req: LearnFailureRequest):
    fid = f"failure-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    record = {
        "failure_id": fid,
        "title": req.title,
        "summary": req.summary,
        "evidence": req.evidence,
        "metadata": req.metadata,
        "created_at": now_iso(),
    }
    path = FAILURES / f"{fid}.json"
    write_json(path, record)

    receipt = write_receipt("learn_failure", {
        "verdict": "LEEWAY_CONTEXT_FAILURE_LEARNED",
        "failure_id": fid,
        "path": str(path),
        "title": req.title,
    })

    return {
        "ok": True,
        "failure": record,
        "receipt": receipt,
    }


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {
            "ok": False,
            "lane": APP,
            "message": "No receipt exists yet.",
        }
    return read_json(path)


# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_context_gateway"

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

