import os
import sounddevice as sd  # pyre-ignore
import numpy as np  # pyre-ignore
try:
    import torch  # pyre-ignore
    from faster_whisper import WhisperModel  # pyre-ignore
    from llama_cpp import Llama  # pyre-ignore
    from pocket_tts import TTSModel  # pyre-ignore
except ImportError:
    torch = None
    WhisperModel = None
    Llama = None
    TTSModel = None
import threading
import queue

# --- SETTINGS ---
MODEL_PATH = "qwen2.5-7b-instruct-q4_k_m.gguf" # Change if your filename is different
VOICE_PROMPT = "my_voice.wav"
SAMPLE_RATE = 16000

# --- INITIALIZE ---
print("Initializing AI components (CPU Optimized)...")

# 1. Ears (Whisper)
# We use 'tiny.en' because it's the fastest for Mini PCs
whisper = WhisperModel("tiny.en", device="cpu", compute_type="int8") if WhisperModel else None

# 2. Brain (Qwen via Llama-cpp)
# n_threads should match your Mini PC's physical CPU cores (usually 4 or 6)
if Llama and os.path.exists(MODEL_PATH):
    llm = Llama(model_path=MODEL_PATH, n_ctx=2048, n_threads=4)
else:
    print(f"WARNING: Model not found at {MODEL_PATH} or Llama not installed")
    llm = None

# 3. Voice (Pocket TTS)
tts = TTSModel.load_model() if TTSModel else None
if tts and os.path.exists(VOICE_PROMPT):
    voice_state = tts.get_state_for_audio_prompt(VOICE_PROMPT)
else:
    print(f"WARNING: Voice prompt not found at {VOICE_PROMPT}")
    voice_state = None

# 4. Interruption Detection (Silero VAD)
try:
    vad_model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad')
    (get_speech_timestamps, _, _, _, _) = utils
except Exception as e:
    print(f"WARNING: VAD model load failed: {e}")

# --- LOGIC ---
stop_event = threading.Event()

def speak_with_interruption(text):
    """Plays audio but checks if the user started talking to stop immediately."""
    if not voice_state:
        print(f"AI: {text} (Voice not configured)")
        return
    print(f"AI: {text}")
    audio_data = tts.generate_audio(voice_state, text)
    audio_np = audio_data.numpy()
    
    # Start playback
    sd.play(audio_np, SAMPLE_RATE)
    
    # While playing, we keep checking if we should stop
    while sd.get_stream().active:
        if stop_event.is_set():
            sd.stop()
            print(" [Interrupted by you] ")
            break
        sd.sleep(50)

def listen_and_talk():
    if not llm:
        print("ERROR: LLM not initialized. Check MODEL_PATH.")
        return
        
    print("\n--- Systems Ready! Talk to the AI (or Ctrl+C to stop) ---")
    
    while True:
        stop_event.clear()
        
        # Capture 5 seconds of audio
        print("\nListening...")
        recording = sd.rec(int(5 * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
        sd.wait() 
        
        # Convert to text
        segments, _ = whisper.transcribe(recording.flatten(), beam_size=1)
        user_input = " ".join([s.text for s in segments]).strip()
        
        if len(user_input) > 2:
            print(f"You: {user_input}")
            
            # If user starts a new thought, signal any current speech to stop
            stop_event.set() 
            
            # Generate Brain Response
            output = llm(f"User: {user_input}\nAssistant:", max_tokens=128, stop=["User:"], echo=False)
            response_text = output["choices"][0]["text"].strip()
            
            # Speak it back
            stop_event.clear()
            speak_with_interruption(response_text)

if __name__ == "__main__":
    try:
        listen_and_talk()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"Fatal error: {e}")
