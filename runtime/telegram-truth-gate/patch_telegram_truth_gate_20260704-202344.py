from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-truth-gate\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

# Remove any previously broken duplicate truth gate block if needed.
src = re.sub(
    r"\n# ---------------------------------------------------------------------\n# LEEWAY TELEGRAM TRUTH GATE[\s\S]*?# END LEEWAY TELEGRAM TRUTH GATE\n",
    "\n",
    src
)

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM TRUTH GATE
# Agent Lee must check canonical architecture truth before claiming
# capability or routing serious work.
# ---------------------------------------------------------------------

def leeway_truth_service_url():
    import os
    return os.environ.get("LEEWAY_TRUTH_SERVICE_URL", "http://leeway_agent_skills:5327").rstrip("/")

def leeway_truth_classify_task_type(text):
    t = str(text or "").lower().strip()

    if any(x in t for x in ["research", "investigate", "study", "prior art", "market"]):
        return "research"
    if any(x in t for x in ["website", "web site", "landing page", "homepage", "webpage"]):
        return "website"
    if any(x in t for x in ["story", "storybook", "book", "chapter", "novel"]):
        return "story"
    if any(x in t for x in ["pdf", "document", "proposal", "report"]):
        return "pdf"
    if any(x in t for x in ["image", "picture", "draw", "render", "poster", "logo", "art"]):
        return "image"
    if any(x in t for x in ["movie", "film", "screenplay", "script", "trailer", "cinematic"]):
        return "movie"
    if any(x in t for x in ["song", "sing", "chorus", "melody", "music"]):
        return "song"
    if any(x in t for x in ["rap", "bars", "verse", "spit"]):
        return "rap"
    if any(x in t for x in ["email", "inbox", "message them", "send message", "correspondence"]):
        return "email"
    if any(x in t for x in ["calendar", "schedule", "meeting", "appointment"]):
        return "calendar"
    if any(x in t for x in ["call", "phone", "dial"]):
        return "phone"
    if any(x in t for x in ["browser", "web search", "click", "open page", "go to website"]):
        return "browser"
    if any(x in t for x in ["desktop", "mouse", "keyboard", "cursor", "screen", "computer control"]):
        return "desktop"
    if any(x in t for x in ["conference", "meeting room", "jitsi", "room link"]):
        return "meeting"
    if any(x in t for x in ["docker", "container", "health", "runtime", "system", "diagnostic", "repair"]):
        return "system"

    return "general"

def leeway_truth_gate_required(text):
    t = str(text or "").lower().strip()

    if len(t) > 140:
        return True

    serious_terms = [
        "create", "build", "generate", "make", "design", "produce",
        "send", "call", "schedule", "email", "calendar", "phone",
        "website", "story", "pdf", "movie", "script", "song", "rap",
        "image", "poster", "logo", "automation", "workflow", "docker",
        "container", "runtime", "diagnostic", "repair", "conference",
        "desktop", "browser", "click", "control", "install", "publish"
    ]

    return any(term in t for term in serious_terms)

def leeway_truth_fetch_task(task_type):
    import requests

    url = leeway_truth_service_url() + "/truth/task/" + str(task_type)
    r = requests.get(url, timeout=12)
    r.raise_for_status()
    return r.json()

def leeway_truth_fetch_summary():
    import requests

    url = leeway_truth_service_url() + "/truth/summary"
    r = requests.get(url, timeout=12)
    r.raise_for_status()
    return r.json()

def leeway_truth_status_from_task(task_truth):
    blockers = task_truth.get("blockers") or []
    lanes = task_truth.get("lanes") or []
    lane_names = task_truth.get("lane_names") or []

    if not lanes and not lane_names:
        return "UNKNOWN"

    if not blockers:
        return "LIVE_OR_AVAILABLE"

    blocker_text = " ".join([str(b.get("blocker", "")) for b in blockers]).upper()

    if "DOWN" in blocker_text:
        return "DOWN"
    if "NEEDS_DEVICE" in blocker_text or "NATIVE" in blocker_text:
        return "NEEDS_DEVICE_WIRING"
    if "PROVIDER" in blocker_text or "CREDENTIAL" in blocker_text:
        return "NEEDS_PROVIDER"
    if "PARTIAL" in blocker_text:
        return "PARTIAL"
    if "UNKNOWN" in blocker_text or "REVIEW" in blocker_text:
        return "UNKNOWN_REVIEW"

    return "PARTIAL"

def leeway_truth_format_blockers(blockers):
    if not blockers:
        return "None"

    lines = []
    for b in blockers:
        lines.append(
            "- "
            + str(b.get("container", "unknown"))
            + " / "
            + str(b.get("role", "unknown"))
            + " => "
            + str(b.get("blocker", "unknown"))
        )
    return "\n".join(lines)

def leeway_truth_voice_line(task_type, capability_status):
    if capability_status == "LIVE_OR_AVAILABLE":
        return "I checked the system truth map. The lane is available. I am routing it now."
    if capability_status == "PARTIAL":
        return "I checked the system truth map. This lane is partial, so I will proceed only to the verified point and report blockers."
    if capability_status == "NEEDS_PROVIDER":
        return "I checked the system truth map. This needs provider credentials before I can complete the outside action."
    if capability_status == "NEEDS_DEVICE_WIRING":
        return "I checked the system truth map. This needs device wiring before I can truly control that lane."
    if capability_status == "DOWN":
        return "I checked the system truth map. A required lane is down, so I am sending the blocker."
    return "I checked the system truth map. This route needs review before I claim capability."

