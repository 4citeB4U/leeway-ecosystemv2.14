"""
Agent Lee Voice Kernel - Audio Quality Helpers
Measures local audio metadata and simple quality signals.
"""

from __future__ import annotations

import contextlib
import json
import math
import os
import wave
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class AudioQualitySnapshot:
    path: str
    exists: bool
    sample_rate: Optional[int]
    channels: Optional[int]
    frames: Optional[int]
    duration_seconds: Optional[float]
    max_possible_db: Optional[float]
    notes: list[str]


def inspect_audio(path: str) -> AudioQualitySnapshot:
    audio_path = Path(path)
    notes: list[str] = []
    if not audio_path.exists():
        return AudioQualitySnapshot(path=str(audio_path), exists=False, sample_rate=None, channels=None, frames=None, duration_seconds=None, max_possible_db=None, notes=["missing"])

    try:
        with contextlib.closing(wave.open(str(audio_path), "rb")) as handle:
            sample_rate = handle.getframerate()
            channels = handle.getnchannels()
            frames = handle.getnframes()
            duration_seconds = frames / float(sample_rate) if sample_rate else None
            if channels and channels > 1:
                notes.append("stereo")
            if sample_rate and sample_rate < 22050:
                notes.append("low_sample_rate")
            return AudioQualitySnapshot(
                path=str(audio_path),
                exists=True,
                sample_rate=sample_rate,
                channels=channels,
                frames=frames,
                duration_seconds=duration_seconds,
                max_possible_db=0.0,
                notes=notes,
            )
    except Exception as exc:
        notes.append(f"inspect_failed:{exc.__class__.__name__}")
        return AudioQualitySnapshot(
            path=str(audio_path),
            exists=True,
            sample_rate=None,
            channels=None,
            frames=None,
            duration_seconds=None,
            max_possible_db=None,
            notes=notes,
        )


def quality_flags(snapshot: AudioQualitySnapshot) -> Dict[str, Any]:
    return {
        "exists": snapshot.exists,
        "sample_rate": snapshot.sample_rate,
        "channels": snapshot.channels,
        "duration_seconds": snapshot.duration_seconds,
        "notes": snapshot.notes,
        "truth_labels": [
            label
            for label, condition in [
                ("VOICE_AUDIO_PRESENT", snapshot.exists),
                ("VOICE_AUDIO_INSPECTED", snapshot.exists and snapshot.sample_rate is not None),
                ("VOICE_AUDIO_MONO", snapshot.channels == 1),
            ]
            if condition
        ],
    }
