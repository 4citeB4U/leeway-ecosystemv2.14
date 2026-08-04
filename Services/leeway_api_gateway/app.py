import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

import requests
from fastapi import FastAPI
from pydantic import BaseModel, Field

APP = "leeway_api_gateway"
VERSION = "0.3.0-approval-executor-front-door"

RESEARCH_URL = os.environ.get("LEEWAY_RESEARCH_URL", "http://leeway_research_lane:5310").rstrip("/")
STORAGE_URL = os.environ.get("LEEWAY_STORAGE_URL", "http://leeway_seafile_storage_gateway:5314").rstrip("/")
RUNTIME_URL = os.environ.get("LEEWAY_RUNTIME_FABRIC_URL", "http://leeway_runtime_fabric:4001").rstrip("/")

RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
CRM_DIR = Path(os.environ.get("LEEWAY_CRM_DIR", "/app/crm"))
APPROVAL_DIR = Path(os.environ.get("LEEWAY_APPROVAL_DIR", "/app/approvals"))

RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
CRM_DIR.mkdir(parents=True, exist_ok=True)
APPROVAL_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = 8
    source: Optional[str] = "leeway_api_gateway"


class StoreRequest(BaseModel):
    name: str = Field(..., min_length=1)
    content: Optional[str] = ""
    content_base64: Optional[str] = None
    metadata: Dict[str, Any] = {}
    mirror_to_seafile_shared: bool = True


class BackupRequest(BaseModel):
    include_runtime_contracts: bool = True
    include_gateway_store: bool = True
    include_receipts: bool = True
    label: Optional[str] = "manual"


class DateNightPlanRequest(BaseModel):
    request_text: str = Field(..., min_length=1)
    location: Optional[str] = "Milwaukee, Wisconsin"
    cuisine: Optional[str] = "Italian"
    budget_usd: Optional[int] = 200
    day_hint: Optional[str] = "next Wednesday"
    party_size: Optional[int] = 2
    source: Optional[str] = "telegram"


class CrmRecord(BaseModel):
    kind: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    data: Dict[str, Any] = {}
    source: Optional[str] = "agent_lee"


class PhoneCallApprovalRequest(BaseModel):
    target_name: str = Field(..., min_length=1)
    phone_number: Optional[str] = None
    purpose: str = Field(..., min_length=1)
    script: str = Field(..., min_length=1)
    related_plan_id: Optional[str] = None
    requested_by: Optional[str] = "agent_lee"
    source: Optional[str] = "telegram"


class EmailApprovalRequest(BaseModel):
    to: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    cc: Optional[str] = ""
    bcc: Optional[str] = ""
    attachments: List[str] = []
    related_plan_id: Optional[str] = None
    requested_by: Optional[str] = "agent_lee"
    source: Optional[str] = "telegram"


class CalendarApprovalRequest(BaseModel):
    title: str = Field(..., min_length=1)
    start_time: str = Field(..., min_length=1)
    end_time: Optional[str] = ""
    location: Optional[str] = ""
    description: Optional[str] = ""
    attendees: List[str] = []
    related_plan_id: Optional[str] = None
    requested_by: Optional[str] = "agent_lee"
    source: Optional[str] = "telegram"


class ApprovalDecision(BaseModel):
    approval_id: str = Field(..., min_length=1)
    decided_by: Optional[str] = "user"
    note: Optional[str] = ""


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def safe_name(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._ -]+", "_", value).strip()[:160] or uuid.uuid4().hex


def slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")[:100] or uuid.uuid4().hex


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
    path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    latest = RECEIPT_DIR / "latest.receipt.json"
    latest.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    receipt["receipt_path"] = str(path)
    return receipt


def post_json(url: str, payload: Dict[str, Any], timeout: int = 60):
    r = requests.post(url, json=payload, timeout=timeout)
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:4000]}
    return r.status_code, data


def get_json(url: str, timeout: int = 15):
    r = requests.get(url, timeout=timeout)
    try:
        data = r.json()
    except Exception:
        data = {"raw": r.text[:4000]}
    return r.status_code, data


def crm_path(kind: str, name: str) -> Path:
    folder = CRM_DIR / safe_name(kind)
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{slug(name)}.json"


