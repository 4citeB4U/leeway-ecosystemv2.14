# Agent Lee Docker-Native Hybrid Fabric Repair Standard V18.1

Updated: 2026-06-28T01:06:25.6725793Z

## Repair Reason

V18 image built successfully, but Docker failed creating the direct E: drive bind mount.

## Repair Method

V18.1 uses a Windows junction mount proxy:

- Source: C:\Users\Leona\LeewayDockerMounts\Leeway-Ecosystem-v214
- Target: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4
- Container mount: /leeway

## Container

- Container: leeway_hybrid_fabric
- Port: 8777
- Health: http://127.0.0.1:8777/health
- State: http://127.0.0.1:8777/state

## Guardrails

- Rebuilds only leeway_hybrid_fabric.
- Does not restart existing ecosystem containers.
- Does not stop Agent Lee, Runtime Fabric, Ollama, Seafile, Voice, Vision, or Creation Kernel.
- Worker loop uses Docker socket read-only inventory only.
- Qwen remains advisory only.