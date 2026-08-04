# Agent Lee Coding Mode

Agent Lee Coding Mode is the canonical Agent Lee production instance and the Supreme Agent Lead for the Leeway ecosystem.

The canonical machine-verifiable fingerprint is:

- `leeway.agent-lee.code-mode.canonical.supreme-agent-lead.v1`

## What This Root Owns

- Canonical identity and code-mode contract for Agent Lee
- Local router and desktop runtime entrypoints
- Skill discovery through the canonical Leeway universe manifest
- Compatibility with Runtime Fabric, Leeway IDE, and Cerebral surfaces
- VS Code chat via the multi-tool Agent Lee adapter at `http://127.0.0.1:8787/v1/chat/completions`
- Tool calling enabled; vision remains disabled until image payload support is validated end-to-end
- Full capability status endpoints for registry, vision, IoT, devices, hardware, robotics, automation, deployment, proof, and benchmarks

## Local Shelf Map

- `Archive/` is custody-only and split into `receipts/`, `proofs/`, `diagnostics/`, `backups/`, and `tmp/`
- `benchmarks/agent-lee/` holds local benchmark outputs
- `Archive/proofs/` holds proof artifacts that should not be mixed with receipts
- `Archive/receipts/` is reserved for future operational receipts only

## Canonical Discovery Order

1. `agent-lee-coding-mode/skills`
2. `Leeway Runtime Fabric/skills`
3. `Leeway Runtime Fabric/skills-university`
4. `Leeway Runtime Fabric/skills-university-exports`
5. `Leeway Runtime Fabric/stateful-research-harness`
6. `Leeway Runtime Fabric/skills/stateful-research-harness`
7. `leeway-80-bench/skills`

The active universe is described in:

- `Leeway Runtime Fabric/capability-registry/registry/leeway-universe.manifest.json`
- `agent-lee-coding-mode/agent-lee-identity.manifest.json`

Leeway IDE, Cerebral, and VS Code chat profiles must verify that same fingerprint before treating Agent Lee as canonical.

The VS Code-facing model id is `agent-lee-code-mode` and the visible model name is `Agent Lee Turbo`.

## Full Capability Mode

Runtime Fabric now exposes compact read-only status routes for the canonical capability surface:

- `/agent-lee/capabilities/full`
- `/agent-lee/capabilities/vision`
- `/agent-lee/capabilities/iot`
- `/agent-lee/capabilities/devices`
- `/agent-lee/capabilities/hardware`
- `/agent-lee/capabilities/robotics`
- `/agent-lee/capabilities/automation`
- `/agent-lee/capabilities/deployment`
- `/agent-lee/capabilities/proof`
- `/agent-lee/capabilities/benchmarks`
- `/skills-gateway/status`

The VS Code adapter also recognizes the matching built-in tool names and verifies canonical identity before returning compact JSON status results.

Vision is intentionally still guarded off. If a chat request contains image payload parts before a validated backend exists, the adapter returns a structured `AGENT_LEE_VISION_BACKEND_MISSING` error instead of pretending image support is available.

## Application Registry And Launch Runtime

Agent Lee now owns a canonical local application registry and launch runtime. The registry is the source of truth for local app discovery, safe launch, and file-open routing.

The canonical registry files are:

- `runtime/agent-lee-application-registry.json`
- `runtime/agent-lee-application-inventory.json`

The launch runtime lives in:

- `runtime/agent-lee-application-runtime.mjs`

The discovery script is:

- `tools/discover-agent-lee-windows-apps.ps1`

The router now exposes:

- `GET /agent-lee/apps`
- `GET /agent-lee/apps/:id`
- `POST /agent-lee/apps/discover`
- `POST /agent-lee/apps/launch`
- `POST /agent-lee/apps/open-file`
- `POST /agent-lee/apps/close-owned`
- `GET /agent-lee/apps/receipts`

The runtime also mirrors the registry through:

- `Leeway Runtime Fabric/provider-fabric/agent-lee-application-registry.json`

Launch rules are guarded:

- Paint only opens real image files.
- Directory opens go through File Explorer only when explicitly requested.
- Workspace-root opens are blocked from Paint.
- Terminal and settings-style apps remain confirmation-gated in proof flows.

The desktop actuator now reads the same registry file so `desktop.launch_app` stays aligned with the router and registry data.

## Live Conversation And Language Runtime

The live router at `router/server-brainfix.mjs` now exposes runtime-executable conversation, voice, and multilingual endpoints:

- `GET /agent-lee/conversation/health`
- `POST /agent-lee/conversation/start`
- `POST /agent-lee/conversation/turn`
- `POST /agent-lee/conversation/end`
- `GET /agent-lee/conversation/session/:id`
- `GET /agent-lee/voice/backends`
- `POST /agent-lee/voice/speak`
- `POST /agent-lee/voice/speak-stream`
- `POST /agent-lee/voice/transcribe`
- `GET /agent-lee/language/status`
- `POST /agent-lee/language/detect`
- `POST /agent-lee/language/translate`
- `GET /agent-lee/language/policy`

The language policy file is stored at:

- `runtime/agent-lee-language-policy.json`

The speech style policy file is stored at:

- `runtime/agent-lee-speech-style-policy.json`

The executable abilities manifest is stored at:

- `runtime/agent-lee-conversation-abilities.manifest.json`

The room and presentation governance manifest is stored at:

- `runtime/agent-lee-room-capabilities.manifest.json`

The visual AI workspace manifest is stored at:

- `runtime/agent-lee-visual-ai-workspace.manifest.json`

The room law covers:

- bilingual English and Spanish crowd operation
- live translation for public audiences
- Leonard-only authority for device, display, and export actions
- live room vision and audio awareness with privacy boundaries
- local visual workspace previews before export

The proof script for this surface is:

- `tools/validate-agent-lee-executable-abilities.ps1`

The speech style validator is:

- `tools/validate-agent-lee-speech-style.ps1`

The room-aware presentation law is enforced by:

- `config/agent-lee-canonical-voice-law.md`
- `runtime/agent-lee-language-policy.json`
- `runtime/agent-lee-speech-style-policy.json`

## Orchestration Runtime

Agent Lee now exposes a runtime orchestration surface that proves the model pool, lane scheduler, skill fabric, simulation flow, and 3D/AR proof paths at runtime instead of only in registry text.

The orchestration runtime is exposed through the canonical router at `router/server-brainfix.mjs`:

- `GET /agent-lee/orchestration/health`
- `GET /agent-lee/models`
- `GET /agent-lee/models/warm`
- `POST /agent-lee/models/warm`
- `POST /agent-lee/models/route`
- `GET /agent-lee/lanes`
- `POST /agent-lee/lanes/start`
- `GET /agent-lee/lanes/:id`
- `POST /agent-lee/lanes/:id/message`
- `POST /agent-lee/lanes/:id/cancel`
- `GET /agent-lee/work-ledger`
- `GET /agent-lee/preferences`
- `GET /agent-lee/skills/full`
- `GET /agent-lee/mcps`
- `GET /agent-lee/tools/full`
- `POST /agent-lee/tools/call`
- `POST /agent-lee/skills/route`
- `POST /agent-lee/skills/create`
- `POST /agent-lee/skills/validate`
- `POST /agent-lee/skills/simulate`
- `POST /agent-lee/simulations/run`
- `GET /agent-lee/simulations/:id`
- `GET /agent-lee/simulations/receipts`
- `GET /agent-lee/3d-ar/status`
- `POST /agent-lee/3d-ar/chess-set-proof`

The orchestration manifest lives at:

- `runtime/agent-lee-orchestration.manifest.json`

The preference ledger lives at:

- `runtime/agent-lee-preference-ledger.json`

The work ledger lives at:

- `Archive/agent-lee-work-ledger/work-ledger.jsonl`

The runtime policy is:

- Agent Lee owns the model pool.
- Models are not separate agents.
- Conversation stays responsive while background lanes run.
- Preference learning is local and inspectable.
- Live microphone recording is off by default.
- Physical actions default to simulation first.
- Fast proof mode is the default for expensive validation surfaces.

