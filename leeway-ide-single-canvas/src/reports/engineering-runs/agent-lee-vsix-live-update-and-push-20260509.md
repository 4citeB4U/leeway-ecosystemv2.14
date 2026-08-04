<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: CORE
TAG: REPORT.ENGINEERING.VSIX_LIVE_UPDATE_PUSH
DISCOVERY_PIPELINE:
  Voice -> Intent -> Location -> Vertical -> Ranking -> Render
PURPOSE: Receipt for fixing the Agent Lee VSIX update path, installing the live extension build, and publishing the branch.
-->

# Agent Lee VSIX Live Update And Push Receipt

- Date: 2026-05-09
- Scope: Ensure source updates become live in VS Code by rebuilding and reinstalling the packaged extension, then publish the branch to GitHub.

## Pending edits applied

- Updated `agent-lee/scripts/Build-AgentLeeVSIX.ps1` to verify the real bundled artifact at `dist/extension.js`.
- Updated `agent-lee/scripts/Install-AgentLeeVSIX.ps1` so install runs rebuild automatically when `-VsixPath` is omitted.
- Updated `agent-lee/scripts/Install-AgentLeeVSIX.ps1` so the install path captures the final VSIX path instead of the whole build console stream.

## Verification and deployment commands

- `.\agent-lee\scripts\Build-AgentLeeVSIX.ps1`
  - Result: PASS
- `.\agent-lee\scripts\Install-AgentLeeVSIX.ps1 -LiveProfile`
  - Result: PASS
- `git push`
  - Result: pending until command execution completes

## Notes

- The live VS Code profile install succeeded for `agent-lee-leeway-coding-system-1.1.3.vsix`.
- The repository ignores `reports/` by default, so this receipt must be force-added if it is committed.
