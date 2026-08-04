from pathlib import Path

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-performance-routing\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM PERFORMANCE ROUTING LEVEL 10
# Rap/song/sing requests must route to leeway_performance_runtime.
# ---------------------------------------------------------------------

def leeway_performance_request_required(text):
    import re
    t = str(text or "").lower()
    terms = [
        "rap",
        "wrap it",
        "spit",
        "bars",
        "song",
        "sing",
        "singer",
        "singing",
        "hook",
        "chorus",
        "verse",
        "perform it",
        "perform this",
        "music"
    ]

    for term in terms:
        if term in t:
            return True

    if re.search(r"\b(create|make|write|generate|perform)\b", t) and re.search(r"\b(rap|song|hook|chorus|verse|sing|music|bars)\b", t):
        return True

    return False

def leeway_performance_mode(text):
    t = str(text or "").lower()
    if "sing" in t or "singer" in t or "singing" in t:
        return "sing"
    if "song" in t or "hook" in t or "chorus" in t:
        return "song"
    return "rap"

def leeway_performance_runtime_url():
    import os
    return os.environ.get("LEEWAY_PERFORMANCE_RUNTIME_URL", "http://leeway_performance_runtime:5338").rstrip("/")

def leeway_performance_speak_chunks(chunks):
    sent = []
    chunks = list(chunks or [])[:6]

    for chunk in chunks:
        chunk = str(chunk or "").strip()
        if not chunk:
            continue

        try:
            if "leeway_send_voice_first_then_text" in globals():
                # Send voice only through the voice-first helper, but avoid sending each chunk as transcript if possible.
                leeway_send_voice_first_then_text("", voice_text=chunk)
                sent.append({"ok": True, "chunk": chunk})
            elif "speak_to_file" in globals() and "send_audio" in globals():
                audio_path = speak_to_file(chunk)
                send_audio(audio_path)
                sent.append({"ok": True, "chunk": chunk})
            else:
                sent.append({"ok": False, "chunk": chunk, "error": "No voice helper found."})
        except Exception as e:
            sent.append({"ok": False, "chunk": chunk, "error": repr(e)})

    return sent

def leeway_handle_performance_runtime_request(text):
    import requests
    import traceback

    request_text = str(text or "").strip()
    mode = leeway_performance_mode(request_text)
    url = leeway_performance_runtime_url() + "/performance/create"

    intro_voice = "I got it. This is a performance request. I am writing it, structuring it, and sending it through my power level ten performance runtime."
    intro_text = "PERFORMANCE REQUEST CAPTURED\nMode: " + mode + "\nRuntime: leeway_performance_runtime\nPower Level: 10"

    try:
        if "leeway_send_voice_first_then_text" in globals():
            leeway_send_voice_first_then_text(intro_text, voice_text=intro_voice)
        else:
            send_message(intro_text, voice=False)
    except Exception:
        pass

    try:
        r = requests.post(
            url,
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
        err = "PERFORMANCE_RUNTIME_FAILED: " + repr(e) + "\n" + traceback.format_exc()[-1500:]
        try:
            send_message(err, voice=False)
        except TypeError:
            send_message(err)
        return ""

    perf = data.get("performance", {})
    package = perf.get("package", {})
    chunks = package.get("performance_chunks", [])
    lyrics = package.get("lyrics", "")
    truth = package.get("truth", {})
    receipt = data.get("receipt", {})

    voice_sent = leeway_performance_speak_chunks(chunks[:4])

    lines = []
    lines.append("AGENT LEE PERFORMANCE PACKAGE")
    lines.append("")
    lines.append("Mode: " + str(package.get("mode")))
    lines.append("Title: " + str(package.get("title")))
    lines.append("Power Level: 10")
    lines.append("")
    lines.append("Truth:")
    for k, v in truth.items():
        lines.append("- " + str(k) + ": " + str(v))
    if package.get("singing_blocker"):
        lines.append("")
        lines.append("Singing blocker:")
        lines.append(str(package.get("singing_blocker")))
    lines.append("")
    lines.append("Voice chunks attempted: " + str(len(voice_sent)))
    lines.append("")
    lines.append("Lyrics:")
    lines.append(str(lyrics))
    lines.append("")
    lines.append("Receipt: " + str(receipt.get("receipt_path")))

    try:
        send_message("\n".join(lines), voice=False)
    except TypeError:
        send_message("\n".join(lines))

    return ""

# END LEEWAY TELEGRAM PERFORMANCE ROUTING LEVEL 10
'''

if "LEEWAY TELEGRAM PERFORMANCE ROUTING LEVEL 10" not in src:
    marker = "def handle_command(text):"
    if marker not in src:
        raise RuntimeError("Could not find exact def handle_command(text): marker.")
    src = src.replace(marker, helper + "\n\n" + marker, 1)

needle = "def handle_command(text):\n"
injection = "def handle_command(text):\n    if leeway_performance_request_required(text):\n        return leeway_handle_performance_runtime_request(text)\n"

if injection not in src:
    if needle not in src:
        raise RuntimeError("Could not find handle_command insertion point.")
    src = src.replace(needle, injection, 1)

path.write_text(src, encoding="utf-8")

