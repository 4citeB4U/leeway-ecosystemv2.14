# MIG-009: Capability System

## Status
Planned

## ADR
- ADR-0003: Capability Architecture

## Objective
Implement the capability registry and discovery model so modules can invoke capabilities through the runtime contract.

## Scope
- define capability metadata
- define skill registration
- define loop and task execution semantics
- expose discovery endpoints

## Deliverables
- capability registry
- discovery model
- validation evidence

## Validation
- capabilities are discoverable and executable through the runtime contract
- skill and loop components are separated from UI concerns

## Rollback
Restore the previous capability assumptions if the registry model is not stable.
