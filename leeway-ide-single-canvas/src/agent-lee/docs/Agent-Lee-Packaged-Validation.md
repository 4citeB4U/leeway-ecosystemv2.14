<!--
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.DOCS.AGENT_LEE_PACKAGED_VALIDATION
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
-->

# Agent Lee Packaged Validation And Reuse Guide

This guide shows how to build, install, launch, validate, and document a packaged VS Code agent like Agent Lee using a repeatable PowerShell workflow.

## What this validates

- The extension compiles and packages into a `.vsix`
- The packaged `.vsix` installs into an isolated VS Code profile
- VS Code launches with only the packaged extension profile
- Agent Lee UI commands can be exercised from inside the VS Code window
- Runtime evidence is collected from logs and chat memory after the run

## Script set

Scripts live in [scripts](</c:/Users/Leona/.leeway-vscode/agent-lee/scripts>).

- `Build-AgentLeeVSIX.ps1`
  Builds the extension and creates the packaged VSIX.
- `Install-AgentLeeVSIX.ps1`
  Installs the VSIX into an isolated VS Code profile and extension directory.
- `Launch-AgentLee-Isolated.ps1`
  Opens VS Code against an isolated profile without changing a normal user install.
- `Invoke-AgentLeeUIClickthrough.ps1`
  Starts VS Code and drives a basic command-palette click-through for Agent Lee.
- `Invoke-AgentLeeCurrentWindowClickthrough.ps1`
  Drives the same command-palette validation against an already visible VS Code window.
- `Collect-AgentLeeEvidence.ps1`
  Copies logs, chat memory, and extension inventory into a timestamped report folder.
- `Run-AgentLeePackagedValidation.ps1`
  Full one-command packaged validation runner.

## One-command validation

```powershell
cd C:\Users\Leona\.leeway-vscode\agent-lee\scripts
.\Run-AgentLeePackagedValidation.ps1
```

## Manual UI click-through

If you want a human-guided validation instead of the scripted command-palette flow:

1. Build the VSIX.
2. Install it into an isolated profile.
3. Launch VS Code with that isolated profile.
4. Open the Agent Lee activity-bar icon.
5. Confirm the history dropdown loads.
6. Click `New Chat`.
7. Confirm the voice status shows a LeeWay clone route, not a foreign speech engine.
8. Confirm the hive status row loads.
9. Ask a coding question.
10. Confirm chat memory is appended as one conversation thread.

## If isolated desktop automation does not attach

Some Windows setups allow the packaged install and launch to succeed, but do not expose the clean-profile window in a way PowerShell can activate reliably. In that case:

1. Install the VSIX into the normal VS Code profile.
2. Open a visible VS Code window.
3. Run:

```powershell
cd C:\Users\Leona\.leeway-vscode\agent-lee\scripts
.\Invoke-AgentLeeCurrentWindowClickthrough.ps1 -WindowTitleContains "Visual Studio Code"
```

That still gives you a real UI click-through against the live VS Code window.

## Files to inspect after a run

- Packaged VSIX:
  [agent-lee-1.1.0-sovereign-runtime.vsix](/c:/Users/Leona/.leeway-vscode/agent-lee/vscode-extension/agent-lee-1.1.0-sovereign-runtime.vsix)
- Runtime logs:
  [logs/agent-lee](</c:/Users/Leona/.leeway-vscode/logs/agent-lee>)
- Conversation memory:
  [memory/chats](</c:/Users/Leona/.leeway-vscode/memory/chats>)
- Validation reports:
  [reports](</c:/Users/Leona/.leeway-vscode/agent-lee/reports>)

## How to adapt this for another agent

1. Replace the extension path in `Build-*.ps1`.
2. Change the packaged VSIX name if needed.
3. Update the command-palette steps in `Invoke-AgentLeeUIClickthrough.ps1`.
4. Point evidence collection at that agent's log and memory folders.
5. Keep isolated `--user-data-dir` and `--extensions-dir` paths so test runs never contaminate a normal VS Code profile.

