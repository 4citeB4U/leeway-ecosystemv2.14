BLOCKED_TERMS = [
    "looks like leonard",
    "is leonard",
    "race",
    "ethnicity",
    "medical",
    "disabled"
]


def validate_scene_response(text):
    lowered = (text or "").lower()
    blockers = [term for term in BLOCKED_TERMS if term in lowered]
    return {
        "ok": len(blockers) == 0,
        "blockers": blockers,
        "truthLabels": ["ROOM_VISION_PRIVACY_FILTER_APPLIED"]
    }
