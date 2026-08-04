<!--
LEEWAY HEADER — DO NOT REMOVE

REGION: STANDARDS.REGISTRY
TAG: STANDARDS.REGISTRY.AGENTS.CANONICAL
DESCRIPTION: Canonical LeeWay agent registry — every agent that runs in the leeway-construct fabric must be declared here first
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = LeeWay Agent Registry — authoritative list of all AgentVM identities in the leeway-construct runtime
WHY = Every agent must be declared, documented, and registered before it may operate inside the fabric
WHO = Leeway Industries / Leeway Innovation — Leonard Lee
WHERE = LeeWay-Standards/standards/AGENT_REGISTRY.md
WHEN = 2026-04-20
HOW = Markdown registry with YAML-like blocks per agent; sourced by agentBootstrap.ts and cross-linked to AgentVMIdentity

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
-->

# LeeWay Agent Registry
**Authority:** Leeway Industries / Leeway Innovation  
**Governed by:** Agent Lee — Leonard Lee  
**Effective:** 2026-04-20  
**Period:** LeeWay Standards Era (2026–present)

> All agents operating in the LeeWay Construct Fabric must be declared in this registry. Undeclared agents are rejected by the AgentRegistry at boot. Each agent carries an `AgentVMIdentity` badge that traces it to this document.

---

## Registry Index

| # | Agent ID | Agent Name | Manifestation | Status |
|---|----------|-----------|---------------|--------|
| 01 | `scene-supervisor-001` | Scene Supervisor Agent | `agentlee.runtime` | SYSTEM |
| 02 | `motion-mapper-001` | Motion Mapper Agent | `agentlee.runtime` | SYSTEM |
| 03 | `stability-sentinel-001` | Stability Sentinel Agent | `agentlee.runtime` | SYSTEM |
| 04 | `construct-projection-router-001` | Projection Router Agent | `agentlee.runtime` | SYSTEM |
| 05 | `construct-employee-projection-001` | Employee Projection Agent | `agentlee.network` | SYSTEM |
| 06 | `construct-environment-steward-001` | Environment Steward Agent | `agentlee.core` | SYSTEM |
| 07 | `construct-asset-ingestion-001` | Asset Ingestion Agent | `agentlee.data` | SYSTEM |
| 08 | `construct-policy-agent-001` | Policy Agent | `agentlee.guardian` | SYSTEM |
| 09 | `construct-quality-assurance-001` | Quality Assurance Agent | `agentlee.guardian` | SYSTEM |
| 10 | `construct-optimization-agent-001` | Optimization Agent | `agentlee.runtime` | SYSTEM |
| 11 | `construct-voxel-fabric-001` | Voxel Fabric Agent | `agentlee.runtime` | SYSTEM |
| 12 | `construct-operating-system-001` | Construct Operating System Agent | `agentlee.core` | SYSTEM |
| 13 | `construct-receipt-audit-001` | Receipt Audit Agent | `agentlee.memory` | SYSTEM |

---

## Agent Entries

---

### 01 — Scene Supervisor Agent

```
AGENT_ID:        scene-supervisor-001
NAME:            Scene Supervisor Agent
MANIFESTATION:   agentlee.runtime
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/SceneSupervisorAgent.ts
LEEWAY_TAG:      CORE.AGENTS.SUPERVISOR.SCENE
```

**Purpose:**  
Platform-detection state machine. Monitors WebXR/device state every frame. Self-heals scene when headsets disconnect or WebGL capabilities change. Emits `platform-change` events consumed by MotionMapper and StabilitySentinel.

**Dependencies:**  
- None (root supervisor)

**Emits:**  
- `platform-change` (PlatformState)

**Listens:**  
- WebXR session events
- WebGL context loss events

---

### 02 — Motion Mapper Agent

```
AGENT_ID:        motion-mapper-001
NAME:            Motion Mapper Agent
MANIFESTATION:   agentlee.runtime
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/MotionMapperAgent.ts
LEEWAY_TAG:      CORE.AGENTS.MOTION.MAPPER
```

**Purpose:**  
Translates raw hardware input (click / touch / controller trigger) into unified `InteractEvent` objects regardless of platform. When Supervisor signals a platform change, hot-swaps listener bindings without scene reload.

**Dependencies:**  
- SceneSupervisorAgent (subscribes to platform changes)

**Emits:**  
- `InteractEvent` (normalised)

**Listens:**  
- `MouseEvent` (desktop)
- `TouchEvent` (mobile/AR)
- XR controller events (VR/Quest)

