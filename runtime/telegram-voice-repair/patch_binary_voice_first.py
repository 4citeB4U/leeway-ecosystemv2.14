from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-voice-repair\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM BINARY VOICE-FIRST REPAIR
# Qwen /speak-file returns raw WAV bytes. Save bytes, send audio first,
# then send text. Keep speech short to avoid TTS timeout.
# ---------------------------------------------------------------------

def leeway_voice_first_trim(text, limit=260):
    import re
    text = str(text or "").strip()
    text = re.sub(r"https?://\S+", "I included the link in the text message.", text)
    text = text.replace("ΓÇö", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) <= limit:
        return text

    trimmed = text[:limit].rsplit(" ", 1)[0].strip()
    return trimmed + "."

def leeway_voice_first_wav_path(text):
    import os
    import time
    import requests

    voice_url = os.environ.get("AGENT_LEE_VOICE_URL", "http://agent-lee-qwen-voice:8097").rstrip("/")
    out_dir = os.environ.get("AGENT_LEE_TELEGRAM_AUDIO_DIR", "/tmp/agent-lee-voice")
    os.makedirs(out_dir, exist_ok=True)

    spoken = leeway_voice_first_trim(text)
    if not spoken:
        return None

    # Short timeout is intentional. If voice cannot be ready fast, text must not be blocked.
    r = requests.post(
        voice_url + "/speak-file",
        json={"text": spoken},
        timeout=(10, 55)
    )
    r.raise_for_status()

    content_type = r.headers.get("content-type", "")
    wav_bytes = r.content or b""

    # Qwen lane currently returns raw WAV bytes. Accept RIFF/WAVE directly.
    if wav_bytes[:4] != b"RIFF":
        # Some future implementation may return JSON with a path/url.
        try:
            data = r.json()
            maybe_path = data.get("path") or data.get("file") or data.get("audio_path")
            if maybe_path and os.path.exists(maybe_path):
                return maybe_path
        except Exception:
            pass
        raise RuntimeError("Voice lane did not return WAV bytes. content_type=" + str(content_type) + " first_bytes=" + repr(wav_bytes[:32]))

    path = os.path.join(out_dir, "agent_lee_voice_first_" + str(int(time.time())) + ".wav")
    with open(path, "wb") as f:
        f.write(wav_bytes)

    return path

def leeway_send_voice_first_then_text(text, voice_text=None):
    full_text = str(text or "").strip()
    spoken_text = str(voice_text or full_text).strip()

    sent_voice = False
    voice_error = ""

    try:
        audio_path = leeway_voice_first_wav_path(spoken_text)
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

    return {
        "voice_sent": sent_voice,
        "voice_error": voice_error
    }

def leeway_plan_voice_walkthrough_fast(data):
    try:
        plan = data.get("plan", {}) if isinstance(data, dict) else {}
        depth = plan.get("planning_depth", "planned")
        domain = plan.get("domain", "request")
        plan_id = plan.get("plan_id", "")
        return "Alright, I got you. I created a " + str(depth) + " " + str(domain) + " plan. I am sending the plan room now. Review it, then say approve the plan, run the plan, or edit the plan."
    except Exception:
        return "Alright, I created the plan. I am sending the details now. Review it, then approve, run, or edit the plan."

'''

if "LEEWAY TELEGRAM BINARY VOICE-FIRST REPAIR" not in src:
    marker = "def handle_command"
    if marker in src:
        src = src.replace(marker, helper + "\n\n" + marker, 1)
    else:
        src = src.rstrip() + "\n\n" + helper + "\n"

# Replace plan delivery text-first calls.
src = src.replace(
    "send_message(delivery_text, voice=False)",
    "leeway_send_voice_first_then_text(delivery_text, voice_text=leeway_plan_voice_walkthrough_fast(data) if 'data' in locals() else delivery_text)"
)

# Replace older plan voice walkthrough call if it only logs failure.
src = src.replace(
    "leeway_send_plan_voice_then_text(data, delivery_text)",
    "leeway_send_voice_first_then_text(delivery_text, voice_text=leeway_plan_voice_walkthrough_fast(data))"
)

# Replace generic final send path.
src = src.replace(
    "send_message(reply)",
    "leeway_send_voice_first_then_text(reply)"
)

# Cleanup accidental double nesting.
src = src.replace(
    "leeway_send_voice_first_then_text(leeway_send_voice_first_then_text(reply))",
    "leeway_send_voice_first_then_text(reply)"
)

path.write_text(src, encoding="utf-8")

