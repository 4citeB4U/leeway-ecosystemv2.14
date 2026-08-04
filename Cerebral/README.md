# Cerebral — Local Assistant Platform

Cerebral is a local, privacy-first assistant platform that runs a single daemon for UI + API, a local LLM (Foundry) for reasoning, and a sovereign voice stack (Kokoro + edge-tts fallback). The system includes a Task Execution Spine for multi-step actions, a policy gate, desktop automation, and a React-based dashboard.

Key capabilities

- Unified API + UI served from the daemon on `http://127.0.0.1:8765`
- Task Execution Spine: classify → plan → policy → execute → verify → proofs
- Tool-first routing with policy tiers and audit logging
- Local LLM routing via `model_router.py` with Foundry auto-discovery
- Voice stack: Kokoro ONNX (instant cache) + edge-tts fallback, SSE TTS events
- PTT voice loop with Foundry ASR + local faster-whisper fallback
- Desktop automation via `desktop_hands.py` (screens, OCR, window focus)
- Live telemetry dashboard with streaming charts
- MCP control plane + agent tool suite (Sentinel, Navigator, CodeScout, Archivist)

Leeway-aligned repository shape

- `CerebralDaemon.py` is the canonical runtime entrypoint.
- `cerebral_daemon.py` is a compatibility shim for legacy scripts and should not receive new logic.
- Runtime-generated artifacts belong under `logs/` and not the repository root.
- Governance and standards live under `LeeWay-Standards/`; this repo remains a projection/runtime surface.
- Documentation belongs in `DOCS/`; legacy one-off notes are moved to `DOCS/legacy/`.

Quick start

1. Create and activate a Python virtualenv:
   ```powershell
   python -m venv .venv
   . .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. Start the daemon (UI + API):
   ```powershell
   python CerebralDaemon.py
   ```
3. (Optional) Start the MCP tool server:
   ```powershell
   python cerebral_mcp_server.py
   ```
4. (Optional) Run the front-end in dev mode:
   ```powershell
   cd agent-lee-os2
   npm install
   npm run dev
   ```
5. (Optional) Build the front-end and deploy into `www/`:
   ```powershell
   cd agent-lee-os2
   npm ci
   npm run build
   # back in repo root
   robocopy agent-lee-os2\dist www /MIR
   ```

Primary endpoints

- `POST /api/chat` — unified chat endpoint (chat/tool/plan/vision)
- `POST /api/chat/stream` — SSE streaming chat
- `POST /api/task` — explicit Task Spine execution
- `POST /api/task/plan` — preview a multi-step plan
- `GET /api/telemetry` — system metrics + history
- `POST /api/ptt` — push-to-talk upload (start/chunk/stop)
- `GET /api/tts/voices` — available voices
- `POST /api/settings` — background + TTS settings

Notes

- Foundry URL is auto-discovered; override with `CEREBRAL_FOUNDRY_BASE` if needed.
- Vision VL model is loaded on demand via `/api/vision/load` and served by llama.cpp.
- The daemon emits TTS lifecycle events at `GET /api/tts/events` (SSE).

Cleanup baseline (2026-06)

- Removed recursive duplicate tree at `MD_File_Directory/`.
- Consolidated `MD-File-Directory/` notes into `DOCS/legacy/`.
- Moved root runtime log files into `logs/runtime/`.
- Archived obsolete root scripts to `archive/legacy-root/` (`server.py`, `talk.py`, `Cerebral_Dashboard.pyw`, `get-pip.py`).

If you want me to run deployment steps or push changes to a remote Git repo, tell me which branch/remote to use.
