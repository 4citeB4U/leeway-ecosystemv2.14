"""XTTS-first TTS compatibility wrapper.

This wrapper prefers an external XTTS HTTP kernel (VOICE_KERNEL_URL/tts)
and exposes two conveniences for callers:

- `fetch_mp3(text, voice)` -> async -> raw audio bytes or None
- `Communicate(text, voice).stream()` -> async iterator yielding
  dicts like {'type':'audio','data': b'...'}

The wrapper will use the `AGENT_LEE_VOICE` environment variable as the
default voice when callers do not specify one.
"""

import asyncio
import os
import io
import base64
from typing import Optional

VOICE_KERNEL_URL = os.environ.get('VOICE_KERNEL_URL', 'http://127.0.0.1:8092')
# Allow more time for the XTTS kernel to synthesize audio (model can be slow).
XTTS_TIMEOUT = float(os.environ.get('XTTS_TIMEOUT', '60'))

# Default voice: prefer explicit AGENT_LEE_VOICE, otherwise fall back to
# a builtin default. Attempt to import piper_voices for its configured
# default when available.
try:
    from audio.piper_voices import DEFAULT_VOICE as _PIPER_DEFAULT  # type: ignore
except Exception:
    _PIPER_DEFAULT = 'en-US-ChristopherNeural'

DEFAULT_AGENT_VOICE = os.environ.get('AGENT_LEE_VOICE', _PIPER_DEFAULT)

try:
    import requests  # type: ignore
    _REQUESTS_AVAILABLE = True
except Exception:
    _REQUESTS_AVAILABLE = False


def _call_xtts(text: str, voice: Optional[str] = None, speed: Optional[float] = None) -> Optional[bytes]:
    if not _REQUESTS_AVAILABLE:
        return None
    payload = {'text': text}
    if voice:
        payload['voice'] = voice
    if speed is not None:
        payload['speed'] = speed
    url = VOICE_KERNEL_URL.rstrip('/') + '/tts'
    try:
        resp = requests.post(url, json=payload, timeout=XTTS_TIMEOUT)
        if resp.status_code != 200:
            # If the kernel rejects the voice (common: expects 'agent-lee'),
            # attempt a fallback retry using the kernel's canonical 'agent-lee'
            # token or by omitting the voice field.
            try:
                data = resp.json()
                detail = str(data.get('detail', '') or data.get('error', '') or data.get('message', '')).lower()
            except Exception:
                detail = ''

            if 'invalid voice' in detail or "only 'agent-lee'" in detail:
                # try kernel-friendly voice id
                try:
                    alt_payload = {'text': text, 'voice': 'agent-lee'}
                    r2 = requests.post(url, json=alt_payload, timeout=XTTS_TIMEOUT)
                    if r2.status_code == 200:
                        resp = r2
                    else:
                        # try without explicit voice
                        r3 = requests.post(url, json={'text': text}, timeout=XTTS_TIMEOUT)
                        if r3.status_code == 200:
                            resp = r3
                        else:
                            return None
                except Exception:
                    return None
            else:
                return None
        ctype = resp.headers.get('content-type', '')
        if ctype and ctype.startswith('audio/'):
            return resp.content
        try:
            data = resp.json()
        except Exception:
            return None
        # common audio fields
        for key in ('audio_b64', 'audioBase64', 'audio_base64', 'audio64', 'audio'):
            v = data.get(key)
            if isinstance(v, str):
                try:
                    return base64.b64decode(v)
                except Exception:
                    continue
        for key in ('audio_path', 'audioPath', 'path', 'file', 'url', 'audio_url', 'filePath', 'file_path'):
            v = data.get(key)
            if v:
                sv = str(v)
                # If the kernel returned a full URL, use it. If it returned a filesystem
                # path (e.g. /app/output/...), the kernel exposes a retrieval endpoint
                # at /audio/{filename} — map to that.
                if sv.startswith('http'):
                    fetch_url = sv
                else:
                    import os as _os
                    fname = _os.path.basename(sv)
                    fetch_url = VOICE_KERNEL_URL.rstrip('/') + '/audio/' + fname
                try:
                    g = requests.get(fetch_url, timeout=XTTS_TIMEOUT)
                    if g.status_code == 200:
                        return g.content
                except Exception:
                    return None
    except Exception:
        return None
    return None


async def fetch_mp3(text: str, voice: Optional[str] = None) -> Optional[bytes]:
    """Return raw audio bytes (mp3/wav) by asking the XTTS kernel.

    If `voice` is None, `AGENT_LEE_VOICE` (or the piper registry default)
    will be used.
    """
    if voice is None:
        voice = DEFAULT_AGENT_VOICE
    audio = await asyncio.to_thread(_call_xtts, text, voice, None)
    return audio


class Communicate:
    """Simple compatibility `Communicate` exposing `async for chunk in .stream()`.

    The stream yields a single `{'type': 'audio', 'data': bytes}` chunk when
    XTTS returns audio. Callers can use this same API surface as before.
    """
    def __init__(self, text: str, voice: Optional[str] = None, rate: Optional[str] = None):
        self.text = text
        self.voice = voice
        self.rate = rate

    async def stream(self):
        audio = await fetch_mp3(self.text, self.voice)
        if audio:
            yield {'type': 'audio', 'data': audio}
            return
        return


__all__ = ["Communicate", "fetch_mp3"]
