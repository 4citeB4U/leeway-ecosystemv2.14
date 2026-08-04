import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

APP = "leeway_skill_router"
VERSION = "0.3.0-planning-governor"

STATE_DIR = Path(os.environ.get("LEEWAY_SKILL_STATE_DIR", "/skill-state"))
PLAN_DIR = STATE_DIR / "plans"
TASK_DIR = STATE_DIR / "tasks"
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))

DOC_RUNTIME = os.environ.get("LEEWAY_DOCUMENT_RUNTIME_URL", "http://leeway_document_runtime:5325").rstrip("/")
OPEN_NOTEBOOK = os.environ.get("LEEWAY_OPEN_NOTEBOOK_URL", "http://leeway_open_notebook:5326").rstrip("/")
AGENT_SKILLS = os.environ.get("LEEWAY_AGENT_SKILLS_URL", "http://leeway_agent_skills:5327").rstrip("/")
ARTIFACT_VIEWER = os.environ.get("LEEWAY_ARTIFACT_VIEWER_URL", "http://leeway_artifact_viewer:5328").rstrip("/")
ARTIFACT_VIEWER_PUBLIC = os.environ.get("LEEWAY_ARTIFACT_VIEWER_PUBLIC_URL", "http://localhost:5328").rstrip("/")
MEETING_RUNTIME = os.environ.get("LEEWAY_MEETING_RUNTIME_URL", "http://leeway_meeting_runtime:5329").rstrip("/")
IMAGE_SERVICE = os.environ.get("AGENT_LEE_IMAGE_SERVICE_URL", "http://agent-lee-sdxl-lightning-image-lane:8095").rstrip("/")

for p in [STATE_DIR, PLAN_DIR, TASK_DIR, RECEIPT_DIR]:
    p.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class RouteRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source: str = "telegram"
    user_id: Optional[str] = "owner"
    execute: bool = True
    metadata: Dict[str, Any] = {}


class PlanApprovalRequest(BaseModel):
    plan_id: Optional[str] = ""
    approval_note: str = "approved"
    source: str = "telegram"
    user_id: str = "owner"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def slug(value: str):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(value or "").lower()).strip("-")
    return s[:80] or "agent-lee-plan"


def plan_path(plan_id: str):
    return PLAN_DIR / f"{plan_id}.json"


def latest_plan_path():
    return PLAN_DIR / "latest-plan.json"


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


def post_json(url: str, payload: Dict[str, Any], timeout: int = 120):
    try:
        r = requests.post(url, json=payload, timeout=timeout)
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text[:8000]}
        return {"ok": r.status_code < 400, "status": r.status_code, "data": data}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def get_json(url: str, timeout: int = 60):
    try:
        r = requests.get(url, timeout=timeout)
        try:
            data = r.json()
        except Exception:
            data = {"raw": r.text[:8000]}
        return {"ok": r.status_code < 400, "status": r.status_code, "data": data}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def approval_language(text: str):
    t = text.lower().strip()
    return any(x in t for x in [
        "approve", "approved", "go with the plan", "run the plan",
        "execute the plan", "start the plan", "do the plan",
        "yes run it", "yes do it", "go ahead"
    ])


def detect_domain(text: str):
    t = text.lower()

    if any(x in t for x in ["website", "landing page", "web page", "header", "footer"]):
        return "website"
    if any(x in t for x in ["infographic", "visual one pager", "one-page visual"]):
        return "infographic"
    if any(x in t for x in ["slide deck", "pitch deck", "presentation", "powerpoint", "slides"]):
        return "slide_deck"
    if any(x in t for x in ["story", "novel", "chapter"]):
        return "story"
    if any(x in t for x in ["song", "rap", "hook", "verse", "chorus", "flow"]):
        return "song_or_rap"
    if any(x in t for x in ["podcast", "episode", "show notes"]):
        return "podcast"
    if any(x in t for x in ["video", "avatar", "commercial", "reel", "short"]):
        return "video"
    if any(x in t for x in ["business", "hot dog stand", "landscaping", "store", "corner store", "tax advisor"]):
        return "business_development"
    if any(x in t for x in ["schedule", "appointment", "calendar", "meeting"]):
        return "scheduling"
    if any(x in t for x in ["email", "message", "send this"]):
        return "communication"
    if any(x in t for x in ["research", "look up", "search"]):
        return "research"

    return "general"


