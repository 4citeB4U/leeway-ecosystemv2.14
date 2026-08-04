# MIG-002: Next.js Shell

## Status
Planned

## ADR
- ADR-0002: Target Architecture

## Objective
Introduce the Next.js-based application shell while preserving the existing React components and app functionality where feasible.

## Scope
- create Next.js shell structure
- preserve and adapt shared UI components
- ensure the shell can host modules
- verify build and startup

## Deliverables
- shell scaffold
- module host layout
- build verification evidence

## Validation
- shell builds successfully
- existing React components remain usable within the new shell

## Rollback
Revert shell scaffold and restore the previous Vite-based entrypoint if necessary.
