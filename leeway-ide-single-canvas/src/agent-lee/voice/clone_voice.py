"""
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.VOICE.CLONE_SCRIPT
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: LeeWay-owned local F5-TTS clone entrypoint for Agent Lee speech synthesis.
"""

import argparse
import os
import sys
import tempfile
import soundfile as sf

NUMBA_CACHE_DIR = os.path.join(tempfile.gettempdir(), "agent-lee-numba-cache")
os.makedirs(NUMBA_CACHE_DIR, exist_ok=True)
os.environ.setdefault("NUMBA_CACHE_DIR", NUMBA_CACHE_DIR)

# Monkeypatch torchaudio.load to use librosa instead of torchcodec
import torchaudio
import librosa
import torch

_original_torchaudio_load = torchaudio.load

def torchaudio_load_librosa(filepath, *args, **kwargs):
    """Wrapper around torchaudio.load that uses librosa to avoid torchcodec DLL loading."""
    try:
        # Try using librosa
        audio_np, sr = librosa.load(filepath, sr=None, mono=False)
        # Convert numpy to torch tensor
        audio_tensor = torch.from_numpy(audio_np).float()
        if audio_tensor.dim() == 1:
            audio_tensor = audio_tensor.unsqueeze(0)
        return audio_tensor, sr
    except Exception as e:
        print(f"[PATCH] Librosa load failed: {e}, falling back to original", file=sys.stderr)
        return _original_torchaudio_load(filepath, *args, **kwargs)

# Apply the monkeypatch
torchaudio.load = torchaudio_load_librosa

from f5_tts.api import F5TTS

def main():
    parser = argparse.ArgumentParser(description="Clone a voice using F5-TTS")
    parser.add_argument("--ref_audio", required=True, help="Path to reference audio file (.wav, .mp3)")
    parser.add_argument("--ref_text", required=True, help="Transcript of the reference audio")
    parser.add_argument("--text", required=True, help="Text to generate")
    parser.add_argument("--output", default="output.wav", help="Path to save the generated audio")
    parser.add_argument("--device", default="cpu", help="Torch device to use for inference, e.g. cpu or cuda")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech rate multiplier (lower is slower, e.g. 0.9)")
    
    args = parser.parse_args()

    print(f"Loading F5-TTS model...")
    # Initialize the TTS model
    tts = F5TTS(device=args.device)
    
    print(f"Cloning voice from {args.ref_audio}...")
    print(f"Generating speech for text: '{args.text}'")
    
    # Generate speech
    wav, sr, _spec = tts.infer(
        ref_file=args.ref_audio,
        ref_text=args.ref_text,
        gen_text=args.text,
        speed=args.speed,
    )
    
    # Save output
    sf.write(args.output, wav, sr)
    print(f"Audio saved to {args.output}")

if __name__ == "__main__":
    main()