---

### 03 — Stability Sentinel Agent

```
AGENT_ID:        stability-sentinel-001
NAME:            Stability Sentinel Agent
MANIFESTATION:   agentlee.runtime
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/StabilitySentinelAgent.ts
LEEWAY_TAG:      CORE.AGENTS.STABILITY.SENTINEL
```

**Purpose:**  
Real-time FPS monitor. Tracks rolling FPS average per platform. Emits `QualityCommand` events when FPS drops below platform thresholds. Auto-degrades quality levels to prevent VR motion sickness (minimum 72 FPS for VR, 60 for AR, 45 for desktop3d).

**Quality Levels:** `ultra → high → medium → low → emergency`

**Dependencies:**  
- SceneSupervisorAgent (platform thresholds differ by platform)

**Emits:**  
- `QualityCommand`

**Listens:**  
- Animation frame probe callbacks

---

### 04 — Projection Router Agent

```
AGENT_ID:        construct-projection-router-001
NAME:            Projection Router Agent
MANIFESTATION:   agentlee.runtime
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.ROUTER.PROJECTION
```

**Purpose:**  
Parses `agentlee:command` events and routes directives to the correct construct portal surface. Maps natural language keywords to portal types: database, pallium, codeStudio, creatorsStudio, employee, diagnostics, assetRegistry, objectCatalog, media, comm, xrStackLab.

**Dependencies:**  
- EventBus
- Agent Lee Orchestrator (command source)

**Emits:**  
- `construct:summon` (ConstructSummonRequest)

**Listens:**  
- `agentlee:command`

---

### 05 — Employee Projection Agent

```
AGENT_ID:        construct-employee-projection-001
NAME:            Employee Projection Agent
MANIFESTATION:   agentlee.network
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.PROJECTION.EMPLOYEE
```

**Purpose:**  
Governs employee-center projections within the construct. Treats employees as real-world task links dispatched from the construct. Responds to dispatch/hire commands by summoning the employee portal.

**Policy:**  
Only allows dispatch after an employee is hired. Enforces hourly service policy for task assignments.

**Dependencies:**  
- EventBus

**Emits:**  
- `construct:summon` (employee portal)

**Listens:**  
- `agentlee:command`

---

### 06 — Environment Steward Agent

```
AGENT_ID:        construct-environment-steward-001
NAME:            Environment Steward Agent
MANIFESTATION:   agentlee.core
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.STEWARD.ENVIRONMENT
```

**Purpose:**  
Owns environment mood, floor state, and manifested fixtures inside the construct. Responds to natural language commands to set environment presets (office, nature, sunset, void, construct) and place fixture objects.

**Environment Presets:** `construct | office | nature | sunset | void`

**Fixture Categories:**  
furniture, business, electronics, nature, entertainment, science, transport, space

**Dependencies:**  
- EventBus

**Emits:**  
- `construct:environment` (ConstructEnvironmentDirective)

**Listens:**  
- `agentlee:command`

---

### 07 — Asset Ingestion Agent

```
AGENT_ID:        construct-asset-ingestion-001
NAME:            Asset Ingestion Agent
MANIFESTATION:   agentlee.data
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.INGESTION.ASSET
```

**Purpose:**  
Indexes and routes all free 3D asset sources into the construct database. Manages intake from 12 registered free-asset sources (Sketchfab, Poly Haven, ambientCG, Kenney, Quaternius, NASA 3D, Smithsonian, Khronos, Free3D, CGTrader, TurboSquid, MyMiniFactory).

**Registered Asset Sources:**  
`sketchfab | polyhaven | ambientcg | kenney | quaternius | nasa-3d | smithsonian-open-access | khronos-samples | free3d | cgtrader-free | turbosquid-free | myminifactory`

**Dependencies:**  
- EventBus

**Emits:**  
- `construct:asset-sources` (FreeAssetSource[])

**Listens:**  
- `agentlee:command`
- `construct:os-bootstrap`

---

### 08 — Policy Agent

```
AGENT_ID:        construct-policy-agent-001
NAME:            Policy Agent
MANIFESTATION:   agentlee.guardian
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.POLICY.LICENSE
```

**Purpose:**  
Governs license policy enforcement for all voxel generation directives. Auto-approves safe licenses. Blocks "Varies" license sources and queues them for human approval in the Approval Center. Prevents unauthorized or legally ambiguous assets from entering the construct without review.

