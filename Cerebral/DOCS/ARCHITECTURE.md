# Cerebral Architecture

## Overview

Cerebral is a local assistant stack with a single daemon hosting UI + API, a Task Execution Spine for multi-step actions, and a tool-first policy gate. The system can use local Foundry LLMs, an on-demand vision model, and a sovereign TTS pipeline.

Core components

- **Daemon (`CerebralDaemon.py`)**: Flask/Waitress server exposing `/api/*`, `/health`, and static UI at `/`.
- **Task Spine (`task_spine.py`)**: classify → plan → policy → execute → verify → proofs.
- **Tool Router (`tool_router.py`)**: JSON tool contract parsing and dispatch.
- **Model Router (`model_router.py`)**: Foundry discovery + per-task LLM configuration.
- **Frontend (`agent-lee-os2`)**: Vite + React UI for telemetry, chat, and Task Spine.

## Leeway boundary rules

- **Core authority** remains in `LeeWay-Standards/` and integrated core layers.
- **This repository** is a runtime/projection layer: adapters, rendering, orchestration, and logs.
- **Canonical backend entrypoint** is `CerebralDaemon.py`; `cerebral_daemon.py` is shim-only for backward compatibility.
- **Operational artifacts** (logs, generated diagnostics) must be kept under `logs/` and related runtime folders, not root.

## Voice routing

- **Primary**: Kokoro ONNX (local) with phrase cache.
- **Fallback**: edge-tts stream with PCM playback.
- **Final fallback**: Windows SAPI.

TTS is invoked through `/api/chat/tts` or `/speak`, and emits real-time playback events via `/api/tts/events`.

## Vision routing

- OpenCV capture and analysis via `vision_tools.py`.
- Optional Qwen2.5-VL (llama.cpp) on-demand via `/api/vision/load`.

## End-to-end flow

1. User interacts with the UI.
2. UI sends requests to `/api/chat` or `/api/task`.
3. Intent is classified, policy checked, and tools executed if needed.
4. Responses are logged to memory and spoken by TTS.
