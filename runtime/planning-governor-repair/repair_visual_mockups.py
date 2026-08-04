from pathlib import Path
import re

path = Path(r"E:\\\\.LeeWay-Produucts-File\\\\Leeway-Ecosystem v2.1.4\\\\Services\\\\leeway_skill_router\\\\app.py")
src = path.read_text(encoding="utf-8")

# Ensure IMAGE_SERVICE env exists.
if "IMAGE_SERVICE =" not in src:
    marker = 'MEETING_RUNTIME = os.environ.get("LEEWAY_MEETING_RUNTIME_URL", "http://leeway_meeting_runtime:5329").rstrip("/")'
    if marker in src:
        src = src.replace(
            marker,
            marker + '\nIMAGE_SERVICE = os.environ.get("AGENT_LEE_IMAGE_SERVICE_URL", "http://agent-lee-sdxl-lightning-image-lane:8095").rstrip("/")',
            1
        )
    else:
        insert_after = 'MEETING_RUNTIME = os.environ.get("LEEWAY_MEETING_RUNTIME_URL"'
        raise RuntimeError("Could not find MEETING_RUNTIME env line to attach IMAGE_SERVICE.")

helper = r'''

# ---------------------------------------------------------------------
# LEEWAY PLAN VISUAL MOCKUP PREVIEW GENERATION
# Major visual plans must include preview images before approval.
# Repair-safe version.
# ---------------------------------------------------------------------

def leeway_mockup_prompt(plan: Dict[str, Any], mockup: Dict[str, Any]):
    domain = plan.get("domain", "")
    original = plan.get("original_request", "")
    name = mockup.get("name", "")
    desc = mockup.get("description", "")

    if domain == "website":
        return (
            "Professional website mockup preview, dark premium Leeway Industries style, "
            "full landing page layout, header navigation, hero section, modern 3D objects, "
            "video/avatar explainer section, footer, polished tech-business aesthetic, "
            "clean spacing, high contrast, executive presentation quality. "
            f"Direction: {name}. Details: {desc}. User request: {original}"
        )

    if domain == "infographic":
        return (
            "Professional infographic preview, clean visual hierarchy, modern Leeway style, "
            "dark background, glowing blue and green accents, six-card layout, icons, arrows, "
            "clear title and readable sections. "
            f"Direction: {name}. Details: {desc}. User request: {original}"
        )

    return (
        "Professional visual concept preview, clean composition, polished Leeway design system, "
        f"Direction: {name}. Details: {desc}. User request: {original}"
    )


def leeway_try_image_endpoints(prompt: str):
    payloads = [
        {"prompt": prompt, "source": "planning_governor", "return_image": True},
        {"text": prompt, "prompt": prompt, "source": "planning_governor"},
    ]

    endpoints = [
        IMAGE_SERVICE + "/image/generate-fast",
        IMAGE_SERVICE + "/generate-fast",
        IMAGE_SERVICE + "/generate",
        IMAGE_SERVICE + "/render",
    ]

    attempts = []

    for endpoint in endpoints:
        for payload in payloads:
            try:
                r = requests.post(endpoint, json=payload, timeout=240)
                body = r.text[:4000]
                item = {
                    "endpoint": endpoint,
                    "status": r.status_code,
                    "ok": r.status_code < 400,
                    "body": body
                }

                if r.status_code < 400:
                    try:
                        data = r.json()
                    except Exception:
                        data = {"raw": body}

                    item["data"] = data

                    image_url = ""
                    for key in ["image_url", "url", "latest_url", "candidate_url", "public_url"]:
                        if isinstance(data, dict) and data.get(key):
                            image_url = data.get(key)
                            break

                    if not image_url and isinstance(data, dict):
                        for key in ["images", "files", "candidates", "outputs"]:
                            vals = data.get(key)
                            if isinstance(vals, list) and vals:
                                first = vals[0]
                                if isinstance(first, str):
                                    image_url = first
                                elif isinstance(first, dict):
                                    image_url = first.get("url") or first.get("image_url") or first.get("path") or ""

                    item["image_url"] = image_url
                    attempts.append(item)

                    return {
                        "ok": True,
                        "endpoint": endpoint,
                        "image_url": image_url,
                        "data": data,
                        "attempts": attempts
                    }

                attempts.append(item)

            except Exception as e:
                attempts.append({
                    "endpoint": endpoint,
                    "ok": False,
                    "error": repr(e)
                })

    return {
        "ok": False,
        "image_url": "",
        "attempts": attempts
    }


def leeway_generate_mockup_preview(plan: Dict[str, Any], mockup: Dict[str, Any]):
    prompt = leeway_mockup_prompt(plan, mockup)
    result = leeway_try_image_endpoints(prompt)

    return {
        "mockup_id": mockup.get("mockup_id", ""),
        "name": mockup.get("name", ""),
        "description": mockup.get("description", ""),
        "prompt": prompt,
        "image_generation": result,
        "image_url": result.get("image_url", ""),
        "created_at": now_iso()
    }


def leeway_attach_visual_previews(plan: Dict[str, Any]):
    domain = plan.get("domain", "")

    if domain not in ["website", "infographic"]:
        plan["visual_previews"] = []
        plan["visual_preview_status"] = "NOT_REQUIRED"
        return plan

    previews = []
    for mockup in plan.get("mockups", [])[:2]:
        previews.append(leeway_generate_mockup_preview(plan, mockup))

    plan["visual_previews"] = previews
    plan["visual_preview_status"] = "READY" if any(p.get("image_url") for p in previews) else "ATTEMPTED_NO_IMAGE_RETURNED"
    plan["updated_at"] = now_iso()
    return plan

'''

# Insert helper before save_plan exactly once.
if "def leeway_attach_visual_previews" not in src:
    marker = "def save_plan(plan: Dict[str, Any]):"
    if marker not in src:
        raise RuntimeError("Could not find save_plan marker.")
    src = src.replace(marker, helper + "\n\n" + marker, 1)

# Ensure create_plan calls preview attachment before save_plan exactly once.
if "plan = leeway_attach_visual_previews(plan)" not in src:
    target = "    save_plan(plan)\n\n    receipt = write_receipt(\"plan_created\""
    replacement = "    plan = leeway_attach_visual_previews(plan)\n    save_plan(plan)\n\n    receipt = write_receipt(\"plan_created\""
    if target not in src:
        raise RuntimeError("Could not find create_plan save_plan/receipt block.")
    src = src.replace(target, replacement, 1)

# Remove accidental duplicated preview attach lines if any.
src = re.sub(
    r"(    plan = leeway_attach_visual_previews\(plan\)\n){2,}",
    "    plan = leeway_attach_visual_previews(plan)\n",
    src
)

path.write_text(src, encoding="utf-8")

