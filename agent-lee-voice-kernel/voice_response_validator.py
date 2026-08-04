"""
Agent Lee Voice Kernel - Response Validator
Validates XTTS requests and marks blocked states honestly.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List


@dataclass
class ValidationOutcome:
    ok: bool
    blockers: List[str]
    truth_labels: List[str]


def validate_tts_request(text: str, voice: str, language: str, speed: float) -> ValidationOutcome:
    blockers: List[str] = []
    truth_labels: List[str] = []

    if not text or not text.strip():
        blockers.append("empty_text")
    if voice != "agent-lee":
        blockers.append("invalid_voice")
    if language.lower() != "en":
        truth_labels.append("LANGUAGE_NOT_EN")
    if speed <= 0:
        blockers.append("invalid_speed")

    if not blockers:
        truth_labels.extend([
            "VOICE_REQUEST_VALID",
            "XTTS_SINGLE_ENGINE_ONLY",
            "NO_FALLBACK_REQUESTED",
        ])

    return ValidationOutcome(ok=not blockers, blockers=blockers, truth_labels=truth_labels)
