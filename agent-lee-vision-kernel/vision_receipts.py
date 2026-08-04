from datetime import datetime, timezone
from pathlib import Path
import json
import os
import uuid


def write_receipt(kind, payload):
    root = Path(os.environ.get("VISION_RECEIPT_ROOT", "/app/receipts"))
    root.mkdir(parents=True, exist_ok=True)
    receipt_id = f"{kind}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
    path = root / f"{receipt_id}.json"
    data = {
        "receiptId": receipt_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "assistantBodyRole": "CODEX_ASSISTANT_BODY",
        "service": "agent-lee-vision-kernel",
        "payload": payload
    }
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return str(path)
