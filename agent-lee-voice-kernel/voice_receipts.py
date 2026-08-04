"""
Agent Lee Voice Kernel - Receipt Writer
Writes local proof for synthesis and enhancement steps.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


def write_receipt(payload: Dict[str, Any], receipt_dir: str = "Archive/receipts/voice-kernel") -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    target_dir = Path(receipt_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"voice-kernel-enhancement-{stamp}.json"
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=True)
    return str(path)
