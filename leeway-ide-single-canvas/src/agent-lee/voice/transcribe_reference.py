"""
LEEWAY_HEADER - DO NOT REMOVE

REGION: AI
TAG: CORE.AGENT_LEE.VOICE.TRANSCRIBE_REFERENCE
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: CPU transcription helper for developer voice reference audio inside the LeeWay voice cloning workflow.
"""

from __future__ import annotations

import argparse
import os

import whisper


def main():
    parser = argparse.ArgumentParser(description="Transcribe a reference voice sample for Agent Lee voice cloning.")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="tiny.en")
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()

    if args.device == "cpu":
      os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

    model = whisper.load_model(args.model, device=args.device)
    result = model.transcribe(args.audio, fp16=False)
    print(result["text"].strip())


if __name__ == "__main__":
    main()
