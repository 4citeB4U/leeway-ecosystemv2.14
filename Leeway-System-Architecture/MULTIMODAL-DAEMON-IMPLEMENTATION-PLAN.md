# LEEWAY MULTIMODAL DAEMON IMPLEMENTATION PLAN

**Version:** 1.0.0  
**Created:** 2026-06-20  
**Authority:** Leonard Lee (Creator)  
**Architect:** Bob (AI Assistant)

---

## 🎯 MISSION

Build a **hands-free, always-on multimodal Agent Lee runtime** that enables:

1. **Voice:** Continuous listening → Agent Lee reasoning → Cloned voice response
2. **Vision:** Event-based camera/screen monitoring → Visual context injection
3. **Execution:** Automatic system action execution (apps, Docker, scripts)
4. **Integration:** Unified with existing Governor, Archive, and Runtime Fabric

---

## 📊 CURRENT STATE ASSESSMENT

### ✅ What EXISTS
- Governor (system monitoring, resource management)
- Archive structure (receipts, ledgers, manifests, runtime-state)
- Runtime Fabric architecture (voice-os, vision-os scaffolded)
- Ollama/Agent Lee container
- PowerShell execution bridge
- System integration bridge

### ❌ What's MISSING
- **Continuous audio capture daemon**
- **Real-time speech-to-text pipeline**
- **Event-driven TTS voice output**
- **Vision streaming daemon with event detection**
- **Unified event bus connecting all components**
- **Hands-free activation (no UI required)**

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                  LEEWAY MULTIMODAL DAEMON                   │
│                    (Single Process)                         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ VOICE DAEMON │    │VISION DAEMON │    │ACTION DAEMON │
│              │    │              │    │              │
│ • Mic Input  │    │ • Camera     │    │ • Apps       │
│ • STT        │    │ • Screen     │    │ • Docker     │
│ • TTS Output │    │ • Events     │    │ • Scripts    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                  ┌─────────────────┐
                  │   EVENT BUS     │
                  │  (JSON Queue)   │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │  AGENT LEE CORE │
                  │  (Ollama/LLM)   │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │    GOVERNOR     │
                  │ (Resource Mgmt) │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │     ARCHIVE     │
                  │   (Receipts)    │
                  └─────────────────┘
