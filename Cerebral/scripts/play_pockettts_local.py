#!/usr/bin/env python3
"""Stream Pocket TTS to local audio device using ffmpeg + sounddevice.

Usage:
  python scripts/play_pockettts_local.py "Hello world"

Requirements for low-latency path:
  - ffmpeg available on PATH
  - Python packages: requests, sounddevice

If sounddevice isn't available, the script will save the MP3 and open it with the default player.
"""
import sys
import requests
import subprocess
import shutil
import tempfile
import os

POCKET_URL = os.environ.get("POCKET_TTS_URL", "http://127.0.0.1:9007/tts")
# Optional per-app settings so different apps can request different voices
POCKET_APP = os.environ.get("POCKET_TTS_APP", None)
POCKET_VOICE = os.environ.get("POCKET_TTS_VOICE", None)


def fallback_save_and_open(mp3_bytes: bytes, fname=None):
    if not fname:
        fd, fname = tempfile.mkstemp(suffix=".mp3", prefix="pocket_tts_")
        os.close(fd)
    with open(fname, "wb") as f:
        f.write(mp3_bytes)
    print("WROTE", fname, os.path.getsize(fname))
    if sys.platform == "win32":
        subprocess.Popen(["cmd", "/c", "start", "", fname])
    else:
        subprocess.Popen(["xdg-open", fname])


def stream_play(text: str):
    # Include optional per-app voice/app id fields so the TTS engine
    # can return a different voice for this application without
    # changing server-global defaults.
    payload = {"text": text}
    if POCKET_APP:
        payload["app"] = POCKET_APP
    if POCKET_VOICE:
        payload["voice"] = POCKET_VOICE
    print("Requesting Pocket TTS...", POCKET_URL, "app=", POCKET_APP, "voice=", POCKET_VOICE)
    r = requests.post(POCKET_URL, json=payload, stream=True, timeout=60)
    if r.status_code != 200:
        print("Pocket TTS returned", r.status_code, r.text)
        return False

    # If sounddevice available and ffmpeg exists, attempt streaming decode path
    try:
        import sounddevice as sd
    except Exception as e:
        print("sounddevice not available, falling back to file playback:", e)
        mp3 = r.content
        fallback_save_and_open(mp3)
        return True

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("ffmpeg not found in PATH, falling back to file playback")
        mp3 = r.content
        fallback_save_and_open(mp3)
        return True

    # Spawn ffmpeg to decode mp3 from stdin -> raw s16le PCM on stdout
    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "22050",
        "-ac",
        "1",
        "pipe:1",
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE)

    try:
        # Start output stream
        samplerate = 22050
        channels = 1
        dtype = "int16"
        blocksize = 1024

        stream = sd.OutputStream(samplerate=samplerate, channels=channels, dtype=dtype, blocksize=blocksize)
        stream.start()

        # We'll feed mp3 bytes into ffmpeg stdin, and read PCM from ffmpeg stdout
        # Use a writer thread to push the HTTP chunks into ffmpeg stdin while
        # reading decoded PCM from stdout in the main thread.
        import threading
        import numpy as np

        def writer_thread():
            try:
                for chunk in r.iter_content(chunk_size=4096):
                    if not chunk:
                        continue
                    proc.stdin.write(chunk)
                try:
                    proc.stdin.close()
                except Exception:
                    pass
            except Exception:
                pass

        wt = threading.Thread(target=writer_thread, daemon=True)
        wt.start()

        # Read from ffmpeg stdout and write to stream. Convert raw bytes -> int16 numpy.
        leftover = b""
        try:
            while True:
                data = proc.stdout.read(4096)
                if not data:
                    break
                buf = leftover + data
                # Ensure even number of bytes for int16
                if len(buf) < 2:
                    leftover = buf
                    continue
                take = (len(buf) // 2) * 2
                frames = buf[:take]
                leftover = buf[take:]

                arr = np.frombuffer(frames, dtype=np.int16)
                if channels > 1:
                    try:
                        arr = arr.reshape(-1, channels)
                    except Exception:
                        pass

                stream.write(arr)
        except Exception as e:
            print("Playback error:", e)

        stream.stop()
        stream.close()
        return True
    finally:
        try:
            proc.kill()
        except Exception:
            pass


def main():
    if len(sys.argv) < 2:
        text = "Hello from Agent Lee low-latency test."
    else:
        text = " ".join(sys.argv[1:])
    ok = stream_play(text)
    if ok:
        print("Playback attempt finished")
    else:
        print("Playback failed")


if __name__ == "__main__":
    main()
