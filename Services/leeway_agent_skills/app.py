import json as _leeway_json
import os as _leeway_os
from pathlib import Path as _LeewayPath
import json
import os
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

APP = "leeway_agent_skills"
VERSION = "0.1.0-skill-registry"

SKILLS_DIR = Path(os.environ.get("LEEWAY_SKILLS_DIR", "/skills"))
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

SKILLS_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class SkillRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    lanes: List[str] = []
    triggers: List[str] = []
    approval_required: bool = False
    status: str = "LIVE"
    recipe: List[str] = []
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


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


def registry_path():
    return SKILLS_DIR / "skills-registry.json"


def default_registry():
    return {
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "skills": {
            "longform_story_to_pdf": {
                "name": "longform_story_to_pdf",
                "description": "Create a long-form story in leeway_open_notebook, export it through leeway_document_runtime, and deliver artifact through Telegram.",
                "lanes": ["leeway_open_notebook", "leeway_document_runtime", "leeway_skill_router", "agent-lee-telegram-shell"],
                "triggers": ["write story", "4 page story", "fantasy story", "put it in a pdf"],
                "approval_required": False,
                "status": "LIVE_PARTIAL_DELIVERY_PATCH_REQUIRED",
                "recipe": [
                    "create_notebook",
                    "export_pdf",
                    "return_document_artifact",
                    "telegram_send_document"
                ]
            },
            "readback_exact_notebook": {
                "name": "readback_exact_notebook",
                "description": "Read back exact stored notebook content instead of inventing a summary.",
                "lanes": ["leeway_open_notebook", "leeway_skill_router", "agent-lee-telegram-shell"],
                "triggers": ["read it back", "read full story", "read the poem", "what did you write"],
                "approval_required": False,
                "status": "LIVE_AFTER_SKILL_ROUTER_PATCH",
                "recipe": ["retrieve_latest_notebook", "return_exact_content"]
            },
            "revise_notebook_until_approved": {
                "name": "revise_notebook_until_approved",
                "description": "Revise a stored notebook artifact while preserving versions and receipts.",
                "lanes": ["leeway_open_notebook", "leeway_skill_router"],
                "triggers": ["revise it", "make it longer", "change the ending", "edit it"],
                "approval_required": False,
                "status": "LIVE"
            },
            "email_artifact_after_approval": {
                "name": "email_artifact_after_approval",
                "description": "Email a stored artifact after approval using leeway_email_runtime.",
                "lanes": ["leeway_email_runtime", "leeway_skill_router", "leeway_api_gateway"],
                "triggers": ["email it", "send it to", "send the pdf"],
                "approval_required": True,
                "status": "PLANNED_UNTIL_EMAIL_RUNTIME"
            },
            "calendar_event_after_approval": {
                "name": "calendar_event_after_approval",
                "description": "Create calendar event after approval using leeway_calendar_runtime.",
                "lanes": ["leeway_calendar_runtime", "leeway_skill_router", "leeway_api_gateway"],
                "triggers": ["add to calendar", "schedule it", "create event"],
                "approval_required": True,
                "status": "PLANNED_UNTIL_CALENDAR_RUNTIME"
            },
            "phone_call_after_approval": {
                "name": "phone_call_after_approval",
                "description": "Call or SMS through authorized phone/SIP/Android channel after approval.",
                "lanes": ["leeway_phone_runtime", "leeway_skill_router", "leeway_api_gateway"],
                "triggers": ["call", "text", "sms", "dial"],
                "approval_required": True,
                "status": "PLANNED_UNTIL_PHONE_RUNTIME"
            },
            "website_preview_iterate": {
                "name": "website_preview_iterate",
                "description": "Create website preview, return view link, and keep editing through Telegram.",
                "lanes": ["leeway_browser_runtime", "leeway_open_notebook", "leeway_skill_router"],
                "triggers": ["create website", "make a landing page", "preview site", "edit website"],
                "approval_required": False,
                "status": "PLANNED_UNTIL_BROWSER_RUNTIME"
            },
            "three_d_viewer_delivery": {
                "name": "three_d_viewer_delivery",
                "description": "Create 3D artifact, return viewer/package link, and deliver preview through Telegram.",
                "lanes": ["agent-lee-image-to-3d-pattern-lane", "leeway_skill_router", "agent-lee-telegram-shell"],
                "triggers": ["3d object", "3d model", "view 3d"],
                "approval_required": False,
                "status": "PARTIAL_EXISTING_3D_LANE_NEEDS_DELIVERY_ROUTE"
            }
        }
    }


def load_registry():
    path = registry_path()
    if not path.exists():
        reg = default_registry()
        write_json(path, reg)
        return reg
    return read_json(path)


