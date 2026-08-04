from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\runtime\\\\telegram-artifact-routing-repair\\\\agent_lee_telegram_shell.py")
src = path.read_text(encoding="utf-8")

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY TELEGRAM ARTIFACT PLANNING AND TODO ENFORCEMENT
# Artifact-producing requests must not fall back to persona chatter.
# They must create a to-do list, route through the planning governor,
# attempt artifact generation when possible, and report completion state.
# ---------------------------------------------------------------------

def leeway_artifact_runtime_required(text):
    import re
    t = str(text or "").lower()

    strong_terms = [
        "create me an image",
        "create an image",
        "make me an image",
        "make an image",
        "generate image",
        "generate an image",
        "draw",
        "render",
        "visualize",
        "design",
        "create that image",
        "make that image",
        "3d figurine",
        "3d figure",
        "3d model",
        "turn it into 3d",
        "make it 3d",
        "website",
        "slide deck",
        "powerpoint",
        "document",
        "pdf",
        "infographic",
        "video script",
        "podcast",
        "story package",
        "logo",
        "flyer",
        "proposal"
    ]

    for term in strong_terms:
        if term in t:
            return True

    if re.search(r"\b(create|make|generate|build|design|render|draw|produce)\b", t):
        if re.search(r"\b(image|picture|art|visual|poster|flyer|logo|website|page|deck|slides|pdf|document|infographic|video|3d|figurine|model|character|warrior|mage|lion)\b", t):
            return True

    return False

def leeway_artifact_todo_items(text):
    t = str(text or "").lower()
    items = [
        "Capture the user's artifact request exactly.",
        "Create a governed runtime plan.",
        "Identify required lanes and tools.",
        "Create a completion to-do list.",
        "Attempt artifact generation or create an execution work order.",
        "Return proof, artifact link, or exact blocker.",
        "Send voice-first status and then text transcript."
    ]

    if "image" in t or "lion" in t or "visual" in t or "draw" in t or "render" in t:
        items.append("Route image work to the visual/image lane.")
    if "3d" in t or "figurine" in t or "model" in t:
        items.append("Route 3D figurine/model concept to the 3D lane or create a 3D work order.")
    if "website" in t or "page" in t:
        items.append("Route website work to the website/browser/artifact viewer lanes.")

    return items

def leeway_write_artifact_todo_receipt(text, router_data=None, image_result=None):
    import json
    import os
    import time
    import uuid

    out_dir = "/tmp/agent-lee-artifact-todos"
    os.makedirs(out_dir, exist_ok=True)

    todo_id = "artifact-todo-" + str(int(time.time())) + "-" + uuid.uuid4().hex[:8]
    receipt = {
        "verdict": "AGENT_LEE_ARTIFACT_TODO_CREATED",
        "todo_id": todo_id,
        "request": str(text or ""),
        "todo": leeway_artifact_todo_items(text),
        "router_data": router_data or {},
        "image_result": image_result or {},
        "status": "CREATED",
        "created_at_epoch": time.time()
    }

    path = os.path.join(out_dir, todo_id + ".json")
    latest = os.path.join(out_dir, "latest-artifact-todo.json")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(receipt, f, indent=2)

    with open(latest, "w", encoding="utf-8") as f:
        json.dump(receipt, f, indent=2)

    receipt["receipt_path"] = path
    return receipt

def leeway_send_voice_status_then_text(text, voice_text=None):
    if "leeway_send_voice_first_then_text" in globals():
        try:
            return leeway_send_voice_first_then_text(text, voice_text=voice_text or text)
        except TypeError:
            try:
                return leeway_send_voice_first_then_text(text)
            except Exception:
                pass
        except Exception:
            pass

    try:
        send_message(text, voice=False)
    except TypeError:
        send_message(text)

    return {"voice_sent": False, "voice_error": "voice-first helper unavailable"}

def leeway_format_todo_for_text(items):
    lines = []
    for i, item in enumerate(items, 1):
        lines.append(str(i) + ". " + str(item))
    return "\n".join(lines)

def leeway_get_router_url():
    import os
    return os.environ.get("LEEWAY_SKILL_ROUTER_URL", "http://leeway_skill_router:5324").rstrip("/")