def planning_depth(text: str, domain: str):
    t = text.lower()

    executive_domains = ["website", "business_development"]
    heavy_domains = ["infographic", "slide_deck", "story", "song_or_rap", "podcast", "video"]
    medium_domains = ["scheduling", "communication", "research"]

    if domain in executive_domains:
        return "EXECUTIVE"
    if domain in heavy_domains:
        return "HEAVY"
    if domain in medium_domains:
        return "MEDIUM"

    if len(t) > 500:
        return "HEAVY"
    if any(x in t for x in ["create", "build", "design", "make", "write", "draft"]):
        return "MEDIUM"

    return "MICRO"


def requires_visible_plan(text: str, domain: str, depth: str):
    t = text.lower()

    if depth in ["HEAVY", "EXECUTIVE"]:
        return True

    major_verbs = ["create", "build", "design", "make", "write", "draft", "develop", "produce"]
    major_objects = [
        "website", "infographic", "slide deck", "pitch deck", "story", "song", "rap",
        "business", "campaign", "proposal", "course", "video", "podcast", "3d", "blueprint"
    ]

    return any(v in t for v in major_verbs) and any(o in t for o in major_objects)


def creative_type_for_domain(domain: str):
    mapping = {
        "website": "website_package",
        "infographic": "infographic",
        "slide_deck": "slide_deck",
        "story": "story",
        "song_or_rap": "song",
        "podcast": "podcast",
        "video": "video_script",
        "business_development": "campaign_scheme",
        "research": "research_brief",
        "communication": "social_pack",
        "scheduling": "meeting_plan",
    }
    return mapping.get(domain, "general")


def tools_for_plan(domain: str):
    base = [
        {
            "tool": "leeway_open_notebook",
            "role": "Create the plan, creative package, version history, and structured content."
        },
        {
            "tool": "leeway_agent_skills",
            "role": "Select available skills, worker lanes, and capability requirements."
        },
        {
            "tool": "leeway_skill_router",
            "role": "Coordinate planning, approval, routing, and receipts."
        },
        {
            "tool": "leeway_artifact_viewer",
            "role": "Expose plan rooms, previews, website rooms, infographic rooms, and delivery links."
        },
        {
            "tool": "leeway_seafile_storage_gateway",
            "role": "Govern durable storage, manifests, receipts, and memory control."
        }
    ]

    if domain == "website":
        base += [
            {"tool": "image_lane", "role": "Generate website mockup images before build approval."},
            {"tool": "three_d_lane", "role": "Create or render 3D object concepts."},
            {"tool": "video_lane", "role": "Create avatar/video explainer package."},
            {"tool": "browser_or_website_runtime", "role": "Render live website preview and final package."},
        ]

    if domain == "infographic":
        base += [
            {"tool": "image_lane", "role": "Render visual infographic preview."},
            {"tool": "document_runtime", "role": "Export PDF support version only after visual layout is approved."},
        ]

    if domain in ["story", "song_or_rap", "podcast", "video"]:
        base += [
            {"tool": "voice_lane", "role": "Perform narration, rap, singing, or podcast voice when performance mode is available."},
            {"tool": "document_runtime", "role": "Export written script/package."},
        ]

    if domain == "business_development":
        base += [
            {"tool": "research_lane", "role": "Research market, costs, locations, risks, and compliance."},
            {"tool": "maps_or_browser_lane", "role": "Analyze local area and opportunity zones."},
            {"tool": "calendar_runtime", "role": "Schedule business tasks and meetings after approval."},
            {"tool": "email_runtime", "role": "Send outreach after approval."},
        ]

    return base


