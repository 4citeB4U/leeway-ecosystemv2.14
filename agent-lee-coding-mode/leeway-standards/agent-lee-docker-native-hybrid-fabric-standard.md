# Agent Lee Docker-Native Hybrid Fabric Standard V18

Updated: 2026-06-28T01:03:23.6570372Z

## Purpose

V18 moves the Hybrid Fabric supervisor from a Windows PowerShell process into Docker.

## Container

- Service: hybrid-fabric
- Container: leeway_hybrid_fabric
- Port: 8777
- Health: http://127.0.0.1:8777/health
- State: http://127.0.0.1:8777/state

## Watches

- agent_lee_code_mode / agent-lee / 8080
- leeway_runtime_fabric / runtime-fabric / 4001 and 8111
- leeway_ollama / ollama / 11434
- agent-lee-voice-kernel / 8092
- agent-lee-vision-kernel / 8093
- agent-lee-creation-kernel / 8094
- leeway-seafile / 8082
- leeway-seafile-db
- leeway-seafile-cache

## Qwen

- Preferred advisor model: qwen2.5-coder:7b
- Qwen is advisory only.
- Qwen does not execute Docker actions.
- Qwen does not mutate code or model weights.

## Docker Socket Rule

The worker mounts Docker socket for read-only inventory by policy.
The worker code only calls GET endpoints against Docker API.
It must not call Docker mutate endpoints.

## Guardrails

- No Docker restart from worker loop.
- No Docker stop from worker loop.
- No Docker remove from worker loop.
- No Docker prune from worker loop.
- No model retraining.
- No unknown MCP autostart.
- No fake READY.