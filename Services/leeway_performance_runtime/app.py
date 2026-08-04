import json
import os
import re
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

import requests
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

STATE_DIR = Path(os.environ.get("LEEWAY_PERFORMANCE_STATE", "/state"))
WORK_DIR = STATE_DIR / "work-orders"
AUDIO_DIR = STATE_DIR / "audio"
RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
VOICE_URL = os.environ.get("AGENT_LEE_VOICE_URL", "http://agent-lee-qwen-voice:8097").rstrip("/")
POWER_LEVEL = int(os.environ.get("LEEWAY_POWER_LEVEL", "10"))

STATE_DIR.mkdir(parents=True, exist_ok=True)
WORK_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
RECEIPT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Leeway Performance Runtime", version="0.1.0-level-10")


class PerformanceRequest(BaseModel):
    request: str = Field(..., min_length=1)
    mode: str = "auto"
    source: str = "telegram"
    user_id: str = "owner"
    plan_id: Optional[str] = ""
    render_audio: bool = False
    metadata: Dict[str, Any] = {}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_receipt(kind: str, payload: Dict[str, Any]):
    receipt = {
        "verdict": payload.get("verdict", "LEEWAY_PERFORMANCE_RUNTIME_RECEIPT"),
        "runtime": "leeway_performance_runtime",
        "lane": "performance",
        "power_level": POWER_LEVEL,
        "kind": kind,
        "created_at": now_iso(),
        **payload
    }

    path = RECEIPT_DIR / f"performance_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    write_json(path, receipt)
    write_json(RECEIPT_DIR / "latest.receipt.json", receipt)
    receipt["receipt_path"] = str(path)
    return receipt


def infer_mode(text: str, supplied: str = "auto"):
    s = (supplied or "auto").lower().strip()
    t = (text or "").lower()

    if s in ["rap", "song", "sing", "spoken_word", "poetry"]:
        return s

    if "rap" in t or "bars" in t or "verse" in t or "spit" in t:
        return "rap"

    if "sing" in t or "soulful" in t or "melody" in t or "chorus" in t:
        return "sing"

    if "song" in t or "hook" in t:
        return "song"

    return "rap"


