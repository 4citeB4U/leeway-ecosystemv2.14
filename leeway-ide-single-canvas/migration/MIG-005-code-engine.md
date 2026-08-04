# MIG-005: Code Engine

## Status
Planned

## ADR
- ADR-0002: Target Architecture
- ADR-0005: OpenCode Integration

## Objective
Integrate the code execution experience behind the LeeWay Code Engine and remove duplicate editor logic from the UI.

## Scope
- expose code capabilities through the runtime contract
- route planning and editing tasks through the Code Engine
- remove duplicated editor-only execution logic from the shell

## Deliverables
- Code Engine integration layer
- capability exposure for code operations
- validation evidence

## Validation
- code-related actions are executed through the engine contract
- the UI no longer owns the execution path directly

## Rollback
Restore the previous code-facing shell behavior if the engine integration fails.
