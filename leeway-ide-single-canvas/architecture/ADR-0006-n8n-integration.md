# ADR-0006: n8n Integration

## Status
Proposed

## Context
The current automation experience is implemented as a UI-only surface and does not yet reflect a durable workflow execution model.

## Decision
n8n will be integrated as the LeeWay Workflow Engine with clear ownership boundaries:
- workflow ownership
- loop ownership
- trigger ownership
- scheduler ownership
- automation execution
- integration execution

## Ownership Model
- The Workflow Engine owns execution behavior.
- The UI owns workflow presentation and interaction.
- The Runtime Fabric owns orchestration and contract boundaries.

## Integration Rules
- The UI will not directly own workflow execution logic.
- AutomationCanvas will be replaced by engine-backed workflow views.
- Workflow tasks are executed through the capability contract.

## Consequences
This aligns workflow automation with the runtime-first architecture and removes the current placeholder automation layer.
