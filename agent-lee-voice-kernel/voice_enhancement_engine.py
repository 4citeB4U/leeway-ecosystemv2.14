"""
Agent Lee Voice Kernel - Enhancement Engine
Wraps XTTS synthesis with quality inspection, validation, and receipts.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from voice_audio_quality import inspect_audio, quality_flags
from voice_event_timeline import build_timeline, now_iso
from voice_receipts import write_receipt
from voice_response_validator import validate_tts_request


def load_policy(policy_path: str = "voice_enhancement_policy.json") -> Dict[str, Any]:
    with open(policy_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def build_request_context(text: str, voice: str, language: str, speed: float, output_path: str | None = None) -> Dict[str, Any]:
    policy = load_policy()
    validation = validate_tts_request(text=text, voice=voice, language=language, speed=speed)
    timeline = build_timeline("tts", text, output_path)
    return {
        "policy": policy,
        "validation": {
            "ok": validation.ok,
            "blockers": validation.blockers,
            "truth_labels": validation.truth_labels,
        },
        "timeline": timeline,
    }


def finalize_synthesis(audio_path: str, context: Dict[str, Any]) -> Dict[str, Any]:
    snapshot = inspect_audio(audio_path)
    receipt = {
        "schema": "leeway.voice-kernel.enhancement.receipt.v1",
        "receiptId": f"voice-kernel-{Path(audio_path).stem}",
        "timestamp": now_iso(),
        "engine": "XTTS-v2",
        "audio": quality_flags(snapshot),
        "context": context,
        "result": "completed" if snapshot.exists else "blocked",
    }
    receipt_path = write_receipt(receipt)
    receipt["receiptPath"] = receipt_path
    return receipt