def leeway_get_image_service_url():
    import os
    return os.environ.get("AGENT_LEE_IMAGE_SERVICE_URL", "http://agent-lee-sdxl-lightning-image-lane:8095").rstrip("/")

def leeway_post_json(url, payload, timeout_seconds=45):
    import requests
    r = requests.post(url, json=payload, timeout=timeout_seconds)
    r.raise_for_status()
    try:
        return r.json()
    except Exception:
        return {"ok": True, "raw": r.text[:4000]}

def leeway_try_generate_image_file(prompt):
    import os
    import time
    import requests
    import base64

    base = leeway_get_image_service_url()
    out_dir = "/tmp/agent-lee-generated-images"
    os.makedirs(out_dir, exist_ok=True)

    endpoints = [
        "/image/generate-fast",
        "/generate-fast",
        "/generate",
        "/render"
    ]

    payloads = [
        {"prompt": prompt},
        {"text": prompt},
        {"request": prompt}
    ]

    attempts = []

    for ep in endpoints:
        url = base + ep
        for payload in payloads:
            try:
                r = requests.post(url, json=payload, timeout=(10, 90))
                content_type = r.headers.get("content-type", "")
                attempts.append({"endpoint": ep, "status": r.status_code, "content_type": content_type})

                if r.status_code < 200 or r.status_code >= 300:
                    continue

                data = None
                if "application/json" in content_type:
                    try:
                        data = r.json()
                    except Exception:
                        data = None

                    if isinstance(data, dict):
                        for key in ["image_path", "path", "file", "output_path"]:
                            p = data.get(key)
                            if p and os.path.exists(p):
                                return {
                                    "ok": True,
                                    "mode": "existing_path",
                                    "path": p,
                                    "attempts": attempts,
                                    "data": data
                                }

                        for key in ["image_base64", "base64", "png_base64"]:
                            b64 = data.get(key)
                            if b64:
                                raw = base64.b64decode(b64)
                                ext = ".png"
                                path = os.path.join(out_dir, "agent_lee_image_" + str(int(time.time())) + ext)
                                with open(path, "wb") as f:
                                    f.write(raw)
                                return {
                                    "ok": True,
                                    "mode": "base64",
                                    "path": path,
                                    "attempts": attempts,
                                    "data": data
                                }

                        for key in ["image_url", "url"]:
                            u = data.get(key)
                            if u and str(u).startswith("data:image"):
                                head, b64 = str(u).split(",", 1)
                                raw = base64.b64decode(b64)
                                ext = ".png"
                                path = os.path.join(out_dir, "agent_lee_image_" + str(int(time.time())) + ext)
                                with open(path, "wb") as f:
                                    f.write(raw)
                                return {
                                    "ok": True,
                                    "mode": "data_url",
                                    "path": path,
                                    "attempts": attempts,
                                    "data": {"source": key}
                                }

                raw = r.content or b""
                if raw[:8] == b"\x89PNG\r\n\x1a\n":
                    path = os.path.join(out_dir, "agent_lee_image_" + str(int(time.time())) + ".png")
                    with open(path, "wb") as f:
                        f.write(raw)
                    return {"ok": True, "mode": "png_bytes", "path": path, "attempts": attempts}

                if raw[:3] == b"\xff\xd8\xff":
                    path = os.path.join(out_dir, "agent_lee_image_" + str(int(time.time())) + ".jpg")
                    with open(path, "wb") as f:
                        f.write(raw)
                    return {"ok": True, "mode": "jpg_bytes", "path": path, "attempts": attempts}

            except Exception as e:
                attempts.append({"endpoint": ep, "error": repr(e)})

    return {
        "ok": False,
        "error": "Image lane did not return a usable image within timeout.",
        "attempts": attempts
    }

def leeway_send_generated_file(path, caption=None):
    if not path:
        return False

    # Prefer native helpers if present.
    try:
        if "send_photo" in globals():
            send_photo(path, caption=caption or "Agent Lee generated image.")
            return True
    except Exception:
        pass

    try:
        if "send_document" in globals():
            send_document(path, caption=caption or "Agent Lee generated artifact.")
            return True
    except Exception:
        pass

    try:
        send_message("Generated artifact file is available inside the Telegram container at: " + str(path), voice=False)
        return True
    except Exception:
        return False

