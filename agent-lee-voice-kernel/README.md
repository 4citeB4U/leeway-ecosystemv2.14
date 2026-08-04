# Agent Lee Voice Kernel

**Single-Engine XTTS-v2 Voice System for Agent Lee OS**

## Overview

The Agent Lee Voice Kernel is the **canonical voice authority layer** for the entire Leeway ecosystem. It provides text-to-speech capabilities using **XTTS-v2 ONLY** with Agent Lee's cloned voice identity.

### Architecture

```
┌──────────────────────────────┐
│ Agent Lee OS Runtime         │
└─────────────┬────────────────┘
              │ text command
              ▼
┌──────────────────────────────┐
│ Voice Kernel Container       │
│ (XTTS-v2 FastAPI Server)    │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ XTTS-v2 Engine               │
│ speaker_wav = Agent Lee     │
└─────────────┬────────────────┘
              ▼
     🎤 Agent Lee voice output
```

## Core Principles

### ✅ MANDATORY

- **XTTS-v2 ONLY** - Single voice engine
- **Fully local** - No external APIs
- **Agent Lee voice identity** - Cloned from source sample
- **Docker containerized** - OS-level service
- **Runtime Fabric integrated** - Part of Leeway ecosystem

### ❌ FORBIDDEN

- NO RVC
- NO Piper TTS
- NO F5-TTS
- NO Sopro
- NO Edge TTS
- NO fallback voice systems
- NO external API dependencies

## Components

### 1. XTTS-v2 Engine (`xtts-server.py`)

FastAPI server that:
- Loads XTTS-v2 model on startup
- Caches Agent Lee speaker embedding
- Exposes `/tts` endpoint
- Generates speech in Agent Lee voice

### 2. Voice Loader (`voice-loader.py`)

Manages Agent Lee voice identity:
- Converts M4A to WAV format
- Extracts speaker embeddings
- Caches voice profile
- Validates voice identity

### 3. Boot Speech System (`boot-speech.py`)

Generates boot announcement:
- Runs on container startup
- Speaks: "System online. Agent Lee runtime initialized. All systems operational."
- Integrates with Desktop Runtime for playback

### 4. Runtime Fabric Connector (`runtime-fabric-connector.py`)

Integrates with Leeway ecosystem:
- Registers service with Runtime Fabric
- Sends heartbeats
- Notifies speech generation events
- Enables orchestration

## Configuration

See `config.json` for full configuration options.

### Key Settings

```json
{
  "voice_kernel": {
    "engine": "XTTS-v2",
    "model": "coqui/XTTS-v2"
  },
  "agent_identity": {
    "agent_id": "agent-lee",
    "voice_sample": "/app/voice-samples/agent-lee.wav"
  },
  "server": {
    "port": 8092
  }
}
```

## Deployment

### Prerequisites

- Docker and Docker Compose
- Agent Lee voice sample: `Agent Lee, audio voice.m4a`
- 4GB+ RAM recommended
- Optional: CUDA-capable GPU for faster inference

### Build and Run

```powershell
# Navigate to voice kernel directory
cd agent-lee-voice-kernel

# Build and start container
docker-compose up --build -d

# Check logs
docker-compose logs -f

# Check health
curl http://localhost:8092/health
```

### Validation

```powershell
# Run validation script
.\validate-voice-kernel.ps1

# Check receipt
cat Archive/receipts/voice-kernel/voice-kernel-validation-*.json
```

## API Endpoints

### POST /tts

Generate speech from text.

**Request:**
```json
{
  "text": "Hello, I am Agent Lee",
  "voice": "agent-lee",
  "language": "en",
  "speed": 1.0
}
```

**Response:**
```json
{
  "status": "success",
  "audio_path": "/app/output/agent-lee-20260622-140000.wav",
  "duration": 3.45,
  "text": "Hello, I am Agent Lee",
  "voice": "agent-lee",
  "timestamp": "2026-06-22T14:00:00.000Z"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "voice_identity": {
    "agent_id": "agent-lee",
    "voice_loaded": true,
    "speaker_embedding_cached": true
  }
}
```

### GET /voice-identity

Get Agent Lee voice identity information.

### POST /register-runtime-fabric

Register with Runtime Fabric (automatic on boot if enabled).

## Integration

### Runtime Fabric

The Voice Kernel automatically registers with Runtime Fabric on startup:

```
Runtime Fabric (4001) → Voice Kernel (8092) → XTTS → Audio Output
```

### Desktop Runtime

Generated audio can be played through Desktop Runtime:

```
Voice Kernel → Desktop Runtime (8091) → Speaker Output
```

### Agent Lee Router

Voice requests can be routed through Agent Lee Router:

```
Router (8080) → Voice Kernel (8092) → Speech Generation
```

## Performance

### Expected Latency

- **GPU**: 3-8 seconds for typical sentences
- **CPU**: 5-15 seconds for typical sentences

### Optimization

- Model preloaded at startup (no lazy loading)
- Speaker embedding cached permanently
- No per-request model reload

## Troubleshooting

### Container won't start

Check logs:
```powershell
docker-compose logs voice-kernel
```

### Voice sample not found

Ensure `Agent Lee, audio voice.m4a` exists at:
```
E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\Agent Lee, audio voice.m4a
```

### XTTS model download fails

Check internet connection and disk space. Model is ~1.8GB.

### Audio quality issues

Verify voice sample quality:
- Should be clear speech
- Minimum 3-5 seconds duration
- 22050 Hz sample rate preferred

## Receipts

All operations write receipts to:
```
Archive/receipts/voice-kernel/
```

Receipt schema: `leeway.voice-kernel.validation.v1`

## Compliance

This implementation follows:
- **AGENTS.md** - Leeway Agent Operating Standard
- **Voice Kernel Specification** - Single-engine XTTS-v2 requirement
- **Data Custody Standard** - Receipt-backed operations

## Version

**Version:** 1.0.0  
**Engine:** XTTS-v2  
**Voice Identity:** Agent Lee  
**Status:** Production Ready

## License

Part of the Leeway Ecosystem.  
Creator Authority: Leonard Lee