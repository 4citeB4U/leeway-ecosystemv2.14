# Agent Lee OS2 API Audit & Dependency Analysis

**Generated**: 2026-06-19  
**Purpose**: Document all API endpoints called by agent-lee-os2 frontend and map to CerebralDaemon.py implementations

---

## Executive Summary

Agent Lee OS2 frontend calls **35+ API endpoints** from CerebralDaemon.py. This audit identifies:
- ✅ **Essential endpoints** - Required for core functionality
- ⚠️ **Optional endpoints** - Nice-to-have features
- ❌ **Unused endpoints** - Can be removed from Cerebral

---

## Core API Endpoints (Essential)

### 1. Chat & AI
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `POST /api/agent-lee/chat` | CerebralDaemon.py | 2381 | requests, _probe_canonical_agent_lee() | ✅ ESSENTIAL |
| `POST /api/chat/stream` | CerebralDaemon.py | 2955 | SSE, model_router, memory_engine | ✅ ESSENTIAL |

**Dependencies**:
- `requests` (stdlib-like)
- Runtime Fabric proxy (port 4001)
- Agent Lee Router (port 8080)

---

### 2. Health & Telemetry
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET /api/health` | CerebralDaemon.py | 1484 | psutil, system_info() | ✅ ESSENTIAL |
| `GET /health` | CerebralDaemon.py | 1718 | psutil | ✅ ESSENTIAL |
| `GET /api/telemetry` | CerebralDaemon.py | 1497 | psutil, shutil | ✅ ESSENTIAL |

**Dependencies**:
- `psutil` - system metrics
- `shutil` - disk usage

---

### 3. TTS (Text-to-Speech)
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `POST /api/chat/tts` | CerebralDaemon.py | 1795 | audio/piper_tts_worker, speech_agent | ✅ ESSENTIAL |
| `GET /api/tts/events` | CerebralDaemon.py | 1863 | SSE, _tts_event_queue | ✅ ESSENTIAL |
| `GET /api/tts/voices` | CerebralDaemon.py | 1747 | audio/piper_voices | ✅ ESSENTIAL |
| `POST /api/tts/voice` | CerebralDaemon.py | 1756 | audio/piper_voices | ✅ ESSENTIAL |

**Dependencies**:
- `audio/piper_tts_worker.py`
- `audio/piper_voices.py`
- `audio/barge_in_controller.py` (SpeechAgent)

---

### 4. Runtime Bridge
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET /api/runtime/bridge` | CerebralDaemon.py | 3482 | runtime_live_bridge.get_live_bridge_paths() | ✅ ESSENTIAL |
| `GET /api/runtime/artifacts/<path>` | CerebralDaemon.py | 3493 | send_from_directory | ✅ ESSENTIAL |

**Dependencies**:
- `runtime_live_bridge.py`

---

### 5. Settings & User
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET/POST /api/settings` | CerebralDaemon.py | 1527 | JSON file I/O | ✅ ESSENTIAL |
| `GET/POST /api/user` | CerebralDaemon.py | 1885 | JSON file I/O | ✅ ESSENTIAL |

**Dependencies**: None (pure Python)

---

## Optional Endpoints (Nice-to-Have)

### 6. Task Spine
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `POST /api/task/plan` | CerebralDaemon.py | 3387 | task_spine, planner_engine | ⚠️ OPTIONAL |
| `POST /api/task` | CerebralDaemon.py | 3333 | task_spine, tool_router | ⚠️ OPTIONAL |
| `GET /api/spine/status` | CerebralDaemon.py | 3469 | task_spine | ⚠️ OPTIONAL |

**Dependencies**:
- `task_spine.py`
- `planner_engine.py`
- `tool_router.py`
- `policy_engine.py`

---

### 7. Models & Registry
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET /api/models` | CerebralDaemon.py | 3512 | model_registry | ⚠️ OPTIONAL |
| `GET /api/models/registry` | CerebralDaemon.py | 2551 | model_registry | ⚠️ OPTIONAL |
| `GET /api/models/list` | CerebralDaemon.py | 2560 | model_registry | ⚠️ OPTIONAL |

**Dependencies**:
- `model_registry.py`

---

### 8. Launcher
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `POST /api/launcher/start` | CerebralDaemon.py | 2568 | subprocess, desktop runtime proxy | ⚠️ OPTIONAL |

**Dependencies**:
- Desktop runtime (port 8091)

---

### 9. PTT (Push-to-Talk)
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `POST /api/ptt` | CerebralDaemon.py | 2128 | WebSocket, audio processing | ⚠️ OPTIONAL |

**Dependencies**:
- Audio capture/processing

---

### 10. Local Voice
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `POST /api/local-voice/agent-lee-capture` | CerebralDaemon.py | 1095 | faster_whisper, numpy, wave | ⚠️ OPTIONAL |
| `GET /api/local-voice/status` | CerebralDaemon.py | 1222 | None | ⚠️ OPTIONAL |

**Dependencies**:
- `faster_whisper`
- `numpy`

---

