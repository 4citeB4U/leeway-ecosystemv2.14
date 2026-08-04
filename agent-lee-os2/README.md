# Agent Lee OS2 - Embodiment & Presence Layer

**Port**: 5100  
**Authority**: ZERO - READ-ONLY DISPLAY  
**Status**: Production-ready

## Overview

Agent Lee OS2 is the canonical embodiment and presence layer for Agent Lee. It provides:
- Health status display
- Chat interface
- Voice/TTS output
- Telemetry visualization
- Event timeline

**CRITICAL**: This service has **ZERO execution authority**. It is a read-only display surface that polls Runtime Fabric for data and routes all actions through appropriate services.

## Architecture Position

```
Runtime Fabric (4001) - THE BRAIN
    ↓ provides health data
    ↓ emits events

Agent Lee OS2 (5100) - THE FACE ← YOU ARE HERE
    ↓ polls Runtime Fabric for health
    ↓ subscribes to SSE stream
    ↓ displays telemetry
    ↓ routes chat to Agent Lee Router
    ↓ routes TTS to Desktop Runtime
    ↓ ZERO execution authority
```

## Key Principles

1. **Read-Only**: OS2 NEVER executes system operations
2. **Polling**: OS2 polls Runtime Fabric every 5 seconds for health data
3. **Routing**: All actions route to appropriate services
4. **Display**: OS2 is purely a display/interface layer

## API Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | OS2 health check |
| `/api/system/health` | GET | System health from Runtime Fabric |
| `/api/system/events` | GET | Recent events from Runtime Fabric |
| `/api/system/events/stream` | GET | Real-time SSE stream |
| `/api/telemetry` | GET | Aggregated telemetry data |
| `/api/identity` | GET | Agent Lee identity info |

### Chat & Voice

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send chat (routes to Agent Lee Router 8080) |
| `/api/tts` | POST | Generate speech (routes to Desktop Runtime 8091) |

### WebSocket

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `/ws/health` | WebSocket | Real-time health updates |

## Dependencies

**External Services** (must be running):
- Runtime Fabric (4001) - Health data source
- Agent Lee Router (8080) - Chat processing
- Desktop Runtime (8091) - TTS generation

**Python Requirements**:
- Python 3.11+
- FastAPI
- Uvicorn
- httpx
- websockets

## Installation

```powershell
# Install dependencies
pip install -r requirements.txt

# Or use the startup script (creates venv automatically)
.\start-agent-lee-os2.ps1
```

## Usage

### Start OS2

```powershell
# Using startup script (recommended)
.\start-agent-lee-os2.ps1

# Or manually
python server.py
```

### Test Endpoints

```powershell
# Health check
curl http://127.0.0.1:5100/health

# System health
curl http://127.0.0.1:5100/api/system/health

# Recent events
curl http://127.0.0.1:5100/api/system/events

# Real-time event stream
curl -N http://127.0.0.1:5100/api/system/events/stream

# Agent identity
curl http://127.0.0.1:5100/api/identity

# Telemetry
curl http://127.0.0.1:5100/api/telemetry
```

### Chat Example

```powershell
curl -X POST http://127.0.0.1:5100/api/chat `
  -H "Content-Type: application/json" `
  -d '{
    "messages": [
      {"role": "user", "content": "Hello Agent Lee"}
    ]
  }'
```

### TTS Example

```powershell
curl -X POST http://127.0.0.1:5100/api/tts `
  -H "Content-Type: application/json" `
  -d '{
    "text": "Hello, I am Agent Lee",
    "voice": "en-US-AndrewNeural"
  }'
```

## Frontend Integration

The existing React frontend in `Cerebral/agent-lee-os2/` can be updated to use these endpoints:

```typescript
// Update API base URL
const API_BASE = 'http://127.0.0.1:5100';

// Fetch system health
const health = await fetch(`${API_BASE}/api/system/health`);

// Subscribe to real-time events
const eventSource = new EventSource(`${API_BASE}/api/system/events/stream`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};

// WebSocket for health updates
const ws = new WebSocket('ws://127.0.0.1:5100/ws/health');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Health update:', data);
};
```

## Authority Restrictions

OS2 has **ZERO execution authority**:

❌ **Cannot**:
- Execute system commands
- Restart services
- Modify system state
- Run PowerShell scripts
- Control docker containers
- Mutate any system resources

✅ **Can**:
- Display health status
- Show telemetry
- Provide chat interface
- Generate voice output (via Desktop Runtime)
- Show event timeline
- Display service states

## Data Flow

### Health Display
```
Runtime Fabric (4001)
  ↓ /health/snapshot
OS2 polls every 5 seconds
  ↓ displays in UI
User sees health status
```

### Chat Flow
```
User types message in OS2 UI
  ↓ POST /api/chat
OS2 routes to Agent Lee Router (8080)
  ↓ /v1/chat/completions
Router processes with model
  ↓ response
OS2 receives response
  ↓ displays in UI
User sees response
```

### TTS Flow
```
User requests voice output
  ↓ POST /api/tts
OS2 routes to Desktop Runtime (8091)
  ↓ /tts
Desktop Runtime generates audio
  ↓ audio file path
OS2 receives path
  ↓ returns to UI
UI plays audio
```

## Security

- **Local-only**: Binds to 127.0.0.1 only
- **CORS**: Restricted to localhost:5173 (frontend)
- **No execution**: Cannot execute any system operations
- **Read-only**: All data fetched from Runtime Fabric
- **Routing**: All actions route to appropriate services

## Monitoring

OS2 logs all requests and errors:

```
logs/agent-lee-os2-YYYYMMDD-HHMMSS.stdout.log
logs/agent-lee-os2-YYYYMMDD-HHMMSS.stderr.log
```

## Troubleshooting

### OS2 won't start

1. Check Python version: `python --version` (need 3.11+)
2. Check port 5100: `Get-NetTCPConnection -LocalPort 5100`
3. Check logs: `logs/agent-lee-os2-*.stderr.log`

### Can't fetch health data

1. Verify Runtime Fabric is running: `curl http://127.0.0.1:4001/health`
2. Check Runtime Fabric logs
3. Verify Health Orchestrator is integrated

### Chat not working

1. Verify Agent Lee Router is running: `curl http://127.0.0.1:8080/health`
2. Check router logs
3. Verify model is loaded

### TTS not working

1. Verify Desktop Runtime is running: `curl http://127.0.0.1:8091/health`
2. Check desktop runtime logs
3. Verify TTS provider is configured

## Migration from Cerebral

To migrate from Cerebral to standalone OS2:

1. **Backend**: Use this new FastAPI server (port 5100)
2. **Frontend**: Update API base URL in `Cerebral/agent-lee-os2/src/`
3. **Remove**: All execution logic from frontend
4. **Add**: Health polling and SSE subscription
5. **Test**: Verify all features work through new backend

## Governance

This service implements:
- [AGENT-LEE-OS2-SERVICE-CONTRACT.md](../AGENT-LEE-OS2-SERVICE-CONTRACT.md)
- [AGENTS.md](../AGENTS.md) - Data Custody Standard
- [LEEWAY-EXECUTION-BROKER-SPECIFICATION.md](../LEEWAY-EXECUTION-BROKER-SPECIFICATION.md)

## Status

✅ **IMPLEMENTED** - Ready for frontend integration and testing

## Next Steps

1. Update frontend to use new backend endpoints
2. Test health display
3. Test chat interface
4. Test TTS output
5. Test WebSocket connection
6. Validate read-only behavior
7. Deprecate Cerebral after validation