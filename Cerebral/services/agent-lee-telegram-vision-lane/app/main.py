import base64
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from PIL import Image


APP_NAME = os.environ.get("AGENT_LEE_APP_NAME", "agent-lee-telegram-vision-lane")
ARTIFACT_ROOT = Path(os.environ.get("AGENT_LEE_ARTIFACT_ROOT", "/artifacts"))
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://leeway_ollama:11434").rstrip("/")
VISION_MODEL = os.environ.get("AGENT_LEE_VISION_MODEL", "qwen2.5vl:7b")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
DEFAULT_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

INCOMING = ARTIFACT_ROOT / "incoming"
RECEIPTS = ARTIFACT_ROOT / "receipts"
LATEST_FILE = ARTIFACT_ROOT / "latest_telegram_vision.json"
TELEGRAM_OFFSET_FILE = ARTIFACT_ROOT / "telegram_update_offset.json"

INCOMING.mkdir(parents=True, exist_ok=True)
RECEIPTS.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP_NAME)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def telegram_api(method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN_NOT_SET"}

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    r = requests.post(url, json=payload, timeout=120)

    try:
        return r.json()
    except Exception:
        return {"ok": False, "status_code": r.status_code, "text": r.text[:1000]}


def telegram_get_file(file_id: str) -> Dict[str, Any]:
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN_NOT_SET"}

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile"
    r = requests.post(url, json={"file_id": file_id}, timeout=120)
    return r.json()


def download_telegram_file(file_path: str, out_path: Path) -> None:
    url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"
    r = requests.get(url, timeout=180)
    r.raise_for_status()
    out_path.write_bytes(r.content)


def normalize_image(path: Path) -> Path:
    img = Image.open(path).convert("RGB")
    img.thumbnail((1600, 1600), Image.LANCZOS)

    out = path.with_name(path.stem + "_normalized.jpg")
    img.save(out, quality=92)
    return out


def qwen_vision_describe(image_path: Path, user_prompt: Optional[str] = None) -> Dict[str, Any]:
    prompt = user_prompt or (
        "You are Agent Lee vision. Describe this image clearly. "
        "Identify the main subject, objects, text if visible, scene context, safety concerns, "
        "and any useful next action. Be concise but specific."
    )

    image_b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")

    payload = {
        "model": VISION_MODEL,
        "prompt": prompt,
        "images": [image_b64],
        "stream": False,
    }

    url = f"{OLLAMA_BASE_URL}/api/generate"
    r = requests.post(url, json=payload, timeout=600)

    try:
        data = r.json()
    except Exception:
        return {
            "ok": False,
            "error": "OLLAMA_NON_JSON_RESPONSE",
            "status_code": r.status_code,
            "text": r.text[:2000],
        }

    if r.status_code >= 400:
        return {
            "ok": False,
            "error": "OLLAMA_ERROR",
            "status_code": r.status_code,
            "data": data,
        }

    return {
        "ok": True,
        "model": VISION_MODEL,
        "response": data.get("response", ""),
        "raw": data,
    }


def handle_photo_message(message: Dict[str, Any]) -> Dict[str, Any]:
    chat_id = str(message.get("chat", {}).get("id", DEFAULT_CHAT_ID))
    caption = message.get("caption") or ""
    photos = message.get("photo") or []

    job_id = str(uuid.uuid4())
    job_dir = INCOMING / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    receipt = {
        "ok": False,
        "verdict": "TELEGRAM_PHOTO_RECEIVED",
        "job_id": job_id,
        "chat_id": chat_id,
        "caption": caption,
        "photo_count": len(photos),
        "created_at": now_iso(),
    }

    receipt_path = RECEIPTS / f"{job_id}.json"
    write_json(receipt_path, receipt)

    if not photos:
        receipt.update({
            "ok": False,
            "verdict": "NO_PHOTO_IN_MESSAGE",
            "completed_at": now_iso(),
        })
        write_json(receipt_path, receipt)
        return receipt

    best = sorted(photos, key=lambda p: p.get("file_size", 0))[-1]
    file_id = best.get("file_id")

    file_info = telegram_get_file(file_id)
    receipt["telegram_file_info"] = file_info
    write_json(receipt_path, receipt)

    if not file_info.get("ok"):
        receipt.update({
            "ok": False,
            "verdict": "TELEGRAM_GET_FILE_FAILED",
            "completed_at": now_iso(),
        })
        write_json(receipt_path, receipt)
        return receipt

    file_path = file_info["result"]["file_path"]
    ext = Path(file_path).suffix or ".jpg"
    raw_path = job_dir / f"telegram_photo{ext}"

    download_telegram_file(file_path, raw_path)
    normalized_path = normalize_image(raw_path)

    vision = qwen_vision_describe(normalized_path, caption if caption else None)
    description = vision.get("response") or vision.get("error") or "Agent Lee could not analyze the image."

    reply_text = (
        "Agent Lee Vision:\n\n"
        f"{description}\n\n"
        f"Receipt: {job_id}"
    )

    telegram_reply = telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": reply_text[:3900],
    })

    receipt.update({
        "ok": bool(vision.get("ok")),
        "verdict": "TELEGRAM_PHOTO_ANALYZED" if vision.get("ok") else "TELEGRAM_PHOTO_ANALYSIS_FAILED",
        "raw_image": str(raw_path),
        "normalized_image": str(normalized_path),
        "vision": vision,
        "telegram_reply": telegram_reply,
        "completed_at": now_iso(),
    })

    write_json(receipt_path, receipt)
    write_json(LATEST_FILE, {
        "job_id": job_id,
        "receipt": str(receipt_path),
        "raw_image": str(raw_path),
        "normalized_image": str(normalized_path),
        "updated_at": now_iso(),
    })

    return receipt


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "version": "1.0.0-telegram-photo-vision",
        "artifact_root": str(ARTIFACT_ROOT),
        "ollama_base_url": OLLAMA_BASE_URL,
        "vision_model": VISION_MODEL,
        "telegram_token_present": bool(TELEGRAM_BOT_TOKEN),
        "default_chat_present": bool(DEFAULT_CHAT_ID),
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP_NAME,
        "version": "1.0.0-telegram-photo-vision",
        "purpose": "phone_camera_photo_to_telegram_to_local_vision_llm_to_telegram_reply",
        "backend": "Telegram Bot API + Ollama vision model",
        "vision_model": VISION_MODEL,
        "ollama_base_url": OLLAMA_BASE_URL,
        "telegram_token_present": bool(TELEGRAM_BOT_TOKEN),
        "default_chat_present": bool(DEFAULT_CHAT_ID),
        "created_at": now_iso(),
    }


