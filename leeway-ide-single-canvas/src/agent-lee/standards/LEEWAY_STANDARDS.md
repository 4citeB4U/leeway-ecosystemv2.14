<!--
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.STANDARDS.LEEWAY_STANDARDS
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# LeeWay Standards

LeeWay Standards are the teaching and governance layer for the Agent Lee runtime.
They explain how the application behaves, how evidence is gathered, how agents are named and protected, and how the visual identity is presented.

This document is the canonical standards surface for this workspace.
It is not a VS Code extension file, but it must stay aligned with the shipped application, the registry, the voice lock, the validation guide, and the security policies that govern the runtime.

## Required Header

Every governed LeeWay file must include:

- `LEEWAY_HEADER`
- `REGION`
- `TAG`
- `DISCOVERY_PIPELINE`

## Discovery Pipeline

Voice -> Intent -> Location -> Vertical -> Ranking -> Render

This is the ordered path Agent Lee uses to interpret a request, select the right surface, and decide what should be rendered back to the user.

## Non-Negotiable Standards

- Scores below `70` are blocking.
- No governed file should be left without provenance, purpose, and a valid tag.
- Receipts are required for edits, commands, plugin calls, and verification work.
- Confirmation is required before destructive, deployment, payment, database, plugin, or security actions.
- Final user-facing output must remain sovereign through Agent Lee Prime.
- Memory is evidence-bearing state, not unquestioned truth.
- Protected runtime surfaces are visible, but not freely mutable.

## What LeeWay Standards Actually Cover

LeeWay Standards govern the full Agent Lee fabric:

- the application shell and runtime behavior
- the sovereign chat and orchestration model
- the agent fleet and its declared identities
- the MCP adapters and external capability surfaces
- the voice runtime and playback lock
- the verification and receipt workflow
- the security boundaries and zero-trust rules
- the visual identity pack that represents the system to users

The standards exist to keep the runtime teachable, inspectable, and safe to operate inside real development work.

## Core System Model

Agent Lee Prime is the sovereign coordinator and the only final speaker to the user.
Everything else operates through governed lanes around that core.

1. User interaction enters through chat, sidebar, voice, command palette, and settings.
2. Intent routing decides whether the request is local, workspace-bound, external, or validation-heavy.
3. Agent and MCP orchestration assign work to declared specialist identities.
4. Execution produces files, evidence, runtime effects, or visual validation.
5. Verification checks the result before it is trusted.
6. Governance enforces the law engine, receipts, memory provenance, and protected-agent boundaries.

This is the same operating logic the application demonstrates in practice.

## Reference Architecture

The strongest source of truth for the app-facing story is the main repository README, which describes the runtime as a governed engineering system rather than a conventional chat extension.

Supporting references:

- [Main README](../../README.md)
- [Agent governance instructions](../../AGENTS.md)
- [Agent registry](../sdk/standards/AGENT_REGISTRY.md)
- [Voice lock](../voice/VOICE_LOCK.md)
- [Packaged validation guide](../docs/Agent-Lee-Packaged-Validation.md)
- [GitHub policy](../github/GITHUB_POLICY.md)
- [MCP adapters README](../mcp/adapters/README.md)
- [LeeWay governance law set](../../references/law-set.md)
- [LeeWay proposal-before-mutation reference](../../references/proposal-before-mutation.md)
- [LeeWay audit checks reference](../../references/audit-checks.md)

## Governance Principles

### Sovereign runtime

The runtime is expected to preserve persistent configuration, memory, receipts, catalogs, reports, browser evidence, voice settings, and execution artifacts under the LeeWay workspace.

### Agent VM identity

Agents are declared identities, not vague helpers.
Each important runtime actor should be inspectable by name, lineage, purpose, authority, and operational scope.

### Governance first

Capability without governance is treated as risk.
Approvals, validation, sandbox boundaries, and receipts are part of the operating model.

### Evidence over vibes

The system should produce real file references, real browser evidence, real verification outputs, and real runtime state transitions.

## Agent Fleet And Protected Surfaces

The registry and runtime documentation define the agent fleet, including specialist agents, MCP-linked agents, and protected operators.