def leeway_handle_artifact_runtime_request(text):
    import traceback

    request_text = str(text or "").strip()
    todo = leeway_artifact_todo_items(request_text)

    start_voice = "I got it. This is an artifact request, so I am putting it into the Leeway planner and execution to-do list now."
    start_text = "RUNTIME ARTIFACT REQUEST CAPTURED\n\nTo-do list:\n" + leeway_format_todo_for_text(todo)

    leeway_send_voice_status_then_text(start_text, voice_text=start_voice)

    router_data = {}
    image_result = {}

    try:
        router_url = leeway_get_router_url()
        router_data = leeway_post_json(
            router_url + "/route",
            {
                "text": request_text,
                "source": "telegram",
                "user_id": "telegram"
            },
            timeout_seconds=45
        )
    except Exception as e:
        router_data = {
            "ok": False,
            "error": "Router request failed: " + repr(e),
            "trace": traceback.format_exc()[-2000:]
        }

    should_try_image = False
    low = request_text.lower()
    if "image" in low or "lion" in low or "draw" in low or "visual" in low or "render" in low:
        should_try_image = True

    if should_try_image:
        try:
            image_result = leeway_try_generate_image_file(request_text)
            if image_result.get("ok") and image_result.get("path"):
                leeway_send_generated_file(
                    image_result.get("path"),
                    caption="Agent Lee generated image artifact."
                )
        except Exception as e:
            image_result = {
                "ok": False,
                "error": repr(e),
                "trace": traceback.format_exc()[-2000:]
            }

    receipt = leeway_write_artifact_todo_receipt(
        request_text,
        router_data=router_data,
        image_result=image_result
    )

    plan = {}
    if isinstance(router_data, dict):
        plan = router_data.get("plan") or router_data.get("data", {}).get("plan") or {}

    plan_id = plan.get("plan_id") or router_data.get("plan_id") if isinstance(router_data, dict) else ""
    plan_url = plan.get("plan_url") or router_data.get("plan_url") if isinstance(router_data, dict) else ""
    approval_required = router_data.get("approval_required") if isinstance(router_data, dict) else None

    final_lines = []
    final_lines.append("AGENT LEE ARTIFACT TODO STATUS")
    final_lines.append("")
    final_lines.append("Request captured:")
    final_lines.append(request_text)
    final_lines.append("")
    final_lines.append("To-do list:")
    final_lines.append(leeway_format_todo_for_text(todo))
    final_lines.append("")
    final_lines.append("Router ok: " + str(router_data.get("ok") if isinstance(router_data, dict) else False))
    final_lines.append("Approval required: " + str(approval_required))
    if plan_id:
        final_lines.append("Plan ID: " + str(plan_id))
    if plan_url:
        final_lines.append("Plan room: " + str(plan_url))
    final_lines.append("Image attempt ok: " + str(image_result.get("ok") if isinstance(image_result, dict) else False))
    if isinstance(image_result, dict) and image_result.get("path"):
        final_lines.append("Image path: " + str(image_result.get("path")))
    if isinstance(image_result, dict) and image_result.get("error"):
        final_lines.append("Image blocker: " + str(image_result.get("error")))
    final_lines.append("Receipt: " + str(receipt.get("receipt_path")))

    voice_summary = "I captured the artifact request, created the to-do list, routed it to the planner, and attempted the image lane. Check the result and receipt now."
    leeway_send_voice_status_then_text("\n".join(final_lines), voice_text=voice_summary)

    return ""

# END LEEWAY TELEGRAM ARTIFACT PLANNING AND TODO ENFORCEMENT
'''

if "LEEWAY TELEGRAM ARTIFACT PLANNING AND TODO ENFORCEMENT" not in src:
    marker = "def handle_command(text):"
    if marker not in src:
        raise RuntimeError("Could not find exact def handle_command(text): marker.")
    src = src.replace(marker, helper + "\n\n" + marker, 1)

needle = "def handle_command(text):\n"
injection = "def handle_command(text):\n    if leeway_artifact_runtime_required(text):\n        return leeway_handle_artifact_runtime_request(text)\n"

if injection not in src:
    if needle not in src:
        raise RuntimeError("Could not find handle_command body insertion point.")
    src = src.replace(needle, injection, 1)

path.write_text(src, encoding="utf-8")

