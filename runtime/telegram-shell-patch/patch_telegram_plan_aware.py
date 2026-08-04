from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-shell-patch\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

patch = r'''

# ---------------------------------------------------------------------
# LEEWAY PLAN-AWARE TELEGRAM DELIVERY
# Keeps Agent Lee's OG public voice, but shows plan rooms and approvals.
# ---------------------------------------------------------------------

LEEWAY_PLAN_FORCE_PATTERNS = [
    "create", "build", "design", "make", "write", "draft", "develop", "produce",
    "website", "infographic", "slide deck", "pitch deck", "presentation",
    "story", "song", "rap", "podcast", "video", "business", "hot dog stand",
    "landscaping", "corner store", "proposal", "campaign", "schedule", "appointment",
    "approve", "approved", "run the plan", "go with the plan", "execute the plan"
]


def leeway_plan_should_route(text):
    t = str(text or "").lower().strip()
    if any(x in t for x in ["approve", "run the plan", "go with the plan", "execute the plan"]):
        return True
    major = ["create", "build", "design", "make", "write", "draft", "develop", "produce"]
    objects = ["website", "infographic", "slide", "deck", "story", "song", "rap", "podcast", "video", "business", "proposal", "campaign"]
    return any(x in t for x in major) and any(x in t for x in objects)


def leeway_plan_find(obj, keys):
    if isinstance(keys, str):
        keys = [keys]
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k]:
                return obj[k]
        for v in obj.values():
            found = leeway_plan_find(v, keys)
            if found:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = leeway_plan_find(item, keys)
            if found:
                return found
    return ""


def leeway_plan_delivery_text(data):
    if not isinstance(data, dict):
        return "I hit pressure reading the plan result."

    answer = str(data.get("answer") or "").strip()
    skill = str(data.get("skill") or "").strip()

    plan_id = leeway_plan_find(data, "plan_id")
    plan_url = leeway_plan_find(data, "plan_url")
    approval_required = leeway_plan_find(data, "approval_required")

    room_url = leeway_plan_find(data, ["website_room_url", "room_url", "leeway_link"])
    pdf_url = leeway_plan_find(data, ["pdf_url", "artifact_download_url", "artifact_url"])
    creative_id = leeway_plan_find(data, "creative_id")
    notebook_id = leeway_plan_find(data, "notebook_id")

    lines = []

    if answer:
        lines.append(answer)
    else:
        lines.append("I drew up the Leeway plan and kept the work structured.")

    if skill:
        lines.append("")
        lines.append("Skill: " + skill)

    if plan_id:
        lines.append("Plan ID: " + str(plan_id))
    if creative_id:
        lines.append("Creative ID: " + str(creative_id))
    if notebook_id:
        lines.append("Notebook ID: " + str(notebook_id))

    if plan_url:
        lines.append("")
        lines.append("Plan room:")
        lines.append(str(plan_url))

    if room_url:
        lines.append("")
        lines.append("Result room:")
        lines.append(str(room_url))

    if pdf_url:
        lines.append("")
        lines.append("Supporting file:")
        lines.append(str(pdf_url))

    if approval_required:
        lines.append("")
        lines.append("Approval needed:")
        lines.append("Reply: approve the plan, run the plan, or edit the plan.")

    return "\n".join(lines).strip()


def leeway_plan_router_delivery(text):
    try:
        data = call_skill_router(text)
        if not data:
            return False

        delivery_text = leeway_plan_delivery_text(data)

        # Keep existing safe behavior: try voice first only for routed plan delivery.
        try:
            speak_text = re.sub(r"https?://\S+", "link attached", delivery_text)
            speak_text = re.sub(r"\s+", " ", speak_text).strip()[:VOICE_REPLY_MAX_CHARS]
            audio_path = speak_to_file(speak_text)
            if audio_path:
                send_audio(audio_path, "Agent Lee voice.")
        except Exception as e:
            print(f"LEEWAY plan voice failed: {e}", flush=True)

        send_message(delivery_text, voice=False)

        try:
            artifact_path = download_artifact_for_telegram(data)
            if artifact_path:
                send_document(artifact_path, "Agent Lee artifact.")
        except Exception as e:
            print(f"LEEWAY plan artifact send failed: {e}", flush=True)

        return True
    except Exception as e:
        print(f"LEEWAY plan router delivery failed: {e}", flush=True)
        return False

'''

if "def leeway_plan_router_delivery" not in src:
    marker = "\ndef handle_command(text):"
    if marker not in src:
        raise RuntimeError("Could not find def handle_command(text):")
    src = src.replace(marker, patch + marker, 1)

if "LEEWAY_PLAN_AWARE_HANDLE_COMMAND_ACTIVE" not in src:
    pattern = r"def handle_command\(text\):\n"
    injection = r'''def handle_command(text):
    # LEEWAY_PLAN_AWARE_HANDLE_COMMAND_ACTIVE
    try:
        if leeway_plan_should_route(text):
            if leeway_plan_router_delivery(text):
                return ""
    except Exception as e:
        print(f"LEEWAY plan-aware branch failed: {e}", flush=True)

'''
    src = re.sub(pattern, injection, src, count=1)

path.write_text(src, encoding="utf-8")