@app.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    update = await request.json()

    message = update.get("message") or update.get("edited_message") or {}

    if "photo" in message:
        result = handle_photo_message(message)
        return result

    chat_id = str(message.get("chat", {}).get("id", DEFAULT_CHAT_ID))
    text = message.get("text", "")

    if text:
        telegram_api("sendMessage", {
            "chat_id": chat_id,
            "text": "Agent Lee Vision is online. Send me a photo and I will describe it.",
        })

    return {
        "ok": True,
        "verdict": "UPDATE_RECEIVED_NO_PHOTO",
        "text": text,
        "created_at": now_iso(),
    }


@app.post("/test/describe-local")
async def describe_local(request: Request):
    data = await request.json()
    image_path = Path(data.get("image_path", ""))
    prompt = data.get("prompt")

    if not image_path.exists():
        alt = ARTIFACT_ROOT / str(data.get("image_path", "")).lstrip("/").replace("\\", "/")
        if alt.exists():
            image_path = alt
        else:
            return JSONResponse(status_code=404, content={"ok": False, "error": "IMAGE_NOT_FOUND", "image_path": str(image_path)})

    normalized = normalize_image(image_path)
    vision = qwen_vision_describe(normalized, prompt)

    return {
        "ok": bool(vision.get("ok")),
        "image_path": str(image_path),
        "normalized": str(normalized),
        "vision": vision,
        "created_at": now_iso(),
    }


@app.get("/latest")
def latest():
    if not LATEST_FILE.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NO_LATEST_TELEGRAM_VISION"})
    return json.loads(LATEST_FILE.read_text(encoding="utf-8"))


@app.get("/receipts/{filename}")
def receipt_file(filename: str):
    safe = Path(filename).name
    path = RECEIPTS / safe
    if not path.exists():
        return JSONResponse(status_code=404, content={"ok": False, "error": "NOT_FOUND"})
    return FileResponse(path, media_type="application/json", filename=safe)



# ---------------------------------------------------------------------
# Agent Lee Telegram send / vision-send / polling routes
# ---------------------------------------------------------------------

