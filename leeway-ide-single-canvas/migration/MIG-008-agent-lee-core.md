# MIG-008: Agent Lee Core

## Status
Planned

## ADR
- ADR-0002: Target Architecture

## Objective
Elevate Agent Lee from an overlay surface into a first-class operating service.

## Scope
- formalize Agent Lee core services
- route module requests through Agent Lee Core
- preserve voice, vision, planner, memory, and dispatcher responsibilities

## Deliverables
- Agent Lee Core service boundary
- module integration points
- validation evidence

## Validation
- modules invoke Agent Lee through the shared runtime contract
- chat and planning logic are no longer embedded in UI components

## Rollback
Restore the previous overlay-centric integration if the service transition is not stable.
