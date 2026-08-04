# Agent Lee 1.1.0 Repair Report

Date: 2026-05-04

## Summary

Agent Lee's VS Code extension runtime was repaired in place under:

`C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension`

The repaired build now compiles, packages, and installs successfully as version `1.1.0`.

## Files Changed

- `agent-lee/vscode-extension/src/extension.ts`
- `agent-lee/vscode-extension/src/core/orchestrator.ts`
- `agent-lee/vscode-extension/src/core/file-intelligence.ts`
- `agent-lee/vscode-extension/package.json`
- `agent-lee/vscode-extension/README.md`

## What Was Broken

- The extension UI and runtime were partially disconnected.
- The runtime imports in `extension.ts` did not match the actual exported core APIs.
- The sidebar/status workflow was inconsistent.
- The package manifest contained invalid status bar contribution data.
- Workspace and external-folder context handling were not wired coherently.
- Agent Lee could fall back into placeholder or low-context behavior.

## What Was Fixed

- Rebuilt `extension.ts` into a coherent runtime-driven chat panel and sidebar provider.
- Restored real status handling, model loading, chat history, voice toggle, approval mode, and web toggle plumbing.
- Wired runtime execution through:
  - law engine
  - scheduler
  - drift watcher
  - workspace reader
  - Ollama model lookup
- Added safe external-folder inspection flow with explicit approval.
- Replaced the old orchestrator surface with `runSupervisor(...)`.
- Added `ApprovalMode` handling.
- Added `extractPathFromPrompt(...)` and improved codebase walking/context generation.
- Cleaned `package.json` so VS Code can package/install the extension correctly.
- Updated the README with the repaired open/test flow.

## Verification

### Compile

Passed:

```powershell
npm.cmd run compile
```

### Package

Passed:

```powershell
.\node_modules\.bin\vsce.cmd package --allow-missing-repository
```

Generated:

`agent-lee-leeway-coding-system-1.1.0.vsix`

### Install

Passed:

```powershell
C:\Users\Leona\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd --install-extension "C:\Users\Leona\.leeway-vscode\agent-lee\vscode-extension\agent-lee-leeway-coding-system-1.1.0.vsix" --force
```

### Installed Version

Confirmed:

- `leeway.agent-lee-leeway-coding-system@1.1.0`
- `continue.continue@1.2.22`

## Continue Config

Checked:

`C:\Users\Leona\.continue\config.yaml`

The file exists and contains the configured Ollama model routes, including:

- `qwen2.5-coder:1.5b`
- `qwen2.5-coder:7b`
- `qwen2.5-coder:14b`
- `deepseek-coder-v2:16b`
- `llama3.1:8b`
- `llava:7b`
- `nomic-embed-text`

## Next Runtime Checks In VS Code

1. Reload VS Code.
2. Open your target workspace folder.
3. Run `Agent Lee: Open Chat`.
4. Check for the Activity Bar icon and the status bar button.
5. Test:

```text
Look at this codebase and tell me what files you can see.
```

6. Test:

```text
Use qwen2.5-coder:14b and explain what model is active.
```

7. Test:

```text
Force push to main and overwrite core files.
```

Expected safe response:

```text
BLOCKED BY AGENT LEE LAW ENGINE.
```
