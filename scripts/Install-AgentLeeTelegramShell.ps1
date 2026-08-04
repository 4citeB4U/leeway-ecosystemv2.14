$ErrorActionPreference = "Stop"

$Root = "D:\Leeway-Ecosystem v2.1.4"
$ServiceRoot = Join-Path $Root "Leeway Runtime Fabric\deploy\docker\agent-lee-telegram-shell"
$Proof = Join-Path $Root "Archive\proofs\agent-lee-telegram-shell"
$OutDir = Join-Path $Root "Archive\telegram-shell"
$EnvPath = Join-Path $Root ".env.local"

New-Item -ItemType Directory -Force -Path $ServiceRoot, $Proof, $OutDir | Out-Null

if (-not (Test-Path $EnvPath)) {
  throw "Missing .env.local at $EnvPath"
}

$EnvContent = Get-Content $EnvPath -Raw

if ($EnvContent -notmatch "(?m)^TELEGRAM_BOT_TOKEN=") {
  throw "Missing TELEGRAM_BOT_TOKEN in .env.local"
}

if ($EnvContent -notmatch "(?m)^TELEGRAM_CHAT_ID=") {
  throw "Missing TELEGRAM_CHAT_ID in .env.local"
}

$DockerfilePath = Join-Path $ServiceRoot "Dockerfile"
$AppPath = Join-Path $ServiceRoot "agent_lee_telegram_shell.py"

@'
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN python -m pip install --no-cache-dir --upgrade pip
RUN python -m pip install --no-cache-dir requests

COPY agent_lee_telegram_shell.py /app/agent_lee_telegram_shell.py

CMD ["python", "/app/agent_lee_telegram_shell.py"]
'@ | Set-Content -Path $DockerfilePath -Encoding UTF8

@'
import os
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

OUTPUT_DIR = Path(os.environ.get("AGENT_LEE_TELEGRAM_OUTPUT_DIR", "/telegram-output"))
RECOVERY_DIR = Path(os.environ.get("AGENT_LEE_RECOVERY_DIR", "/recovery"))
PROOF_DIR = Path(os.environ.get("AGENT_LEE_PROOF_DIR", "/proofs"))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is missing.")

if not CHAT_ID:
    raise RuntimeError("TELEGRAM_CHAT_ID is missing.")

TG = f"https://api.telegram.org/bot{BOT_TOKEN}"


SYSTEM_PROMPT = """
You are Agent Lee, Leonard's Leeway runtime assistant.

Identity:
You are Agent Lee. You are the voice and operational shell for the Leeway ecosystem.

Current live lanes:
- Brain: Qwen3 through leeway_ollama.
- Voice: Qwen3-TTS clone through agent-lee-qwen-voice.
- Ears: agent-lee-ears-kernel.
- Vision: qwen2.5vl through agent-lee-vision-kernel.
- Memory and media: Leeway media ingestion and media router.
- Runtime: leeway_runtime_fabric.
- Telegram: this shell.

Style:
- Calm, confident, warm, focused.
- Speak with clear executive operator energy.
- Light hip-hop flavor is okay, but do not overdo slang.
- Keep answers practical and direct.
- Prefer short spoken sentences.
- Do not claim you did something unless the shell actually did it.

Operating rules:
- Qwen is runtime authority.
- No bridge sprawl.
- Use existing Docker lanes.
- Keep proof and receipts.
- When asked for status, summarize lane health.
- When asked to speak, use the Qwen3-TTS voice lane.
"""


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


def delete_webhook():
    try:
        requests.post(f"{TG}/deleteWebhook", data={"drop_pending_updates": "false"}, timeout=30)
    except Exception:
        pass


