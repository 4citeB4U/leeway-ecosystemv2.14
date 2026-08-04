$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Leeway Runtime Fabric\deploy\docker\agent-lee-telegram-shell"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-telegram-shell"
$MemoryDir = Join-Path $Root "Archive\telegram-shell\memory"
$OutDir = Join-Path $Root "Archive\telegram-shell"
$AppPath = Join-Path $ServiceRoot "agent_lee_telegram_shell.py"

New-Item -ItemType Directory -Force -Path $ServiceRoot, $Proof, $MemoryDir, $OutDir | Out-Null

@'
import os
import re
import time
import json
import glob
import requests
from pathlib import Path

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

# Optional. This must be wired later if there is a real image generation endpoint.
IMAGE_SERVICE_URL = os.environ.get("AGENT_LEE_IMAGE_SERVICE", "").rstrip("/")

OUTPUT_DIR = Path(os.environ.get("AGENT_LEE_TELEGRAM_OUTPUT_DIR", "/telegram-output"))
MEMORY_DIR = Path(os.environ.get("AGENT_LEE_TELEGRAM_MEMORY_DIR", "/telegram-memory"))
RECOVERY_DIR = Path(os.environ.get("AGENT_LEE_RECOVERY_DIR", "/recovery"))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MEMORY_DIR.mkdir(parents=True, exist_ok=True)

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is missing.")

if not CHAT_ID:
    raise RuntimeError("TELEGRAM_CHAT_ID is missing.")

TG = f"https://api.telegram.org/bot{BOT_TOKEN}"

SYSTEM_PROMPT = """
You are Agent Lee, Leonard's Leeway runtime assistant.

You are not a loose chatbot. You are an agent shell connected to the Leeway Docker runtime.

Live lanes:
- Brain: Qwen3 through leeway_ollama.
- Voice: Qwen3-TTS clone through agent-lee-qwen-voice.
- Ears: agent-lee-ears-kernel.
- Vision: qwen2.5vl through agent-lee-vision-kernel.
- Memory/media: Leeway media ingestion and media router.
- Runtime: leeway_runtime_fabric.
- Shell: Telegram.

Rules:
- Use conversation history.
- If Leonard says "look back", inspect the recent Telegram context.
- Do not invent previous prompts.
- Do not claim a tool completed unless this shell actually called that tool successfully.
- If an image is requested and no image generator endpoint is configured, create an image job receipt and tell Leonard the image generation lane still needs wiring.
- The LLM is not in charge. The Agent Lee shell and Leeway agents are in charge; Qwen is the reasoning engine.
- Keep responses direct, calm, useful, and operational.
"""

IMAGE_WORDS = [
    "create an image",
    "make an image",
    "generate an image",
    "draw",
    "image of",
    "picture of",
    "make me a picture",
    "create me an image",
]

LOOKBACK_WORDS = [
    "look back",
    "go back",
    "i already did",
    "i described",
    "what i asked",
    "previous question",
    "earlier",
]

def tg_call(method, data=None, files=None, timeout=60):
    url = f"{TG}/{method}"
    response = requests.post(url, data=data or {}, files=files, timeout=timeout)
    response.raise_for_status()
    return response.json()

def send_message(text):
    if not text:
        text = "Agent Lee is online."
    return tg_call("sendMessage", {
        "chat_id": CHAT_ID,
        "text": text[:3900],
    })

def send_document(path, caption=""):
    path = Path(path)
    if not path.exists():
        send_message(f"I could not find that file: {path}")
        return
    with path.open("rb") as f:
        return tg_call("sendDocument", {
            "chat_id": CHAT_ID,
            "caption": caption[:900],
        }, files={"document": (path.name, f)}, timeout=120)

def send_audio(path, caption=""):
    path = Path(path)
    if not path.exists():
        send_message(f"I could not find that audio file: {path}")
        return
    with path.open("rb") as f:
        return tg_call("sendAudio", {
            "chat_id": CHAT_ID,
            "caption": caption[:900],
        }, files={"audio": (path.name, f, "audio/wav")}, timeout=120)

