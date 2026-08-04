# Agent Lee OS2 Standalone Extraction Plan

**Generated**: 2026-06-19  
**Goal**: Make agent-lee-os2 completely standalone with minimal backend extracted from Cerebral

---

## Overview

This plan extracts only the **essential Leeway Runtime Fabric and Agent Lee code** from Cerebral into agent-lee-os2, creating a self-contained package without legacy/junk files.

---

## Phase 1: Core Backend Extraction (Essential)

### Step 1.1: Create Backend Structure

```powershell
# Create backend directory structure
New-Item -ItemType Directory -Path "Cerebral/agent-lee-os2/backend" -Force
New-Item -ItemType Directory -Path "Cerebral/agent-lee-os2/backend/audio" -Force
New-Item -ItemType Directory -Path "Cerebral/agent-lee-os2/backend/config" -Force
```

### Step 1.2: Extract Core Server (server.py)

**Source**: `Cerebral/CerebralDaemon.py` (lines 1-3600)  
**Target**: `Cerebral/agent-lee-os2/backend/server.py`

**Extract these endpoints**:
```python
# Essential endpoints only
@app.route('/')                              # Line 522 - Serve index.html
@app.route('/api/health')                    # Line 1484 - Health check
@app.route('/api/telemetry')                 # Line 1497 - System telemetry
@app.route('/api/agent-lee/chat')            # Line 2381 - Agent Lee chat
@app.route('/api/chat/stream')               # Line 2955 - SSE streaming
@app.route('/api/chat/tts')                  # Line 1795 - TTS synthesis
@app.route('/api/tts/events')                # Line 1863 - TTS events SSE
@app.route('/api/tts/voices')                # Line 1747 - Voice list
@app.route('/api/tts/voice')                 # Line 1756 - Set voice
@app.route('/api/settings')                  # Line 1527 - Settings CRUD
@app.route('/api/user')                      # Line 1885 - User profile
@app.route('/api/runtime/bridge')            # Line 3482 - Runtime bridge status
@app.route('/api/runtime/artifacts/<path>')  # Line 3493 - Artifact serving
```

**Remove these imports** (not needed for minimal):
```python
# Remove unused imports
from memory_engine import append_memory
from file_engine import analyze_file, list_large_files, move_file
from task_queue import add_task
from planner_engine import generate_plan, validate_plan
from audit_log import log_event
from persona import CEREBRAL_SYSTEM_PROMPT
from file_indexer import build_repo_map, search_index
from desktop_hands import get_hands
from convert_tools import convert
from model_registry import load_registry  # Keep if using /api/models
from task_spine import run_spine  # Remove if not using task spine
from agents import AGENT_REGISTRY  # Remove if not using agents
from vision_tools import capture_and_analyse  # Remove
```

**Keep these imports**:
```python
# Essential imports
import os
import sys
import json
import requests
import psutil
from datetime import datetime
from flask import Flask, jsonify, request, Response, send_from_directory
from flask_cors import CORS
from collections import deque
```

### Step 1.3: Extract Cerebral Bridge

**Source**: `Cerebral/cerebral_bridge.py` (entire file)  
**Target**: `Cerebral/agent-lee-os2/backend/cerebral_bridge.py`

**Action**: Copy entire file, it's already modular

**Dependencies**:
- `policy_engine.py` (extract next)

### Step 1.4: Extract Policy Engine

**Source**: `Cerebral/policy_engine.py` (entire file)  
**Target**: `Cerebral/agent-lee-os2/backend/policy_engine.py`

**Action**: Copy entire file

**Dependencies**: None (self-contained)

### Step 1.5: Extract Body State

**Source**: `Cerebral/body_state.py` (entire file)  
**Target**: `Cerebral/agent-lee-os2/backend/body_state.py`

**Action**: Copy entire file

**Dependencies**: None (self-contained)

### Step 1.6: Extract Runtime Live Bridge

**Source**: `Cerebral/runtime_live_bridge.py` (entire file)  
**Target**: `Cerebral/agent-lee-os2/backend/runtime_live_bridge.py`

**Action**: Copy entire file, remove unused functions

**Keep only**:
- `get_live_bridge_paths()`
- `invoke_agent_tool()` (if needed)

