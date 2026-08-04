# Cerebral OpenClaw Extraction Report And Plan

**Date:** 2026-03-08  
**Authoring context:** Read-only extraction analysis from `C:\Tools\copilot-claw-main` and `C:\Tools\files2extract`  
**Goal:** Strengthen Cerebral architecture and workflow without replacing the live Cerebral backbone, changing the package strategy, or changing the LLM stack.

**Companion execution checklist:** `C:\Cerebral\MD-File-Directory\CEREBRAL_OPENCLAW_IMPLEMENTATION_CHECKLIST.md`

---

## 1. Executive Summary

The donor code is useful, but only in a selective way.

What is actually valuable for Cerebral:

- runtime contracts
- result/error handling patterns
- event bus and registry patterns
- tool registry and tool result abstractions
- approval and command safety abstractions
- tracing structure and redaction patterns
- memory search architecture
- MCP registration/orchestration structure
- agent-to-agent communication patterns
- sub-agent lifecycle patterns

What must not be replaced in Cerebral:

- `CerebralDaemon.py`
- `task_spine.py`
- `tool_router.py`
- `model_router.py`
- `policy_engine.py`
- `desktop_hands.py`
- existing TTS, PTT, proof, and approval flow

Critical conclusion:

The donor runtime is **TypeScript/Node-first**, not Python-first. That means the safe path is:

1. extract the architecture and reusable contracts
2. stage donor files into a dedicated runtime area
3. build Cerebral-specific wrappers around them
4. integrate only through the existing daemon and task spine

This is not a blind transplant. It is a controlled architectural import.

---

## 2. Verified Donor Sources

Two donor sources were inspected:

### A. `C:\Tools\copilot-claw-main`

This is the upstream runtime source. It contains the original TypeScript implementation, including:

- `src/agent/*`
- `src/core/*`
- `src/tools/*`
- `src/mcp/*`
- `src/tracing/*`
- `src/cli/*`
- `src/web/*`
- `src/scheduler/*`

It also includes a package manifest showing direct runtime coupling to:

- `@modelcontextprotocol/sdk`
- `@opentelemetry/*`
- `@duckdb/node-api`
- `@xenova/transformers`
- `zod`
- `ajv`
- `tsyringe`
- `@github/copilot-sdk`

That package profile confirms this donor is a **design source**, not something Cerebral should execute directly inside the current Python backbone.

### B. `C:\Tools\files2extract`

This is the practical extraction source. It already contains a curated subset organized by domain:

- `application/`
- `communication/`
- `composition/`
- `core/`
- `mcp/`
- `memory/`
- `sub-agents/`
- `tools/`
- `tracing/`

This directory should be treated as the **main donor staging source** because it is already reduced to the parts that matter.

---

## 3. Cerebral Guardrails

This plan is built under these explicit rules:

- Do not replace the live Python control path.
- Do not switch Cerebral to a Node-based control plane.
- Do not change Cerebral packages to match donor dependencies.
- Do not replace Foundry, current model routing, or the current LLM stack.
- Do not bypass `policy_engine.py`.
- Do not bypass `task_spine.py`.
- Do not let imported code write directly to desktop, shell, MCP, or memory without going through Cerebral adapters.

---

## 4. Recommended Landing Zone

The safest landing root inside Cerebral is:

```text
C:\Cerebral\runtime\openclaw_runtime\
```

Or the split layout:

```text
C:\Cerebral\runtime\
  core\
  agent\
  tools\
  mcp\
  memory\
  tracing\
  communication\
  subagents\
  policies\
  composition\
```

Recommended approach:

- use `files2extract` as the staging donor source
- preserve original donor filenames for traceability
- add Cerebral-prefixed wrapper files beside them
- keep execution-facing integration in Python

---

## 5. Compatibility Reality Check

These donor modules are reusable as patterns, but not executable inside Cerebral without adaptation.

### Direct runtime mismatches

| Donor capability                | Why it cannot be dropped in directly                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `OpenTelemetryTracer.ts`        | depends on Node OpenTelemetry packages not present in Cerebral runtime                    |
| `MemorySearch.ts`               | depends on DuckDB and embedding providers                                                 |
| `MCPServerConnection.ts`        | depends on MCP TypeScript SDK client                                                      |
| `AgentSessionManager.ts`        | depends on Copilot client abstractions and TypeScript session model                       |
| `WorkspaceInstructionLoader.ts` | expects OpenClaw-style workspace files like `SOUL.md`, `AGENTS.md`, `USER.md`, `TOOLS.md` |
| `ConfigLoader.ts`               | expects OpenClaw config schema and path conventions                                       |
| `ExecTool.ts`                   | would create a competing command path if not bridged to Cerebral policy                   |

### What this means

If a donor file is marked `COPY`, that means:

- copy into the runtime staging area for structure and contract reuse
- keep it dormant unless or until a Cerebral wrapper is built

If a donor file is marked `ADAPT`, that means:

- use the donor implementation as a blueprint
- rewrite the live integration layer around Cerebral’s Python services

---

## 6. Exact Extraction Map

## Pass 1: Core + Tools + Tracing

This is the best first batch because it improves structure without threatening the live daemon path.

| Donor source                                                             | Target in Cerebral                                            |         Action | Required edits after copy                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- | -------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C:\Tools\files2extract\core\types\Result.ts`                            | `C:\Cerebral\runtime\core\Result.ts`                          |           COPY | None for reference use. If activated, adapt import suffix handling and add Python bridge notes.                                                         |
| `C:\Tools\files2extract\core\types\Option.ts`                            | `C:\Cerebral\runtime\core\Option.ts`                          |           COPY | None for dormant use.                                                                                                                                   |
| `C:\Tools\files2extract\core\interfaces\ILogger.ts`                      | `C:\Cerebral\runtime\core\interfaces\ILogger.ts`              |           COPY | Map eventual implementation to Cerebral logging style and log files.                                                                                    |
| `C:\Tools\files2extract\core\interfaces\ITracer.ts`                      | `C:\Cerebral\runtime\core\interfaces\ITracer.ts`              |           COPY | Tie future implementation to Cerebral session and telemetry trace IDs.                                                                                  |
| `C:\Tools\files2extract\core\interfaces\IEventBus.ts`                    | `C:\Cerebral\runtime\core\interfaces\IEventBus.ts`            |           COPY | Align event names with Task Spine events.                                                                                                               |
| `C:\Tools\files2extract\core\interfaces\IPlatform.ts`                    | `C:\Cerebral\runtime\core\interfaces\IPlatform.ts`            |           COPY | Restrict scope to Windows.                                                                                                                              |
| `C:\Tools\files2extract\core\interfaces\IPlatformPaths.ts`               | `C:\Cerebral\runtime\core\interfaces\IPlatformPaths.ts`       |           COPY | Replace `.claw` path assumptions with Cerebral path conventions.                                                                                        |
| `C:\Tools\files2extract\core\interfaces\IProcessManager.ts`              | `C:\Cerebral\runtime\core\interfaces\IProcessManager.ts`      |           COPY | Map future execution to Cerebral policy + subprocess strategy.                                                                                          |
| `C:\Tools\files2extract\core\infrastructure\ConsoleLogger.ts`            | `C:\Cerebral\runtime\core\infrastructure\ConsoleLogger.ts`    |           COPY | Align level names and output format with Cerebral logs.                                                                                                 |
| `C:\Tools\files2extract\core\infrastructure\InMemoryEventBus.ts`         | `C:\Cerebral\runtime\core\infrastructure\InMemoryEventBus.ts` |           COPY | Rename event names to Cerebral runtime namespace.                                                                                                       |
| `C:\Tools\files2extract\core\infrastructure\Platform.ts`                 | `C:\Cerebral\runtime\core\infrastructure\Platform.ts`         |           COPY | Strip non-Windows assumptions if activated.                                                                                                             |
| `C:\Tools\files2extract\core\infrastructure\PlatformPaths.ts`            | `C:\Cerebral\runtime\core\infrastructure\PlatformPaths.ts`    |           COPY | Replace `.claw` directories with `C:\Cerebral\runtime\...`.                                                                                             |
| `C:\Tools\files2extract\core\infrastructure\ProcessManager.ts`           | `C:\Cerebral\runtime\core\infrastructure\ProcessManager.ts`   |           COPY | Route future process execution through a Cerebral approval bridge.                                                                                      |
| `C:\Tools\files2extract\core\errors\DomainError.ts`                      | `C:\Cerebral\runtime\core\errors\DomainError.ts`              |           COPY | None for staging.                                                                                                                                       |
| `C:\Tools\files2extract\core\errors\ValidationError.ts`                  | `C:\Cerebral\runtime\core\errors\ValidationError.ts`          |           COPY | Map to tool parameter validation failures.                                                                                                              |
| `C:\Tools\files2extract\core\errors\TimeoutError.ts`                     | `C:\Cerebral\runtime\core\errors\TimeoutError.ts`             |           COPY | Tie to Task Spine step timeout behavior.                                                                                                                |
| `C:\Tools\files2extract\core\errors\NotFoundError.ts`                    | `C:\Cerebral\runtime\core\errors\NotFoundError.ts`            |           COPY | Use for registry and agent lookup failures.                                                                                                             |
| `C:\Tools\files2extract\core\errors\ToolExecutionError.ts`               | `C:\Cerebral\runtime\core\errors\ToolExecutionError.ts`       |           COPY | Map to `tool_router.py` execution failures.                                                                                                             |
| `C:\Tools\files2extract\core\errors\SessionError.ts`                     | `C:\Cerebral\runtime\core\errors\SessionError.ts`             |           COPY | Use in session orchestration layer only.                                                                                                                |
| `C:\Tools\files2extract\core\errors\ConfigurationError.ts`               | `C:\Cerebral\runtime\core\errors\ConfigurationError.ts`       |           COPY | Map to runtime config and bridge config issues.                                                                                                         |
| `C:\Tools\files2extract\tools\domain\interfaces\ITool.ts`                | `C:\Cerebral\runtime\tools\interfaces\ITool.ts`               |           COPY | Add notes mapping to existing tool router contract.                                                                                                     |
| `C:\Tools\files2extract\tools\domain\interfaces\IToolRegistry.ts`        | `C:\Cerebral\runtime\tools\interfaces\IToolRegistry.ts`       |           COPY | Future registry must wrap, not replace, current tools.                                                                                                  |
| `C:\Tools\files2extract\tools\domain\types\JSONSchema.ts`                | `C:\Cerebral\runtime\tools\types\JSONSchema.ts`               |           COPY | Optional later use for schema generation and validation.                                                                                                |
| `C:\Tools\files2extract\tools\domain\value-objects\ToolParameter.ts`     | `C:\Cerebral\runtime\tools\value-objects\ToolParameter.ts`    |           COPY | None for staging.                                                                                                                                       |
| `C:\Tools\files2extract\tools\domain\value-objects\ToolResult.ts`        | `C:\Cerebral\runtime\tools\value-objects\ToolResult.ts`       |           COPY | Map final result shape to current API responses.                                                                                                        |
| `C:\Tools\files2extract\tools\infrastructure\InMemoryToolRegistry.ts`    | `C:\Cerebral\runtime\tools\InMemoryToolRegistry.ts`           |           COPY | Replace event names if activated.                                                                                                                       |
| `C:\Tools\files2extract\tools\application\ToolExecutor.ts`               | `C:\Cerebral\runtime\tools\CerebralToolExecutor.ts`           |          ADAPT | Replace direct registry execution with calls into `tool_router.py`, `policy_engine.py`, and Task Spine. Keep AJV validation as optional reference only. |
| `C:\Tools\files2extract\tools\builtin\CommandSafetyGuard.ts`             | `C:\Cerebral\runtime\policies\CommandSafetyGuard.ts`          |          ADAPT | Re-map allow/block/approve decisions to Cerebral policy tiers. Remove assumptions about direct shell ownership.                                         |
| `C:\Tools\files2extract\tools\builtin\IPermissionGuard.ts`               | `C:\Cerebral\runtime\policies\IPermissionGuard.ts`            |           COPY | Keep as approval abstraction contract.                                                                                                                  |
| `C:\Tools\files2extract\tools\builtin\IUserApprovalProvider.ts`          | `C:\Cerebral\runtime\policies\IUserApprovalProvider.ts`       |           COPY | Tie to Cerebral UI approval surfaces later.                                                                                                             |
| `C:\Tools\files2extract\tools\builtin\commandParsing.ts`                 | `C:\Cerebral\runtime\policies\commandParsing.ts`              |           COPY | Useful as parsing helper reference for safer shell evaluation.                                                                                          |
| `C:\Tools\files2extract\tools\builtin\LLMCommandEvaluator.ts`            | `C:\Cerebral\runtime\policies\LLMCommandEvaluator.ts`         | REFERENCE ONLY | Do not activate until you want model-based command adjudication.                                                                                        |
| `C:\Tools\files2extract\tools\builtin\ExecTool.ts`                       | `C:\Cerebral\runtime\tools\system\ExecTool.ts`                |          ADAPT | Must never execute directly. It must route through a Cerebral approval bridge and existing policy engine.                                               |
| `C:\Tools\files2extract\tracing\infrastructure\OpenTelemetryTracer.ts`   | `C:\Cerebral\runtime\tracing\OpenTelemetryTracer.ts`          |          ADAPT | Keep as design reference. Do not add donor OpenTelemetry packages to core runtime. Re-map to existing telemetry and log outputs first.                  |
| `C:\Tools\files2extract\tracing\infrastructure\FileLogger.ts`            | `C:\Cerebral\runtime\tracing\FileLogger.ts`                   |           COPY | Align with `logs/health.ndjson` and future runtime trace logs.                                                                                          |
| `C:\Tools\files2extract\tracing\infrastructure\CompositeLogger.ts`       | `C:\Cerebral\runtime\tracing\CompositeLogger.ts`              |           COPY | Combine console + file logging in future wrapper layer.                                                                                                 |
| `C:\Tools\files2extract\tracing\infrastructure\FileSpanExporter.ts`      | `C:\Cerebral\runtime\tracing\FileSpanExporter.ts`             |           COPY | Use as reference for session trace export format.                                                                                                       |
| `C:\Tools\files2extract\tracing\infrastructure\RedactingSpanExporter.ts` | `C:\Cerebral\runtime\tracing\RedactingSpanExporter.ts`        |           COPY | Apply to secrets, tokens, and personal data if traces are added.                                                                                        |
| `C:\Tools\files2extract\tracing\application\SensitiveDataRedactor.ts`    | `C:\Cerebral\runtime\tracing\SensitiveDataRedactor.ts`        |           COPY | Immediate architectural value even before activation.                                                                                                   |
| `C:\Tools\files2extract\tracing\application\SessionCleaner.ts`           | `C:\Cerebral\runtime\tracing\SessionCleaner.ts`               |          ADAPT | Re-target cleanup rules to Cerebral session and tmp directories.                                                                                        |
| `C:\Tools\files2extract\tracing\domain\SessionDirectory.ts`              | `C:\Cerebral\runtime\tracing\SessionDirectory.ts`             |           COPY | Replace `.claw` session path assumptions.                                                                                                               |
| `C:\Tools\files2extract\tracing\domain\entities\SessionMetadata.ts`      | `C:\Cerebral\runtime\tracing\SessionMetadata.ts`              |           COPY | Useful for future execution/session metadata.                                                                                                           |

## Pass 2: MCP + Memory + Communication

This batch is high-value, but must be bridged carefully.

| Donor source                                                                    | Target in Cerebral                                                 |         Action | Required edits after copy                                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------: | ------------------------------------------------------------------------------------------------------------------------------- |
| `C:\Tools\files2extract\mcp\application\MCPManager.ts`                          | `C:\Cerebral\runtime\mcp\CerebralMCPManager.ts`                    |          ADAPT | Replace OpenClaw config loading with Cerebral MCP inventory and runtime health checks.                                          |
| `C:\Tools\files2extract\mcp\application\MCPServerConnection.ts`                 | `C:\Cerebral\runtime\mcp\CerebralMCPServerConnection.ts`           |          ADAPT | Do not replace `cerebral_mcp_server.py`. Use to model connection metadata and discovery behavior only.                          |
| `C:\Tools\files2extract\mcp\application\MCPToolRegistry.ts`                     | `C:\Cerebral\runtime\mcp\CerebralMCPToolRegistry.ts`               |          ADAPT | Register existing MCP tools exposed by Cerebral, not a new parallel namespace.                                                  |
| `C:\Tools\files2extract\mcp\domain\IMCPManager.ts`                              | `C:\Cerebral\runtime\mcp\interfaces\IMCPManager.ts`                |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\mcp\domain\IMCPServerConnection.ts`                     | `C:\Cerebral\runtime\mcp\interfaces\IMCPServerConnection.ts`       |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\mcp\domain\IMCPToolRegistry.ts`                         | `C:\Cerebral\runtime\mcp\interfaces\IMCPToolRegistry.ts`           |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\mcp\domain\MCPServer.ts`                                | `C:\Cerebral\runtime\mcp\models\MCPServer.ts`                      |           COPY | Use as the normalized model for MCP server metadata.                                                                            |
| `C:\Tools\files2extract\mcp\domain\MCPTool.ts`                                  | `C:\Cerebral\runtime\mcp\models\MCPTool.ts`                        |           COPY | Use as normalized MCP tool metadata model.                                                                                      |
| `C:\Tools\files2extract\mcp\domain\errors\MCPError.ts`                          | `C:\Cerebral\runtime\mcp\errors\MCPError.ts`                       |           COPY | Useful for connection and discovery failure taxonomy.                                                                           |
| `C:\Tools\files2extract\memory\search\MemorySearch.ts`                          | `C:\Cerebral\runtime\memory\CerebralMemorySearch.ts`               |          ADAPT | Current donor implementation depends on DuckDB + embeddings. First adapt to `memory.json` and transcript search, not vector DB. |
| `C:\Tools\files2extract\memory\search\RelevanceScorer.ts`                       | `C:\Cerebral\runtime\memory\RelevanceScorer.ts`                    |           COPY | Safe scoring logic reference.                                                                                                   |
| `C:\Tools\files2extract\memory\search\SearchOptions.ts`                         | `C:\Cerebral\runtime\memory\SearchOptions.ts`                      |           COPY | Good search contract.                                                                                                           |
| `C:\Tools\files2extract\memory\tools\SearchMemoryTool.ts`                       | `C:\Cerebral\runtime\memory\tools\SearchMemoryTool.ts`             |          ADAPT | Rewire to Cerebral memory store, session logs, and current transcript sources.                                                  |
| `C:\Tools\files2extract\memory\tools\SaveMemoryTool.ts`                         | `C:\Cerebral\runtime\memory\tools\SaveMemoryTool.ts`               |          ADAPT | Bridge to `memory_engine.py` and current append patterns.                                                                       |
| `C:\Tools\files2extract\memory\conversation\ConversationBuffer.ts`              | `C:\Cerebral\runtime\memory\ConversationBuffer.ts`                 |           COPY | Good rolling buffer model.                                                                                                      |
| `C:\Tools\files2extract\memory\conversation\ConversationIndexer.ts`             | `C:\Cerebral\runtime\memory\ConversationIndexer.ts`                |          ADAPT | Index daemon chat/task transcripts instead of OpenClaw sessions.                                                                |
| `C:\Tools\files2extract\memory\conversation\ConversationMessage.ts`             | `C:\Cerebral\runtime\memory\ConversationMessage.ts`                |           COPY | Good normalized transcript model.                                                                                               |
| `C:\Tools\files2extract\memory\gc\MemoryGC.ts`                                  | `C:\Cerebral\runtime\memory\MemoryGC.ts`                           |          ADAPT | Only after memory index exists.                                                                                                 |
| `C:\Tools\files2extract\memory\indexing\ContentChunker.ts`                      | `C:\Cerebral\runtime\memory\indexing\ContentChunker.ts`            |           COPY | Useful for future chunking.                                                                                                     |
| `C:\Tools\files2extract\memory\indexing\ImportanceScorer.ts`                    | `C:\Cerebral\runtime\memory\indexing\ImportanceScorer.ts`          |           COPY | Useful for retention logic.                                                                                                     |
| `C:\Tools\files2extract\memory\indexing\IndexManager.ts`                        | `C:\Cerebral\runtime\memory\indexing\IndexManager.ts`              |          ADAPT | Build around current files and logs, not DuckDB first.                                                                          |
| `C:\Tools\files2extract\memory\indexing\MemoryIndexer.ts`                       | `C:\Cerebral\runtime\memory\indexing\MemoryIndexer.ts`             |          ADAPT | Delay until search/storage strategy is chosen.                                                                                  |
| `C:\Tools\files2extract\memory\indexing\TagExtractor.ts`                        | `C:\Cerebral\runtime\memory\indexing\TagExtractor.ts`              |           COPY | Safe enhancement for metadata extraction.                                                                                       |
| `C:\Tools\files2extract\memory\application\embeddings\EmbeddingService.ts`      | `C:\Cerebral\runtime\memory\embeddings\EmbeddingService.ts`        |          ADAPT | Keep local-first only. Do not introduce external provider assumptions.                                                          |
| `C:\Tools\files2extract\memory\domain\embeddings\EmbeddingConfig.ts`            | `C:\Cerebral\runtime\memory\embeddings\EmbeddingConfig.ts`         |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\memory\domain\embeddings\IEmbeddingCache.ts`            | `C:\Cerebral\runtime\memory\embeddings\IEmbeddingCache.ts`         |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\memory\domain\embeddings\IEmbeddingProvider.ts`         | `C:\Cerebral\runtime\memory\embeddings\IEmbeddingProvider.ts`      |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\memory\infrastructure\embeddings\FileEmbeddingCache.ts` | `C:\Cerebral\runtime\memory\embeddings\FileEmbeddingCache.ts`      |           COPY | Fine as local cache reference.                                                                                                  |
| `C:\Tools\files2extract\memory\infrastructure\embeddings\LocalProvider.ts`      | `C:\Cerebral\runtime\memory\embeddings\LocalProvider.ts`           |          ADAPT | Only if a local embedding provider is selected later.                                                                           |
| `C:\Tools\files2extract\memory\infrastructure\embeddings\OpenAIProvider.ts`     | `C:\Cerebral\runtime\memory\embeddings\OpenAIProvider.ts`          | IGNORE FOR NOW | Not aligned with current Cerebral direction.                                                                                    |
| `C:\Tools\files2extract\communication\infrastructure\MessageBroker.ts`          | `C:\Cerebral\runtime\communication\MessageBroker.ts`               |           COPY | Strong fit for agent-to-agent and task event routing.                                                                           |
| `C:\Tools\files2extract\communication\infrastructure\SharedState.ts`            | `C:\Cerebral\runtime\communication\SharedState.ts`                 |           COPY | Useful for runtime coordination state.                                                                                          |
| `C:\Tools\files2extract\communication\infrastructure\ProgressReporter.ts`       | `C:\Cerebral\runtime\communication\ProgressReporter.ts`            |           COPY | Strong fit for task execution reporting.                                                                                        |
| `C:\Tools\files2extract\communication\infrastructure\SteeringManager.ts`        | `C:\Cerebral\runtime\communication\SteeringManager.ts`             |          ADAPT | Tie to operator oversight and approval UI.                                                                                      |
| `C:\Tools\files2extract\communication\infrastructure\Coordination.ts`           | `C:\Cerebral\runtime\communication\Coordination.ts`                |          ADAPT | Align with existing agent and Task Spine workflow.                                                                              |
| `C:\Tools\files2extract\communication\infrastructure\AgentStateManager.ts`      | `C:\Cerebral\runtime\communication\AgentStateManager.ts`           |          ADAPT | Re-target to Python agents and `/api/agents/run`.                                                                               |
| `C:\Tools\files2extract\communication\domain\Message.ts`                        | `C:\Cerebral\runtime\communication\Message.ts`                     |           COPY | Good normalized message model.                                                                                                  |
| `C:\Tools\files2extract\communication\domain\IMessageBroker.ts`                 | `C:\Cerebral\runtime\communication\interfaces\IMessageBroker.ts`   |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\communication\domain\ISharedState.ts`                   | `C:\Cerebral\runtime\communication\interfaces\ISharedState.ts`     |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\communication\domain\ISteeringManager.ts`               | `C:\Cerebral\runtime\communication\interfaces\ISteeringManager.ts` |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\communication\domain\ICoordination.ts`                  | `C:\Cerebral\runtime\communication\interfaces\ICoordination.ts`    |           COPY | Contract only.                                                                                                                  |
| `C:\Tools\files2extract\communication\domain\AgentState.ts`                     | `C:\Cerebral\runtime\communication\AgentState.ts`                  |           COPY | Useful model for runtime state.                                                                                                 |
| `C:\Tools\files2extract\communication\logic\MessageQueue.ts`                    | `C:\Cerebral\runtime\communication\MessageQueue.ts`                |           COPY | Good queue implementation reference.                                                                                            |

## Pass 3: Agent Helpers + Sub-Agents + Composition

This batch should only land after the first two are staged and reviewed.

| Donor source                                                                            | Target in Cerebral                                                       |         Action | Required edits after copy                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C:\Tools\files2extract\application\AgentSessionManager.ts`                             | `C:\Cerebral\runtime\agent\CerebralRuntimeSessionManager.ts`             |          ADAPT | Remove Copilot client dependency. Wrap daemon chat/task sessions and existing memory/transcript flow.                                                           |
| `C:\Tools\files2extract\application\ToolExecutor.ts`                                    | `C:\Cerebral\runtime\agent\CerebralRuntimeToolExecutor.ts`               |          ADAPT | Re-target to Task Spine and tool router rather than donor tool loop.                                                                                            |
| `C:\Tools\files2extract\application\WorkspaceInstructionLoader.ts`                      | `C:\Cerebral\runtime\agent\CerebralInstructionLoader.ts`                 |          ADAPT | Replace `SOUL.md`, `AGENTS.md`, `USER.md`, `TOOLS.md` assumptions with Cerebral instruction sources such as persona, docs, and runtime policy documents.        |
| `C:\Tools\files2extract\application\ShutdownManager.ts`                                 | `C:\Cerebral\runtime\agent\CerebralShutdownManager.ts`                   |          ADAPT | Hook into daemon-safe shutdown, log flush, and trace export only.                                                                                               |
| `C:\Tools\files2extract\agent\domain\interfaces\IAgentSession.ts`                       | `C:\Cerebral\runtime\agent\interfaces\ICerebralRuntimeSession.ts`        |          ADAPT | If needed, copy from upstream `copilot-claw-main\src\agent\domain\interfaces\IAgentSession.ts` because `files2extract` stores only the application subset here. |
| `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IAgentSessionManager.ts`        | `C:\Cerebral\runtime\agent\interfaces\ICerebralRuntimeSessionManager.ts` |          ADAPT | Keep contract, rename for Cerebral.                                                                                                                             |
| `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IToolExecutor.ts`               | `C:\Cerebral\runtime\agent\interfaces\ICerebralRuntimeToolExecutor.ts`   |          ADAPT | Keep contract, rename for Cerebral.                                                                                                                             |
| `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IWorkspaceInstructionLoader.ts` | `C:\Cerebral\runtime\agent\interfaces\ICerebralInstructionLoader.ts`     |          ADAPT | Keep contract, replace workspace assumptions.                                                                                                                   |
| `C:\Tools\copilot-claw-main\src\agent\domain\value-objects\SessionId.ts`                | `C:\Cerebral\runtime\agent\value-objects\SessionId.ts`                   |           COPY | Safe value object.                                                                                                                                              |
| `C:\Tools\copilot-claw-main\src\agent\domain\value-objects\ConversationHistory.ts`      | `C:\Cerebral\runtime\agent\value-objects\ConversationHistory.ts`         |           COPY | Good history structure.                                                                                                                                         |
| `C:\Tools\copilot-claw-main\src\agent\domain\value-objects\SessionTranscript.ts`        | `C:\Cerebral\runtime\agent\value-objects\SessionTranscript.ts`           |           COPY | Good transcript structure.                                                                                                                                      |
| `C:\Tools\files2extract\sub-agents\SubAgentManager.ts`                                  | `C:\Cerebral\runtime\subagents\CerebralSubAgentManager.ts`               |          ADAPT | Replace Copilot session spawning with existing agent runners and `/api/agents/run`.                                                                             |
| `C:\Tools\files2extract\sub-agents\ForkableSession.ts`                                  | `C:\Cerebral\runtime\subagents\ForkableSession.ts`                       |          ADAPT | Apply only after session model exists.                                                                                                                          |
| `C:\Tools\files2extract\sub-agents\ContextExtractor.ts`                                 | `C:\Cerebral\runtime\subagents\ContextExtractor.ts`                      |          ADAPT | Tie to Cerebral memory and proofs.                                                                                                                              |
| `C:\Tools\files2extract\sub-agents\OpenClawStyleOrchestrator.ts`                        | `C:\Cerebral\runtime\subagents\SubAgentOrchestrator.ts`                  |          ADAPT | Use as coordination pattern only.                                                                                                                               |
| `C:\Tools\files2extract\sub-agents\types.ts`                                            | `C:\Cerebral\runtime\subagents\types.ts`                                 |           COPY | Shared types only.                                                                                                                                              |
| `C:\Tools\files2extract\sub-agents\fork-types.ts`                                       | `C:\Cerebral\runtime\subagents\fork-types.ts`                            |           COPY | Shared types only.                                                                                                                                              |
| `C:\Tools\files2extract\sub-agents\events.ts`                                           | `C:\Cerebral\runtime\subagents\events.ts`                                |           COPY | Shared events only.                                                                                                                                             |
| `C:\Tools\files2extract\sub-agents\tool-schemas.ts`                                     | `C:\Cerebral\runtime\subagents\tool-schemas.ts`                          | REFERENCE ONLY | Later only.                                                                                                                                                     |
| `C:\Tools\files2extract\sub-agents\tools.ts`                                            | `C:\Cerebral\runtime\subagents\tools.ts`                                 | REFERENCE ONLY | Later only.                                                                                                                                                     |
| `C:\Tools\files2extract\composition\Container.ts`                                       | `C:\Cerebral\runtime\composition\Container.ts`                           |          ADAPT | Optional only. Do not impose a new global DI scheme on the Python daemon.                                                                                       |
| `C:\Tools\files2extract\composition\bootstrap.ts`                                       | `C:\Cerebral\runtime\composition\bootstrap.ts`                           |          ADAPT | Use as startup blueprint only.                                                                                                                                  |
| `C:\Tools\files2extract\composition\registerCore.ts`                                    | `C:\Cerebral\runtime\composition\registerCore.ts`                        | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |
| `C:\Tools\files2extract\composition\registerAgent.ts`                                   | `C:\Cerebral\runtime\composition\registerAgent.ts`                       | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |
| `C:\Tools\files2extract\composition\registerTools.ts`                                   | `C:\Cerebral\runtime\composition\registerTools.ts`                       | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |
| `C:\Tools\files2extract\composition\registerMCP.ts`                                     | `C:\Cerebral\runtime\composition\registerMCP.ts`                         | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |
| `C:\Tools\files2extract\composition\registerMemory.ts`                                  | `C:\Cerebral\runtime\composition\registerMemory.ts`                      | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |
| `C:\Tools\files2extract\composition\registerTracing.ts`                                 | `C:\Cerebral\runtime\composition\registerTracing.ts`                     | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |
| `C:\Tools\files2extract\composition\registerSubAgents.ts`                               | `C:\Cerebral\runtime\composition\registerSubAgents.ts`                   | REFERENCE ONLY | Wiring pattern only.                                                                                                                                            |

---

## 7. Additional Donor Files Worth Studying But Not Importing First

These exist in donor sources and are useful as design references, but should not be in the first extraction wave.

| Donor source                                                | Recommendation | Why                                                                            |
| ----------------------------------------------------------- | -------------: | ------------------------------------------------------------------------------ |
| `C:\Tools\copilot-claw-main\src\cli.ts`                     | IGNORE FOR NOW | Cerebral already has a daemon entrypoint.                                      |
| `C:\Tools\copilot-claw-main\src\cli\*`                      | IGNORE FOR NOW | CLI product surface, not Cerebral runtime.                                     |
| `C:\Tools\copilot-claw-main\src\web\WebServer.ts`           | IGNORE FOR NOW | Cerebral already serves UI and API from the daemon.                            |
| `C:\Tools\copilot-claw-main\src\web\WebSocketHandler.ts`    | IGNORE FOR NOW | Existing daemon and PTT pipeline already own this space.                       |
| `C:\Tools\copilot-claw-main\src\web\WebApprovalProvider.ts` | REFERENCE ONLY | Could inform a future approval UI.                                             |
| `C:\Tools\copilot-claw-main\src\scheduler\*`                | REFERENCE ONLY | Could inform future scheduled task features, but not the first runtime import. |
| `C:\Tools\files2extract\core\config\AppConfig.ts`           | REFERENCE ONLY | Strong config pattern, but OpenClaw defaults do not match Cerebral.            |
| `C:\Tools\files2extract\core\config\ConfigLoader.ts`        | REFERENCE ONLY | Good expansion/override pattern, but path semantics are different.             |
| `C:\Tools\files2extract\core\infrastructure\CopilotCLI.ts`  | IGNORE FOR NOW | Wrong platform abstraction for Cerebral.                                       |

---

## 8. Required Cerebral Wrapper Files

These are the files Cerebral should create after staging donor files.

| Wrapper file                                                 | Purpose                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `C:\Cerebral\runtime\agent\CerebralRuntimeSessionManager.ts` | Normalize session lifecycle around daemon chat/task calls    |
| `C:\Cerebral\runtime\agent\CerebralInstructionLoader.ts`     | Load Cerebral-native instruction sources                     |
| `C:\Cerebral\runtime\tools\CerebralToolExecutor.ts`          | Wrap `tool_router.py` and Task Spine execution               |
| `C:\Cerebral\runtime\tools\CerebralToolRegistry.ts`          | Runtime registry over existing Cerebral tools                |
| `C:\Cerebral\runtime\policies\CerebralApprovalBridge.ts`     | Map donor approval abstractions to `policy_engine.py`        |
| `C:\Cerebral\runtime\mcp\CerebralMCPBridge.ts`               | Normalize current MCP tool inventory and health              |
| `C:\Cerebral\runtime\memory\CerebralMemoryBridge.ts`         | Bridge donor memory contracts to `memory_engine.py` and logs |
| `C:\Cerebral\runtime\tracing\CerebralRuntimeTracer.ts`       | Tie trace events to Cerebral telemetry and session logs      |
| `C:\Cerebral\runtime\communication\CerebralTaskEvents.ts`    | Emit normalized Task Spine and agent coordination events     |

---

## 9. Immediate Build Sequence

This is the execution order that best matches Cerebral’s current architecture.

### Phase 0: Staging only

1. Create the `C:\Cerebral\runtime\...` directory tree.
2. Copy only Pass 1 donor files into staging.
3. Do not wire them into the daemon yet.
4. Add a manifest documenting source file provenance.

### Phase 1: Registry and policy bridge

1. Create `CerebralToolRegistry.ts`.
2. Create `CerebralToolExecutor.ts`.
3. Create `CerebralApprovalBridge.ts`.
4. Model existing tool namespaces from `tool_router.py` into the staged registry.
5. Map donor safety decisions to `ALLOW`, `ALLOW_LOG`, `APPROVE`, `DENY`.

### Phase 2: Tracing and event layer

1. Add `CerebralTaskEvents.ts`.
2. Add file logging and redaction components.
3. Start emitting event and trace metadata from Task Spine executions.

### Phase 3: MCP and memory bridge

1. Add `CerebralMCPBridge.ts`.
2. Normalize current MCP tool metadata.
3. Add `CerebralMemoryBridge.ts`.
4. Start with keyword and transcript search only.
5. Delay semantic retrieval until a local embedding plan is chosen.

### Phase 4: Agent session and sub-agent coordination

1. Add `CerebralRuntimeSessionManager.ts`.
2. Add `CerebralInstructionLoader.ts`.
3. Add `CerebralSubAgentManager.ts` only after eventing and registry layers exist.

---

## 10. Most Important Integration Rules

These rules should govern every extraction and every future build step.

1. Donor code must strengthen Cerebral internals, not compete with them.
2. No donor file is allowed to introduce a second control plane.
3. All high-risk actions must still be adjudicated by `policy_engine.py`.
4. All multi-step actions must still route through `task_spine.py`.
5. All tool execution must still land in existing Cerebral tool surfaces.
6. All memory writes must still be visible to current Cerebral memory stores and logs.
7. MCP logic must organize current Cerebral MCP tooling, not replace it.
8. Sub-agents are a later phase, not a first-phase import.

---

## 11. Recommended First Execution Batch

If execution starts immediately after this report, the safest first implementation batch is:

```text
core/
  Result.ts
  Option.ts
  ILogger.ts
  ITracer.ts
  IEventBus.ts
  IPlatform.ts
  IPlatformPaths.ts
  IProcessManager.ts
  ConsoleLogger.ts
  InMemoryEventBus.ts
  Platform.ts
  PlatformPaths.ts
  ProcessManager.ts
  DomainError.ts
  ValidationError.ts
  TimeoutError.ts
  NotFoundError.ts
  ToolExecutionError.ts
  SessionError.ts
  ConfigurationError.ts

