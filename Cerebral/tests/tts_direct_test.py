import subprocess, sounddevice as sd, numpy as np, os, wave, io

piper     = r'c:\Cerebral\bin\piper\piper.exe'
piper_dir = os.path.dirname(piper)
model     = r'c:\Cerebral\models\voices\en_US-lessac-medium.onnx'

env = os.environ.copy()
env['PATH'] = piper_dir + os.pathsep + env.get('PATH', '')

# Use -f - (WAV to stdout) — avoids --output_raw crash on some Windows builds
proc = subprocess.run(
    [piper, '--model', model, '-f', '-', '--quiet'],
    input=b'Cerebral is now online and speaking.\n',
    capture_output=True,
    timeout=30,
    cwd=piper_dir,
    env=env,
)
print(f'WAV bytes: {len(proc.stdout)}  returncode: {proc.returncode}')
print('stderr:', proc.stderr.decode(errors='replace')[:300])

if proc.stdout and proc.returncode == 0:
    with wave.open(io.BytesIO(proc.stdout)) as wf:
        rate   = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
        print(f'rate={rate}  frames={wf.getnframes()}  ch={wf.getnchannels()}')
    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    sd.play(audio, samplerate=rate)
    sd.wait()
    print('PLAYBACK OK')
else:
    print('FAILED')

