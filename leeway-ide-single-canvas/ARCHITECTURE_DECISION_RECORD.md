# LeeWay IDE Architecture Decision Record

## Status
Proposed for migration planning.

## Context
The current LeeWay IDE single-canvas workspace has been proven to build and serve successfully after restoring missing compatibility modules. The architectural question is no longer whether the app can run, but how the current implementation should be reorganized into a durable system built around LeeWay IDE 2.0.

## Revised Architectural Direction
LeeWay IDE 2.0 will be structured as:
- a Next.js-based application shell
- a React and TypeScript UI layer
- a Tailwind and LeeWay Design System experience foundation
- Agent Lee as a first-class operating service
- the LeeWay Runtime Fabric as the canonical contract layer
- the LeeWay Code Engine as the internalized OpenCode runtime
- the LeeWay Workflow Engine as the internalized n8n runtime
- SQLite and Litestream for durable state

Next.js is the application shell and host surface, not the entire product.

## Architectural Summary
The existing application is a single-page canvas IDE composed of:
- a main shell in src/App.tsx
- an interactive node canvas in src/components/UnifiedCanvas.tsx
- a node renderer registry in src/components/NodeRenderer.tsx
- a runtime bridge in server.ts
- a runtime truth client in src/services/omniTerminalFabric.ts
- a set of studio/workspace/panel components for code, content, terminal, devices, wallet, preview, and settings surfaces

The architecture is currently a hybrid of:
- presentation-first UI
- local state persistence
- runtime bridge expectations
- placeholder or partial implementations for several studios

## Inventory of Major Application Areas

### 1. Application Shell and Layout
- Main application shell: src/App.tsx
  - Primary application container
  - Owns canvas state, module selection, wallet, templates, console, and runtime truth refresh
  - Acts as orchestration hub for many features
  - Classification: Refactor
- Sidebar: src/components/Sidebar.tsx
  - Module navigation and access surface
  - Classification: Refactor
- TemplateSelector: src/components/TemplateSelector.tsx
  - Layout/template selection UI
  - Classification: Refactor
- MiniMap: src/components/MiniMap.tsx
  - Canvas navigation aid
  - Classification: Keep or Refactor depending on future canvas strategy

### 2. Canvas and Node Model
- UnifiedCanvas: src/components/UnifiedCanvas.tsx
  - Core canvas surface with pan/zoom and node rendering
  - Classification: Refactor
- NodeComponent: src/components/NodeComponent.tsx
  - Node presentation and interaction wrapper
  - Classification: Refactor
- NodeRenderer: src/components/NodeRenderer.tsx
  - Node-type renderer registry
  - Classification: Refactor
- NodePalette: src/components/NodePalette.tsx
  - Node palette / add-node interface
  - Classification: Refactor
- StudioNode: src/components/StudioNode.tsx
  - Legacy concept for studio-like node behavior
  - Classification: Replace with module-aware node capability model
- NodeGroup: src/components/NodeGroup.tsx
  - Grouping logic for node clusters
  - Classification: Refactor

### 3. Modules and Workspaces
The current “studio” concept should be replaced by LeeWay Modules:
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

Legacy workspace components that map to these modules include:
- ContentStudio: src/components/ContentStudio.tsx
- CodeWorkspace: src/components/CodeWorkspace.tsx
- CodeEditor: src/components/CodeEditor.tsx
- FileExplorer: src/components/FileExplorer.tsx
- LivePreview: src/components/LivePreview.tsx
- LiveWallet: src/components/LiveWallet.tsx
- DevicesWorkspace: src/components/DevicesWorkspace.tsx
- AudioWorkspace: src/components/AudioWorkspace.tsx
- VideoWorkspace: src/components/VideoWorkspace.tsx
- VisionWorkspace: src/components/VisionWorkspace.tsx
- WriterWorkspace: src/components/WriterWorkspace.tsx
- XRWorkspace: src/components/XRWorkspace.tsx
- ForgeStudio: src/components/ForgeStudio.tsx
- ForgeStudioWorkspace: src/components/ForgeStudioWorkspace.tsx
- FoundryNodeInspector: src/components/FoundryNodeInspector.tsx

These should be reorganized under module-oriented boundaries rather than standalone studio surfaces.

### 4. Panels and Overlays
- AgentOverlay: src/components/AgentOverlay.tsx
  - Current Agent Lee UI surface
  - Classification: Refactor into Agent Lee Core service integration
- ConsolePanel: src/components/ConsolePanel.tsx
  - Console for logs and command planning output
  - Classification: Refactor
- StudioShell: src/components/StudioShell.tsx
  - Generic studio shell wrapper
  - Classification: Replace with module shell abstraction
- TerminalFabricNodeContent: src/components/TerminalFabricNodeContent.tsx
  - Terminal-specific node content rendering
  - Classification: Refactor