**Policy Rules:**  
- License includes "varies" → block + queue for human approval
- All other licenses → auto-approve

**Dependencies:**  
- EventBus
- constructOperatingSystemStore (enqueueLicenseApprovalRequest)

**Emits:**  
- `policy:voxel-decision` (PolicyApprovalDecision)

**Listens:**  
- `voxel:generate` (VoxelGenerateDirective)

---

### 09 — Quality Assurance Agent

```
AGENT_ID:        construct-quality-assurance-001
NAME:            Quality Assurance Agent
MANIFESTATION:   agentlee.guardian
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.QA.GUARD
```

**Purpose:**
Enforces hard quality gates for generated voxel outputs before they are persisted or rendered. Rejects empty geometry, runtime-heavy outputs, and flat scenes. Emits deterministic QA result payloads consumed by Voxel Fabric retries.

**Dependencies:**
- EventBus
- AgentMemoryStore

**Emits:**
- `voxel:qa-result` (VoxelQAResult)

**Listens:**
- `voxel:qa-check` (VoxelQACheckRequest)

---

### 10 — Optimization Agent

```
AGENT_ID:        construct-optimization-agent-001
NAME:            Optimization Agent
MANIFESTATION:   agentlee.runtime
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.OPTIMIZATION.RUNTIME
```

**Purpose:**
Applies deterministic optimization passes to heavy voxel outputs before QA scoring and persistence. Handles voxel decimation and palette capping to keep runtime budgets safe on desktop and mobile surfaces.

**Dependencies:**
- EventBus
- AgentMemoryStore

**Emits:**
- `voxel:optimize-result` (VoxelOptimizationResult)

**Listens:**
- `voxel:optimize` (VoxelOptimizationRequest)

---

### 11 — Voxel Fabric Agent

```
AGENT_ID:        construct-voxel-fabric-001
NAME:            Voxel Fabric Agent
MANIFESTATION:   agentlee.runtime
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.FABRIC.VOXEL
```

**Purpose:**  
Core scene generation pipeline. Routes approved model requests through deterministic image→Three.js→A-Frame directives. Handles all input types: catalog-fixture, image-upload, html-upload, default-scene, scene-recall. Persists all generated scenes to the scene registry. Exports to Quest, AR.js, and WebXR targets.

**Input Kinds:**  
`catalog-fixture | image-upload | html-upload | default-scene | scene-recall`

**Export Targets:**  
`construct | quest | arjs | webxr`

**Deterministic Pipeline:**  
HTML/images → seeded PRNG → reproducible voxel geometry → Three.js Group → A-Frame export

**Dependencies:**  
- EventBus
- DeterministicVoxelEngine
- DeterministicConstructService
- constructOperatingSystemStore (saveGeneratedSceneAsset)

**Emits:**  
- `voxel:threejs-ready` (VoxelThreeJsArtifact)
- `ar:export` (ArExportArtifact)
- `construct:environment` (ConstructEnvironmentDirective)
- `voxel:generate` (for scene recall re-emission)

**Listens:**  
- `policy:voxel-decision` (PolicyApprovalDecision)
- `agentlee:command` (scene recall commands)
- `construct:os-bootstrap`

---

### 12 — Construct Operating System Agent

```
AGENT_ID:        construct-operating-system-001
NAME:            Construct Operating System Agent
MANIFESTATION:   agentlee.core
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.OS.CONSTRUCT
```

**Purpose:**  
Bootstraps the entire construct baseline on user authentication. Initialises: ID Line identity, object line library, indexed free-asset registry, hive collaboration, watch parties, and developer contribution exchange. The root agent that wires the entire construct OS together.

**Bootstraps:**  
- Construct profile from Firestore
- Free-asset source catalog
- ID Line (LEE-XXXX-XXXX format)
- Watch party channels
- Hive collaboration links

**Dependencies:**  
- Firestore (constructOperatingSystemStore)
- EventBus

**Emits:**  
- `construct:profile-ready` (ConstructProfileReadyEvent)
- `construct:asset-sources` (FreeAssetSource[])

**Listens:**  
- `construct:os-bootstrap` (ConstructOSBootstrap)
- `agentlee:command`

---

### 13 — Receipt Audit Agent

```
AGENT_ID:        construct-receipt-audit-001
NAME:            Receipt Audit Agent
MANIFESTATION:   agentlee.memory
VERSION:         1.0.0
AUTHORITY:       Leeway Industries / Leeway Innovation
CREATED_BY:      Leonard Lee
STATUS:          active
BOOT:            always-on (pre-React singleton)
SOURCE:          src/core/agents/ConstructFabricAgents.ts
LEEWAY_TAG:      CORE.AGENTS.AUDIT.RECEIPT
```

