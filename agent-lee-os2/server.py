"""
Agent Lee OS2 - Embodiment & Presence Layer
Port: 5100
Authority: ZERO execution authority - READ-ONLY display surface

This service is the canonical Agent Lee embodiment/presence layer.
It displays system health, provides chat interface, and generates voice output.
It has ZERO execution authority - all system operations route through Execution Broker.

Architecture Position:
- Polls Runtime Fabric (4001) for health data
- Subscribes to Runtime Fabric SSE stream for real-time updates
- Routes chat to Agent Lee Router (8080)
- Generates TTS output via desktop runtime (8091)
- Displays telemetry and system state
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import httpx
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Lee OS2", version="1.0.0")

# CORS - Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
RUNTIME_FABRIC_URL = "http://127.0.0.1:4001"
AGENT_LEE_ROUTER_URL = "http://127.0.0.1:8080"
DESKTOP_RUNTIME_URL = "http://127.0.0.1:8091"
HEALTH_POLL_INTERVAL = 5  # seconds

# State
health_snapshot: Optional[Dict] = None
recent_events: List[Dict] = []
websocket_clients: List[WebSocket] = []


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "ok": True,
        "service": "agent-lee-os2",
        "port": 5100,
        "authority": "ZERO - READ-ONLY DISPLAY",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/system/health")
async def get_system_health():
    """
    Get current system health snapshot from Runtime Fabric
    READ-ONLY - polls Runtime Fabric, does not execute anything
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{RUNTIME_FABRIC_URL}/health/snapshot",
                timeout=5.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch health snapshot: {e}")
        raise HTTPException(
            status_code=503,
            detail="Runtime Fabric unavailable"
        )


@app.get("/api/system/events")
async def get_system_events(limit: int = 50):
    """
    Get recent system events from Runtime Fabric
    READ-ONLY - polls Runtime Fabric, does not execute anything
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{RUNTIME_FABRIC_URL}/health/events",
                params={"limit": limit},
                timeout=5.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch events: {e}")
        raise HTTPException(
            status_code=503,
            detail="Runtime Fabric unavailable"
        )


@app.get("/api/system/events/stream")
async def stream_system_events():
    """
    Stream real-time system events from Runtime Fabric
    READ-ONLY - subscribes to Runtime Fabric SSE stream
    """
    async def event_generator():
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "GET",
                    f"{RUNTIME_FABRIC_URL}/health/events/stream",
                    timeout=None
                ) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            yield f"{line}\n\n"
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@app.post("/api/chat")
async def chat(request: Dict):
    """
    Send chat message to Agent Lee Router
    Routes to Agent Lee Router (8080) - does not execute locally
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{AGENT_LEE_ROUTER_URL}/v1/chat/completions",
                json=request,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Chat request failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Agent Lee Router unavailable"
        )


@app.post("/api/tts")
async def text_to_speech(request: Dict):
    """
    Generate speech from text via Desktop Runtime
    Routes to Desktop Runtime (8091) - does not execute locally
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{DESKTOP_RUNTIME_URL}/tts",
                json=request,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"TTS request failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Desktop Runtime unavailable"
        )


@app.get("/api/identity")
async def get_agent_identity():
    """
    Get Agent Lee identity information
    READ-ONLY - returns static identity data
    """
    return {
        "agentId": "agent-lee",
        "agentMode": "os2-embodiment",
        "role": "embodiment-presence-layer",
        "authority": "ZERO - READ-ONLY DISPLAY",
        "canonicalFingerprint": "leeway.agent-lee.os2.embodiment.v1",
        "capabilities": [
            "health-display",
            "chat-interface",
            "voice-output",
            "telemetry-display",
            "event-timeline"
        ],
        "restrictions": [
            "NO execution authority",
            "NO system mutations",
            "NO service control",
            "NO direct PowerShell",
            "MUST route all actions through Execution Broker"
        ],
        "version": "1.0.0",
        "port": 5100
    }


@app.get("/api/telemetry")
async def get_telemetry():
    """
    Get system telemetry data
    READ-ONLY - aggregates data from Runtime Fabric
    """
    try:
        async with httpx.AsyncClient() as client:
            # Get health snapshot
            health_response = await client.get(
                f"{RUNTIME_FABRIC_URL}/health/snapshot",
                timeout=5.0
            )
            health_data = health_response.json()
            
            # Get recent events
            events_response = await client.get(
                f"{RUNTIME_FABRIC_URL}/health/events",
                params={"limit": 10},
                timeout=5.0
            )
            events_data = events_response.json()
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "health": health_data,
                "recentEvents": events_data.get("events", []),
                "summary": {
                    "totalServices": health_data.get("summary", {}).get("total", 0),
                    "healthyServices": health_data.get("summary", {}).get("healthy", 0),
                    "degradedServices": health_data.get("summary", {}).get("degraded", 0),
                    "failedServices": health_data.get("summary", {}).get("failed", 0)
                }
            }
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch telemetry: {e}")
        raise HTTPException(
            status_code=503,
            detail="Runtime Fabric unavailable"
        )


@app.websocket("/ws/health")
async def websocket_health(websocket: WebSocket):
    """
    WebSocket endpoint for real-time health updates
    Polls Runtime Fabric and pushes updates to connected clients
    """
    await websocket.accept()
    websocket_clients.append(websocket)
    
    try:
        # Send initial snapshot
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{RUNTIME_FABRIC_URL}/health/snapshot",
                timeout=5.0
            )
            if response.status_code == 200:
                await websocket.send_json({
                    "type": "snapshot",
                    "data": response.json()
                })
        
        # Keep connection alive and send periodic updates
        while True:
            await asyncio.sleep(HEALTH_POLL_INTERVAL)
            
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{RUNTIME_FABRIC_URL}/health/snapshot",
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        await websocket.send_json({
                            "type": "snapshot",
                            "data": response.json()
                        })
            except Exception as e:
                logger.error(f"Failed to fetch health update: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Failed to fetch health data"
                })
    
    except WebSocketDisconnect:
        websocket_clients.remove(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in websocket_clients:
            websocket_clients.remove(websocket)


@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("=" * 60)
    logger.info("Agent Lee OS2 - Embodiment & Presence Layer")
    logger.info("=" * 60)
    logger.info("Port: 5100")
    logger.info("Authority: ZERO - READ-ONLY DISPLAY")
    logger.info("Runtime Fabric: http://127.0.0.1:4001")
    logger.info("Agent Lee Router: http://127.0.0.1:8080")
    logger.info("Desktop Runtime: http://127.0.0.1:8091")
    logger.info("=" * 60)
    logger.info("Capabilities:")
    logger.info("  ✓ Health display (polls Runtime Fabric)")
    logger.info("  ✓ Chat interface (routes to Agent Lee Router)")
    logger.info("  ✓ Voice output (routes to Desktop Runtime)")
    logger.info("  ✓ Telemetry display (aggregates from Runtime Fabric)")
    logger.info("  ✓ Event timeline (subscribes to Runtime Fabric SSE)")
    logger.info("=" * 60)
    logger.info("Restrictions:")
    logger.info("  ✗ NO execution authority")
    logger.info("  ✗ NO system mutations")
    logger.info("  ✗ NO service control")
    logger.info("  ✗ NO direct PowerShell")
    logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=5100,
        log_level="info"
    )

# Made with Bob
