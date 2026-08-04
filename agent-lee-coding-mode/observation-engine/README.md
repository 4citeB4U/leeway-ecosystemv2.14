# Agent Lee Observation Engine (ALOE)

**Status**: PRODUCTION READY  
**Version**: 1.0.0  
**Purpose**: Continuous Windows OS state observation for Agent Lee Prime

---

## Quick Start

### 1. Test Bootstrap (Recommended First Step)

```powershell
cd "E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\observation-engine"
.\TEST-ALOE-NOW.ps1
```

This will:
- ✅ Initialize all assemblies
- ✅ Create all directories
- ✅ Import all modules
- ✅ Run validation test
- ✅ Generate bootstrap receipt

### 2. Run Observation Loop Manually

```powershell
.\agent-lee-bootstrap.ps1
```

This will:
- Run bootstrap
- Start continuous observation loop (1 second interval)
- Log state to `logs/state/state.jsonl`
- Press Ctrl+C to stop

### 3. Register as Scheduled Task (Auto-Start on Boot)

```powershell
.\REGISTER-ALOE-TASK.ps1
```

This will:
- Register Windows Scheduled Task
- Auto-start on logon
- Run as SYSTEM account
- Auto-restart on failure

---

## What ALOE Fixes

### ❌ Before ALOE

- "0 monitors" detection failures
- Inconsistent window detection
- No system memory continuity
- Fragmented PowerShell execution
- No persistent logging
- Session-dependent functions

### ✅ After ALOE

- Multi-source monitor detection with fallback
- Deterministic assembly loading
- Absolute path directory creation
- PowerShell module system (`.psm1`)
- JSONL state logging
- Scheduled task auto-start
- Receipt-backed audit trail

---

## Architecture

```
Windows OS
    ↓
ALOE Bootstrap (agent-lee-bootstrap.ps1)
    ↓
├── Assembly Init (WinForms, Drawing)
├── Directory Bootstrap (absolute paths)
├── Module Import (ALOE-Monitor.psm1, ALOE-State.psm1)
├── Validation Test
└── Observation Loop
    ↓
    ├── Get-ALOE-State
    │   ├── Get-ALOE-Monitors (multi-source fallback)
    │   ├── Get-ALOE-Cursor
    │   └── Get-ALOE-Processes
    ├── Write to JSONL log
    └── Repeat every 1 second
```

---

## Files

### Core Files

| File | Purpose |
|------|---------|
| [`agent-lee-bootstrap.ps1`](agent-lee-bootstrap.ps1) | **SINGLE ENTRY POINT** - Bootstrap + observation loop |
| [`modules/ALOE-Monitor.psm1`](modules/ALOE-Monitor.psm1) | Multi-source monitor detection |
| [`modules/ALOE-State.psm1`](modules/ALOE-State.psm1) | State assembly + cursor + processes |

### Utility Files

| File | Purpose |
|------|---------|
| [`TEST-ALOE-NOW.ps1`](TEST-ALOE-NOW.ps1) | Quick validation test |
| [`REGISTER-ALOE-TASK.ps1`](REGISTER-ALOE-TASK.ps1) | Register scheduled task |

---

## State Model

ALOE produces this JSON every second:

```json
{
  "schema": "leeway.agent-lee.aloe.state.v1",
  "timestamp": "2026-06-20T06:00:00.000Z",
  "pulse": 12345,
  "observationId": "aloe-obs-20260620-060000-abc123",
  "monitors": {
    "count": 3,
    "primary": 0,
    "bounds": [
      {"x": -1080, "y": 0, "width": 1080, "height": 1920},
      {"x": 0, "y": 0, "width": 1707, "height": 1067},
      {"x": 2560, "y": 0, "width": 1920, "height": 1080}
    ],
    "dpi": [96, 96, 96],
    "detectionMethod": "WinForms.Screen",
    "fallbackUsed": false,
    "errors": []
  },
  "cursor": {
    "x": 3447,
    "y": 929,
    "visible": true,
    "errors": []
  },
  "processes": {
    "count": 156,
    "active": "msedge",
    "topCpu": [
      {"name": "msedge", "pid": 8765, "cpu": 12.5, "memory": 512000000}
    ],
    "errors": []
  },
  "metadata": {
    "observationDuration": 0.125,
    "detectionErrors": [],
    "warnings": []
  }
}
```

---

## Logs and Receipts

### State Logs

