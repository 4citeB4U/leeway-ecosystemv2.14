# LeeWay Local Assistant Bridge Pack

This pack connects the GitHub Pages LeeWay CRM to your local Docker/Ollama/LeeWay ecosystem.

## Layers

1. `scripts/01-create-local-bridge-files.ps1`
   - Creates `C:\LeeWay\local-assistant-bridge`
   - Writes bridge source files
   - Writes Docker Compose file

2. `scripts/02-build-and-run-bridge.ps1`
   - Builds the Docker bridge
   - Starts the container
   - Tests `/health`

3. `scripts/03-test-and-connect-crm.ps1`
   - Tests local model calls through the bridge
   - Prints the CRM settings to use

## Default ports

- Bridge: `8787`
- Ollama: `11434`
- Runtime Fabric: `4001`
- Hybrid Fabric: `8777`
- Media Ingestion: `5300`
- Media Router: `5301`
- Agent Centers: `8860-8863`
- Voice Kernel: `8092`
- Vision Kernel: `8093`

## CRM Settings

In the CRM, use:

- Connection Mode: `LeeWay Bridge`
- Bridge URL: `http://YOUR-PC-IP:8787` or the actual LAN IP printed by the script
- Default Model: `qwen3:latest`
- Vision Model: `qwen2.5vl:7b`

On Android, open `http://YOUR-PC-IP:8787/health` first in the browser. If the health JSON loads, the bridge is reachable from your phone on the same Wi-Fi network.

## Notes

GitHub Pages is HTTPS. Some phones/browsers may block direct HTTP calls to your PC.
For stable field use, use Tailscale or a secure tunnel to expose the bridge privately.
