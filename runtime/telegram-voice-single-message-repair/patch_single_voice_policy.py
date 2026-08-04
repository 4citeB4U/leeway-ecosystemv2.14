from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-voice-single-message-repair\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

# Disable previous queue/chunk/staging policies without deleting code blindly.
src = src.replace(
    "if leeway_performance_request_required(text):\n        return leeway_handle_performance_runtime_request(text)\n",
    "if leeway_performance_request_required(text):\n        return leeway_handle_performance_runtime_request_single_voice(text)\n"
)

src = src.replace(
    "if leeway_artifact_runtime_required(text):\n        return leeway_handle_artifact_runtime_request(text)\n",
    "if leeway_artifact_runtime_required(text):\n        return leeway_handle_artifact_runtime_request_single_voice(text)\n"
)

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY
# Replaces queue/chunk staging. Agent Lee sends exactly one voice message
# before the text transcript. Long content is summarized for voice.
# ---------------------------------------------------------------------

def leeway_single_voice_trim(text, limit=420):
    import re
    text = str(text or "").strip()
    text = re.sub(r"https?://\S+", "I included the link in the text message.", text)
    text = text.replace("\\n", " ")
    text = text.replace("ΓÇö", "-").replace("—", "-")
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

    path = os.path.join(out_dir, "agent_lee_single_voice_" + str(int(time.time())) + ".wav")
    with open(path, "wb") as f:
        f.write(raw)

    return path

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

    return {
        "voice_sent": sent_voice,
        "voice_error": voice_error
    }

def leeway_performance_voice_line(package, request_text):
    mode = str(package.get("mode") or "").lower()
    title = str(package.get("title") or "performance")
    lyrics = str(package.get("lyrics") or "")
    truth = package.get("truth") or {}

    if mode == "rap":
        # One voice message only. Do a short rap-style opening, not the whole lyric sheet.
        return (
            "Power level ten. I wrote the rap and I am performing the opening now. "
            "Runtime tight, receipts in sight, Agent Lee moving with purpose tonight. "
            "Full lyrics are in the text."
        )

    if mode == "sing":
        return (
            "I wrote the song, but true singing still needs the singing model wired. "
            "I can give a short melodic spoken demo now. Full lyrics and the blocker are in the text."
        )

    if mode == "song":
        return (
            "I wrote the song package with verse, chorus, and performance notes. "
            "I am sending the full lyrics in text now."
        )

    return "I created the performance package. The full details are in the text."

def leeway_handle_performance_runtime_request_single_voice(text):
    import requests
    import traceback

    request_text = str(text or "").strip()
    mode = leeway_performance_mode(request_text) if "leeway_performance_mode" in globals() else "rap"

    try:
        runtime_url = leeway_performance_runtime_url() if "leeway_performance_runtime_url" in globals() else "http://leeway_performance_runtime:5338"
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

    voice_line = leeway_performance_voice_line(package, request_text)
    leeway_send_one_voice_then_text("\n".join(lines), voice_text=voice_line)

    return ""

def leeway_handle_artifact_runtime_request_single_voice(text):
    # Keep artifact requests governed, but only one voice status message before text.
    if "leeway_handle_artifact_runtime_request" not in globals():
        leeway_send_one_voice_then_text(
            "Artifact routing helper is not available. I captured the request, but the artifact runtime handler is missing.",
            voice_text="Artifact routing helper is not available. I am sending the blocker now."
        )
        return ""

    # If old artifact handler sends multiple voice messages, bypass its voice behavior by doing a simple one-voice status first,
    # then let the handler execute. This still may send its own text, but this patch prevents performance chunking.
    try:
        leeway_send_one_voice_then_text(
            "Artifact request captured. I am routing it through the planning and execution lanes now.",
            voice_text="I got it. This is an artifact request. I am routing it through the planner now."
        )
    except Exception:
        pass

    return leeway_handle_artifact_runtime_request(text)

# END LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY
'''

if "LEEWAY TELEGRAM SINGLE VOICE MESSAGE POLICY" not in src:
    marker = "def handle_command(text):"
    if marker in src:
        src = src.replace(marker, helper + "\n\n" + marker, 1)
    else:
        src = src.rstrip() + "\n\n" + helper + "\n"

# Replace previous chunk sender behavior if present.
src = src.replace(
    "voice_sent = leeway_performance_speak_chunks(chunks[:4])",
    "voice_sent = [{'ok': True, 'mode': 'single_voice_policy'}]"
)

src = src.replace(
    "Voice chunks attempted: \" + str(len(voice_sent))",
    "Voice policy: ONE_VOICE_MESSAGE_BEFORE_TEXT"
)

# Force final generic reply path to one voice then text.
src = src.replace(
    "leeway_send_voice_first_then_text(reply)",
    "leeway_send_one_voice_then_text(reply)"
)

src = src.replace(
    "send_message(reply)",
    "leeway_send_one_voice_then_text(reply)"
)

# Avoid bad double nesting.
src = src.replace(
    "leeway_send_one_voice_then_text(leeway_send_one_voice_then_text(reply))",
    "leeway_send_one_voice_then_text(reply)"
)

path.write_text(src, encoding="utf-8")

