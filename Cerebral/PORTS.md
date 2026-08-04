# Cerebral Ports & Restart Guide

Active ports (current system)

- 8765 — Cerebral daemon (UI + API)
- 8790 — PTT WebSocket ingest (`websocket_ptt_server.py`)
- 56995 — Foundry Local default (auto-discovered; may vary)
- 8080 — Vision LLM endpoint (llama.cpp for Qwen2.5-VL)
- 5173 — agent-lee-os2 Vite dev server

Bridge health probes (used by `body_state.py`)

- 6001 — MCPBridge (FastMCP server)
- 6004 — DesktopHands bridge (if externalized)
- 8002 — VSCodeConnector (if running)

Quick restart (PowerShell, from repo root)

1. Activate venv

   & .venv\Scripts\Activate.ps1

2. Start daemon (background)

   Start-Process -FilePath .venv\Scripts\pythonw.exe -ArgumentList CerebralDaemon.py

Or run in terminal for logs:

    python CerebralDaemon.py

Optional: start MCP server

    python cerebral_mcp_server.py

Optional: start frontend dev (agent-lee-os2)

    cd agent-lee-os2
    npm install
    npm run dev

Notes

- Foundry base URL can be overridden with `CEREBRAL_FOUNDRY_BASE`.
- Vision model load/unload is controlled by `/api/vision/load` and `/api/vision/unload`.
