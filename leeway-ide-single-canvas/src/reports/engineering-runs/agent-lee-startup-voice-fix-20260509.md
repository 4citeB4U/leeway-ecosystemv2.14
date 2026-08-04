<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: REPORT.ENGINEERING.STARTUP_VOICE_FIX
DISCOVERY_PIPELINE:
  Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Receipt for Agent Lee startup voice fix and verification.
-->

# Agent Lee Startup Voice Fix Receipt

- Date: 2026-05-09
- Scope: Remove robotic startup copy and align Agent Lee's opening with the intended grounded voice.

## Pending edits applied

- Replaced the hard-coded empty-chat intro in `agent-lee/vscode-extension/src/extension.ts`.
- Replaced the empty chat participant fallback in `agent-lee/vscode-extension/src/extension.ts`.
- Added persona bridge replacements to suppress `alive in the runtime` and `Point me at...` phrasing if it reappears from prompt output.
- Added a prompt law in `agent-lee/vscode-extension/src/persona/persona-runtime-bridge.ts` to block runtime self-announcement style openings.

## Verification commands

- `npm run compile`
  - Result: PASS
- `npx vsce package`
  - Result: PASS

## Notes

- The exact robotic startup line was hard-coded in the extension bootstrap rather than only emerging from the model.
- Existing unrelated edits were already present in the working tree before this receipt.
