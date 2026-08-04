# MIG-003: Module Framework

## Status
Planned

## ADR
- ADR-0002: Target Architecture
- ADR-0003: Capability Architecture

## Objective
Replace the current studio-centric structure with a module-oriented framework.

## Scope
- define module registry
- convert studio terminology to module terminology
- update route and layout concepts
- preserve module-level views as first-class surfaces

## Deliverables
- module registry
- updated navigation structure
- module-oriented route definitions

## Validation
- modules are discoverable through the framework
- legacy studio terminology is no longer the primary abstraction

## Rollback
Restore prior route and navigation structure if the framework migration fails.