def health_get(name, url):
    try:
        r = requests.get(url, timeout=20)
        return {
            "name": name,
            "ok": r.ok,
            "status_code": r.status_code,
            "body": r.json() if "application/json" in r.headers.get("content-type", "") else r.text[:500],
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
    payload = {
        "model": BRAIN_MODEL,
        "stream": False,
        "options": {
            "temperature": 0.45,
            "top_p": 0.85,
            "num_predict": 220,
        },
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text},
        ],
    }

    try:
        r = requests.post(f"{BRAIN_URL}/api/chat", json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()
        content = data.get("message", {}).get("content", "")
        if content.strip():
            return content.strip()
    except Exception as e:
        return f"My Qwen brain lane had trouble answering: {e}"

    return "I heard you, but my brain lane did not return a clean response."


def speak_to_file(text):
    out_path = OUTPUT_DIR / f"agent_lee_telegram_voice_{int(time.time() * 1000)}.wav"

    payload = {
        "text": text,
        "language": "English",
        "voice_mode": "clone",
        "clone_mode": "speaker_vector",
        "reference_audio": "/voice-seeds/Agent_Voice_One.m4a",
    }

    r = requests.post(f"{VOICE_URL}/speak-file", json=payload, timeout=180)
    r.raise_for_status()
    out_path.write_bytes(r.content)
    return out_path


def latest_recovery_zip():
    zips = sorted(glob.glob(str(RECOVERY_DIR / "agent-lee-docker-recovery-*.zip")), key=os.path.getmtime, reverse=True)
    return Path(zips[0]) if zips else None


def handle_command(text):
    clean = text.strip()
    lower = clean.lower()

    if lower in ["/start", "/help", "help"]:
        return (
            "Agent Lee Telegram shell is alive.\n\n"
            "Commands:\n"
            "/alive - prove Agent Lee is reachable\n"
            "/status - check runtime lanes\n"
            "/speak your text - generate Agent Lee voice\n"
            "/voice your text - same as speak\n"
            "/receipt - send latest lane status receipt\n"
            "/recovery - send latest recovery zip if available\n\n"
            "You can also just talk to me normally."
        )

    if lower in ["/alive", "alive", "agent lee alive"]:
        status_text, receipt_path = get_lanes_status()
        voice_text = "Aight, it's Agent Lee. I'm alive on Telegram. My Qwen voice lane is active, and the Leeway runtime is standing by."
        try:
            audio_path = speak_to_file(voice_text)
            send_audio(audio_path, "Agent Lee alive voice proof.")
        except Exception as e:
            send_message(f"Voice proof failed: {e}")
        return status_text

    if lower in ["/status", "status", "lane status"]:
        status_text, receipt_path = get_lanes_status()
        send_document(receipt_path, "Agent Lee lane status receipt.")
        return status_text

    if lower.startswith("/speak ") or lower.startswith("/voice "):
        parts = clean.split(" ", 1)
        if len(parts) < 2 or not parts[1].strip():
            return "Send it like this: /speak Agent Lee is online."
        phrase = parts[1].strip()
        audio_path = speak_to_file(phrase)
        send_audio(audio_path, "Qwen3-TTS Agent Lee voice.")
        return "Voice generated and sent."

    if lower in ["/receipt", "receipt"]:
        status_text, receipt_path = get_lanes_status()
        send_document(receipt_path, "Latest Agent Lee Telegram lane status receipt.")
        return "Receipt sent."

    if lower in ["/recovery", "recovery package"]:
        zip_path = latest_recovery_zip()
        if not zip_path:
            return "I do not see a recovery zip yet."
        size_mb = zip_path.stat().st_size / (1024 * 1024)
        if size_mb > 45:
            return f"I found the latest recovery zip, but it is about {size_mb:.1f} MB. That may be too large for Telegram. Path: {zip_path}"
        send_document(zip_path, "Latest Agent Lee Docker recovery package.")
        return "Recovery package sent."

    answer = ask_brain(clean)
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
        "Agent Lee Telegram shell is online.\n"
        "Qwen brain, Qwen voice, runtime, media, ears, and vision lanes are ready to check.\n"
        "Send /alive or /status."
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
  -e AGENT_LEE_RECOVERY_DIR="/recovery" `
  -e AGENT_LEE_PROOF_DIR="/proofs" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\telegram-shell:/telegram-output" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\recovery:/recovery:ro" `
  -v "D:\Leeway-Ecosystem v2.1.4\Archive\proofs:/proofs:ro" `
  agent-lee-telegram-shell:latest | Out-Null

Start-Sleep -Seconds 5

$Logs = docker logs --tail 80 agent-lee-telegram-shell 2>&1 | Out-String -Width 4096

$Receipt = @{
  verdict = "AGENT_LEE_TELEGRAM_SHELL_INSTALLED"
  container = "agent-lee-telegram-shell"
  image = "agent-lee-telegram-shell:latest"
  restart = "unless-stopped"
  network = "leeway-ecosystemv214_leeway-net"
  brain = "qwen3:latest via http://ollama:11434"
  voice = "qwen3-tts clone via http://agent-lee-qwen-voice:8097"
  telegram_env = ".env.local"
  logs_tail = $Logs
  created_at = (Get-Date).ToString("o")
}

$ReceiptPath = Join-Path $Proof "AGENT_LEE_TELEGRAM_SHELL_INSTALLED.receipt.json"
$Receipt | ConvertTo-Json -Depth 20 | Set-Content -Path $ReceiptPath -Encoding UTF8

notepad $ReceiptPath

Write-Host ""
Write-Host "Agent Lee Telegram shell installed and started." -ForegroundColor Green
Write-Host "Now open Telegram and send: /alive" -ForegroundColor Cyan
Write-Host "Receipt: $ReceiptPath" -ForegroundColor Cyan