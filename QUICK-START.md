# 🚀 SEA Quick Start Guide

This guide will get you up and running with SEA (Single Execution Authority) in under 5 minutes.

---

## ✅ Prerequisites

- Python 3.10+ with virtual environment activated
- Node.js 18+ and npm
- Windows PowerShell (for the quick start scripts)

---

## 📦 Step 1: Install Dependencies

### Python Dependencies

```powershell
# Make sure you're in the Cerebral virtual environment
& "E:/.LeeWay-Produucts-File/Leeway-Ecosystem v2.1.4/Cerebral/.venv/Scripts/Activate.ps1"

# Install Python packages
pip install -r core/sea/requirements.txt
```

### Node Dependencies

```powershell
# Navigate to UI directory
cd core/sea/ui

# Install Node packages
npm install

# Return to workspace root
cd ../../..
```

---

## 🎯 Step 2: Start SEA Core + Control Plane

### Option A: Using Quick Start Script (Recommended)

```powershell
.\START-SEA.ps1
```

### Option B: Manual Start

```powershell
# Activate virtual environment if not already active
& "E:/.LeeWay-Produucts-File/Leeway-Ecosystem v2.1.4/Cerebral/.venv/Scripts/Activate.ps1"

# Start SEA
python core/sea/launchers/start_sea.py
```

**Expected Output:**
```
============================================================
SEA PRODUCTION LAUNCHER
============================================================
[2026-06-20 17:30:00] INFO: Initializing SEA Core...
[2026-06-20 17:30:00] INFO: Starting Control Plane API on http://127.0.0.1:8000
[2026-06-20 17:30:00] INFO: Starting SEA Core execution loop...
============================================================
SEA EXECUTION LOOP STARTED
============================================================
Press Ctrl+C to shutdown gracefully
```

**Control Plane API is now available at:** http://127.0.0.1:8000

---

## 🎨 Step 3: Start Dashboard (Optional)

Open a **second PowerShell terminal** and run:

### Option A: Using Quick Start Script (Recommended)

```powershell
.\START-SEA-UI.ps1
```

### Option B: Manual Start

```powershell
cd core/sea/ui
npm run dev
```

**Expected Output:**
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

**Dashboard is now available at:** http://localhost:3001

---

## 🔍 Step 4: Verify Installation

### Check Control Plane API

Open your browser or use curl:

```powershell
# Check API health
curl http://127.0.0.1:8000/api/v1/health

# Check system state
curl http://127.0.0.1:8000/api/v1/state

# Check registered adapters
curl http://127.0.0.1:8000/api/v1/registry
```

### Check Dashboard

1. Open http://localhost:3001 in your browser
2. You should see:
   - Real-time execution flow graph
   - Live metrics panel (queue depth, success rate, CPU, memory)
   - Health alerts panel
   - WebSocket connection status (green = connected)

---

## 🛑 Stopping SEA

### Graceful Shutdown

Press **Ctrl+C** in the terminal running SEA. You should see:

```
Shutdown requested...
Stopping SEA Core...
Shutdown complete
```

### Stop Dashboard

Press **Ctrl+C** in the terminal running the dashboard.

---

## 📊 What's Running?

When SEA is active, you have:

1. **SEA Core Loop** (100Hz deterministic execution)
   - Processes requests through governance
   - Routes to appropriate adapters
   - Writes receipts for all actions
   - Maintains system state

2. **Control Plane API** (FastAPI server on port 8000)
   - REST endpoints for state/health/metrics
   - WebSocket endpoint for real-time events
   - State snapshot engine (60s intervals)
   - Health monitoring with alerts

3. **Dashboard** (React app on port 3001) - Optional
   - Real-time visualization
   - System graph with React Flow
   - Live metrics and alerts
   - WebSocket streaming

---

## 🧪 Next Steps

### Run Stability Tests

After verifying basic operation, run stability tests:

```powershell
# 1-hour stability test
python core/sea/launchers/stability_test_1h.py

# 24-hour stability test (after 1-hour passes)
python core/sea/launchers/stability_test_24h.py
```

### Explore the API

```powershell
# Get current system state
curl http://127.0.0.1:8000/api/v1/state | ConvertFrom-Json

# Get health status
curl http://127.0.0.1:8000/api/v1/health | ConvertFrom-Json

# Get performance metrics
curl http://127.0.0.1:8000/api/v1/metrics | ConvertFrom-Json
```

### Check Receipts

All SEA actions are receipted to:

```
Archive/receipts/sea/<YYYY>/<MM>/<DD>/
```

### Check State Snapshots

State snapshots are saved every 60 seconds to:

```
Archive/runtime-state/
```

---

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'core'"

**Solution**: Make sure you're running from the workspace root directory:

```powershell
# Check current directory
Get-Location

# Should be: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4
```

### "Port 8000 already in use"

**Solution**: Another process is using port 8000. Either:
1. Stop the other process
2. Or modify `core/sea/launchers/start_sea.py` to use a different port

### "Cannot find module 'react'"

**Solution**: Install Node dependencies:

```powershell
cd core/sea/ui
npm install
cd ../../..
```

### Dashboard shows "WebSocket disconnected"

**Solution**: Make sure SEA Core is running first (it provides the WebSocket endpoint).

### High CPU usage

**Solution**: This is expected during the first few minutes as models warm up. If it persists:
1. Check `Archive/receipts/sea/` for error receipts
2. Check `Archive/runtime-state/` for state snapshots
3. Run health check: `curl http://127.0.0.1:8000/api/v1/health`

---

## 📚 Additional Documentation

- **Complete User Guide**: `SEA-USER-GUIDE.md` (500 lines)
- **System Delivery Document**: `SEA-COMPLETE-SYSTEM-DELIVERY.md` (600 lines)
- **Architecture Details**: `core/sea/ARCHITECTURE.md`
- **API Reference**: `core/sea/control_plane/API.md`

---

## 🎯 Summary

**To start SEA:**
```powershell
.\START-SEA.ps1
```

**To start Dashboard:**
```powershell
.\START-SEA-UI.ps1
```

**To stop:**
Press **Ctrl+C** in each terminal

**URLs:**
- Control Plane API: http://127.0.0.1:8000
- Dashboard: http://localhost:3001

---

**Status**: ✅ Ready for production after stability tests  
**Version**: SEA v1.0.0  
**Last Updated**: 2026-06-20