# Agent Lee Desktop Runtime Bridge V25.2 Standard

Created: 2026-06-28T05:10:28.3349397Z

## Purpose

V25.2 repairs the desktop bridge voice lane so tests do not use Windows System.Speech.

## Voice Rule

All bridge speech tests must route through the Leeway Docker Voice Kernel.

Required voice mode:

LEEWAY_DOCKER_CLONE_VOICE_ONLY

Windows fallback voices are disabled.

If the Docker clone voice endpoint is not available, speech returns CHECK_REQUIRED instead of speaking with the wrong voice.

## Docker Governance

The Windows host bridge exists only because Windows desktop actions must run from the Windows host.

The bridge proves Docker governance by:

- checking Leeway Docker containers
- checking Leeway runtime endpoints
- writing Discovery Layer state
- writing Runtime Fabric state
- routing voice to Docker Voice Kernel
- disabling local Windows TTS fallback

## Endpoint

http://127.0.0.1:8792

## Endpoints

GET /health
GET /state
GET /refresh
GET /docker
GET /devices
GET /voice
POST /speak
POST /action

## Safety

- No arbitrary command execution.
- No System.Speech fallback.
- No mouse or keyboard automation.
- No printing.
- No antivirus or AMSI bypass.
- Localhost only.