### 11. Tunnel Management
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET /api/tunnel/status` | CerebralDaemon.py | 1609 | subprocess | ⚠️ OPTIONAL |
| `POST /api/tunnel/start` | CerebralDaemon.py | 1625 | subprocess (ngrok/cloudflared) | ⚠️ OPTIONAL |
| `POST /api/tunnel/stop` | CerebralDaemon.py | 1663 | subprocess | ⚠️ OPTIONAL |
| `POST /api/tunnel/telegram` | CerebralDaemon.py | 1682 | requests | ⚠️ OPTIONAL |

**Dependencies**:
- `subprocess`
- External tools: ngrok, cloudflared

---

### 12. File Operations
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET /api/files/list` | CerebralDaemon.py | 1925 | os.listdir | ⚠️ OPTIONAL |
| `GET /api/files/read` | CerebralDaemon.py | 1948 | file I/O | ⚠️ OPTIONAL |
| `POST /api/files/write` | CerebralDaemon.py | 1962 | file I/O | ⚠️ OPTIONAL |
| `GET /api/files/open` | CerebralDaemon.py | 1981 | subprocess | ⚠️ OPTIONAL |
| `GET /api/files/search` | CerebralDaemon.py | 1994 | file_indexer | ⚠️ OPTIONAL |

**Dependencies**:
- `file_indexer.py`

---

### 13. Device Status
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `GET /api/device/local/status` | CerebralDaemon.py | 1462 | _read_wsl_status() | ⚠️ OPTIONAL |
| `GET /api/device/wsl/status` | CerebralDaemon.py | 1467 | _read_wsl_status() | ⚠️ OPTIONAL |

**Dependencies**: None (subprocess calls)

---

### 14. Proxy Endpoints
| Endpoint | File | Line | Dependencies | Status |
|----------|------|------|--------------|--------|
| `/fabric/<path>` | CerebralDaemon.py | 2532 | requests (proxy to 4001) | ⚠️ OPTIONAL |
| `/brain/<path>` | CerebralDaemon.py | 2526 | requests (proxy to 8080) | ⚠️ OPTIONAL |
| `/ollama/<path>` | CerebralDaemon.py | 2538 | requests (proxy to 11434) | ⚠️ OPTIONAL |
| `/desktop/<path>` | CerebralDaemon.py | 2544 | requests (proxy to 8091) | ⚠️ OPTIONAL |

**Dependencies**:
- `requests`

---

## Unused Cerebral Modules (Can Be Removed)

### Files NOT Called by agent-lee-os2:

1. **`cerebral_prime.py`** - Alternative server (not used)
2. **`fastapi_app/`** - FastAPI variant (not used)
3. **`Cerebral_ui.py`** - Old tkinter UI (not used)
4. **`staging/`** - Old/broken code
5. **`archive/`** - Legacy implementations
6. **`.venv.broken-*`** - Broken virtual environments
7. **`talk.py`** - Unused voice module
8. **`vision_llm.py`** - Unused vision module
9. **`tools/`** - Maintenance scripts (not runtime)
10. **`tests/`** - Test files (keep separate)
11. **`digital-brain/`** - Unused
12. **`deployments/`** - Unused
13. **`integrations/`** - Unused
14. **`intelligence/`** - Unused
15. **`modules/`** - Unused

---

## Minimal Dependency Tree for Standalone agent-lee-os2

### Core Backend Files (MUST EXTRACT):

```
agent-lee-os2/
├── backend/
│   ├── server.py                    # Minimal Flask server with essential endpoints
│   ├── cerebral_bridge.py           # Bridge control plane (from Cerebral/)
│   ├── policy_engine.py             # Authorization checks
│   ├── body_state.py                # Workspace/system state
│   ├── runtime_live_bridge.py       # Runtime Fabric integration
│   ├── model_registry.py            # Model routing info
│   └── audio/
│       ├── piper_tts_worker.py      # TTS generation
│       ├── piper_voices.py          # Voice registry
│       └── barge_in_controller.py   # Speech agent
```

### Optional Backend Files (NICE TO HAVE):

```
├── backend/
│   ├── task_spine.py                # Task execution
│   ├── planner_engine.py            # Plan generation
│   ├── tool_router.py               # Tool routing
│   ├── file_indexer.py              # File search
│   └── model_router.py              # LLM routing
```

### Python Dependencies:

```
flask
flask-cors
requests
psutil
```

### Optional Python Dependencies:

```
faster-whisper  # For local voice
numpy           # For audio processing
```

---

## Extraction Strategy

### Phase 1: Core Extraction (Minimal Viable)
1. Extract essential endpoints to `agent-lee-os2/backend/server.py`
2. Copy `cerebral_bridge.py`, `policy_engine.py`, `body_state.py`, `runtime_live_bridge.py`
3. Copy `audio/` directory
4. Test chat, health, TTS, settings

### Phase 2: Optional Features
1. Add task spine endpoints if needed
2. Add file operations if needed
3. Add tunnel management if needed

### Phase 3: Cleanup
1. Remove unused Cerebral modules
2. Document what was kept vs removed
3. Update README

---

## Recommendations

1. **Start with Phase 1** - Get core chat + TTS working standalone
2. **Keep Cerebral as reference** - Don't delete until agent-lee-os2 is proven
3. **Use environment variables** - Make ports configurable
4. **Add health checks** - Verify Runtime Fabric, Router, Ollama connectivity
5. **Document dependencies** - Clear README for setup

---

## Next Steps

1. Create `agent-lee-os2/backend/` directory structure
2. Extract core server endpoints
3. Copy essential modules
4. Test standalone operation
5. Iterate on optional features
6. Clean up Cerebral once stable