import sounddevice as sd
import soundfile as sf
import queue
import sys

def record_audio(filename, samplerate=22050):
    q = queue.Queue()

    def callback(indata, frames, time, status):
        """This is called (from a separate thread) for each audio block."""
        if status:
            print(status, file=sys.stderr)
        q.put(indata.copy())

    try:
        # Make sure the file is opened before recording starts:
        with sf.SoundFile(filename, mode='w', samplerate=samplerate, channels=1) as file:
            with sd.InputStream(samplerate=samplerate, channels=1, callback=callback):
                print("*" * 50)
                print("🔴 RECORDING... Speak now!")
                print("Press Enter to stop recording.")
                print("*" * 50)
                input()
                print("Recording stopped. Saving file...")
            while not q.empty():
                file.write(q.get())
        print(f"✅ Successfully saved to {filename}")
    except Exception as e:
        print(f"Error during recording: {e}")

if __name__ == "__main__":
    out_file = "reference_voice.wav"
    input("Press Enter when you are ready to start recording...")
    record_audio(out_file)
