"""
Agent Lee Voice Kernel - Update Package Loader
Loads the active hot-update package metadata without tearing down the container.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


DEFAULT_UPDATE_PACKAGE_PATH = "/app/voice_update_package.json"


def load_update_package(package_path: str = DEFAULT_UPDATE_PACKAGE_PATH) -> Dict[str, Any]:
    path = Path(package_path)
    if not path.exists():
        return {
            "loaded": False,
            "packagePath": str(path),
            "reason": "missing"
        }
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return {
        "loaded": True,
        "packagePath": str(path),
        "package": payload
    }
