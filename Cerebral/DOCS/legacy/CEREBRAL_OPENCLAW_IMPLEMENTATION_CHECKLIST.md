<!-- markdownlint-disable MD024 MD029 --

# Cerebral OpenClaw Implementation Checklist

**Source plan:** `C:\Cerebral\MD-File-Directory\CEREBRAL_OPENCLAW_EXTRACTION_REPORT_AND_PLAN.md`  
**Purpose:** Turn the extraction report into an execution-ready build checklist with explicit file creation order.  
**Rule:** Do not skip forward across phases until the gate at the end of the current phase is satisfied.

## Status Snapshot

Execution moved this document from planning into staged implementation.

- Completed: Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8
- Partially completed: Phase 9
- Still open in Phase 9: items 110 through 116, which remain reference-only by design
- Live integration is active in `policy_engine.py`, `tool_router.py`, `task_spine.py`, `CerebralDaemon.py`, and `runtime_live_bridge.py`
- Validation status: `get_errors` returned no errors for the updated Python control files and staged runtime tree

### Implemented runtime bridges and skeletons

- `runtime\policies\CerebralApprovalBridge.ts`
- `runtime\policies\CommandSafetyGuard.ts`
- `runtime\tools\CerebralToolRegistry.ts`
- `runtime\tools\CerebralToolExecutor.ts`
- `runtime\tools\system\ExecTool.ts`
- `runtime\tracing\CerebralRuntimeTracer.ts`
- `runtime\tracing\OpenTelemetryTracer.ts`
- `runtime\tracing\SessionCleaner.ts`
- `runtime\communication\CerebralTaskEvents.ts`
- `runtime\communication\SteeringManager.ts`
- `runtime\communication\Coordination.ts`
- `runtime\communication\AgentStateManager.ts`
- `runtime\mcp\CerebralMCPToolRegistry.ts`
- `runtime\mcp\CerebralMCPServerConnection.ts`
- `runtime\mcp\CerebralMCPManager.ts`
- `runtime\mcp\CerebralMCPBridge.ts`
- `runtime\memory\CerebralMemorySearch.ts`
- `runtime\memory\CerebralMemoryBridge.ts`
- `runtime\memory\tools\SearchMemoryTool.ts`
- `runtime\memory\tools\SaveMemoryTool.ts`
- `runtime\agent\CerebralInstructionLoader.ts`
- `runtime\agent\CerebralRuntimeToolExecutor.ts`
- `runtime\agent\CerebralRuntimeSessionManager.ts`
- `runtime\agent\CerebralShutdownManager.ts`
- `runtime\subagents\ContextExtractor.ts`
- `runtime\subagents\ForkableSession.ts`
- `runtime\subagents\SubAgentOrchestrator.ts`
- `runtime\subagents\CerebralSubAgentManager.ts`
- `runtime\composition\Container.ts`
- `runtime\composition\bootstrap.ts`

---

## 1. Execution Rules

- Keep `CerebralDaemon.py`, `task_spine.py`, `tool_router.py`, `model_router.py`, `policy_engine.py`, and `desktop_hands.py` as the live control path.
- Stage donor code under `C:\Cerebral\runtime\...` first.
- Preserve donor filenames for staged files unless the plan explicitly calls for a Cerebral-prefixed wrapper.
- Treat `COPY` files as dormant until a wrapper or bridge is in place.
- Treat `ADAPT` files as Cerebral-owned implementation work, not direct runtime imports.
- Do not add donor package dependencies as part of this checklist.

---

## 2. Phase 0: Runtime Skeleton And Provenance

### Directories

- [x] Create `C:\Cerebral\runtime\core\types`
- [x] Create `C:\Cerebral\runtime\core\interfaces`
- [x] Create `C:\Cerebral\runtime\core\infrastructure`
- [x] Create `C:\Cerebral\runtime\core\errors`
- [x] Create `C:\Cerebral\runtime\tools\interfaces`
- [x] Create `C:\Cerebral\runtime\tools\types`
- [x] Create `C:\Cerebral\runtime\tools\value-objects`
- [x] Create `C:\Cerebral\runtime\tools\system`
- [x] Create `C:\Cerebral\runtime\policies`
- [x] Create `C:\Cerebral\runtime\tracing`
- [x] Create `C:\Cerebral\runtime\mcp\interfaces`
- [x] Create `C:\Cerebral\runtime\mcp\models`
- [x] Create `C:\Cerebral\runtime\mcp\errors`
- [x] Create `C:\Cerebral\runtime\memory\tools`
- [x] Create `C:\Cerebral\runtime\memory\indexing`
- [x] Create `C:\Cerebral\runtime\memory\embeddings`
- [x] Create `C:\Cerebral\runtime\communication\interfaces`
- [x] Create `C:\Cerebral\runtime\agent\interfaces`
- [x] Create `C:\Cerebral\runtime\agent\value-objects`
- [x] Create `C:\Cerebral\runtime\subagents`
- [x] Create `C:\Cerebral\runtime\composition`

