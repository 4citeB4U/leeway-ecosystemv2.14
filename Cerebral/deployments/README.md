# Qwen3 Family — Alibaba Model Studio / Z.AI Deployment Templates

These templates are optional external deployments for Qwen3 MCP agents.
They are not wired into the core Cerebral daemon by default.

Files in this folder:

- `qwen3-health.yaml` — Health Monitor MCP (qwen3-0.6b)
- `qwen3-coder.yaml` — Coder / Repair MCP (qwen3-coder-1.5b)
- `qwen3-vision.yaml` — Vision / Visual QA MCP (qwen3-vl-2b)

Quick deploy steps

1. Open Alibaba Cloud Model Studio / Z.AI and create a new agent deployment.
2. Paste the contents of one of the YAML files into the deployment editor.
3. Provide the required API key(s) as deployment secrets.
4. Deploy and copy the endpoint URL.
5. Integrate the endpoint in your external MCP router or gateway.

Notes

- These deployments are intended for external MCP routing, not for direct use by `CerebralDaemon.py`.
- If you plan to proxy them through Cerebral, add a new tool in `cerebral_mcp_server.py` or a dedicated adapter module and route requests accordingly.
