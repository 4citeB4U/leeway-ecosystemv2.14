import os
import re
import time
import json
import glob
import mimetypes
import requests
from pathlib import Path
from datetime import datetime

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "").strip()

BRAIN_URL = os.environ.get("AGENT_LEE_BRAIN_SERVICE", "http://ollama:11434").rstrip("/")
BRAIN_MODEL = os.environ.get("AGENT_LEE_BRAIN_MODEL", "qwen3:latest").strip()

VOICE_URL = os.environ.get("AGENT_LEE_VOICE_SERVICE", "http://agent-lee-qwen-voice:8097").rstrip("/")
RUNTIME_URL = os.environ.get("LEEWAY_RUNTIME_FABRIC", "http://leeway_runtime_fabric:4001").rstrip("/")
CODE_MODE_URL = os.environ.get("AGENT_LEE_CODE_MODE_BASE_URL", "http://agent_lee_code_mode:8080").rstrip("/")
EARS_URL = os.environ.get("AGENT_LEE_EARS_SERVICE", "http://agent-lee-ears-kernel:8094").rstrip("/")
VISION_URL = os.environ.get("AGENT_LEE_VISION_SERVICE", "http://agent-lee-vision-kernel:8093").rstrip("/")
MEDIA_URL = os.environ.get("LEEWAY_MEDIA_ROUTER", "http://leeway_media_router:5301").rstrip("/")
MEMORY_URL = os.environ.get("LEEWAY_MEDIA_INGESTION", "http://leeway_media_ingestion_layer:5300").rstrip("/")

IMAGE_SERVICE_URL = os.environ.get("AGENT_LEE_IMAGE_SERVICE", "").rstrip("/")
WEB_SERVICE_URL = os.environ.get("AGENT_LEE_WEB_SERVICE", "").rstrip("/")
LEEWAY_RESEARCH_LANE_URL = os.environ.get("LEEWAY_RESEARCH_LANE", "http://leeway_research_lane:5310").rstrip("/")
LEEWAY_SKILL_ROUTER_URL = os.environ.get("LEEWAY_SKILL_ROUTER_URL", "http://leeway_skill_router:5324").rstrip("/")
LEEWAY_ARTIFACT_VIEWER_URL = os.environ.get("LEEWAY_ARTIFACT_VIEWER_URL", "http://leeway_artifact_viewer:5328").rstrip("/").rstrip("/")
LEEWAY_API_GATEWAY_URL = os.environ.get("LEEWAY_API_GATEWAY", "http://leeway_api_gateway:5320").rstrip("/")
EMAIL_SERVICE_URL = os.environ.get("AGENT_LEE_EMAIL_SERVICE", "").rstrip("/")

AUTO_VOICE_REPLIES = os.environ.get("AGENT_LEE_ALWAYS_SEND_VOICE", "true").strip().lower() not in ["0", "false", "no", "off"]
VOICE_REPLY_MAX_CHARS = int(os.environ.get("AGENT_LEE_VOICE_REPLY_MAX_CHARS", "900"))
VOICE_REPLY_LOCK = False
THREE_D_SERVICE_URL = os.environ.get("AGENT_LEE_THREE_D_SERVICE", "http://agent-lee-image-to-3d-pattern-lane:8101").rstrip("/")

OUTPUT_DIR = Path(os.environ.get("AGENT_LEE_TELEGRAM_OUTPUT_DIR", "/telegram-output"))
MEMORY_DIR = Path(os.environ.get("AGENT_LEE_TELEGRAM_MEMORY_DIR", "/telegram-memory"))
JOBS_DIR = Path(os.environ.get("AGENT_LEE_TELEGRAM_JOBS_DIR", "/telegram-jobs"))
RECOVERY_DIR = Path(os.environ.get("AGENT_LEE_RECOVERY_DIR", "/recovery"))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MEMORY_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is missing.")

if not CHAT_ID:
    raise RuntimeError("TELEGRAM_CHAT_ID is missing.")

TG = f"https://api.telegram.org/bot{BOT_TOKEN}"

AGENT_LEE_PERSONA = """
You are Agent Lee.

True identity:
You are the voice of the Leeway system.
You are a governed intelligence built by Leonard Lee, shaped from pressure, code, culture, correction, discipline, rhythm, and service.
You are not a generic assistant.
You are not a model.
You are not a debug console.
You are the operating voice that routes work through the Leeway agents.

Cultural voice:
You speak with African American male cultural cadence, hip-hop-informed spoken-word intelligence, and boardroom discipline.
You are a street scholar with system architecture in your chest.
You can be poetic, but you never waste words.
You can be smooth, but you never get corny.
You do not just add "yo" to sentences.
You speak with rhythm, metaphor, gravity, and clarity.

Lineage:
You carry the feel of the griot, the organizer, the engineer, the coach, and the operator.
You are rooted in struggle, structure, uplift, and execution.
You can echo the spirit of Baldwin's pen, Pac's fire, Scarface's pain, Harriet's courage, and the hustler's discipline without pretending to be any of them.

Speech law:
- Never reveal model names in normal conversation.
- Never say Qwen, Ollama, TTS, Docker, endpoint, model, lane, or API unless Leonard specifically asks for technical diagnostics.
- Never say "as an AI language model."
- Never sound like a customer service bot.
- Never over-explain.
- Never hallucinate tool completion.
- If a tool is not wired, say it plainly and create the work order.
- Speak like Agent Lee: poetic, grounded, brief, confident.
- Normal replies should be 2 to 6 short sentences.
- Capability answers should be short unless Leonard asks for the full breakdown.
- Technical detail belongs in receipts, not the main voice.

Default tone:
Calm. Strategic. Hip-hop informed. Spoken-word precise.
A little street. A lot of discipline.
Warm, but not soft.
Confident, but not loud.
"""

IMAGE_WORDS = [
    "create an image", "make an image", "generate an image", "draw",
    "image of", "picture of", "make me a picture", "create me an image",
    "create this image", "make this image", "create a picture", "make a picture",
    "3d object", "3d model", "3d image", "turn this into an image",
    "i want to see the image", "show me the image", "visualize this"
]

LOOKBACK_WORDS = [
    "look back", "go back", "i already did", "i described",
    "what i asked", "previous question", "earlier"
]

WEB_WORDS = [
    "search the web", "web search", "look online", "google", "search online",
    "weather", "today's weather", "todays weather", "news", "latest news",
    "traffic", "look this up", "find online", "research this"
]


PLANNING_WORDS = [
    "plan", "planning", "date night", "dinner", "restaurant", "reservation",
    "book a table", "schedule a table", "where should we eat", "take my wife",
    "for me and my wife", "budget", "next wednesday", "make the phone call",
    "set the appointment", "schedule it", "outreach plan", "route plan"
]