### Manifest

- [x] Create `C:\Cerebral\runtime\OPENCLAW_DONOR_MANIFEST.md`
- [x] Record donor roots: `C:\Tools\files2extract` and `C:\Tools\copilot-claw-main\src`
- [x] Record action labels: `COPY`, `ADAPT`, `REFERENCE ONLY`, `IGNORE`
- [x] Record that staged donor files are dormant until bridged into Cerebral

### Phase 0 Gate

- [x] Every target directory exists
- [x] Provenance manifest exists
- [ ] No daemon integration has started yet

---

## 3. Phase 1: Core Contracts And Error Model

Build objective: establish the shared runtime vocabulary before any executor, memory, or MCP work exists.

### File creation order

1. [x] `C:\Cerebral\runtime\core\types\Result.ts`
       Source: `C:\Tools\files2extract\core\types\Result.ts`
       Action: `COPY`

2. [x] `C:\Cerebral\runtime\core\types\Option.ts`
       Source: `C:\Tools\files2extract\core\types\Option.ts`
       Action: `COPY`

3. [x] `C:\Cerebral\runtime\core\interfaces\ILogger.ts`
       Source: `C:\Tools\files2extract\core\interfaces\ILogger.ts`
       Action: `COPY`

4. [x] `C:\Cerebral\runtime\core\interfaces\ITracer.ts`
       Source: `C:\Tools\files2extract\core\interfaces\ITracer.ts`
       Action: `COPY`

5. [x] `C:\Cerebral\runtime\core\interfaces\IEventBus.ts`
       Source: `C:\Tools\files2extract\core\interfaces\IEventBus.ts`
       Action: `COPY`

6. [x] `C:\Cerebral\runtime\core\interfaces\IPlatform.ts`
       Source: `C:\Tools\files2extract\core\interfaces\IPlatform.ts`
       Action: `COPY`

7. [x] `C:\Cerebral\runtime\core\interfaces\IPlatformPaths.ts`
       Source: `C:\Tools\files2extract\core\interfaces\IPlatformPaths.ts`
       Action: `COPY`
       Required edit: replace `.claw` path assumptions with Cerebral runtime paths

8. [x] `C:\Cerebral\runtime\core\interfaces\IProcessManager.ts`
       Source: `C:\Tools\files2extract\core\interfaces\IProcessManager.ts`
       Action: `COPY`

9. [x] `C:\Cerebral\runtime\core\errors\DomainError.ts`
       Source: `C:\Tools\files2extract\core\errors\DomainError.ts`
       Action: `COPY`

10. [x] `C:\Cerebral\runtime\core\errors\ValidationError.ts`
        Source: `C:\Tools\files2extract\core\errors\ValidationError.ts`
        Action: `COPY`

11. [x] `C:\Cerebral\runtime\core\errors\TimeoutError.ts`
        Source: `C:\Tools\files2extract\core\errors\TimeoutError.ts`
        Action: `COPY`

12. [x] `C:\Cerebral\runtime\core\errors\NotFoundError.ts`
        Source: `C:\Tools\files2extract\core\errors\NotFoundError.ts`
        Action: `COPY`

13. [x] `C:\Cerebral\runtime\core\errors\ToolExecutionError.ts`
        Source: `C:\Tools\files2extract\core\errors\ToolExecutionError.ts`
        Action: `COPY`

14. [x] `C:\Cerebral\runtime\core\errors\SessionError.ts`
        Source: `C:\Tools\files2extract\core\errors\SessionError.ts`
        Action: `COPY`

15. [x] `C:\Cerebral\runtime\core\errors\ConfigurationError.ts`
        Source: `C:\Tools\files2extract\core\errors\ConfigurationError.ts`
        Action: `COPY`

16. [x] `C:\Cerebral\runtime\core\infrastructure\ConsoleLogger.ts`
        Source: `C:\Tools\files2extract\core\infrastructure\ConsoleLogger.ts`
        Action: `COPY`
        Required edit: align formatting with Cerebral log style

17. [x] `C:\Cerebral\runtime\core\infrastructure\InMemoryEventBus.ts`
        Source: `C:\Tools\files2extract\core\infrastructure\InMemoryEventBus.ts`
        Action: `COPY`
        Required edit: reserve a Cerebral event namespace

