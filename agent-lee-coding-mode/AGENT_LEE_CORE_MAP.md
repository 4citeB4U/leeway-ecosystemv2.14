# Agent Lee Core Map

Canonical embodiment: `agent-lee-coding-mode`

Core path:
`E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4\agent-lee-coding-mode`

## Core Subsystems

### Router

Entry point:
`router/server-brainfix.mjs`

Port:
`8080`

Routes:
`GET /health`
`GET /routes`
`GET /agent-lee/conversation/health`
`POST /agent-lee/conversation/start`
`POST /agent-lee/conversation/turn`
`POST /agent-lee/conversation/end`
`GET /agent-lee/conversation/session/:id`
`GET /agent-lee/voice/backends`
`POST /agent-lee/voice/speak`
`POST /agent-lee/voice/speak-stream`
`POST /agent-lee/voice/transcribe`
`GET /agent-lee/language/status`
`POST /agent-lee/language/detect`
`POST /agent-lee/language/translate`
`GET /agent-lee/language/policy`
`GET /agent-lee/orchestration/health`
`GET /agent-lee/models`
`GET /agent-lee/models/warm`
`POST /agent-lee/models/warm`
`POST /agent-lee/models/route`
`GET /agent-lee/lanes`
`POST /agent-lee/lanes/start`
`GET /agent-lee/lanes/:id`
`POST /agent-lee/lanes/:id/message`
`POST /agent-lee/lanes/:id/cancel`
`GET /agent-lee/work-ledger`
`GET /agent-lee/preferences`
`GET /agent-lee/skills/full`
`GET /agent-lee/mcps`
`GET /agent-lee/tools/full`
`POST /agent-lee/tools/call`
`POST /agent-lee/skills/route`
`POST /agent-lee/skills/create`
`POST /agent-lee/skills/validate`
`POST /agent-lee/skills/simulate`
`POST /agent-lee/simulations/run`
`GET /agent-lee/simulations/:id`
`GET /agent-lee/simulations/receipts`
`GET /agent-lee/3d-ar/status`
`POST /agent-lee/3d-ar/chess-set-proof`
`GET /agent-lee/apps`
`GET /agent-lee/apps/:id`
`POST /agent-lee/apps/discover`
`POST /agent-lee/apps/launch`
`POST /agent-lee/apps/open-file`
`POST /agent-lee/apps/close-owned`
`GET /agent-lee/apps/receipts`
`GET /v1/models`
`POST /v1/chat/completions`

Role:
Agent Lee brainfix router and Ollama-backed chat operator.

### Stateful Research Harness

Entry points:
`runtime/agent-lee-research-runtime.mjs`
`runtime/agent-lee-research-harness.manifest.json`
`runtime/agent-lee-evidence-ledger.schema.json`

Routes:
`GET /agent-lee/research/health`
`POST /agent-lee/research/start`
`POST /agent-lee/research/search`
`POST /agent-lee/research/inspect`
`POST /agent-lee/research/curate`
`POST /agent-lee/research/claim-check`
`POST /agent-lee/research/apply-to-build`
`GET /agent-lee/research/:id`
`GET /agent-lee/research/:id/evidence`
`POST /agent-lee/research/:id/receipt`

Receipt paths:
`Archive/receipts/agent-lee-research/`

Role:
Stateful candidate evidence, curated evidence, rejected evidence, claim checks, and build-decision receipts for proof-oriented research.

### Orchestration Runtime

Entry points:
`runtime/agent-lee-orchestration-runtime.mjs`
`runtime/agent-lee-orchestration.manifest.json`
`runtime/agent-lee-preference-ledger.json`

Role:
Model pool routing, lane scheduling, work ledger, preference ledger, skill sandbox lifecycle, simulation receipts, and 3D/AR proof.

### Application Registry

Entry points:
`runtime/agent-lee-application-runtime.mjs`
`runtime/agent-lee-application-registry.json`
`runtime/agent-lee-application-inventory.json`
`tools/discover-agent-lee-windows-apps.ps1`

Routes:
`GET /agent-lee/apps`
`GET /agent-lee/apps/:id`
`POST /agent-lee/apps/discover`
`POST /agent-lee/apps/launch`
`POST /agent-lee/apps/open-file`
`POST /agent-lee/apps/close-owned`
`GET /agent-lee/apps/receipts`

Role:
Canonical local app discovery, launch, file-open routing, registry-backed receipts, and Paint/directory guardrails.

Model roles:
`light_conversation_model`
`coding_model`
`creative_3d_ar_model`
`research_reasoning_model`
`vision_model`
`security_audit_model`

Lane kinds:
`conversation`
`coding`
`research`
`creative`
`simulation`
`skill-builder`

### Discovery Layer

Entry points:
`runtime/discovery-loader.mjs`
`runtime/discovery_loader.py`
`tools/generate-discovery-index.mjs`
`tools/generate-discovery-index-fixed.mjs`
`tools/discovery.ps1`
`tools/analyze-discovery-sizes.mjs`
`source-index/all-leeway-files.index.json.new`
`source-index/all-leeway-files.index.json`
`source.lock`
`leeway-source-roots.txt`

