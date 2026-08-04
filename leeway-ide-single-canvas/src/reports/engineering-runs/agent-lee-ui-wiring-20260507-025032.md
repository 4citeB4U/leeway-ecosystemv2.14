# Agent Lee UI Wiring Receipt

- Generated: 2026-05-07T02:50:32-05:00
- Scope: `agent-lee/vscode-extension/src/extension.ts`
- Request: Make the real Agent Lee UI interactive, remove the lock badge, and move Quiet Laptop behavior out of the VS Code status bar.

## Edits

- Removed the duplicate Agent Lee runtime status bar item.
- Removed the visible performance governor status bar registration that showed `Lee quiet_laptop`.
- Routed `agentLee.open`, `agentLee.openPanel`, and `agentLee.openSidebar` to the contributed Agent Lee sidebar view.
- Removed the header auto-run lock badge and the JavaScript that updated it.
- Added performance profile controls inside Agent Lee settings.
- Added webview handling for setting the performance profile from the settings panel.

## Commands

- `npm run compile`
  - Result: PASS
- `npm run bundle`
  - Result: PASS
- `npx vsce package`
  - Result: PASS
  - Output: `agent-lee-leeway-coding-system-1.1.2.vsix`

## Verification

- TypeScript compilation completed successfully.
- Extension bundle rebuilt at `agent-lee/vscode-extension/dist/extension.js`.
- VSIX packaging completed successfully.