18. [x] `C:\Cerebral\runtime\core\infrastructure\Platform.ts`
        Source: `C:\Tools\files2extract\core\infrastructure\Platform.ts`
        Action: `COPY`
        Required edit: trim non-Windows assumptions if present

19. [x] `C:\Cerebral\runtime\core\infrastructure\PlatformPaths.ts`
        Source: `C:\Tools\files2extract\core\infrastructure\PlatformPaths.ts`
        Action: `COPY`
        Required edit: replace donor home/session paths with Cerebral paths

20. [x] `C:\Cerebral\runtime\core\infrastructure\ProcessManager.ts`
        Source: `C:\Tools\files2extract\core\infrastructure\ProcessManager.ts`
        Action: `COPY`
        Required edit: mark process execution as approval-bridged only

### Phase 1 Gate

- [x] All 20 files exist
- [x] No core file imports a donor-only package
- [x] Path references use Cerebral paths, not `.claw`

---

## 4. Phase 2: Tool Contracts, Registry, And Safety Surface

Build objective: define the typed tool layer before wiring any execution bridge.

### File creation order

21. [x] `C:\Cerebral\runtime\tools\interfaces\ITool.ts`
        Source: `C:\Tools\files2extract\tools\domain\interfaces\ITool.ts`
        Action: `COPY`

22. [x] `C:\Cerebral\runtime\tools\interfaces\IToolRegistry.ts`
        Source: `C:\Tools\files2extract\tools\domain\interfaces\IToolRegistry.ts`
        Action: `COPY`

23. [x] `C:\Cerebral\runtime\tools\types\JSONSchema.ts`
        Source: `C:\Tools\files2extract\tools\domain\types\JSONSchema.ts`
        Action: `COPY`

24. [x] `C:\Cerebral\runtime\tools\value-objects\ToolParameter.ts`
        Source: `C:\Tools\files2extract\tools\domain\value-objects\ToolParameter.ts`
        Action: `COPY`

25. [x] `C:\Cerebral\runtime\tools\value-objects\ToolResult.ts`
        Source: `C:\Tools\files2extract\tools\domain\value-objects\ToolResult.ts`
        Action: `COPY`
        Required edit: note mapping to current API response shapes

26. [x] `C:\Cerebral\runtime\tools\InMemoryToolRegistry.ts`
        Source: `C:\Tools\files2extract\tools\infrastructure\InMemoryToolRegistry.ts`
        Action: `COPY`

27. [x] `C:\Cerebral\runtime\policies\IPermissionGuard.ts`
        Source: `C:\Tools\files2extract\tools\builtin\IPermissionGuard.ts`
        Action: `COPY`

28. [x] `C:\Cerebral\runtime\policies\IUserApprovalProvider.ts`
        Source: `C:\Tools\files2extract\tools\builtin\IUserApprovalProvider.ts`
        Action: `COPY`

29. [x] `C:\Cerebral\runtime\policies\commandParsing.ts`
        Source: `C:\Tools\files2extract\tools\builtin\commandParsing.ts`
        Action: `COPY`

30. [x] `C:\Cerebral\runtime\policies\CommandSafetyGuard.ts`
        Source: `C:\Tools\files2extract\tools\builtin\CommandSafetyGuard.ts`
        Action: `ADAPT`
        Required edit: map all decisions to `ALLOW`, `ALLOW_LOG`, `APPROVE`, `DENY`

31. [x] `C:\Cerebral\runtime\tools\system\ExecTool.ts`
        Source: `C:\Tools\files2extract\tools\builtin\ExecTool.ts`
        Action: `ADAPT`
        Required edit: hard-route execution through a Cerebral approval bridge

32. [x] `C:\Cerebral\runtime\tools\CerebralToolRegistry.ts`
        Source: Cerebral wrapper
        Action: `CREATE`
        Required edit: expose current `tool_router.py` namespaces as runtime registry entries

33. [x] `C:\Cerebral\runtime\tools\CerebralToolExecutor.ts`
        Source: donor blueprint from `C:\Tools\files2extract\tools\application\ToolExecutor.ts`
        Action: `ADAPT`
        Required edit: route all execution through `tool_router.py`, `policy_engine.py`, and `task_spine.py`

34. [x] `C:\Cerebral\runtime\policies\CerebralApprovalBridge.ts`
        Source: Cerebral wrapper
        Action: `CREATE`
        Required edit: translate donor approval abstractions into policy-engine calls

### Phase 2 Gate

- [x] Tool registry exists as a wrapper over current Cerebral tools
- [x] No tool can execute without the approval bridge
- [x] No tool execution bypasses `policy_engine.py`

