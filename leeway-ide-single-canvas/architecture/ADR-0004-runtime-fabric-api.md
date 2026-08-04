# ADR-0004: Runtime Fabric API

## Status
Proposed

## Context
The current runtime bridge is service-specific and embedded in the Express server. This creates a weak boundary between UI behavior and runtime execution.

## Decision
The LeeWay Runtime Fabric will expose a canonical API layer that all modules use for capability execution, event delivery, state access, and orchestration.

## API Surface
- REST endpoints for capability execution and state access
- WebSocket channels for streaming events and task updates
- Event contracts for lifecycle notifications
- Authentication and authorization policies
- Versioning and compatibility rules
- Error contract and receipt schema

## Governance Rules
- Modules consume the Runtime Fabric API only.
- Engines are hidden behind adapters.
- All non-trivial actions produce receipts.
- All API contracts are versioned.

## Consequences
This creates a stable integration boundary for the Next.js shell, Agent Lee, and the execution engines.