def save_registry(reg):
    reg["updated_at"] = now_iso()
    write_json(registry_path(), reg)


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    reg = load_registry()
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "purpose": "Agent Lee skill registry and skill composition layer.",
        "skill_count": len(reg.get("skills", {})),
        "endpoints": ["/health", "/status", "/skills", "/skills/register", "/skills/{name}", "/skills/search", "/receipts/latest", "/openapi.json"],
        "created_at": now_iso()
    }


@app.get("/skills")
def skills():
    return {"ok": True, "registry": load_registry()}


@app.get("/skills/{name}")
def get_skill(name: str):
    reg = load_registry()
    skill = reg.get("skills", {}).get(name)
    return {"ok": skill is not None, "skill": skill}


@app.get("/skills/search")
def search_skills(q: str):
    reg = load_registry()
    ql = q.lower()
    matches = []
    for skill in reg.get("skills", {}).values():
        hay = " ".join([
            skill.get("name", ""),
            skill.get("description", ""),
            " ".join(skill.get("triggers", [])),
            " ".join(skill.get("lanes", []))
        ]).lower()
        if ql in hay:
            matches.append(skill)
    return {"ok": True, "query": q, "matches": matches}


@app.post("/skills/register")
def register_skill(req: SkillRegisterRequest):
    reg = load_registry()
    reg.setdefault("skills", {})[req.name] = {
        "name": req.name,
        "description": req.description,
        "lanes": req.lanes,
        "triggers": req.triggers,
        "approval_required": req.approval_required,
        "status": req.status,
        "recipe": req.recipe,
        "metadata": req.metadata,
        "registered_at": now_iso()
    }
    save_registry(reg)
    receipt = write_receipt("skill_registered", {
        "verdict": "LEEWAY_AGENT_SKILL_REGISTERED",
        "skill": req.name,
        "status": req.status,
        "lanes": req.lanes
    })
    return {"ok": True, "skill": reg["skills"][req.name], "receipt": receipt}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)



# ---------------------------------------------------------------------
# LEEWAY DISCOVERY REGISTRY ENDPOINTS
# leeway_agent_skills is the system self-awareness layer.
# ---------------------------------------------------------------------

_leeway_discovery_state_dir = _LeewayPath(_leeway_os.environ.get("LEEWAY_DISCOVERY_STATE_DIR", "/discovery-state"))
_leeway_discovery_manifest_path = _leeway_discovery_state_dir / "system-discovery.json"
_leeway_discovery_routes_path = _leeway_discovery_state_dir / "api-routes.json"
_leeway_discovery_capabilities_path = _leeway_discovery_state_dir / "capability-index.json"


def _leeway_read_json(path, default):
    try:
        if not path.exists():
            return default
        return _leeway_json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"ok": False, "error": str(e), "path": str(path)}


@app.get("/discovery/system")
def leeway_discovery_system():
    return _leeway_read_json(_leeway_discovery_manifest_path, {})


@app.get("/discovery/containers")
def leeway_discovery_containers():
    data = _leeway_read_json(_leeway_discovery_manifest_path, {})
    containers = data.get("containers", [])
    return {
        "ok": True,
        "containers": containers,
        "count": len(containers)
    }


@app.get("/discovery/routes")
def leeway_discovery_routes():
    data = _leeway_read_json(_leeway_discovery_routes_path, [])
    return {
        "ok": True,
        "routes": data,
        "count": len(data) if isinstance(data, list) else 0
    }


@app.get("/discovery/capabilities")
def leeway_discovery_capabilities():
    data = _leeway_read_json(_leeway_discovery_capabilities_path, [])
    return {
        "ok": True,
        "capabilities": data,
        "count": len(data) if isinstance(data, list) else 0
    }


@app.get("/discovery/entrypoint")
def leeway_discovery_entrypoint():
    data = _leeway_read_json(_leeway_discovery_manifest_path, {})
    return {
        "ok": True,
        "entrypoint": data.get("entrypoint", {}),
        "discovery_layer": data.get("discovery_layer", {}),
        "router": data.get("router", {}),
        "operating_rules": data.get("operating_rules", [])
    }


@app.get("/discovery/agent-lee-capabilities")
def leeway_agent_lee_capabilities():
    data = _leeway_read_json(_leeway_discovery_manifest_path, {})
    caps = data.get("capability_index", [])
    return {
        "ok": True,
        "summary": "Agent Lee capability registry loaded from Docker discovery.",
        "total_runtime_items": data.get("total_docker_items", 0),
        "running_count": data.get("running_count", 0),
        "entrypoint": data.get("entrypoint", {}),
        "capability_index": caps,
        "rules": data.get("operating_rules", [])
    }

# END LEEWAY DISCOVERY REGISTRY ENDPOINTS


# ---------------------------------------------------------------------
# LEEWAY CANONICAL ARCHITECTURE TRUTH SYNC
# Source of truth: /architecture/latest-canonical-architecture.json
# This block is intentionally deterministic. It does not ask an LLM.
# ---------------------------------------------------------------------