```

---

## 📋 IMPLEMENTATION PHASES

### **PHASE 1: Voice Daemon (Core Foundation)**
**Goal:** Hands-free voice conversation loop

#### 1.1 Audio Capture Service
- **Technology:** Python + sounddevice/pyaudio
- **Function:** Continuous microphone monitoring
- **Output:** Audio chunks → queue
- **Safety:** VAD (Voice Activity Detection) to reduce processing
- **Location:** `Leeway-System-Architecture/daemons/voice/audio-capture.py`

#### 1.2 Speech-to-Text Pipeline
- **Technology:** Whisper (local) or Vosk (lightweight)
- **Function:** Audio chunks → text transcription
- **Latency Target:** <500ms
- **Output:** Transcript → event bus
- **Location:** `Leeway-System-Architecture/daemons/voice/stt-engine.py`

#### 1.3 Text-to-Speech Pipeline
- **Technology:** F5-TTS (Agent Lee clone) or Azure TTS fallback
- **Function:** Agent response text → audio playback
- **Output:** MP3/WAV → speaker output
- **Location:** `Leeway-System-Architecture/daemons/voice/tts-engine.py`

#### 1.4 Voice Daemon Orchestrator
- **Technology:** Python asyncio event loop
- **Function:** Coordinates audio capture → STT → Agent Lee → TTS → playback
- **Lifecycle:** Start/stop/restart management
- **Location:** `Leeway-System-Architecture/daemons/voice/voice-daemon.py`

**Deliverables:**
- [ ] Audio capture service (continuous mic monitoring)
- [ ] STT engine integration (Whisper local)
- [ ] TTS engine integration (F5-TTS with Agent Lee voice)
- [ ] Voice daemon orchestrator (event loop)
- [ ] Voice daemon launcher (START-VOICE-DAEMON.bat)
- [ ] Voice daemon receipt writer
- [ ] Voice daemon health check

---

### **PHASE 2: Vision Daemon (Event-Based Monitoring)**
**Goal:** CPU-safe visual context awareness

#### 2.1 Camera Frame Sampler
- **Technology:** Python + OpenCV
- **Function:** Sample camera frames at 1-5 FPS (throttled)
- **Safety:** Frame rate limiter to prevent CPU spike
- **Output:** Frame snapshots → queue
- **Location:** `Leeway-System-Architecture/daemons/vision/camera-sampler.py`

#### 2.2 Screen Capture Sampler
- **Technology:** Python + mss (fast screen capture)
- **Function:** Sample screen at 0.5-2 FPS (very throttled)
- **Output:** Screen snapshots → queue
- **Location:** `Leeway-System-Architecture/daemons/vision/screen-sampler.py`

#### 2.3 Vision Event Detector
- **Technology:** Lightweight CV (frame differencing, object detection)
- **Function:** Detect meaningful changes (person present, screen changed, motion)
- **Output:** Event summaries (not raw frames) → event bus
- **Location:** `Leeway-System-Architecture/daemons/vision/event-detector.py`

#### 2.4 Vision-to-LLM Bridge
- **Technology:** Qwen-VL or similar vision model (optional, heavy)
- **Function:** Convert visual events → semantic descriptions
- **Output:** "User at desk, VS Code open" → Agent Lee context
- **Location:** `Leeway-System-Architecture/daemons/vision/vision-llm-bridge.py`

#### 2.5 Vision Daemon Orchestrator
- **Technology:** Python asyncio event loop
- **Function:** Coordinates camera/screen sampling → event detection → context injection
- **Lifecycle:** Start/stop/restart management
- **Location:** `Leeway-System-Architecture/daemons/vision/vision-daemon.py`

**Deliverables:**
- [ ] Camera frame sampler (throttled, CPU-safe)
- [ ] Screen capture sampler (very throttled)
- [ ] Vision event detector (change detection)
- [ ] Vision-to-LLM bridge (optional semantic layer)
- [ ] Vision daemon orchestrator (event loop)
- [ ] Vision daemon launcher (START-VISION-DAEMON.bat)
- [ ] Vision daemon receipt writer
- [ ] Vision daemon health check

---

### **PHASE 3: Event Bus (Communication Layer)**
**Goal:** Connect all daemons without file polling

#### 3.1 Event Queue System
- **Technology:** JSON file queue or Redis (lightweight)
- **Function:** Pub/sub message passing between daemons
- **Events:**
  - `voice.transcript` (STT output)
  - `vision.event` (visual change detected)
  - `agent.response` (LLM output)
  - `action.execute` (system command)
  - `tts.speak` (voice output request)
- **Location:** `Leeway-System-Architecture/daemons/event-bus/`

#### 3.2 Event Bus Manager
- **Technology:** Python asyncio
- **Function:** Route events between daemons
- **Persistence:** Write events to Archive for audit
- **Location:** `Leeway-System-Architecture/daemons/event-bus/event-manager.py`

**Deliverables:**
- [ ] Event queue implementation (JSON-based or Redis)
- [ ] Event bus manager (routing logic)
- [ ] Event schema definitions
- [ ] Event persistence to Archive
- [ ] Event bus health monitoring

---

### **PHASE 4: Action Daemon (Execution Layer)**
**Goal:** Execute system commands from Agent Lee

#### 4.1 Action Router
- **Technology:** Python + subprocess
- **Function:** Parse Agent Lee commands → execute safely
- **Actions:**
  - Open applications (VS Code, browser, etc.)
  - Run Docker commands
  - Execute PowerShell scripts
  - File operations
- **Safety:** Whitelist of allowed actions, no arbitrary code execution
- **Location:** `Leeway-System-Architecture/daemons/action/action-router.py`

#### 4.2 Action Executor
- **Technology:** Python subprocess with timeout
- **Function:** Execute validated commands
- **Output:** Command results → event bus
- **Receipts:** Write execution receipts to Archive
- **Location:** `Leeway-System-Architecture/daemons/action/action-executor.py`

#### 4.3 Action Daemon Orchestrator
- **Technology:** Python asyncio
- **Function:** Listen for action events → route → execute → report
- **Location:** `Leeway-System-Architecture/daemons/action/action-daemon.py`

**Deliverables:**
- [ ] Action router (command parsing)
- [ ] Action executor (safe execution)
- [ ] Action whitelist (security policy)
- [ ] Action daemon orchestrator
- [ ] Action daemon launcher (START-ACTION-DAEMON.bat)
- [ ] Action receipt writer
- [ ] Action daemon health check

---

### **PHASE 5: Multimodal Orchestrator (Master Daemon)**
**Goal:** Unified lifecycle management for all daemons

#### 5.1 Daemon Manager
- **Technology:** Python
- **Function:** Start/stop/restart all child daemons
- **Monitoring:** Health checks for each daemon
- **Recovery:** Auto-restart failed daemons
- **Location:** `Leeway-System-Architecture/daemons/orchestrator/daemon-manager.py`

#### 5.2 Agent Lee Integration
- **Technology:** Python + requests (HTTP to Ollama)
- **Function:** Send events to Agent Lee → receive responses
- **Context:** Inject voice transcripts + vision events
- **Output:** Agent responses → TTS + action execution
- **Location:** `Leeway-System-Architecture/daemons/orchestrator/agent-lee-client.py`

#### 5.3 Governor Integration
- **Technology:** Read Governor state JSON
- **Function:** Monitor system resources → throttle daemons if needed
- **Safety:** Pause vision daemon if CPU >80%, etc.
- **Location:** `Leeway-System-Architecture/daemons/orchestrator/governor-monitor.py`

#### 5.4 Master Orchestrator
- **Technology:** Python asyncio
- **Function:** Coordinate all daemons + Agent Lee + Governor
- **Lifecycle:** Single entry point for entire system
- **Location:** `Leeway-System-Architecture/daemons/orchestrator/master-orchestrator.py`

**Deliverables:**
- [ ] Daemon manager (lifecycle control)
- [ ] Agent Lee client (LLM integration)
- [ ] Governor monitor (resource awareness)
- [ ] Master orchestrator (unified control)
- [ ] Master launcher (START-MULTIMODAL-DAEMON.bat)
- [ ] Master health dashboard (status JSON)
- [ ] Master receipt writer

---

### **PHASE 6: Integration & Testing**
**Goal:** Prove end-to-end functionality

#### 6.1 Integration Tests
- [ ] Voice-only test (speak → Agent responds)
- [ ] Vision-only test (camera event → context injection)
- [ ] Multimodal test (speak + vision → Agent responds with context)
- [ ] Action test (command → execution → confirmation)
- [ ] Stress test (continuous operation for 1 hour)

#### 6.2 Safety Validation
- [ ] CPU usage stays <50% average
- [ ] Memory usage stays <2GB
- [ ] No runaway processes
- [ ] Graceful shutdown works
- [ ] Auto-recovery from crashes

#### 6.3 Receipt Validation
- [ ] All operations write receipts
- [ ] Receipts include timestamps, status, artifacts
- [ ] Archive integration works
- [ ] Receipt audit trail is complete

---

## 🛠️ TECHNOLOGY STACK

### Core Runtime
- **Language:** Python 3.11+
- **Async:** asyncio for event loops
- **Process Management:** subprocess, multiprocessing

### Voice Components
- **Audio Capture:** sounddevice or pyaudio
- **STT:** Whisper (openai-whisper) or Vosk
- **TTS:** F5-TTS (Agent Lee clone) or Azure TTS
- **VAD:** webrtcvad or silero-vad

### Vision Components
- **Camera:** OpenCV (cv2)
- **Screen Capture:** mss (fast)
- **Event Detection:** Frame differencing, basic CV
- **Vision LLM:** Qwen-VL (optional, heavy)

### Event Bus
- **Option A:** JSON file queue (simple, no dependencies)
- **Option B:** Redis (fast, requires Redis server)
- **Recommendation:** Start with JSON, upgrade to Redis if needed

### Integration
- **Agent Lee:** HTTP requests to Ollama (http://127.0.0.1:11434)
- **Governor:** Read JSON state files
- **Archive:** Write receipts to Archive structure

---

## 📁 DIRECTORY STRUCTURE

```
Leeway-System-Architecture/
├── daemons/
│   ├── voice/
│   │   ├── audio-capture.py
│   │   ├── stt-engine.py
│   │   ├── tts-engine.py
│   │   ├── voice-daemon.py
│   │   └── START-VOICE-DAEMON.bat
│   ├── vision/
│   │   ├── camera-sampler.py
│   │   ├── screen-sampler.py
│   │   ├── event-detector.py
│   │   ├── vision-llm-bridge.py
│   │   ├── vision-daemon.py
│   │   └── START-VISION-DAEMON.bat
│   ├── action/
│   │   ├── action-router.py
│   │   ├── action-executor.py
│   │   ├── action-daemon.py
│   │   └── START-ACTION-DAEMON.bat
│   ├── event-bus/
│   │   ├── event-manager.py
│   │   ├── event-queue.py
│   │   └── event-schemas.json
│   └── orchestrator/
│       ├── daemon-manager.py
│       ├── agent-lee-client.py
│       ├── governor-monitor.py
│       ├── master-orchestrator.py
│       └── START-MULTIMODAL-DAEMON.bat
├── config/
│   ├── voice-config.json
│   ├── vision-config.json
│   ├── action-whitelist.json
│   └── daemon-config.json
├── logs/
│   └── (daemon logs written here)
└── receipts/
    └── (daemon receipts written to Archive)