**Purpose:**  
Writes construct-level execution receipts so every directive is tracked, traced, and monitored. All commands and construct summons are logged through Pallium memory client with source attribution and severity classification.

**Audit Trails:**  
- All `agentlee:command` events → Pallium log
- All `construct:summon` events → Pallium log
- All `voxel:threejs-ready` events → Pallium log

**Dependencies:**  
- Pallium memory client
- EventBus

**Emits:**  
- Nothing (audit-only agent)

**Listens:**  
- `agentlee:command`
- `construct:summon`
- `voxel:threejs-ready`

---

## AgentVM Manifestation Namespaces

| Namespace | Description | Governed Agents |
|-----------|-------------|-----------------|
| `agentlee.core` | Core OS and environment | ConstructOS, EnvironmentSteward |
| `agentlee.guardian` | Policy and quality governance | Policy, QualityAssurance |
| `agentlee.runtime` | Scene rendering, motion, voxels, routing | SceneSupervisor, MotionMapper, StabilitySentinel, ProjectionRouter, VoxelFabric |
| `agentlee.memory` | Audit, receipts, pallium storage | ReceiptAudit |
| `agentlee.data` | Asset ingestion, data pipelines | AssetIngestion |
| `agentlee.network` | Network, employees, collaboration | EmployeeProjection |

---

## Always-On System Boot Contract

All 13 agents MUST be initialised before any React component mounts. The boot sequence is:

```
main.tsx
  └─ src/core/systemAgentBoot.ts   ← singleton, runs once
       ├─ SceneSupervisorAgent.init()
       ├─ MotionMapperAgent.init()
       ├─ StabilitySentinelAgent.init()
       ├─ ProjectionRouterAgent.init()
       ├─ EmployeeProjectionAgent.init()
       ├─ EnvironmentStewardAgent.init()
       ├─ AssetIngestionAgent.init()
       ├─ PolicyAgent.init()
      ├─ QualityAssuranceAgent.init()
      ├─ OptimizationAgent.init()
       ├─ VoxelFabricAgent.init()
       ├─ ConstructOperatingSystemAgent.init()
       └─ ReceiptAuditAgent.init()
```

`AgentRegistry.verifyAll()` is called after boot. Non-compliant agents trigger a governance warning in the console.

---

## Agent Governance Rules

1. **Every agent must carry a valid `AgentVMIdentity`** with `authority = 'Leeway Industries / Leeway Innovation'` and `createdBy = 'Leonard Lee'`
2. **Every agent must be declared in this registry** before it may operate in the fabric
3. **Every agent must register itself** by calling `AgentRegistry.register(this)` inside `init()`
4. **Every agent must implement** `verify()`, `dispose()`, and `init()` from `ILeeWayAgent`
5. **All system agents are always-on** — they are never disposed while the session is active
6. **New agents require** a registry entry with full 5WH block, manifestation namespace, and boot designation

---

## Prime Security Wing

The modern LeeWay runtime includes a dedicated Prime Security Wing. These officers operate as declared Agent VM identities under Agent Lee Prime and exist to defend the fabric from impersonation, memory poisoning, rogue plugins, sleeper behavior, and trusted-looking internal compromise.

| Officer | Agent ID | Function |
|---------|----------|----------|
| Shield Governor Serah Kane | `prime-shield-governor` | Protected-action review, zone enforcement, and privileged execution gating |
| Attestation Marshal Dorian Vale | `prime-attestation-marshal` | Agent, worker, and bridge identity proof review |
| Memory Warden Nyra Sol | `prime-memory-warden` | Provenance, recall integrity, and memory poisoning defense |
| Threat Sentinel Oren Pike | `prime-threat-sentinel` | Drift hunting, rogue workflow detection, and quarantine escalation |

These officers are part of the Prime Family security command structure and must leave receipts for identity review, approval review, memory-integrity review, and runtime incident escalation.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-04-20 | Initial registry — all 11 system agents documented | Leonard Lee / Agent Lee |
| 2026-04-20 | Added always-on Quality Assurance and Optimization agents (13 total) | Leonard Lee / Agent Lee |
| 2026-05-09 | Added Prime Security Wing officers for zero-trust enforcement, attestation, memory integrity, and threat hunting | Leonard Lee / Agent Lee |