import os as _leeway_truth_os
import json as _leeway_truth_json
from pathlib import Path as _LeewayTruthPath
from typing import Dict as _LeewayDict, Any as _LeewayAny, List as _LeewayList

LEEWAY_ARCHITECTURE_PATH = _leeway_truth_os.environ.get(
    "LEEWAY_ARCHITECTURE_PATH",
    "/architecture/latest-canonical-architecture.json"
)

def leeway_truth_path():
    return _LeewayTruthPath(LEEWAY_ARCHITECTURE_PATH)

def leeway_load_architecture():
    path = leeway_truth_path()
    if not path.exists():
        return {
            "ok": False,
            "error": "canonical architecture file missing",
            "path": str(path),
            "containers": [],
            "placeholder_review": [],
            "missing_known": [],
            "secrets_detected": []
        }

    try:
        data = _leeway_truth_json.loads(path.read_text(encoding="utf-8"))
        data["ok"] = True
        data["truth_source"] = str(path)
        return data
    except Exception as e:
        return {
            "ok": False,
            "error": repr(e),
            "path": str(path),
            "containers": [],
            "placeholder_review": [],
            "missing_known": [],
            "secrets_detected": []
        }

def leeway_truth_containers():
    arch = leeway_load_architecture()
    return arch.get("containers") or []

def leeway_truth_find_container(name: str):
    wanted = str(name or "").lower().strip()
    for c in leeway_truth_containers():
        if str(c.get("name", "")).lower() == wanted:
            return c
    for c in leeway_truth_containers():
        if wanted and wanted in str(c.get("name", "")).lower():
            return c
    return None

def leeway_truth_by_role(role: str):
    wanted = str(role or "").lower().strip()
    return [
        c for c in leeway_truth_containers()
        if str(c.get("role", "")).lower() == wanted
    ]

def leeway_truth_lanes_for_task(task_type: str):
    t = str(task_type or "general").lower().strip()

    role_map = {
        "research": [
            "core_planning_router",
            "creative_production_runtime",
            "document_pdf_runtime",
            "core_discovery_registry"
        ],
        "website": [
            "creative_production_runtime",
            "artifact_viewer_runtime",
            "operator_browser_runtime"
        ],
        "story": [
            "creative_production_runtime",
            "document_pdf_runtime",
            "creative_model_lane",
            "artifact_viewer_runtime"
        ],
        "pdf": [
            "document_pdf_runtime",
            "artifact_viewer_runtime"
        ],
        "image": [
            "creative_model_lane",
            "artifact_viewer_runtime"
        ],
        "movie": [
            "creative_production_runtime",
            "performance_runtime",
            "creative_model_lane",
            "document_pdf_runtime"
        ],
        "song": [
            "performance_runtime",
            "model_voice_lane"
        ],
        "rap": [
            "performance_runtime",
            "model_voice_lane"
        ],
        "email": [
            "provider_email_runtime"
        ],
        "calendar": [
            "provider_calendar_runtime"
        ],
        "phone": [
            "provider_phone_runtime"
        ],
        "browser": [
            "operator_browser_runtime"
        ],
        "desktop": [
            "operator_desktop_runtime"
        ],
        "meeting": [
            "meeting_runtime",
            "conference_room_stack"
        ],
        "system": [
            "core_discovery_registry",
            "core_planning_router",
            "core_external_entrypoint",
            "core_executive_operating_layer"
        ],
        "general": [
            "core_planning_router",
            "core_visible_workboard",
            "core_discovery_registry"
        ]
    }

    roles = role_map.get(t, role_map["general"])
    containers = []
    for role in roles:
        containers.extend(leeway_truth_by_role(role))

    # Deduplicate by container name.
    seen = set()
    out = []
    for c in containers:
        n = c.get("name")
        if n and n not in seen:
            seen.add(n)
            out.append(c)

    return out

def leeway_truth_lane_names_for_task(task_type: str):
    return [c.get("name") for c in leeway_truth_lanes_for_task(task_type) if c.get("name")]

def leeway_truth_blockers_for_task(task_type: str):
    blockers = []
    for c in leeway_truth_lanes_for_task(task_type):
        truth = str(c.get("lane_truth", "UNKNOWN"))
        role = str(c.get("role", "unknown"))
        name = str(c.get("name", "unknown"))
        running = bool(c.get("running", False))

        if not running:
            blockers.append({
                "container": name,
                "role": role,
                "blocker": "DOWN",
                "lane_truth": truth
            })
        elif "PARTIAL" in truth or "REQUIRES" in truth or "UNKNOWN" in truth or "REVIEW" in truth:
            blockers.append({
                "container": name,
                "role": role,
                "blocker": truth,
                "lane_truth": truth
            })

    return blockers

