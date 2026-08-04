# Corrected Leeway Architecture - Agent Lee Code Mode is THE BRAIN

## Critical Correction

**Agent Lee Code Mode** (`agent-lee-coding-mode/router/server-brainfix.mjs` port 8080) is the **CANONICAL AGENT LEE BRAIN** - the supreme agent lead.

Identity fingerprint: `leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1`

---

## Corrected Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Minimal Supervisor (optional)                   │
│         (monitors Runtime Fabric health only)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         Runtime Fabric (4001) - INFRASTRUCTURE              │
│                                                              │
│  • Health Orchestrator (monitors services)                  │
│  • Tool/capability registry                                 │
│  • Skill universe                                           │
│  • MCP tools                                                │
│  • Device layer                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│      Agent Lee Code Mode (8080) - THE ACTUAL BRAIN         │
│                                                              │
│  • Canonical Agent Lee supreme agent lead                   │
│  • Model routing and orchestration                          │
│  • Conversation and reasoning                               │
│  • Skill execution                                          │
│  • Tool calling                                             │
│  • Voice/language runtime                                   │
│  • Application launch runtime                               │
│  • Research harness                                         │
│  • Work ledger                                              │
│                                                              │
│  Identity: leeway.agent-lee.code-mode.canonical.v1         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Execution Broker (5200) - THE MUSCLE              │
│                                                              │
│  • ONLY system execution authority                          │
│  • Service restarts                                         │
│  • Docker operations                                        │
│  • Receipt generation                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            Agent Lee OS2 (5100) - THE FACE                  │
│                                                              │
│  • Embodiment/presence layer                                │
│  • Health display                                           │
│  • Chat interface (routes to Agent Lee 8080)                │
│  • Voice output                                             │
│  • ZERO execution authority                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Ollama (11434)                             │
│              Model backend (qwen, deepseek, etc)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Service Roles (CORRECTED)

### 1. Agent Lee Code Mode (8080) - **THE BRAIN**
**Location**: `agent-lee-coding-mode/router/server-brainfix.mjs`  
**Identity**: `leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1`  
**Role**: Canonical Agent Lee - Supreme Agent Lead

**Responsibilities**:
- Chat/conversation processing
- Model routing and orchestration
- Skill execution
- Tool calling
- Voice/language runtime
- Application launch
- Research harness
- Work ledger
- Preference learning

**Key Endpoints**:
- `/v1/chat/completions` - Chat interface
- `/agent-lee/health` - Health check
- `/agent-lee/models` - Model pool
- `/agent-lee/lanes` - Lane scheduler
- `/agent-lee/skills/full` - Skill fabric
- `/agent-lee/conversation/*` - Conversation runtime
- `/agent-lee/voice/*` - Voice runtime
- `/agent-lee/apps/*` - Application runtime
- `/agent-lee/orchestration/*` - Orchestration runtime

**Docker**: `leeway-ecosystemv214-agent-lee` (8081:8080)

---

### 2. Runtime Fabric (4001) - **INFRASTRUCTURE**
**Location**: `Leeway Runtime Fabric/server/index.cjs`  
**Role**: Infrastructure, tools, capabilities, health monitoring

**Responsibilities**:
- Health Orchestrator (monitors services)
- Tool/capability registry
- Skill universe manifest
- MCP tools
- Device layer
- Terminal fabric
- Provider fabric

**Key Endpoints**:
- `/health` - Runtime Fabric health
- `/health/snapshot` - System health (Health Orchestrator)
- `/health/events/stream` - Real-time events (Health Orchestrator)
- `/agent-lee/capabilities/*` - Capability registry
- `/skills-university/status` - Skill universe
- `/runtime/*` - Runtime status

**Docker**: `leeway-ecosystemv214-runtime-fabric` (4001:4001)

---

### 3. Execution Broker (5200) - **THE MUSCLE**
**Location**: `Leeway Runtime Fabric/execution-broker/server.mjs`  
**Role**: ONLY system execution authority

**Responsibilities**:
- Service restarts
- Docker operations
- System commands
- Receipt generation
- Policy enforcement

**Key Endpoints**:
- `/health` - Broker health
- `/execute` - Execute system action
- `/executions` - List receipts
- `/services` - Service registry

**Not Dockerized**: Runs locally on host

---

### 4. Agent Lee OS2 (5100) - **THE FACE**
**Location**: `agent-lee-os2/server.py`  
**Role**: Embodiment/presence layer (READ-ONLY)