def steps_for_plan(domain: str, depth: str, text: str):
    if domain == "website":
        return [
            "Translate the user request into a professional website brief.",
            "Define audience, purpose, page map, brand feel, and required sections.",
            "Create two visual mockup directions before building.",
            "Ask Leonard to approve one mockup direction or request edits.",
            "After approval, create the live website room.",
            "Add 3D object concept blocks and video/avatar explainer section.",
            "Review the website against Leeway standards.",
            "Return website link, supporting PDF if needed, receipt, and revision options."
        ]

    if domain == "story":
        return [
            "Define story premise, genre, theme, and target emotion.",
            "Create characters, hero/lead, conflict, setting, stakes, and ending.",
            "Outline beginning, middle, turning point, climax, and resolution.",
            "Write the full story without repeated chapters or filler loops.",
            "Run quality check for repetition, arc, emotional payoff, and completeness.",
            "Ask for human review and revise if needed.",
            "Export final story and receipt."
        ]

    if domain == "song_or_rap":
        return [
            "Define performance style: rap, singing, spoken-word, or hybrid.",
            "Set BPM, cadence, rhyme density, hook, verses, bridge, adlibs, and emotional tone.",
            "Write complete lyrics with structure and no repeated filler.",
            "Create performance notes for voice lane: pitch, pauses, emphasis, and energy shifts.",
            "Route to voice/performance lane when available.",
            "Return lyrics, performance guide, audio if generated, and receipt."
        ]

    if domain == "infographic":
        return [
            "Identify one central message.",
            "Choose infographic type: process, map, comparison, timeline, checklist, or data card layout.",
            "Create visual hierarchy: headline, sections, icons, data blocks, flow, call to action.",
            "Create a visual preview room before final export.",
            "Ask for approval or edits.",
            "Render final visual artifact and supporting PDF.",
            "Return links, file, and receipt."
        ]

    if domain == "business_development":
        return [
            "Clarify the business idea conversationally without overwhelming the user.",
            "Identify market, location, startup costs, tools, skills, compliance, and revenue model.",
            "Assign research lane to gather local data and competitor/context signals.",
            "Build Plan A, Plan B, and Plan C.",
            "Create proposal, budget, timeline, pitch deck, and operating checklist.",
            "Track active tasks and next milestones.",
            "Return business plan room, supporting documents, and receipts."
        ]

    return [
        "Understand the user intent.",
        "Select planning depth.",
        "Choose the correct tools and workers.",
        "Create a step-by-step to-do list.",
        "Identify approval points and failover paths.",
        "Execute after approval when required.",
        "Return useful links, files, receipts, and next actions."
    ]


def mockups_for_plan(domain: str, text: str):
    if domain == "website":
        return [
            {
                "mockup_id": "A",
                "name": "Executive Dark Command Center",
                "description": "Dark professional Leeway website with hero section, glowing 3D core, standards cards, video/avatar panel, and strong header/footer.",
                "preview_type": "website_wireframe",
                "approval_question": "Approve Mockup A for a premium technology/business feel?"
            },
            {
                "mockup_id": "B",
                "name": "Magazine-Style Brand Story",
                "description": "Editorial layout with large headline, cinematic image blocks, 3D object cards, video explainer strip, and polished footer.",
                "preview_type": "website_wireframe",
                "approval_question": "Approve Mockup B for a storytelling and proposal-style feel?"
            }
        ]

    if domain == "infographic":
        return [
            {
                "mockup_id": "A",
                "name": "Six-Card Runtime Map",
                "description": "A clean visual grid showing Open Notebook, Skill Router, Viewer, Storage, Execution Lanes, and Receipts.",
                "preview_type": "infographic_wireframe"
            },
            {
                "mockup_id": "B",
                "name": "Flow Diagram",
                "description": "A left-to-right visual process: request, plan, approval, execution, delivery, receipt.",
                "preview_type": "infographic_wireframe"
            }
        ]

    return []


def failovers_for_plan(domain: str):
    return [
        {
            "plan": "Plan A",
            "rule": "Use the best matching runtime lane and return the intended artifact."
        },
        {
            "plan": "Plan B",
            "rule": "If a render lane fails, return the plan room, text package, and receipt instead of pretending the final artifact exists."
        },
        {
            "plan": "Plan C",
            "rule": "If execution is blocked, create a work order for the missing lane and ask Leonard for approval or more data."
        }
    ]


def persona_plan_answer(plan: Dict[str, Any]):
    lines = []
    lines.append("I hear the move. This is not a quick throwaway job.")
    lines.append("I am treating it like a Leeway build: plan first, tools second, approval before heavy execution.")
    lines.append("")
    lines.append(f"Planning depth: {plan['planning_depth']}")
    lines.append(f"Plan ID: {plan['plan_id']}")
    lines.append("")
    lines.append("To-do list:")
    for i, step in enumerate(plan["steps"], start=1):
        lines.append(f"{i}. {step}")
    lines.append("")
    if plan.get("mockups"):
        lines.append("Preview directions:")
        for m in plan["mockups"]:
            lines.append(f"- Mockup {m['mockup_id']}: {m['name']} — {m['description']}")
        lines.append("")
    lines.append("Say: approve the plan, run the plan, or edit the plan.")
    lines.append(f"Plan room: {plan['plan_url']}")
    return "\n".join(lines)




# ---------------------------------------------------------------------
# LEEWAY PLAN VISUAL MOCKUP PREVIEW GENERATION
# Major visual plans must include preview images before approval.
# Repair-safe version.
# ---------------------------------------------------------------------

