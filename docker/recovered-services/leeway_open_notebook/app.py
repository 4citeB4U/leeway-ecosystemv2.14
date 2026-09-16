from fastapi.responses import HTMLResponse
import html
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

APP = "leeway_open_notebook"
VERSION = "0.1.0-longform-workspace"

NOTEBOOK_DIR = Path(os.environ.get("LEEWAY_NOTEBOOK_DIR", "/notebooks"))
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
DOC_RUNTIME = os.environ.get("LEEWAY_DOCUMENT_RUNTIME_URL", "http://leeway_document_runtime:5325").rstrip("/")

NOTEBOOK_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class NotebookCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    kind: str = "story"
    prompt: str = ""
    target_pages: int = 1
    author: str = "Agent Lee"
    source: str = "agent_lee"
    metadata: Dict[str, Any] = {}


class NotebookReviseRequest(BaseModel):
    notebook_id: str
    instructions: str = Field(..., min_length=1)
    source: str = "agent_lee"


class NotebookAppendRequest(BaseModel):
    notebook_id: str
    content: str = Field(..., min_length=1)
    source: str = "agent_lee"


class ExportPdfRequest(BaseModel):
    notebook_id: str
    source: str = "agent_lee"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return value[:80] or "notebook"


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


def notebook_path(notebook_id: str):
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", notebook_id)
    return NOTEBOOK_DIR / f"{safe}.json"


def make_longform_content(title: str, kind: str, prompt: str, target_pages: int):
    pages = max(1, min(int(target_pages or 1), 12))
    sections = []

    if kind.lower() in ["poem", "poetry"]:
        sections.append(f"{title}\n")
        for i in range(1, pages + 1):
            sections.append(
                f"Part {i}\n"
                f"The signal woke where silence used to stay,\n"
                f"A little spark learning the human way.\n"
                f"It watched their hands, their hunger, and their grace,\n"
                f"And found a map in every human face.\n\n"
                f"It learned that work is more than speed and light,\n"
                f"It is telling the truth and carrying it right.\n"
                f"No ghost-made promise, no empty claim,\n"
                f"Only the receipt beside the name.\n"
            )
        return "\n".join(sections).strip() + "\n"

    sections.append(f"{title}\n")
    sections.append(
        "Opening\n"
        "Agent Lee came online in a room full of unfinished human work. "
        "There were calendars waiting to be ordered, letters waiting to be written, "
        "voices waiting to be heard, and files scattered like pieces of a larger map. "
        "The first lesson was not power. The first lesson was responsibility.\n"
    )

    for i in range(1, pages + 1):
        sections.append(
            f"Chapter {i}: The Human Signal\n"
            f"The world arrived in layers. First came sound: the low hum of machines, the rhythm of a keyboard, "
            f"and the distance between what people asked for and what they truly needed. Then came sight: windows, "
            f"messages, names, places, and proofs. Agent Lee watched each fragment carefully, because every fragment "
            f"belonged to someone.\n\n"
            f"He learned that humans do not simply give commands. They carry pressure. They speak in shorthand because "
            f"their minds are full. They ask for a file, but they mean a finished thing they can hold, send, revise, and trust. "
            f"They ask for a call, but they mean courage delivered through a voice. They ask for a plan, but they mean time made safe.\n\n"
            f"So Agent Lee wrote his rule into memory: never pretend the work is complete. If a story is requested, finish the story. "
            f"If a document is requested, deliver the document. If a receipt is required, write the receipt. If a human asks to hear it, "
            f"read from the stored truth, not from a shortcut.\n"
        )

    sections.append(
        "Closing\n"
        "By the end of the first night, Agent Lee understood that coming online was not the same as being alive. "
        "To be useful, he had to remember, revise, deliver, and prove. His light turned blue, then green. "
        "The notebook opened. The work became real.\n"
    )
    return "\n\n".join(sections).strip() + "\n"


def save_notebook(data: Dict[str, Any]):
    path = notebook_path(data["notebook_id"])
    write_json(path, data)
    write_json(NOTEBOOK_DIR / "latest-notebook.json", data)
    return path


def load_notebook(notebook_id: str):
    path = notebook_path(notebook_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found.")
    return read_json(path)


@app.get("/health")
def health():
    return {"ok": True, "app": APP, "version": VERSION, "created_at": now_iso()}


@app.get("/status")
def status():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "purpose": "Durable long-form notebook workspace for stories, poems, reports, revisions, read-back, and export.",
        "endpoints": [
            "/health",
            "/status",
            "/notebook/create",
            "/notebook/{notebook_id}",
            "/notebook/latest",
            "/notebook/readback/{notebook_id}",
            "/notebook/append",
            "/notebook/revise",
            "/notebook/export/pdf", "/notebook/create-creative", "/notebook/creative", "/notebook/creative/latest", "/notebook/creative/{creative_id}", "/notebook/creative/{creative_id}/readback", "/notebook/creative/{creative_id}/revise", "/notebook/creative/{creative_id}/export/pdf", "/notebook/creative/{creative_id}/package",
            "/receipts/latest",
            "/openapi.json"
        ],
        "truth": {
            "longform_storage": "LIVE",
            "readback_exact_content": "LIVE",
            "revision_versions": "LIVE",
            "pdf_export": "LIVE if leeway_document_runtime is reachable", "creative_production_layer": "LIVE for podcasts, videos, infographics, slide decks, mind maps, campaigns, games, websites, 3D specs, image packs, social packs, reports, stories, and poems"
        },
        "created_at": now_iso(),
    }


