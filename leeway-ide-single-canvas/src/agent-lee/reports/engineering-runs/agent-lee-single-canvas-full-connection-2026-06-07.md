<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: EVIDENCE
TAG: EVIDENCE.TRACER_PACK.AGENT_LEE_SINGLE_CANVAS_FULL_CONNECTION
PURPOSE: Trace Agent Lee single-canvas control and Omni-Terminal Fabric IDE repair.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# Agent Lee Single-Canvas Full Connection Tracer Pack

- Trace ID: `LEEWAY_TRACE::IDE_SINGLE_CANVAS::AGENT_LEE_FULL_CONNECTION::20260607T000000Z::CODX001`
- Actor ID: `LEEWAY_ACTOR::ASSISTANT_BODY::CODEX::GPT5`
- Prompt ID: `LEEWAY_PROMPT::USER::IDE_SINGLE_CANVAS_AGENT_LEE_CONTROL::C30FBFE9`
- Intent ID: `LEEWAY_INTENT::IDE_SINGLE_CANVAS::AGENT_LEE_CONTROL_AND_OMNI_TERMINAL::FULL_CONNECTION`
- Transaction ID: `LEEWAY_TX::IDE_SINGLE_CANVAS::CONNECT_AGENT_LEE_APP_LAYER::20260607T000000Z::CODX001`
- Authority ID: `LEEWAY_AUTHORITY::OWNER_REQUEST::APPLICATION_REPAIR::LEEWAY_IDE_SINGLE_CANVAS`
- Node touched: `LEEWAY_APP::IDE_SINGLE_CANVAS::AGENT_LEE_CONTROL::APPLICATION_CONTROL_LAYER`
- Pipeline touched: `IDE_SINGLE_CANVAS -> AGENT_LEE_CONTROL -> OMNI_TERMINAL_SURFACE -> RECEIPT_EVIDENCE`
- Classification: `EVIDENCE`
- Gate target: `LEEWAY_GATE::IDE_SINGLE_CANVAS::APPLICATION_INTEGRITY`
- Receipt path: `leeway-ide-single-canvas/src/agent-lee/receipts/agent-lee-single-canvas-full-connection-2026-06-07.receipt.json`
- Human review status: `OWNER_REQUESTED`
- Initial result: `IN_PROGRESS`

## Required Truth Boundaries

- Runtime status must use the Runtime Fabric health bridge or show an explicit required/not-connected state.
- Device registry, terminal sessions, command execution, and receipts must not be faked.
- Agent Lee may control local IDE UI state directly, but real command execution requires Runtime Fabric or Local Device Bridge receipts.

## Planned Active Nodes

- `LEEWAY_APP::IDE_SINGLE_CANVAS::AGENT_LEE_CONTROL::APPLICATION_CONTROL_LAYER`
- `LEEWAY_APP::IDE_SINGLE_CANVAS::OMNI_TERMINAL::NODE_PALETTE`
- `LEEWAY_APP::IDE_SINGLE_CANVAS::OMNI_TERMINAL::NODE_RENDERER`
- `LEEWAY_APP::IDE_SINGLE_CANVAS::OMNI_TERMINAL::SETTINGS_SURFACE`
- `LEEWAY_APP::IDE_SINGLE_CANVAS::RUNTIME_TRUTH::STATUS_BRIDGE`
- `LEEWAY_APP::IDE_SINGLE_CANVAS::TERMINAL::GLOBAL_CONSOLE`

## Evidence Updates

- Implemented Agent Lee local application-control layer for studio navigation, palette opening, Live Wallet/content studio opening, terminal console opening, settings navigation, node placement, wallet-item placement, sequential node connection, node expansion/collapse, and command-plan request routing.
- Implemented Omni-Terminal Fabric IDE surface with session, device, command, monitor, and governance node categories. Runtime, terminal sessions, device registry, command execution, and receipts now show required/not-connected states unless Runtime Fabric or Local Device Bridge returns live data.
- Implemented Runtime Fabric proxy paths under `/api/leeway/runtime-fabric/*` and explicit fallback statuses: `RUNTIME_FABRIC_UNREACHABLE`, `OMNI_TERMINAL_FABRIC_REQUIRED`, `LOCAL_DEVICE_BRIDGE_REQUIRED`, `NO_TERMINAL_SESSIONS`, `NO_DEVICE_REGISTRY_BOUND`, and `COMMAND_RECEIPT_REQUIRED`.
- Implemented global console as a command-plan request surface instead of fake local terminal output.
- Implemented Settings Omni-Terminal tab for runtime endpoint, bridge status, session/device/tag truth, protocol bridge status, execution policy, and terminal theme controls.
- Implemented Agent Lee overlay integration so prompts can drive app navigation and canvas/node operations before falling through to runtime chat.
- Verification: `npm run build` passed and emitted Vite client/server artifacts. Vite reported a large chunk warning.
- Verification: `npm run lint` is blocked by existing unrelated TypeScript errors in governance law imports, persona prompt-builder export, VS Code extension narrowing, and ForgeStudio WorkflowNode typing. The initial `ignoreDeprecations` incompatibility in `tsconfig.json` was repaired.
- Browser smoke: updated app verified at `http://127.0.0.1:3001`. Agent Lee prompt `lay down terminal fabric nodes and connect nodes` opened the Terminal Fabric palette and placed connected Omni-Terminal nodes on canvas while retaining `RUNTIME_FABRIC_UNREACHABLE` truth state.
- Evidence screenshot: `leeway-ide-single-canvas/src/agent-lee/reports/browser/agent-lee-single-canvas-full-connection-2026-06-07.png`.
- Receipt written: `leeway-ide-single-canvas/src/agent-lee/receipts/agent-lee-single-canvas-full-connection-2026-06-07.receipt.json`.

## Final Result

- Final status: `IMPLEMENTED_WITH_EXTERNAL_RUNTIME_BLOCKERS`
- Remaining external blockers: Runtime Fabric and Local Device Bridge must be started/configured for real command execution, terminal sessions, device registry, and command receipts.
- Operational URL verified: `http://127.0.0.1:3001`
