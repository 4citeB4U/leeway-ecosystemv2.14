from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-shell-patch\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# Ensure required imports.
# ------------------------------------------------------------
if "import re" not in src:
    src = src.replace("import os", "import os\nimport re", 1) if "import os" in src else "import re\n" + src

if "import time" not in src:
    src = src.replace("import os", "import os\nimport time", 1) if "import os" in src else "import time\n" + src

# ------------------------------------------------------------
# Ensure env URLs exist.
# ------------------------------------------------------------
if "LEEWAY_SKILL_ROUTER_URL" not in src:
    src = src.replace(
        "import os",
        'import os\nLEEWAY_SKILL_ROUTER_URL = os.environ.get("LEEWAY_SKILL_ROUTER_URL", "http://leeway_skill_router:5324").rstrip("/")',
        1
    )

if "LEEWAY_ARTIFACT_VIEWER_URL" not in src:
    marker = 'LEEWAY_SKILL_ROUTER_URL = os.environ.get("LEEWAY_SKILL_ROUTER_URL", "http://leeway_skill_router:5324").rstrip("/")'
    if marker in src:
        src = src.replace(
            marker,
            marker + '\nLEEWAY_ARTIFACT_VIEWER_URL = os.environ.get("LEEWAY_ARTIFACT_VIEWER_URL", "http://leeway_artifact_viewer:5328").rstrip("/")',
            1
        )
    else:
        src = 'LEEWAY_ARTIFACT_VIEWER_URL = os.environ.get("LEEWAY_ARTIFACT_VIEWER_URL", "http://leeway_artifact_viewer:5328").rstrip("/")\n' + src

# ------------------------------------------------------------
# Add hard delivery helpers.
# ------------------------------------------------------------
helpers = r'''

# ---------------------------------------------------------------------
# LEEWAY LIVE DELIVERY PATCH
# Rule:
# - Creative/artifact/meeting/document requests route through skill router first.
# - Audio is attempted before text.
# - Delivery text must include room/PDF/calendar links when returned.
# ---------------------------------------------------------------------

LEEWAY_ROUTER_FORCE_PATTERNS = [
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


def leeway_should_force_router(text):
    t = str(text or "").lower().strip()
    return any(p in t for p in LEEWAY_ROUTER_FORCE_PATTERNS)


def leeway_deep_find_first(obj, keys):
    if isinstance(keys, str):
        keys = [keys]
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k]:
                return obj[k]
        for v in obj.values():
            found = leeway_deep_find_first(v, keys)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = leeway_deep_find_first(item, keys)
            if found:
                return found
    return ""


def leeway_build_delivery_text(router_data):
    answer = router_data.get("answer", "") if isinstance(router_data, dict) else ""
    skill = router_data.get("skill", "") if isinstance(router_data, dict) else ""

    room_url = leeway_deep_find_first(router_data, ["room_url", "leeway_link"])
    pdf_url = leeway_deep_find_first(router_data, ["pdf_url"])
    artifact_url = leeway_deep_find_first(router_data, ["artifact_download_url", "artifact_url"])
    creative_id = leeway_deep_find_first(router_data, ["creative_id"])
    notebook_id = leeway_deep_find_first(router_data, ["notebook_id"])
    meeting_id = leeway_deep_find_first(router_data, ["meeting_id"])
    ics_url = leeway_deep_find_first(router_data, ["ics_url"])

    lines = []

    if answer:
        lines.append(str(answer))

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

    return "\n".join(lines).strip() or "Agent Lee completed the routed task, but no delivery link was returned."


def leeway_normalize_internal_url(url):
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


def leeway_download_artifact_for_telegram(router_data):
    url = leeway_deep_find_first(router_data, ["pdf_url", "artifact_download_url", "artifact_url"])
    url = leeway_normalize_internal_url(url)
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
        outpath = os.path.join(outdir, filename)

        with urllib.request.urlopen(url, timeout=90) as r:
            data = r.read()

        with open(outpath, "wb") as f:
            f.write(data)

        if os.path.exists(outpath) and os.path.getsize(outpath) > 0:
            return outpath
    except Exception as e:
        print("LEEWAY artifact download failed:", repr(e))

    return ""


def leeway_call_skill_router(text):
    try:
        import json
        import urllib.request

        payload = {
            "text": str(text or ""),
            "source": "telegram-live",
            "user_id": "owner",
            "execute": True
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            LEEWAY_SKILL_ROUTER_URL + "/route",
            data=data,
            method="POST",
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception as e:
        print("LEEWAY skill router call failed:", repr(e))
        return None


def leeway_send_audio_then_text(text):
    text = str(text or "").strip()
    if not text:
        return False

    audio_sent = False

    try:
        audio_path = speak_to_file(text)
        if audio_path:
            send_audio(audio_path, "Agent Lee voice.")
            audio_sent = True
    except Exception as e:
        print("LEEWAY audio-before-text failed:", repr(e))

    try:
        send_text_message(text)
    except NameError:
        try:
            raw_send_message(text)
        except Exception as e:
            print("LEEWAY text send fallback failed:", repr(e))
    except Exception as e:
        print("LEEWAY text send failed:", repr(e))

    return audio_sent


def leeway_router_first_delivery(text):
    data = leeway_call_skill_router(text)
    if not data:
        return False

    delivery_text = leeway_build_delivery_text(data)

    # User requirement: audio first, then text.
    leeway_send_audio_then_text(delivery_text)

    artifact_path = leeway_download_artifact_for_telegram(data)
    if artifact_path:
        try:
            send_document(artifact_path, "Agent Lee artifact.")
        except Exception as e:
            print("LEEWAY send_document failed:", repr(e))

    return True

'''