def leeway_mockup_prompt(plan: Dict[str, Any], mockup: Dict[str, Any]):
    domain = plan.get("domain", "")
    original = plan.get("original_request", "")
    name = mockup.get("name", "")
    desc = mockup.get("description", "")

    if domain == "website":
        return (
            "Professional website mockup preview, dark premium Leeway Industries style, "
            "full landing page layout, header navigation, hero section, modern 3D objects, "
            "video/avatar explainer section, footer, polished tech-business aesthetic, "
            "clean spacing, high contrast, executive presentation quality. "
            f"Direction: {name}. Details: {desc}. User request: {original}"
        )

    if domain == "infographic":
        return (
            "Professional infographic preview, clean visual hierarchy, modern Leeway style, "
            "dark background, glowing blue and green accents, six-card layout, icons, arrows, "
            "clear title and readable sections. "
            f"Direction: {name}. Details: {desc}. User request: {original}"
        )

    return (
        "Professional visual concept preview, clean composition, polished Leeway design system, "
        f"Direction: {name}. Details: {desc}. User request: {original}"
    )


def leeway_try_image_endpoints(prompt: str):
    payloads = [
        {"prompt": prompt, "source": "planning_governor", "return_image": True},
        {"text": prompt, "prompt": prompt, "source": "planning_governor"},
    ]

    endpoints = [
        IMAGE_SERVICE + "/image/generate-fast",
        IMAGE_SERVICE + "/generate-fast",
        IMAGE_SERVICE + "/generate",
        IMAGE_SERVICE + "/render",
    ]

    attempts = []

    for endpoint in endpoints:
        for payload in payloads:
            try:
                r = requests.post(endpoint, json=payload, timeout=240)
                body = r.text[:4000]
                item = {
                    "endpoint": endpoint,
                    "status": r.status_code,
                    "ok": r.status_code < 400,
                    "body": body
                }

                if r.status_code < 400:
                    try:
                        data = r.json()
                    except Exception:
                        data = {"raw": body}

                    item["data"] = data

                    image_url = ""
                    for key in ["image_url", "url", "latest_url", "candidate_url", "public_url"]:
                        if isinstance(data, dict) and data.get(key):
                            image_url = data.get(key)
                            break

                    if not image_url and isinstance(data, dict):
                        for key in ["images", "files", "candidates", "outputs"]:
                            vals = data.get(key)
                            if isinstance(vals, list) and vals:
                                first = vals[0]
                                if isinstance(first, str):
                                    image_url = first
                                elif isinstance(first, dict):
                                    image_url = first.get("url") or first.get("image_url") or first.get("path") or ""

                    item["image_url"] = image_url
                    attempts.append(item)

                    return {
                        "ok": True,
                        "endpoint": endpoint,
                        "image_url": image_url,
                        "data": data,
                        "attempts": attempts
                    }

                attempts.append(item)

            except Exception as e:
                attempts.append({
                    "endpoint": endpoint,
                    "ok": False,
                    "error": repr(e)
                })

    return {
        "ok": False,
        "image_url": "",
        "attempts": attempts
    }


def leeway_generate_mockup_preview(plan: Dict[str, Any], mockup: Dict[str, Any]):
    prompt = leeway_mockup_prompt(plan, mockup)
    result = leeway_try_image_endpoints(prompt)

    return {
        "mockup_id": mockup.get("mockup_id", ""),
        "name": mockup.get("name", ""),
        "description": mockup.get("description", ""),
        "prompt": prompt,
        "image_generation": result,
        "image_url": result.get("image_url", ""),
        "created_at": now_iso()
    }


def leeway_attach_visual_previews(plan: Dict[str, Any]):
    domain = plan.get("domain", "")

    if domain not in ["website", "infographic"]:
        plan["visual_previews"] = []
        plan["visual_preview_status"] = "NOT_REQUIRED"
        return plan

    previews = []
    for mockup in plan.get("mockups", [])[:2]:
        previews.append(leeway_generate_mockup_preview(plan, mockup))

    plan["visual_previews"] = previews
    plan["visual_preview_status"] = "READY" if any(p.get("image_url") for p in previews) else "ATTEMPTED_NO_IMAGE_RETURNED"
    plan["updated_at"] = now_iso()
    return plan



def save_plan(plan: Dict[str, Any]):
    write_json(plan_path(plan["plan_id"]), plan)
    write_json(latest_plan_path(), plan)
    return plan