**Location**: `logs/state/state.jsonl`  
**Format**: JSONL (one JSON object per line)  
**Frequency**: Every 1 second

### Bootstrap Receipts

**Location**: `Archive/receipts/aloe/YYYY/MM/DD/aloe-bootstrap-YYYYMMDD-HHMMSS.json`  
**Purpose**: Proof of successful bootstrap

### Diagnostic Logs

**Location**: `logs/diagnostics/`  
**Purpose**: Error tracking and debugging

---

## Monitor Detection Strategy

ALOE uses a 3-tier fallback chain:

### Tier 1: WinForms.Screen (Preferred)
- Most accurate
- Provides bounds, DPI, primary monitor
- May fail in some session contexts

### Tier 2: Win32 API (Fallback)
- Uses `GetSystemMetrics(SM_CMONITORS)`
- Provides monitor count + primary dimensions
- More reliable across contexts

### Tier 3: WMI (Last Resort)
- Uses `Win32_DesktopMonitor`
- Provides monitor count only
- Slowest but most compatible

**Result**: Guaranteed >0 monitors detected

---

## Scheduled Task Details

**Task Name**: `AgentLeeObservationEngine`  
**Trigger**: At logon  
**Account**: SYSTEM  
**Run Level**: Highest  
**Restart**: 3 attempts, 1 minute interval  
**Execution Time Limit**: None (runs continuously)

### Task Management

```powershell
# Start task manually
Start-ScheduledTask -TaskName "AgentLeeObservationEngine"

# Check task status
Get-ScheduledTask -TaskName "AgentLeeObservationEngine"

# Stop task
Stop-ScheduledTask -TaskName "AgentLeeObservationEngine"

# Unregister task
Unregister-ScheduledTask -TaskName "AgentLeeObservationEngine" -Confirm:$false
```

---

## Troubleshooting

### Problem: "0 monitors" detected

**Solution**: ALOE uses fallback chain, should never return 0

**Check**:
```powershell
Import-Module .\modules\ALOE-Monitor.psm1 -Force
Get-ALOE-Monitors -Verbose
```

### Problem: "Could not find path" error

**Solution**: ALOE creates all directories automatically

**Check**:
```powershell
Test-Path "E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode\observation-engine\logs\state"
```

### Problem: "Function not recognized" error

**Solution**: ALOE uses module system, functions persist

**Check**:
```powershell
Get-Module ALOE-*
```

### Problem: Scheduled task not starting

**Solution**: Check task status and logs

**Check**:
```powershell
Get-ScheduledTask -TaskName "AgentLeeObservationEngine" | Select-Object State, LastRunTime, LastTaskResult
```

---

## Integration

### Runtime Fabric Integration (Future)

ALOE will send state to Runtime Fabric:

```powershell
POST http://127.0.0.1:4001/aloe/state
Content-Type: application/json

{state JSON}
```

### Agent Lee Code Integration (Future)

Agent Lee Code will query ALOE state:

```powershell
GET http://127.0.0.1:4001/aloe/state/latest
```

### Execution Broker Integration (Future)

Execution Broker will capture before/after ALOE state for action verification.

---

## Success Criteria

ALOE is operational when:

- ✅ Bootstrap runs without errors
- ✅ Monitor detection returns >0 monitors
- ✅ State logged to JSONL every second
- ✅ Scheduled task starts on boot
- ✅ Receipts generated
- ✅ No memory leaks after 24 hours

---

## Next Steps

1. **Test Bootstrap**: Run `TEST-ALOE-NOW.ps1`
2. **Verify State**: Check `logs/state/state.jsonl`
3. **Register Task**: Run `REGISTER-ALOE-TASK.ps1`
4. **Restart Computer**: Verify auto-start
5. **Check Receipts**: Verify `Archive/receipts/aloe/`

---

## Governance

ALOE complies with:

- ✅ [AGENTS.md](../../AGENTS.md) - Data Custody Standard
- ✅ [AGENT-LEE-OBSERVATION-ENGINE-SPECIFICATION.md](../../AGENT-LEE-OBSERVATION-ENGINE-SPECIFICATION.md)
- ✅ [AGENT-LEE-PRIME-STABILIZATION-ROADMAP.md](../../AGENT-LEE-PRIME-STABILIZATION-ROADMAP.md)
- ✅ [core/fabric/](../../core/fabric/) - LACF identity contracts

---

**Status**: Ready for deployment and testing