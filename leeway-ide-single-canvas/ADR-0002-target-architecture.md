# ADR-0002: Target Architecture for LeeWay IDE 2.0

## Status
Proposed

## Context
The current LeeWay IDE codebase already contains a meaningful domain model and a working runtime bridge. The next step is not to rewrite the product from scratch, but to reconstruct it around a clearer architecture that separates experience, modules, orchestration, and execution engines.

## Decision
LeeWay IDE 2.0 will be implemented as a modular application shell with a Next.js-based experience layer, a runtime-oriented orchestration layer, and execution engines that are invoked through the LeeWay Runtime Fabric rather than directly from the UI.

## Architectural Vision

### 1. Application Shell
The user experience will be delivered by:
- Next.js
- React
- TypeScript
- Tailwind
- LeeWay Design System

Next.js is the application shell and host surface, not the whole product.

### 2. Core Product Structure
The product will be organized around LeeWay Modules rather than isolated studios.

#### Proposed Modules
- Code Module
- Workflow Module
- Runtime Module
- Agent Module
- Memory Module
- Media Module
- Deployment Module
- Security Module
- Device Module
- Creator Module

Each module may expose one or more views, but the module is the primary organizational boundary.

### 3. Agent Lee as the Operating System
Agent Lee will be elevated to a first-class platform service with the following responsibilities:
- Conversation
- Planner
- Task Manager
- Memory
- Reasoner
- Dispatcher
- Voice
- Vision
- Embodiment

Modules will call Agent Lee through a shared service interface instead of embedding chat, planning, or task-routing logic directly.

### 4. Runtime Fabric as the Contract Layer
No module should talk directly to an engine implementation.

The canonical flow is:

Module -> Runtime Fabric API -> Orchestrator -> Execution Engine

Where the execution path may include:
- LeeWay Code Engine
- LeeWay Workflow Engine
- Ollama
- SQLite / Litestream
- External service adapters

### 5. LeeWay Code Engine
OpenCode will be internalized as the LeeWay Code Engine.

Responsibilities:
- planning
- editing
- patching
- refactoring
- terminal execution
- Git integration
- model execution

The Code Engine owns execution behavior, not UI.

### 6. LeeWay Workflow Engine
n8n will be internalized as the LeeWay Workflow Engine.

Responsibilities:
- loops
- scheduling
- triggers
- queues
- automation
- integrations

The Workflow Engine owns execution and orchestration behavior, not UI.

### 7. Runtime Fabric Services
The Runtime Fabric will be treated as a service mesh for capabilities.

#### Proposed Fabric Areas
- Provider Fabric
- Discovery Fabric
- Skills Fabric
- Memory Fabric
- Workflow Fabric
- Deployment Fabric
- Security Fabric
- Device Fabric
- Media Fabric
- Model Fabric
- Execution Fabric

This gives each capability a first-class runtime location.

## Node Model
The current node system will be simplified into a clearer model:

Node Definition -> Node Renderer -> Capability -> Runtime Action

This keeps rendering separate from behavior and reduces overlap between node-related abstractions.

## Canonical API Contract
The system will expose a canonical contract for module-to-runtime communication:
- capability registration
- task submission
- task status
- result delivery
- event streaming
- receipt management
- policy evaluation

All modules will interact with this contract rather than with engine-specific APIs.

## Capability Registration and Execution
Capabilities will be registered through the Runtime Fabric and executed through the orchestrator.

The lifecycle of a task will follow:
1. Module requests a capability
2. Runtime Fabric resolves the capability
3. Orchestrator dispatches the task
4. Execution engine performs the work
5. Result and receipt are returned to the module

## Plugin and Extension Model
The platform will support pluggable capabilities through a well-defined extension model:
- module registration
- capability registration
- runtime adapter registration
- policy registration
- UI view registration

## Consequences
### Positive
- Clear separation between UI, modules, and execution engines
- Better scalability for new capabilities
- Stronger role boundaries for Agent Lee, OpenCode, n8n, and Runtime Fabric
- Easier migration because the target is explicitly defined

### Negative
- Requires a deliberate migration from the current studio-centric and node-heavy structure
- Requires a canonical runtime contract to replace ad hoc bridging

## Migration Alignment
This ADR becomes the target for the migration scripts and PowerShell phases. Each migration step should be evaluated against whether it moves the implementation closer to this architecture.