def create_plan(text: str, source: str, user_id: str):
    domain = detect_domain(text)
    depth = planning_depth(text, domain)
    pid = f"plan-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    plan = {
        "plan_id": pid,
        "status": "AWAITING_APPROVAL" if depth in ["HEAVY", "EXECUTIVE"] else "READY",
        "source": source,
        "user_id": user_id,
        "original_request": text,
        "domain": domain,
        "planning_depth": depth,
        "requires_approval": depth in ["HEAVY", "EXECUTIVE"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "steps": steps_for_plan(domain, depth, text),
        "tools": tools_for_plan(domain),
        "mockups": mockups_for_plan(domain, text),
        "failovers": failovers_for_plan(domain),
        "plan_url": f"{ARTIFACT_VIEWER_PUBLIC}/rooms/plan/latest",
        "execution": {
            "approved": False,
            "started": False,
            "completed": False,
            "result": None
        },
        "standards": [
            "Do not pretend the work is complete.",
            "Plan before major creation.",
            "Use the correct tool or worker lane.",
            "Ask for approval before heavy execution.",
            "Return links, files, receipts, and next actions.",
            "Keep Agent Lee's public voice poetic, grounded, brief, and disciplined."
        ]
    }

    plan = leeway_attach_visual_previews(plan)
    save_plan(plan)

    receipt = write_receipt("plan_created", {
        "verdict": "LEEWAY_PLAN_CREATED_AWAITING_APPROVAL" if plan["requires_approval"] else "LEEWAY_PLAN_CREATED_READY",
        "plan_id": pid,
        "domain": domain,
        "planning_depth": depth,
        "requires_approval": plan["requires_approval"],
        "plan_url": plan["plan_url"]
    })

    return plan, receipt


def load_latest_plan():
    path = latest_plan_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="No latest plan exists.")
    return read_json(path)


def load_plan(plan_id: str):
    path = plan_path(plan_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Plan not found.")
    return read_json(path)


def execute_plan(plan: Dict[str, Any], source: str = "telegram"):
    domain = plan.get("domain", "general")
    original_request = plan.get("original_request", "")
    creative_type = creative_type_for_domain(domain)

    task_id = f"task-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    result = {
        "ok": False,
        "message": "No execution branch matched.",
        "domain": domain
    }

    if domain in ["website", "infographic", "slide_deck", "podcast", "video", "song_or_rap", "business_development"]:
        payload = {
            "creative_type": creative_type,
            "title": title_from_request(original_request, domain),
            "prompt": original_request + "\n\nApproved Leeway plan:\n" + json.dumps(plan, indent=2),
            "audience": "",
            "goal": "Execute the approved Leeway plan as a professional creative package.",
            "tone": "professional, strategic, clean, Leeway-standard",
            "duration_minutes": 0,
            "slide_count": 10 if creative_type == "slide_deck" else 0,
            "sections": 0,
            "source": source,
            "metadata": {
                "plan_id": plan["plan_id"],
                "domain": domain,
                "planning_depth": plan["planning_depth"]
            }
        }

        created = post_json(OPEN_NOTEBOOK + "/creative/create", payload, 180)
        creative = created.get("data", {}).get("creative", {}) if created.get("ok") else {}
        creative_id = creative.get("creative_id", "")

        exported = {"ok": False, "message": "No creative_id returned."}
        if creative_id:
            exported = post_json(OPEN_NOTEBOOK + "/creative/" + creative_id + "/export/pdf", {}, 180)

        room_url = f"{ARTIFACT_VIEWER_PUBLIC}/rooms/creative/latest"
        website_room_url = f"{ARTIFACT_VIEWER_PUBLIC}/rooms/website/latest" if domain == "website" else ""

        result = {
            "ok": bool(created.get("ok")),
            "task_id": task_id,
            "domain": domain,
            "creative_type": creative_type,
            "creative_id": creative_id,
            "created": created,
            "exported": exported,
            "room_url": website_room_url or room_url,
            "website_room_url": website_room_url,
            "plan_id": plan["plan_id"],
            "plan_url": plan["plan_url"]
        }

    elif domain == "story":
        payload = {
            "title": title_from_request(original_request, domain),
            "kind": "story",
            "prompt": original_request + "\n\nApproved Leeway story plan:\n" + json.dumps(plan, indent=2),
            "target_pages": 4,
            "author": "Agent Lee",
            "source": source,
            "metadata": {"plan_id": plan["plan_id"]}
        }
        created = post_json(OPEN_NOTEBOOK + "/notebook/create", payload, 180)
        notebook = created.get("data", {}).get("notebook", {}) if created.get("ok") else {}
        notebook_id = notebook.get("notebook_id", "")
        exported = {"ok": False, "message": "No notebook_id returned."}
        if notebook_id:
            exported = post_json(OPEN_NOTEBOOK + "/notebook/export/pdf", {"notebook_id": notebook_id, "source": source}, 180)

        result = {
            "ok": bool(created.get("ok")),
            "task_id": task_id,
            "domain": domain,
            "notebook_id": notebook_id,
            "created": created,
            "exported": exported,
            "room_url": f"{ARTIFACT_VIEWER_PUBLIC}/rooms/latest",
            "plan_id": plan["plan_id"],
            "plan_url": plan["plan_url"]
        }

    plan["status"] = "EXECUTED" if result.get("ok") else "EXECUTION_FAILED"
    plan["updated_at"] = now_iso()
    plan["execution"] = {
        "approved": True,
        "started": True,
        "completed": bool(result.get("ok")),
        "result": result,
        "executed_at": now_iso()
    }
    save_plan(plan)

    write_json(TASK_DIR / f"{task_id}.json", {
        "task_id": task_id,
        "plan_id": plan["plan_id"],
        "domain": domain,
        "result": result,
        "created_at": now_iso()
    })

    receipt = write_receipt("plan_executed", {
        "verdict": "LEEWAY_PLAN_EXECUTED" if result.get("ok") else "LEEWAY_PLAN_EXECUTION_FAILED",
        "plan_id": plan["plan_id"],
        "task_id": task_id,
        "domain": domain,
        "result_ok": bool(result.get("ok")),
        "room_url": result.get("room_url", ""),
        "website_room_url": result.get("website_room_url", "")
    })

    return result, receipt