**Remove**:
- Unused helper functions

### Step 1.7: Extract Audio System

**Source Files**:
- `Cerebral/audio/piper_tts_worker.py`
- `Cerebral/audio/piper_voices.py`
- `Cerebral/audio/barge_in_controller.py`

**Target**: `Cerebral/agent-lee-os2/backend/audio/`

**Action**: Copy all three files

**Dependencies**:
- External: `piper` TTS engine (optional)
- Python: None (graceful degradation if missing)

### Step 1.8: Create Minimal Requirements

**Target**: `Cerebral/agent-lee-os2/backend/requirements.txt`

```txt
flask>=3.0.0
flask-cors>=4.0.0
requests>=2.31.0
psutil>=5.9.0
```

### Step 1.9: Create Backend Package Init

**Target**: `Cerebral/agent-lee-os2/backend/__init__.py`

```python
"""
Agent Lee OS2 Backend
Minimal standalone server for Agent Lee OS2 UI
"""
__version__ = "2.0.0"
```

### Step 1.10: Create Startup Script

**Target**: `Cerebral/agent-lee-os2/backend/start.ps1`

```powershell
# Start Agent Lee OS2 Backend
$ErrorActionPreference = "Stop"

Write-Host "Starting Agent Lee OS2 Backend..." -ForegroundColor Cyan

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Python not found" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt --quiet

# Set environment
$env:FLASK_APP = "server.py"
$env:FLASK_ENV = "development"
$env:CEREBRAL_UI_DIST = "../dist"

# Start server
Write-Host "Starting server on http://127.0.0.1:8765" -ForegroundColor Green
python -m flask run --host=127.0.0.1 --port=8765
```

---

## Phase 2: Optional Features (If Needed)

### Step 2.1: Task Spine (Optional)

**Source**: `Cerebral/task_spine.py`  
**Target**: `Cerebral/agent-lee-os2/backend/task_spine.py`

**Endpoints to add**:
```python
@app.route('/api/task/plan')     # Line 3387
@app.route('/api/task')          # Line 3333
@app.route('/api/spine/status')  # Line 3469
```

**Dependencies**:
- `planner_engine.py`
- `tool_router.py`

### Step 2.2: Model Registry (Optional)

**Source**: `Cerebral/model_registry.py`  
**Target**: `Cerebral/agent-lee-os2/backend/model_registry.py`

**Endpoints to add**:
```python
@app.route('/api/models')          # Line 3512
@app.route('/api/models/registry') # Line 2551
@app.route('/api/models/list')     # Line 2560
```

### Step 2.3: File Operations (Optional)

**Source**: `Cerebral/file_indexer.py`  
**Target**: `Cerebral/agent-lee-os2/backend/file_indexer.py`

**Endpoints to add**:
```python
@app.route('/api/files/list')    # Line 1925
@app.route('/api/files/read')    # Line 1948
@app.route('/api/files/write')   # Line 1962
@app.route('/api/files/search')  # Line 1994
```

---

## Phase 3: Configuration

### Step 3.1: Create Config File

**Target**: `Cerebral/agent-lee-os2/backend/config/default.json`

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 8765,
    "debug": false
  },
  "runtime_fabric": {
    "url": "http://127.0.0.1:4001",
    "timeout": 180
  },
  "agent_lee_router": {
    "url": "http://127.0.0.1:8080",
    "timeout": 180
  },
  "ollama": {
    "url": "http://127.0.0.1:11434",
    "timeout": 60
  },
  "desktop_runtime": {
    "url": "http://127.0.0.1:8091",
    "timeout": 600
  },
  "tts": {
    "enabled": true,
    "default_voice": "en_US-amy-medium"
  },
  "ui": {
    "dist_path": "../dist"
  }
}
```

### Step 3.2: Update Frontend Config

**Target**: `Cerebral/agent-lee-os2/.env.local`

```env
# Agent Lee OS2 Backend
VITE_AGENT_LEE_CHAT_URL=/api/agent-lee/chat
VITE_HEALTH_URL=/api/health
VITE_SPEAK_URL=/api/chat/tts
VITE_SETTINGS_URL=/api/settings
```

---

## Phase 4: Testing

### Step 4.1: Test Core Endpoints

```powershell
# Start backend
cd Cerebral/agent-lee-os2/backend
./start.ps1

