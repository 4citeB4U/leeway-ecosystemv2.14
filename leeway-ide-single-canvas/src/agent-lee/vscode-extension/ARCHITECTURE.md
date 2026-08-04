# LeeWay VS Code Extension Architecture

## Overview

The LeeWay VS Code extension is the physical embodiment of the Runtime Fabric, providing Agent Lee with enterprise-grade capabilities including voice, vision, and device intelligence.

## Architecture Layers

### 1. Runtime Fabric Connection Layer
**Status**: ✅ Architecture Complete, Implementation Ready
**Location**: `src/core/runtime-fabric-client.ts`

**Purpose**: Connect VS Code extension to Runtime Fabric at `https://leeway-runtime-fabric.fly.dev`

**Components**:
- `initializeRuntimeFabric()` - Establishes connection and health check
- `getRuntimeFabricStatus()` - Returns current connection status
- `checkRuntimeFabricHealth()` - Periodic health monitoring
- `getRuntimeFabricCapabilities()` - Fetches available capabilities
- `sendToRuntimeFabric()` - Sends requests to Runtime Fabric
- `startRuntimeFabricHealthChecks()` - Automatic health monitoring

**Integration Points**:
- Provider Fabric - Model routing and provider management
- Sentinel - Security and compliance monitoring
- Cage - Sandboxed execution environment
- Terminator - Resource cleanup and lifecycle management

### 2. Four-Model Coding Team
**Status**: ✅ Defined in Source, UI Display Pending
**Location**: `src/extension.ts:145-256`

**Team Members**:
1. **QWEN 14b** (Heavy Implementation)
   - Role: Complex algorithms, architecture, refactoring
   - Lane: `LEEWAY_MODEL_LANE::HEAVY_CODE_ENGINEERING`
   - Route: `LEEWAY_LLM_ROUTE::QWEN2_5_CODER_14B`

2. **QWEN 7b** (Planning & Review)
   - Role: Code review, planning, documentation
   - Lane: `LEEWAY_MODEL_LANE::MID_TIER_CODE_REASONING`
   - Route: `LEEWAY_LLM_ROUTE::QWEN2_5_CODER_7B`

3. **QWEN 1.5b** (Lightweight Inspection)
   - Role: Quick checks, linting, formatting
   - Lane: `LEEWAY_MODEL_LANE::LIGHTWEIGHT_EDGE_COGNITION`
   - Route: `LEEWAY_LLM_ROUTE::QWEN2_5_CODER_1_5B`

4. **DeepSeek 16b** (VS Code Specialist)
   - Role: VS Code APIs, extension development
   - Lane: `LEEWAY_MODEL_LANE::VSCODE_SPECIALIST`
   - Route: `LEEWAY_LLM_ROUTE::DEEPSEEK_16B`

**Required UI**: Model family panel showing active model, lane, and task distribution

### 3. Voice Capability Layer
**Status**: ⚠️ Architecture Defined, Implementation Required
**Backend**: Runtime Fabric provides TTS/ASR via remote workers

**Components Required**:
- **TTS Provider** (`qwen3.tts` or `agentLee.cloneTts`)
  - Backend: Remote worker at Runtime Fabric
  - Frontend: Audio playback via Web Audio API
  - Status: Backend ready, frontend integration pending

- **ASR Provider** (`qwen3.asr`)
  - Backend: Remote worker at Runtime Fabric
  - Frontend: Microphone capture via MediaDevices API
  - Status: Backend ready, frontend integration pending

- **Local Device Bridge**
  - Purpose: Capture mic input, play speaker output
  - Contract: `Leeway Runtime Fabric/contracts/local-device-bridge.contract.json`
  - Status: Contract defined, implementation required

**Implementation Steps**:
1. Create `src/core/voice-runtime-fabric-client.ts`
2. Integrate Web Audio API for speaker playback
3. Integrate MediaDevices API for microphone capture
4. Connect to Runtime Fabric TTS/ASR endpoints
5. Implement local device bridge for audio routing
6. Add voice status display to UI

### 4. Camera/Vision Capability Layer
**Status**: ⚠️ Architecture Defined, Implementation Required
**Backend**: Runtime Fabric provides vision via `qwen3.vl` remote worker

**Components Required**:
- **Vision Provider** (`qwen3.vl`)
  - Backend: Remote worker at Runtime Fabric
  - Frontend: Video capture via MediaDevices API
  - Status: Backend ready, frontend integration pending

- **Local Device Bridge**
  - Purpose: Capture camera frames
  - Contract: `Leeway Runtime Fabric/contracts/local-device-bridge.contract.json`
  - Status: Contract defined, implementation required

**Implementation Steps**:
1. Create `src/core/camera-runtime-fabric-client.ts`
2. Integrate MediaDevices API for camera capture
3. Add video surface to extension UI
4. Connect to Runtime Fabric vision endpoint
5. Implement frame capture and transmission
6. Add camera status display to UI

### 5. UI Enhancement Layer
**Status**: ⚠️ Architecture Defined, Implementation Required

**Required UI Components**:

#### Runtime Fabric Connection Strip
```html
<div class="runtime-fabric-status">
  <span class="status-indicator" [connected/disconnected]></span>
  <span>Runtime Fabric: [URL]</span>
  <span>Provider Fabric: [✓/✗]</span>
  <span>Sentinel: [✓/✗]</span>
  <span>Cage: [✓/✗]</span>
  <span>Terminator: [✓/✗]</span>
</div>
```