---

## 5. Phase 3: Tracing And Runtime Event Layer

Build objective: add normalized runtime logging, redaction, and event emission before memory and MCP integration.

### File creation order

35. [x] `C:\Cerebral\runtime\tracing\FileLogger.ts`
        Source: `C:\Tools\files2extract\tracing\infrastructure\FileLogger.ts`
        Action: `COPY`

36. [x] `C:\Cerebral\runtime\tracing\CompositeLogger.ts`
        Source: `C:\Tools\files2extract\tracing\infrastructure\CompositeLogger.ts`
        Action: `COPY`

37. [x] `C:\Cerebral\runtime\tracing\SensitiveDataRedactor.ts`
        Source: `C:\Tools\files2extract\tracing\application\SensitiveDataRedactor.ts`
        Action: `COPY`

38. [x] `C:\Cerebral\runtime\tracing\SessionDirectory.ts`
        Source: `C:\Tools\files2extract\tracing\domain\SessionDirectory.ts`
        Action: `COPY`
        Required edit: replace `.claw` session paths with Cerebral session paths

39. [x] `C:\Cerebral\runtime\tracing\SessionMetadata.ts`
        Source: `C:\Tools\files2extract\tracing\domain\entities\SessionMetadata.ts`
        Action: `COPY`

40. [x] `C:\Cerebral\runtime\tracing\FileSpanExporter.ts`
        Source: `C:\Tools\files2extract\tracing\infrastructure\FileSpanExporter.ts`
        Action: `COPY`

41. [x] `C:\Cerebral\runtime\tracing\RedactingSpanExporter.ts`
        Source: `C:\Tools\files2extract\tracing\infrastructure\RedactingSpanExporter.ts`
        Action: `COPY`

42. [x] `C:\Cerebral\runtime\tracing\SessionCleaner.ts`
        Source: `C:\Tools\files2extract\tracing\application\SessionCleaner.ts`
        Action: `ADAPT`
        Required edit: point cleanup rules at Cerebral logs, temp, and session directories

43. [x] `C:\Cerebral\runtime\tracing\OpenTelemetryTracer.ts`
        Source: `C:\Tools\files2extract\tracing\infrastructure\OpenTelemetryTracer.ts`
        Action: `ADAPT`
        Required edit: keep dormant as a design reference unless Cerebral later adopts a compatible trace implementation

44. [x] `C:\Cerebral\runtime\tracing\CerebralRuntimeTracer.ts`
        Source: Cerebral wrapper
        Action: `CREATE`
        Required edit: emit session and task metadata into existing telemetry and logs

45. [x] `C:\Cerebral\runtime\communication\CerebralTaskEvents.ts`
        Source: Cerebral wrapper
        Action: `CREATE`
        Required edit: define normalized event names for Task Spine, tool execution, proof capture, and approvals

### Phase 3 Gate

- [x] Sensitive-data redaction exists before trace export is used
- [x] Event names are documented and Cerebral-scoped
- [x] Tracing still does not replace existing Cerebral telemetry

---

## 6. Phase 4: MCP Contracts And Bridge

Build objective: normalize MCP metadata and connection structure without replacing the existing Python MCP server.

### File creation order

46. [x] `C:\Cerebral\runtime\mcp\interfaces\IMCPManager.ts`
        Source: `C:\Tools\files2extract\mcp\domain\IMCPManager.ts`
        Action: `COPY`

47. [x] `C:\Cerebral\runtime\mcp\interfaces\IMCPServerConnection.ts`
        Source: `C:\Tools\files2extract\mcp\domain\IMCPServerConnection.ts`
        Action: `COPY`

48. [x] `C:\Cerebral\runtime\mcp\interfaces\IMCPToolRegistry.ts`
        Source: `C:\Tools\files2extract\mcp\domain\IMCPToolRegistry.ts`
        Action: `COPY`

49. [x] `C:\Cerebral\runtime\mcp\models\MCPServer.ts`
        Source: `C:\Tools\files2extract\mcp\domain\MCPServer.ts`
        Action: `COPY`

50. [x] `C:\Cerebral\runtime\mcp\models\MCPTool.ts`
        Source: `C:\Tools\files2extract\mcp\domain\MCPTool.ts`
        Action: `COPY`

51. [x] `C:\Cerebral\runtime\mcp\errors\MCPError.ts`
        Source: `C:\Tools\files2extract\mcp\domain\errors\MCPError.ts`
        Action: `COPY`