- SettingsNodeContent: src/components/SettingsNodeContent.tsx
  - Settings rendering inside nodes
  - Classification: Refactor

### 5. Runtime and Services
- server.ts
  - Express runtime proxy and bridge to Runtime Fabric
  - Classification: Refactor
- src/services/omniTerminalFabric.ts
  - Runtime truth client for terminal status and command planning
  - Classification: Refactor
- src/services/runtimeConnectionService.ts
  - Migration shim for runtime connection probes
  - Classification: Remove after runtime API replacement
- src/services/liveAdapters.ts
  - Adapter layer for live runtime integrations
  - Classification: Refactor

### 6. State and Persistence
- src/hooks/useNodePersistence.ts
  - Local persistence for canvas layouts and nodes
  - Classification: Refactor
- src/hooks/useKeyboardShortcuts.ts
  - Keyboard shortcuts for canvas interactions
  - Classification: Keep or Refactor

### 7. Data and Node Catalogs
- src/data/nodeLibrary.ts
  - Node definitions and palette metadata
  - Classification: Refactor
- src/data/foundryNodeCatalog.ts
  - Foundry-style node definitions
  - Classification: Refactor
- src/data/layoutTemplates.ts
  - Layout templates for default studio arrangements
  - Classification: Refactor
- src/types/nodeTypes.ts
  - Shared node and canvas types
  - Classification: Refactor

## Placeholder and Mock Implementations
These are the areas that should be treated as transitional or obsolete:
- AutomationCanvas: src/components/AutomationCanvas.tsx
  - Current state: UI-only workflow surface
  - Recommendation: Replace with a real workflow engine integration for the LeeWay Workflow Engine
- Multiple workspace components under src/components that appear to be presentation surfaces rather than full production features
- The current runtime bridge relies on assumptions about services already being present; this should be replaced by a unified Runtime Fabric API contract

## Node Model Simplification
The current node stack is overly layered and should be simplified to:
- Node Definition
- Node Renderer
- Capability
- Runtime Action

This keeps rendering separate from behavior and reduces overlap between NodeRenderer, NodeComponent, StudioNode, NodePalette, NodeGroup, and the node catalogs.

## Agent Lee Operating Model
Agent Overlay should be elevated into a first-class service:
- Agent Lee Core
  - Conversation
  - Planner
  - Task Manager
  - Memory
  - Reasoner
  - Dispatcher
  - Voice
  - Vision
  - Embodiment

Every module should invoke Agent Lee through the shared runtime contract rather than embedding its own chat or planning logic.

## API Endpoints and Runtime Bridges
The current backend exposes:
- /api/leeway/runtime-fabric/config
- /api/leeway/runtime-fabric/health
- /api/leeway/runtime-fabric/agent-chat
- /api/leeway/local-voice/agent-lee-capture
- /api/leeway/device/local/status
- /api/leeway/device/wsl/status
- /api/leeway/device/wsl/start
- /api/leeway/local-status
- /api/leeway/runtime-fabric/* proxy routes

Classification:
- Keep the concept of runtime-backed endpoints
- Refactor the implementation into a clearer API surface for the future Next.js app and the Runtime Fabric

## Proposed Buckets

### Keep
Items that are production-ready or conceptually valid and should remain:
- Main shell orchestration concept
- Node canvas idea
- Runtime bridge concept
- Runtime Fabric integration concept
- Local persistence concept
- Core node/type model concept

### Refactor
Items that are valuable but need redesign:
- App shell and root layout
- Canvas architecture
- Node renderer system
- Sidebar and module navigation
- Agent overlay and console integration
- Runtime truth service abstraction
- Server-side bridge layer

### Replace
Items that should remain functionally important but use a new implementation:
- AutomationCanvas -> LeeWay Workflow Engine
- Placeholder studio surfaces -> module-based experiences backed by the LeeWay Code Engine and Runtime Fabric
- Local UI-only workflow logic -> orchestrated execution engine

### Remove
Items that are obsolete, duplicate, or placeholder-only:
- Backup component files under src/components
- Legacy compatibility shims introduced during recovery
- UI-only automation implementation
- Any duplicate studio surfaces that don’t have a clear production role

## Migration Recommendations
1. Replace the Vite-based frontend with a Next.js-based shell and module-driven experience surface.
2. Keep the canvas and node model concepts, but redesign them as a proper capability framework rather than a single-page demo surface.
3. Replace AutomationCanvas with engine-backed workflow execution through the LeeWay Workflow Engine.
4. Replace placeholder studio surfaces with module-based experiences backed by the LeeWay Code Engine and Runtime Fabric.
5. Treat compatibility modules as migration shims and remove them after the new integration layer is in place.
6. Build the new architecture around a clear runtime contract rather than per-feature assumptions.
