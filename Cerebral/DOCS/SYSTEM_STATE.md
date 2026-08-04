# Cerebral System State (Current Architecture)

**Updated:** 2026-03-08  
**Scope:** Code-accurate system map for the active Cerebral stack. This file avoids runtime claims; verify status using the health endpoints.

---

## 1. System Overview

Cerebral is a local Windows-based assistant platform with a single daemon that serves both UI and API, routes tasks through a policy gate, and provides a tool-first execution layer. The system includes a sovereign voice stack, optional vision module, and MCP agent tooling.

---

## 2. Core Runtime Components

- **CerebralDaemon.py** — Flask/Waitress server hosting UI + API on port 8765.
- **model_router.py** — Unified LLM router with Foundry auto-discovery.
- **task_spine.py** — Multi-step orchestration (plan → policy → execute → verify).
- **tool_router.py** — JSON tool contract parsing and dispatch.
- **body_state.py** — Live device and service snapshot for prompts.

---

## 3. Primary Endpoints

- `GET /api/health` — daemon health + Foundry availability
- `GET /api/telemetry` — system metrics + rolling history
- `POST /api/chat` — unified chat (chat/tool/plan/vision)
- `POST /api/chat/stream` — SSE streaming chat
- `POST /api/task` — explicit Task Spine execution
- `POST /api/task/plan` — plan preview without execution
- `GET /api/tts/voices` — TTS voice inventory
- `POST /api/ptt` — push-to-talk upload and transcription
- `GET /api/tts/events` — SSE TTS start/stop events

---

## 4. Voice Stack

- **Kokoro ONNX** is the primary local voice engine with phrase cache.
- **edge-tts** is used as a fallback stream.
- **SAPI** is the final fallback for text-to-speech if other engines fail.
- **PTT** supports WebSocket ingest (`websocket_ptt_server.py`) and HTTP ingest (`/api/ptt`).

---

## 5. Vision System

- **vision_tools.py** provides OpenCV-based camera capture and scene description.
- **vision_llm.py** supports optional Qwen2.5-VL (llama.cpp) load/unload via `/api/vision/load`.
- The vision module is on-demand; cold load is CPU-heavy and not auto-started.

---

## 6. Desktop Automation

- **desktop_hands.py** provides screenshot, OCR, window focus, click/type/drag, and proof capture.
- Policy tiers are enforced by **policy_engine.py**; input injection requires approval.

---

## 7. MCP Control Plane

- **cerebral_mcp_server.py** exposes SAP7 tools plus agent tools (Sentinel, Navigator, CodeScout, Archivist).
- This server can be started independently or via `start_cerebral.bat`.

---

## 8. UI Surfaces

