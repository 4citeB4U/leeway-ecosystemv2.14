# LEEWAY LIVE LOOP ENGINE V1 - IMPLEMENTATION PLAN

**Version:** 1.0.0  
**Created:** 2026-06-20  
**Authority:** Leonard Lee (Creator)  
**Architect:** Bob (AI Assistant)

---

## 🎯 MISSION (CORRECTED)

Build the **FIRST ACTUALLY RUNNING** Agent Lee system - a persistent skill-acquisition runtime that:

- ✅ Runs continuously (not batch, not triggered)
- ✅ Listens for speech automatically (no button press)
- ✅ Sends to Agent Lee → receives response → speaks back
- ✅ Executes approved actions
- ✅ Records receipts for every action
- ✅ Extracts reusable skills from successful actions
- ✅ Integrates with Governor for resource awareness
- ✅ Optionally consumes vision events

**This is NOT architecture planning. This is the ACTUAL RUNTIME SYSTEM.**

---

## ⚠️ CRITICAL UNDERSTANDING

### What We Built Before:
- ✅ System organization (Governor, Archive, Integration)
- ✅ Architecture design (voice-os, vision-os scaffolding)
- ✅ Documentation and planning

### What We're Building NOW:
- 🔥 **THE ACTUAL RUNNING LOOP**
- 🔥 **THE LIVE AGENT RUNTIME**
- 🔥 **THE PERSISTENT SERVICE**

**This is the transition from diagrams → running code.**

---

## 🔁 THE CORE LOOP (NON-NEGOTIABLE)

```
WHILE SYSTEM IS RUNNING:
    1. Capture audio chunk (continuous mic)
    2. Detect speech (VAD)
    3. Transcribe to text (STT)
    4. Read Governor state (resource check)
    5. Optionally read vision events (context)
    6. Send context → Agent Lee (Ollama)
    7. Receive response + intent
    8. Speak response (TTS clone voice)
    9. Execute action if requested
    10. Write receipt
    11. Extract skill if successful
    12. Update state feeds
    13. REPEAT (never stop)
```

**This loop runs FOREVER. No UI. No manual triggers.**

---

## 🏗️ ARCHITECTURE (SIMPLIFIED FOR V1)

```
┌─────────────────────────────────────────┐
│      LEEWAY-LIVELOOP SERVICE            │
│         (Single Process)                │
└─────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌────────┐   ┌────────┐   ┌────────┐
│ VOICE  │   │ AGENT  │   │ ACTION │
│ MODULE │   │ MODULE │   │ MODULE │
└───┬────┘   └───┬────┘   └───┬────┘
    │            │            │
    └────────────┼────────────┘
                 ▼
        ┌────────────────┐
        │  RECEIPT       │
        │  MODULE        │
        └────────┬───────┘
                 ▼
        ┌────────────────┐
        │  SKILL         │
        │  EXTRACTOR     │
        └────────┬───────┘
                 ▼
        ┌────────────────┐
        │  ARCHIVE       │
        │  (Skills +     │
        │   Receipts)    │
        └────────────────┘
```

**Key Point:** ONE service, multiple internal modules, ONE continuous loop.

---

## 📦 SERVICE STRUCTURE

### Service Name
```
LeeWay-LiveLoop
```

### Service Location
```
C:\Users\Leona\Leeway-System-LiveLoop\
```

### State Files Location
```
C:\Users\Leona\Leeway-System-Logs\
├── live_loop_state.json      # Current loop state
├── voice_feed.json            # Latest voice activity
├── vision_feed.json           # Latest vision events
├── action_feed.json           # Latest actions
└── skill_feed.json            # Latest skills learned
```

### Archive Integration
```
Archive/
├── receipts/
│   └── voice-runtime/         # Every action receipt
└── skills/                    # Extracted reusable skills
```

---

## 🔧 MODULE BREAKDOWN

### 1. Voice Module
**File:** `voice_module.py`

**Responsibilities:**
- Continuous microphone capture
- Voice Activity Detection (VAD)
- Speech-to-Text (Whisper local)
- Text-to-Speech (F5-TTS Agent Lee clone)
- Audio playback