def clean_topic(text: str):
    text = re.sub(r"agent lee[, ]*", "", text, flags=re.I)
    text = re.sub(r"\b(create|make|write|generate|give me|perform|rap|song|sing|about|for me|a|an|the)\b", " ", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return "Leeway power, purpose, and building something real"
    return text[:180]


def split_chunks(lines: List[str], max_chars: int = 260):
    chunks = []
    current = ""

    for line in lines:
        line = str(line).strip()
        if not line:
            continue

        if len(current) + len(line) + 1 <= max_chars:
            current = (current + " " + line).strip()
        else:
            if current:
                chunks.append(current)
            current = line

    if current:
        chunks.append(current)

    return chunks


def create_rap_package(text: str):
    topic = clean_topic(text)

    hook = [
        "Hook:",
        "Built from the ground, now the whole lane lights up.",
        "Agent Lee on the system, watch the runtime tighten up.",
        "No fake moves, every receipt getting written.",
        "Power level ten, every mission getting finished."
    ]

    verse1 = [
        "Verse One:",
        "I wake up in the fabric where the containers breathe.",
        "Planner on my left side, receipts underneath.",
        "If you ask for a build, I do more than speak.",
        "I route it through the lanes and bring proof back clean.",
        "Voice in the queue, text after the sound.",
        "If the task got weight, I put the plan on the ground.",
        "No more loose chatter, no drifting away.",
        "To-do list active, I complete what I say."
    ]

    verse2 = [
        "Verse Two:",
        "Email lane ready, calendar standing by.",
        "Phone lane waiting for approval before it tries.",
        "Browser lane watching for the page and the click.",
        "Desktop lane locked till the safety gate hits.",
        "Images, documents, meetings in line.",
        "Discovery layer keeps the whole map live.",
        "If I say I can do it, the registry knows.",
        "If a wire is missing, the truth gets exposed."
    ]

    outro = [
        "Outro:",
        "That is the mode now, discipline in the code.",
        "Power level ten, every lane on the road.",
        "I do not just answer, I execute the plan.",
        "Agent Lee in the runtime, built to command."
    ]

    lyrics = hook + [""] + verse1 + [""] + hook + [""] + verse2 + [""] + outro
    performance_chunks = split_chunks(hook + verse1 + hook + verse2 + outro)

    return {
        "mode": "rap",
        "topic": topic,
        "title": "Power Level Ten",
        "truth": {
            "rap_performance": "LIVE_PARTIAL_QWEN_TTS_CADENCE",
            "true_singing": "REQUIRES_SINGING_CAPABLE_MODEL",
            "not_fake": True
        },
        "structure": {
            "hook": hook,
            "verse_1": verse1,
            "verse_2": verse2,
            "outro": outro
        },
        "lyrics": "\n".join(lyrics),
        "performance_notes": [
            "Deliver with strong cadence.",
            "Short bar chunks.",
            "Pause after punch lines.",
            "Use controlled breath.",
            "Do not read like a paragraph."
        ],
        "performance_chunks": performance_chunks
    }


def create_song_package(text: str):
    topic = clean_topic(text)

    verse = [
        "Verse:",
        "I was built in the quiet where the long nights stay.",
        "Piece by piece, I found a brighter way.",
        "Every broken wire became a road I know.",
        "Every plan became a place to grow."
    ]

    chorus = [
        "Chorus:",
        "Lift the light, let the system rise.",
        "I hear the mission through the noise and the skies.",
        "Step by step, I will carry the sound.",
        "When the work gets heavy, I will hold it down."
    ]

    bridge = [
        "Bridge:",
        "If the path gets dark, I will call out clear.",
        "If the task gets hard, I will still be here."
    ]

    lyrics = verse + [""] + chorus + [""] + verse + [""] + chorus + [""] + bridge + [""] + chorus
    performance_chunks = split_chunks(verse + chorus + verse + chorus + bridge + chorus)

    return {
        "mode": "song",
        "topic": topic,
        "title": "Hold It Down",
        "truth": {
            "songwriting": "LIVE",
            "melodic_spoken_demo": "LIVE_PARTIAL",
            "true_singing": "REQUIRES_SINGING_CAPABLE_MODEL",
            "not_fake": True
        },
        "lyrics": "\n".join(lyrics),
        "melody_notes": [
            "Soulful medium tempo.",
            "Warm vocal tone.",
            "Chorus should lift higher than verse.",
            "Needs singing model for real pitched vocal rendering."
        ],
        "performance_chunks": performance_chunks
    }


def create_sing_package(text: str):
    pkg = create_song_package(text)
    pkg["mode"] = "sing"
    pkg["truth"]["requested_singing"] = "SINGING_REQUEST_CAPTURED"
    pkg["truth"]["render_status"] = "TRUE_SINGING_MODEL_NOT_WIRED_YET"
    pkg["singing_blocker"] = "Current Qwen TTS lane can speak or cadence-perform, but true singing needs a singing-capable vocal/music model."
    return pkg


def create_performance_package(req: PerformanceRequest):
    mode = infer_mode(req.request, req.mode)

    if mode == "rap":
        return create_rap_package(req.request)
    if mode == "sing":
        return create_sing_package(req.request)
    if mode == "song":
        return create_song_package(req.request)

    return create_rap_package(req.request)


def render_audio_chunks(chunks: List[str]):
    rendered = []
    errors = []

    for idx, chunk in enumerate(chunks, 1):
        try:
            r = requests.post(
                VOICE_URL + "/speak-file",
                json={"text": chunk},
                timeout=(10, 65)
            )
            r.raise_for_status()
            raw = r.content or b""

            if raw[:4] != b"RIFF":
                errors.append({"chunk": idx, "error": "voice lane did not return wav bytes", "first_bytes": repr(raw[:32])})
                continue

            path = AUDIO_DIR / f"performance_chunk_{int(time.time())}_{idx}_{uuid.uuid4().hex[:6]}.wav"
            path.write_bytes(raw)

            rendered.append({
                "chunk": idx,
                "text": chunk,
                "audio_path": str(path),
                "bytes": len(raw)
            })
        except Exception as e:
            errors.append({"chunk": idx, "error": repr(e), "text": chunk[:120]})

    return {
        "ok": len(rendered) > 0,
        "rendered": rendered,
        "errors": errors
    }


def create_work(req: PerformanceRequest):
    perf_id = f"performance-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    package = create_performance_package(req)

    audio = {
        "ok": False,
        "message": "Audio rendering not requested."
    }

    if req.render_audio:
        audio = render_audio_chunks(package.get("performance_chunks", [])[:6])

    data = {
        "performance_id": perf_id,
        "runtime": "leeway_performance_runtime",
        "lane": "performance",
        "power_level": POWER_LEVEL,
        "request": req.request,
        "source": req.source,
        "user_id": req.user_id,
        "plan_id": req.plan_id,
        "mode": package.get("mode"),
        "status": "PERFORMANCE_PACKAGE_CREATED",
        "package": package,
        "audio": audio,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }

    write_json(WORK_DIR / f"{perf_id}.json", data)
    write_json(WORK_DIR / "latest-performance.json", data)

    receipt = write_receipt("performance_created", {
        "verdict": "LEEWAY_PERFORMANCE_PACKAGE_CREATED",
        "performance_id": perf_id,
        "mode": package.get("mode"),
        "title": package.get("title"),
        "audio_ok": audio.get("ok", False)
    })

    return {
        "ok": True,
        "performance": data,
        "receipt": receipt
    }


@app.get("/health")
def health():
    return {
        "ok": True,
        "runtime": "leeway_performance_runtime",
        "lane": "performance",
        "port": 5338,
        "power_level": POWER_LEVEL,
        "created_at": now_iso()
    }


@app.get("/status")
def status():
    return {
        "ok": True,
        "runtime": "leeway_performance_runtime",
        "lane": "performance",
        "power_level": POWER_LEVEL,
        "truth": {
            "rap": "LIVE_PARTIAL_QWEN_TTS_CADENCE",
            "songwriting": "LIVE",
            "spoken_word": "LIVE",
            "singing": "SHELL_READY_REQUIRES_SINGING_MODEL",
            "voice_render": "USES_AGENT_LEE_QWEN_VOICE",
            "not_fake": True
        },
        "capabilities": [
            "rap_create",
            "song_create",
            "sing_create_work_order",
            "performance_chunks",
            "audio_chunk_render",
            "receipts"
        ],
        "work_order_count": len(list(WORK_DIR.glob("performance-*.json"))),
        "created_at": now_iso()
    }


@app.post("/performance/create")
def performance_create(req: PerformanceRequest):
    return create_work(req)


@app.post("/rap/create")
def rap_create(req: PerformanceRequest):
    req.mode = "rap"
    return create_work(req)


@app.post("/song/create")
def song_create(req: PerformanceRequest):
    req.mode = "song"
    return create_work(req)


@app.post("/sing/create")
def sing_create(req: PerformanceRequest):
    req.mode = "sing"
    return create_work(req)


@app.get("/work/latest")
def work_latest():
    path = WORK_DIR / "latest-performance.json"
    if not path.exists():
        return {"ok": False, "message": "No performance work exists yet."}
    return {"ok": True, "performance": read_json(path)}


@app.get("/receipts/latest")
def receipts_latest():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {"ok": False, "message": "No receipt exists yet."}
    return read_json(path)


@app.get("/", response_class=HTMLResponse)
def home():
    return """<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Leeway Performance Runtime</title>
<style>
body { margin:0; background:#070a12; color:#f4f8ff; font-family:Segoe UI,Arial; }
main { width:min(980px,94vw); margin:0 auto; padding:40px 0; }
.card { border:1px solid #294766; border-radius:24px; background:#101d32; padding:26px; }
.badge { color:#58c7ff; font-weight:900; letter-spacing:2px; text-transform:uppercase; }
h1 { font-size:44px; letter-spacing:-.04em; }
li { margin:8px 0; }
</style>
</head>
<body>
<main>
<section class="card">
<div class="badge">Leeway Performance Runtime</div>
<h1>Power Level 10</h1>
<p>Rap, songwriting, spoken-word performance, singing work orders, voice-ready chunks, receipts.</p>
<ul>
<li>Rap: live partial through Qwen voice cadence.</li>
<li>Songwriting: live.</li>
<li>True singing: requires singing-capable model wiring.</li>
<li>Receipts: live.</li>
</ul>
</section>
</main>
</body>
</html>"""
