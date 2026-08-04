from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-executive-operating-layer\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM EXECUTIVE OPERATING LAYER
# Serious requests must enter the executive runtime first.
# This enforces: attention protection, accord, Workboard, to-do list,
# discovery checks, approval detection, runtime routing, visible trace,
# and one voice message before text.
# ---------------------------------------------------------------------

def leeway_executive_runtime_url():
    import os
    return os.environ.get("LEEWAY_EXECUTIVE_RUNTIME_URL", "http://leeway_executive_runtime:5340").rstrip("/")

def leeway_executive_request_required(text):
    import re
    t = str(text or "").lower().strip()

    if len(t) > 140:
        return True

    serious_terms = [
        "create", "build", "generate", "make", "design", "produce",
        "website", "story", "pdf", "movie", "script", "song", "rap",
        "email", "calendar", "schedule", "phone", "call", "research",
        "proposal", "deck", "image", "automation", "workflow", "docker",
        "container", "runtime", "diagnostic", "repair", "system",
        "outreach", "campaign", "follow up", "follow-up"
    ]

    if any(term in t for term in serious_terms):
        return True

    return False

def leeway_executive_voice_summary(packet):
    try:
        phrase = packet.get("status_phrase") or "I got it. I am mapping the work now."
        task_type = packet.get("task_type") or "general"
        lanes = packet.get("required_lanes") or []
        approval = packet.get("approval_required")
        if lanes:
            lane_text = ", ".join([str(x) for x in lanes[:3]])
            return phrase + " I classified this as " + str(task_type) + ". I am checking " + lane_text + " and building the visible task list now."
        return phrase + " I classified this as " + str(task_type) + " and I am building the visible task list now."
    except Exception:
        return "I got it. I am building the visible task list and checking the runtime lanes now."

def leeway_executive_format_packet(packet):
    lines = []
    lines.append("EXECUTIVE OPERATING LAYER")
    lines.append("")
    lines.append("Status: " + str(packet.get("status", "EXECUTIVE_PACKET_CREATED")))
    lines.append("Task type: " + str(packet.get("task_type")))
    lines.append("Complexity: " + str(packet.get("complexity")))
    lines.append("Approval required: " + str(packet.get("approval_required")))
    lines.append("Workboard task: " + str(packet.get("workboard_task_id")))
    lines.append("")
    lines.append("Required lanes:")
    for lane in packet.get("required_lanes", []):
        lines.append("- " + str(lane))
    lines.append("")
    lines.append("Visible to-do:")
    steps = packet.get("visible_trace", {}).get("steps", [])
    for step in steps:
        marker = "[ ]"
        if step.get("status") == "DONE":
            marker = "[x]"
        elif step.get("status") == "ACTIVE":
            marker = "[...]"
        lines.append(marker + " " + str(step.get("text")))
    receipt = packet.get("receipt", {})
    if receipt:
        lines.append("")
        lines.append("Receipt: " + str(receipt.get("receipt_path")))
    lines.append("")
    lines.append("Open executive board: http://localhost:5340")
    lines.append("Open workboard: http://localhost:5339")
    return "\n".join(lines)

def leeway_executive_send_one_voice_then_text(text, voice_text=None):
    # Use existing single-voice helper if available.
    if "leeway_send_one_voice_then_text" in globals():
        return leeway_send_one_voice_then_text(text, voice_text=voice_text or text)

    if "leeway_send_voice_first_then_text" in globals():
        try:
            return leeway_send_voice_first_then_text(text, voice_text=voice_text or text)
        except TypeError:
            return leeway_send_voice_first_then_text(text)

    # Fallback to text only if voice helpers are unavailable.
    try:
        send_message(text, voice=False)
    except TypeError:
        send_message(text)
    return {"voice_sent": False, "voice_error": "voice helper unavailable"}

def leeway_handle_executive_operating_request(text):
    import requests
    import traceback

    request_text = str(text or "").strip()

    try:
        r = requests.post(
            leeway_executive_runtime_url() + "/executive/start",
            json={
                "request": request_text,
                "source": "telegram",
                "user_id": "telegram"
            },
            timeout=35
        )
        r.raise_for_status()
        data = r.json()
        packet = data.get("packet", {})
    except Exception as e:
        msg = "EXECUTIVE_LAYER_FAILED: " + repr(e) + "\n" + traceback.format_exc()[-1500:]
        leeway_executive_send_one_voice_then_text(
            msg,
            voice_text="The executive operating layer failed. I am sending the error now."
        )
        return ""

    text_out = leeway_executive_format_packet(packet)
    voice_out = leeway_executive_voice_summary(packet)

    leeway_executive_send_one_voice_then_text(text_out, voice_text=voice_out)
    return ""

# END LEEWAY TELEGRAM EXECUTIVE OPERATING LAYER
'''

if "LEEWAY TELEGRAM EXECUTIVE OPERATING LAYER" not in src:
    marker = "def handle_command(text):"
    if marker not in src:
        raise RuntimeError("Could not find def handle_command(text):")
    src = src.replace(marker, helper + "\n\n" + marker, 1)

route = "def handle_command(text):\n    if leeway_executive_request_required(text):\n        return leeway_handle_executive_operating_request(text)\n"

if "return leeway_handle_executive_operating_request(text)" not in src:
    src = src.replace("def handle_command(text):\n", route, 1)

path.write_text(src, encoding="utf-8")