def leeway_truth_summary():
    arch = leeway_load_architecture()
    containers = arch.get("containers") or []
    return {
        "ok": arch.get("ok", False),
        "truth_source": arch.get("truth_source", LEEWAY_ARCHITECTURE_PATH),
        "created_at": arch.get("created_at"),
        "verdict": arch.get("verdict"),
        "container_count": len(containers),
        "placeholder_review_count": len(arch.get("placeholder_review") or []),
        "missing_known_count": len(arch.get("missing_known") or []),
        "secrets_detected_count": len(arch.get("secrets_detected") or []),
        "doctrine": arch.get("doctrine") or {},
        "core_order": arch.get("core_order") or [],
        "distribution": arch.get("distribution") or {}
    }

# END LEEWAY CANONICAL ARCHITECTURE TRUTH SYNC


@app.get("/truth/architecture")
def leeway_truth_architecture_endpoint():
    return leeway_load_architecture()

@app.get("/truth/summary")
def leeway_truth_summary_endpoint():
    return leeway_truth_summary()

@app.get("/truth/containers")
def leeway_truth_containers_endpoint():
    return {
        "ok": True,
        "truth_source": LEEWAY_ARCHITECTURE_PATH,
        "containers": leeway_truth_containers()
    }

@app.get("/truth/placeholders")
def leeway_truth_placeholders_endpoint():
    arch = leeway_load_architecture()
    return {
        "ok": arch.get("ok", False),
        "truth_source": arch.get("truth_source", LEEWAY_ARCHITECTURE_PATH),
        "placeholder_review": arch.get("placeholder_review") or []
    }

@app.get("/truth/missing-known")
def leeway_truth_missing_known_endpoint():
    arch = leeway_load_architecture()
    return {
        "ok": arch.get("ok", False),
        "truth_source": arch.get("truth_source", LEEWAY_ARCHITECTURE_PATH),
        "missing_known": arch.get("missing_known") or []
    }

@app.get("/truth/secrets-redacted")
def leeway_truth_secrets_redacted_endpoint():
    arch = leeway_load_architecture()
    return {
        "ok": arch.get("ok", False),
        "truth_source": arch.get("truth_source", LEEWAY_ARCHITECTURE_PATH),
        "secrets_detected": arch.get("secrets_detected") or []
    }

@app.get("/truth/runtime/{runtime_name}")
def leeway_truth_runtime_endpoint(runtime_name: str):
    c = leeway_truth_find_container(runtime_name)
    if not c:
        return {
            "ok": False,
            "runtime": runtime_name,
            "error": "runtime not found in canonical architecture",
            "truth_source": LEEWAY_ARCHITECTURE_PATH
        }
    return {
        "ok": True,
        "runtime": runtime_name,
        "truth_source": LEEWAY_ARCHITECTURE_PATH,
        "container": c
    }

@app.get("/truth/task/{task_type}")
def leeway_truth_task_endpoint(task_type: str):
    return {
        "ok": True,
        "task_type": task_type,
        "truth_source": LEEWAY_ARCHITECTURE_PATH,
        "lanes": leeway_truth_lanes_for_task(task_type),
        "lane_names": leeway_truth_lane_names_for_task(task_type),
        "blockers": leeway_truth_blockers_for_task(task_type)
    }

@app.get("/discovery/canonical-architecture")
def leeway_discovery_canonical_architecture_endpoint():
    return leeway_load_architecture()

@app.get("/discovery/agent-lee-truth-map")
def leeway_discovery_agent_lee_truth_map_endpoint():
    return {
        "ok": True,
        "runtime": "leeway_agent_skills",
        "summary": leeway_truth_summary(),
        "task_routes": {
            "research": leeway_truth_lane_names_for_task("research"),
            "website": leeway_truth_lane_names_for_task("website"),
            "story": leeway_truth_lane_names_for_task("story"),
            "pdf": leeway_truth_lane_names_for_task("pdf"),
            "image": leeway_truth_lane_names_for_task("image"),
            "movie": leeway_truth_lane_names_for_task("movie"),
            "song": leeway_truth_lane_names_for_task("song"),
            "rap": leeway_truth_lane_names_for_task("rap"),
            "email": leeway_truth_lane_names_for_task("email"),
            "calendar": leeway_truth_lane_names_for_task("calendar"),
            "phone": leeway_truth_lane_names_for_task("phone"),
            "browser": leeway_truth_lane_names_for_task("browser"),
            "desktop": leeway_truth_lane_names_for_task("desktop"),
            "meeting": leeway_truth_lane_names_for_task("meeting"),
            "system": leeway_truth_lane_names_for_task("system")
        },
        "placeholder_review": (leeway_load_architecture().get("placeholder_review") or []),
        "missing_known": (leeway_load_architecture().get("missing_known") or [])
    }