def crm_upsert(kind: str, name: str, data: Dict[str, Any], source: str = "agent_lee") -> Dict[str, Any]:
    path = crm_path(kind, name)
    existing = {}
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            existing = {}

    record = {
        **existing,
        "kind": kind,
        "name": name,
        "data": {**existing.get("data", {}), **data},
        "source": source,
        "updated_at": now_iso(),
        "created_at": existing.get("created_at") or now_iso(),
    }
    path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    receipt = write_receipt("crm_upsert", {
        "verdict": "LEEWAY_CRM_RECORD_UPSERTED",
        "kind": kind,
        "name": name,
        "path": str(path),
    })
    return {"ok": True, "record": record, "path": str(path), "receipt": receipt}


def crm_search_text(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    q = query.lower()
    out = []
    for p in CRM_DIR.rglob("*.json"):
        try:
            text = p.read_text(encoding="utf-8")
            if q in text.lower():
                out.append(json.loads(text))
        except Exception:
            pass
        if len(out) >= limit:
            break
    return out


def approval_path(approval_id: str) -> Path:
    return APPROVAL_DIR / f"{safe_name(approval_id)}.json"


def write_approval(record: Dict[str, Any]) -> Dict[str, Any]:
    approval_id = record.get("approval_id") or f"approval-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    record["approval_id"] = approval_id
    record["updated_at"] = now_iso()
    record.setdefault("created_at", now_iso())
    path = approval_path(approval_id)
    path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    return record


def read_approval(approval_id: str) -> Optional[Dict[str, Any]]:
    path = approval_path(approval_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def create_approval(action_type: str, payload: Dict[str, Any], summary: str, requested_by: str = "agent_lee") -> Dict[str, Any]:
    record = {
        "approval_id": f"{action_type}-{int(time.time())}-{uuid.uuid4().hex[:8]}",
        "action_type": action_type,
        "status": "PENDING_APPROVAL",
        "summary": summary,
        "payload": payload,
        "requested_by": requested_by,
        "execution_status": "NOT_EXECUTED",
        "execution_note": "This approval layer only prepares and records actions. Real execution lane is not enabled yet.",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    record = write_approval(record)

    crm_upsert("approval", record["approval_id"], record, source=requested_by)

    receipt = write_receipt("approval_requested", {
        "verdict": "LEEWAY_APPROVAL_REQUEST_CREATED",
        "approval_id": record["approval_id"],
        "action_type": action_type,
        "status": record["status"],
        "summary": summary,
    })

    try:
        post_json(STORAGE_URL + "/store/receipt", {
            "name": f"{record['approval_id']}.json",
            "content": json.dumps(record, indent=2),
            "metadata": {"kind": "approval_request", "action_type": action_type},
            "mirror_to_seafile_shared": True,
        }, timeout=60)
    except Exception:
        pass

    return {
        "ok": True,
        "approval": record,
        "receipt": receipt,
        "message": "Approval request created. No external action has been executed.",
    }


def list_approvals(status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    rows = []
    for p in sorted(APPROVAL_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            rec = json.loads(p.read_text(encoding="utf-8"))
            if status and rec.get("status") != status:
                continue
            rows.append(rec)
        except Exception:
            pass
        if len(rows) >= limit:
            break
    return rows


def decide_approval(decision: ApprovalDecision, new_status: str) -> Dict[str, Any]:
    rec = read_approval(decision.approval_id)
    if not rec:
        receipt = write_receipt("approval_decision_failed", {
            "verdict": "LEEWAY_APPROVAL_NOT_FOUND",
            "approval_id": decision.approval_id,
            "requested_status": new_status,
        })
        return {"ok": False, "message": "Approval request not found.", "receipt": receipt}

    if rec.get("status") != "PENDING_APPROVAL":
        receipt = write_receipt("approval_decision_ignored", {
            "verdict": "LEEWAY_APPROVAL_ALREADY_DECIDED",
            "approval_id": decision.approval_id,
            "current_status": rec.get("status"),
            "requested_status": new_status,
        })
        return {"ok": False, "message": "Approval was already decided.", "approval": rec, "receipt": receipt}

    rec["status"] = new_status
    rec["decided_by"] = decision.decided_by
    rec["decision_note"] = decision.note
    rec["decided_at"] = now_iso()

    if new_status == "APPROVED":
        rec["execution_status"] = "APPROVED_NOT_EXECUTED"
        rec["execution_note"] = "Approved, but real action execution is not enabled in this layer yet."
    else:
        rec["execution_status"] = "REJECTED_NOT_EXECUTED"
        rec["execution_note"] = "Rejected by user. No external action was executed."

    rec = write_approval(rec)
    crm_upsert("approval", rec["approval_id"], rec, source=decision.decided_by or "user")

    receipt = write_receipt("approval_decision", {
        "verdict": "LEEWAY_APPROVAL_APPROVED_NOT_EXECUTED" if new_status == "APPROVED" else "LEEWAY_APPROVAL_REJECTED",
        "approval_id": rec["approval_id"],
        "action_type": rec.get("action_type"),
        "status": rec["status"],
        "execution_status": rec["execution_status"],
        "note": decision.note,
    })

    return {"ok": True, "approval": rec, "receipt": receipt}


def extract_budget(text: str, default: int = 200) -> int:
    m = re.search(r"\$?\s*(\d{2,5})", text)
    if m:
        return int(m.group(1))
    return default


def extract_cuisine(text: str, default: str = "Italian") -> str:
    cuisines = ["italian", "mexican", "steak", "seafood", "sushi", "chinese", "thai", "indian", "vegan", "pizza", "fine dining"]
    lower = text.lower()
    for c in cuisines:
        if c in lower:
            return c.title()
    return default


def extract_location(text: str, default: str = "Milwaukee, Wisconsin") -> str:
    lower = text.lower()
    if "milwaukee" in lower:
        return "Milwaukee, Wisconsin"
    if "brookfield" in lower:
        return "Brookfield, Wisconsin"
    if "racine" in lower:
        return "Racine, Wisconsin"
    if "west allis" in lower:
        return "West Allis, Wisconsin"
    return default


def build_date_night_plan(req: DateNightPlanRequest) -> Dict[str, Any]:
    text = req.request_text
    location = extract_location(text, req.location or "Milwaukee, Wisconsin")
    cuisine = extract_cuisine(text, req.cuisine or "Italian")
    budget = extract_budget(text, req.budget_usd or 200)
    day_label = req.day_hint or "next Wednesday"
    party_size = req.party_size or 2

    deep_query = f"best {cuisine} restaurant {location} dinner for two under ${budget}"
    code, research = post_json(RESEARCH_URL + "/search/deep", {"query": deep_query, "limit": 8, "source": "leeway_gateway_planner"}, timeout=120)

    results = []
    try:
        results = research.get("results") or research.get("upstream", {}).get("results") or []
    except Exception:
        results = []

    answer_lines = [
        f"I got it. This is a {cuisine} dinner plan for {party_size} near {location}, aiming around ${budget}, for {day_label}.",
        "",
        "Best working schedule:",
        "- Target reservation window: 6:30 PM to 7:30 PM.",
        "- Arrive 10 minutes early.",
        "- Keep the budget controlled with one appetizer, two entrees, and either shared dessert or two drinks.",
        "",
        "Restaurant research candidates:",
    ]

    if results:
        for i, r in enumerate(results[:5], 1):
            answer_lines.append(f"{i}. {r.get('title') or r.get('name') or 'Candidate'} — {r.get('snippet') or ''} {r.get('url') or ''}".strip())
    else:
        answer_lines.append("- The research lane did not return strong candidates yet. I can still prepare the plan and follow-up workflow.")

    answer_lines += [
        "",
        "Approval-required next actions I can prepare:",
        "- Phone call request to book the table.",
        "- Email/message request if a restaurant has email or contact form.",
        "- Calendar event request after you choose the restaurant/time.",
        "",
        "I will not call, email, or calendar anything until you approve it.",
    ]

    answer = "\n".join(answer_lines)

    plan_record = crm_upsert("plan", f"{cuisine} dinner near {location} {day_label}", {
        "request_text": text,
        "location": location,
        "cuisine": cuisine,
        "budget_usd": budget,
        "day_hint": day_label,
        "party_size": party_size,
        "research": research,
        "answer": answer,
        "approval_required_next_actions": ["phone_call", "email", "calendar_event"],
    }, source=req.source or "telegram")

    receipt = write_receipt("date_night_plan", {
        "verdict": "LEEWAY_DATE_NIGHT_PLAN_CREATED",
        "request": req.model_dump(),
        "parsed": {
            "location": location,
            "cuisine": cuisine,
            "budget_usd": budget,
            "day_hint": day_label,
            "party_size": party_size,
        },
        "plan_crm": plan_record.get("path"),
        "answer": answer,
    })

    return {
        "ok": True,
        "lane": APP,
        "kind": "date_night_plan",
        "answer": answer,
        "plan_record": plan_record,
        "receipt": receipt,
    }


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    return {
        "app": APP,
        "version": VERSION,
        "purpose": "Single sovereign internal API front door for Agent Lee and Leeway lanes.",
        "routes": [
            "/health", "/status", "/capabilities", "/lanes/health",
            "/research/quick", "/research/deep",
            "/plan/date-night",
            "/approval/request-phone-call", "/approval/request-email", "/approval/request-calendar-event",
            "/approvals/pending", "/approvals/approve", "/approvals/reject", "/approvals/history",
            "/crm/upsert-contact", "/crm/upsert-company", "/crm/upsert-plan", "/crm/search",
            "/store/receipt", "/store/research-brief", "/store/notebook-export", "/store/generated-image", "/store/3d-package",
            "/backup/run", "/backup/status", "/receipts/latest",
        ],
        "created_at": now_iso(),
    }


@app.get("/capabilities")
def capabilities():
    return {
        "ok": True,
        "gateway": APP,
        "capabilities": {
            "research": {"quick": "/research/quick", "deep": "/research/deep"},
            "planner": {"date_night": "/plan/date-night"},
            "approval_executor": {
                "request_phone_call": "/approval/request-phone-call",
                "request_email": "/approval/request-email",
                "request_calendar_event": "/approval/request-calendar-event",
                "pending": "/approvals/pending",
                "approve": "/approvals/approve",
                "reject": "/approvals/reject",
            },
            "crm": {"upsert_company": "/crm/upsert-company", "upsert_contact": "/crm/upsert-contact", "upsert_plan": "/crm/upsert-plan", "search": "/crm/search"},
            "storage": {"receipt": "/store/receipt", "research_brief": "/store/research-brief", "backup": "/backup/run"},
        },
        "approval_model": {
            "planning": "no approval",
            "crm_memory": "allowed for user-requested research/plans",
            "phone_call": "approval required",
            "email_send": "approval required",
            "calendar_create": "approval required",
            "current_execution": "approval records only; real external execution intentionally disabled until executor lanes are proven",
        },
    }


@app.get("/lanes/health")
def lanes_health():
    checks = {}
    for name, base in {"research": RESEARCH_URL, "storage": STORAGE_URL, "runtime_fabric": RUNTIME_URL}.items():
        try:
            code, data = get_json(base + "/health", timeout=8)
            checks[name] = {"ok": code < 400, "status": code, "data": data}
        except Exception as e:
            checks[name] = {"ok": False, "error": repr(e)}
    ok = all(v.get("ok") for v in checks.values())
    receipt = write_receipt("lanes_health", {"verdict": "LEEWAY_API_GATEWAY_LANES_HEALTH_OK" if ok else "LEEWAY_API_GATEWAY_LANES_HEALTH_DEGRADED", "checks": checks})
    return {"ok": ok, "checks": checks, "receipt": receipt}


@app.post("/research/quick")
def research_quick(req: SearchRequest):
    code, data = post_json(RESEARCH_URL + "/search/quick", req.model_dump(), timeout=70)
    receipt = write_receipt("research_quick_proxy", {"verdict": "LEEWAY_API_GATEWAY_RESEARCH_QUICK_COMPLETE" if code < 400 else "LEEWAY_API_GATEWAY_RESEARCH_QUICK_FAILED", "upstream_status": code, "query": req.query})
    return {"ok": code < 400 and bool(data.get("ok", False)), "gateway_receipt": receipt, "upstream": data}


@app.post("/research/deep")
def research_deep(req: SearchRequest):
    code, data = post_json(RESEARCH_URL + "/search/deep", req.model_dump(), timeout=120)
    receipt = write_receipt("research_deep_proxy", {"verdict": "LEEWAY_API_GATEWAY_RESEARCH_DEEP_COMPLETE" if code < 400 else "LEEWAY_API_GATEWAY_RESEARCH_DEEP_FAILED", "upstream_status": code, "query": req.query})
    return {"ok": code < 400 and bool(data.get("ok", False)), "gateway_receipt": receipt, "upstream": data}


@app.post("/plan/date-night")
def plan_date_night(req: DateNightPlanRequest):
    return build_date_night_plan(req)


@app.post("/approval/request-phone-call")
def request_phone_call(req: PhoneCallApprovalRequest):
    summary = f"Phone call requested to {req.target_name}" + (f" at {req.phone_number}" if req.phone_number else "")
    return create_approval("phone_call", req.model_dump(), summary, req.requested_by or "agent_lee")


@app.post("/approval/request-email")
def request_email(req: EmailApprovalRequest):
    summary = f"Email requested to {req.to}: {req.subject}"
    return create_approval("email", req.model_dump(), summary, req.requested_by or "agent_lee")


@app.post("/approval/request-calendar-event")
def request_calendar_event(req: CalendarApprovalRequest):
    summary = f"Calendar event requested: {req.title} at {req.start_time}"
    return create_approval("calendar_event", req.model_dump(), summary, req.requested_by or "agent_lee")


@app.get("/approvals/pending")
def approvals_pending(limit: int = 50):
    return {"ok": True, "approvals": list_approvals("PENDING_APPROVAL", limit)}


@app.get("/approvals/history")
def approvals_history(limit: int = 100):
    return {"ok": True, "approvals": list_approvals(None, limit)}


@app.post("/approvals/approve")
def approvals_approve(req: ApprovalDecision):
    return decide_approval(req, "APPROVED")


@app.post("/approvals/reject")
def approvals_reject(req: ApprovalDecision):
    return decide_approval(req, "REJECTED")


@app.post("/crm/upsert-contact")
def crm_upsert_contact(req: CrmRecord):
    return crm_upsert("contact", req.name, req.data, req.source or "agent_lee")


@app.post("/crm/upsert-company")
def crm_upsert_company(req: CrmRecord):
    return crm_upsert("company", req.name, req.data, req.source or "agent_lee")


@app.post("/crm/upsert-plan")
def crm_upsert_plan(req: CrmRecord):
    return crm_upsert("plan", req.name, req.data, req.source or "agent_lee")


@app.get("/crm/search")
def crm_search(q: str, limit: int = 20):
    return {"ok": True, "query": q, "results": crm_search_text(q, limit)}


def storage_proxy(path: str, req: StoreRequest, kind: str):
    code, data = post_json(STORAGE_URL + path, req.model_dump(), timeout=90)
    receipt = write_receipt(f"store_{kind}_proxy", {"verdict": f"LEEWAY_API_GATEWAY_STORE_{kind.upper()}_COMPLETE" if code < 400 else f"LEEWAY_API_GATEWAY_STORE_{kind.upper()}_FAILED", "upstream_status": code, "name": req.name})
    return {"ok": code < 400 and bool(data.get("ok", False)), "gateway_receipt": receipt, "upstream": data}


@app.post("/store/receipt")
def store_receipt(req: StoreRequest):
    return storage_proxy("/store/receipt", req, "receipt")


@app.post("/store/research-brief")
def store_research_brief(req: StoreRequest):
    return storage_proxy("/store/research-brief", req, "research_brief")


@app.post("/store/notebook-export")
def store_notebook_export(req: StoreRequest):
    return storage_proxy("/store/notebook-export", req, "notebook_export")


@app.post("/store/generated-image")
def store_generated_image(req: StoreRequest):
    return storage_proxy("/store/generated-image", req, "generated_image")


@app.post("/store/3d-package")
def store_3d_package(req: StoreRequest):
    return storage_proxy("/store/3d-package", req, "three_d_package")


@app.post("/backup/run")
def backup_run(req: BackupRequest):
    code, data = post_json(STORAGE_URL + "/backup/run", req.model_dump(), timeout=180)
    receipt = write_receipt("backup_run_proxy", {"verdict": "LEEWAY_API_GATEWAY_BACKUP_RUN_COMPLETE" if code < 400 else "LEEWAY_API_GATEWAY_BACKUP_RUN_FAILED", "upstream_status": code})
    return {"ok": code < 400 and bool(data.get("ok", False)), "gateway_receipt": receipt, "upstream": data}


@app.get("/backup/status")
def backup_status():
    code, data = get_json(STORAGE_URL + "/backup/status", timeout=30)
    return {"ok": code < 400, "upstream": data}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "lane": APP, "message": "No receipt exists yet."}
    return json.loads(path.read_text(encoding="utf-8"))