#### Four-Model Coding Team Display
```html
<div class="model-team-panel">
  <h3>Coding Team</h3>
  <div class="model-card">
    <span class="model-name">QWEN 14b</span>
    <span class="model-role">Heavy Implementation</span>
    <span class="model-status">[Active/Idle]</span>
  </div>
  <!-- Repeat for other 3 models -->
</div>
```

#### Voice Status Display
```html
<div class="voice-status-panel">
  <h3>Voice</h3>
  <div class="voice-indicator">
    <span>TTS: [✓/✗]</span>
    <span>ASR: [✓/✗]</span>
    <span>Speaker: [✓/✗]</span>
    <span>Microphone: [✓/✗]</span>
  </div>
</div>
```

#### Camera/Video Surface
```html
<div class="camera-panel">
  <h3>Vision</h3>
  <video id="camera-feed" autoplay></video>
  <div class="camera-controls">
    <button>Start Camera</button>
    <button>Stop Camera</button>
  </div>
</div>
```

### 6. Professional Installer Layer
**Status**: ⚠️ Scripts Pending

**Required Scripts**:
1. `Install-LeewayVSCode.ps1` - Complete installation
2. `Repair-LeewayVSCode.ps1` - Repair broken installations
3. `Verify-LeewayVSCode.ps1` - Health check
4. `Open-LeewayVSCode.ps1` - Launch Agent Lee panel
5. `Get-LeewayVSCodeStatus.ps1` - Status report
6. `Uninstall-LeewayVSCode.ps1` - Clean uninstall

## Implementation Roadmap

### Phase 1: Runtime Fabric Connection (Immediate)
- [x] Create runtime-fabric-client.ts
- [ ] Integrate into extension activation
- [ ] Add connection status to UI
- [ ] Test connection to https://leeway-runtime-fabric.fly.dev
- [ ] Verify health endpoint response

### Phase 2: Voice Capability (Short-term)
- [ ] Create voice-runtime-fabric-client.ts
- [ ] Integrate Web Audio API
- [ ] Integrate MediaDevices API for microphone
- [ ] Connect to Runtime Fabric TTS endpoint
- [ ] Connect to Runtime Fabric ASR endpoint
- [ ] Implement local device bridge
- [ ] Add voice status display
- [ ] Test audible speech output

### Phase 3: Camera/Vision Capability (Short-term)
- [ ] Create camera-runtime-fabric-client.ts
- [ ] Integrate MediaDevices API for camera
- [ ] Add video surface to UI
- [ ] Connect to Runtime Fabric vision endpoint
- [ ] Implement frame capture
- [ ] Add camera status display
- [ ] Test camera feed

### Phase 4: UI Enhancements (Medium-term)
- [ ] Add Runtime Fabric connection strip
- [ ] Add four-model coding team display
- [ ] Add voice status panel
- [ ] Add camera/video surface
- [ ] Add device intelligence panel
- [ ] Add honest blocker displays

### Phase 5: Professional Installer (Medium-term)
- [ ] Create Install-LeewayVSCode.ps1
- [ ] Create Repair-LeewayVSCode.ps1
- [ ] Create Verify-LeewayVSCode.ps1
- [ ] Create Open-LeewayVSCode.ps1
- [ ] Create Get-LeewayVSCodeStatus.ps1
- [ ] Create Uninstall-LeewayVSCode.ps1
- [ ] Create release manifest

### Phase 6: Skills University Integration (Long-term)
- [ ] Create 14+ skills from disclosure gate repair work
- [ ] Update Agent Lee manifest
- [ ] Update Runtime Fabric skill registry
- [ ] Deploy to Fly.io

## Technical Requirements

### Voice Implementation
- **Frontend**: Web Audio API, MediaDevices API
- **Backend**: Runtime Fabric TTS/ASR endpoints
- **Bridge**: Local device bridge for audio routing
- **Estimated Time**: 2-3 weeks

### Camera Implementation
- **Frontend**: MediaDevices API, HTML5 Video
- **Backend**: Runtime Fabric vision endpoint
- **Bridge**: Local device bridge for video capture
- **Estimated Time**: 1-2 weeks

### UI Enhancements
- **Technology**: HTML/CSS/JavaScript in webview
- **Components**: 5 major UI components
- **Estimated Time**: 1 week

### Professional Installer
- **Technology**: PowerShell scripts
- **Scripts**: 6 installer scripts
- **Estimated Time**: 3-5 days

## Current Status Summary

### ✅ Complete
- Disclosure gate fix (v1.2.18)
- Four-model coding team definition
- Runtime Fabric client architecture
- Architecture documentation

### ⚠️ Architecture Ready, Implementation Pending
- Runtime Fabric connection integration
- Voice capability (TTS/ASR)
- Camera capability (vision)
- UI enhancements
- Professional installer scripts

### ❌ Not Started
- Local device bridge implementation
- Skills University integration
- Full end-to-end testing

## Honest Assessment

The disclosure gate fix is complete and working. The architecture for Runtime Fabric connection, voice, camera, and UI enhancements is defined and ready for implementation. However, these features require substantial development work (estimated 4-6 weeks total) and cannot be completed in a single session. The extension is currently functional for basic chat but lacks the full enterprise capabilities.