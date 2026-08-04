# Agent Lee Hybrid Container Topology Standard V17.2

Updated: 2026-06-28T00:50:47.8928302Z

## Corrected Actual Container Names
- Agent Lee app actual container: agent_lee_code_mode
- Runtime Fabric actual container: leeway_runtime_fabric
- Ollama actual container: ollama

## Compose Service / Network Aliases
- Agent Lee service alias: agent-lee
- Runtime Fabric service alias: runtime-fabric
- Ollama service alias: ollama

## Endpoints
- Agent Lee: http://127.0.0.1:8080
- Agent Lee health: http://127.0.0.1:8080/health
- Runtime Fabric: http://127.0.0.1:4001
- Runtime Fabric health: http://127.0.0.1:4001/health
- Runtime Fabric aux: http://127.0.0.1:8111
- Ollama: http://127.0.0.1:11434
- Ollama tags: http://127.0.0.1:11434/api/tags

## Qwen
- Qwen runs through Ollama.
- Qwen is advisory only.
- Observed active target model: qwen2.5-coder:7b.

## Rule
Do not use expected compose-style names when actual Docker names differ. Discovery must record actual container names, service aliases, endpoints, and proof state.

## Guardrails
- No fake READY.
- No Docker build.
- No Docker restart.
- No Docker stop.
- No unknown MCP autostart.
- Discovery remains source of truth.
- Runtime Fabric mirrors Discovery.
