<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: REPORT.ENGINEERING.LIVE_INSTALL
DISCOVERY_PIPELINE:
  Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Receipt for live-profile Agent Lee VSIX install and runtime verification.
-->

# Agent Lee Live Install Receipt

- Date: 2026-05-09
- Scope: Build, package, install, and verify the updated Agent Lee extension in the live VS Code profile.

## Commands

- `npm run compile`
  - Result: PASS
- `npx vsce package`
  - Result: PASS
- `agent-lee\scripts\Install-AgentLeeVSIX.ps1 -VsixPath agent-lee\vscode-extension\agent-lee-leeway-coding-system-1.1.3.vsix -LiveProfile`
  - Result: PASS

## Live verification

- Installed extension listed by VS Code:
  - `leeway.agent-lee-leeway-coding-system@1.1.3`
- Installed live bundle path:
  - `C:\Users\Leona\.vscode\extensions\leeway.agent-lee-leeway-coding-system-1.1.3\dist\extension.js`
- Verified updated startup strings exist in the installed live bundle:
  - `I got you. Show me what's breaking or what you're trying to build, and we'll work it clean.`
  - `What's the move? Show me what's breaking or what you're trying to build.`

## Notes

- The previous mismatch came from installing only into an isolated validation profile instead of the live VS Code profile.
- The installer script now supports `-LiveProfile` so future updates can target the real extension location intentionally.
