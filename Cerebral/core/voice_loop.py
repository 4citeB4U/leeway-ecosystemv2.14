import sys
import queue
import numpy as np
import sounddevice as sd
import webrtcvad
import threading
import time

# Attempt to import StreamingSTT (it requires faster_whisper)
try:
    from core.streaming_stt import StreamingSTT
except ImportError:
    print("[VoiceLoop] Warning: Could not import StreamingSTT. Voice transcripts will fail.")
    StreamingSTT = None

class VoiceLoop:
    """
    Manages continuous microphone capture and Voice Activity Detection (VAD).
    States:
      OFF: No recording.
      STANDBY: Recording, but only listening for the wake word ('Cerebral wake up').
      ACTIVE: Recording, yielding transcripts to the main event loop.
    """
    def __init__(self, sample_rate=16000, vad_aggressiveness=3):
        self.sample_rate = sample_rate
        self.vad = webrtcvad.Vad(vad_aggressiveness)
        self.stt = StreamingSTT() if StreamingSTT else None
        
        self.audio_queue = queue.Queue()
        self.state = "STANDBY" # OFF, STANDBY, ACTIVE
        
        self.is_running = False
        self.stream = None
        self.worker_thread = None
        
        # Callbacks
        self.on_speech_detected = None
        self.on_barge_in = None
        
    def _audio_callback(self, indata, frames, time_info, status):
        """Called by sounddevice for each new audio block."""
        if status:
            print(f"[VoiceLoop Audio Status] {status}", file=sys.stderr)
            
        if self.state == "OFF":
            return
            
        # We need mono 16-bit PCM for WebRTCVAD. 
        # sounddevice provides it if configured with dtype='int16'.
        audio_chunk = indata.copy()
        self.audio_queue.put(audio_chunk)
        
    def start(self):
        """Starts the microphone stream and worker thread."""
        if self.is_running:
            return
            
        self.is_running = True
        
        # We request 30ms chunks to perfectly match WebRTCVAD expectations.
        chunk_size_samples = int(self.sample_rate * 0.03)
        
        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=1,
            dtype='int16',
            blocksize=chunk_size_samples, 
            callback=self._audio_callback
        )
        self.stream.start()
        
        self.worker_thread = threading.Thread(target=self._process_audio, daemon=True)
        self.worker_thread.start()
        
        print(f"[VoiceLoop] Started perfectly. Current state: {self.state}")

    def set_state(self, new_state):
        if new_state not in ["OFF", "STANDBY", "ACTIVE"]:
            raise ValueError(f"Invalid state: {new_state}")
        print(f"[VoiceLoop] State changed: {self.state} -> {new_state}")
        self.state = new_state
        
    def _process_audio(self):
        """Background worker consuming audio chunks and running VAD."""
        chunk_size_samples = int(self.sample_rate * 0.03)
        chunk_size_bytes = chunk_size_samples * 2 # 16-bit = 2 bytes per sample
        
        buffer = bytearray()
        
        speech_buffer = []
        is_speaking = False
        silence_frames = 0
        
        # E.g. at 30ms per frame, 20 frames = 600ms of silence needed to finalize phrase
        MAX_SILENCE_FRAMES = 20 
        
        while self.is_running:
            try:
                # get chunk of int16
                in_data = self.audio_queue.get(timeout=0.1)
                
                # convert to bytes for VAD
                in_bytes = in_data.tobytes()
                buffer.extend(in_bytes)
                
                while len(buffer) >= chunk_size_bytes:
                    chunk = buffer[:chunk_size_bytes]
                    buffer = buffer[chunk_size_bytes:]
                    
                    try:
                        is_speech = self.vad.is_speech(chunk, self.sample_rate)
                    except Exception as e:
                        print(f"[VoiceLoop] VAD Error: {e}")
                        is_speech = False
                    
                    if is_speech:
                        if not is_speaking:
                            is_speaking = True
                            # BARGE-IN TRIGGER: The instant >30ms voice is verified!
                            if self.on_barge_in and self.state == "ACTIVE":
                                self.on_barge_in()
                                
                        silence_frames = 0
                        speech_buffer.append(chunk)
                    else:
                        if is_speaking:
                            silence_frames += 1
                            speech_buffer.append(chunk)
                            if silence_frames > MAX_SILENCE_FRAMES:
                                is_speaking = False
                                # Process speech segment
                                audio_segment = b"".join(speech_buffer)
                                speech_buffer = []
                                silence_frames = 0
                                
                                # Send to transcription in a separate thread to not block VAD
                                threading.Thread(
                                    target=self._handle_speech_segment, 
                                    args=(audio_segment,)
                                ).start()
                                
            except queue.Empty:
                pass
                
    def _handle_speech_segment(self, audio_bytes):
        """Transcribes the completed audio segment."""
        if not self.stt:
            return
            
        # Convert bytes to float32 np array scaled [-1, 1] for faster-whisper
        audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        text = self.stt.transcribe(audio_np)
        
        if not text:
            return
            
        print(f"[VoiceLoop] Heard: '{text}'")
        text_lower = text.lower()
        
        if self.state == "STANDBY":
            if "cerebral" in text_lower and ("wake" in text_lower or "up" in text_lower):
                self.set_state("ACTIVE")
                print("[VoiceLoop] Wake word confirmed. Entering ACTIVE state.")
        elif self.state == "ACTIVE":
            if "cerebral sleep" in text_lower or "sleep cerebral" in text_lower:
                self.set_state("STANDBY")
                print("[VoiceLoop] Sleep command confirmed. Entering STANDBY state.")
            else:
                if self.on_speech_detected:
                    self.on_speech_detected(text)
                    
    def stop(self):
        """Stops the audio stream and worker."""
        self.is_running = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
        if self.worker_thread:
            self.worker_thread.join(timeout=2)
            
if __name__ == "__main__":
    # Simple standalone test
    loop = VoiceLoop()
    loop.start()
    print("Speak into microphone. Default state is STANDBY. Say 'Cerebral wake up' to activate.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        loop.stop()
        print("Stopped.")
