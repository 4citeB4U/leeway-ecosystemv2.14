"""
Agent Lee Voice Kernel - Event Timeline Helpers
Builds a clean event trail for synthesis and playback.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_timeline(action: str, text: str, output_path: str | None = None) -> List[Dict[str, str]]:
    timeline = [
        {"event": "requested", "at": now_iso(), "action": action, "text": text},
        {"event": "engine_selected", "at": now_iso(), "engine": "XTTS-v2"},
    ]
    if output_path:
        timeline.append({"event": "output_planned", "at": now_iso(), "path": output_path})
    return timeline