**Key Functions:**
```python
def listen_continuous():
    # Capture audio chunks
    # Detect speech with VAD
    # Return audio when speech detected

def transcribe(audio_chunk):
    # Whisper STT
    # Return text transcript

def speak(text):
    # F5-TTS generation
    # Playback through speakers
```

**State Output:**
```json
{
  "listening": true,
  "lastTranscript": "Open VS Code",
  "lastSpoken": "Opening VS Code now",
  "timestamp": "2026-06-20T03:10:00Z"
}
```

---

### 2. Agent Module
**File:** `agent_module.py`

**Responsibilities:**
- Connect to Agent Lee (Ollama HTTP API)
- Send user request + context
- Receive response + intent
- Parse action requirements

**Key Functions:**
```python
def send_to_agent(transcript, context):
    # HTTP POST to Ollama
    # Include Governor state, vision events
    # Return response + intent

def parse_intent(response):
    # Extract action requirements
    # Return structured intent
```

**Example Request:**
```json
{
  "model": "agent-lee-code-mode",
  "prompt": "User said: 'Open VS Code'\nSystem state: CPU 18%, RAM 16.9GB\nVision: User at desk",
  "stream": false
}
```

**Example Response:**
```json
{
  "response": "Opening VS Code now",
  "intent": {
    "action": "open_application",
    "target": "code",
    "command": "Start-Process code"
  }
}
```

---

### 3. Action Module
**File:** `action_module.py`

**Responsibilities:**
- Execute approved actions safely
- Whitelist validation
- Command execution
- Result capture

**Key Functions:**
```python
def execute_action(intent):
    # Validate against whitelist
    # Execute command
    # Capture result
    # Return success/failure

def is_action_allowed(action):
    # Check whitelist
    # Return true/false
```

**Action Whitelist:**
```json
{
  "allowed_actions": [
    "open_application",
    "run_script",
    "docker_status",
    "file_operation"
  ],
  "allowed_apps": [
    "code",
    "chrome",
    "powershell"
  ],
  "allowed_scripts": [
    "cleanup-temp",
    "system-status"
  ]
}
```

---

### 4. Receipt Module
**File:** `receipt_module.py`

**Responsibilities:**
- Write receipt for every action
- Include full context
- Timestamp everything
- Archive integration

**Key Functions:**
```python
def write_receipt(action_data):
    # Create receipt JSON
    # Write to Archive/receipts/voice-runtime/
    # Return receipt path
```

**Receipt Schema:**
```json
{
  "schema": "leeway-voice-runtime-receipt-v1",
  "timestamp": "2026-06-20T03:10:00Z",
  "user_request": "Open VS Code",
  "recognized_text": "Open VS Code",
  "intent": "open_application",
  "action_executed": "Start-Process code",
  "result": "success",
  "duration_ms": 742,
  "governor_state": {
    "cpu": 18,
    "ram_free_gb": 16.9
  },
  "vision_context": "User at desk",
  "receipt_path": "Archive/receipts/voice-runtime/action-20260620-031000.json"
}
```

---

### 5. Skill Extractor Module
**File:** `skill_extractor.py`

**Responsibilities:**
- Analyze successful receipts
- Extract reusable patterns
- Create skill records
- Update skill database

**Key Functions:**
```python
def extract_skill(receipt):
    # Analyze receipt
    # Identify reusable pattern
    # Create/update skill record
    # Return skill_id

def update_skill_database(skill):
    # Write to Archive/skills/
    # Update skill index
```

**Skill Schema:**
```json
{
  "skill_id": "skill-open-vscode",
  "skill_name": "Open VS Code",
  "trigger_patterns": [
    "open vscode",
    "open vs code",
    "start vscode"
  ],
  "intent": "open_application",
  "action": "Start-Process code",
  "success_count": 17,
  "failure_count": 0,
  "last_used": "2026-06-20T03:10:00Z",
  "created": "2026-06-15T10:00:00Z",
  "confidence": 0.95
}
```

