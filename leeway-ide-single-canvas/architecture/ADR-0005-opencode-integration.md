# ADR-0005: OpenCode Integration

## Status
Proposed

## Context
The current code-related functionality is embedded in the UI and not clearly separated from the runtime platform.

## Decision
OpenCode will be integrated as the LeeWay Code Engine, with the following ownership boundaries:
- planning
- editing
- patching
- refactoring
- terminal execution
- Git integration
- model execution

## Ownership Model
- LeeWay Code Engine owns execution behavior.
- The UI owns presentation and user interaction.
- The Runtime Fabric owns orchestration and contract boundaries.

## Integration Rules
- The UI will not directly own code execution logic.
- The engine will expose a stable API to the Runtime Fabric.
- Any UI integration must go through the capability contract.

## Consequences
This reduces duplication and keeps the product aligned with the new module-based architecture.
