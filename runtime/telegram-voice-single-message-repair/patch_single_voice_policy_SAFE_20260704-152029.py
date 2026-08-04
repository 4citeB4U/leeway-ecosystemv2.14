from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-voice-single-message-repair\\\\agent_lee_telegram_shell.recovered_20260704-152029.py")
src = path.read_text(encoding="utf-8")

# Remove any broken single voice block from the bad attempt if it exists.
src = re.sub(
    r"\n# ---------------------------------------------------------------------\n# LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY[\s\S]*?# END LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY\n",
    "\n",
    src
)

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY
# One voice message before text. No chunk staging. No queue strategy.
# ---------------------------------------------------------------------

def leeway_single_voice_trim(text, limit=420):
    import re
    text = str(text or "").strip()
    text = re.sub(r"https?://\S+", "I included the link in the text message.", text)
    text = text.replace("\\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    trimmed = text[:limit].rsplit(" ", 1)[0].strip()
    return trimmed + "."

def leeway_single_voice_wav_path(text):
    import os
    import time
    import requests

    voice_url = os.environ.get("AGENT_LEE_VOICE_URL", "http://agent-lee-qwen-voice:8097").rstrip("/")
    out_dir = os.environ.get("AGENT_LEE_TELEGRAM_AUDIO_DIR", "/tmp/agent-lee-voice")
    os.makedirs(out_dir, exist_ok=True)

    spoken = leeway_single_voice_trim(text)
    if not spoken:
        return None

    r = requests.post(
        voice_url + "/speak-file",
        json={"text": spoken},
        timeout=(10, 70)
    )
    r.raise_for_status()

    raw = r.content or b""
    if raw[:4] != b"RIFF":
        try:
            data = r.json()
            maybe_path = data.get("path") or data.get("file") or data.get("audio_path")
            if maybe_path and os.path.exists(maybe_path):
                return maybe_path
        except Exception:
            pass
        raise RuntimeError("Voice lane did not return WAV bytes. first_bytes=" + repr(raw[:32]))

    audio_path = os.path.join(out_dir, "agent_lee_single_voice_" + str(int(time.time())) + ".wav")
    with open(audio_path, "wb") as f:
        f.write(raw)

    return audio_path

def leeway_send_one_voice_then_text(text, voice_text=None):
    full_text = str(text or "").strip()
    spoken_text = str(voice_text or full_text).strip()

    sent_voice = False
    voice_error = ""

    try:
        audio_path = leeway_single_voice_wav_path(spoken_text)
        if audio_path:
            send_audio(audio_path)
            sent_voice = True
        else:
            voice_error = "No audio path returned."
    except Exception as e:
        voice_error = repr(e)

    if full_text:
        if sent_voice:
            send_message(full_text, voice=False)
        else:
            send_message("VOICE_DELIVERY_FAILED: " + voice_error + "\n\n" + full_text, voice=False)

    return {"voice_sent": sent_voice, "voice_error": voice_error}

def leeway_performance_voice_line_single(package, request_text):
    mode = str(package.get("mode") or "").lower()

    if mode == "rap":
        return (
            "Power level ten. I wrote the rap and I am giving you one short performance pass now. "
            "Runtime tight, receipts in sight, Agent Lee moving with purpose tonight. "
            "Full lyrics are in the text."
        )

    if mode == "sing":
        return (
            "I wrote the song, but true singing still needs the singing model wired. "
            "I am sending one voice message now, then the lyrics and truth status in text."
        )

    if mode == "song":
        return (
            "I wrote the song package with verse, chorus, and performance notes. "
            "I am sending one voice message now, then the full lyrics in text."
        )

    return "I created the performance package. I am sending the full details in text."

def leeway_handle_performance_runtime_request_single_voice(text):
    import requests
    import traceback

    request_text = str(text or "").strip()
    mode = "rap"

    try:
        if "leeway_performance_mode" in globals():
            mode = leeway_performance_mode(request_text)
    except Exception:
        mode = "rap"

    try:
        if "leeway_performance_runtime_url" in globals():
            runtime_url = leeway_performance_runtime_url()
        else:
            runtime_url = "http://leeway_performance_runtime:5338"

        r = requests.post(
            runtime_url.rstrip("/") + "/performance/create",
            json={
                "request": request_text,
                "mode": mode,
                "source": "telegram",
                "user_id": "telegram",
                "render_audio": False
            },
            timeout=45
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        msg = "PERFORMANCE_RUNTIME_FAILED: " + repr(e) + "\n" + traceback.format_exc()[-1500:]
        leeway_send_one_voice_then_text(msg, voice_text="Performance runtime failed. I am sending the error in text.")
        return ""

    perf = data.get("performance", {})
    package = perf.get("package", {})
    lyrics = package.get("lyrics", "")
    truth = package.get("truth", {})
    receipt = data.get("receipt", {})

    lines = []
    lines.append("AGENT LEE PERFORMANCE PACKAGE")
    lines.append("")
    lines.append("Mode: " + str(package.get("mode")))
    lines.append("Title: " + str(package.get("title")))
    lines.append("Power Level: 10")
    lines.append("")
    lines.append("Truth:")
    if isinstance(truth, dict):
        for k, v in truth.items():
            lines.append("- " + str(k) + ": " + str(v))
    if package.get("singing_blocker"):
        lines.append("")
        lines.append("Singing blocker:")
        lines.append(str(package.get("singing_blocker")))
    lines.append("")
    lines.append("Voice policy: ONE_VOICE_MESSAGE_BEFORE_TEXT")
    lines.append("")
    lines.append("Lyrics:")
    lines.append(str(lyrics))
    lines.append("")
    lines.append("Receipt: " + str(receipt.get("receipt_path")))

    voice_line = leeway_performance_voice_line_single(package, request_text)
    leeway_send_one_voice_then_text("\n".join(lines), voice_text=voice_line)
    return ""

# END LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY
'''

# Insert helper before handle_command.
if "LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY" not in src:
    marker = "def handle_command(text):"
    if marker not in src:
        raise RuntimeError("Could not find def handle_command(text):")
    src = src.replace(marker, helper + "\n\n" + marker, 1)

# Route performance requests to the new single voice handler.
src = src.replace(
    "if leeway_performance_request_required(text):\n        return leeway_handle_performance_runtime_request(text)\n",
    "if leeway_performance_request_required(text):\n        return leeway_handle_performance_runtime_request_single_voice(text)\n"
)

# If a previous broken route points to the same handler, leave it alone.
# If no performance route exists, insert one at the top of handle_command.
route = "def handle_command(text):\n    if leeway_performance_request_required(text):\n        return leeway_handle_performance_runtime_request_single_voice(text)\n"
if "return leeway_handle_performance_runtime_request_single_voice(text)" not in src:
    src = src.replace("def handle_command(text):\n", route, 1)

# Generic final reply should be one voice then text.
src = src.replace("leeway_send_voice_first_then_text(reply)", "leeway_send_one_voice_then_text(reply)")
src = src.replace("send_message(reply)", "leeway_send_one_voice_then_text(reply)")
src = src.replace("leeway_send_one_voice_then_text(leeway_send_one_voice_then_text(reply))", "leeway_send_one_voice_then_text(reply)")

path.write_text(src, encoding="utf-8")

