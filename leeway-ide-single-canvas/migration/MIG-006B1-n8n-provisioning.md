# MIG-006B1: n8n Local Runtime Provisioning

## Status
Implemented

## ADR
- ADR-0002: Target Architecture
- ADR-0006: n8n Integration

## Objective
Provision a locally controlled, isolated n8n runtime for LeeWay development and testing.

## Scope
- local n8n runtime via Docker
- persistent storage
- documented host and container ports
- documented startup command
- documented shutdown command
- documented health-check command
- secure credential storage
- no secrets committed to Git
- one harmless LeeWay test workflow
- one allowlisted workflow identifier
- rollback instructions
- evidence and receipt

## Exclusions
- no live workflow execution through LeeWay yet
- no UI integration
- no server.ts replacement
- no Vite removal
- no Next.js migration
- no OpenCode integration
- no Agent Lee Core changes

## Deliverables
- docker-compose.n8n.yml
- .env.n8n
- leeway-test-workflow.json (harmless test workflow)
- n8n-allowlist.json (allowlist with one test workflow)
- n8n runtime running on localhost:5678
- health endpoint responding on /healthz
- test workflow installed in n8n workflows directory
- allowlist configuration with test workflow
- rollback instructions
- evidence and receipt

## Validation
- n8n container starts and reports healthy
- health endpoint responds on localhost:5678/healthz
- test workflow exists in n8n workflows directory
- allowlist contains test workflow
- n8n basic auth functional
- encryption key set
- webhook URL configured
- no secrets in Git
- evidence and receipt generated
- rollback instructions documented

## Rollback
1. Stop n8n container: docker compose -f docker-compose.n8n.yml down
2. Remove n8n data directory: Remove-Item -Recurse -Force <n8n-data-path>
3. Restore any modified files from rollback directory