52. [x] `C:\Cerebral\runtime\mcp\CerebralMCPToolRegistry.ts`
        Source: donor blueprint from `C:\Tools\files2extract\mcp\application\MCPToolRegistry.ts`
        Action: `ADAPT`
        Required edit: register only existing Cerebral MCP tools

53. [x] `C:\Cerebral\runtime\mcp\CerebralMCPServerConnection.ts`
        Source: donor blueprint from `C:\Tools\files2extract\mcp\application\MCPServerConnection.ts`
        Action: `ADAPT`
        Required edit: use as metadata and health model, not a replacement MCP transport

54. [x] `C:\Cerebral\runtime\mcp\CerebralMCPManager.ts`
        Source: donor blueprint from `C:\Tools\files2extract\mcp\application\MCPManager.ts`
        Action: `ADAPT`
        Required edit: inventory and health-check current Cerebral MCP services

55. [x] `C:\Cerebral\runtime\mcp\CerebralMCPBridge.ts`
        Source: Cerebral wrapper
        Action: `CREATE`
        Required edit: unify daemon-visible MCP metadata for UI, health, and discovery

### Phase 4 Gate

- [x] Existing `cerebral_mcp_server.py` remains the live MCP surface
- [x] MCP bridge reports on current tools instead of creating a parallel MCP universe
- [x] No donor SDK dependency is required for the staged files to exist

---

## 7. Phase 5: Memory Search And Persistence Bridge

Build objective: add normalized search and save contracts over current Cerebral memory before any semantic or vector layer is considered.

### File creation order

56. [x] `C:\Cerebral\runtime\memory\SearchOptions.ts`
        Source: `C:\Tools\files2extract\memory\search\SearchOptions.ts`
        Action: `COPY`

57. [x] `C:\Cerebral\runtime\memory\RelevanceScorer.ts`
        Source: `C:\Tools\files2extract\memory\search\RelevanceScorer.ts`
        Action: `COPY`

58. [x] `C:\Cerebral\runtime\memory\ConversationMessage.ts`
        Source: `C:\Tools\files2extract\memory\conversation\ConversationMessage.ts`
        Action: `COPY`

59. [x] `C:\Cerebral\runtime\memory\ConversationBuffer.ts`
        Source: `C:\Tools\files2extract\memory\conversation\ConversationBuffer.ts`
        Action: `COPY`

60. [x] `C:\Cerebral\runtime\memory\indexing\ContentChunker.ts`
        Source: `C:\Tools\files2extract\memory\indexing\ContentChunker.ts`
        Action: `COPY`

61. [x] `C:\Cerebral\runtime\memory\indexing\ImportanceScorer.ts`
        Source: `C:\Tools\files2extract\memory\indexing\ImportanceScorer.ts`
        Action: `COPY`

62. [x] `C:\Cerebral\runtime\memory\indexing\TagExtractor.ts`
        Source: `C:\Tools\files2extract\memory\indexing\TagExtractor.ts`
        Action: `COPY`

63. [x] `C:\Cerebral\runtime\memory\embeddings\EmbeddingConfig.ts`
        Source: `C:\Tools\files2extract\memory\domain\embeddings\EmbeddingConfig.ts`
        Action: `COPY`

64. [x] `C:\Cerebral\runtime\memory\embeddings\IEmbeddingCache.ts`
        Source: `C:\Tools\files2extract\memory\domain\embeddings\IEmbeddingCache.ts`
        Action: `COPY`

65. [x] `C:\Cerebral\runtime\memory\embeddings\IEmbeddingProvider.ts`
        Source: `C:\Tools\files2extract\memory\domain\embeddings\IEmbeddingProvider.ts`
        Action: `COPY`

66. [x] `C:\Cerebral\runtime\memory\embeddings\FileEmbeddingCache.ts`
        Source: `C:\Tools\files2extract\memory\infrastructure\embeddings\FileEmbeddingCache.ts`
        Action: `COPY`

67. [x] `C:\Cerebral\runtime\memory\CerebralMemorySearch.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\search\MemorySearch.ts`
        Action: `ADAPT`
        Required edit: search `memory.json`, task logs, and transcripts first; no DuckDB dependency

68. [x] `C:\Cerebral\runtime\memory\tools\SearchMemoryTool.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\tools\SearchMemoryTool.ts`
        Action: `ADAPT`
        Required edit: route reads through Cerebral memory and transcript sources

69. [x] `C:\Cerebral\runtime\memory\tools\SaveMemoryTool.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\tools\SaveMemoryTool.ts`
        Action: `ADAPT`
        Required edit: bridge writes to `memory_engine.py`

70. [x] `C:\Cerebral\runtime\memory\ConversationIndexer.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\conversation\ConversationIndexer.ts`
        Action: `ADAPT`
        Required edit: index daemon chats and task transcripts rather than donor session logs

