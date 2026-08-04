# Agent Lee Command Brain

The nervous system connecting voice input → intent parsing → SEA execution → voice response.

**Core Mission**: Preserve Agent Lee's voice identity while enabling natural command execution.

## Architecture

```
Voice Input (Audio/Text)
    ↓
Intent Parser (understand what user wants)
    ↓
Execution Bridge (execute through SEA)
    ↓
Voice Identity Engine (respond with Agent Lee's voice)
    ↓
Voice Output (SSML + Audio)
```

## Components

### 1. Voice Identity Engine (`voice_identity_engine.py`)

**Purpose**: Preserve Agent Lee's voice identity in all speech output.

**Core Characteristics**:
- **Rhythm**: Measured, deliberate, never rushed
- **Cadence**: Smooth flow with natural pauses
- **Tone**: Calm authority, confident presence
- **Pace**: Unhurried, thoughtful, intentional
- **Flavor**: OG Agent Lee - the original calling voice

**Key Features**:
- SSML generation with proper prosody
- Natural pause insertion (phrase, sentence, thought)
- Voice identity validation
- Voice receipt generation
- Context-aware response patterns

**Pause Standards**:
```python
MICRO_PAUSE = 200ms     # Between words in phrase
PHRASE_PAUSE = 400ms    # Between phrases
SENTENCE_PAUSE = 600ms  # Between sentences
THOUGHT_PAUSE = 800ms   # Between thoughts/topics
EMPHASIS_PAUSE = 300ms  # Before emphasized word
```

**Voice Model**:
```python
VOICE_MODEL = "en-US-AndrewNeural"
SPEAKING_RATE = "0.95"  # Slightly slower than default
PITCH = "medium"
VOLUME = "medium"
```

### 2. Intent Parser (`intent_parser.py`)

**Purpose**: Parse user input into structured intents.

**Intent Types**:
- **Command**: Action requests (create, modify, delete, run, etc.)
- **Question**: Information requests (what, where, how, why, etc.)
- **Greeting**: Social interaction (hello, hi, hey)
- **Conversation**: General dialogue

**Supported Commands**:
```python
create, modify, delete, read, list, search
execute, start, stop, check, verify, test
```

**Supported Questions**:
```python
what_is, what_are, where_is, where_are
how_to, why, when, who, capability_check
```

**Entity Extraction**:
- File paths
- Numbers
- Quoted strings
- Target subjects

### 3. Execution Bridge (`execution_bridge.py`)

**Purpose**: Bridge parsed intents to SEA execution.

**Flow**:
1. Create execution request from intent
2. Map intent to SEA action
3. Execute through SEA (or simulate)
4. Generate voice response
5. Return execution response

**SEA Action Mapping**:
```python
create → create_file
modify → modify_file
read → read_file
execute → execute_command
check → check_status
what_is → query_knowledge
where_is → locate_resource
```

**Priority Levels**:
- **High**: stop, delete, verify, check
- **Normal**: create, modify, execute
- **Low**: queries, questions

### 4. Command Orchestrator (`command_orchestrator.py`)

**Purpose**: Orchestrate complete command flow.

**Main Flow**:
```python
async def process_command(user_input: str) -> CommandSession:
    # 1. Parse intent
    intent = intent_parser.parse(user_input)
    
    # 2. Execute through SEA
    execution_response = await execution_bridge.execute_intent(intent)
    
    # 3. Voice output (already in execution_response)
    voice_output = execution_response.voice_response
    
    # 4. Return complete session
    return CommandSession(...)
```

**Convenience Methods**:
```python
generate_greeting()          # "Hello. I'm Agent Lee. Ready to assist."
generate_acknowledgment()    # "Understood. Working on that now."
generate_status_update()     # "Task in progress. Current status: ..."
generate_error_response()    # "I encountered an issue. ..."
generate_completion_response() # "Task complete. ..."
```

## Voice Identity Standard

See `AGENT-LEE-VOICE-IDENTITY-STANDARD.md` for complete specification.

**Non-Negotiables**:
1. Never rush Agent Lee's voice
2. Always preserve the rhythm
3. Always preserve the cadence
4. Always preserve the OG flavor
5. Natural pauses are mandatory
6. Calm authority is non-negotiable
7. Voice identity violations are blocking errors

**Voice Pattern Example**:
```text
[pause 300ms]
Hello.
[pause 500ms]
I'm Agent Lee.
[pause 400ms]
Ready to assist.
[pause 300ms]
```

## Usage Examples

### Basic Command Processing

```python
from core.reasoning.command_brain import CommandOrchestrator

orchestrator = CommandOrchestrator()

# Process text command
session = await orchestrator.process_command(
    "Please check system status"
)

print(f"Intent: {session.intent.action}")
print(f"Success: {session.execution_response.success}")
print(f"Voice: {session.voice_output.text}")
print(f"SSML: {session.voice_output.ssml}")
```

### Voice Command Processing

```python
# Process voice command from audio
session = await orchestrator.process_voice_command(
    audio_path="recording.wav",
    stt_service=my_stt_service,
    sea_executor=my_sea_executor
)
```

### Generate Specific Responses

```python
# Greeting
greeting = await orchestrator.generate_greeting()
# Output: "Hello. I'm Agent Lee. Ready to assist."

# Status update
status = await orchestrator.generate_status_update("processing files")
# Output: "Task in progress. Current status: processing files."

# Error
error = await orchestrator.generate_error_response("file not found")
# Output: "I encountered an issue. file not found. Let me know how you'd like to proceed."

# Completion
completion = await orchestrator.generate_completion_response("3 files modified")
# Output: "Task complete. 3 files modified. Anything else I can help with?"
```

