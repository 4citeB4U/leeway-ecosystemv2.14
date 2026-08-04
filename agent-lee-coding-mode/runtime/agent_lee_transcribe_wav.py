import argparse
import json
import os
import time

from faster_whisper import WhisperModel


def clean(text):
    return " ".join((text or "").replace("\n", " ").split()).strip()


def transcribe(model, wav_path, task):
    segments, info = model.transcribe(
        wav_path,
        task=task,
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    text = clean(" ".join([segment.text.strip() for segment in segments]))
    return {
        "text": text,
        "language": getattr(info, "language", None) or "",
        "language_probability": float(getattr(info, "language_probability", 0.0) or 0.0),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", required=True)
    parser.add_argument("--model", default="base")
    parser.add_argument("--out-json", required=True)
    args = parser.parse_args()

    started = time.time()
    result = {
        "ok": False,
        "wav": args.wav,
        "model": args.model,
        "detectedLanguage": "",
        "languageProbability": 0.0,
        "original": "",
        "english": "",
        "elapsedSeconds": 0.0,
        "error": "",
    }

    try:
        if not os.path.exists(args.wav):
            raise FileNotFoundError(args.wav)

        os.makedirs(os.path.dirname(args.out_json), exist_ok=True)
        model = WhisperModel(args.model, device="cpu", compute_type="int8")

        original = transcribe(model, args.wav, "transcribe")
        english = transcribe(model, args.wav, "translate")

        result["detectedLanguage"] = original["language"]
        result["languageProbability"] = original["language_probability"]
        result["original"] = original["text"]
        result["english"] = english["text"]
        result["ok"] = True
    except Exception as exc:
        result["error"] = str(exc)
    finally:
        result["elapsedSeconds"] = round(time.time() - started, 3)
        with open(args.out_json, "w", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2, ensure_ascii=False)
        print(json.dumps(result, ensure_ascii=False))

    raise SystemExit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()
