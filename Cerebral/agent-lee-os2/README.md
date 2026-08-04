# Agent Lee OS 2 (Cerebral UI)

Vite + React UI for the Cerebral daemon. Provides the screensaver UI, chat modal,
Task Spine panel, and live telemetry dashboard.

Run locally

```powershell
npm install
npm run dev
```

Default URL: http://localhost:5173

API expectations

- The UI talks to the daemon at `http://127.0.0.1:8765` (same-origin when built into `www/`).
- SSE streaming is used for chat (`/api/chat/stream`).
- TTS events are consumed from `/api/tts/events`.

Build and deploy into daemon

```powershell
npm run build
cd ..
robocopy agent-lee-os2\dist www /MIR
```