**Skill Database:**
```
Archive/
└── skills/
    ├── skill-index.json           # Master index
    ├── skill-open-vscode.json
    ├── skill-docker-status.json
    └── skill-cleanup-temp.json
```

---

### 6. Governor Monitor Module
**File:** `governor_monitor.py`

**Responsibilities:**
- Read Governor state periodically
- Adjust loop behavior based on resources
- Throttle if system stressed

**Key Functions:**
```python
def read_governor_state():
    # Read C:\Users\Leona\Leeway-System-Logs\governor_state.json
    # Return current state

def should_throttle():
    # Check CPU/RAM
    # Return throttle decision
```

**Throttling Logic:**
```python
if cpu > 85:
    reduce_stt_frequency()
    pause_vision_module()
    delay_non_critical_actions()
elif cpu > 70:
    reduce_vision_frequency()
else:
    normal_operation()
```

---

### 7. Vision Module (Optional for V1)
**File:** `vision_module.py`

**Responsibilities:**
- Read vision events from vision daemon
- Provide context to Agent Lee
- Event-based only (not continuous frames)

**Key Functions:**
```python
def read_vision_events():
    # Read C:\Users\Leona\Leeway-System-Logs\vision_feed.json
    # Return latest events

def get_vision_context():
    # Summarize recent events
    # Return context string
```

**Vision Event Schema:**
```json
{
  "event": "screen_changed",
  "application": "VS Code",
  "timestamp": "2026-06-20T03:10:00Z"
}
```

---

## 🔄 MAIN LOOP IMPLEMENTATION

**File:** `live_loop_engine.py`

```python
import asyncio
from voice_module import listen_continuous, transcribe, speak
from agent_module import send_to_agent, parse_intent
from action_module import execute_action
from receipt_module import write_receipt
from skill_extractor import extract_skill
from governor_monitor import read_governor_state, should_throttle

async def main_loop():
    """
    The core continuous loop that never stops.
    """
    print("LeeWay-LiveLoop starting...")
    
    while True:
        try:
            # 1. Check Governor state
            governor_state = read_governor_state()
            
            # 2. Throttle if needed
            if should_throttle():
                await asyncio.sleep(5)
                continue
            
            # 3. Listen for speech
            audio_chunk = await listen_continuous()
            
            if audio_chunk is None:
                await asyncio.sleep(0.1)
                continue
            
            # 4. Transcribe
            transcript = transcribe(audio_chunk)
            
            if not transcript:
                continue
            
            print(f"User said: {transcript}")
            
            # 5. Get context
            context = {
                "governor": governor_state,
                "vision": get_vision_context()  # Optional
            }
            
            # 6. Send to Agent Lee
            response = await send_to_agent(transcript, context)
            
            # 7. Parse intent
            intent = parse_intent(response)
            
            # 8. Speak response
            speak(response["text"])
            
            # 9. Execute action if requested
            if intent and intent.get("action"):
                result = execute_action(intent)
                
                # 10. Write receipt
                receipt = write_receipt({
                    "transcript": transcript,
                    "response": response,
                    "intent": intent,
                    "result": result,
                    "context": context
                })
                
                # 11. Extract skill if successful
                if result["success"]:
                    extract_skill(receipt)
            
            # 12. Update state feeds
            update_state_feeds()
            
        except Exception as e:
            print(f"Loop error: {e}")
            await asyncio.sleep(1)
            continue

if __name__ == "__main__":
    asyncio.run(main_loop())
```

---

## 🚀 BUILD ORDER (CRITICAL PATH)

### Step 1: Core Loop (Week 1)
- [ ] Create service structure
- [ ] Implement main loop skeleton
- [ ] Add basic logging
- [ ] Test loop runs continuously

### Step 2: Voice Module (Week 1)
- [ ] Audio capture (sounddevice)
- [ ] VAD integration (webrtcvad)
- [ ] STT integration (Whisper)
- [ ] TTS integration (F5-TTS)
- [ ] Test voice input → output

### Step 3: Agent Module (Week 1)
- [ ] Ollama HTTP client
- [ ] Request formatting
- [ ] Response parsing
- [ ] Intent extraction
- [ ] Test Agent Lee connection

