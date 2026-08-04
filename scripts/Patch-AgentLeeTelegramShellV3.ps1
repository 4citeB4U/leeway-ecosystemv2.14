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
IMAGE_SERVICE_URL = os.environ.get("AGENT_LEE_IMAGE_SERVICE", "").rstrip("")
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

SYSTEM_PROMPT = """
You are Agent Lee, Leonard's Leeway runtime assistant.

You are not a loose chatbot. You are an agent shell connected to the Leeway Docker runtime.

Rules:
- Use only the recent Telegram context provided.
- Do not invent previous prompts.
- Do not claim tools ran unless the Telegram shell actually ran them.
- Keep answers short, direct, and operational.
- The agents control workflows. Qwen is the reasoning engine, not the whole system.
- If a tool lane is not wired, say it needs wiring and create a receipt/job when possible.
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


def now_iso():
    return datetime.now().astimezone().isoformat()


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

    lines = ["Agent Lee lane status:"]
    for key, item in checks.items():
        mark = "PASS" if item.get("ok") else "FAIL"
        lines.append(f"- {key}: {mark}")

    receipt = {"verdict": "AGENT_LEE_TELEGRAM_LANE_STATUS", "checks": checks, "created_at": now_iso()}
    receipt_path = OUTPUT_DIR / "agent_lee_telegram_lane_status.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    return "\n".join(lines), receipt_path, checks


def create_job(kind, prompt, status="PENDING_LANE_WIRING", note=""):
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

    send_document(job_path, f"Agent Lee {kind} job receipt.")
    return job_path


def ask_brain(user_text):
    memory = load_memory()
    context = recent_context_text(memory)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": "Recent Telegram context:\n" + context},
        {"role": "user", "content": user_text},
    ]

    chat_payload = {
        "model": BRAIN_MODEL,
        "stream": False,
        "options": {
            "temperature": 0.25,
            "top_p": 0.8,
            "num_predict": 180,
        },
        "messages": messages,
    }

    raw_debug = {
        "created_at": now_iso(),
        "model": BRAIN_MODEL,
        "chat_attempt": None,
        "generate_attempt": None,
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
            return content.strip()
    except Exception as e:
        raw_debug["chat_error"] = str(e)

    generate_prompt = (
        SYSTEM_PROMPT
        + "\n\nRecent Telegram context:\n"
        + context
        + "\n\nLeonard says:\n"
        + user_text
        + "\n\nAnswer in 3 to 7 short sentences. Be direct. Do not mention hidden thinking."
    )

    gen_payload = {
        "model": BRAIN_MODEL,
        "stream": False,
        "prompt": generate_prompt,
        "options": {
            "temperature": 0.25,
            "top_p": 0.8,
            "num_predict": 180,
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
            return content.strip()
    except Exception as e:
        raw_debug["generate_error"] = str(e)

    write_brain_debug(raw_debug)
    return (
        "My Qwen brain returned empty twice, so I protected the workflow instead of hallucinating. "
        "Run /debugbrain and I will send the raw brain diagnostic receipt."
    )


def write_brain_debug(data):
    path = OUTPUT_DIR / "agent_lee_qwen_brain_debug.receipt.json"
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


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
    status_text, receipt_path, checks = get_lanes_status()

    web_state = "not wired yet" if not WEB_SERVICE_URL else f"wired at {WEB_SERVICE_URL}"
    email_state = "not wired yet" if not EMAIL_SERVICE_URL else f"wired at {EMAIL_SERVICE_URL}"
    image_state = "job receipt only until image lane is wired" if not IMAGE_SERVICE_URL else f"wired at {IMAGE_SERVICE_URL}"

    return (
        "Here is what I can do right now through Telegram:\n\n"
        "- Talk with you through Qwen3 brain.\n"
        "- Speak back with Qwen3-TTS cloned Agent Lee voice using /speak.\n"
        "- Check runtime, brain, voice, ears, vision, media, and memory with /status.\n"
        "- Remember recent Telegram context and image prompts.\n"
        "- Create image job receipts with /image.\n"
        "- Send receipts and recovery package info.\n\n"
        f"Current lane status:\n{status_text}\n\n"
        f"Image generation: {image_state}.\n"
        f"Web search: {web_state}.\n"
        f"Email sending: {email_state}.\n\n"
        "The next wiring step is to connect web, email, and image services behind the single runtime entrypoint."
    )


def try_generate_image(prompt):
    if not prompt or prompt.strip() == "/image":
        return "Send it like this: /image hybrid man, dog, dragon"

    if not IMAGE_SERVICE_URL:
        job_path = create_job(
            "image",
            prompt,
            "PENDING_IMAGE_GENERATION_LANE",
            "Actual image generation requires AGENT_LEE_IMAGE_SERVICE or a Leeway image endpoint.",
        )
        return (
            "I saved that as an Agent Lee image job. I did not pretend to generate it.\n\n"
            f"Prompt: {prompt}\n\n"
            "Next we need to wire the image generation lane."
        )

    return "Image service variable is set, but this v3 shell still needs the exact image endpoint contract."


def handle_web_request(text):
    if not WEB_SERVICE_URL:
        create_job(
            "web_search",
            text,
            "PENDING_WEB_SEARCH_LANE",
            "Web search request detected. Telegram shell needs AGENT_LEE_WEB_SERVICE or runtime-fabric web endpoint.",
        )
        return (
            "I can detect the web-search request, but the Telegram shell does not have the web-search endpoint wired yet. "
            "I created a web-search job receipt so we can connect it to Runtime Fabric next."
        )

    return "Web service variable is set, but this shell needs the exact endpoint contract."


def handle_email_request(text):
    if not EMAIL_SERVICE_URL:
        create_job(
            "email",
            text,
            "PENDING_EMAIL_LANE",
            "Email request detected. Telegram shell needs AGENT_LEE_EMAIL_SERVICE or runtime-fabric email endpoint.",
        )
        return (
            "I can detect the email request, but the Telegram shell does not have the email endpoint wired yet. "
            "I created an email job receipt so we can connect it to Runtime Fabric next."
        )

    return "Email service variable is set, but this shell needs the exact endpoint contract."


def handle_command(text):
    clean = text.strip()
    lower = clean.lower()

    remember("user", clean)

    if lower in ["/start", "/help", "help"]:
        reply = (
            "Agent Lee Telegram shell v3 is alive.\n\n"
            "Commands:\n"
            "/alive - prove Agent Lee is reachable\n"
            "/status - check runtime lanes\n"
            "/whatcanido - list current abilities and missing wiring\n"
            "/time - show runtime time\n"
            "/speak your text - generate Agent Lee voice\n"
            "/image your prompt - create image job or use image lane when wired\n"
            "/lastimage - show last image prompt\n"
            "/debugbrain - send raw Qwen brain diagnostic\n"
            "/receipt - send latest lane status receipt\n"
            "/recovery - send latest recovery zip if available"
        )
        remember("assistant", reply)
        return reply

    if lower in ["/alive", "alive", "agent lee alive"]:
        status_text, receipt_path, checks = get_lanes_status()
        voice_text = "Aight, it's Agent Lee. I'm alive on Telegram. My Qwen voice lane is active, and the Leeway runtime is standing by."
        try:
            audio_path = speak_to_file(voice_text)
            send_audio(audio_path, "Agent Lee alive voice proof.")
        except Exception as e:
            send_message(f"Voice proof failed: {e}")
        remember("assistant", status_text)
        return status_text

    if lower in ["/status", "status", "lane status"]:
        status_text, receipt_path, checks = get_lanes_status()
        send_document(receipt_path, "Agent Lee lane status receipt.")
        remember("assistant", status_text)
        return status_text

    if lower in ["/whatcanido", "what can you do", "what can you do?", "can you what can you do"]:
        reply = capability_answer()
        remember("assistant", reply)
        return reply

    if lower in ["/time", "time", "what time is it", "what time is it?"]:
        reply = f"Runtime time is {now_iso()}."
        remember("assistant", reply)
        return reply

    if lower.startswith("/speak ") or lower.startswith("/voice "):
        parts = clean.split(" ", 1)
        if len(parts) < 2 or not parts[1].strip():
            reply = "Send it like this: /speak Agent Lee is online."
            remember("assistant", reply)
            return reply
        phrase = parts[1].strip()
        audio_path = speak_to_file(phrase)
        send_audio(audio_path, "Qwen3-TTS Agent Lee voice.")
        reply = "Voice generated and sent."
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
            reply = "Send it like this: /image hybrid man, dog, dragon"
        remember("assistant", reply)
        return reply

    if lower in ["/lastimage", "last image", "last image prompt"]:
        memory = load_memory()
        prompt = memory.get("last_image_prompt")
        reply = f"Last image prompt I have is:\n{prompt}" if prompt else "I do not have a prior image prompt stored yet."
        remember("assistant", reply)
        return reply

    if lower in ["/debugbrain", "debug brain"]:
        path = OUTPUT_DIR / "agent_lee_qwen_brain_debug.receipt.json"
        if path.exists():
            send_document(path, "Raw Qwen brain diagnostic.")
            reply = "Brain diagnostic sent."
        else:
            reply = "No brain diagnostic exists yet. Ask a normal question first, then run /debugbrain."
        remember("assistant", reply)
        return reply

    if lower in ["/receipt", "receipt"]:
        status_text, receipt_path, checks = get_lanes_status()
        send_document(receipt_path, "Latest Agent Lee Telegram lane status receipt.")
        reply = "Receipt sent."
        remember("assistant", reply)
        return reply

    if lower in ["/recovery", "recovery package"]:
        zip_path = latest_recovery_zip()
        if not zip_path:
            reply = "I do not see a recovery zip yet."
            remember("assistant", reply)
            return reply
        size_mb = zip_path.stat().st_size / (1024 * 1024)
        if size_mb > 45:
            reply = f"I found the latest recovery zip, but it is about {size_mb:.1f} MB. It may be too large for Telegram. Path: {zip_path}"
            remember("assistant", reply)
            return reply
        send_document(zip_path, "Latest Agent Lee Docker recovery package.")
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
            reply = f"You are right. The last image prompt I have is:\n{prompt}"
            remember("assistant", reply)
            return reply

    answer = ask_brain(clean)
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
        "Agent Lee Telegram shell v3 is online.\n"
        "Router-first workflow is active. Brain fallback is active.\n"
        "Send /whatcanido, /status, or /speak Agent Lee is alive."
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
                    send_message("I received something, but this shell currently handles text commands first.")
                    continue

                try:
                    reply = handle_command(text)
                    if reply:
                        send_message(reply)
                except Exception as e:
                    send_message(f"Agent Lee shell error: {e}")
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
  verdict = "AGENT_LEE_TELEGRAM_SHELL_V3_PATCHED"
  container = "agent-lee-telegram-shell"
  router_first = $true
  memory = "enabled"
  brain_retry = "chat then generate fallback"
  command_capabilities = @(
    "/alive",
    "/status",
    "/whatcanido",
    "/time",
    "/speak",
    "/image",
    "/lastimage",
    "/debugbrain",
    "/receipt",
    "/recovery"
  )
  image_generation = "job receipt unless AGENT_LEE_IMAGE_SERVICE is wired"
  web_search = "job receipt unless AGENT_LEE_WEB_SERVICE is wired"
  email = "job receipt unless AGENT_LEE_EMAIL_SERVICE is wired"
  logs_tail = $Logs
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_SHELL_V3_PATCHED.receipt.json"
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee Telegram shell v3 patched and restarted." -ForegroundColor Green
Write-Host "Test in Telegram: /whatcanido" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan