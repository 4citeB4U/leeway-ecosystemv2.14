# Agent Lee Doctor Report

- Generated: 2026-05-06T21:07:25.7632242-05:00
- Extension: `C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension`
- VSIX: `C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\agent-lee-leeway-coding-system-1.1.2.vsix`
- Failed checks: 2
- LeeWay compliance: 78.54%
- LeeWay blocking file count: 43

## Checks
- [PASS] Extension folder exists C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension
- [PASS] package.json exists C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\package.json
- [PASS] main points to out/extension.js ./out/extension.js
- [PASS] Activity Bar icon exists media/agent-lee-activitybar.svg
- [PASS] Command registered: agentLee.open 
- [PASS] Activation event declared: onCommand:agentLee.open 
- [PASS] Command registered: agentLee.openSidebar 
- [PASS] Activation event declared: onCommand:agentLee.openSidebar 
- [PASS] Command registered: agentLee.scanWorkspace 
- [PASS] Activation event declared: onCommand:agentLee.scanWorkspace 
- [PASS] Command registered: agentLee.fixWorkspace 
- [PASS] Activation event declared: onCommand:agentLee.fixWorkspace 
- [PASS] Command registered: agentLee.verifyWorkspace 
- [PASS] Activation event declared: onCommand:agentLee.verifyWorkspace 
- [PASS] Command registered: agentLee.askLocalModel 
- [PASS] Activation event declared: onCommand:agentLee.askLocalModel 
- [PASS] extension.ts exists C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\src\extension.ts
- [PASS] extension.ts registers agentLee.scanWorkspace C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\src\extension.ts
- [PASS] extension.ts registers agentLee.fixWorkspace C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\src\extension.ts
- [PASS] extension.ts registers agentLee.verifyWorkspace C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\src\extension.ts
- [PASS] extension.ts registers agentLee.askLocalModel C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\src\extension.ts
- [PASS] Dependencies installed node_modules already exists
- [PASS] TypeScript compile succeeds 
- [PASS] out/extension.js exists C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\out\extension.js
- [PASS] VSIX package builds C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\agent-lee-leeway-coding-system-1.1.2.vsix
- [PASS] VSIX file exists C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\agent-lee-leeway-coding-system-1.1.2.vsix
- [PASS] Ollama API reachable 13 model(s) reported
- [PASS] Required Ollama model present: qwen2.5-coder:1.5b 
- [PASS] Required Ollama model present: qwen2.5-coder:7b 
- [PASS] Required Ollama model present: qwen2.5-coder:14b 
- [PASS] Required Ollama model present: deepseek-coder-v2:16b 
- [PASS] Required Ollama model present: llama3.1:8b 
- [FAIL] Required Ollama model present: nomic-embed-text 
- [PASS] MCP registry exists C:\Users\Leona\.leeway-vscode\agent-lee\mcp\mcp-registry.json
- [PASS] MCP registry tool present: leeway.scan C:\Users\Leona\.leeway-vscode\agent-lee\mcp\mcp-registry.json
- [PASS] MCP registry tool present: leeway.fix C:\Users\Leona\.leeway-vscode\agent-lee\mcp\mcp-registry.json
- [PASS] MCP registry tool present: leeway.verify C:\Users\Leona\.leeway-vscode\agent-lee\mcp\mcp-registry.json
- [PASS] MCP registry tool present: leeway.model.route C:\Users\Leona\.leeway-vscode\agent-lee\mcp\mcp-registry.json
- [PASS] LeeWay aggregate compliance reported Score: 78.54
- [FAIL] LeeWay blocking file count is zero Blocking files: 43

## Compliance

Inspected 205 files; 161 are fully marked with header, region, tag, and discovery pipeline.
Aggregate compliance percentage: 78.54%
Blocking files: 43

## Blocking Compliance Files
- .agent-lee\plans\2026-05-06T13-06-13-640Z-yes.md: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\AGENTS.md: missing REGION, TAG
- .\agent-lee\mcp\generated-capability-catalog.json: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\VOICE_LOCK.md: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-arctic-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-bryce-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-hfc_male-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-joe-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-john-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-kusal-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-l2arctic-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-libritts_r-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-norman-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-reza_ibrahim-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-ryan-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\voice\models\en_US-sam-medium.onnx.json: missing LEEWAY_HEADER, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\.vscode\launch.json: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\.vscode\tasks.json: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\package-lock.json: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\scripts\Test-AgentLeePerformanceOverrides.ps1: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\ast.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\browser-engine.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\capability-registry.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\conversation-store.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\drift-filter.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\drift-watch.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\editor-bridge.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\file-intelligence.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\governance-loader.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\law-engine.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\memory.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\model-hive.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\orchestrator.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\persona.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\plan-store.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\remote-context.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\reporting.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\runtime-settings.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\scheduler.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\settings-catalog.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\task-planner.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\src\core\voice-adapter.ts: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE
- .\agent-lee\vscode-extension\tsconfig.json: missing LEEWAY_HEADER, REGION, TAG, DISCOVERY_PIPELINE

## Blocking Items
- Required Ollama model present: nomic-embed-text: 
- LeeWay blocking file count is zero: Blocking files: 43