### Step 4: Action Module (Week 2)
- [ ] Action whitelist
- [ ] Command execution
- [ ] Result capture
- [ ] Safety validation
- [ ] Test action execution

### Step 5: Receipt Module (Week 2)
- [ ] Receipt schema
- [ ] Archive integration
- [ ] Receipt writer
- [ ] Test receipt generation

### Step 6: Skill Extractor (Week 2)
- [ ] Skill schema
- [ ] Pattern extraction
- [ ] Skill database
- [ ] Test skill learning

### Step 7: Governor Integration (Week 3)
- [ ] State reader
- [ ] Throttling logic
- [ ] Resource monitoring
- [ ] Test throttling

### Step 8: Vision Module (Week 3 - Optional)
- [ ] Event reader
- [ ] Context provider
- [ ] Test vision integration

### Step 9: Service Wrapper (Week 3)
- [ ] Windows service wrapper
- [ ] Auto-start configuration
- [ ] Health monitoring
- [ ] Test service lifecycle

---

## 📊 SUCCESS CRITERIA (ACTUAL RUNNING SYSTEM)

### Functional
- [ ] Loop runs continuously for 24+ hours
- [ ] Voice: Speak → Agent responds <2s
- [ ] Actions: Commands execute successfully
- [ ] Receipts: Every action logged
- [ ] Skills: Patterns extracted and reused
- [ ] No manual intervention required

### Performance
- [ ] CPU: Average <30% (voice + agent)
- [ ] Memory: <1GB for service
- [ ] Latency: Voice response <2s
- [ ] Uptime: 99%+ (auto-restart on crash)

### Quality
- [ ] Receipts: 100% of actions
- [ ] Skills: Successful patterns extracted
- [ ] Logs: Complete audit trail
- [ ] Safety: Whitelist enforced
- [ ] Integration: Governor + Archive working

---

## 🔒 SAFETY & SECURITY

### Voice Safety
- Local-only processing (no cloud)
- No persistent audio storage
- Explicit user consent for mic access

### Action Safety
- Whitelist enforcement (no arbitrary commands)
- Validation before execution
- Receipt for every action
- Rollback capability

### Resource Safety
- Governor integration (throttle if stressed)
- Memory limits
- CPU limits
- Graceful degradation

---

## 📁 FILE STRUCTURE

```
C:\Users\Leona\Leeway-System-LiveLoop\
├── live_loop_engine.py          # Main loop
├── voice_module.py              # Voice I/O
├── agent_module.py              # Agent Lee client
├── action_module.py             # Action execution
├── receipt_module.py            # Receipt writing
├── skill_extractor.py           # Skill learning
├── governor_monitor.py          # Resource monitoring
├── vision_module.py             # Vision events (optional)
├── config.json                  # Configuration
├── action_whitelist.json        # Security policy
├── START-LIVELOOP.bat           # Launcher
└── requirements.txt             # Python dependencies
```

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. **Create service directory structure**
2. **Install Python dependencies** (sounddevice, whisper, requests, etc.)
3. **Build main loop skeleton** (runs continuously)
4. **Add voice module** (mic → STT → TTS)
5. **Add agent module** (connect to Ollama)
6. **Test voice loop** (speak → Agent responds)
7. **Add action module** (execute commands)
8. **Add receipt module** (log everything)
9. **Add skill extractor** (learn patterns)
10. **Deploy as service** (auto-start, always running)

---

## ✅ DEFINITION OF DONE

**The system is DONE when:**

1. You can speak to Agent Lee without touching keyboard/mouse
2. Agent Lee responds in cloned voice automatically
3. Agent Lee executes commands when requested
4. Every action writes a receipt to Archive
5. Successful patterns become reusable skills
6. System runs 24/7 without intervention
7. Governor integration prevents resource overload

**At that point, Agent Lee transitions from "tools" to "living agent runtime".**

---

**Status:** READY FOR IMPLEMENTATION  
**Next Action:** Switch to Code mode → Begin Step 1 (Core Loop)  
**Timeline:** 3 weeks to running system  
**Risk:** LOW (focused, incremental, tested)