if "def leeway_router_first_delivery" not in src:
    if "def handle_command" in src:
        src = src.replace("def handle_command", helpers + "\n\ndef handle_command", 1)
    else:
        src += "\n" + helpers + "\n"

# ------------------------------------------------------------
# Preserve original text-only sender if possible.
# Many existing shells call send_message(). We wrap it so audio goes first.
# ------------------------------------------------------------
if "raw_send_message = send_message" not in src and "def send_message" in src:
    src = re.sub(r"\ndef send_message\s*\(", "\ndef raw_send_message(", src, count=1)

    wrapper = r'''

def send_text_message(text):
    return raw_send_message(text)


def send_message(text):
    # Global rule: Agent Lee speaks first, then sends the text.
    return leeway_send_audio_then_text(text)

'''
    insert_at = src.find("\ndef raw_send_message")
    next_def = src.find("\ndef ", insert_at + 1)
    if next_def != -1:
        next_next_def = src.find("\ndef ", next_def + 1)
        # Safer: append wrapper after helper section.
        src += "\n" + wrapper
    else:
        src += "\n" + wrapper

# ------------------------------------------------------------
# Force router-first inside handle_command().
# ------------------------------------------------------------
m = re.search(r"def handle_command\s*\(([^)]*)\):", src)
if m and "LEEWAY_FORCE_ROUTER_PATCH_ACTIVE" not in src:
    start = m.end()
    injection = r'''
    # LEEWAY_FORCE_ROUTER_PATCH_ACTIVE
    try:
        incoming_text = text if "text" in locals() else ""
    except Exception:
        incoming_text = ""

    if leeway_should_force_router(incoming_text):
        routed = leeway_router_first_delivery(incoming_text)
        if routed:
            return
'''
    src = src[:start] + "\n" + injection + src[start:]

# ------------------------------------------------------------
# Also patch existing try_skill_router_first() if present.
# ------------------------------------------------------------
if "def try_skill_router_first" in src:
    src = re.sub(
        r"def try_skill_router_first\s*\(text\):[\s\S]*?(?=\ndef |\Z)",
        r'''def try_skill_router_first(text):
    return leeway_router_first_delivery(text)

''',
        src,
        count=1
    )

path.write_text(src, encoding="utf-8")