# In another terminal, test endpoints
curl http://127.0.0.1:8765/api/health
curl http://127.0.0.1:8765/api/telemetry
curl -X POST http://127.0.0.1:8765/api/agent-lee/chat -H "Content-Type: application/json" -d '{"input":"Hello"}'
```

### Step 4.2: Test Frontend

```powershell
# Start frontend dev server
cd Cerebral/agent-lee-os2
npm run dev

# Visit http://localhost:5173
# Test chat, TTS, settings
```

### Step 4.3: Test Production Build

```powershell
# Build frontend
cd Cerebral/agent-lee-os2
npm run build

# Start backend (serves built frontend)
cd backend
./start.ps1

# Visit http://127.0.0.1:8765
```

---

## Phase 5: Cleanup Cerebral

### Step 5.1: Identify Removable Files

**Safe to remove** (not used by agent-lee-os2):

```
Cerebral/
├── cerebral_prime.py          ❌ Remove (alternative server)
├── fastapi_app/               ❌ Remove (alternative server)
├── Cerebral_ui.py             ❌ Remove (old tkinter UI)
├── staging/                   ❌ Remove (old code)
├── archive/                   ❌ Remove (legacy)
├── .venv.broken-*/            ❌ Remove (broken venv)
├── talk.py                    ❌ Remove (unused)
├── vision_llm.py              ❌ Remove (unused)
├── digital-brain/             ❌ Remove (unused)
├── deployments/               ❌ Remove (unused)
├── integrations/              ❌ Remove (unused)
├── intelligence/              ❌ Remove (unused)
├── modules/                   ❌ Remove (unused)
├── get-pip.py                 ❌ Remove (installer)
├── get-pip-2.py               ❌ Remove (installer)
└── server.py                  ❌ Remove (old server)
```

**Keep for reference** (until agent-lee-os2 is stable):

```
Cerebral/
├── CerebralDaemon.py          ✅ Keep (reference)
├── cerebral_bridge.py         ✅ Keep (reference)
├── policy_engine.py           ✅ Keep (reference)
├── body_state.py              ✅ Keep (reference)
├── runtime_live_bridge.py     ✅ Keep (reference)
├── audio/                     ✅ Keep (reference)
├── tools/                     ✅ Keep (maintenance scripts)
├── tests/                     ✅ Keep (tests)
└── logs/                      ✅ Keep (logs)
```

### Step 5.2: Create Cleanup Script

**Target**: `Cerebral/cleanup-unused.ps1`

```powershell
# Cleanup unused Cerebral files
$ErrorActionPreference = "Stop"

Write-Host "Cleaning up unused Cerebral files..." -ForegroundColor Cyan

$toRemove = @(
    "cerebral_prime.py",
    "fastapi_app",
    "Cerebral_ui.py",
    "staging",
    "archive",
    ".venv.broken-20260609-090655",
    "talk.py",
    "vision_llm.py",
    "digital-brain",
    "deployments",
    "integrations",
    "intelligence",
    "modules",
    "get-pip.py",
    "get-pip-2.py",
    "server.py"
)

foreach ($item in $toRemove) {
    $path = Join-Path "Cerebral" $item
    if (Test-Path $path) {
        Write-Host "Removing: $item" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force
    }
}

Write-Host "Cleanup complete!" -ForegroundColor Green
```

---

## Phase 6: Documentation

### Step 6.1: Update agent-lee-os2 README

**Target**: `Cerebral/agent-lee-os2/README.md`

```markdown
# Agent Lee OS2 (Standalone)

Standalone Agent Lee OS with minimal backend extracted from Cerebral.

## Architecture