The most important protected surfaces remain visible but observed-only:

- Agent Lee Prime
- Prime Security officers
- LeeWay Registry MCP Agent
- LeeWay Validation MCP Agent

This protection exists so the agents responsible for constitutional integrity cannot be weakened by ordinary customization flows.

## Prime Security Wing

The app’s security model includes formal security officers with declared duties and VM identities.

- Shield Governor Serah Kane reviews protected actions and blocks unverifiable privileged execution.
- Attestation Marshal Dorian Vale verifies agent, worker, and bridge identity claims.
- Memory Warden Nyra Sol protects memory provenance and poisoning resistance.
- Threat Sentinel Oren Pike hunts drift, rogue workflows, contradiction patterns, and trusted-looking lateral movement.

## Model Hive And Voice Lock

The application uses a multi-role model hive instead of pretending one model should do everything.

| Role | Default Model |
| :--- | :--- |
| Builder | `qwen2.5-coder:14b` |
| Designer/UX | `qwen2.5-coder:7b` |
| Verifier | `deepseek-coder-v2:16b` |

If those exact models are unavailable, the runtime may fall back to compatible installed alternatives.

Voice is equally governed.
The locked local speech target is the LeeWay-owned live clone route documented in the voice lock, and the voice experience should remain consistent with that governed route order unless an explicit re-audition is approved.

## Memory, Receipts, And Verification

LeeWay treats memory as operational evidence, not as unquestioned truth.

The standards require:

- provenance-bearing memory entries
- trust state and verification state where applicable
- receipts for sensitive edits, commands, and plugin work
- validation before declaring a change complete
- no silent trust for unvetted imported state

The validation guide should be used whenever the packaged runtime, install flow, or UI click-through needs to be proven end-to-end.

## Security Posture

The runtime follows a zero-trust posture:

- no plugin is trusted by default
- no worker is trusted by default
- no memory entry is trusted by default
- no imported surface is trusted by default
- external or higher-risk surfaces require visible approval and auditability

The security zone model keeps the constitutional core separate from sandboxed and experimental surfaces.

## Visual Identity Pack

The workspace now includes a broader identity pack that should be reflected in the standards body and in the app narrative.

Primary visual anchors:

<p align="center">
	<img src="../../LeeWayStandardslogo.png" alt="LeeWay Standards logo" width="220" />
</p>

<p align="center">
	<img src="../vscode-extension/media/readme-header.png" alt="Agent Lee Readme header art" width="100%" />
</p>

<p align="center">
	<img src="../vscode-extension/media/readme-system-flow.png" alt="Agent Lee system flow diagram" width="100%" />
</p>

<p align="center">
	<img src="../vscode-extension/media/leeway-standards-button.png" alt="LeeWay standards button" width="72%" />
</p>

Workspace-level identity assets that should remain available to the teaching material:

- `../../LeeWayStandardslogo.png`
- `../../readme.md-image-header.png`
- `../../readms.md-image-1.png`
- `../../leeway-standards-button.png`

Historical UI proof artifacts classified for deletion under LeeWay production cleanse:

- `../../top right button .png`
- `../../bottom button for agent lee .png`
- `../../all buttons.png`

App-facing media assets that should remain synchronized with the standards narrative:

- `../vscode-extension/media/LeeWayStandardslogo.png`
- `../vscode-extension/media/readme-header.png`
- `../vscode-extension/media/readme-system-flow.png`
- `../vscode-extension/media/leeway-standards-button.png`
- `../vscode-extension/media/top-right-button.png`
- `../vscode-extension/media/bottom-button.png`
- `../vscode-extension/media/agent-lee-icon.png`

## Teaching Intent

LeeWay Standards should read like a constitutional guide and a training surface.
It should teach new maintainers how the system thinks, where the truth lives, which identities are protected, and how the visual brand ties back to the runtime.

The document should stay strong enough to support the application, but clear enough to explain why the application exists.

## Maintenance Rule

When the app gains new models, new agent identities, new images, new security rules, or new validation flows, the standards file should be updated in the same pass so the teaching layer never drifts from the actual runtime.
