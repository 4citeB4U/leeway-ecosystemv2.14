from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from qwen_vision_client import analyze_image
from room_vision_policy import get_policy
from vision_input_optimizer import normalize_image_payload
from vision_manifest import load_manifest
from vision_receipts import write_receipt
from vision_response_validator import validate_scene_response


app = FastAPI(title="Agent Lee Vision Kernel", version="1.0.0")
manifest = load_manifest()


class VisionRequest(BaseModel):
    imageBase64: str | None = None
    image: str | None = None
    prompt: str = "Describe the non-sensitive visible scene in one concise paragraph."


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "agent-lee-vision-kernel",
        "selectedModel": manifest["selectedModel"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/vision/status")
def status():
    return {
        "status": "ready",
        "camera": "external_host_bridge_required",
        "privacy": manifest["privacy"]
    }


@app.get("/vision/manifest")
def vision_manifest():
    return manifest


@app.get("/vision/model")
def vision_model():
    return {"selectedModel": manifest["selectedModel"], "provider": "ollama-local"}


@app.post("/vision/analyze/image")
def analyze(payload: VisionRequest):
    try:
        image_base64 = normalize_image_payload(payload.model_dump())
        result = analyze_image(manifest["selectedModel"], image_base64, payload.prompt)
        validation = validate_scene_response(result["responseText"])
        receipt_path = write_receipt("vision-analyze-image", {
            "route": "/vision/analyze/image",
            "model": manifest["selectedModel"],
            "validation": validation,
            "responseText": result["responseText"]
        })
        return {**result, "validation": validation, "receiptPath": receipt_path}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/vision/analyze/screen")
def analyze_screen(payload: VisionRequest):
    return analyze(payload)


@app.post("/vision/analyze/camera-frame")
def analyze_camera_frame(payload: VisionRequest):
    return analyze(payload)


@app.post("/vision/room/analyze")
def analyze_room(payload: VisionRequest):
    return analyze(payload)


@app.get("/vision/receipts/recent")
def recent_receipts():
    return {"status": "available_in_container_volume"}


@app.get("/vision/reports/latest")
def latest_report():
    return {"status": "available_in_container_volume", "policy": get_policy()}
