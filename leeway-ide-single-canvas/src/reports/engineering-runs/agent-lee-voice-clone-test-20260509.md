<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: REPORT.ENGINEERING.VOICE_CLONE_TEST
DISCOVERY_PIPELINE:
  Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Receipt for Agent Lee reference-voice clone test and local playback verification.
-->

# Agent Lee Voice Clone Test Receipt

- Date: 2026-05-09
- Scope: Use `reference_voice.wav` to produce a cloned Agent Lee sample and verify local playback.

## Pending edits applied

- Updated `agent-lee/voice/clone_voice.py` to accept `--device` and allow CPU inference.
- Updated `agent-lee/voice/clone_voice.py` to match the current F5-TTS return signature `wav, sr, spec`.

## Commands and results

- Confirmed local voice assets and scripts exist under `agent-lee/voice`.
- Confirmed `reference_voice.wav` exists.
- Installed `openai-whisper` into `agent-lee/voice/voice-cloning-env`.
- Transcribed `reference_voice.wav` on CPU using Whisper `tiny.en`.
  - Transcript used:
    - `My check, my check, one, two, one, two. My check, my check, what will you do? Yo, just tell me what's happening. How you been doing? Let's keep it real, homie. How much flavor do you have? Do you dig a yo? I said a yo. Not any kind of confusion conversation, just a mathematical equation that builds up in time, right, baby? How we get down, how you get down.`
- Ran `clone_voice.py` on CPU with the recorded reference audio and generated:
  - `agent-lee/voice/agent_lee_cloned_test.wav`
- Played `agent_lee_cloned_test.wav` locally with `System.Media.SoundPlayer`.
  - Result: PASS

## Artifacts

- Reference recording:
  - [reference_voice.wav](C:/Users/Leona/.leeway-vscode/agent-lee/voice/reference_voice.wav)
- Generated clone sample:
  - [agent_lee_cloned_test.wav](C:/Users/Leona/.leeway-vscode/agent-lee/voice/agent_lee_cloned_test.wav)

## Notes

- The local environment required CPU forcing because the installed PyTorch build does not support the detected RTX 5060 Laptop GPU CUDA capability.
- A system `ffmpeg.exe` from the Lenovo LegionSpace install was used on `PATH` for transcription support.
