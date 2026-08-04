# MIG-005A: OpenCode Engineering Toolchain

## Status
Implemented

## ADR
- ADR-0002: Target Architecture
- ADR-0005: OpenCode Integration

## Objective
Establish project-level engineering controls for LeeWay IDE 2.0 by configuring OpenCode with:
- Project commands for migration lifecycle
- Project agents for specialized roles
- Custom TypeScript tools for validation
- MCP servers for GitHub, Context7, Playwright, Docker

## Scope
- OpenCode commands (10)
- OpenCode agents (9)
- OpenCode custom tools (10)
- MCP servers: GitHub (read-only, lockdown), Context7, Playwright, Docker MCP Gateway
- Skills manifest synchronization
- OpenCode configuration validation

## Deliverables
- .opencode/commands/ (10 command files)
- .opencode/agents/ (9 agent files)
- .opencode/tools/ (10 TypeScript tool files)
- OpenCode config with 4 MCP servers
- Skills manifest updated
- Migration specification

## Validation
- All command files present and valid
- All agent files present and valid
- All tool files present and syntactically valid
- OpenCode config parses and has required MCP servers
- Skills manifest syncs with installed skills
- TypeScript build passes
- Protected files unchanged

## Rollback
Restore previous OpenCode config, remove .opencode directories, revert skills manifest