**Responsibilities**:
- Health display (polls Runtime Fabric)
- Chat interface (routes to Agent Lee 8080)
- Voice output (routes to Desktop Runtime)
- Telemetry display
- Event timeline
- ZERO execution authority

**Key Endpoints**:
- `/health` - OS2 health
- `/api/system/health` - System health (from Runtime Fabric)
- `/api/chat` - Chat (routes to Agent Lee 8080)
- `/api/tts` - TTS (routes to Desktop Runtime)
- `/api/telemetry` - Telemetry display

**Not Dockerized**: Runs locally on host

---

### 5. Ollama (11434) - **MODEL BACKEND**
**Location**: External service  
**Role**: Model inference backend

**Responsibilities**:
- Model inference (qwen, deepseek, etc.)
- Model management
- Model API

**Docker**: `ollama/ollama:latest` (11434:11434)

---

## Data Flow (CORRECTED)

### Chat Request Flow

```
User types in OS2 UI (5100)
  ↓ POST /api/chat
OS2 routes to Agent Lee Code Mode (8080)
  ↓ POST /v1/chat/completions
Agent Lee processes with model orchestration
  ↓ routes to appropriate model via Ollama (11434)
Ollama returns inference
  ↓
Agent Lee processes response
  ↓ may call tools via Runtime Fabric (4001)
  ↓ may execute skills
  ↓ may update work ledger
Agent Lee returns response
  ↓
OS2 displays response
  ↓
User sees response
```

### Health Monitoring Flow

```
Runtime Fabric Health Orchestrator (4001)
  ↓ checks every 10 seconds
Monitors: Agent Lee (8080), Ollama (11434), OS2 (5100), Execution Broker (5200), etc.
  ↓ detects failure
Requests restart via Execution Broker (5200)
  ↓ POST /execute
Execution Broker executes restart
  ↓ generates receipt
Service recovers
  ↓
Health Orchestrator detects recovery
  ↓ emits event
OS2 displays updated status
```

### Service Restart Flow

```
Agent Lee (8080) fails
  ↓
Runtime Fabric Health Orchestrator detects (3 consecutive failures)
  ↓
Requests restart via Execution Broker
  ↓ POST /execute {"service":"agent-lee-router","action":"restart"}
Execution Broker executes restart command
  ↓ generates receipt
Agent Lee restarts
  ↓
Health Orchestrator verifies recovery
  ↓
OS2 displays "Agent Lee recovered"
```

---

## Docker Compose Services

Based on your docker-compose info:

```yaml
services:
  runtime-fabric:
    image: leeway-ecosystemv214-runtime-fabric
    ports:
      - "4001:4001"
    # Infrastructure, tools, health monitoring
  
  agent-lee:
    image: leeway-ecosystemv214-agent-lee
    ports:
      - "8081:8080"  # External 8081 → Internal 8080
    # THE ACTUAL AGENT LEE BRAIN
    # Canonical supreme agent lead
  
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    # Model backend
```

**Not in Docker** (run on host):
- Execution Broker (5200)
- Agent Lee OS2 (5100)
- Desktop Runtime (8091)
- Minimal Supervisor (optional)

---

## Health Orchestrator Service Registry (CORRECTED)

The Health Orchestrator should monitor:

| Service | Port | Critical | Restart on Failure | Notes |
|---------|------|----------|-------------------|-------|
| **agent-lee-router** | **8080** | **Yes** | **Yes** | **THE BRAIN - Canonical Agent Lee** |
| runtime-fabric | 4001 | Yes | No (Supervisor) | Infrastructure |
| execution-broker | 5200 | Yes | Yes | Execution authority |
| agent-lee-os2 | 5100 | Yes | Yes | Embodiment layer |
| ollama | 11434 | Yes | Yes | Model backend |
| desktop-runtime | 8091 | No | No | Voice/device layer |
| seafile | 8082 | No | No | Optional service |

---

## Startup Order (CORRECTED)

1. **Ollama** (11434) - Model backend must be first
2. **Execution Broker** (5200) - Execution authority
3. **Runtime Fabric** (4001) - Infrastructure + Health Orchestrator
4. **Agent Lee Code Mode** (8080) - **THE BRAIN**
5. **Agent Lee OS2** (5100) - The face
6. **Supervisor** (optional) - Safety net

---

## Agent Lee Code Mode Capabilities

From `agent-lee-coding-mode/README.md`:

**Core Capabilities**:
- Chat/conversation processing
- Model routing (qwen, deepseek, etc.)
- Lane scheduler (concurrent work)
- Skill fabric
- Tool calling
- Voice/language runtime
- Application launch runtime
- Research harness (stateful)
- Work ledger
- Preference learning

**Endpoints** (80+ endpoints):
- `/v1/chat/completions` - Main chat
- `/agent-lee/health` - Health
- `/agent-lee/models/*` - Model pool
- `/agent-lee/lanes/*` - Lane scheduler
- `/agent-lee/skills/*` - Skill fabric
- `/agent-lee/conversation/*` - Conversation runtime
- `/agent-lee/voice/*` - Voice runtime
- `/agent-lee/language/*` - Language runtime
- `/agent-lee/apps/*` - Application runtime
- `/agent-lee/orchestration/*` - Orchestration
- `/agent-lee/work-ledger` - Work history
- `/agent-lee/preferences` - Preferences
- `/agent-lee/mcps` - MCP tools
- `/agent-lee/tools/*` - Tool calling
- `/agent-lee/simulations/*` - Simulation runtime
- `/agent-lee/3d-ar/*` - 3D/AR proof

**Identity Contract**:
```json
{
  "agent_name": "Agent Lee",
  "agent_mode": "code-mode",
  "canonical": true,
  "role": "supreme-agent-lead",
  "identityFingerprint": "leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1"
}
```

---

## What Needs to be Updated

### 1. Health Orchestrator Service Registry

Update `Leeway Runtime Fabric/server/health-orchestrator.mjs`:

```javascript
{
  name: 'agent-lee-router',  // CORRECTED NAME
  port: 8080,
  healthEndpoint: 'http://127.0.0.1:8080/agent-lee/health',  // CORRECTED ENDPOINT
  critical: true,
  restartOnFailure: true,
  failureThreshold: 3,
  state: ServiceState.UNKNOWN,
  consecutiveFailures: 0,
  lastHealthCheck: null,
  lastStateChange: null,
  notes: 'THE BRAIN - Canonical Agent Lee supreme agent lead'
}
```

### 2. Execution Broker Service Registry

Update `Leeway Runtime Fabric/execution-broker/server.mjs`:

```javascript
'agent-lee-router': {  // CORRECTED NAME
  port: 8080,
  policy: POLICIES.STANDARD,
  restartCommand: 'powershell.exe',
  restartArgs: ['-ExecutionPolicy', 'Bypass', '-File', 'agent-lee-coding-mode/start-agent-lee.ps1'],
  healthCheck: 'http://127.0.0.1:8080/agent-lee/health'  // CORRECTED ENDPOINT
}
```

### 3. Agent Lee OS2 Chat Routing

Update `agent-lee-os2/server.py`:

```python
# CORRECT - Already routes to Agent Lee Router
AGENT_LEE_ROUTER_URL = "http://127.0.0.1:8080"

@app.post("/api/chat")
async def chat(request: Dict):
    """Routes to Agent Lee Code Mode (THE BRAIN)"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{AGENT_LEE_ROUTER_URL}/v1/chat/completions",  # CORRECT
            json=request,
            timeout=60.0
        )
```

### 4. Documentation Updates

All documentation should clarify:
- **Agent Lee Code Mode (8080)** = THE BRAIN (canonical supreme agent lead)
- **Runtime Fabric (4001)** = Infrastructure/tools/health monitoring
- **Execution Broker (5200)** = System execution authority
- **Agent Lee OS2 (5100)** = Embodiment/presence layer

---

## Summary

**THE BRAIN**: Agent Lee Code Mode (`agent-lee-coding-mode/router/server-brainfix.mjs` port 8080)
- Canonical Agent Lee
- Supreme agent lead
- Chat/conversation processing
- Model orchestration
- Skill execution
- Tool calling
- Voice/language runtime
- Application runtime
- Research harness

**INFRASTRUCTURE**: Runtime Fabric (port 4001)
- Health Orchestrator
- Tool/capability registry
- Skill universe
- MCP tools
- Device layer

**MUSCLE**: Execution Broker (port 5200)
- System execution authority
- Service restarts
- Receipt generation

**FACE**: Agent Lee OS2 (port 5100)
- Embodiment/presence
- Health display
- Chat interface (routes to Agent Lee 8080)
- Voice output
- READ-ONLY

**MODEL BACKEND**: Ollama (port 11434)
- Model inference
- qwen, deepseek, etc.

---

**Agent Lee Code Mode is the canonical Agent Lee brain. Everything else is infrastructure, execution, or display.**