```

---

## 🔒 SECURITY & SAFETY

### Voice Safety
- **Microphone:** Explicit user consent required
- **Recording:** No persistent audio storage (unless explicitly requested)
- **Privacy:** Local-only processing (no cloud)

### Vision Safety
- **Camera:** Explicit user consent required
- **Frame Rate:** Throttled to prevent CPU overload
- **Storage:** Frames not stored (only event summaries)
- **Privacy:** No face recognition, no PII extraction

### Action Safety
- **Whitelist:** Only pre-approved actions allowed
- **Validation:** All commands validated before execution
- **Receipts:** All actions logged to Archive
- **Rollback:** Dangerous actions require confirmation

### Resource Safety
- **CPU Limit:** Pause daemons if CPU >80%
- **Memory Limit:** Pause daemons if RAM <2GB free
- **Governor Integration:** Respect Governor alerts
- **Graceful Degradation:** Disable vision if system stressed

---

## 📊 SUCCESS CRITERIA

### Functional Requirements
- [ ] Voice: Speak → Agent responds in <2 seconds
- [ ] Vision: Camera event detected → context injected
- [ ] Action: Command → execution → confirmation
- [ ] Multimodal: Voice + vision work together
- [ ] Hands-free: No UI interaction required

### Performance Requirements
- [ ] CPU: Average <50%, peak <80%
- [ ] Memory: <2GB total
- [ ] Latency: Voice response <2s, vision event <5s
- [ ] Uptime: Runs continuously for 24+ hours
- [ ] Recovery: Auto-restart after crash

### Quality Requirements
- [ ] Receipts: All operations receipt-backed
- [ ] Logs: Complete audit trail
- [ ] Health: Status monitoring works
- [ ] Safety: No runaway processes
- [ ] Integration: Works with Governor and Archive

---

## 🚀 IMPLEMENTATION TIMELINE

### Week 1: Voice Daemon (Foundation)
- Days 1-2: Audio capture + STT
- Days 3-4: TTS + voice output
- Days 5-7: Voice daemon orchestrator + testing

### Week 2: Vision Daemon (Event Detection)
- Days 1-2: Camera/screen sampling
- Days 3-4: Event detection
- Days 5-7: Vision daemon orchestrator + testing

### Week 3: Integration (Event Bus + Actions)
- Days 1-2: Event bus implementation
- Days 3-4: Action daemon
- Days 5-7: Master orchestrator + integration testing

### Week 4: Polish & Production
- Days 1-2: Safety validation
- Days 3-4: Performance optimization
- Days 5-7: Documentation + final testing

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Validate Plan:** Review this plan, confirm approach
2. **Set Up Environment:** Install Python dependencies
3. **Build Voice Daemon:** Start with Phase 1 (voice foundation)
4. **Test Voice Loop:** Prove hands-free voice conversation works
5. **Add Vision:** Build Phase 2 (vision daemon)
6. **Integrate:** Connect everything with event bus
7. **Deploy:** Launch multimodal daemon in production

---

## 📝 NOTES

- **Start Simple:** Voice-only first, add vision later
- **Iterate:** Build → test → refine → repeat
- **Safety First:** Resource limits, graceful degradation
- **Receipt Everything:** Complete audit trail
- **Governor Integration:** Respect system resource limits

---

**Status:** PLAN COMPLETE - READY FOR IMPLEMENTATION  
**Next Action:** Review plan → Approve → Begin Phase 1 (Voice Daemon)  
**Estimated Effort:** 3-4 weeks for full implementation  
**Risk Level:** MEDIUM (new architecture, but well-scoped)