from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-shell-patch\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

helper = r'''

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

'''

if "def leeway_targeted_router_delivery" not in src:
    marker = "\ndef handle_command(text):"
    if marker not in src:
        raise RuntimeError("Could not find def handle_command(text):")

    src = src.replace(marker, helper + marker, 1)

if "LEEWAY_TARGETED_ROUTER_FIRST_ACTIVE" not in src:
    pattern = r"def handle_command\(text\):\n"
    injection = r'''def handle_command(text):
    # LEEWAY_TARGETED_ROUTER_FIRST_ACTIVE
    # Artifact-producing commands must not fall into ask_brain/persona chat first.
    try:
        if leeway_targeted_should_route(text):
            if leeway_targeted_router_delivery(text):
                return ""
    except Exception as e:
        print(f"LEEWAY targeted router-first branch failed: {e}", flush=True)

'''
    src = re.sub(pattern, injection, src, count=1)

path.write_text(src, encoding="utf-8")

