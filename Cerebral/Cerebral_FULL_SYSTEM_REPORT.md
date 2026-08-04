# Cerebral Full System Report

## Overview

This report reflects the current runtime state of the Cerebral application: its control plane, core daemon, tool routing, Task Execution Spine, voice stack, desktop automation, UI, and MCP agent tools. It is grounded in the current code and services.

---

## 1. Core Runtime (Daemon + Routing)

### Primary runtime

- **CerebralDaemon.py** — single runtime hosting UI + API + telemetry + task spine.
- **model_router.py** — unified LLM entry point with Foundry auto-discovery.
- **tool_router.py** — contract-first tool dispatch + policy gate.
- **task_spine.py** — multi-step orchestration pipeline.
- **body_state.py** — live system snapshot injected into prompts.

### Operational flow

User request → `classify_intent` → (plan/tool/chat/vision) → policy gate → tool execution → verification + proofs → memory log → TTS.

---

## 2. Task Execution Spine

### Endpoints

- `POST /api/task` — execute multi-step plan
- `POST /api/task/plan` — preview plan without executing
- `GET /api/spine/status` — readiness and proof paths

### Spine pipeline

`generate_plan` → `validate_plan` → policy tiers → per-step execute → screenshot proofs → verification → structured result.

---

## 3. Tool Routing + Policy Gate

### Key files

- **tool_router.py** — parses JSON plan, dispatches to filesystem/desktop/convert bridges.
- **policy_engine.py** — 4-tier policy: `ALLOW`, `ALLOW_LOG`, `APPROVE`, `DENY`.

### Policy behavior

- Read-only operations are permitted.
- Input injection or terminal commands require approval.
- Deny list blocks destructive commands.

---

## 4. Voice Stack (TTS + PTT)

### Components

- **audio/piper_tts_worker.py** — Kokoro ONNX primary + edge-tts fallback.
- **audio/barge_in_controller.py** — chunked speech, dedup, barge-in.
- **/api/tts/events** — SSE for real TTS start/stop signals.
- **websocket_ptt_server.py** — WebSocket ingest for push-to-talk.

### PTT flow

Audio chunks → `/api/ptt` or WebSocket → WAV transcode → Foundry ASR or local faster-whisper → LLM response → TTS.

---

## 5. Vision & Desktop Automation

### Vision

- **/api/vision/load**, **/api/vision/unload** — load/unload Qwen2.5-VL model.
- **vision_tools.py** — camera capture and analysis.
- **model_router.py** — vision path uses llama.cpp endpoint.

### Desktop automation

- **desktop_hands.py** — screenshot, OCR, window focus, click/type/drag.
- **/api/desktop/** endpoints — open, launch, focus, windows, proofs.

---

## 6. System Telemetry + Logs

- **/api/telemetry** — instant metrics + rolling history.
- **logs/health.ndjson** — 30-second health snapshots.
- **health_log.json** — legacy health log.
- **audit_log.py** — action logging and audit events.
- **memory.json** — persistent conversation memory.

---

## 7. MCP Control Plane + Agents

### MCP server

- **cerebral_mcp_server.py** — FastMCP server exposing tools.

### Agent tool suite

- **Sentinel** — system health, processes, services.
- **Navigator** — Playwright web automation.
- **CodeScout** — code intelligence queries.
- **Archivist** — memory search, briefing, export.

---

## 8. Frontend UI (agent-lee-os2)

- **App.tsx** — screensaver UI, windowed panels, teleport themes.
- **TelemetryDashboard.tsx** — charts (sparklines, bars, gauges, donut, heatmap).
- **ChatModal.tsx** — streaming chat via SSE.
- **TaskSpinePanel.tsx** — plan preview + execution UI.

UI talks to daemon via same-origin endpoints, with optional env overrides (Vite).

---

## 9. Distribution & Ops

- **Cerebral_SAP7_Sovereign.py** — build pipeline (PyInstaller).
- **start_cerebral.bat** — launches daemon + MCP server + Cloudflared.
- **install_uv.ps1 / tools/** — setup helpers and diagnostics.

---

## 10. Known Limitations (Current State)

- Foundry and VL endpoints are external services and must be running separately.
- Desktop automation depends on local GUI availability and user session state.
- Policy approvals are enforced for input injection and shell execution.

---

## End of Report
