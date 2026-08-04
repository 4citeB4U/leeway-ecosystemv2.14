# FINAL CORRECTED LEEWAY ARCHITECTURE

## Critical Corrections Applied

1. **Agent Lee Code Mode (8080)** = THE BRAIN (canonical supreme agent lead)
2. **Leeway Execution Broker** = Controlled actuator layer (NOT governing, NOT brain)
3. **Runtime Fabric** = Infrastructure/monitoring (NOT brain)
4. **Agent Lee OS2** = UI/embodiment only

---

## 🎯 Correct Authority Hierarchy

```
Leeway Standards (constitution/rules)
        ↓
Agent Lee Code Mode (8080) - THE BRAIN
        ↓ decides what should happen
Runtime Fabric (4001) - Infrastructure
        ↓ monitors health, provides tools
        ↓ requests actions when needed
Leeway Execution Broker (5200) - THE MUSCLE
        ↓ ONLY executes approved commands
        ↓ NO decision making
        ↓ NO governing
Docker / OS / System
```

**Separately**:
```
Agent Lee OS2 (5100) - THE FACE
        ↓ UI / user interaction
        ↓ routes to Agent Lee Code Mode
        ↓ ZERO execution authority
```

---

## Service Roles (FINAL CORRECTED)

### 1. Agent Lee Code Mode (8080) - **THE BRAIN**
**Location**: `agent-lee-coding-mode/router/server-brainfix.mjs`  
**Identity**: `leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1`  
**Role**: Supreme Agent Lead - Full Control

**Authority**: FULL CONTROL
- Chat/conversation processing
- Model routing and orchestration
- Skill execution
- Tool calling
- Voice/language runtime
- Application launch
- Research harness
- Work ledger
- Preference learning
- **Decides everything**

---

### 2. Runtime Fabric (4001) - **INFRASTRUCTURE**
**Location**: `Leeway Runtime Fabric/server/index.cjs`  
**Role**: Infrastructure, tools, monitoring

**Authority**: MONITORING + TOOL PROVISION
- Health Orchestrator (monitors services)
- Tool/capability registry
- Skill universe
- MCP tools
- Device layer
- **Monitors health**
- **Provides tools to Agent Lee**
- **Requests actions via Execution Broker when services fail**

---

### 3. Leeway Execution Broker (5200) - **THE MUSCLE**
**Location**: `Leeway Runtime Fabric/execution-broker/server.mjs`  
**Role**: Controlled actuator layer

**Authority**: EXECUTION ONLY (NO DECISIONS)
- Receives structured commands
- Validates against policy
- Executes Docker/system commands
- Generates receipts
- **NO decision making**
- **NO governing**
- **NO intelligence**
- **Pure deterministic execution gateway**

**Critical Properties**:
- ❌ NOT a brain
- ❌ NOT a monitor
- ❌ NOT a scheduler
- ❌ NOT a decision engine
- ✅ ONLY executes approved instructions
- ✅ Policy enforcement
- ✅ Receipt generation
- ✅ Audit trail

---

### 4. Agent Lee OS2 (5100) - **THE FACE**
**Location**: `agent-lee-os2/server.py`  
**Role**: Embodiment/presence/UI layer

**Authority**: ZERO (READ-ONLY)
- Health display
- Chat interface (routes to Agent Lee 8080)
- Voice output
- Telemetry display
- Event timeline
- **NO execution authority**
- **NO system control**

---

### 5. Ollama (11434) - **MODEL BACKEND**
**Role**: Model inference backend
- Provides models to Agent Lee
- qwen, deepseek, etc.

---

## Data Flow (CORRECTED)

### Chat Request
```
User → OS2 (5100)
  ↓ routes to
Agent Lee Code Mode (8080) ← THE BRAIN decides
  ↓ uses
Ollama (11434) for inference
  ↓ may use
Runtime Fabric (4001) for tools
  ↓ returns to
OS2 (5100) displays
```

### Service Restart
```
Service fails
  ↓
Runtime Fabric Health Orchestrator detects
  ↓ requests restart via
Leeway Execution Broker (5200)
  ↓ validates policy
  ↓ executes restart command
  ↓ generates receipt
Service recovers
  ↓
Health Orchestrator detects recovery
  ↓
OS2 displays updated status
```