tools/
  ITool.ts
  IToolRegistry.ts
  JSONSchema.ts
  ToolParameter.ts
  ToolResult.ts
  InMemoryToolRegistry.ts
  commandParsing.ts
  IPermissionGuard.ts
  IUserApprovalProvider.ts

tracing/
  FileLogger.ts
  CompositeLogger.ts
  SensitiveDataRedactor.ts
  SessionDirectory.ts
```

Plus these wrapper targets:

```text
C:\Cerebral\runtime\tools\CerebralToolExecutor.ts
C:\Cerebral\runtime\policies\CerebralApprovalBridge.ts
C:\Cerebral\runtime\communication\CerebralTaskEvents.ts
```

This first batch gives the biggest architectural gain with the smallest risk.

---

## 12. Final Recommendation

Use `C:\Tools\files2extract` as the operational extraction source.
Use `C:\Tools\copilot-claw-main\src` only as an upstream validation source when:

- a file is missing from `files2extract`
- you need the original domain interface definitions
- you need to validate the intended architecture of a staged donor file

The correct next move after this report is not to replace Cerebral pieces. The correct next move is to:

1. stage Pass 1 donor files into `C:\Cerebral\runtime\...`
2. build Cerebral-native wrapper files
3. wire the wrappers into the current daemon and task spine gradually

That path preserves Cerebral’s current strengths while upgrading the architecture.