71. [x] `C:\Cerebral\runtime\memory\indexing\IndexManager.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\indexing\IndexManager.ts`
        Action: `ADAPT`
        Required edit: stay file-backed first

72. [x] `C:\Cerebral\runtime\memory\indexing\MemoryIndexer.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\indexing\MemoryIndexer.ts`
        Action: `ADAPT`
        Required edit: defer semantic indexing until local plan exists

73. [x] `C:\Cerebral\runtime\memory\MemoryGC.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\gc\MemoryGC.ts`
        Action: `ADAPT`
        Required edit: operate only after indexing format is settled

74. [x] `C:\Cerebral\runtime\memory\embeddings\EmbeddingService.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\application\embeddings\EmbeddingService.ts`
        Action: `ADAPT`
        Required edit: keep local-first and dormant unless selected later

75. [x] `C:\Cerebral\runtime\memory\embeddings\LocalProvider.ts`
        Source: donor blueprint from `C:\Tools\files2extract\memory\infrastructure\embeddings\LocalProvider.ts`
        Action: `ADAPT`
        Required edit: only if a local embedding backend is chosen

76. [x] `C:\Cerebral\runtime\memory\CerebralMemoryBridge.ts`
        Source: Cerebral wrapper
        Action: `CREATE`
        Required edit: unify `memory_engine.py`, `memory.json`, and transcript storage behind one runtime bridge

### Phase 5 Gate

- [x] Keyword and transcript search works without DuckDB or external embedding providers
- [x] Memory writes still land in Cerebral-owned storage
- [x] `OpenAIProvider.ts` has not been imported or activated

---

## 8. Phase 6: Communication, Shared State, And Progress Reporting

Build objective: establish normalized messaging and state flow before agent session orchestration and sub-agent work.

### File creation order

77. [x] `C:\Cerebral\runtime\communication\Message.ts`
        Source: `C:\Tools\files2extract\communication\domain\Message.ts`
        Action: `COPY`

78. [x] `C:\Cerebral\runtime\communication\AgentState.ts`
        Source: `C:\Tools\files2extract\communication\domain\AgentState.ts`
        Action: `COPY`

79. [x] `C:\Cerebral\runtime\communication\interfaces\IMessageBroker.ts`
        Source: `C:\Tools\files2extract\communication\domain\IMessageBroker.ts`
        Action: `COPY`

80. [x] `C:\Cerebral\runtime\communication\interfaces\ISharedState.ts`
        Source: `C:\Tools\files2extract\communication\domain\ISharedState.ts`
        Action: `COPY`

81. [x] `C:\Cerebral\runtime\communication\interfaces\ISteeringManager.ts`
        Source: `C:\Tools\files2extract\communication\domain\ISteeringManager.ts`
        Action: `COPY`

82. [x] `C:\Cerebral\runtime\communication\interfaces\ICoordination.ts`
        Source: `C:\Tools\files2extract\communication\domain\ICoordination.ts`
        Action: `COPY`

83. [x] `C:\Cerebral\runtime\communication\MessageQueue.ts`
        Source: `C:\Tools\files2extract\communication\logic\MessageQueue.ts`
        Action: `COPY`

84. [x] `C:\Cerebral\runtime\communication\MessageBroker.ts`
        Source: `C:\Tools\files2extract\communication\infrastructure\MessageBroker.ts`
        Action: `COPY`

85. [x] `C:\Cerebral\runtime\communication\SharedState.ts`
        Source: `C:\Tools\files2extract\communication\infrastructure\SharedState.ts`
        Action: `COPY`

86. [x] `C:\Cerebral\runtime\communication\ProgressReporter.ts`
        Source: `C:\Tools\files2extract\communication\infrastructure\ProgressReporter.ts`
        Action: `COPY`

87. [x] `C:\Cerebral\runtime\communication\SteeringManager.ts`
        Source: donor blueprint from `C:\Tools\files2extract\communication\infrastructure\SteeringManager.ts`
        Action: `ADAPT`
        Required edit: align with current oversight and approval UI

88. [x] `C:\Cerebral\runtime\communication\Coordination.ts`
        Source: donor blueprint from `C:\Tools\files2extract\communication\infrastructure\Coordination.ts`
        Action: `ADAPT`
        Required edit: align with Task Spine and agent runners

89. [x] `C:\Cerebral\runtime\communication\AgentStateManager.ts`
        Source: donor blueprint from `C:\Tools\files2extract\communication\infrastructure\AgentStateManager.ts`
        Action: `ADAPT`
        Required edit: route state around Python agent execution and `/api/agents/run`

