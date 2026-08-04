# Agent Lee Docker Hybrid Fabric No-Bind Standard V18.2

Updated: 2026-06-28T01:09:35.4428116Z

## Repair Reason

V18 and V18.1 failed because Docker Desktop could not create host bind mount source paths.

## Repair

V18.2 removes host folder bind mounts entirely.

## Runtime

- Container: leeway_hybrid_fabric
- Port: 8777
- Health: http://127.0.0.1:8777/health
- State: http://127.0.0.1:8777/state
- Internal state volume: leeway_hybrid_fabric_state

## Host File Mirror

A hidden scheduled task mirrors the Docker state endpoint into Leeway host files.

## Guardrails

- The supervisor runs inside Docker.
- The host sync script is not the supervisor.
- No existing ecosystem container is restarted.
- Qwen is advisory only.
- No unknown MCP autostart.