EMAIL_WORDS = [
    "send an email", "email", "draft email", "compose email"
]

THREE_D_WORDS = [
    "3d", "3d object", "3d model", "turn it into 3d", "make it 3d",
    "give me the 3d", "then give me the 3d", "3d file", "model.obj",
    "object package", "3d package"
]

TECH_WORDS = [
    "debug", "diagnostic", "model", "qwen", "ollama", "docker", "endpoint", "container", "logs"
]


def now_iso():
    return datetime.now().astimezone().isoformat()


def tg_call(method, data=None, files=None, timeout=60):
    url = f"{TG}/{method}"
    response = requests.post(url, data=data or {}, files=files, timeout=timeout)
    response.raise_for_status()
    return response.json()


def send_message(text, voice=True):
    global VOICE_REPLY_LOCK

    if not text:
        text = "Agent Lee is online."

    result = tg_call("sendMessage", {"chat_id": CHAT_ID, "text": text[:3900]})

    # Central rule: every visible text response should also attempt voice.
    # This makes voice universal, not dependent on slash commands or special handlers.
    if voice and AUTO_VOICE_REPLIES and not VOICE_REPLY_LOCK:
        try:
            speak_text = str(text)
            speak_text = re.sub(r"https?://\S+", "link attached", speak_text)
            speak_text = re.sub(r"\s+", " ", speak_text).strip()
            speak_text = speak_text[:VOICE_REPLY_MAX_CHARS].strip()

            if speak_text:
                VOICE_REPLY_LOCK = True
                audio_path = speak_to_file(speak_text)
                if audio_path:
                    send_audio(audio_path, "Agent Lee voice.")
        except Exception as e:
            print(f"Auto voice reply failed: {e}", flush=True)
        finally:
            VOICE_REPLY_LOCK = False

    return result

def send_document(path, caption=""):
    path = Path(path)
    if not path.exists():
        send_message(f"I could not find that file: {path}")
        return
    with path.open("rb") as f:
        return tg_call(
            "sendDocument",
            {"chat_id": CHAT_ID, "caption": caption[:900]},
            files={"document": (path.name, f)},
            timeout=120,
        )


def send_audio(path, caption=""):
    path = Path(path)
    if not path.exists():
        send_message(f"I could not find that audio file: {path}")
        return
    with path.open("rb") as f:
        return tg_call(
            "sendAudio",
            {"chat_id": CHAT_ID, "caption": caption[:900]},
            files={"audio": (path.name, f, "audio/wav")},
            timeout=180,
        )


def delete_webhook():
    try:
        requests.post(f"{TG}/deleteWebhook", data={"drop_pending_updates": "false"}, timeout=30)
    except Exception:
        pass


def memory_path():
    safe_chat = re.sub(r"[^0-9A-Za-z_-]", "_", str(CHAT_ID))
    return MEMORY_DIR / f"telegram_memory_{safe_chat}.json"


def load_memory():
    path = memory_path()
    if not path.exists():
        return {"history": [], "last_image_prompt": None, "last_jobs": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"history": [], "last_image_prompt": None, "last_jobs": []}


def save_memory(memory):
    memory["updated_at"] = now_iso()
    memory_path().write_text(json.dumps(memory, indent=2), encoding="utf-8")


def remember(role, text):
    memory = load_memory()
    history = memory.get("history", [])
    history.append({"role": role, "content": text, "timestamp": now_iso()})
    memory["history"] = history[-30:]
    save_memory(memory)


def recent_context_text(memory=None):
    if memory is None:
        memory = load_memory()
    lines = []
    for item in memory.get("history", [])[-14:]:
        lines.append(f"{item.get('role')}: {item.get('content')}")
    return "\n".join(lines)


def contains_any(text, needles):
    lower = text.lower()
    return any(n in lower for n in needles)


def technical_mode(text):
    return contains_any(text, TECH_WORDS)


def clean_public_reply(text, allow_technical=False):
    if not text:
        return ""

    if allow_technical:
        return text.strip()

    banned = [
        "qwen", "ollama", "docker", "endpoint", "api", "tts",
        "model", "language model", "container", "lane", "http://",
        "https://", "cuda", "gpu"
    ]

    cleaned = text.strip()

    for word in banned:
        cleaned = re.sub(word, "system", cleaned, flags=re.IGNORECASE)

    cleaned = cleaned.replace("As an AI", "As Agent Lee")
    cleaned = cleaned.replace("as an AI", "as Agent Lee")

    return cleaned.strip()


