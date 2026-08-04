import argparse
import json
import traceback
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate governed LeeWay Qwen3-TTS session voice output.")
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--reference-audio", required=True)
    parser.add_argument("--reference-text", required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", default="English")
    parser.add_argument("--device", default="cuda:0")
    parser.add_argument("--max-new-tokens", type=int, default=0)
    args = parser.parse_args()

    output = {
        "ok": False,
        "modelPath": args.model_path,
        "referenceAudio": args.reference_audio,
        "language": args.language,
        "outputPath": args.output,
        "routeId": "leeway.voice.qwen3-tts.live",
        "modelId": "qwen3-tts-local",
    }

    try:
        model_path = Path(args.model_path)
        reference_audio = Path(args.reference_audio)
        output_path = Path(args.output)

        if not model_path.exists():
            raise FileNotFoundError(f"Model path not found: {model_path}")
        if not reference_audio.exists():
            raise FileNotFoundError(f"Reference audio not found: {reference_audio}")

        output_path.parent.mkdir(parents=True, exist_ok=True)

        effective_max_new_tokens = args.max_new_tokens if args.max_new_tokens and args.max_new_tokens > 0 else max(
            72,
            min(192, len(args.text)),
        )

        model = Qwen3TTSModel.from_pretrained(
            str(model_path),
            device_map=args.device,
            dtype=torch.bfloat16,
        )

        voice_clone_prompt = model.create_voice_clone_prompt(
            ref_audio=str(reference_audio),
            ref_text=args.reference_text,
        )

        wavs, sample_rate = model.generate_voice_clone(
            text=args.text,
            language=args.language,
            voice_clone_prompt=voice_clone_prompt,
            max_new_tokens=effective_max_new_tokens,
        )

        waveform = wavs[0]
        sf.write(str(output_path), waveform, sample_rate)

        output.update(
            {
                "ok": True,
                "sampleRate": sample_rate,
                "sampleCount": int(len(waveform)),
                "durationMs": round((len(waveform) / sample_rate) * 1000, 2),
                "bytesWritten": output_path.stat().st_size,
                "maxNewTokens": effective_max_new_tokens,
            }
        )
        print(json.dumps(output))
        return 0
    except Exception as error:
        output.update(
            {
                "error": str(error),
                "traceback": traceback.format_exc(),
            }
        )
        print(json.dumps(output))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