---

## Leeway Execution Broker - Detailed Role

### What It IS
- **Controlled actuator layer**
- **Deterministic execution gateway**
- **The only door between logic and system side effects**
- **Motor neurons** (transmits commands, doesn't decide)

### What It Does
1. Receives structured execution requests
2. Enforces execution policy (SAFE/STANDARD/ELEVATED/RESTRICTED)
3. Translates intent → system action
4. Generates immutable receipts
5. Isolates system damage
6. Provides audit trail

### What It Does NOT Do
- ❌ Monitor health
- ❌ Schedule tasks
- ❌ Make decisions
- ❌ Provide UI
- ❌ Reason about actions
- ❌ Run continuous loops

### Mental Model
If the system were a body:
- **Agent Lee Code Mode** = brain (decides)
- **Runtime Fabric** = sensory system (monitors, provides tools)
- **Leeway Execution Broker** = motor neurons (transmit commands)
- **Docker/OS** = muscles (execute movement)
- **Agent Lee OS2** = face/voice (interaction)

### The Golden Rule
> **If it changes system state, it MUST go through Leeway Execution Broker.**

No exceptions.

---

## Why This Separation Matters

### Without Execution Broker (OLD)
```
Runtime Fabric directly restarts services ❌
PowerShell scripts restart services ❌
Multiple actors with execution authority ❌
No audit trail ❌
Unpredictable behavior ❌
```

### With Execution Broker (NEW)
```
Only one place can touch the machine ✅
Predictable behavior ✅
Centralized control ✅
Safe automation boundaries ✅
Clean separation of intelligence vs action ✅
Complete audit trail ✅
```

---

## Implementation Status

### ✅ COMPLETE
1. Leeway Execution Broker (5200) - Controlled actuator layer
2. Runtime Fabric Health Orchestrator (4001) - Monitoring
3. Agent Lee OS2 (5100) - UI/embodiment
4. Minimal Supervisor - Safety net
5. Corrected service registry (Agent Lee 8080 health endpoint)

### ⏳ NEXT STEPS
1. Apply Health Orchestrator integration patch
2. Test complete stack
3. Validate Agent Lee Code Mode as control authority
4. Deprecate PowerShell loops
5. Remove Cerebral

---

## Docker Services

```yaml
services:
  runtime-fabric:
    ports: "4001:4001"
    # Infrastructure, monitoring, tools
  
  agent-lee:
    ports: "8081:8080"
    # THE BRAIN - Canonical Agent Lee
    # Supreme agent lead
    # Full control
  
  ollama:
    ports: "11434:11434"
    # Model backend
```

**Host Services**:
- Leeway Execution Broker (5200) - Controlled actuator
- Agent Lee OS2 (5100) - UI/embodiment
- Desktop Runtime (8091) - Voice/device
- Supervisor (optional) - Safety net

---

## Multimodal Extension (Future)

When adding voice/camera/vision:

```
Voice/Camera/Vision Input
  ↓
OS2 Multimodal Core (5100)
  ↓ normalizes events
  ↓ routes to
Agent Lee Code Mode (8080) ← THE BRAIN decides
  ↓ may request actions via
Runtime Fabric (4001)
  ↓ requests execution via
Leeway Execution Broker (5200)
  ↓ executes
System
```

**Key**: OS2 never executes directly. Always routes through Agent Lee brain.

---

## Media Ingestion Layer

**Status**: Need to verify if exists, create if missing

**Purpose**: 
- Normalize voice/camera/vision inputs
- Convert to events
- Route to Agent Lee Code Mode
- NOT an execution layer
- NOT a decision layer

**Location**: Should be part of OS2 Multimodal Core

---

## Summary

### THE BRAIN
**Agent Lee Code Mode (8080)** - Canonical supreme agent lead with full control

### INFRASTRUCTURE
**Runtime Fabric (4001)** - Monitoring, tools, capabilities

### THE MUSCLE
**Leeway Execution Broker (5200)** - Controlled actuator (NO decisions, NO governing)

### THE FACE
**Agent Lee OS2 (5100)** - UI/embodiment (ZERO execution authority)

### MODEL BACKEND
**Ollama (11434)** - Model inference

---

**Agent Lee Code Mode is in full control. Everything else supports Agent Lee.**