'''
CerebralDaemon TTS Worker -- XTTS-first with Kokoro local (ONNX)
================================================================
Behavior:
 - Try external XTTS kernel first (HTTP _VOICE_KERNEL_URL /tts). If it returns audio,
   stream/play it locally (via ffmpeg -> sounddevice). Record a receipt for audit.
 - If XTTS unavailable or returns error/no audio, try Kokoro ONNX local TTS.
 - If Kokoro missing or fails, playback is unavailable until the next synthesis attempt.

Receipts:
 - Written under Archive/receipts/voice-kernel/agent-lee-xtts-call-<timestamp>.json
 - Contains startedAt, endedAt, status, text_preview, voice, error, and fetched_from (if any).
'''

import asyncio
import io
import os
import queue
import subprocess
import threading
import time
import json
import base64
from pathlib import Path

try:
    import requests
    _REQUESTS_AVAILABLE = True
except Exception:
    _REQUESTS_AVAILABLE = False
    import urllib.request
    import urllib.error

try:
    import sounddevice as sd
    import numpy as np
    _SD_AVAILABLE = True
except ImportError:
    _SD_AVAILABLE = False
    print('[TTS Worker] WARNING: sounddevice/numpy not installed')

_LEEWAY_AVAILABLE = False
_LeewayCommunicate = None
_leeway_fetch_mp3 = None
try:
    # prefer our XTTS-first compatibility wrapper
    from audio.leeway_tts import Communicate as _LeewayCommunicate, fetch_mp3 as _leeway_fetch_mp3  # type: ignore
    _LEEWAY_AVAILABLE = True
except Exception:
    _LEEWAY_AVAILABLE = False

from audio.piper_voices import PIPER_VOICES, DEFAULT_VOICE

# -- XTTS kernel config ------------------------------------------------------
_VOICE_KERNEL_URL = os.environ.get('VOICE_KERNEL_URL', 'http://127.0.0.1:8092')
_XTTS_TIMEOUT = float(os.environ.get('XTTS_TIMEOUT', '10'))

# -- Kokoro local TTS ---------------------------------------------------------
_KOKORO_MODEL  = os.environ.get('KOKORO_MODEL',  'C:/models/kokoro/kokoro-v1.0.int8.onnx')
_KOKORO_VOICES = os.environ.get('KOKORO_VOICES', 'C:/models/kokoro/voices-v1.0.bin')
_KOKORO_VOICE  = os.environ.get('KOKORO_VOICE',  'am_michael')
_KOKORO_SPEED  = float(os.environ.get('KOKORO_SPEED', '1.15'))

_kokoro_instance = None
_kokoro_lock     = threading.Lock()

def _kokoro_files_present():
    return Path(_KOKORO_MODEL).exists() and Path(_KOKORO_VOICES).exists()

def _get_kokoro():
    global _kokoro_instance
    if _kokoro_instance is not None:
        return _kokoro_instance
    if not _kokoro_files_present():
        return None
    with _kokoro_lock:
        if _kokoro_instance is not None:
            return _kokoro_instance
        try:
            from kokoro_onnx import Kokoro
            _kokoro_instance = Kokoro(_KOKORO_MODEL, _KOKORO_VOICES)
            print(f'[TTS Worker] Kokoro ONNX loaded -- voice={_KOKORO_VOICE} speed={_KOKORO_SPEED}x')
        except Exception as exc:
            print(f'[TTS Worker] Kokoro load failed: {exc}')
            _kokoro_instance = None
        return _kokoro_instance

def _kokoro_speak(text, voice, speed, stop_event):
    if not _SD_AVAILABLE:
        return False
    kok = _get_kokoro()
    if kok is None:
        return False
    if stop_event.is_set():
        return True
    try:
        samples, sample_rate = kok.create(text, voice=voice, speed=speed, lang='en-us', trim=True)
    except Exception as exc:
        print(f'[TTS Worker] Kokoro synthesis error: {exc}')
        return False
    if stop_event.is_set():
        return True
    try:
        sd.play(samples, sample_rate)
        while sd.get_stream().active:
            if stop_event.is_set():
                sd.stop()
                break
            time.sleep(0.02)
        sd.wait()
    except Exception as exc:
        print(f'[TTS Worker] Kokoro playback error: {exc}')
    return True

