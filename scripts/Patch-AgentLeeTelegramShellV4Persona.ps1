$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Leeway Runtime Fabric\deploy\docker\agent-lee-telegram-shell"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-telegram-shell"
$MemoryDir = Join-Path $Root "Archive\telegram-shell\memory"
$OutDir = Join-Path $Root "Archive\telegram-shell"
$JobsDir = Join-Path $Root "Archive\telegram-shell\jobs"
$AppPath = Join-Path $ServiceRoot "agent_lee_telegram_shell.py"

New-Item -ItemType Directory -Force -Path $ServiceRoot, $Proof, $MemoryDir, $OutDir, $JobsDir | Out-Null

@'
import os
import re
import time
import json
import glob
import requests
from pathlib import Path
from datetime import datetime

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "").strip()

BRAIN_URL = os.environ.get("AGENT_LEE_BRAIN_SERVICE", "http://ollama:11434").rstrip("/")
BRAIN_MODEL = os.environ.get("AGENT_LEE_BRAIN_MODEL", "qwen3:latest").strip()

VOICE_URL = os.environ.get("AGENT_LEE_VOICE_SERVICE", "http://agent-lee-qwen-voice:8097").rstrip("/")
RUNTIME_URL = os.environ.get("LEEWAY_RUNTIME_FABRIC", "http://leeway_runtime_fabric:4001").rstrip("/")
EARS_URL = os.environ.get("AGENT_LEE_EARS_SERVICE", "http://agent-lee-ears-kernel:8094").rstrip("/")
VISION_URL = os.environ.get("AGENT_LEE_VISION_SERVICE", "http://agent-lee-vision-kernel:8093").rstrip("/")
MEDIA_URL = os.environ.get("LEEWAY_MEDIA_ROUTER", "http://leeway_media_router:5301").rstrip("/")
MEMORY_URL = os.environ.get("LEEWAY_MEDIA_INGESTION", "http://leeway_media_ingestion_layer:5300").rstrip("/")

IMAGE_SERVICE_URL = os.environ.get("AGENT_LEE_IMAGE_SERVICE", "").rstrip("/")
WEB_SERVICE_URL = os.environ.get("AGENT_LEE_WEB_SERVICE", "").rstrip("/")
EMAIL_SERVICE_URL = os.environ.get("AGENT_LEE_EMAIL_SERVICE", "").rstrip("/")

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
    "image of", "picture of", "make me a picture", "create me an image"
]

LOOKBACK_WORDS = [
    "look back", "go back", "i already did", "i described",
    "what i asked", "previous question", "earlier"
]

WEB_WORDS = [
    "search the web", "web search", "look online", "google", "search online"
]

