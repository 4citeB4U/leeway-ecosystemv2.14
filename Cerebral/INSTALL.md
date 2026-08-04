# Cerebral Desktop Commander — Windows 11

## Prerequisites

- Windows 11
- Python 3.10+ (64-bit)
- PowerShell 5.1+

## 1. Install Python dependencies

Open PowerShell:

```
cd C:\Cerebral
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

## 2. Configuration

- Review `config\policy.json` for allowed actions.
- Optional: set `CEREBRAL_FOUNDRY_BASE` if Foundry is not auto-discovered.

## 3. Run the daemon

```
cd C:\Cerebral
.venv\Scripts\Activate.ps1
python CerebralDaemon.py
```

- API + UI are available at: http://127.0.0.1:8765

## 4. Optional MCP server

```
cd C:\Cerebral
.venv\Scripts\Activate.ps1
python cerebral_mcp_server.py
```

## 5. Run as a Windows Service (optional)

- Use NSSM or Task Scheduler to run at login.
- Example with NSSM:
  ```
  C:\Cerebral\tools\nssm.exe install CerebralDaemon "C:\Cerebral\.venv\Scripts\python.exe" "C:\Cerebral\CerebralDaemon.py"
  ```

## 6. Logs

- Health snapshots: `C:\Cerebral\logs\health.ndjson`
- Policy audit: `C:\Cerebral\logs\bridge_audit.jsonl`
- Memory store: `C:\Cerebral\memory.json`

## 7. Verify

- Open http://127.0.0.1:8765/health
- Open http://127.0.0.1:8765/api/health
- Open http://127.0.0.1:8765/tools/status
