# Agent Lee Hybrid Fabric Live Standard V17.4

Updated: 2026-06-28T00:56:40.4784301Z

## Actual Live Containers
- Agent Lee: agent_lee_code_mode, alias agent-lee, port 8080
- Runtime Fabric: leeway_runtime_fabric, alias runtime-fabric, ports 4001 and 8111
- Ollama: leeway_ollama, alias ollama, port 11434

## Qwen
- Preferred advisory model: qwen2.5-coder:7b
- Available Qwen family includes qwen2.5vl:7b, qwen2.5-coder:7b, qwen2.5-coder:latest, qwen3:latest
- Qwen is advisory only, not controller.

## Live Worker
- Start-AgentLeeHybridAutonomicFabricV17.ps1 is now the live worker loop.
- It writes Discovery state, Runtime Fabric mirror, Desktop mirror, proof snapshots, and learning events.

## Guardrails
- No Docker build.
- No Docker restart.
- No Docker stop.
- No unknown MCP autostart.
- No model retraining.
- No fake READY.