- **agent-lee-os2/** — primary Vite + React UI (telemetry, chat, task spine).
- **www/** — built static assets served by the daemon at `/`.
- **Cerebral-os/** — alternate UI package (not wired by default).
- **digital-brain/** — standalone Next.js app (not wired to daemon).

---

## 9. Runtime Status Checks

- Open `http://127.0.0.1:8765/health` to confirm daemon health.
- Open `http://127.0.0.1:8765/api/telemetry` for live metrics.
- Open `http://127.0.0.1:8765/tools/status` to inspect bridge health.

---

## 10. Notes

- Foundry base URL is auto-discovered; override with `CEREBRAL_FOUNDRY_BASE` if needed.
- Policy approvals are enforced for high-risk actions like keyboard injection or shell commands.

| Log                     | Location                      | State                                    | Notes                                                                   |
| ----------------------- | ----------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `daemon.err`            | `C:\Cerebral\daemon.err`      | ✅ CLEAN (empty)                         | No errors at all                                                        |
| `health.ndjson`         | `logs/health.ndjson`          | ⚠️ Previously stale (last entry March 1) | **NOW FIXED** — health logger thread writes every 30s                   |
| `health_log.json`       | `C:\Cerebral\health_log.json` | ✅ Current                               | Disk health: C: 98.7GB free, D: 850GB free                              |
| `bridge_audit.jsonl`    | `logs/bridge_audit.jsonl`     | 🔲 Not created yet                       | Will be created on first bridge event                                   |
| `.playwright-mcp/*.log` | `.playwright-mcp/`            | Multiple console logs from March 4       | Contains 500 errors from `/api/chat` during Playwright tests (expected) |

### Health at time of audit

```
CPU: 46-78% (variable — Foundry inference is CPU-heavy)
RAM: 93-97% (13.7GB total, ~13.4GB used — system is RAM-constrained)
Disk C: 98.7GB free / 256GB total
Disk D: 850GB free / 1TB total
Foundry: online at port 56995
Daemon: online at port 8765
```

---

## 12. Frontend (React UI)

- **Tech:** Vite 6.4.1 + React 19 + TypeScript + TailwindCSS v4
- **Source:** `agent-lee-os2/src/`
- **Build:** `agent-lee-os2/dist/` → deployed to `www/`
- **Served by:** CerebralDaemon.py `/` route → `www/index.html`
- **Chart count:** 7 types (Sparkline, BarChart, PieChart, Gauge, AreaChart, DonutChart, HeatmapChart)
- **Click-to-enlarge:** All 12 chart tiles open a `ChartModal` on click

### Key frontend components

```
App.tsx            — Root, Screensaver + ChatModal
Screensaver        — 3D agent, animated background, PTT button
ChatModal          — Conversation UI, /api/chat, /api/chat/stream
TelemetryDashboard — 7 chart types, all with click-to-enlarge
DiagnosticsSidebar — System status, inline telemetry
AgentLee3D.tsx     — Three.js 3D avatar
```

---

## 13. Codebase Statistics (as of this audit)

| Language   | Files    | Lines        | Code Lines  |
| ---------- | -------- | ------------ | ----------- |
| JavaScript | ~80      | ~45,000      | ~38,000     |
| PowerShell | ~12      | ~8,000       | ~6,000      |
| Python     | ~28      | ~28,500      | ~22,000     |
| TSX        | ~19      | ~12,800      | ~10,000     |
| TypeScript | ~10      | ~6,000       | ~4,500      |
| **TOTAL**  | **~149** | **~100,300** | **~80,500** |

---

## 14. Task Execution Spine v1 (implemented 2026-03-06)

The spine transforms Cerebral from a reactive tool-routing assistant into a strategic planning-execution-verification loop.

### Architecture

```
User message
     │
     ▼
classify_intent()   ← task_spine.py (pattern-based, no LLM)
     │
  ┌──┴──────────────────────────────────────┐
  │  PLAN          TOOL          VISION    CHAT
  ▼
generate_plan()    ← planner_engine.py (Phi-3.5 via model_router)
     │
validate_plan()
     │
policy_check()     ← policy_engine.py (4-tier gate)
     │                ALLOW / ALLOW_LOG / APPROVE / DENY
     ▼
_execute_plan()    ← step-by-step with:
     │               - pre-action screenshot proof
     │               - tool call via tool_router
     │               - post-action screenshot proof
     │               - step verification (window_title / text_present)
     │               - retry (MAX_RETRIES=1)
     ▼
_log_to_memory()   ← writes task_execution entry to memory.json
     │
_compose_speak()   ← deterministic natural language
     ▼
TTS output
```

### New Files

| File              | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `task_spine.py`   | Unified execution orchestrator (~380 lines)         |
| `model_router.py` | Single LLM gateway — Foundry + llama.cpp VL routing |

### Rebuilt Files

| File                | Change                                                            |
| ------------------- | ----------------------------------------------------------------- |
| `policy_engine.py`  | Full rewrite: 4-tier (ALLOW/ALLOW_LOG/APPROVE/DENY), 35+ tool map |
| `planner_engine.py` | Full rewrite: Foundry LLM → ActionPlan, keyword fallback          |

### New API Routes

| Route                | Method | Purpose                                                         |
| -------------------- | ------ | --------------------------------------------------------------- |
| `/api/task`          | POST   | Full spine execution (plan → policy → execute → verify → proof) |
| `/api/task/plan`     | POST   | Preview plan without executing (policy-annotated steps)         |
| `/api/desktop/proof` | GET    | Screenshot + active window + open windows bundle                |
| `/api/spine/status`  | GET    | Spine/policy/planner health check                               |
| `/api/models`        | GET    | Model router catalogue + Foundry + VL health                    |

### Policy Tiers

| Tier        | Meaning                    | Examples                                 |
| ----------- | -------------------------- | ---------------------------------------- |
| `ALLOW`     | Silent pass-through        | `read_file`, `list_dir`, `screenshot`    |
| `ALLOW_LOG` | Proceed + audit entry      | `launch_app`, `write_file`, `open_path`  |
| `APPROVE`   | User confirmation required | `type_text`, `key_press`, `terminal.run` |
| `DENY`      | Hard block                 | `rmdir /s`, `format c:`, `reg delete`    |

### Model Router

Single gateway for all LLM calls. Discovers Foundry URL via CLI probe, auto-falls back to keyword logic when offline.

```
model_router.call("dialogue", message)   → Phi-3.5 chat
model_router.call("plan", goal)          → Phi-3.5 ActionPlan JSON
model_router.call("tool_json", desc)     → Phi-3.5 arg generation
model_router.call("briefing", context)   → Phi-3.5 spoken summary
model_router.call_vision(q, image_b64)   → Qwen2.5-VL via llama.cpp
model_router.health()                    → {foundry_ok, vl_ok, models}
```

### UI: Task Spine Panel

New `TaskSpinePanel.tsx` component (right slide-out panel):

- Goal input with Ctrl+Enter preview shortcut
- "Preview Plan" → shows annotated steps with policy tier badges
- "Run Task" → executes and shows step-by-step results + proof paths
- "Auto-Approve" → runs with all approvals pre-granted
- Model status bar (Foundry OK / VL standby)
- Accessible via the sun-icon button (bottom-right, next to fullscreen)

---

## 15. What's Next / Known Gaps

### Resolved (this session)

- ~~`policy_engine.py` — Stub only~~ → Full 4-tier gate implemented ✅
- ~~`planner_engine.py` uncalled~~ → Wired into spine, tested ✅
- ~~MCP server not verified at startup~~ → Startup health check thread added ✅
- ~~No multi-step execution loop~~ → Task Spine v1 fully operational ✅
- ~~No model routing~~ → model_router.py created ✅

### High Priority

1. **RAM pressure** — 95%+ usage. Foundry + daemon + VS Code tight. Consider swap file increase.
2. **Vision LLM cold start** — `vision_llm.load()` deferred. Use `/api/vision/load` before first vision request. 60s warm-up cost.
3. **Proof screenshots** — `_take_proof_screenshot()` currently returns None (pyautogui not installed or headless). Install pyautogui or use win32api fallback.

### Medium Priority

1. **Spine-in-chat path** — `/api/chat` classifies intent then runs spine for PLAN requests. Verify end-to-end with voice input.
2. **Vision step verification** — `text_present:<needle>` verify hint uses screenshot OCR — needs pytesseract or win32 accessibility API.
3. **Approval UI** — When policy returns APPROVE, the UI should show a confirmation dialog (currently auto-denied without `approve_all`).
4. **Agent endpoints in UI** — TelemetryDashboard could show agent run history.

### Low Priority

1. **Dead code cleanup** — `talk.py`, old `server.py`.
2. **Legacy launcher references** — keep `cerebral_daemon.py` as shim-only, avoid adding new runtime logic there.
3. **Phrase cache expansion** — Currently 24 phrases. Expand to 100+ common responses.
4. **Session logging** — Auto-export conversations to `logs/exports/` on shutdown.

---

## 16. How to Run Everything

```bat
start_cerebral.bat
  → python CerebralDaemon.py        (port 8765, threads=8)
  → python cerebral_mcp_server.py   (FastMCP SSE, MCP tools)

VS Code MCP Servers (vscode-mcp-settings-snippet.json):
  → Playwright MCP (node tool.js playwright)
  → TestSprite MCP (node tool.js testsprite)
  → InsForge MCP
  → LeewayGemini Stitch MCP
```

---

_Updated 2026-03-06 — Task Execution Spine v1 implemented and deployed._