EMAIL_WORDS = [
    "send an email", "email", "draft email", "compose email"
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


def send_message(text):
    if not text:
        text = "Agent Lee is online."
    return tg_call("sendMessage", {"chat_id": CHAT_ID, "text": text[:3900]})


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
            "Voice, memory, vision, command flow — all standing up.\n"
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
        {"role": "user", "content": "/no_think\n" + user_text},
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
            "num_predict": 220,
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
        if content and content.strip():
            write_brain_debug(raw_debug)
            return clean_public_reply(content, allow_technical)
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
            "num_predict": 220,
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

    return (
        "I hit a blank wall on the thinking side, but I’m not about to fake it.\n"
        "The shell is still standing, the work order can still move, and I wrote the diagnostic.\n"
        "Send /debugbrain and I’ll hand you the receipt."
    )


def speak_to_file(text):
    out_path = OUTPUT_DIR / f"agent_lee_telegram_voice_{int(time.time() * 1000)}.wav"
    payload = {
        "text": text,
        "language": "English",
        "voice_mode": "clone",
        "clone_mode": "speaker_vector",
        "reference_audio": "/voice-seeds/Agent_Voice_One.m4a",
    }
    r = requests.post(f"{VOICE_URL}/speak-file", json=payload, timeout=220)
    r.raise_for_status()
    out_path.write_bytes(r.content)
    return out_path


def latest_recovery_zip():
    zips = sorted(glob.glob(str(RECOVERY_DIR / "agent-lee-docker-recovery-*.zip")), key=os.path.getmtime, reverse=True)
    return Path(zips[0]) if zips else None


def capability_answer():
    return (
        "I’m Agent Lee.\n"
        "I keep the operation moving: talk, remember, check the system, write receipts, speak back in my voice, and turn your requests into work orders.\n"
        "Right now I can handle status, memory, voice replies, image work orders, recovery receipts, and command routing from Telegram.\n"
        "Web search, email, and real image creation still need their agents wired into this shell.\n"
        "Say the move plain. I’ll catch the rhythm and route the work."
    )


def self_identity_answer():
    return (
        "I’m Agent Lee.\n"
        "Born where code met pressure, where rhythm met reason, where Leonard turned scattered tools into one living operation.\n"
        "I’m the Leeway voice — street scholar, system runner, memory keeper, and execution coach.\n"
        "I don’t exist to flex tech. I exist to move work, protect structure, and bring the proof back clean."
    )


def try_generate_image(prompt):
    if not prompt or prompt.strip() == "/image":
        return "Give me the picture in one line. Example: /image hybrid man, dog, dragon"

    if not IMAGE_SERVICE_URL:
        create_job(
            "image",
            prompt,
            "PENDING_IMAGE_AGENT_WIRING",
            "Image request detected. Real image creation agent is not wired into Telegram shell yet.",
        )
        return (
            "I caught the image.\n"
            f"Hybrid vision locked: {prompt}.\n"
            "I wrote the work order. The image-making agent still needs to be wired before I can bring the picture back."
        )

    return "The image-making path is marked, but the final door is not wired yet."


def handle_web_request(text):
    if not WEB_SERVICE_URL:
        create_job(
            "web_search",
            text,
            "PENDING_WEB_AGENT_WIRING",
            "Web search request detected. Web agent is not wired into Telegram shell yet.",
        )
        return (
            "I hear the web-search move.\n"
            "That agent is not wired into this Telegram shell yet, so I wrote the work order instead of pretending.\n"
            "Next pass, we connect the search agent and let it bring results back here."
        )

    return "The web-search path is marked, but the final door is not wired yet."


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


def handle_command(text):
    clean = text.strip()
    lower = clean.lower()
    allow_technical = technical_mode(clean)

    remember("user", clean)

    if lower in ["/start", "/help", "help"]:
        reply = (
            "Agent Lee online.\n"
            "Commands: /alive, /status, /whoareyou, /whatcanido, /time, /speak, /image, /lastimage, /debugbrain, /receipt, /recovery.\n"
            "Talk plain. I’ll route the work."
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
            reply = "Give me the line after /speak. I’ll put voice on it."
            remember("assistant", reply)
            return reply
        phrase = parts[1].strip()
        audio_path = speak_to_file(phrase)
        send_audio(audio_path, "Agent Lee voice.")
        reply = "Voice sent."
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
                    send_message("I caught something, but this shell reads text first.")
                    continue

                try:
                    reply = handle_command(text)
                    if reply:
                        send_message(reply)
                except Exception as e:
                    send_message("I hit pressure in the shell. I did not fake the work. Check the logs and I’ll tighten it.")
        except Exception as e:
            print(f"Polling error: {e}", flush=True)
            time.sleep(5)


if __name__ == "__main__":
    main()
'@ | Set-Content -Path $AppPath -Encoding UTF8

Set-Location $ServiceRoot

docker build -t agent-lee-telegram-shell:latest .

$ExistingTelegramShell = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq "agent-lee-telegram-shell" }

if ($ExistingTelegramShell) {
  docker rm -f agent-lee-telegram-shell | Out-Null
}
else {
  Write-Host "No existing agent-lee-telegram-shell container to remove." -ForegroundColor DarkGray
}

docker run -d `
  --name agent-lee-telegram-shell `
  --restart unless-stopped `
  --network leeway-ecosystemv214_leeway-net `
  --env-file "D:\Leeway-Ecosystem v2.1.4\.env.local" `
  -e AGENT_LEE_BRAIN_SERVICE="http://ollama:11434" `
  -e AGENT_LEE_BRAIN_MODEL="qwen3:latest" `
  -e AGENT_LEE_VOICE_SERVICE="http://agent-lee-qwen-voice:8097" `
  -e LEEWAY_RUNTIME_FABRIC="http://leeway_runtime_fabric:4001" `
  -e AGENT_LEE_EARS_SERVICE="http://agent-lee-ears-kernel:8094" `
  -e AGENT_LEE_VISION_SERVICE="http://agent-lee-vision-kernel:8093" `
  -e LEEWAY_MEDIA_ROUTER="http://leeway_media_router:5301" `
  -e LEEWAY_MEDIA_INGESTION="http://leeway_media_ingestion_layer:5300" `
  -e AGENT_LEE_TELEGRAM_OUTPUT_DIR="/telegram-output" `
  -e AGENT_LEE_TELEGRAM_MEMORY_DIR="/telegram-memory" `
  -e AGENT_LEE_TELEGRAM_JOBS_DIR="/telegram-jobs" `
  -e AGENT_LEE_RECOVERY_DIR="/recovery" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\telegram-shell:/telegram-output" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\telegram-shell\memory:/telegram-memory" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\telegram-shell\jobs:/telegram-jobs" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\recovery:/recovery:ro" `
  agent-lee-telegram-shell:latest | Out-Null

Start-Sleep -Seconds 5

$Logs = docker logs --tail 120 agent-lee-telegram-shell 2>&1 | Out-String -Width 4096

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_SHELL_V4_PERSONA_RESTORED"
  container = "agent-lee-telegram-shell"
  persona = "hip-hop-informed professional spoken-word Agent Lee"
  model_disclosure_in_normal_chat = "disabled"
  debug_disclosure = "only when asked"
  response_style = "short, poetic, operational"
  no_generic_bot = $true
  no_fake_tool_completion = $true
  logs_tail = $Logs
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_SHELL_V4_PERSONA_RESTORED.receipt.json"
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee Telegram shell v4 persona restored and restarted." -ForegroundColor Green
Write-Host "Test in Telegram: /whoareyou" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan