"""Thin wrapper that exposes a `SpeechAgent` used by Cerebral.

The implementation is intentionally minimal: it wraps the `PiperTTSWorker`
and exposes the methods the daemon expects: `say`, `set_voice`, `set_speed`,
`interrupt`, and `stop`.
"""
import threading
import time
from typing import Optional

try:
    from audio.piper_tts_worker import PiperTTSWorker, register_tts_listener  # type: ignore
    _HAVE_PIPER = True
except Exception:
    PiperTTSWorker = None  # type: ignore
    register_tts_listener = None  # type: ignore
    _HAVE_PIPER = False


class SpeechAgent:
    def __init__(self):
        self.tts_worker: Optional[object] = None
        self._speed = 1.0
        if _HAVE_PIPER and PiperTTSWorker is not None:
            try:
                self.tts_worker = PiperTTSWorker()
                # start the worker (non-blocking)
                threading.Thread(target=self.tts_worker.start, daemon=True).start()
                # register a no-op listener by default (Cerebral will attach its own)
                if register_tts_listener:
                    try:
                        register_tts_listener(lambda ev: None)
                    except Exception:
                        pass
            except Exception:
                self.tts_worker = None

    def set_voice(self, voice_id: str) -> bool:
        if not self.tts_worker:
            return False
        try:
            return bool(self.tts_worker.set_voice(voice_id))
        except Exception:
            return False

    def set_speed(self, speed: float):
        self._speed = float(speed)
        if self.tts_worker:
            try:
                self.tts_worker.set_speed(self._speed)
            except Exception:
                pass

    def say(self, text: str):
        if not self.tts_worker:
            return False
        try:
            self.tts_worker.speak(text)
            return True
        except Exception:
            return False

    def interrupt(self):
        if self.tts_worker:
            try:
                self.tts_worker.interrupt()
            except Exception:
                pass

    def stop(self):
        if self.tts_worker:
            try:
                self.tts_worker.stop()
            except Exception:
                pass