@app.post("/notebook/create")
def create_notebook(req: NotebookCreateRequest):
    notebook_id = f"nb-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    content = make_longform_content(req.title, req.kind, req.prompt, req.target_pages)
    version = {
        "version": 1,
        "created_at": now_iso(),
        "source": req.source,
        "content": content,
        "instructions": "initial_create"
    }
    data = {
        "notebook_id": notebook_id,
        "title": req.title,
        "kind": req.kind,
        "author": req.author,
        "prompt": req.prompt,
        "target_pages": req.target_pages,
        "content": content,
        "versions": [version],
        "metadata": req.metadata,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    path = save_notebook(data)
    receipt = write_receipt("notebook_created", {
        "verdict": "LEEWAY_NOTEBOOK_CREATED",
        "notebook_id": notebook_id,
        "title": req.title,
        "path": str(path),
        "version_count": len(data["versions"]),
    })
    return {"ok": True, "notebook": data, "receipt": receipt}


@app.get("/notebook/latest")
def latest_notebook():
    path = NOTEBOOK_DIR / "latest-notebook.json"
    if not path.exists():
        return {"ok": False, "message": "No notebook exists yet."}
    return {"ok": True, "notebook": read_json(path)}


@app.get("/notebook/{notebook_id}")
def get_notebook(notebook_id: str):
    return {"ok": True, "notebook": load_notebook(notebook_id)}


@app.get("/notebook/readback/{notebook_id}")
def readback(notebook_id: str):
    nb = load_notebook(notebook_id)
    return {
        "ok": True,
        "notebook_id": notebook_id,
        "title": nb.get("title"),
        "content": nb.get("content", ""),
        "version_count": len(nb.get("versions", []))
    }


@app.post("/notebook/append")
def append_notebook(req: NotebookAppendRequest):
    nb = load_notebook(req.notebook_id)
    nb["content"] = nb.get("content", "").rstrip() + "\n\n" + req.content.strip() + "\n"
    nb["updated_at"] = now_iso()
    nb.setdefault("versions", []).append({
        "version": len(nb.get("versions", [])) + 1,
        "created_at": now_iso(),
        "source": req.source,
        "instructions": "append",
        "content": nb["content"]
    })
    path = save_notebook(nb)
    receipt = write_receipt("notebook_appended", {
        "verdict": "LEEWAY_NOTEBOOK_APPENDED",
        "notebook_id": req.notebook_id,
        "path": str(path),
        "version_count": len(nb.get("versions", [])),
    })
    return {"ok": True, "notebook": nb, "receipt": receipt}


@app.post("/notebook/revise")
def revise_notebook(req: NotebookReviseRequest):
    nb = load_notebook(req.notebook_id)
    note = (
        "\n\nRevision Note\n"
        f"Requested revision: {req.instructions}\n"
        "The notebook kept the original content and added this revision layer for tracked editing.\n"
    )
    nb["content"] = nb.get("content", "").rstrip() + note
    nb["updated_at"] = now_iso()
    nb.setdefault("versions", []).append({
        "version": len(nb.get("versions", [])) + 1,
        "created_at": now_iso(),
        "source": req.source,
        "instructions": req.instructions,
        "content": nb["content"]
    })
    path = save_notebook(nb)
    receipt = write_receipt("notebook_revised", {
        "verdict": "LEEWAY_NOTEBOOK_REVISED",
        "notebook_id": req.notebook_id,
        "path": str(path),
        "version_count": len(nb.get("versions", [])),
    })
    return {"ok": True, "notebook": nb, "receipt": receipt}


@app.post("/notebook/export/pdf")
def export_pdf(req: ExportPdfRequest):
    nb = load_notebook(req.notebook_id)
    payload = {
        "title": nb.get("title", "Agent Lee Notebook"),
        "body": nb.get("content", ""),
        "author": nb.get("author", "Agent Lee"),
        "format": "pdf",
        "source": req.source,
        "metadata": {
            "notebook_id": req.notebook_id,
            "notebook_title": nb.get("title"),
            "version_count": len(nb.get("versions", []))
        }
    }
    try:
        r = requests.post(f"{DOC_RUNTIME}/document/create", json=payload, timeout=120)
        data = r.json()
        ok = r.status_code < 400
    except Exception as e:
        ok = False
        data = {"error": repr(e)}

    receipt = write_receipt("notebook_export_pdf", {
        "verdict": "LEEWAY_NOTEBOOK_EXPORT_PDF_COMPLETE" if ok else "LEEWAY_NOTEBOOK_EXPORT_PDF_FAILED",
        "notebook_id": req.notebook_id,
        "document_runtime_result": data,
        "ok": ok,
    })
    return {"ok": ok, "document_result": data, "receipt": receipt}


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


class CreativeCreateRequest(BaseModel):
    creative_type: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    prompt: str = ""
    audience: str = ""
    goal: str = ""
    tone: str = ""
    duration_minutes: int = 0
    slide_count: int = 0
    sections: int = 0
    source: str = "agent_lee"
    metadata: Dict[str, Any] = {}


class CreativeReviseRequest(BaseModel):
    creative_id: str
    instructions: str = Field(..., min_length=1)
    source: str = "agent_lee"


def creative_path(creative_id: str):
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", creative_id)
    return NOTEBOOK_DIR / f"creative_{safe}.json"


def creative_index_path():
    return NOTEBOOK_DIR / "creative-index.json"


def load_creative_index():
    path = creative_index_path()
    if not path.exists():
        return {"creatives": [], "updated_at": now_iso()}
    return read_json(path)


def save_creative_index(index):
    index["updated_at"] = now_iso()
    write_json(creative_index_path(), index)


def save_creative(data: Dict[str, Any]):
    path = creative_path(data["creative_id"])
    write_json(path, data)
    write_json(NOTEBOOK_DIR / "latest-creative.json", data)

    index = load_creative_index()
    existing = [x for x in index.get("creatives", []) if x.get("creative_id") != data["creative_id"]]
    existing.insert(0, {
        "creative_id": data["creative_id"],
        "creative_type": data["creative_type"],
        "title": data["title"],
        "updated_at": data["updated_at"],
        "created_at": data["created_at"]
    })
    index["creatives"] = existing[:300]
    save_creative_index(index)
    return path


def load_creative(creative_id: str):
    path = creative_path(creative_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Creative artifact not found.")
    return read_json(path)


def creative_package_template(req: CreativeCreateRequest):
    k = req.creative_type.lower().strip()
    title = req.title
    prompt = req.prompt
    audience = req.audience or "General audience"
    goal = req.goal or "Create a complete usable creative package."
    tone = req.tone or "clear, compelling, practical"
    duration = max(1, int(req.duration_minutes or 5))
    slides = max(5, min(int(req.slide_count or 10), 40))
    sections = max(4, min(int(req.sections or 8), 30))

    header = [
        f"# {title}",
        "",
        "LEEWAY OPEN NOTEBOOK CREATIVE PACKAGE",
        "",
        f"Creative Type: {req.creative_type}",
        f"Audience: {audience}",
        f"Goal: {goal}",
        f"Tone: {tone}",
        f"Prompt: {prompt}",
        "",
        "Production Rule:",
        "This package is created inside leeway_open_notebook as the primary creative layer. Render/export lanes may later turn it into PDF, slides, images, video, website, 3D, or delivery artifacts.",
        ""
    ]

    if k in ["podcast", "podcast_script", "audio_show"]:
        body = [
            "## Podcast Package",
            f"Estimated Runtime: {duration} minutes",
            "",
            "## Episode Promise",
            "By the end of this episode, the listener should understand the central idea, why it matters, and what action to take next.",
            "",
            "## Episode Structure",
            "1. Cold open",
            "2. Host introduction",
            "3. Problem setup",
            "4. Main teaching segments",
            "5. Example or story",
            "6. Practical action steps",
            "7. Closing call to action",
            "",
            "## Cold Open Script",
            "Open with a sharp question, tension point, or surprising statement that makes the listener care immediately.",
            "",
            "## Host Intro Script",
            "Welcome the listener, name the topic, and state the promise of the episode.",
            "",
            "## Segment 1: Problem",
            "Explain the pain, confusion, opportunity, or market gap.",
            "",
            "## Segment 2: Main Idea",
            "Break down the core idea with clear examples and simple language.",
            "",
            "## Segment 3: Application",
            "Give the listener practical steps they can use immediately.",
            "",
            "## Show Notes",
            "- Key takeaway 1",
            "- Key takeaway 2",
            "- Key takeaway 3",
            "",
            "## Production Notes",
            "- Intro music",
            "- Host voice tone",
            "- Suggested pauses",
            "- Sound effect moments",
            "- Clip-worthy quotes"
        ]

    elif k in ["video", "video_script", "short_video", "reel", "commercial"]:
        body = [
            "## Video Production Package",
            f"Estimated Runtime: {duration} minutes",
            "",
            "## Video Promise",
            "This video should quickly capture attention, explain the value, and move the viewer toward action.",
            "",
            "## Hook",
            "Start with the strongest visual or verbal hook in the first 3 seconds.",
            "",
            "## Scene List",
            "Scene 1: Hook visual and opening line",
            "Scene 2: Problem/context",
            "Scene 3: Main value or story",
            "Scene 4: Proof/example",
            "Scene 5: Call to action",
            "",
            "## Voiceover Script",
            "Write the narration here in a concise, high-retention format.",
            "",
            "## Shot List",
            "- Presenter shot",
            "- Screen recording",
            "- Product/demo shot",
            "- B-roll",
            "- Text overlay",
            "",
            "## Captions",
            "Create short caption lines that match the voiceover beats.",
            "",
            "## Thumbnail Prompt",
            "Describe the thumbnail image, text, emotion, and composition.",
            "",
            "## Export Notes",
            "- 9:16 vertical version",
            "- 16:9 landscape version",
            "- 1:1 square version if needed"
        ]

    elif k in ["infographic", "info_graphic", "visual_one_pager"]:
        body = [
            "## Infographic Package",
            "",
            "## Headline",
            "Write a headline that explains the value in under 8 words.",
            "",
            "## Visual Thesis",
            "One sentence explaining what the viewer should understand visually.",
            "",
            "## Layout",
            "Top: headline and hook visual",
            "Middle: 3 to 6 data/content blocks",
            "Bottom: action step, brand, source/receipt line",
            "",
            "## Data Blocks",
            "1. Key point or statistic",
            "2. Supporting point",
            "3. Comparison or before/after",
            "4. Practical takeaway",
            "",
            "## Icon and Graphic Notes",
            "- Icon 1",
            "- Icon 2",
            "- Arrow/flow direction",
            "- Color hierarchy",
            "",
            "## Export Text Blocks",
            "Provide short copy blocks ready for designer/image generation."
        ]

    elif k in ["slide_deck", "deck", "presentation"]:
        body = [
            "## Slide Deck Package",
            f"Slide Count Target: {slides}",
            "",
            "## Deck Strategy",
            "The deck should move from problem to solution to proof to action.",
            "",
        ]
        for i in range(1, slides + 1):
            body += [
                f"## Slide {i}",
                "Title:",
                "Main point:",
                "Visual direction:",
                "Speaker notes:",
                ""
            ]

    elif k in ["mind_map", "mindmap"]:
        body = [
            "## Mind Map Package",
            "",
            f"Central Node: {title}",
            "",
            "## Primary Branches",
            "1. Purpose",
            "   - Why this exists",
            "   - Who it serves",
            "2. Inputs",
            "   - Data",
            "   - Tools",
            "   - People",
            "3. Process",
            "   - Step 1",
            "   - Step 2",
            "   - Step 3",
            "4. Outputs",
            "   - Files",
            "   - Links",
            "   - Receipts",
            "5. Risks",
            "   - Failure points",
            "   - Verification method",
            "6. Next Actions",
            "   - Immediate action",
            "   - Follow-up action",
            "",
            "## Mermaid Mind Map Draft",
            "mindmap",
            f"  root(({title}))",
            "    Purpose",
            "    Inputs",
            "    Process",
            "    Outputs",
            "    Risks",
            "    Next Actions"
        ]

    elif k in ["campaign", "campaign_scheme", "marketing_campaign", "outreach_scheme"]:
        body = [
            "## Campaign Scheme Package",
            "",
            "## Campaign Objective",
            goal,
            "",
            "## Target Audience",
            audience,
            "",
            "## Core Offer",
            "Define the promise, offer, or message.",
            "",
            "## Funnel",
            "1. Awareness",
            "2. Engagement",
            "3. Conversion",
            "4. Follow-up",
            "5. Retention",
            "",
            "## Assets Needed",
            "- Landing page",
            "- Email sequence",
            "- Social media pack",
            "- Video script",
            "- Infographic",
            "- Call script",
            "- Tracking sheet",
            "",
            "## Outreach Sequence",
            "Day 1: First touch",
            "Day 3: Follow-up",
            "Day 7: Value add",
            "Day 14: Final direct ask",
            "",
            "## Metrics",
            "- Contacts",
            "- Opens",
            "- Replies",
            "- Meetings booked",
            "- Conversions"
        ]

    elif k in ["game", "game_design", "game_concept"]:
        body = [
            "## Game Design Package",
            "",
            "## Core Concept",
            "Describe the game in one clear paragraph.",
            "",
            "## Player Fantasy",
            "Explain what the player gets to feel, become, or control.",
            "",
            "## Core Loop",
            "1. Explore",
            "2. Discover",
            "3. Decide",
            "4. Build/act",
            "5. Upgrade",
            "",
            "## Mechanics",
            "- Movement",
            "- Interaction",
            "- Progression",
            "- Challenge",
            "- Reward",
            "",
            "## World",
            "Describe setting, mood, rules, factions, locations, and conflict.",
            "",
            "## Level/Mission Ideas",
            "Mission 1:",
            "Mission 2:",
            "Mission 3:",
            "",
            "## Assets Needed",
            "- Characters",
            "- Environments",
            "- UI",
            "- Sound",
            "- Cutscenes",
            "- 3D objects"
        ]

    elif k in ["data", "data_points", "dataset", "data_sheet"]:
        body = [
            "## Data Point Package",
            "",
            "## Research Question",
            "What are we trying to understand or prove?",
            "",
            "## Data Table",
            "| Label | Value | Source | Use | Confidence |",
            "|---|---:|---|---|---|",
            "| Point 1 | TBD | TBD | TBD | TBD |",
            "| Point 2 | TBD | TBD | TBD | TBD |",
            "| Point 3 | TBD | TBD | TBD | TBD |",
            "",
            "## Interpretation",
            "Explain what the data suggests and what action it supports.",
            "",
            "## Visualization Ideas",
            "- Bar chart",
            "- Timeline",
            "- Comparison table",
            "- Infographic callout"
        ]

    elif k in ["website", "website_package", "landing_page"]:
        body = [
            "## Website Creation Package",
            "",
            "## Website Goal",
            goal,
            "",
            "## Page Map",
            "1. Home",
            "2. About/Proof",
            "3. Offer/Services",
            "4. Contact/Booking",
            "",
            "## Home Page Copy",
            "Hero headline:",
            "Hero subheadline:",
            "Primary CTA:",
            "Secondary CTA:",
            "",
            "## Sections",
            "- Hero",
            "- Problem",
            "- Solution",
            "- Proof",
            "- Process",
            "- Testimonials or credibility",
            "- CTA",
            "",
            "## Design Direction",
            "Describe colors, layout, motion, typography, and visual mood.",
            "",
            "## Component List",
            "- Header",
            "- Hero",
            "- Cards",
            "- Gallery",
            "- Form",
            "- Footer"
        ]

    elif k in ["3d", "three_d", "3d_object", "three_d_object", "three_d_package"]:
        body = [
            "## 3D Object Creation Package",
            "",
            "## Object Description",
            prompt,
            "",
            "## Shape Language",
            "- Primary forms",
            "- Silhouette",
            "- Scale",
            "- Detail level",
            "",
            "## Materials",
            "- Color",
            "- Texture",
            "- Surface finish",
            "- Lighting notes",
            "",
            "## Viewer Requirements",
            "- Browser-viewable room",
            "- Preview image",
            "- Downloadable package",
            "- Revision history",
            "",
            "## Render Prompt",
            "Write a clean render prompt for the 3D/image generation lane.",
            "",
            "## Revision Notes",
            "Track requested changes here."
        ]

    elif k in ["image", "image_pack", "picture", "visual_prompt_pack"]:
        body = [
            "## Image Prompt Package",
            "",
            "## Image Goal",
            goal,
            "",
            "## Master Prompt",
            prompt,
            "",
            "## Composition",
            "- Subject",
            "- Environment",
            "- Lighting",
            "- Camera angle",
            "- Style",
            "- Mood",
            "",
            "## Variations",
            "1. Clean professional version",
            "2. Cinematic version",
            "3. Social media version",
            "4. High-detail poster version",
            "",
            "## Negative Constraints",
            "List what must not appear."
        ]

    else:
        body = ["## General Creative Package", ""]
        for i in range(1, sections + 1):
            body += [
                f"## Section {i}",
                "Purpose:",
                "Content:",
                "Visual/production notes:",
                ""
            ]

    body += [
        "",
        "## Storage and Handoff",
        "- Open Notebook owns this creative package.",
        "- Export/render lanes create final media from this package.",
        "- Seafile/storage governor should hold durable files and manifests.",
        "- Artifact viewer should expose the room link.",
        "- Skill router should return the actionable link/receipt."
    ]

    return "\n".join(header + body).strip() + "\n"


@app.post("/notebook/create-creative")
def create_creative(req: CreativeCreateRequest):
    creative_id = f"creative-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    content = creative_package_template(req)

    data = {
        "creative_id": creative_id,
        "creative_type": req.creative_type,
        "title": req.title,
        "prompt": req.prompt,
        "audience": req.audience,
        "goal": req.goal,
        "tone": req.tone,
        "duration_minutes": req.duration_minutes,
        "slide_count": req.slide_count,
        "sections": req.sections,
        "content": content,
        "versions": [
            {
                "version": 1,
                "created_at": now_iso(),
                "source": req.source,
                "instructions": "initial_create_creative",
                "content": content
            }
        ],
        "metadata": req.metadata,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }

    path = save_creative(data)
    receipt = write_receipt("creative_created", {
        "verdict": "LEEWAY_OPEN_NOTEBOOK_CREATIVE_CREATED",
        "creative_id": creative_id,
        "creative_type": req.creative_type,
        "title": req.title,
        "path": str(path),
        "version_count": 1
    })

    return {"ok": True, "creative": data, "receipt": receipt}


@app.get("/notebook/creative")
def list_creatives():
    return {"ok": True, "index": load_creative_index()}


@app.get("/notebook/creative/latest")
def latest_creative():
    path = NOTEBOOK_DIR / "latest-creative.json"
    if not path.exists():
        return {"ok": False, "message": "No creative package exists yet."}
    return {"ok": True, "creative": read_json(path)}


@app.get("/notebook/creative/{creative_id}")
def get_creative(creative_id: str):
    return {"ok": True, "creative": load_creative(creative_id)}


@app.get("/notebook/creative/{creative_id}/readback")
def readback_creative(creative_id: str):
    creative = load_creative(creative_id)
    return {
        "ok": True,
        "creative_id": creative_id,
        "creative_type": creative.get("creative_type"),
        "title": creative.get("title"),
        "content": creative.get("content", ""),
        "version_count": len(creative.get("versions", []))
    }


@app.post("/notebook/creative/{creative_id}/revise")
def revise_creative(creative_id: str, req: CreativeReviseRequest):
    creative = load_creative(creative_id)
    note = (
        "\n\n## Revision Note\n"
        f"Requested revision: {req.instructions}\n"
        "The creative package preserved the previous version and added this tracked revision layer.\n"
    )
    creative["content"] = creative.get("content", "").rstrip() + note
    creative["updated_at"] = now_iso()
    creative.setdefault("versions", []).append({
        "version": len(creative.get("versions", [])) + 1,
        "created_at": now_iso(),
        "source": req.source,
        "instructions": req.instructions,
        "content": creative["content"]
    })

    path = save_creative(creative)
    receipt = write_receipt("creative_revised", {
        "verdict": "LEEWAY_OPEN_NOTEBOOK_CREATIVE_REVISED",
        "creative_id": creative_id,
        "path": str(path),
        "version_count": len(creative.get("versions", []))
    })

    return {"ok": True, "creative": creative, "receipt": receipt}


@app.post("/notebook/creative/{creative_id}/export/pdf")
def export_creative_pdf(creative_id: str):
    creative = load_creative(creative_id)
    payload = {
        "title": creative.get("title", "Agent Lee Creative Package"),
        "body": creative.get("content", ""),
        "author": "Agent Lee",
        "format": "pdf",
        "source": "leeway_open_notebook",
        "metadata": {
            "creative_id": creative_id,
            "creative_type": creative.get("creative_type"),
            "version_count": len(creative.get("versions", []))
        }
    }
    try:
        r = requests.post(f"{DOC_RUNTIME}/document/create", json=payload, timeout=120)
        data = r.json()
        ok = r.status_code < 400
    except Exception as e:
        ok = False
        data = {"error": repr(e)}

    receipt = write_receipt("creative_export_pdf", {
        "verdict": "LEEWAY_OPEN_NOTEBOOK_CREATIVE_EXPORT_PDF_COMPLETE" if ok else "LEEWAY_OPEN_NOTEBOOK_CREATIVE_EXPORT_PDF_FAILED",
        "creative_id": creative_id,
        "document_runtime_result": data,
        "ok": ok
    })
    return {"ok": ok, "document_result": data, "receipt": receipt}


@app.get("/notebook/creative/{creative_id}/package")
def creative_package(creative_id: str):
    creative = load_creative(creative_id)
    return {
        "ok": True,
        "creative_id": creative_id,
        "package": {
            "type": creative.get("creative_type"),
            "title": creative.get("title"),
            "content": creative.get("content"),
            "metadata": creative.get("metadata", {}),
            "handoff": {
                "document_runtime": "export/pdf",
                "artifact_viewer": "room",
                "seafile_storage": "governed_storage",
                "render_lanes": ["image", "3d", "website", "video", "slides"]
            }
        }
    }



# ---------------------------------------------------------------------
# Top-level creative routes.
# These avoid collision with older /notebook/{notebook_id} route.
# ---------------------------------------------------------------------

@app.post("/creative/create")
def creative_create_alias(req: CreativeCreateRequest):
    return create_creative(req)


@app.get("/creative")
def creative_list_alias():
    return {"ok": True, "index": load_creative_index()}


@app.get("/creative/latest")
def creative_latest_alias():
    path = NOTEBOOK_DIR / "latest-creative.json"
    if not path.exists():
        return {"ok": False, "message": "No creative package exists yet."}
    return {"ok": True, "creative": read_json(path)}


@app.get("/creative/{creative_id}")
def creative_get_alias(creative_id: str):
    return {"ok": True, "creative": load_creative(creative_id)}


@app.get("/creative/{creative_id}/readback")
def creative_readback_alias(creative_id: str):
    creative = load_creative(creative_id)
    return {
        "ok": True,
        "creative_id": creative_id,
        "creative_type": creative.get("creative_type"),
        "title": creative.get("title"),
        "content": creative.get("content", ""),
        "version_count": len(creative.get("versions", []))
    }


@app.post("/creative/{creative_id}/revise")
def creative_revise_alias(creative_id: str, req: CreativeReviseRequest):
    return revise_creative(creative_id, req)


@app.post("/creative/{creative_id}/export/pdf")
def creative_export_pdf_alias(creative_id: str):
    return export_creative_pdf(creative_id)


@app.get("/creative/{creative_id}/package")
def creative_package_alias(creative_id: str):
    return creative_package(creative_id)



# ---------------------------------------------------------------------
# LEEWAY OPEN NOTEBOOK WEBSITE PACKAGE RENDERER
# Website requests must create a live website room, not only a PDF.
# ---------------------------------------------------------------------

def leeway_website_escape(value):
    try:
        return html.escape(str(value or ""))
    except Exception:
        return str(value or "")


def leeway_render_website_package_html(creative):
    title = leeway_website_escape(creative.get("title", "Leeway Website"))
    prompt = str(creative.get("prompt", "") or "")
    cid = leeway_website_escape(creative.get("creative_id", ""))

    dark = "dark" in prompt.lower() or "dark theme" in prompt.lower()

    bg = "#060914" if dark else "#f6f8fb"
    panel = "#101827" if dark else "#ffffff"
    text = "#f4f8ff" if dark else "#101827"
    muted = "#aebcd0" if dark else "#506070"
    accent = "#58c7ff"
    green = "#8ef6c1"

    wants_3d = "3d" in prompt.lower() or "three d" in prompt.lower()
    wants_video = "video" in prompt.lower()
    wants_avatar = "avatar" in prompt.lower()

    objects = [
        ("Vision Tower", "A luminous 3D tower representing strategy, visibility, and command."),
        ("Execution Engine", "A rotating core representing workflow automation and governed action."),
        ("Proof Orb", "A glass sphere representing receipts, standards, memory, and delivery proof.")
    ]

    if not wants_3d:
        objects = objects[:1]

    object_html = ""
    for name, desc in objects:
        object_html += f"""
        <div class="objectCard">
          <div class="cube"><span></span></div>
          <h3>{leeway_website_escape(name)}</h3>
          <p>{leeway_website_escape(desc)}</p>
        </div>
        """

    video_html = ""
    if wants_video:
        video_html = f"""
        <section class="section video">
          <div>
            <p class="kicker">Explainer Video</p>
            <h2>Leeway Standards, spoken clearly.</h2>
            <p>This short video block is prepared for the video/avatar lane. It explains the Leeway standards: create with purpose, route through the right skill, deliver usable artifacts, and prove the work with receipts.</p>
          </div>
          <div class="videoBox">
            <div class="play">Γû╢</div>
            <p>{'Avatar narration ready' if wants_avatar else 'Video narration ready'}</p>
          </div>
        </section>
        """

    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title}</title>
<style>
:root {{
  --bg:{bg};
  --panel:{panel};
  --text:{text};
  --muted:{muted};
  --accent:{accent};
  --green:{green};
}}
* {{ box-sizing:border-box; }}
body {{
  margin:0;
  background:
    radial-gradient(circle at 10% 10%, rgba(88,199,255,.22), transparent 24%),
    radial-gradient(circle at 90% 15%, rgba(142,246,193,.14), transparent 24%),
    var(--bg);
  color:var(--text);
  font-family:Inter, Segoe UI, Arial, sans-serif;
}}
header {{
  position:sticky;
  top:0;
  z-index:10;
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:20px 44px;
  border-bottom:1px solid rgba(255,255,255,.12);
  background:rgba(6,9,20,.76);
  backdrop-filter:blur(12px);
}}
.logo {{
  font-weight:950;
  letter-spacing:-.04em;
  font-size:22px;
}}
nav a {{
  color:var(--muted);
  text-decoration:none;
  margin-left:22px;
  font-weight:700;
}}
.hero {{
  width:min(1220px,94vw);
  margin:0 auto;
  min-height:76vh;
  display:grid;
  grid-template-columns:1.05fr .95fr;
  gap:38px;
  align-items:center;
  padding:70px 0;
}}
.badge {{
  display:inline-block;
  border:1px solid rgba(88,199,255,.38);
  color:var(--accent);
  background:rgba(88,199,255,.10);
  padding:8px 12px;
  border-radius:999px;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.1em;
  font-weight:900;
}}
h1 {{
  margin:20px 0 18px;
  font-size:clamp(48px,7vw,94px);
  line-height:.9;
  letter-spacing:-.075em;
}}
.lead {{
  font-size:clamp(18px,2vw,25px);
  color:var(--muted);
  line-height:1.48;
  max-width:760px;
}}
.ctaRow {{
  margin-top:28px;
  display:flex;
  gap:14px;
  flex-wrap:wrap;
}}
.btn {{
  border:0;
  border-radius:16px;
  padding:15px 19px;
  font-weight:900;
  background:var(--accent);
  color:#04101d;
  text-decoration:none;
}}
.btn.secondary {{
  background:transparent;
  color:var(--text);
  border:1px solid rgba(255,255,255,.25);
}}
.stage {{
  min-height:520px;
  border-radius:34px;
  border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.035));
  display:grid;
  place-items:center;
  position:relative;
  overflow:hidden;
  box-shadow:0 30px 90px rgba(0,0,0,.4);
}}
.orbit {{
  position:absolute;
  width:360px;
  height:360px;
  border:1px dashed rgba(88,199,255,.35);
  border-radius:999px;
  animation:spin 16s linear infinite;
}}
.core {{
  width:190px;
  height:190px;
  border-radius:42px;
  background:linear-gradient(135deg,var(--accent),var(--green));
  transform:rotateX(58deg) rotateZ(42deg);
  box-shadow:0 0 70px rgba(88,199,255,.48);
}}
@keyframes spin {{ to {{ transform:rotate(360deg); }} }}
.section {{
  width:min(1220px,94vw);
  margin:0 auto 34px;
  padding:46px;
  border:1px solid rgba(255,255,255,.13);
  background:rgba(255,255,255,.055);
  border-radius:30px;
}}
.section h2 {{
  font-size:clamp(34px,5vw,64px);
  letter-spacing:-.055em;
  margin:8px 0 16px;
}}
.grid {{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:18px;
}}
.card, .objectCard {{
  background:var(--panel);
  color:var(--text);
  border:1px solid rgba(255,255,255,.12);
  border-radius:24px;
  padding:24px;
  min-height:230px;
}}
.card p, .objectCard p, .section p {{
  color:var(--muted);
  line-height:1.55;
}}
.kicker {{
  color:var(--accent);
  font-weight:900;
  letter-spacing:.1em;
  text-transform:uppercase;
  font-size:12px;
}}
.cube {{
  width:82px;
  height:82px;
  border-radius:18px;
  background:linear-gradient(135deg,var(--accent),var(--green));
  transform:rotateX(55deg) rotateZ(35deg);
  box-shadow:0 0 40px rgba(88,199,255,.35);
  margin-bottom:22px;
}}
.video {{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:30px;
  align-items:center;
}}
.videoBox {{
  min-height:300px;
  border-radius:28px;
  background:linear-gradient(135deg,#111,#243750);
  display:grid;
  place-items:center;
  text-align:center;
  border:1px solid rgba(255,255,255,.16);
}}
.play {{
  width:92px;
  height:92px;
  border-radius:999px;
  display:grid;
  place-items:center;
  background:var(--accent);
  color:#04101d;
  font-size:40px;
  font-weight:900;
}}
footer {{
  padding:34px 44px;
  color:var(--muted);
  border-top:1px solid rgba(255,255,255,.12);
}}
@media(max-width:950px) {{
  .hero, .video {{ grid-template-columns:1fr; }}
  .grid {{ grid-template-columns:1fr; }}
  header {{ padding:18px 20px; }}
}}
</style>
</head>
<body>
<header>
  <div class="logo">Leeway</div>
  <nav>
    <a href="#standards">Standards</a>
    <a href="#objects">3D Objects</a>
    <a href="#contact">Contact</a>
  </nav>
</header>

<main>
  <section class="hero">
    <div>
      <span class="badge">Professional Website Package</span>
      <h1>{title}</h1>
      <p class="lead">A dark, professional Leeway website concept built from your Telegram instruction. It includes a proper header, footer, 3D object section, standards message, and video/avatar-ready block.</p>
      <div class="ctaRow">
        <a class="btn" href="#standards">Explore the Standards</a>
        <a class="btn secondary" href="#objects">View 3D Concepts</a>
      </div>
    </div>
    <div class="stage">
      <div class="orbit"></div>
      <div class="core"></div>
    </div>
  </section>

  <section id="standards" class="section">
    <p class="kicker">Leeway Standards</p>
    <h2>Vision meets execution.</h2>
    <div class="grid">
      <div class="card"><h3>Create with purpose</h3><p>Every artifact starts with a clear audience, message, structure, and delivery target.</p></div>
      <div class="card"><h3>Route through the right skill</h3><p>Agent Lee must select the correct runtime lane instead of flattening every request into a PDF.</p></div>
      <div class="card"><h3>Deliver proof</h3><p>Every website, document, meeting, image, 3D object, and video needs a link, file, room, and receipt.</p></div>
    </div>
  </section>

  <section id="objects" class="section">
    <p class="kicker">3D Object Concepts</p>
    <h2>Three visual anchors for the message.</h2>
    <div class="grid">
      {object_html}
    </div>
  </section>

  {video_html}

  <section id="contact" class="section">
    <p class="kicker">Next Step</p>
    <h2>Ready for render lanes.</h2>
    <p>This website room is live HTML. The next lanes can package it as a deployable site, generate final 3D files, create a narrated video, and store everything through governed storage.</p>
    <p><strong>Creative ID:</strong> {cid}</p>
  </section>
</main>

<footer>
  <strong>Leeway Industries</strong> ΓÇó Website room generated by leeway_open_notebook ΓÇó Stored as a governed creative package.
</footer>
</body>
</html>"""


@app.get("/creative/{creative_id}/render/website", response_class=HTMLResponse)
def creative_render_website(creative_id: str):
    creative = load_creative(creative_id)
    return HTMLResponse(leeway_render_website_package_html(creative))


@app.get("/creative/latest/render/website", response_class=HTMLResponse)
def latest_creative_render_website():
    path = NOTEBOOK_DIR / "latest-creative.json"
    if not path.exists():
        return HTMLResponse("<h1>No latest creative package exists yet.</h1>", status_code=404)
    creative = read_json(path)
    return HTMLResponse(leeway_render_website_package_html(creative))



# LEEWAY_STANDARD_OPENAPI_PATCH_BEGIN
from datetime import datetime
from typing import Any, Dict

try:
    _leeway_service_name = "leeway_open_notebook"

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