# -- TTS playback constants -------------------------------------------------
_SAMPLE_RATE      = 24000
_CHANNELS         = 1
_PCM_CHUNK        = 2048
_KEEPALIVE_SEC    = 20
_DEDUP_WINDOW_SEC = 2.0
_FFMPEG           = os.environ.get('FFMPEG_PATH', 'ffmpeg')

# -- Persistent asyncio event loop ------------------------------------------
_loop        = None
_loop_thread = None
_loop_lock   = threading.Lock()

def _ensure_event_loop():
    global _loop, _loop_thread
    with _loop_lock:
        if _loop is not None and _loop.is_running():
            return
        _loop = asyncio.new_event_loop()
        _loop_thread = threading.Thread(target=_loop.run_forever, daemon=True, name='tts-asyncio-loop')
        _loop_thread.start()

def _run_coro(coro):
    return asyncio.run_coroutine_threadsafe(coro, _loop).result()

# -- TTS event system ---------------------------------------------------------
_tts_event_listeners = []

def register_tts_listener(fn):
    _tts_event_listeners.append(fn)

def _emit_tts_event(event):
    for fn in _tts_event_listeners:
        try:
            fn(event)
        except Exception:
            pass

# -- XTTS helpers (reused for playback) -------------------------------------
async def _warmup_coro(voice):
    try:
        if _LEEWAY_AVAILABLE and _LeewayCommunicate is not None:
            communicate = _LeewayCommunicate('Ready.', voice=voice)
        else:
            return
        async for chunk in communicate.stream():
            if chunk.get('type') == 'audio':
                break
    except Exception as exc:
        print(f'[TTS Worker] Warmup error: {exc}')

async def _fetch_mp3(text, voice):
    # Use XTTS-first compatibility wrapper when available. If no voice is
    # specified, prefer the system default from the voice registry.
    try:
        if voice is None:
            voice = DEFAULT_VOICE
        if _LEEWAY_AVAILABLE and _leeway_fetch_mp3 is not None:
            return await _leeway_fetch_mp3(text, voice)
    except Exception:
        return None
    return None

