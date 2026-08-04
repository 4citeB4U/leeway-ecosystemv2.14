# FastAPI Hybrid Backend Scaffold

## Features

- Serves static React frontend from `agent-lee-os2/dist`
- Exposes `/api/*` endpoints for health, settings, TTS, vision, telemetry, ports
- Integrates edge-tts for speech synthesis (stubbed)
- Ready for vision/emotion/slang module integration

## Quickstart

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8765
   ```

3. Access frontend and API:
   - Frontend: [http://localhost:8765/](http://localhost:8765/)
   - API: [http://localhost:8765/api/health](http://localhost:8765/api/health)

## Next Steps

- Implement edge-tts logic in `/api/tts/speak`
- Integrate vision/emotion/slang modules
- Add real settings and telemetry logic
- Add `/api/tts/events` endpoint

## Deployment

- Works with Cloudflare tunnel for public access
- Designed for Windows, but cross-platform with FastAPI

---

This scaffold is ready for hybrid full-stack integration.
