import os
import io
import time
import numpy as np
from faster_whisper import WhisperModel

class StreamingSTT:
    def __init__(self, model_size="base.en", compute_type="int8"):
        print(f"[StreamingSTT] Loading faster-whisper model '{model_size}'...")
        # device="auto", download_root="C:\\models\\whisper"
        self.model = WhisperModel(model_size, device="cpu", compute_type=compute_type)
        print("[StreamingSTT] Whisper model loaded successfully.")
        
    def transcribe(self, audio_np_float32: np.ndarray) -> str:
        """
        Transcribes a 1D float32 numpy array representing 16000Hz audio.
        """
        # Minimum audio length to bother transcribing (~0.3 seconds)
        if len(audio_np_float32) < 16000 * 0.3:
            return ""
            
        try:
            segments, info = self.model.transcribe(
                audio_np_float32, 
                beam_size=1, 
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            text = " ".join([segment.text for segment in segments]).strip()
            return text
        except Exception as e:
            print(f"[STT Error] Failed to transcribe chunk: {e}")
            return ""
