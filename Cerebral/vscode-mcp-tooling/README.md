<!-- LEEWAY HEADER BLOCK -->
<!-- File: vscode-mcp-tooling/README.md -->
<!-- Purpose: Agent Lee OS MCP tooling documentation -->
<!-- Security: LEEWAY-CORE-2026 compliant -->
<!-- Performance: Optimized for sovereign agentic MCP tooling -->
<!-- Discovery: Part of Agent Lee OS compliance pipeline -->
<!--
LEEWAY HEADER BLOCK
File: vscode-mcp-tooling/README.md
Purpose: MCP Tooling documentation for Agent Lee OS
Security: LEEWAY-CORE-2026 compliant
Performance: Sovereign MCP integration
Discovery: Part of Agent Lee OS documentation
-->

# VS Code MCP Tooling

VS Code MCP Tooling (C:\Cerebral\vscode-mcp-tooling)

Keys:

- stored in: C:\Cerebral\vscode-mcp-tooling\.env.local (optional)
- loaded at runtime by: src/dotenv.js

Run (from this folder):

```powershell
npm run testsprite
npm run playwright
npm run insforge
npm run stitch
```

Optional local HTTP bridge:

```powershell
node src/bridge.js
```

Example bridge request:

```
POST http://127.0.0.1:3737/run/testsprite
```