async def _stream_tts(text, voice, stop_event, preloaded_mp3=None):
    if not _SD_AVAILABLE:
        return
    try:
        ffmpeg_proc = subprocess.Popen([_FFMPEG, '-i', 'pipe:0', '-f', 's16le', '-ar', str(_SAMPLE_RATE), '-ac', str(_CHANNELS), 'pipe:1', '-loglevel', 'quiet'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    except FileNotFoundError:
        print(f"[TTS Worker] ffmpeg not found at {_FFMPEG!r}")
        return
    except Exception as exc:
        print(f"[TTS Worker] ffmpeg error: {exc}")
        return

    sd_stream = sd.OutputStream(samplerate=_SAMPLE_RATE, channels=_CHANNELS, dtype='float32', blocksize=_PCM_CHUNK // 2)
    sd_stream.start()

    def _pcm_reader():
        try:
            while not stop_event.is_set():
                raw = ffmpeg_proc.stdout.read(_PCM_CHUNK)
                if not raw:
                    break
                if stop_event.is_set():
                    break
                pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                sd_stream.write(pcm)
        except Exception as exc:
            print(f'[TTS Worker] PCM reader error: {exc}')

    reader = threading.Thread(target=_pcm_reader, daemon=True, name='tts-pcm-reader')
    reader.start()
    try:
        if preloaded_mp3 is not None:
            if not stop_event.is_set():
                ffmpeg_proc.stdin.write(preloaded_mp3)
        else:
            # Try fetching from XTTS wrapper if available
            try:
                if _LEEWAY_AVAILABLE and _leeway_fetch_mp3 is not None:
                    audio = await _leeway_fetch_mp3(text, voice)
                    if audio:
                        ffmpeg_proc.stdin.write(audio)
            except Exception:
                pass
    except Exception as exc:
        print(f'[TTS Worker] tts stream error: {exc}')
    try:
        ffmpeg_proc.stdin.close()
    except Exception:
        pass
    reader.join(timeout=10)
    try:
        sd_stream.stop()
        sd_stream.close()
    except Exception:
        pass
    try:
        ffmpeg_proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        ffmpeg_proc.kill()

# -- XTTS helpers -------------------------------------------------------------
def _write_xtts_receipt(receipt):
    try:
        rdir = Path('Archive/receipts/voice-kernel')
        rdir.mkdir(parents=True, exist_ok=True)
        ts = time.strftime('%Y%m%d-%H%M%S')
        fname = rdir / f'agent-lee-xtts-call-{ts}.json'
        fname.write_text(json.dumps(receipt, default=str, indent=2), encoding='utf-8')
    except Exception as exc:
        print(f'[TTS Worker] Failed to write XTTS receipt: {exc}')

def _xtts_fetch_bytes(text, voice, speed, stop_event):
    """Call XTTS /tts and return raw audio bytes (mp3/wav) or None on failure."""
    if stop_event.is_set():
        return None
    receipt = {
        'startedAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'text_preview': text[:200],
        'voice': voice,
        'speed': speed,
        'endpoint': _VOICE_KERNEL_URL.rstrip('/') + '/tts',
    }
    try:
        if _REQUESTS_AVAILABLE:
            url = _VOICE_KERNEL_URL.rstrip('/') + '/tts'
            try:
                resp = requests.post(url, json={'text': text, 'voice': voice, 'speed': speed}, timeout=_XTTS_TIMEOUT, stream=True)
            except Exception as exc:
                receipt['status'] = 'error'
                receipt['error'] = str(exc)
                _write_xtts_receipt(receipt)
                return None
            receipt['http_status'] = resp.status_code
            ctype = resp.headers.get('content-type', '')
            if resp.status_code != 200:
                receipt['status'] = 'failed'
                receipt['content_type'] = ctype
                _write_xtts_receipt(receipt)
                return None
            if ctype and ctype.startswith('audio/'):
                audio_bytes = resp.content
                receipt['status'] = 'ok'
                receipt['content_type'] = ctype
                _write_xtts_receipt({**receipt, 'size_bytes': len(audio_bytes)})
                return audio_bytes
            try:
                data = resp.json()
            except Exception:
                receipt['status'] = 'no-audio'
                receipt['error'] = 'response-not-audio-or-json'
                _write_xtts_receipt(receipt)
                return None
            for key in ('audio_b64', 'audioBase64', 'audio_base64', 'audio64', 'audio'):
                a = data.get(key)
                if isinstance(a, str):
                    try:
                        audio_bytes = base64.b64decode(a)
                        receipt['status'] = 'ok'
                        receipt['fetched_from'] = key
                        _write_xtts_receipt({**receipt, 'size_bytes': len(audio_bytes)})
                        return audio_bytes
                    except Exception:
                        pass
            for key in ('audio_path', 'audioPath', 'path', 'file', 'url', 'audio_url', 'filePath', 'file_path'):
                val = data.get(key)
                if val:
                    if not str(val).startswith('http'):
                        fetch_url = _VOICE_KERNEL_URL.rstrip('/') + '/' + str(val).lstrip('/')
                    else:
                        fetch_url = val
                    try:
                        get_resp = requests.get(fetch_url, timeout=_XTTS_TIMEOUT)
                        if get_resp.status_code == 200:
                            audio_bytes = get_resp.content
                            receipt['status'] = 'ok'
                            receipt['fetched_from'] = fetch_url
                            _write_xtts_receipt({**receipt, 'size_bytes': len(audio_bytes)})
                            return audio_bytes
                    except Exception as exc:
                        receipt['error'] = f'fetch-audio-error:{exc}'
                        _write_xtts_receipt(receipt)
                        return None
            receipt['status'] = 'no-audio-field'
            _write_xtts_receipt(receipt)
            return None
        else:
            url = _VOICE_KERNEL_URL.rstrip('/') + '/tts'
            body = json.dumps({'text': text, 'voice': voice, 'speed': speed}).encode('utf-8')
            req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
            try:
                with urllib.request.urlopen(req, timeout=_XTTS_TIMEOUT) as resp:
                    ctype = resp.getheader('Content-Type', '')
                    data = resp.read()
                    if ctype and ctype.startswith('audio/'):
                        receipt['status'] = 'ok'
                        receipt['content_type'] = ctype
                        _write_xtts_receipt({**receipt, 'size_bytes': len(data)})
                        return data
                    try:
                        parsed = json.loads(data)
                    except Exception:
                        receipt['status'] = 'no-audio'
                        receipt['error'] = 'urllib-no-json'
                        _write_xtts_receipt(receipt)
                        return None
                    for key in ('audio_b64', 'audioBase64', 'audio_base64', 'audio64', 'audio'):
                        a = parsed.get(key)
                        if isinstance(a, str):
                            try:
                                audio_bytes = base64.b64decode(a)
                                receipt['status'] = 'ok'
                                receipt['fetched_from'] = key
                                _write_xtts_receipt({**receipt, 'size_bytes': len(audio_bytes)})
                                return audio_bytes
                            except Exception:
                                pass
                    for key in ('audio_path', 'audioPath', 'path', 'file', 'url', 'audio_url', 'filePath', 'file_path'):
                        val = parsed.get(key)
                        if val:
                            if not str(val).startswith('http'):
                                fetch_url = _VOICE_KERNEL_URL.rstrip('/') + '/' + str(val).lstrip('/')
                            else:
                                fetch_url = val
                            try:
                                with urllib.request.urlopen(fetch_url, timeout=_XTTS_TIMEOUT) as get_resp:
                                    audio_bytes = get_resp.read()
                                    receipt['status'] = 'ok'
                                    receipt['fetched_from'] = fetch_url
                                    _write_xtts_receipt({**receipt, 'size_bytes': len(audio_bytes)})
                                    return audio_bytes
                            except Exception as exc:
                                receipt['error'] = f'fetch-audio-error:{exc}'
                                _write_xtts_receipt(receipt)
                                return None
                    receipt['status'] = 'no-audio-field'
                    _write_xtts_receipt(receipt)
                    return None
            except Exception as exc:
                receipt['status'] = 'error'
                receipt['error'] = str(exc)
                _write_xtts_receipt(receipt)
                return None
    finally:
        receipt['endedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S')


# -- Worker class -------------------------------------------------------------
class PiperTTSWorker:
    """XTTS-first TTS worker with Kokoro local TTS."""

    def __init__(self, bin_path='', voices_dir=''):
        self.edge_voice        = os.environ.get('CEREBRAL_VOICE', DEFAULT_VOICE)
        self.kokoro_voice      = _KOKORO_VOICE
        self.kokoro_speed      = _KOKORO_SPEED
        self.msg_queue         = queue.Queue()
        self.is_running        = False
        self.worker_thread     = None
        self._stop_event       = threading.Event()
        self._last_text        = ''
        self._last_text_time   = 0.0
        self._last_spoken_time = 0.0
        self._keepalive_thread = None
        self._prefetch_future  = None
        self._prefetch_text    = ''

    def start(self):
        if self.is_running:
            return
        _ensure_event_loop()
        self.is_running = True
        threading.Thread(target=_get_kokoro, daemon=True, name='tts-kokoro-load').start()
        self.worker_thread = threading.Thread(target=self._run_loop, daemon=True, name='tts-worker')
        self.worker_thread.start()
        self._keepalive_thread = threading.Thread(target=self._keepalive_loop, daemon=True, name='tts-keepalive')
        self._keepalive_thread.start()
        if _LEEWAY_AVAILABLE:
            threading.Thread(target=self._warmup_xtts, daemon=True, name='tts-warmup').start()
        print(f'[TTS Worker] Started -- kokoro={"ready" if _kokoro_files_present() else "pending"} piper_voice={self.edge_voice} xtts={_VOICE_KERNEL_URL}')

    def stop(self):
        self.is_running = False
        self._stop_event.set()
        if _SD_AVAILABLE:
            try:
                sd.stop()
            except Exception:
                pass

    def speak(self, text):
        text = text.strip()
        if not text:
            return
        now = time.monotonic()
        if text == self._last_text and (now - self._last_text_time) < _DEDUP_WINDOW_SEC:
            return
        self._last_text = text
        self._last_text_time = now
        self.msg_queue.put(text)

    def set_voice(self, voice_id):
        if len(voice_id) < 20 and '_' in voice_id:
            self.kokoro_voice = voice_id
            print(f'[TTS Worker] Kokoro voice -> {voice_id}')
            return True
        if voice_id in PIPER_VOICES:
            self.edge_voice = voice_id
            if _LEEWAY_AVAILABLE:
                threading.Thread(target=self._warmup_xtts, daemon=True).start()
            return True
        return False

    def set_speed(self, speed):
        self.kokoro_speed = max(0.5, min(2.0, speed))
        print(f'[TTS Worker] Speed -> {self.kokoro_speed:.2f}x')

    def interrupt(self):
        self._stop_event.set()
        if _SD_AVAILABLE:
            try:
                sd.stop()
            except Exception:
                pass
        while not self.msg_queue.empty():
            try:
                self.msg_queue.get_nowait()
            except queue.Empty:
                break
        self._last_text = ''
        self._last_text_time = 0.0
        self._prefetch_future = None
        self._prefetch_text = ''

    def _warmup_xtts(self):
        if not _LEEWAY_AVAILABLE:
            return
        try:
            _run_coro(_warmup_coro(self.edge_voice))
            print('[TTS Worker] XTTS warmup complete')
        except Exception as exc:
            print(f'[TTS Worker] XTTS warmup failed: {exc}')

    def _keepalive_loop(self):
        while self.is_running:
            time.sleep(5)
            if not self.is_running:
                break
            if self._last_spoken_time == 0.0:
                continue
            idle = time.monotonic() - self._last_spoken_time
            if idle >= _KEEPALIVE_SEC:
                self._warmup_xtts()
                self._last_spoken_time = time.monotonic()

    def _start_prefetch(self, text):
        self._prefetch_text = text
        self._prefetch_future = asyncio.run_coroutine_threadsafe(_fetch_mp3(text, self.edge_voice), _loop)

    def _collect_prefetch(self, expected_text):
        if self._prefetch_future is None or self._prefetch_text != expected_text:
            return None
        future = self._prefetch_future
        self._prefetch_future = None
        self._prefetch_text = ''
        try:
            return future.result(timeout=15)
        except Exception:
            return None

    def _run_loop(self):
        preloaded = None
        while self.is_running:
            if preloaded:
                text, mp3 = preloaded
                preloaded = None
            else:
                try:
                    text = self.msg_queue.get(timeout=0.1)
                except queue.Empty:
                    continue
                mp3 = None

            if text == '<STOP>':
                self.interrupt()
                continue

            print(f'[TTS Worker] >> {text[:80]}')
            self._stop_event.clear()
            self._last_spoken_time = time.monotonic()

            try:
                qs = list(self.msg_queue.queue)
                if qs and qs[0] not in ('', '<STOP>') and not _kokoro_files_present():
                    self._start_prefetch(qs[0])
            except Exception:
                pass

            _emit_tts_event('start')
            try:
                xtts_audio = None
                try:
                    xtts_audio = _xtts_fetch_bytes(text, self.edge_voice, self.kokoro_speed, self._stop_event)
                except Exception as exc:
                    print(f'[TTS Worker] XTTS fetch failed: {exc}')

                    if xtts_audio:
                    try:
                        if _SD_AVAILABLE:
                            _run_coro(_stream_tts(text, self.edge_voice, self._stop_event, xtts_audio))
                        else:
                            tmp = Path('/tmp') if Path('/tmp').exists() else Path('.')
                            fname = tmp / ('agent-lee-xtts-' + str(int(time.time()*1000)) + '.audio')
                            fname.write_bytes(xtts_audio)
                            print(f'[TTS Worker] XTTS audio saved to {fname}')
                    except Exception as exc:
                        print(f'[TTS Worker] XTTS playback error: {exc}')
                        xtts_audio = None

                if not xtts_audio:
                    if _kokoro_files_present():
                        ok = _kokoro_speak(text, self.kokoro_voice, self.kokoro_speed, self._stop_event)
                        if not ok:
                            print('[TTS Worker] Kokoro failed after XTTS failure')
                    else:
                        print('[TTS Worker] No TTS engine available!')
            except Exception as exc:
                print(f'[TTS Worker] Playback error: {exc}')
            finally:
                _emit_tts_event('stop')
                self._stop_event.clear()

            if self._prefetch_future is not None:
                try:
                    next_text = self.msg_queue.get_nowait()
                    preloaded = (next_text, self._collect_prefetch(next_text))
                except queue.Empty:
                    self._prefetch_future = None
                    self._prefetch_text = ''
