<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: CORE.REPORTS.ENGINEERING.DOCTOR_UI_VOICE_UPDATE
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# Agent Lee Doctor UI Voice Update Receipt

- Date: 2026-05-09
- Extension version packaged and installed: `1.1.6`
- Doctor report root moved to: `reports/Doctor`

## Applied changes

- Updated Doctor output generation to write new runs under `reports/Doctor/doctor-YYYYMMDD-HHmmss`.
- Updated runtime Doctor-status discovery to read the latest report from `reports/Doctor`.
- Moved existing top-level `reports/doctor-*` folders into `reports/Doctor/`.
- Switched the extension entrypoint to `out/extension.js`.
- Updated the compile flow to use `tsc -p ./`.
- Packaged and installed `agent-lee-leeway-coding-system-1.1.6.vsix`.

## Verification

- `npm.cmd run compile` completed successfully in `agent-lee/vscode-extension`.
- VSIX package created at `agent-lee/vscode-extension/agent-lee-leeway-coding-system-1.1.6.vsix`.
- VS Code extension install completed successfully with `--force`.
- Clone voice test completed successfully and wrote audio to `agent-lee/voice/agent-lee-live-clone.wav`.

## Clone voice line

`I am Agent Lee. I currently have three active subsystem families in this runtime: Agent Lee Internal, Workspace, and Antigravity.`
