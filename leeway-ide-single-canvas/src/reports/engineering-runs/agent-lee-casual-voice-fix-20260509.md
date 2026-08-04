<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: REPORT.ENGINEERING.CASUAL_VOICE_FIX
DISCOVERY_PIPELINE:
  Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Receipt for Agent Lee casual conversation, startup tone, and default voice runtime fix.
-->

# Agent Lee Casual Conversation And Voice Fix Receipt

- Date: 2026-05-09
- Scope: Remove robotic startup phrasing, keep casual conversation out of the execution lane, reduce response latency for simple chat, and align runtime speech with the intended male Piper model.

## Pending edits applied

- Updated `agent-lee/vscode-extension/src/extension.ts` so grounded/neutral chat no longer gets wrapped with robotic labels like `Execution path:`.
- Updated `agent-lee/vscode-extension/src/extension.ts` so identity replies are conversational instead of machine-rollcall introductions.
- Added relationship-aware direct reply handling in `agent-lee/vscode-extension/src/extension.ts` for prompts like `you don't know anything about me`.
- Updated `agent-lee/vscode-extension/src/extension.ts` so simple casual chat uses immediate local replies instead of the slower model-backed engineering lane.
- Updated `agent-lee/voice/voice-runtime.json` to use `en_US-hfc_male-medium`.
- Updated `agent-lee/voice/VOICE_LOCK.md` to match the live runtime voice selection.

## Verification and deployment commands

- `npm run compile`
  - Working directory: `agent-lee/vscode-extension`
  - Result: PASS
- `.\agent-lee\scripts\Install-AgentLeeVSIX.ps1 -LiveProfile`
  - Result: PASS

## Notes

- The live VS Code profile now points at the packaged extension built from the updated source.
- The voice runtime now matches the male-model expectation already described in the packaged validation guide.