The orchestration validators are:

- `tools/validate-agent-lee-orchestration-runtime.ps1`
- `tools/validate-agent-lee-model-orchestration.ps1`
- `tools/validate-agent-lee-skill-fabric.ps1`
- `tools/validate-agent-lee-3d-ar-pipeline.ps1`
- `tools/validate-agent-lee-application-runtime.ps1`
- `tools/validate-agent-lee-stateful-research-harness.ps1`
- `tools/validate-agent-lee-vscode-chat-research-e2e.ps1`
- `tools/validate-agent-lee-vscode-chat-e2e.ps1`
- `tools/validate-agent-lee-speech-style.ps1`
- `tools/validate-agent-lee-agent-site-proof.ps1`
- `tools/validate-agent-lee-3d-chess-proof.ps1`

## Stateful Research Harness

The `stateful-research-harness` skill is expected to exist in these locations:

- `agent-lee-coding-mode/skills/stateful-research-harness`
- `Leeway Runtime Fabric/stateful-research-harness`
- `Leeway Runtime Fabric/skills/stateful-research-harness`

Each copy must keep `SKILL.md` directly under the skill folder and must not be double nested.

The Leeway-adapted Harness-1 pattern is stateful, not one-shot. A valid research pass should preserve:

- objective
- source map
- candidate evidence
- curated evidence
- rejected evidence
- claim checks
- open gaps
- build decisions
- receipts

Source quality should prefer official docs, source code, standards, project READMEs, and direct evidence. Thin SEO filler, stale duplicates, and unverifiable claims should be rejected instead of curated.

Research sessions are expected to enter through VS Code Chat when the work is proof-oriented. The canonical chat adapter is:

- `http://127.0.0.1:8787/v1/chat/completions`

Research receipts are written under:

- `Archive/receipts/agent-lee-research/`

Project proofs should also write local evidence ledgers in the project root when the research is applied to a build.

## Validation

Run the canonical instance validation script from the workspace root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\agent-lee-coding-mode\tools\validate-agent-lee-canonical-instance.ps1
```

The validator also invokes the live proof command:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\agent-lee-coding-mode\tools\prove-agent-lee-same-instance.ps1
```

The required canonical identity gate for local startup and CI-style validation is:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\agent-lee-coding-mode\tools\validate-agent-lee-canonical-gate.ps1
```

That gate must fail if any of the following fail:

- `agent-lee-coding-mode/tools/prove-agent-lee-same-instance.ps1`
- `agent-lee-coding-mode/tools/validate-agent-lee-canonical-instance.ps1`
- `agent-lee-coding-mode/tools/validate-agent-lee-vscode-chat.ps1`
- `agent-lee-coding-mode/tools/validate-agent-lee-full-capability.ps1`
- `Leeway Runtime Fabric/tools/validate-leeway-skill-universe.ps1`

If you only want the skill-universe check, run the Runtime Fabric validator first:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\Leeway Runtime Fabric\tools\validate-leeway-skill-universe.ps1
```

## Router

The router at `router/server-brainfix.mjs` reads the canonical universe manifest and advertises the active skill and capability surfaces instead of inventing a second Agent Lee universe.

VS Code chat profiles in `.vscode/` and `.leeway-vscode/` are treated as canonical only when they carry the same fingerprint and canonical manifest paths.

## Troubleshooting

- If Chat shows renderer errors like `No lowest priority node found (path: mre)`, reload VS Code and re-run the validator before changing any payload shapes.
- If tool calling is not available, confirm the adapter still reports `toolCalling: true` and that the request is reaching `http://127.0.0.1:8787/v1/chat/completions`.
- Keep `vision` disabled unless the adapter has been validated with real image content parts and multipart responses.
- If live conversation, voice streaming, or microphone capture fails, run `tools/validate-agent-lee-executable-abilities.ps1` directly and inspect the `Archive/receipts/` proof it produces.
- If model routing, lane concurrency, skill creation, or 3D proof fails, run the orchestration validators directly and inspect the receipts under `Archive/receipts/`.