def title_from_request(text: str, domain: str):
    t = text.strip()
    if domain == "website":
        return "Leeway Professional Website"
    if domain == "infographic":
        return "Leeway Runtime Fabric Map"
    if domain == "slide_deck":
        return "Leeway Pitch Deck"
    if domain == "story":
        return "Agent Lee Story"
    if len(t) <= 70:
        return t
    return "Agent Lee Planned Artifact"


def build_execution_answer(plan: Dict[str, Any], result: Dict[str, Any]):
    lines = []
    lines.append("Approved. I am running the plan now.")
    lines.append(f"Plan ID: {plan['plan_id']}")
    lines.append(f"Domain: {plan.get('domain')}")
    if result.get("creative_id"):
        lines.append(f"Creative ID: {result.get('creative_id')}")
    if result.get("notebook_id"):
        lines.append(f"Notebook ID: {result.get('notebook_id')}")
    if result.get("website_room_url"):
        lines.append("")
        lines.append("Website room:")
        lines.append(result.get("website_room_url"))
    elif result.get("room_url"):
        lines.append("")
        lines.append("View room:")
        lines.append(result.get("room_url"))
    lines.append("")
    lines.append("I wrote the receipt. No fake finish, no loose ends.")
    return "\n".join(lines)


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "truth": {
            "planning_governor": "LIVE",
            "major_creation_plan_first": "LIVE",
            "approval_before_heavy_execution": "LIVE",
            "multi_task_registry": "BASIC_LIVE",
            "parallel_worker_execution": "NEXT_LEVEL",
            "persona": "OG hip-hop poetic public voice preserved through planning responses"
        },
        "planning_depths": ["MICRO", "LIGHT", "MEDIUM", "HEAVY", "EXECUTIVE"],
        "created_at": now_iso()
    }


@app.post("/route")
def route(req: RouteRequest):
    text = req.text.strip()

    if approval_language(text):
        try:
            plan = load_latest_plan()
        except Exception:
            receipt = write_receipt("approval_without_plan", {
                "verdict": "LEEWAY_APPROVAL_RECEIVED_BUT_NO_PLAN_FOUND"
            })
            return {
                "ok": False,
                "skill": "approval",
                "answer": "I heard the approval, but there is no latest plan to run.",
                "receipt": receipt
            }

        result, receipt = execute_plan(plan, req.source)
        return {
            "ok": bool(result.get("ok")),
            "skill": "plan_execute",
            "answer": build_execution_answer(plan, result),
            "plan": plan,
            "result": result,
            "receipt": receipt
        }

    domain = detect_domain(text)
    depth = planning_depth(text, domain)

    if requires_visible_plan(text, domain, depth):
        plan, receipt = create_plan(text, req.source, req.user_id or "owner")
        return {
            "ok": True,
            "skill": "plan_create",
            "answer": persona_plan_answer(plan),
            "plan": plan,
            "plan_id": plan["plan_id"],
            "plan_url": plan["plan_url"],
            "approval_required": plan["requires_approval"],
            "receipt": receipt
        }

    receipt = write_receipt("micro_route", {
        "verdict": "LEEWAY_MICRO_ROUTE_NO_VISIBLE_PLAN_REQUIRED",
        "domain": domain,
        "planning_depth": depth
    })

    return {
        "ok": True,
        "skill": "micro_answer",
        "answer": "I can answer that straight. No heavy plan needed.",
        "domain": domain,
        "planning_depth": depth,
        "receipt": receipt
    }