```
agent-lee-os2/
├── backend/          # Minimal Flask backend
│   ├── server.py     # Core API endpoints
│   ├── audio/        # TTS system
│   └── config/       # Configuration
├── src/              # React frontend
└── dist/             # Built frontend (served by backend)
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Leeway Runtime Fabric running on port 4001
- Agent Lee Router running on port 8080
- Ollama running on port 11434

### Start Backend
```powershell
cd backend
./start.ps1
```

### Start Frontend (Development)
```powershell
npm install
npm run dev
```

### Production Build
```powershell
npm run build
cd backend
./start.ps1
# Visit http://127.0.0.1:8765
```

## API Endpoints

See [agent-lee-os2-api-audit.md](../agent-lee-os2-api-audit.md) for full API documentation.

## Dependencies

### Backend
- Flask - Web server
- Flask-CORS - CORS support
- requests - HTTP client
- psutil - System metrics

### Frontend
- React 19
- Vite 6
- Motion (Framer Motion)
- Lucide React (icons)

## Configuration

Edit `backend/config/default.json` to customize:
- Server port
- Runtime Fabric URL
- Agent Lee Router URL
- Ollama URL
- TTS settings
```

### Step 6.2: Create Migration Guide

**Target**: `Cerebral/MIGRATION.md`

```markdown
# Cerebral → Agent Lee OS2 Migration Guide

## What Changed

Agent Lee OS2 is now **standalone** with its own minimal backend extracted from Cerebral.

## Before (Old Architecture)

```
Cerebral/
├── CerebralDaemon.py (3600+ lines, many unused features)
├── agent-lee-os2/ (UI only, depends on parent Cerebral)
└── [many unused modules]
```

## After (New Architecture)

```
agent-lee-os2/
├── backend/ (minimal, ~500 lines, essential only)
│   ├── server.py
│   ├── cerebral_bridge.py
│   ├── policy_engine.py
│   └── audio/
└── src/ (React UI)
```

## Migration Steps

1. **Stop old Cerebral daemon**
2. **Start new agent-lee-os2 backend**
3. **Test all features**
4. **Remove unused Cerebral files** (optional)

## What Was Removed

- Old tkinter UI
- Alternative servers (cerebral_prime, fastapi_app)
- Unused modules (vision_llm, talk, etc.)
- Staging/archive directories
- Broken virtual environments

## What Was Kept

- Core chat functionality
- TTS system
- Runtime Fabric integration
- Cerebral Bridge
- Policy engine
```

---

## Execution Checklist

### Phase 1: Core Extraction ✅
- [ ] Create backend directory structure
- [ ] Extract server.py with essential endpoints
- [ ] Copy cerebral_bridge.py
- [ ] Copy policy_engine.py
- [ ] Copy body_state.py
- [ ] Copy runtime_live_bridge.py
- [ ] Copy audio/ directory
- [ ] Create requirements.txt
- [ ] Create __init__.py
- [ ] Create start.ps1

### Phase 2: Configuration ✅
- [ ] Create config/default.json
- [ ] Update .env.local

### Phase 3: Testing ✅
- [ ] Test /api/health
- [ ] Test /api/telemetry
- [ ] Test /api/agent-lee/chat
- [ ] Test /api/chat/tts
- [ ] Test frontend dev mode
- [ ] Test production build

### Phase 4: Documentation ✅
- [ ] Update README.md
- [ ] Create MIGRATION.md
- [ ] Document API endpoints

### Phase 5: Cleanup (Optional) ⚠️
- [ ] Review unused files
- [ ] Run cleanup script
- [ ] Verify nothing broke

---

## Success Criteria

✅ agent-lee-os2 runs standalone without parent Cerebral directory  
✅ Chat works (connects to Runtime Fabric → Router → Ollama)  
✅ TTS works (speech synthesis and playback)  
✅ Health/telemetry endpoints work  
✅ Settings persist  
✅ Production build serves correctly  
✅ No unused Cerebral dependencies  

---

## Rollback Plan

If extraction fails:
1. Keep original Cerebral/ directory intact
2. Delete agent-lee-os2/backend/
3. Revert to old architecture
4. Investigate issues
5. Try again with lessons learned

---

## Timeline Estimate

- **Phase 1 (Core)**: 2-3 hours
- **Phase 2 (Config)**: 30 minutes
- **Phase 3 (Testing)**: 1-2 hours
- **Phase 4 (Docs)**: 1 hour
- **Phase 5 (Cleanup)**: 1 hour (optional)

**Total**: 5-7 hours for complete extraction and testing