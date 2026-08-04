import argparse
import json
import os
import time
import wave

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel


def clean_text(text):
    return " ".join((text or "").replace("\n", " ").split()).strip()


def save_wav(path, samples, sample_rate):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm16 = np.int16(np.clip(samples, -1.0, 1.0) * 32767)
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm16.tobytes())
    return os.path.getsize(path)


def record_audio(seconds, sample_rate, device):
    frames = sd.rec(
        int(seconds * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="float32",
        device=device,
    )
    sd.wait()
    return frames.reshape(-1)


def transcribe_wav(model, wav_path):
    segments, info = model.transcribe(
        wav_path,
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    text = clean_text(" ".join(segment.text.strip() for segment in segments))
    translate_segments, translate_info = model.transcribe(
        wav_path,
        task="translate",
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False,
    )
    english = clean_text(" ".join(segment.text.strip() for segment in translate_segments))

    return {
        "text": text,
        "english": english or text,
        "language": getattr(info, "language", "") or "",
        "language_probability": float(getattr(info, "language_probability", 0.0) or 0.0),
        "translate_language": getattr(translate_info, "language", "") or "",
    }


def main():
    parser = argparse.ArgumentParser(description="Agent Lee local voice capture and transcription helper.")
    parser.add_argument("--mode", default="record-and-transcribe", choices=["record-and-transcribe", "record", "transcribe"])
    parser.add_argument("--seconds", type=float, default=5.0)
    parser.add_argument("--sample-rate", type=int, default=16000)
    parser.add_argument("--device", default=None)
    parser.add_argument("--model", default=os.environ.get("AGENT_LEE_VOICE_STT_MODEL", "tiny.en"))
    parser.add_argument("--wav-path", default="")
    parser.add_argument("--wav-out", default="")
    parser.add_argument("--output-json", required=True)
    args = parser.parse_args()

    started = time.time()
    result = {
        "ok": False,
        "provider": "local_whisper",
        "mode": args.mode,
        "model": args.model,
        "sampleRate": args.sample_rate,
        "durationSeconds": args.seconds,
        "wavPath": args.wav_out or args.wav_path,
        "bytes": 0,
        "transcript": "",
        "english": "",
        "detectedLanguage": "",
        "languageProbability": 0.0,
        "vadSupported": True,
        "endpointing": "fixed-duration",
        "error": "",
        "elapsedMs": 0,
    }

    try:
        wav_path = args.wav_path or args.wav_out or ""
        if not wav_path:
            raise ValueError("A wav path is required.")

        if args.mode in ("record-and-transcribe", "record"):
            samples = record_audio(args.seconds, args.sample_rate, args.device)
            bytes_written = save_wav(wav_path, samples, args.sample_rate)
            result["bytes"] = int(bytes_written)
            result["wavPath"] = wav_path
            if args.mode == "record":
                result["ok"] = True
            else:
                model = WhisperModel(args.model, device="cpu", compute_type="int8")
                transcription = transcribe_wav(model, wav_path)
                result["transcript"] = transcription["text"]
                result["english"] = transcription["english"]
                result["detectedLanguage"] = transcription["language"]
                result["languageProbability"] = transcription["language_probability"]
                result["ok"] = True
        elif args.mode == "transcribe":
            if not os.path.exists(wav_path):
                raise FileNotFoundError(wav_path)
            result["bytes"] = int(os.path.getsize(wav_path))
            model = WhisperModel(args.model, device="cpu", compute_type="int8")
            transcription = transcribe_wav(model, wav_path)
            result["transcript"] = transcription["text"]
            result["english"] = transcription["english"]
            result["detectedLanguage"] = transcription["language"]
            result["languageProbability"] = transcription["language_probability"]
            result["ok"] = True
    except Exception as exc:
        result["error"] = str(exc)
    finally:
        result["elapsedMs"] = int((time.time() - started) * 1000)
        os.makedirs(os.path.dirname(args.output_json), exist_ok=True)
        with open(args.output_json, "w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2, ensure_ascii=False)
        print(json.dumps(result, ensure_ascii=False))

    raise SystemExit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()
