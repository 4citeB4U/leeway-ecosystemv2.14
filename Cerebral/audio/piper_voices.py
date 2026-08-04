"""Simple Piper/Edge-TTS voice registry used by Cerebral.

Provides a small fallback list when a voice provider isn't installed and a
stable API (`list_voices`, `get_voice_info`) for the daemon UI.
The default Agent Lee clone voice can be configured via the
`AGENT_LEE_VOICE` environment variable.
"""
import os
from typing import List, Dict, Optional

PIPER_VOICES: Dict[str, str] = {
    "en-US-ChristopherNeural": "Christopher (en-US, neural)",
    "en-US-JennyNeural": "Jenny (en-US, neural)",
    "en-US-AriaNeural": "Aria (en-US, neural)",
    "en-GB-RyanNeural": "Ryan (en-GB, neural)",
    "en-US-GuyNeural": "Guy (en-US, neural)",
    # Convenience alias for the Agent Lee clone voice. The actual voice id
    # should be set via AGENT_LEE_VOICE in production; this entry is a
    # friendly label for UI lists.
    "agent-lee-clone": "Agent Lee (clone)"
}

# Default voice for the system — prefer explicit environment override.
DEFAULT_VOICE = os.environ.get('AGENT_LEE_VOICE', 'en-US-ChristopherNeural')


def list_voices() -> List[Dict[str, str]]:
    """Return a list of available voices as dicts with `id` and `label`.

    If `AGENT_LEE_VOICE` is set and not part of the builtin map, include
    it in the returned list so it is visible to UIs.
    """
    out = [{"id": vid, "label": lbl} for vid, lbl in PIPER_VOICES.items()]
    envv = os.environ.get('AGENT_LEE_VOICE')
    if envv and not any(x['id'] == envv for x in out):
        out.insert(0, {"id": envv, "label": "Agent Lee (configured clone)"})
    return out


def get_voice_info(voice_id: str) -> Optional[Dict[str, str]]:
    """Return information about a single voice or None if not found."""
    if voice_id in PIPER_VOICES:
        return {"id": voice_id, "label": PIPER_VOICES[voice_id]}
    envv = os.environ.get('AGENT_LEE_VOICE')
    if envv and envv == voice_id:
        return {"id": envv, "label": "Agent Lee (configured clone)"}
    return None