def get_telegram_offset() -> int:
    if not TELEGRAM_OFFSET_FILE.exists():
        return 0
    try:
        data = json.loads(TELEGRAM_OFFSET_FILE.read_text(encoding="utf-8"))
        return int(data.get("offset", 0))
    except Exception:
        return 0


def set_telegram_offset(offset: int) -> None:
    write_json(TELEGRAM_OFFSET_FILE, {
        "offset": int(offset),
        "updated_at": now_iso(),
    })


def telegram_get_updates(timeout_seconds: int = 20) -> Dict[str, Any]:
    if not TELEGRAM_BOT_TOKEN:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN_NOT_SET"}

    payload = {
        "timeout": timeout_seconds,
        "allowed_updates": ["message", "edited_message"],
    }

    offset = get_telegram_offset()
    if offset > 0:
        payload["offset"] = offset

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    r = requests.post(url, json=payload, timeout=timeout_seconds + 20)

    try:
        return r.json()
    except Exception:
        return {
            "ok": False,
            "error": "TELEGRAM_GET_UPDATES_NON_JSON",
            "status_code": r.status_code,
            "text": r.text[:1500],
        }


@app.post("/test/send-telegram")
async def test_send_telegram(request: Request):
    data = await request.json()
    text = data.get("text") or "Agent Lee Telegram vision lane test message."
    chat_id = str(data.get("chat_id") or DEFAULT_CHAT_ID)

    result = telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": text[:3900],
    })

    return {
        "ok": bool(result.get("ok")),
        "telegram": result,
        "chat_id_present": bool(chat_id),
        "token_present": bool(TELEGRAM_BOT_TOKEN),
        "created_at": now_iso(),
    }


@app.post("/test/describe-local-and-send")
async def describe_local_and_send(request: Request):
    data = await request.json()

    image_path = Path(data.get("image_path", ""))
    prompt = data.get("prompt")
    chat_id = str(data.get("chat_id") or DEFAULT_CHAT_ID)

    if not image_path.exists():
        alt = ARTIFACT_ROOT / str(data.get("image_path", "")).lstrip("/").replace("\\", "/")
        if alt.exists():
            image_path = alt
        else:
            return JSONResponse(status_code=404, content={
                "ok": False,
                "error": "IMAGE_NOT_FOUND",
                "image_path": str(image_path),
            })

    normalized = normalize_image(image_path)
    vision = qwen_vision_describe(normalized, prompt)
    description = vision.get("response") or vision.get("error") or "Agent Lee could not analyze the image."

    message = "Agent Lee Vision:\n\n" + description

    result = telegram_api("sendMessage", {
        "chat_id": chat_id,
        "text": message[:3900],
    })

    return {
        "ok": bool(vision.get("ok")) and bool(result.get("ok")),
        "image_path": str(image_path),
        "normalized": str(normalized),
        "vision": vision,
        "telegram": result,
        "created_at": now_iso(),
    }


@app.post("/telegram/poll-once")
def telegram_poll_once():
    updates = telegram_get_updates(timeout_seconds=15)

    receipt = {
        "ok": False,
        "verdict": "TELEGRAM_POLL_ONCE_STARTED",
        "updates": updates,
        "handled": [],
        "created_at": now_iso(),
    }

    if not updates.get("ok"):
        receipt["verdict"] = "TELEGRAM_POLL_FAILED"
        return receipt

    results = updates.get("result", [])

    for update in results:
        update_id = int(update.get("update_id", 0))
        if update_id:
            set_telegram_offset(update_id + 1)

        message = update.get("message") or update.get("edited_message") or {}

        if "photo" in message:
            handled = handle_photo_message(message)
            receipt["handled"].append(handled)
        else:
            chat_id = str(message.get("chat", {}).get("id", DEFAULT_CHAT_ID))
            text = message.get("text", "")
            if text:
                reply = telegram_api("sendMessage", {
                    "chat_id": chat_id,
                    "text": "Agent Lee Vision is online. Send me a photo and I will describe it.",
                })
                receipt["handled"].append({
                    "type": "text",
                    "text": text,
                    "reply": reply,
                })

    receipt["ok"] = True
    receipt["verdict"] = "TELEGRAM_POLL_ONCE_COMPLETED"
    receipt["update_count"] = len(results)
    receipt["completed_at"] = now_iso()
    return receipt