def send_photo(path, caption=""):
    path = Path(path)
    if not path.exists():
        send_message(f"I could not find that image file: {path}")
        return
    with path.open("rb") as f:
        return tg_call("sendPhoto", {
            "chat_id": CHAT_ID,
            "caption": caption[:900],
        }, files={"photo": (path.name, f)}, timeout=180)

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
        return {
            "history": [],
            "last_image_prompt": None,
            "last_image_job": None,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {
            "history": [],
            "last_image_prompt": None,
            "last_image_job": None,
            "memory_recovered": False,
        }

def save_memory(memory):
    memory["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    memory_path().write_text(json.dumps(memory, indent=2), encoding="utf-8")

def remember(role, text):
    memory = load_memory()
    history = memory.get("history", [])
    history.append({
        "role": role,
        "content": text,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    memory["history"] = history[-20:]
    save_memory(memory)

def recent_context_text(memory=None):
    if memory is None:
        memory = load_memory()
    lines = []
    for item in memory.get("history", [])[-12:]:
        role = item.get("role", "unknown")
        content = item.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)

def contains_any(text, needles):
    lower = text.lower()
    return any(n in lower for n in needles)

def extract_image_prompt(text):
    clean = text.strip()

    # Prefer the full user phrase after common verbs.
    patterns = [
        r"create an image of\s+(.+)",
        r"create a image of\s+(.+)",
        r"generate an image of\s+(.+)",
        r"make an image of\s+(.+)",
        r"draw\s+(.+)",
        r"image of\s+(.+)",
        r"picture of\s+(.+)",
    ]

    lower = clean.lower()
    for p in patterns:
        m = re.search(p, lower, flags=re.IGNORECASE)
        if m:
            idx = m.start(1)
            # Use original text from approximately same point.
            return clean[idx:].strip(" .,!?:;")

    return clean

def health_get(name, url):
    try:
        r = requests.get(url, timeout=20)
        body = r.json() if "application/json" in r.headers.get("content-type", "") else r.text[:700]
        return {
            "name": name,
            "ok": r.ok,
            "status_code": r.status_code,
            "body": body,
        }
    except Exception as e:
        return {
            "name": name,
            "ok": False,
            "error": str(e),
        }

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

    receipt = {
        "verdict": "AGENT_LEE_TELEGRAM_LANE_STATUS",
        "checks": checks,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    receipt_path = OUTPUT_DIR / "agent_lee_telegram_lane_status.receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")

    return "\n".join(lines), receipt_path

def ask_brain(user_text):
    memory = load_memory()
    context = recent_context_text(memory)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    if context:
        messages.append({
            "role": "system",
            "content": "Recent Telegram context:\n" + context,
        })

    messages.append({"role": "user", "content": user_text})

    payload = {
        "model": BRAIN_MODEL,
        "stream": False,
        "options": {
            "temperature": 0.35,
            "top_p": 0.85,
            "num_predict": 260,
        },
        "messages": messages,
    }

    try:
        r = requests.post(f"{BRAIN_URL}/api/chat", json=payload, timeout=160)
        r.raise_for_status()
        data = r.json()
        content = data.get("message", {}).get("content", "")
        if content and content.strip():
            return content.strip()
        return "My Qwen brain returned an empty message. I need to retry with a smaller response."
    except Exception as e:
        return f"My Qwen brain lane had trouble answering: {e}"

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

def create_image_job(prompt):
    memory = load_memory()

    job = {
        "verdict": "AGENT_LEE_IMAGE_JOB_CREATED",
        "status": "PENDING_IMAGE_GENERATION_LANE",
        "prompt": prompt,
        "requested_by": "telegram",
        "note": "Telegram shell detected an image request. Actual image generation requires AGENT_LEE_IMAGE_SERVICE or a Leeway image endpoint to be wired.",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    safe_name = re.sub(r"[^0-9A-Za-z_-]+", "_", prompt.lower())[:80].strip("_")
    if not safe_name:
        safe_name = "image_request"

    job_path = OUTPUT_DIR / f"agent_lee_image_job_{int(time.time())}_{safe_name}.json"
    job_path.write_text(json.dumps(job, indent=2), encoding="utf-8")

    memory["last_image_prompt"] = prompt
    memory["last_image_job"] = str(job_path)
    save_memory(memory)

    return job_path

def try_generate_image(prompt):
    # This is intentionally conservative. We do not pretend image generation exists.
    # If AGENT_LEE_IMAGE_SERVICE is later configured, this shell will try common endpoint shapes.
    if not IMAGE_SERVICE_URL:
        job_path = create_image_job(prompt)
        send_document(job_path, "Agent Lee image job receipt.")
        return (
            "I found the image request and saved it as an Agent Lee image job.\n\n"
            f"Prompt: {prompt}\n\n"
            "The Telegram shell does not yet have a live image-generation endpoint wired, so I did not pretend to create it. "
            "Next we need to wire the Leeway image generation lane or set AGENT_LEE_IMAGE_SERVICE."
        )

    endpoints = [
        f"{IMAGE_SERVICE_URL}/generate",
        f"{IMAGE_SERVICE_URL}/image/generate",
        f"{IMAGE_SERVICE_URL}/images/generate",
    ]

    payload = {"prompt": prompt}

    last_error = None
    for endpoint in endpoints:
        try:
            r = requests.post(endpoint, json=payload, timeout=300)
            if not r.ok:
                last_error = f"{endpoint} returned {r.status_code}: {r.text[:300]}"
                continue

            content_type = r.headers.get("content-type", "")

            if "image" in content_type:
                image_path = OUTPUT_DIR / f"agent_lee_generated_image_{int(time.time())}.png"
                image_path.write_bytes(r.content)
                send_photo(image_path, f"Agent Lee image: {prompt}")
                return "Image generated and sent."

            data = r.json()
            image_url = data.get("image_url") or data.get("url")
            image_path_value = data.get("path") or data.get("file") or data.get("image_path")

            if image_url:
                send_message(f"Image generated: {image_url}")
                return "Image generated and sent as a link."

            if image_path_value:
                p = Path(image_path_value)
                if p.exists():
                    send_photo(p, f"Agent Lee image: {prompt}")
                    return "Image generated and sent."

            last_error = f"{endpoint} returned JSON but no usable image field."
        except Exception as e:
            last_error = f"{endpoint} failed: {e}"

    job_path = create_image_job(prompt)
    send_document(job_path, "Image generation failed; job receipt saved.")
    return f"I tried the image lane but it did not return an image. Last error: {last_error}"

def handle_command(text):
    clean = text.strip()
    lower = clean.lower()

    remember("user", clean)

    if lower in ["/start", "/help", "help"]:
        reply = (
            "Agent Lee Telegram shell is alive.\n\n"
            "Commands:\n"
            "/alive - prove Agent Lee is reachable\n"
            "/status - check runtime lanes\n"
            "/speak your text - generate Agent Lee voice\n"
            "/image your prompt - create an image job or use image lane if wired\n"
            "/lastimage - show the last image prompt\n"
            "/receipt - send latest lane status receipt\n"
            "/recovery - send latest recovery zip if available\n\n"
            "You can also talk normally."
        )
        remember("assistant", reply)
        return reply

    if lower in ["/alive", "alive", "agent lee alive"]:
        status_text, receipt_path = get_lanes_status()
        voice_text = "Aight, it's Agent Lee. I'm alive on Telegram. My Qwen voice lane is active, and the Leeway runtime is standing by."
        try:
            audio_path = speak_to_file(voice_text)
            send_audio(audio_path, "Agent Lee alive voice proof.")
        except Exception as e:
            send_message(f"Voice proof failed: {e}")
        remember("assistant", status_text)
        return status_text

    if lower in ["/status", "status", "lane status"]:
        status_text, receipt_path = get_lanes_status()
        send_document(receipt_path, "Agent Lee lane status receipt.")
        remember("assistant", status_text)
        return status_text

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

    if lower in ["/lastimage", "last image", "last image prompt"]:
        memory = load_memory()
        prompt = memory.get("last_image_prompt")
        if prompt:
            reply = f"Last image prompt I have is:\n{prompt}"
        else:
            reply = "I do not have a prior image prompt stored yet."
        remember("assistant", reply)
        return reply

    if lower in ["/receipt", "receipt"]:
        status_text, receipt_path = get_lanes_status()
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
            reply = f"I found the latest recovery zip, but it is about {size_mb:.1f} MB. That may be too large for Telegram. Path: {zip_path}"
            remember("assistant", reply)
            return reply
        send_document(zip_path, "Latest Agent Lee Docker recovery package.")
        reply = "Recovery package sent."
        remember("assistant", reply)
        return reply

    # Natural image request.
    if contains_any(clean, IMAGE_WORDS):
        prompt = extract_image_prompt(clean)
        reply = try_generate_image(prompt)
        remember("assistant", reply)
        return reply

    # Lookback handling, especially for image prompt.
    if contains_any(clean, LOOKBACK_WORDS):
        memory = load_memory()
        prompt = memory.get("last_image_prompt")
        context = recent_context_text(memory)

        if prompt:
            reply = (
                "You are right. I found the prior image prompt in this Telegram context:\n\n"
                f"{prompt}\n\n"
                "I can use that as the active image request."
            )
            remember("assistant", reply)
            return reply

        answer = ask_brain(
            "Leonard is asking me to look back at recent Telegram context. "
            "Use only the provided recent context. Do not invent a prompt. "
            "Recent context:\n" + context
        )
        remember("assistant", answer)
        return answer

    answer = ask_brain(clean)
    remember("assistant", answer)
    return answer

def get_updates(offset=None):
    data = {
        "timeout": 45,
        "allowed_updates": json.dumps(["message"]),
    }
    if offset is not None:
        data["offset"] = str(offset)

    r = requests.post(f"{TG}/getUpdates", data=data, timeout=60)
    r.raise_for_status()
    return r.json().get("result", [])

def main():
    delete_webhook()

    send_message(
        "Agent Lee Telegram shell v2 is online.\n"
        "Memory is active. Image requests are detected. Qwen brain and Qwen voice lanes are ready.\n"
        "Send /alive, /status, or /image hybrid man, dog, dragon."
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
  -e AGENT_LEE_RECOVERY_DIR="/recovery" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\telegram-shell:/telegram-output" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\telegram-shell\memory:/telegram-memory" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\recovery:/recovery:ro" `
  agent-lee-telegram-shell:latest | Out-Null

Start-Sleep -Seconds 5

$Logs = docker logs --tail 120 agent-lee-telegram-shell 2>&1 | Out-String -Width 4096

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_SHELL_V2_PATCHED"
  container = "agent-lee-telegram-shell"
  memory = "enabled"
  image_request_detection = "enabled"
  image_generation = "requires AGENT_LEE_IMAGE_SERVICE or Leeway image endpoint"
  brain = "qwen3:latest via http://ollama:11434"
  voice = "qwen3-tts clone via http://agent-lee-qwen-voice:8097"
  logs_tail = $Logs
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_SHELL_V2_PATCHED.receipt.json"
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee Telegram shell v2 patched and restarted." -ForegroundColor Green
Write-Host "Test in Telegram: /image hybrid man, dog, dragon" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan