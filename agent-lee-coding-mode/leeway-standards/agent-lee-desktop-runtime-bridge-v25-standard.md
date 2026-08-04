# Agent Lee Desktop Runtime Bridge V25 Standard

Created: 2026-06-28T05:03:42.5060539Z

## Purpose

V25 provides a stable, local, approval-gated desktop bridge for Agent Lee.

## Safety Rules

- No antivirus bypass.
- No AMSI bypass.
- No arbitrary command execution.
- No uncontrolled automation.
- No printing without approval.
- No mouse or keyboard automation in this stage.
- Physical actions are approval-gated.

## Bridge Endpoint

http://127.0.0.1:8792

## Endpoints

GET /health
GET /state
GET /devices
GET /docker
GET /camera
POST /speak
POST /approval/request
POST /action

## Approved Actions

- speak-status
- open-camera-preview
- open-notepad
- open-agent-lee
- open-runtime-fabric
- open-media-router
- open-media-ingestion

## Truth Boundary

V25 proves a stable desktop bridge and safe action gate. It does not yet prove full autonomous desktop operation.