### Phase 6 Gate

- [x] Runtime messaging is Cerebral-scoped and documented
- [x] Shared state does not become a second source of truth for existing daemon state
- [x] Progress reporting aligns with Task Spine status semantics

---

## 9. Phase 7: Agent Session Layer

Build objective: add a normalized session abstraction only after tools, traces, MCP, memory, and communication layers exist.

### File creation order

90. [x] `C:\Cerebral\runtime\agent\value-objects\SessionId.ts`
        Source: `C:\Tools\copilot-claw-main\src\agent\domain\value-objects\SessionId.ts`
        Action: `COPY`

91. [x] `C:\Cerebral\runtime\agent\value-objects\ConversationHistory.ts`
        Source: `C:\Tools\copilot-claw-main\src\agent\domain\value-objects\ConversationHistory.ts`
        Action: `COPY`

92. [x] `C:\Cerebral\runtime\agent\value-objects\SessionTranscript.ts`
        Source: `C:\Tools\copilot-claw-main\src\agent\domain\value-objects\SessionTranscript.ts`
        Action: `COPY`

93. [x] `C:\Cerebral\runtime\agent\interfaces\ICerebralRuntimeSession.ts`
        Source: upstream donor contract from `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IAgentSession.ts`
        Action: `ADAPT`

94. [x] `C:\Cerebral\runtime\agent\interfaces\ICerebralRuntimeSessionManager.ts`
        Source: `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IAgentSessionManager.ts`
        Action: `ADAPT`

95. [x] `C:\Cerebral\runtime\agent\interfaces\ICerebralRuntimeToolExecutor.ts`
        Source: `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IToolExecutor.ts`
        Action: `ADAPT`

96. [x] `C:\Cerebral\runtime\agent\interfaces\ICerebralInstructionLoader.ts`
        Source: `C:\Tools\copilot-claw-main\src\agent\domain\interfaces\IWorkspaceInstructionLoader.ts`
        Action: `ADAPT`

97. [x] `C:\Cerebral\runtime\agent\CerebralInstructionLoader.ts`
        Source: donor blueprint from `C:\Tools\files2extract\application\WorkspaceInstructionLoader.ts`
        Action: `ADAPT`
        Required edit: replace `SOUL.md`, `AGENTS.md`, `USER.md`, and `TOOLS.md` assumptions with Cerebral sources

98. [x] `C:\Cerebral\runtime\agent\CerebralRuntimeToolExecutor.ts`
        Source: donor blueprint from `C:\Tools\files2extract\application\ToolExecutor.ts`
        Action: `ADAPT`
        Required edit: wrap the existing runtime tool executor instead of creating a parallel loop

99. [x] `C:\Cerebral\runtime\agent\CerebralRuntimeSessionManager.ts`
        Source: donor blueprint from `C:\Tools\files2extract\application\AgentSessionManager.ts`
        Action: `ADAPT`
        Required edit: wrap daemon chat/task sessions and current transcripts

100.  [x] `C:\Cerebral\runtime\agent\CerebralShutdownManager.ts`
          Source: donor blueprint from `C:\Tools\files2extract\application\ShutdownManager.ts`
          Action: `ADAPT`
          Required edit: limit to safe shutdown hooks, log flush, and trace export

### Phase 7 Gate

- [x] Session manager wraps the current daemon runtime rather than replacing it
- [x] Instruction loading is Cerebral-native
- [x] Transcript ownership remains with Cerebral data sources

---

## 10. Phase 8: Sub-Agent Coordination

Build objective: introduce sub-agent mechanics only after the session and communication layers are stable.

### File creation order

101. [x] `C:\Cerebral\runtime\subagents\types.ts`
         Source: `C:\Tools\files2extract\sub-agents\types.ts`
         Action: `COPY`

102. [x] `C:\Cerebral\runtime\subagents\fork-types.ts`
         Source: `C:\Tools\files2extract\sub-agents\fork-types.ts`
         Action: `COPY`

103. [x] `C:\Cerebral\runtime\subagents\events.ts`
         Source: `C:\Tools\files2extract\sub-agents\events.ts`
         Action: `COPY`

104. [x] `C:\Cerebral\runtime\subagents\ContextExtractor.ts`
         Source: donor blueprint from `C:\Tools\files2extract\sub-agents\ContextExtractor.ts`
         Action: `ADAPT`
         Required edit: extract from Cerebral memory, proofs, plans, and session transcripts

