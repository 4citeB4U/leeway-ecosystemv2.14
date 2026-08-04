"""
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.VOICE.CLONE_SERVER
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Persistent local F5-TTS voice clone server for Agent Lee and LeeWay developer voice cloning.
"""

from __future__ import annotations

import argparse
import os
import tempfile
from pathlib import Path

NUMBA_CACHE_DIR = os.path.join(tempfile.gettempdir(), "agent-lee-numba-cache")
os.makedirs(NUMBA_CACHE_DIR, exist_ok=True)
os.environ.setdefault("NUMBA_CACHE_DIR", NUMBA_CACHE_DIR)

import soundfile as sf
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from f5_tts.api import F5TTS


class SynthesizeRequest(BaseModel):
    text: str
    ref_audio: str
    ref_text: str
    output_path: str | None = None
    speed: float = 1.0


def build_app(tts: F5TTS) -> FastAPI:
    app = FastAPI(title="Agent Lee Clone Voice Server")

    @app.get("/health")
    def health():
        return {"ready": True}

    @app.post("/synthesize")
    def synthesize(request: SynthesizeRequest):
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text is required.")
        if not os.path.exists(request.ref_audio):
            raise HTTPException(status_code=400, detail=f"Reference audio not found: {request.ref_audio}")
        if not request.ref_text.strip():
            raise HTTPException(status_code=400, detail="Reference transcript is required.")

        output_path = request.output_path or str(Path(tempfile.gettempdir()) / "agent-lee-clone-last.wav")
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)

        wav, sr, _spec = tts.infer(
            ref_file=request.ref_audio,
            ref_text=request.ref_text,
            gen_text=request.text,
            speed=request.speed,
        )
        sf.write(output_path, wav, sr)
        return {"output_path": output_path, "sample_rate": sr}

    return app


def main():
    parser = argparse.ArgumentParser(description="Run the Agent Lee local clone voice server.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()

    if args.device == "cpu":
        os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")

    tts = F5TTS(device=args.device)
    app = build_app(tts)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
