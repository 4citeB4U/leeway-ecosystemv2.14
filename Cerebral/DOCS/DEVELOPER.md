# Developer Notes

Files of interest

- `CerebralDaemon.py` — main Flask/Waitress daemon (UI + API + Task Spine)
- `task_spine.py` — multi-step orchestration and verification logic
- `tool_router.py` — JSON tool contract parser and dispatcher
- `model_router.py` — Foundry discovery + per-task LLM routing
- `agent-lee-os2/src/services/ai.ts` — frontend chat/TTS API client

Environment

- Use `.venv` at repo root: `pip install -r requirements.txt`.
- Vite env overrides: `agent-lee-os2/.env.local` (optional).

Common tasks

- Run daemon:
  ```powershell
  .venv\Scripts\Activate.ps1
  python CerebralDaemon.py
  ```
- Run MCP server (optional):
  ```powershell
  .venv\Scripts\Activate.ps1
  python cerebral_mcp_server.py
  ```
- Build frontend and mirror to `www/`:
  ```powershell
  cd agent-lee-os2
  npm ci
  npm run build
  cd ..
  robocopy agent-lee-os2\dist www /MIR
  ```

Debugging quick checks

- `GET /api/health` — daemon + Foundry status
- `GET /tools/status` — DesktopHands + MCP + Vision availability
- `GET /api/telemetry` — system metrics and history

Testing

- `tests/e2e_test.ipynb` exercises chat, TTS, and file endpoints.
