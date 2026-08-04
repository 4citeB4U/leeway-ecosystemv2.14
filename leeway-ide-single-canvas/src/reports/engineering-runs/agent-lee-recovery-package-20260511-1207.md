<!--
LEEWAY_HEADER - DO NOT REMOVE
REGION: 🟢 CORE
TAG: CORE.RECOVERY.RECEIPT.20260511
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
PURPOSE: Receipt for runtime-governance recovery package edits and verification.
-->

# Agent Lee Recovery Package Receipt

- Generated: 2026-05-11T12:07:00-05:00
- Workspace: `C:\Users\Leona\.leeway-vscode`
- Scope: runtime truth alignment, quarantine boundaries, and context poisoning reduction

## Edits

- Updated [agent-lee/vscode-extension/tsconfig.json](/C:/Users/Leona/.leeway-vscode/agent-lee/vscode-extension/tsconfig.json) to exclude `_archive` plus `backup` and `broken` TypeScript artifacts from compile surfaces.
- Updated [agent-lee/vscode-extension/.vscodeignore](/C:/Users/Leona/.leeway-vscode/agent-lee/vscode-extension/.vscodeignore) to exclude `_archive`, `.vsix`, `_vsix_inspect`, and broken compiled outputs from package surfaces.
- Updated [agent-lee/vscode-extension/src/knowledge/leewayRepoIndexer.ts](/C:/Users/Leona/.leeway-vscode/agent-lee/vscode-extension/src/knowledge/leewayRepoIndexer.ts) to skip `reports`, `knowledge`, `memory`, `logs`, `backups`, `patches`, `sandbox`, and `_archive`.
- Updated [agent-lee/vscode-extension/src/core/file-intelligence.ts](/C:/Users/Leona/.leeway-vscode/agent-lee/vscode-extension/src/core/file-intelligence.ts) with the same archive and report ignore boundaries for live prompt sampling.
- Updated [agent-lee/scripts/Invoke-AgentLeeDoctor.ps1](/C:/Users/Leona/.leeway-vscode/agent-lee/scripts/Invoke-AgentLeeDoctor.ps1) to validate the current canonical runtime path `out/extension.js` and wildcard activation instead of stale `dist` and old activation assumptions.
- Added [agent-lee/scripts/Invoke-AgentLeeQuarantineRecovery.ps1](/C:/Users/Leona/.leeway-vscode/agent-lee/scripts/Invoke-AgentLeeQuarantineRecovery.ps1) as a dry-run-safe quarantine mover that preserves evidence under `_archive`.

## Verification

- `npm.cmd run compile` in `agent-lee/vscode-extension`: passed.
- `powershell -ExecutionPolicy Bypass -File agent-lee/scripts/Invoke-AgentLeeQuarantineRecovery.ps1 -WorkspaceDir c:\Users\Leona\.leeway-vscode -DryRun`: passed.
- Dry-run quarantine receipt written to [quarantine-recovery-20260511-120546.md](/C:/Users/Leona/.leeway-vscode/reports/engineering-runs/quarantine-recovery-20260511-120546.md).
- `powershell -ExecutionPolicy Bypass -File agent-lee/scripts/Invoke-AgentLeeDoctor.ps1 -WorkspaceDir c:\Users\Leona\.leeway-vscode -SkipBuild -SkipPackage`: passed.
- Updated doctor report written to [AGENT_LEE_DOCTOR.md](/C:/Users/Leona/.leeway-vscode/reports/Doctor/doctor-20260511-120611/AGENT_LEE_DOCTOR.md).

## Result

- Doctor runtime-truth failures dropped from `7` to `4` without touching feature behavior.
- Remaining blocking failures are now concentrated in active runtime issues rather than mixed historical assumptions:
- Missing `AGENT_LEE_UI_VERSION`
- `extension.ts` direct notification bypasses
- backup/broken source still present until quarantine is actually executed
- LeeWay blocking file count remains `32`