def leeway_truth_send_one_voice_then_text(text, voice_text=None):
    if "leeway_send_one_voice_then_text" in globals():
        return leeway_send_one_voice_then_text(text, voice_text=voice_text or text)

    if "leeway_send_voice_first_then_text" in globals():
        try:
            return leeway_send_voice_first_then_text(text, voice_text=voice_text or text)
        except TypeError:
            return leeway_send_voice_first_then_text(text)

    try:
        send_message(text, voice=False)
    except TypeError:
        send_message(text)

    return {"voice_sent": False, "voice_error": "voice helper unavailable"}

def leeway_truth_gate_report(text, task_type, task_truth, summary=None):
    capability_status = leeway_truth_status_from_task(task_truth)
    lanes = task_truth.get("lane_names") or []
    blockers = task_truth.get("blockers") or []

    lines = []
    lines.append("AGENT LEE TRUTH GATE")
    lines.append("")
    lines.append("Request classified as: " + str(task_type))
    lines.append("Capability status: " + str(capability_status))
    lines.append("Truth source: " + str(task_truth.get("truth_source", "canonical architecture")))
    lines.append("")
    lines.append("Required lanes:")
    if lanes:
        for lane in lanes:
            lines.append("- " + str(lane))
    else:
        lines.append("- No lane found in canonical architecture.")
    lines.append("")
    lines.append("Blockers:")
    lines.append(leeway_truth_format_blockers(blockers))
    if summary:
        lines.append("")
        lines.append("System truth summary:")
        lines.append("- Containers: " + str(summary.get("container_count")))
        lines.append("- Placeholder/provider/unknown: " + str(summary.get("placeholder_review_count")))
        lines.append("- Missing known services: " + str(summary.get("missing_known_count")))
        lines.append("- Redacted secret-like keys: " + str(summary.get("secrets_detected_count")))
    lines.append("")
    lines.append("Policy:")
    lines.append("- I will not claim a lane is complete unless the truth map and receipts support it.")
    lines.append("- External actions still require approval.")
    lines.append("- Partial lanes can prepare work, but cannot be called fully wired.")

    return "\n".join(lines)

def leeway_truth_gate_allows_execution(capability_status):
    return capability_status in ["LIVE_OR_AVAILABLE", "PARTIAL", "NEEDS_PROVIDER", "NEEDS_DEVICE_WIRING"]

def leeway_truth_gate_should_stop_before_old_handler(capability_status, task_type):
    # Stop immediately for lanes that must not pretend they are wired.
    if capability_status in ["DOWN", "UNKNOWN", "UNKNOWN_REVIEW"]:
        return True

    # Phone and desktop should not flow into fake execution unless properly wired.
    if task_type in ["phone", "desktop"] and capability_status in ["PARTIAL", "NEEDS_DEVICE_WIRING", "NEEDS_PROVIDER"]:
        return True

    # Email/calendar can prepare, but external send/create must remain approval/provider gated.
    if task_type in ["email", "calendar"] and capability_status in ["NEEDS_PROVIDER"]:
        return True

    return False

def leeway_handle_truth_gate_request(text):
    import traceback

    request_text = str(text or "").strip()
    task_type = leeway_truth_classify_task_type(request_text)

    try:
        task_truth = leeway_truth_fetch_task(task_type)
        try:
            summary = leeway_truth_fetch_summary()
        except Exception:
            summary = None
    except Exception as e:
        msg = (
            "TRUTH_GATE_FAILED\n\n"
            + "I could not reach the canonical truth service, so I will not claim capability.\n\n"
            + "Error: " + repr(e) + "\n\n"
            + traceback.format_exc()[-1500:]
        )
        leeway_truth_send_one_voice_then_text(
            msg,
            voice_text="The truth gate failed. I am sending the blocker now."
        )
        return ""

    capability_status = leeway_truth_status_from_task(task_truth)
    report = leeway_truth_gate_report(request_text, task_type, task_truth, summary=summary)
    voice_line = leeway_truth_voice_line(task_type, capability_status)

    # Send truth gate report first.
    leeway_truth_send_one_voice_then_text(report, voice_text=voice_line)

    # Stop for unsafe/unwired/down/unknown lanes.
    if leeway_truth_gate_should_stop_before_old_handler(capability_status, task_type):
        return ""

    # Let the executive layer take serious requests after truth validation.
    if "leeway_handle_executive_operating_request" in globals():
        return leeway_handle_executive_operating_request(request_text)

    # Fallback to old flow only when executive layer helper is missing.
    return None

# END LEEWAY TELEGRAM TRUTH GATE
'''

marker = "def handle_command(text):"

if marker not in src:
    raise RuntimeError("Could not find def handle_command(text):")

src = src.replace(marker, helper + "\n\n" + marker, 1)

route = '''def handle_command(text):
    if leeway_truth_gate_required(text):
        _truth_gate_result = leeway_handle_truth_gate_request(text)
        if _truth_gate_result is not None:
            return _truth_gate_result
'''

src = src.replace(marker + "\n", route, 1)

path.write_text(src, encoding="utf-8")