Role:
Canonical workspace discovery, model-role resolution, governance manifest enrichment, and fresh-index promotion.

Truth posture:
`FRESH_INDEX_FIRST`
`BOM_STRIPPED`
`SOURCE_INDEX_EXCLUDED_FROM_RECURSION`
`LEEWAY_STANDARDS_CANONICAL_ROOT_FIRST`

### Room And Presentation Governance

Entry points:
`agent-lee-coding-mode/runtime/agent-lee-room-capabilities.manifest.json`
`agent-lee-coding-mode/runtime/agent-lee-visual-ai-workspace.manifest.json`
`agent-lee-coding-mode/runtime/agent-lee-conversation-abilities.manifest.json`
`agent-lee-coding-mode/runtime/agent-lee-language-policy.json`
`agent-lee-coding-mode/runtime/agent-lee-speech-style-policy.json`
`agent-lee-coding-mode/config/agent-lee-canonical-voice-law.md`
`Leeway Runtime Fabric/vision-os`
`Leeway Runtime Fabric/voice-os`
`Leeway Runtime Fabric/hardware-intelligence`
`Leeway Runtime Fabric/standards/vscode-extension/src/visual-intelligence`

Role:
Governed bilingual crowd operation, live translation, Leonard-only device and display authority, live room vision and audio awareness, and local visual workspace preview routing.

Truth posture:
`GOVERNED_PARTIAL`
`NO_SILENT_DEVICE_ACTION`
`PUBLIC_AUDIENCE_NO_AUTHORITY`

### Desktop Runtime

Entry point:
`desktop-runtime/server.mjs`

Port:
`8091`

Routes:
`GET /runtime/status`
`POST /runtime/web-search`
`POST /runtime/screenshot-show`
`POST /runtime/demo`
`POST /runtime/speak`

Role:
Local browser, sight, screenshot, and desktop control body.

### Voice Controller

Entry points:
`voice-conversation-v4/agent-lee-conversation-v4.ps1`
`voice-sentinel/agent-lee-voice-sentinel.ps1`
`voice-full-v7-clean/agent-lee-v7-service-check.ps1`
`start-agent-lee.ps1`
`tools/validate-agent-lee-executable-abilities.ps1`

Role:
Local voice capture, voice routing, and speech proof.

Speech style policy:
`runtime/agent-lee-speech-style-policy.json`

The router and speech validators treat this file as the natural-progress contract for Agent Lee voice output.

### Browser and Sight Control

Entry points:
`desktop-runtime/browser-agent.mjs`
`sandbox/agent-lee-live-integration/agent-lee-live-integration.html`
`sandbox/agent-lee-real-mouse-proof/real-mouse-proof.html`

Role:
Playwright-based browser search, screenshot, and visible proof tooling.

### Work Ledger And Receipts

Paths:
`Archive/agent-lee-work-ledger/work-ledger.jsonl`
`Archive/receipts/agent-lee-orchestration/`

Role:
Persistent local proof for task start, lane assignment, model routing, skill operations, simulation, and 3D/AR validation.

### PowerShell Control

Entry points:
`sandbox/test-onecore-speak-fixed.ps1`
`sandbox/test-onecore-speak-datareader.ps1`
`sandbox/test-onecore-voices.ps1`
`scripts/prove-agent-lee-tools.ps1`

Role:
Local Windows command proof and operator scripting.

### Mouse And Screenshot Control

Entry points:
`desktop-runtime/runtime.ps1`
`desktop-runtime/browser-agent.mjs`

Role:
Visible desktop actions and screenshot-backed proof.

### Model And Ollama Config

Primary model source:
`router/server-brainfix.mjs`

Ollama endpoint:
`http://127.0.0.1:11434`

Default model:
`qwen3:latest`

Role:
Local language model inference backing Agent Lee responses.

### Environment Files

Files:
`agent-lee-coding-mode/.env`
`agent-lee-coding-mode/package.json`
`agent-lee-coding-mode/leeway-source-roots.txt`

Role:
Local path and service configuration for Agent Lee coding mode.

### Start And Proof Scripts

Files:
`start-agent-lee.ps1`
`test-agent-lee.ps1`
`scripts/prove-agent-lee-tools.ps1`

Role:
Start, verify, and prove the Agent Lee core surfaces.

## Outer Surfaces

### Runtime Fabric

Port:
`4001`

Role:
Exposes Agent Lee outward through `/agent-lee/*` and truth endpoints.

### Cerebral

Port:
`8765`

Role:
Displays Agent Lee through the local voice and agent surfaces.

### IDE

Port:
`3000`

Role:
Single-canvas coding surface for Agent Lee overlay and terminal fabric truth.

## Truth Rule

All Agent Lee identity, voice, sight, browser, desktop, and coding behavior must be routed through `agent-lee-coding-mode`. Any adapter that cannot reach the core must truthfully report unavailable state instead of inventing a second Agent Lee.