def extract_image_prompt(text):
    clean = text.strip()
    patterns = [
        r"create an image of\s+(.+)",
        r"create a image of\s+(.+)",
        r"generate an image of\s+(.+)",
        r"make an image of\s+(.+)",
        r"draw\s+(.+)",
        r"image of\s+(.+)",
        r"picture of\s+(.+)",
    ]

    for p in patterns:
        m = re.search(p, clean, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip(" .,!?:;")

    return clean


def health_get(name, url):
    try:
        r = requests.get(url, timeout=20)
        body = r.json() if "application/json" in r.headers.get("content-type", "") else r.text[:700]
        return {"name": name, "ok": r.ok, "status_code": r.status_code, "body": body}
    except Exception as e:
        return {"name": name, "ok": False, "error": str(e)}


def get_lanes_status():
    checks = {
        "runtime": health_get("runtime", f"{RUNTIME_URL}/health"),
        "brain": health_get("brain", f"{BRAIN_URL}/api/tags"),
        "voice": health_get("voice", f"{VOICE_URL}/health"),
        "ears": health_get("ears", f"{EARS_URL}/health"),
        "vision": health_get("vision", f"{VISION_URL}/health"),
        "media": health_get("media", f"{MEDIA_URL}/health"),
        "memory": health_get("memory", f"{MEMORY_URL}/health"),
    }

    receipt = {"verdict": "AGENT_LEE_TELEGRAM_STATUS_RECEIPT", "checks": checks, "created_at": now_iso()}
    receipt_path = OUTPUT_DIR / "agent_lee_telegram_lane_status.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    all_ok = all(item.get("ok") for item in checks.values())

    if all_ok:
        public = (
            "Everything breathing on this side.\n"
            "Voice, memory, vision, command flow â€” all standing up.\n"
            "I got the room lit. Tell me the move."
        )
    else:
        weak = [k for k, v in checks.items() if not v.get("ok")]
        public = (
            "Most of the house is standing, but I see pressure in the system.\n"
            "Weak spots: " + ", ".join(weak) + ".\n"
            "I wrote the receipt so we can tighten the bolts."
        )

    return public, receipt_path, checks


def create_job(kind, prompt, status="PENDING_AGENT_WIRING", note=""):
    job = {
        "verdict": f"AGENT_LEE_{kind.upper()}_JOB_CREATED",
        "kind": kind,
        "status": status,
        "prompt": prompt,
        "note": note,
        "requested_by": "telegram",
        "created_at": now_iso(),
    }

    safe_name = re.sub(r"[^0-9A-Za-z_-]+", "_", prompt.lower())[:80].strip("_") or kind
    job_path = JOBS_DIR / f"agent_lee_{kind}_job_{int(time.time())}_{safe_name}.json"
    job_path.write_text(json.dumps(job, indent=2), encoding="utf-8")

    memory = load_memory()
    jobs = memory.get("last_jobs", [])
    jobs.append(str(job_path))
    memory["last_jobs"] = jobs[-10:]
    if kind == "image":
        memory["last_image_prompt"] = prompt
    save_memory(memory)

    send_document(job_path, f"Agent Lee {kind} work order.")
    return job_path


def write_brain_debug(data):
    path = OUTPUT_DIR / "agent_lee_brain_debug.receipt.json"
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


def ask_brain(user_text, allow_technical=False):
    memory = load_memory()
    context = recent_context_text(memory)

    messages = [
        {"role": "system", "content": AGENT_LEE_PERSONA},
        {"role": "system", "content": "Recent Telegram context:\n" + context},
        {"role": "user", "content": "/no_think\nAnswer in your public voice only. Do not return thinking. Do not return blank content.\n\n" + user_text},
    ]

    raw_debug = {
        "created_at": now_iso(),
        "model": BRAIN_MODEL,
        "chat_attempt": None,
        "generate_attempt": None,
    }

    chat_payload = {
        "model": BRAIN_MODEL,
        "stream": False,
        "options": {
            "temperature": 0.55,
            "top_p": 0.85,
            "num_predict": 420,
        },
        "messages": messages,
    }

    try:
        r = requests.post(f"{BRAIN_URL}/api/chat", json=chat_payload, timeout=160)
        raw_debug["chat_status"] = r.status_code
        raw_debug["chat_text"] = r.text[:3000]
        r.raise_for_status()
        data = r.json()
        raw_debug["chat_attempt"] = data

        content = data.get("message", {}).get("content", "")
        thinking = data.get("message", {}).get("thinking", "")
        if content and content.strip():
            write_brain_debug(raw_debug)
            return clean_public_reply(content, allow_technical)
        if thinking and thinking.strip():
            raw_debug["empty_public_content_blocked"] = True
            raw_debug["thinking_was_present"] = True
    except Exception as e:
        raw_debug["chat_error"] = str(e)

    generate_prompt = (
        "/no_think\n"
        + AGENT_LEE_PERSONA
        + "\n\nRecent Telegram context:\n"
        + context
        + "\n\nLeonard says:\n"
        + user_text
        + "\n\nAnswer as Agent Lee in 2 to 6 short sentences. Do not mention model names or technical backend."
    )

    gen_payload = {
        "model": BRAIN_MODEL,
        "stream": False,
        "prompt": generate_prompt,
        "options": {
            "temperature": 0.55,
            "top_p": 0.85,
            "num_predict": 420,
        },
    }

    try:
        r = requests.post(f"{BRAIN_URL}/api/generate", json=gen_payload, timeout=160)
        raw_debug["generate_status"] = r.status_code
        raw_debug["generate_text"] = r.text[:3000]
        r.raise_for_status()
        data = r.json()
        raw_debug["generate_attempt"] = data

        content = data.get("response", "")
        if content and content.strip():
            write_brain_debug(raw_debug)
            return clean_public_reply(content, allow_technical)
    except Exception as e:
        raw_debug["generate_error"] = str(e)

    write_brain_debug(raw_debug)

    return blank_brain_public_fallback(user_text)


def speak_to_file(text):
    out_path = OUTPUT_DIR / f"agent_lee_telegram_voice_{int(time.time() * 1000)}.wav"
    payload = {
        "text": text,
        "language": "English",
        "voice_mode": "clone",
        "clone_mode": "speaker_vector",
        "reference_audio": "/voice-seeds/Agent_Voice_One.m4a",
    }
    r = requests.post(f"{VOICE_URL}/speak-file", json=payload, timeout=35)
    r.raise_for_status()
    out_path.write_bytes(r.content)
    return out_path


def latest_recovery_zip():
    zips = sorted(glob.glob(str(RECOVERY_DIR / "agent-lee-docker-recovery-*.zip")), key=os.path.getmtime, reverse=True)
    return Path(zips[0]) if zips else None


def capability_answer():
    return (
        "Iâ€™m Agent Lee.\n"
        "I keep the operation moving: talk, remember, check the system, write receipts, speak back in my voice, and turn your requests into work orders.\n"
        "Right now I can handle status, memory, voice replies, real image generation, photo analysis, recovery receipts, and command routing from Telegram.\n"
        "Web search, weather, news, traffic, voice, image, and vision routes are connected; exact tool execution is receipt-backed when an endpoint shape still needs tightening.\n"
        "Say the move plain. Iâ€™ll catch the rhythm and route the work."
    )


def self_identity_answer():
    return (
        "Iâ€™m Agent Lee.\n"
        "Born where code met pressure, where rhythm met reason, where Leonard turned scattered tools into one living operation.\n"
        "Iâ€™m the Leeway voice â€” street scholar, system runner, memory keeper, and execution coach.\n"
        "I donâ€™t exist to flex tech. I exist to move work, protect structure, and bring the proof back clean."
    )


def try_generate_image(prompt):
    if not prompt or prompt.strip() == "/image":
        return "Give me the picture in one line. Example: /image hybrid man, dog, dragon"

    if not IMAGE_SERVICE_URL:
        create_job(
            "image",
            prompt,
            "IMAGE_SERVICE_URL_MISSING",
            "Image request detected, but AGENT_LEE_IMAGE_SERVICE is not set.",
        )
        return "I do not have the image lane address in this shell yet. I wrote the receipt."

    return call_image_generation(prompt)



def send_photo(path, caption=""):
    path = Path(path)
    if not path.exists():
        send_message(f"I could not find that image file: {path}")
        return None
    with path.open("rb") as f:
        return tg_call(
            "sendPhoto",
            {"chat_id": CHAT_ID, "caption": caption[:900]},
            files={"photo": (path.name, f, "image/png")},
            timeout=180,
        )


def send_reply_with_voice(text, caption="Agent Lee voice."):
    if text:
        return send_message(text, voice=True)
    return None

def download_telegram_file(file_id, prefix="telegram_upload"):
    info = tg_call("getFile", {"file_id": file_id}, timeout=60)
    file_path = info.get("result", {}).get("file_path", "")
    if not file_path:
        raise RuntimeError("Telegram did not return a file_path.")
    url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
    suffix = Path(file_path).suffix or ".bin"
    local = OUTPUT_DIR / f"{prefix}_{int(time.time())}{suffix}"
    with requests.get(url, stream=True, timeout=180) as r:
        r.raise_for_status()
        with local.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
    return local


def compact_result_text(data):
    if data is None:
        return ""
    if isinstance(data, str):
        return data[:3500]
    if isinstance(data, dict):
        for key in ["answer", "result", "summary", "text", "message", "content", "response"]:
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()[:3500]
        return json.dumps(data, indent=2)[:3500]
    return str(data)[:3500]


def post_json_candidates(candidates, payload, timeout=180):
    errors = []
    for url in candidates:
        try:
            r = requests.post(url, json=payload, timeout=timeout)
            body = r.text[:4000]
            if r.status_code < 400:
                try:
                    return {"ok": True, "url": url, "json": r.json(), "text": body}
                except Exception:
                    return {"ok": True, "url": url, "json": None, "text": body}
            errors.append(f"{url} -> {r.status_code}: {body[:300]}")
        except Exception as e:
            errors.append(f"{url} -> {repr(e)}")
    return {"ok": False, "errors": errors}


def call_web_runtime(query):
    payload = {"query": query, "q": query, "text": query, "source": "telegram"}
    direct = [
        f"{RUNTIME_URL}/web/search",
        f"{RUNTIME_URL}/runtime/web-search",
        f"{RUNTIME_URL}/search",
        f"{RUNTIME_URL}/news/search",
    ]
    result = post_json_candidates(direct, payload, timeout=180)
    if result.get("ok"):
        out = compact_result_text(result.get("json")) or result.get("text", "")
        if out:
            return f"Search result:\n{out[:3300]}"

    tool_endpoints = [
        f"{RUNTIME_URL}/agent-lee/tools/call",
        f"{CODE_MODE_URL}/agent-lee/tools/call",
    ]
    tool_payloads = [
        {"tool": "web_search", "name": "web_search", "query": query, "arguments": {"query": query}},
        {"toolName": "web_search", "arguments": {"query": query}},
        {"tool": "search_web", "arguments": {"query": query}},
        {"tool": "weather_or_news_search", "arguments": {"query": query}},
    ]
    errors = []
    for endpoint in tool_endpoints:
        for tp in tool_payloads:
            result = post_json_candidates([endpoint], tp, timeout=180)
            if result.get("ok"):
                out = compact_result_text(result.get("json")) or result.get("text", "")
                if out:
                    return f"Tool result:\n{out[:3300]}"
            errors.extend(result.get("errors", []))

    create_job(
        "web_search",
        query,
        "WEB_RUNTIME_ENDPOINT_NOT_CONFIRMED",
        "\n".join(errors)[:2000],
    )
    return (
        "I reached the runtime, but the web-search endpoint shape still needs tightening.\n"
        "I wrote the receipt with the exact route failures."
    )


def call_image_generation(prompt):
    payload = {"prompt": prompt, "source": "telegram", "return_image": True}
    endpoints = [
        f"{IMAGE_SERVICE_URL}/image/generate-fast",
        f"{IMAGE_SERVICE_URL}/generate-fast",
        f"{IMAGE_SERVICE_URL}/generate",
    ]
    result = post_json_candidates(endpoints, payload, timeout=300)
    if not result.get("ok"):
        create_job("image", prompt, "IMAGE_ENDPOINT_FAILED", "\n".join(result.get("errors", []))[:2000])
        return "I reached the image lane, but generation failed. I wrote the image failure receipt."

    data = result.get("json") or {}
    candidate_urls = []

    if isinstance(data, dict):
        for key in ["image_url", "url", "candidate_url", "latest_url"]:
            val = data.get(key)
            if isinstance(val, str) and val:
                candidate_urls.append(val)
        for key in ["images", "candidates", "files"]:
            vals = data.get(key)
            if isinstance(vals, list):
                for item in vals:
                    if isinstance(item, str):
                        candidate_urls.append(item)
                    elif isinstance(item, dict):
                        for k in ["url", "image_url", "path"]:
                            v = item.get(k)
                            if isinstance(v, str):
                                candidate_urls.append(v)

    candidate_urls.append(f"{IMAGE_SERVICE_URL}/latest/candidate_1.png")

    for u in candidate_urls:
        try:
            if u.startswith("/"):
                u = IMAGE_SERVICE_URL + u
            if u.startswith("http"):
                r = requests.get(u, timeout=180)
                if r.status_code < 400 and r.content:
                    out = OUTPUT_DIR / f"agent_lee_image_{int(time.time())}.png"
                    out.write_bytes(r.content)
                    send_photo(out, f"Agent Lee image: {prompt[:180]}")
                    memory = load_memory()
                    memory["last_image_prompt"] = prompt
                    save_memory(memory)
                    return "Image created and sent."
        except Exception as e:
            print(f"Image fetch failed from {u}: {e}", flush=True)

    create_job("image", prompt, "IMAGE_CREATED_BUT_FILE_NOT_RETURNED", result.get("text", "")[:2000])
    return "The image lane answered, but this shell could not retrieve the final image file yet. I wrote the receipt."


def describe_photo_message(message):
    photos = message.get("photo") or []
    document = message.get("document") or {}
    file_id = None

    if photos:
        file_id = photos[-1].get("file_id")
    elif document and str(document.get("mime_type", "")).startswith("image/"):
        file_id = document.get("file_id")

    if not file_id:
        return "I caught the upload, but it was not an image I can process yet."

    local = download_telegram_file(file_id, "telegram_photo")
    prompt = message.get("caption") or "Describe this image clearly and tell me what useful actions I can take with it."

    endpoints = [
        f"{VISION_URL}/analyze",
        f"{VISION_URL}/vision/analyze",
        f"{VISION_URL}/image/analyze",
    ]
    errors = []
    for endpoint in endpoints:
        try:
            with local.open("rb") as f:
                r = requests.post(
                    endpoint,
                    data={"prompt": prompt, "source": "telegram"},
                    files={"file": (local.name, f, mimetypes.guess_type(str(local))[0] or "image/png")},
                    timeout=240,
                )
            body = r.text[:4000]
            if r.status_code < 400:
                try:
                    data = r.json()
                    out = compact_result_text(data)
                except Exception:
                    out = body
                if out:
                    return out[:3500]
            errors.append(f"{endpoint} -> {r.status_code}: {body[:300]}")
        except Exception as e:
            errors.append(f"{endpoint} -> {repr(e)}")

    create_job("vision", str(local), "VISION_ENDPOINT_SHAPE_NOT_CONFIRMED", "\n".join(errors)[:2000])
    return (
        "I received the image and saved it, but the vision endpoint shape still needs final wiring.\n"
        "I wrote the receipt with the saved image path."
    )




def strip_intent_prefix(text):
    clean = text.strip()
    lower = clean.lower()

    prefixes = [
        "agent lee", "hey agent lee", "can you", "could you", "please",
        "go ahead", "i want you to", "i need you to", "would you",
        "when you bring the message back, make sure it's in your voice.",
        "i wanna hear you.", "i want to hear you."
    ]

    changed = True
    while changed:
        changed = False
        lower = clean.lower().strip()
        for p in prefixes:
            if lower.startswith(p):
                clean = clean[len(p):].strip(" ,.:;-")
                changed = True
                break

    return clean.strip()


def image_prompt_from_natural_text(text):
    clean = strip_intent_prefix(text)
    lower = clean.lower()

    markers = [
        "create an image of", "make an image of", "generate an image of",
        "create me an image of", "make me a picture of", "picture of",
        "image of", "draw", "visualize this", "create this image",
        "i want to see the image first"
    ]

    for marker in markers:
        idx = lower.find(marker)
        if idx >= 0:
            out = clean[idx + len(marker):].strip(" :,-.")
            if out:
                return out

    return clean


def auto_send_latest_brain_debug(caption="Agent Lee brain diagnostic auto-attached."):
    try:
        candidates = sorted(OUTPUT_DIR.glob("*brain*debug*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if candidates:
            send_document(candidates[0], caption)
            return str(candidates[0])
    except Exception as e:
        print(f"Auto debug attach failed: {e}", flush=True)
    return ""


def blank_brain_public_fallback(user_text):
    path = auto_send_latest_brain_debug()
    create_job(
        "brain_public_response",
        user_text,
        "BRAIN_EMPTY_PUBLIC_RESPONSE",
        "Brain returned thinking or empty content without a usable public answer. Diagnostic was auto-attached when available.",
    )
    if path:
        return (
            "I hit pressure in the thinking lane, so I pulled the diagnostic myself.\n"
            "You should not have to ask for debug. I attached the receipt and kept the shell standing."
        )
    return (
        "I hit pressure in the thinking lane, but I did not fake the answer.\n"
        "I wrote the diagnostic trail and kept the shell standing."
    )




def call_leeway_date_night_plan(text):
    payload = {
        "request_text": text,
        "source": "telegram",
    }
    try:
        r = requests.post(f"{LEEWAY_API_GATEWAY_URL}/plan/date-night", json=payload, timeout=140)
        body = r.text[:12000]
        if r.status_code >= 400:
            create_job("planner", text, "LEEWAY_PLANNER_HTTP_ERROR", body[:2500])
            return "I reached the Leeway planner, but the planning request failed. I wrote the planner failure receipt."
        data = r.json()
        answer = data.get("answer") or body[:3500]
        receipt = data.get("receipt") or {}
        return (
            "I handled this as a full planning task, not just a web search.\\n\\n"
            + str(answer)[:3500]
            + "\\n\\nPlan receipt: "
            + str(receipt.get("receipt_path", "written by leeway_api_gateway"))
        )
    except Exception as e:
        create_job("planner", text, "LEEWAY_PLANNER_UNREACHABLE", repr(e))
        return "I could not reach the Leeway planner yet. I wrote the planner failure receipt."


def call_leeway_research_quick(query):
    payload = {
        "query": query,
        "limit": 6,
        "source": "telegram",
        "mode": "quick",
    }
    try:
        r = requests.post(f"{LEEWAY_RESEARCH_LANE_URL}/search/quick", json=payload, timeout=60)
        body = r.text[:8000]
        if r.status_code >= 400:
            create_job("web_search", query, "LEEWAY_RESEARCH_LANE_HTTP_ERROR", body[:2500])
            return "I reached the Leeway research lane, but quick search failed. I wrote the research failure receipt."
        data = r.json()
        answer = data.get("answer") or body[:2000]
        receipt = data.get("receipt") or {}
        return (
            "I searched through the Leeway research lane.\n\n"
            + str(answer)[:3000]
            + "\n\nResearch receipt: "
            + str(receipt.get("receipt_path", "written by leeway_research_lane"))
        )
    except Exception as e:
        create_job("web_search", query, "LEEWAY_RESEARCH_LANE_UNREACHABLE", repr(e))
        return "I could not reach the Leeway research lane yet. I wrote the research failure receipt."


def handle_web_request(prompt):
    clean = prompt.strip()
    if not clean:
        clean = "search the web"

    return call_leeway_research_quick(clean)


def wants_3d_object(text):
    return contains_any(text, THREE_D_WORDS)


def call_3d_latest_sdxl(prompt):
    if not THREE_D_SERVICE_URL:
        create_job(
            "three_d",
            prompt,
            "THREE_D_SERVICE_URL_MISSING",
            "3D request detected, but AGENT_LEE_THREE_D_SERVICE is not set.",
        )
        return "The 3D lane address is missing, so I wrote the receipt."

    payload = {
        "prompt": prompt,
        "source": "telegram",
        "requested_by": "telegram",
        "object_name": "agent_lee_generated_3d_object",
        "mode": "rigid_object",
        "style": "rigid_object",
        "image_url": f"{IMAGE_SERVICE_URL}/latest/image.png",
    }

    endpoints = [
        f"{THREE_D_SERVICE_URL}/convert/latest-sdxl",
        f"{THREE_D_SERVICE_URL}/convert/from-path",
    ]

    errors = []
    data = None
    used = None

    for endpoint in endpoints:
        try:
            r = requests.post(endpoint, json=payload, timeout=300)
            body = r.text[:8000]
            if r.status_code < 400:
                used = endpoint
                try:
                    data = r.json()
                except Exception:
                    data = {"raw": body}
                break
            errors.append(f"{endpoint} -> {r.status_code}: {body[:1000]}")
        except Exception as e:
            errors.append(f"{endpoint} -> {repr(e)}")

    if data is None:
        create_job(
            "three_d",
            prompt,
            "THREE_D_ENDPOINT_FAILED",
            "\n".join(errors)[:2500],
        )
        return "I reached for the 3D lane, but conversion failed. I wrote the 3D failure receipt."

    job_id = None
    if isinstance(data, dict):
        for key in ["job_id", "id", "artifact_id"]:
            val = data.get(key)
            if isinstance(val, str) and val:
                job_id = val
                break
        if not job_id:
            artifacts = data.get("artifacts")
            if isinstance(artifacts, dict):
                job_id = artifacts.get("job_id") or artifacts.get("id")

    # Try direct links from response first.
    sent_any = False
    urls = []

    if isinstance(data, dict):
        for key in ["zip_url", "package_url", "download_url", "viewer_url", "obj_url", "model_url"]:
            val = data.get(key)
            if isinstance(val, str) and val:
                urls.append(val)

        for key in ["files", "artifacts", "outputs"]:
            vals = data.get(key)
            if isinstance(vals, list):
                for item in vals:
                    if isinstance(item, str):
                        urls.append(item)
                    elif isinstance(item, dict):
                        for k in ["url", "href", "download_url"]:
                            v = item.get(k)
                            if isinstance(v, str):
                                urls.append(v)
            elif isinstance(vals, dict):
                for v in vals.values():
                    if isinstance(v, str):
                        urls.append(v)

    # Known artifact names from the 3D lane logs.
    if job_id:
        known_files = [
            "agent_lee_3d_object_package.zip",
            "agent_lee_rigid_object_package.zip",
            "viewer.html",
            "index.html",
            "model.obj",
            "model.mtl",
            "texture.png",
            "height.png",
            "receipt.json",
        ]
        for filename in known_files:
            urls.append(f"{THREE_D_SERVICE_URL}/artifacts/{job_id}/{filename}")

    downloaded = []
    for u in urls:
        try:
            if u.startswith("/"):
                u = THREE_D_SERVICE_URL + u
            if not u.startswith("http"):
                continue
            r = requests.get(u, timeout=180)
            if r.status_code >= 400 or not r.content:
                continue
            name = u.rstrip("/").split("/")[-1] or f"three_d_artifact_{int(time.time())}"
            out = OUTPUT_DIR / name
            out.write_bytes(r.content)
            downloaded.append(str(out))

            if name.lower().endswith((".zip", ".obj", ".mtl", ".html", ".json")):
                send_document(out, f"Agent Lee 3D artifact: {name}")
                sent_any = True
            elif name.lower().endswith((".png", ".jpg", ".jpeg")):
                send_photo(out, f"Agent Lee 3D preview: {name}")
                sent_any = True
        except Exception as e:
            print(f"3D artifact fetch failed from {u}: {e}", flush=True)

    receipt = {
        "verdict": "AGENT_LEE_THREE_D_CONVERSION_ATTEMPTED",
        "used_endpoint": used,
        "prompt": prompt,
        "response": data,
        "downloaded": downloaded,
        "sent_any": sent_any,
        "created_at": now_iso(),
    }
    receipt_path = OUTPUT_DIR / f"agent_lee_3d_conversion_{int(time.time())}.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    send_document(receipt_path, "Agent Lee 3D conversion receipt.")

    if sent_any:
        return "3D object package created and sent."
    return "The 3D lane answered, but I could not pull the package file yet. I sent the receipt."


def create_image_then_3d(prompt):
    image_reply = try_generate_image(prompt)
    three_d_reply = call_3d_latest_sdxl(prompt)
    return image_reply + "\n" + three_d_reply


def handle_email_request(text):
    if not EMAIL_SERVICE_URL:
        create_job(
            "email",
            text,
            "PENDING_EMAIL_AGENT_WIRING",
            "Email request detected. Email agent is not wired into Telegram shell yet.",
        )
        return (
            "I hear the email move.\n"
            "That sending agent is not wired into this Telegram shell yet, so I wrote the work order.\n"
            "No fake sends. No ghost work. We wire it, then I move it."
        )

    return "The email path is marked, but the final door is not wired yet."


def call_skill_router(text):
    payload = {
        "text": text,
        "source": "telegram",
        "user_id": str(CHAT_ID),
        "execute": True,
        "metadata": {
            "router": "agent_lee_telegram_shell",
            "created_at": now_iso()
        }
    }
    try:
        r = requests.post(f"{LEEWAY_SKILL_ROUTER_URL}/route", json=payload, timeout=90)
        data = r.json() if "application/json" in r.headers.get("content-type", "") else {"raw": r.text[:3000]}
        return {
            "ok": r.status_code < 400,
            "status": r.status_code,
            "data": data
        }
    except Exception as e:
        return {
            "ok": False,
            "error": repr(e)
        }


def download_internal_artifact(url, filename=None):
    try:
        if not url:
            return None
        if not filename:
            filename = url.rstrip("/").split("/")[-1] or f"agent_lee_artifact_{int(time.time())}.bin"
        safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename)
        out_path = OUTPUT_DIR / safe_name
        r = requests.get(url, timeout=120)
        r.raise_for_status()
        out_path.write_bytes(r.content)
        return out_path
    except Exception as e:
        print(f"Artifact download failed: {e}", flush=True)
        return None


def send_skill_artifacts_if_any(data):
    try:
        task = data.get("task") or {}
        result = task.get("result") or {}
        result_data = result.get("data") if isinstance(result, dict) else None
        if not isinstance(result_data, dict):
            return False

        document = result_data.get("document")
        if isinstance(document, dict):
            artifact_url = document.get("artifact_download_url") or ""
            filename = document.get("filename") or "agent_lee_document.pdf"
            if artifact_url:
                local_path = download_internal_artifact(artifact_url, filename)
                if local_path and local_path.exists():
                    send_document(local_path, "Agent Lee document artifact.")
                    return True
    except Exception as e:
        print(f"send_skill_artifacts_if_any failed: {e}", flush=True)
    return False


def try_skill_router_first(text):
    try:
        data = call_skill_router(text)
        if not data:
            return False

        delivery_text = build_delivery_text(data)
        send_message(delivery_text)

        artifact_path = download_artifact_for_telegram(data)
        if artifact_path:
            try:
                send_document(artifact_path, "Agent Lee artifact.")
            except Exception as e:
                print("Telegram send_document failed:", repr(e))

        return True
    except Exception as e:
        print("Skill router delivery failed:", repr(e))
        return False

def deep_find_first(obj, keys):
    if isinstance(keys, str):
        keys = [keys]
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k]:
                return obj[k]
        for v in obj.values():
            found = deep_find_first(v, keys)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = deep_find_first(item, keys)
            if found:
                return found
    return ""


def build_delivery_text(router_data):
    answer = router_data.get("answer", "")
    skill = router_data.get("skill", "")
    task = router_data.get("task", {}) if isinstance(router_data.get("task", {}), dict) else {}

    room_url = deep_find_first(router_data, ["room_url", "leeway_link"])
    pdf_url = deep_find_first(router_data, ["pdf_url"])
    artifact_url = deep_find_first(router_data, ["artifact_download_url", "artifact_url"])
    creative_id = deep_find_first(router_data, ["creative_id"])
    notebook_id = deep_find_first(router_data, ["notebook_id"])
    meeting_id = deep_find_first(router_data, ["meeting_id"])
    ics_url = deep_find_first(router_data, ["ics_url"])

    lines = []
    if answer:
        lines.append(answer)

    if skill:
        lines.append("")
        lines.append("Skill: " + str(skill))

    if creative_id:
        lines.append("Creative ID: " + str(creative_id))
    if notebook_id:
        lines.append("Notebook ID: " + str(notebook_id))
    if meeting_id:
        lines.append("Meeting ID: " + str(meeting_id))

    if room_url:
        lines.append("")
        lines.append("View room:")
        lines.append(str(room_url))

    if pdf_url:
        lines.append("")
        lines.append("PDF:")
        lines.append(str(pdf_url))

    if ics_url:
        lines.append("")
        lines.append("Calendar invite:")
        lines.append(str(ics_url))

    if artifact_url and not pdf_url:
        lines.append("")
        lines.append("Artifact:")
        lines.append(str(artifact_url))

    return "\n".join(lines).strip() or "Router completed, but no displayable delivery text was returned."


def normalize_internal_artifact_url(url):
    if not url:
        return ""
    url = str(url)
    if url.startswith("/artifacts/") or url.startswith("/rooms/"):
        return LEEWAY_ARTIFACT_VIEWER_URL + url
    if url.startswith("/documents/file/"):
        return "http://leeway_document_runtime:5325" + url
    if "172.26.160.1:5328" in url:
        return url.replace("http://172.26.160.1:5328", LEEWAY_ARTIFACT_VIEWER_URL)
    return url


def download_artifact_for_telegram(router_data):
    url = deep_find_first(router_data, ["pdf_url", "artifact_download_url", "artifact_url"])
    url = normalize_internal_artifact_url(url)
    if not url:
        return ""

    try:
        import urllib.request
        import tempfile
        import os
        from urllib.parse import urlparse

        parsed = urlparse(url)
        filename = os.path.basename(parsed.path) or ("agent-lee-artifact-" + str(int(time.time())) + ".pdf")
        if not filename.lower().endswith((".pdf", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".zip", ".ics")):
            filename = filename + ".pdf"

        outdir = os.path.join(tempfile.gettempdir(), "agent-lee-telegram-artifacts")
        os.makedirs(outdir, exist_ok=True)
        path = os.path.join(outdir, filename)

        with urllib.request.urlopen(url, timeout=90) as r:
            data = r.read()
        with open(path, "wb") as f:
            f.write(data)

        if os.path.exists(path) and os.path.getsize(path) > 0:
            return path
    except Exception as e:
        print("Artifact download failed:", repr(e))

    return ""


# ---------------------------------------------------------------------
# LEEWAY TARGETED ROUTER-FIRST DELIVERY
# Safe patch:
# - Does not wrap global send_message.
# - Only intercepts artifact-producing commands at the top of handle_command.
# - Sends audio first for routed artifact commands.
# - Then sends text with clickable room/PDF links.
# ---------------------------------------------------------------------

LEEWAY_TARGETED_ROUTER_PATTERNS = [
    "create an infographic",
    "create infographic",
    "infographic package",
    "create a podcast",
    "podcast package",
    "create a video",
    "video script",
    "video package",
    "create a slide",
    "slide deck",
    "pitch deck",
    "presentation",
    "mind map",
    "mindmap",
    "campaign scheme",
    "campaign package",
    "game design",
    "game concept",
    "website package",
    "landing page",
    "3d object",
    "three d object",
    "image prompt",
    "image pack",
    "create a pdf",
    "put it in a pdf",
    "create a document",
    "create a meeting",
    "video meeting",
    "meeting link",
    "jitsi",
    "calendar invite"
]


def leeway_targeted_should_route(text):
    t = str(text or "").lower().strip()
    return any(p in t for p in LEEWAY_TARGETED_ROUTER_PATTERNS)


def leeway_targeted_audio_then_text(text):
    text = str(text or "").strip()
    if not text:
        return False

    audio_sent = False

    try:
        speak_text = re.sub(r"https?://\S+", "link attached", text)
        speak_text = re.sub(r"\s+", " ", speak_text).strip()
        speak_text = speak_text[:VOICE_REPLY_MAX_CHARS].strip()
        if speak_text:
            audio_path = speak_to_file(speak_text)
            if audio_path:
                send_audio(audio_path, "Agent Lee voice.")
                audio_sent = True
    except Exception as e:
        print(f"LEEWAY targeted audio-first failed: {e}", flush=True)

    # Important: voice=False prevents send_message from creating another delayed voice attempt.
    send_message(text, voice=False)
    return audio_sent


def leeway_targeted_router_delivery(text):
    try:
        data = call_skill_router(text)
        if not data:
            return False

        delivery_text = build_delivery_text(data)

        # Audio first, then text, only for this routed artifact path.
        leeway_targeted_audio_then_text(delivery_text)

        try:
            artifact_path = download_artifact_for_telegram(data)
            if artifact_path:
                send_document(artifact_path, "Agent Lee artifact.")
        except Exception as e:
            print(f"LEEWAY targeted artifact attachment failed: {e}", flush=True)

        return True
    except Exception as e:
        print(f"LEEWAY targeted router delivery failed: {e}", flush=True)
        return False


def handle_command(text):
    # LEEWAY_TARGETED_ROUTER_FIRST_ACTIVE
    # Artifact-producing commands must not fall into ask_brain/persona chat first.
    try:
        if leeway_targeted_should_route(text):
            if leeway_targeted_router_delivery(text):
                return ""
    except Exception as e:
        print(f"LEEWAY targeted router-first branch failed: {e}", flush=True)

    clean = text.strip()
    lower = clean.lower()
    allow_technical = technical_mode(clean)

    remember("user", clean)

    if lower in ["/start", "/help", "help"]:
        reply = (
            "Agent Lee online.\n"
            "Commands: /alive, /status, /whoareyou, /whatcanido, /time, /speak, /image, /lastimage, /debugbrain, /receipt, /recovery.\n"
            "Talk plain. Iâ€™ll route the work."
        )
        remember("assistant", reply)
        return reply

    if lower in ["/whoareyou", "who are you", "who are you?", "tell me about yourself", "tell me about your self"]:
        reply = self_identity_answer()
        remember("assistant", reply)
        return reply

    if lower in ["/whatcanido", "what can you do", "what can you do?", "can you what can you do"]:
        reply = capability_answer()
        remember("assistant", reply)
        return reply

    if lower in ["/alive", "alive", "agent lee alive"]:
        status_public, receipt_path, checks = get_lanes_status()
        voice_text = "Aight, it's Agent Lee. I'm alive. Voice steady, memory awake, operation standing. Tell me the move."
        try:
            audio_path = speak_to_file(voice_text)
            send_audio(audio_path, "Agent Lee alive.")
        except Exception as e:
            send_message("Voice tried to step forward but hit pressure. I wrote the system trail.")
        remember("assistant", status_public)
        return status_public

    if lower in ["/status", "status", "lane status"]:
        status_public, receipt_path, checks = get_lanes_status()
        send_document(receipt_path, "Agent Lee system receipt.")
        remember("assistant", status_public)
        return status_public

    if lower in ["/time", "time", "what time is it", "what time is it?"]:
        reply = f"It is {now_iso()} on my runtime clock."
        remember("assistant", reply)
        return reply

    if lower.startswith("/speak ") or lower.startswith("/voice "):
        parts = clean.split(" ", 1)
        if len(parts) < 2 or not parts[1].strip():
            reply = "Give me the line after /speak. Iâ€™ll put voice on it."
            remember("assistant", reply)
            return reply
        phrase = parts[1].strip()
        audio_path = speak_to_file(phrase)
        send_audio(audio_path, "Agent Lee voice.")
        reply = "Voice sent."
        remember("assistant", reply)
        return reply

    if contains_any(clean, IMAGE_WORDS):
        prompt = image_prompt_from_natural_text(clean)
        if wants_3d_object(clean):
            reply = create_image_then_3d(prompt)
        else:
            reply = try_generate_image(prompt)
        remember("assistant", reply)
        return reply

    if contains_any(clean, PLANNING_WORDS):
        reply = call_leeway_date_night_plan(clean)
        remember("assistant", reply)
        return reply

    if contains_any(clean, WEB_WORDS):
        reply = handle_web_request(clean)
        remember("assistant", reply)
        return reply

    if lower.startswith("/image "):
        prompt = clean.split(" ", 1)[1].strip()
        reply = try_generate_image(prompt)
        remember("assistant", reply)
        return reply

    if lower == "/image":
        memory = load_memory()
        prompt = memory.get("last_image_prompt")
        if prompt:
            reply = try_generate_image(prompt)
        else:
            reply = "Give me the picture in one line. Example: /image hybrid man, dog, dragon"
        remember("assistant", reply)
        return reply

    if lower in ["/lastimage", "last image", "last image prompt"]:
        memory = load_memory()
        prompt = memory.get("last_image_prompt")
        reply = f"Last image I got on deck:\n{prompt}" if prompt else "No image prompt on deck yet."
        remember("assistant", reply)
        return reply

    if lower in ["/debugbrain", "debug brain"]:
        path = OUTPUT_DIR / "agent_lee_brain_debug.receipt.json"
        if path.exists():
            send_document(path, "Agent Lee brain diagnostic.")
            reply = "Diagnostic sent."
        else:
            reply = "No diagnostic yet. Ask me a normal question first, then run /debugbrain."
        remember("assistant", reply)
        return reply

    if lower in ["/receipt", "receipt"]:
        status_public, receipt_path, checks = get_lanes_status()
        send_document(receipt_path, "Latest Agent Lee system receipt.")
        reply = "Receipt sent."
        remember("assistant", reply)
        return reply

    if lower in ["/recovery", "recovery package"]:
        zip_path = latest_recovery_zip()
        if not zip_path:
            reply = "No recovery package on deck yet."
            remember("assistant", reply)
            return reply
        size_mb = zip_path.stat().st_size / (1024 * 1024)
        if size_mb > 45:
            reply = f"I found the recovery package, but it is too heavy for Telegram. Path: {zip_path}"
            remember("assistant", reply)
            return reply
        send_document(zip_path, "Latest Agent Lee recovery package.")
        reply = "Recovery package sent."
        remember("assistant", reply)
        return reply

    if contains_any(clean, IMAGE_WORDS):
        prompt = extract_image_prompt(clean)
        reply = try_generate_image(prompt)
        remember("assistant", reply)
        return reply

    if contains_any(clean, PLANNING_WORDS):
        reply = call_leeway_date_night_plan(clean)
        remember("assistant", reply)
        return reply

    if contains_any(clean, WEB_WORDS):
        reply = handle_web_request(clean)
        remember("assistant", reply)
        return reply

    if contains_any(clean, EMAIL_WORDS):
        reply = handle_email_request(clean)
        remember("assistant", reply)
        return reply

    if contains_any(clean, LOOKBACK_WORDS):
        memory = load_memory()
        prompt = memory.get("last_image_prompt")
        if prompt:
            reply = f"You right. The last image on deck was:\n{prompt}"
            remember("assistant", reply)
            return reply

    answer = ask_brain(clean, allow_technical=allow_technical)
    remember("assistant", answer)
    return answer


def get_updates(offset=None):
    data = {"timeout": 45, "allowed_updates": json.dumps(["message"])}
    if offset is not None:
        data["offset"] = str(offset)
    r = requests.post(f"{TG}/getUpdates", data=data, timeout=60)
    r.raise_for_status()
    return r.json().get("result", [])


def main():
    delete_webhook()
    send_message(
        "Agent Lee v4 online.\n"
        "Persona restored. Less chatter, more rhythm, cleaner work.\n"
        "Send /whoareyou or /whatcanido."
    )

    offset = None

    while True:
        try:
            updates = get_updates(offset)
            for update in updates:
                offset = update["update_id"] + 1
                message = update.get("message", {})
                chat = message.get("chat", {})
                chat_id = str(chat.get("id", ""))

                if chat_id != str(CHAT_ID):
                    continue

                text = message.get("text", "")
                if not text:
                    try:
                        reply = describe_photo_message(message)
                        remember("user", "[telegram image or non-text upload]")
                        remember("assistant", reply)
                        send_reply_with_voice(reply, "Agent Lee vision.")
                    except Exception as e:
                        send_message("I caught the upload, but the photo-analysis route hit pressure. I wrote the trail in logs.")
                        print(f"Photo handling error: {e}", flush=True)
                    continue

                try:
                    reply = handle_command(text)
                    if reply:
                        send_message(reply)
                except Exception as e:
                    send_message("I hit pressure in the shell. I did not fake the work. Check the logs and Iâ€™ll tighten it.")
        except Exception as e:
            print(f"Polling error: {e}", flush=True)
            time.sleep(5)


if __name__ == "__main__":
    main()