@app.post("/plan/create")
def plan_create(req: RouteRequest):
    plan, receipt = create_plan(req.text, req.source, req.user_id or "owner")
    return {"ok": True, "plan": plan, "answer": persona_plan_answer(plan), "receipt": receipt}


@app.get("/plan/latest")
def plan_latest():
    return {"ok": True, "plan": load_latest_plan()}


@app.get("/plan/{plan_id}")
def plan_get(plan_id: str):
    return {"ok": True, "plan": load_plan(plan_id)}


@app.post("/plan/{plan_id}/approve")
def plan_approve(plan_id: str, req: PlanApprovalRequest):
    plan = load_plan(plan_id)
    plan["status"] = "APPROVED"
    plan["approval"] = {
        "approved_at": now_iso(),
        "approval_note": req.approval_note,
        "source": req.source,
        "user_id": req.user_id
    }
    save_plan(plan)
    result, receipt = execute_plan(plan, req.source)
    return {
        "ok": bool(result.get("ok")),
        "answer": build_execution_answer(plan, result),
        "plan": plan,
        "result": result,
        "receipt": receipt
    }


@app.post("/plan/latest/approve")
def plan_latest_approve(req: PlanApprovalRequest):
    plan = load_latest_plan()
    plan["status"] = "APPROVED"
    plan["approval"] = {
        "approved_at": now_iso(),
        "approval_note": req.approval_note,
        "source": req.source,
        "user_id": req.user_id
    }
    save_plan(plan)
    result, receipt = execute_plan(plan, req.source)
    return {
        "ok": bool(result.get("ok")),
        "answer": build_execution_answer(plan, result),
        "plan": plan,
        "result": result,
        "receipt": receipt
    }


@app.get("/tasks/active")
def tasks_active():
    tasks = []
    for p in sorted(TASK_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)[:50]:
        try:
            tasks.append(read_json(p))
        except Exception:
            pass
    return {"ok": True, "tasks": tasks}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)



# ---------------------------------------------------------------------
# LEEWAY NONBLOCKING VISUAL MOCKUPS - APPEND SAFE REPAIR
# This intentionally overrides any older blocking image helper.
# Planning must stay fast. Heavy image lanes run later after approval.
# ---------------------------------------------------------------------

