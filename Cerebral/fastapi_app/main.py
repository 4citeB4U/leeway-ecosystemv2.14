
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
import psutil
import importlib
from tts_edge import synthesize

# Module stubs
import vision
import emotion
import slang

app = FastAPI()

# Serve static frontend (React build)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), '..', 'agent-lee-os2', 'dist')
app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")

# Settings state
settings_state = {
    "tts_enabled": True,
    "bg_color": "#000",
    "bg_speed": 1.0
}

@app.get("/api/health")
def health():
    return JSONResponse({
        "status": "ok",
        "cpu": psutil.cpu_percent(),
        "ram": psutil.virtual_memory().percent,
        "uptime": int(psutil.boot_time())
    })

@app.get("/api/settings")
def settings():
    return JSONResponse(settings_state)

@app.post("/api/settings")
async def update_settings(request: Request):
    data = await request.json()
    updated = False
    for k in ["tts_enabled", "bg_color", "bg_speed"]:
        if k in data:
            settings_state[k] = data[k]
            updated = True
    if updated:
        return JSONResponse(settings_state)
    return JSONResponse({"error": "no supported fields provided"}, status_code=400)

@app.get("/api/tts/voices")
def tts_voices():
    # edge-tts stub: return canonical voices
    voices = ["en-US-ChristopherNeural", "en-US-JennyNeural"]
    return JSONResponse({"voices": voices})

@app.post("/api/tts/speak")
async def tts_speak(request: Request):
    data = await request.json()
    text = data.get("text", "")
    voice = data.get("voice", "en-US-ChristopherNeural")
    rate = data.get("rate", "+0%")
    audio = synthesize(text, voice=voice, rate=rate)
    return Response(content=audio, media_type="audio/mpeg")

@app.get("/api/telemetry")
def telemetry():
    cpu_now = psutil.cpu_percent()
    cpu_per_core = psutil.cpu_percent(percpu=True)
    vm = psutil.virtual_memory()
    disk_c = psutil.disk_io_counters()
    net_c = psutil.net_io_counters()
    return JSONResponse({
        "instant": {
            "cpu": cpu_now,
            "cpu_per_core": cpu_per_core,
            "ram_percent": vm.percent,
            "ram_used": vm.used,
            "ram_total": vm.total,
            "disk_read_bytes": getattr(disk_c, 'read_bytes', None),
            "disk_write_bytes": getattr(disk_c, 'write_bytes', None),
            "net_bytes_sent": getattr(net_c, 'bytes_sent', None),
            "net_bytes_recv": getattr(net_c, 'bytes_recv', None),
        }
    })


# Vision endpoints
@app.get("/api/vision/status")
def vision_status():
    # Real logic: call vision module
    status = vision.get_status()
    return JSONResponse(status)

@app.post("/api/vision/load")
async def vision_load():
    data = await Request.json()
    model = data.get("model", "Qwen2.5-VL-3B-Instruct")
    result = vision.load_model(model)
    return JSONResponse(result)

@app.post("/api/vision/unload")
def vision_unload():
    result = vision.unload_model()
    return JSONResponse(result)

# Emotion endpoint
@app.get("/api/emotion/status")
def emotion_status():
    emotion_result = emotion.get_status()
    return JSONResponse(emotion_result)

# Slang endpoint
@app.get("/api/slang/status")
def slang_status():
    slang_result = slang.get_status()
    return JSONResponse(slang_result)

# TTS events endpoint
@app.get("/api/tts/events")
def tts_events():
    events = synthesize.get_events()
    return JSONResponse({"events": events})

# WebSocket endpoint for real-time events
from fastapi import WebSocket
import asyncio

@app.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            # Example: send telemetry and TTS events
            telemetry_data = {
                "cpu": psutil.cpu_percent(),
                "ram": psutil.virtual_memory().percent
            }
            tts_event = synthesize.get_last_event()
            await ws.send_json({"telemetry": telemetry_data, "tts_event": tts_event})
            await asyncio.sleep(1)
    except Exception:
        await ws.close()

@app.get("/api/ports")
def api_ports():
    listening = set()
    for conn in psutil.net_connections(kind="inet"):
        if conn.status == "LISTEN" and conn.laddr:
            listening.add(conn.laddr.port)
    monitored = list(range(6000, 6021)) + [8765, 56995, 5173, 8787, 8080, 3001, 8001, 3000]
    result = [{"port": p, "online": p in listening} for p in monitored]
    return JSONResponse({"ports": result})

# To run: uvicorn main:app --host 0.0.0.0 --port 8765