105. [x] `C:\Cerebral\runtime\subagents\ForkableSession.ts`
         Source: donor blueprint from `C:\Tools\files2extract\sub-agents\ForkableSession.ts`
         Action: `ADAPT`
         Required edit: depend on the Cerebral session abstraction created in Phase 7

106. [x] `C:\Cerebral\runtime\subagents\SubAgentOrchestrator.ts`
         Source: donor blueprint from `C:\Tools\files2extract\sub-agents\OpenClawStyleOrchestrator.ts`
         Action: `ADAPT`
         Required edit: coordinate existing agent runners instead of Copilot sub-sessions

107. [x] `C:\Cerebral\runtime\subagents\CerebralSubAgentManager.ts`
         Source: donor blueprint from `C:\Tools\files2extract\sub-agents\SubAgentManager.ts`
         Action: `ADAPT`
         Required edit: route launches through Cerebral agent endpoints and runtime messaging

### Phase 8 Gate

- [x] No sub-agent can launch outside Cerebral approval and policy flow
- [x] Sub-agent transcripts feed back into Cerebral memory and session logs
- [x] Sub-agent orchestration is optional, not foundational

---

## 11. Phase 9: Composition Helpers

Build objective: preserve donor wiring ideas as optional startup scaffolding, not a mandatory DI rewrite.

### File creation order

108. [x] `C:\Cerebral\runtime\composition\Container.ts`
         Source: donor blueprint from `C:\Tools\files2extract\composition\Container.ts`
         Action: `ADAPT`
         Required edit: keep optional and local to the staged runtime area

109. [x] `C:\Cerebral\runtime\composition\bootstrap.ts`
         Source: donor blueprint from `C:\Tools\files2extract\composition\bootstrap.ts`
         Action: `ADAPT`
         Required edit: document as a staging/bootstrap reference, not a daemon startup replacement

110. [ ] `C:\Cerebral\runtime\composition\registerCore.ts`
         Source: `C:\Tools\files2extract\composition\registerCore.ts`
         Action: `REFERENCE ONLY`

111. [ ] `C:\Cerebral\runtime\composition\registerAgent.ts`
         Source: `C:\Tools\files2extract\composition\registerAgent.ts`
         Action: `REFERENCE ONLY`

112. [ ] `C:\Cerebral\runtime\composition\registerTools.ts`
         Source: `C:\Tools\files2extract\composition\registerTools.ts`
         Action: `REFERENCE ONLY`

113. [ ] `C:\Cerebral\runtime\composition\registerMCP.ts`
         Source: `C:\Tools\files2extract\composition\registerMCP.ts`
         Action: `REFERENCE ONLY`

114. [ ] `C:\Cerebral\runtime\composition\registerMemory.ts`
         Source: `C:\Tools\files2extract\composition\registerMemory.ts`
         Action: `REFERENCE ONLY`

115. [ ] `C:\Cerebral\runtime\composition\registerTracing.ts`
         Source: `C:\Tools\files2extract\composition\registerTracing.ts`
         Action: `REFERENCE ONLY`

116. [ ] `C:\Cerebral\runtime\composition\registerSubAgents.ts`
         Source: `C:\Tools\files2extract\composition\registerSubAgents.ts`
         Action: `REFERENCE ONLY`

### Phase 9 Gate

- [x] Composition helpers remain optional
- [x] No global DI pattern is imposed on the Python daemon
- [x] Staged runtime remains subordinate to Cerebral’s existing control plane

---

## 12. Deferred And Explicitly Excluded Items

Do not implement these in the first execution cycle.

- [ ] Do not activate `C:\Cerebral\runtime\policies\LLMCommandEvaluator.ts`
- [ ] Do not activate `C:\Cerebral\runtime\memory\embeddings\OpenAIProvider.ts`
- [ ] Do not import CLI or Web server donor surfaces into the live daemon path
- [ ] Do not adopt donor package dependencies just to make staged files executable

---

## 13. First Sprint Slice

If you want the smallest useful implementation slice, do only these items first:

- [x] Complete Phase 0
- [x] Complete items 1 through 20
- [x] Complete items 21 through 34
- [x] Complete items 35 through 45

This yields:

- staged runtime vocabulary
- staged tool contracts and approval bridge
- staged task event normalization
- staged tracing and redaction layer

without touching MCP, memory indexing, or sub-agent execution.

---

## 14. Completion Definition

This checklist is complete only when all of these are true:

- [x] Every staged donor file is either copied, adapted, deferred, or explicitly excluded
- [x] Every wrapper file exists for each adapted runtime surface
- [x] No staged file has replaced the live Python control path
- [x] The runtime staging area is fully documented in the manifest
- [ ] Integration into the daemon happens only after the staging phases have passed their gates