def leeway_try_image_endpoints(prompt: str):
    import urllib.parse

    lower = str(prompt or "").lower()

    if "website" in lower:
        title = "Website Mockup"
        subtitle = "Header - Hero - 3D Objects - Video - Footer"
        cards = ["Hero", "Standards", "3D Objects", "Avatar Video"]
    elif "infographic" in lower:
        title = "Infographic Mockup"
        subtitle = "Headline - Data Cards - Flow - Call To Action"
        cards = ["Idea", "Proof", "Flow", "Action"]
    else:
        title = "Visual Mockup"
        subtitle = "Preview direction generated by Agent Lee"
        cards = ["Concept", "Layout", "Style", "Delivery"]

    svg_parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
        '<defs>',
        '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
        '<stop offset="0%" stop-color="#050914"/>',
        '<stop offset="45%" stop-color="#101d32"/>',
        '<stop offset="100%" stop-color="#07101f"/>',
        '</linearGradient>',
        '<linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">',
        '<stop offset="0%" stop-color="#58c7ff"/>',
        '<stop offset="100%" stop-color="#8ef6c1"/>',
        '</linearGradient>',
        '<filter id="glow">',
        '<feGaussianBlur stdDeviation="8" result="blur"/>',
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>',
        '</filter>',
        '</defs>',
        '<rect width="1280" height="720" fill="url(#bg)"/>',
        '<circle cx="1120" cy="120" r="160" fill="#58c7ff" opacity="0.12"/>',
        '<circle cx="140" cy="620" r="210" fill="#8ef6c1" opacity="0.08"/>',
        '<rect x="60" y="48" width="1160" height="64" rx="22" fill="#0d1728" stroke="#294766"/>',
        '<text x="92" y="88" fill="#f4f8ff" font-size="28" font-family="Segoe UI, Arial" font-weight="700">Leeway</text>',
        '<text x="860" y="88" fill="#aebcd0" font-size="20" font-family="Segoe UI, Arial">Plan - Preview - Approve</text>',
        '<text x="80" y="190" fill="#58c7ff" font-size="20" font-family="Segoe UI, Arial" font-weight="700" letter-spacing="3">AGENT LEE VISUAL PREVIEW</text>',
        '<text x="80" y="270" fill="#f4f8ff" font-size="72" font-family="Segoe UI, Arial" font-weight="900">' + title + '</text>',
        '<text x="84" y="322" fill="#aebcd0" font-size="28" font-family="Segoe UI, Arial">' + subtitle + '</text>',
        '<rect x="80" y="380" width="240" height="170" rx="28" fill="#101d32" stroke="#58c7ff" opacity="0.95"/>',
        '<rect x="350" y="380" width="240" height="170" rx="28" fill="#101d32" stroke="#8ef6c1" opacity="0.95"/>',
        '<rect x="620" y="380" width="240" height="170" rx="28" fill="#101d32" stroke="#58c7ff" opacity="0.95"/>',
        '<rect x="890" y="380" width="240" height="170" rx="28" fill="#101d32" stroke="#8ef6c1" opacity="0.95"/>',
        '<text x="112" y="458" fill="#f4f8ff" font-size="30" font-family="Segoe UI, Arial" font-weight="800">' + cards[0] + '</text>',
        '<text x="382" y="458" fill="#f4f8ff" font-size="30" font-family="Segoe UI, Arial" font-weight="800">' + cards[1] + '</text>',
        '<text x="652" y="458" fill="#f4f8ff" font-size="30" font-family="Segoe UI, Arial" font-weight="800">' + cards[2] + '</text>',
        '<text x="922" y="458" fill="#f4f8ff" font-size="30" font-family="Segoe UI, Arial" font-weight="800">' + cards[3] + '</text>',
        '<rect x="80" y="595" width="520" height="54" rx="18" fill="url(#accent)" filter="url(#glow)"/>',
        '<text x="112" y="631" fill="#04101d" font-size="24" font-family="Segoe UI, Arial" font-weight="900">Approve, edit, or run the plan</text>',
        '<text x="80" y="688" fill="#aebcd0" font-size="16" font-family="Segoe UI, Arial">Generated instantly as a non-blocking planning preview. Full image render lane can refine this after approval.</text>',
        '</svg>'
    ]

    svg = "\\n".join(svg_parts)
    data_url = "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(svg)

    return {
        "ok": True,
        "endpoint": "instant_svg_mockup",
        "image_url": data_url,
        "data": {
            "mode": "nonblocking_svg_preview",
            "title": title,
            "note": "Image lane was bypassed for plan responsiveness. This SVG is the immediate approval mockup."
        },
        "attempts": [
            {
                "endpoint": "instant_svg_mockup",
                "ok": True,
                "status": 200,
                "body": "Generated instant SVG preview."
            }
        ]
    }


def leeway_mockup_prompt(plan: Dict[str, Any], mockup: Dict[str, Any]):
    domain = plan.get("domain", "")
    original = plan.get("original_request", "")
    name = mockup.get("name", "")
    desc = mockup.get("description", "")

    if domain == "website":
        return (
            "Professional website mockup preview, dark premium Leeway Industries style, "
            "full landing page layout, header navigation, hero section, modern 3D objects, "
            "video/avatar explainer section, footer, polished tech-business aesthetic. "
            f"Direction: {name}. Details: {desc}. User request: {original}"
        )

    if domain == "infographic":
        return (
            "Professional infographic preview, clean visual hierarchy, modern Leeway style, "
            "six-card layout, icons, arrows, clear title, readable sections. "
            f"Direction: {name}. Details: {desc}. User request: {original}"
        )

    return (
        "Professional visual concept preview, polished Leeway design system. "
        f"Direction: {name}. Details: {desc}. User request: {original}"
    )


def leeway_generate_mockup_preview(plan: Dict[str, Any], mockup: Dict[str, Any]):
    prompt = leeway_mockup_prompt(plan, mockup)
    result = leeway_try_image_endpoints(prompt)

    return {
        "mockup_id": mockup.get("mockup_id", ""),
        "name": mockup.get("name", ""),
        "description": mockup.get("description", ""),
        "prompt": prompt,
        "image_generation": result,
        "image_url": result.get("image_url", ""),
        "created_at": now_iso()
    }


def leeway_attach_visual_previews(plan: Dict[str, Any]):
    domain = plan.get("domain", "")

    if domain not in ["website", "infographic"]:
        plan["visual_previews"] = []
        plan["visual_preview_status"] = "NOT_REQUIRED"
        return plan

    previews = []
    for mockup in plan.get("mockups", [])[:2]:
        previews.append(leeway_generate_mockup_preview(plan, mockup))

    plan["visual_previews"] = previews
    plan["visual_preview_status"] = "READY" if any(p.get("image_url") for p in previews) else "ATTEMPTED_NO_IMAGE_RETURNED"
    plan["updated_at"] = now_iso()
    return plan


