# ADR-0003: Capability Architecture

## Status
Proposed

## Context
The current application mixes UI concepts, runtime behavior, and engine-specific implementation details. This makes it difficult to reason about capabilities, registration, discovery, and execution.

## Decision
LeeWay IDE 2.0 will model all product functionality as capabilities that are registered, discovered, and executed through the Runtime Fabric contract.

## Definitions
- Capability: a named feature or action that can be invoked by a module.
- Skill: a reusable implementation unit that contributes to a capability.
- Loop: a coordinated execution pattern that spans tasks, triggers, and queues.
- Module: a product domain boundary such as Code, Workflow, Runtime, Agent, Memory, or Device.

## Architectural Rules
1. Modules do not directly invoke engines.
2. Capabilities are registered in the Runtime Fabric.
3. Discovery is runtime-based, not hard-coded in UI components.
4. Execution flows through the orchestrator and engine adapters.
5. Each capability produces evidence and receipts.

## Lifecycle
1. Registration
2. Discovery
3. Invocation
4. Execution
5. Result and receipt publication

## Consequences
This architecture makes the product extensible, testable, and aligned with the target runtime contract.