### Voice Identity Application

```python
from core.reasoning.command_brain import VoiceIdentityEngine

voice_engine = VoiceIdentityEngine()

# Apply voice identity to any text
voice_output = voice_engine.apply_voice_identity(
    text="System is operational",
    context="status"
)

print(voice_output.ssml)  # SSML with proper prosody
print(f"Pauses: {voice_output.pause_count}")
print(f"Duration: {voice_output.estimated_duration_ms}ms")
print(f"Rhythm validated: {voice_output.rhythm_validated}")
print(f"OG flavor preserved: {voice_output.og_flavor_preserved}")
```

### Intent Parsing

```python
from core.reasoning.command_brain import IntentParser

parser = IntentParser()

# Parse command
intent = parser.parse("Please create a new file called test.py")

print(f"Type: {intent.intent_type}")      # "command"
print(f"Action: {intent.action}")         # "create"
print(f"Entities: {intent.entities}")     # {"target": "a new file called test.py", ...}
print(f"Confidence: {intent.confidence}") # 0.9
```

### Execution Bridge

```python
from core.reasoning.command_brain import ExecutionBridge

bridge = ExecutionBridge()

# Execute intent
response = await bridge.execute_intent(
    intent=parsed_intent,
    sea_executor=my_sea_executor
)

print(f"Success: {response.success}")
print(f"Result: {response.result}")
print(f"Voice: {response.voice_response.text}")
print(f"Time: {response.execution_time_ms}ms")
```

## Integration with SEA

The command brain integrates with SEA through the execution bridge:

```python
class SEAExecutor:
    async def execute(self, action: str, params: dict, priority: str):
        # SEA execution logic
        return {
            "success": True,
            "result": "...",
            "receipt_path": "..."
        }

# Use with command brain
orchestrator = CommandOrchestrator()
session = await orchestrator.process_command(
    "check system status",
    sea_executor=SEAExecutor()
)
```

## Integration with 9E Learning

The command brain works with 9E cognitive system:

1. **Execution Bridge** creates execution requests
2. **SEA** executes with 9E hooks (pre/post execution)
3. **9E** generates receipts and learns from execution
4. **Cache** stores learned patterns
5. **Next Execution** uses cached learning

## Voice Receipt Structure

Every voice output generates a receipt:

```json
{
  "voice_receipt_id": "voice-20260621-102100",
  "timestamp": "2026-06-21T10:21:00Z",
  "text": "Hello. I'm Agent Lee. Ready to assist.",
  "voice_model": "en-US-AndrewNeural",
  "ssml_used": true,
  "rhythm_validated": true,
  "cadence_validated": true,
  "tone_validated": true,
  "og_flavor_preserved": true,
  "audio_path": null,
  "duration_ms": 3200,
  "pause_count": 3,
  "average_pause_ms": 400,
  "voice_identity": {
    "canonical_voice": "Agent Lee Original",
    "voice_fingerprint": "calm-rhythmic-authoritative-OG",
    "rhythm": "measured, deliberate, never rushed",
    "cadence": "smooth flow with natural pauses",
    "tone": "calm authority, confident presence"
  }
}
```

## Testing

### Quick Command Test

```python
from core.reasoning.command_brain import quick_command

# Quick test
response = await quick_command("Hello Agent Lee")
print(response)  # "Hello. I'm Agent Lee. Ready to assist."
```

### Orchestrator Stats

```python
stats = orchestrator.get_orchestrator_stats()

print(f"Total sessions: {stats['total_sessions']}")
print(f"Average time: {stats['average_time_ms']}ms")
print(f"Success rate: {stats['success_rate']}")
print(f"Intent distribution: {stats['intent_distribution']}")
```

## Voice Identity Validation

Before any voice output is approved:

### Validation Checklist

- [ ] Rhythm is measured and deliberate
- [ ] Cadence has natural pauses
- [ ] Tone is calm authority
- [ ] OG flavor is preserved
- [ ] No rushed speech
- [ ] No robotic monotone
- [ ] Pauses are in right places
- [ ] Would Leonard recognize this as Agent Lee?

### Anti-Patterns (Never Do)

```text
❌ "HelloI'mAgentLeeHowCanIHelp"
❌ "Hello. I. Am. Agent. Lee."
❌ "HEY THERE! I'm Agent Lee!!!"
❌ "Um, I think I can help you?"
❌ Run-on sentences without breathing
❌ Inconsistent pace
```

### Correct Pattern

```text
✅ [pause 300ms]
✅ Hello.
✅ [pause 500ms]
✅ I'm Agent Lee.
✅ [pause 400ms]
✅ Ready to assist.
✅ [pause 300ms]
```

## Non-Negotiables

1. **Voice Identity**: Never compromise Agent Lee's voice
2. **Rhythm**: Always measured and deliberate
3. **Cadence**: Always smooth with natural pauses
4. **Tone**: Always calm authority
5. **OG Flavor**: Always preserved
6. **Receipts**: Every voice output must generate receipt
7. **Validation**: Voice identity must be validated

## Future Enhancements

- Real-time voice streaming
- Barge-in / interruption handling
- Multi-language voice identity
- Voice emotion detection
- Adaptive pause timing based on context
- Voice clone validation
- A/B testing of voice parameters
- Voice identity evolution tracking

## The Bottom Line

Agent Lee's voice is his identity. The rhythm, the flow, the calm presence - this is Agent Lee.

**If it doesn't sound like Agent Lee, it's not Agent Lee.**

Preserve it. Protect it. Never compromise it.