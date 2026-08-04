# ARCHITECTURE RULES: CEREBRAL + AGENT LEE OS

## 1. Identity and location

- **Cerebral** (C:\Cerebral): Local executor, policy gate, and audit logger.
- **Agent Lee OS**: Orchestrator UI and planning layer that delegates to Cerebral.

## 2. Connectivity and delegation

- Agent Lee OS MUST NOT control the desktop directly.
- All desktop actions must be delegated to Cerebral via the local API.
- Preferred endpoints:
  - `/api/chat` for unified intent routing
  - `/api/task` for explicit multi-step execution
  - `/api/desktop/*` for direct desktop operations

## 3. Execution flow

1. User requests a task via Agent Lee OS.
2. Agent Lee OS sends the request to Cerebral (chat or task endpoints).
3. Cerebral classifies intent, checks policy tiers, and executes tools if allowed.
4. Results are logged and returned to the requester.

## 4. Restrictions

- NEVER automate Chrome Remote Desktop itself.
- High-risk actions (keyboard injection, shell execution, destructive file ops) require explicit approval.
- File operations are limited to the policy-defined roots.

## 5. Model and voice policy

- LLM routing uses local Foundry via `model_router.py`.
- Voice uses Kokoro ONNX with edge-tts and SAPI fallbacks.
- Avoid introducing external cloud dependencies without explicit opt-in.
