# Agent Lee Hybrid Container Integration Standard V17.1

Updated: 2026-06-28T00:43:15.9569958Z

## Required Container Topology
- Ecosystem: leeway-ecosystemv214
- Root: E:\.LeeWay-Produucts-File\Leeway-Ecosystem v2.1.4
- Agent Lee app container: leeway-ecosystemv214-agent-lee on 8080:8080
- Runtime Fabric container: leeway-ecosystemv214-runtime-fabric on 4001:4001
- Ollama container: ollama using ollama/ollama:latest on 11434:11434

## Hybrid Fabric Rule
Agent Lee Hybrid Autonomic Fabric must be connected to the Leeway container topology. It may run as a Windows-side safe worker, but its state, advisor, and runtime checks must flow through the container endpoints.

## Endpoint Rules
- Agent Lee app endpoint: http://127.0.0.1:8080
- Runtime Fabric endpoint: http://127.0.0.1:4001
- Runtime Fabric health: http://127.0.0.1:4001/health
- Ollama tags endpoint: http://127.0.0.1:11434/api/tags

## Qwen Rule
Qwen3 Coder 7B must be served through the Ollama runtime or another declared local LLM endpoint. If Qwen is not present in Ollama tags, the advisor status must remain CHECK_REQUIRED, not READY.

## Guardrails
- No fake READY.
- No Docker build from integration check.
- No Docker restart from integration check.
- No Docker stop from integration check.
- No unknown MCP autostart.
- Runtime Fabric mirrors Discovery.
- Discovery remains source of truth.
