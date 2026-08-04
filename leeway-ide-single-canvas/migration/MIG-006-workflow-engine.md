# MIG-006: Workflow Engine

## Status
Planned

## ADR
- ADR-0002: Target Architecture
- ADR-0006: n8n Integration

## Objective
Replace the current UI-only automation surface with an engine-backed workflow experience.

## Scope
- introduce workflow capabilities through the runtime contract
- remove or replace automation-only UI behavior
- expose workflow execution through the LeeWay Workflow Engine

## Deliverables
- workflow integration layer
- automation replacement evidence
- validation reports

## Validation
- workflow actions are engine-backed
- AutomationCanvas no longer serves as the primary execution model

## Rollback
Restore the previous automation surface if workflow engine integration is unstable.
