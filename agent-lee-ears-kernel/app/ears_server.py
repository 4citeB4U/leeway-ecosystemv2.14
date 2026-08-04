import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

APP_NAME = "agent-lee-ears-kernel"
MODEL_NAME = os.getenv("AGENTLEE_EARS_MODEL", "tiny.en")

OPERATOR_INBOX = Path(os.getenv("AGENTLEE_OPERATOR_INBOX", "/runtime/operator-os/inbox"))
AUDIO_ROOT = Path(os.getenv("AGENTLEE_EARS_AUDIO", "/runtime/ears/audio"))
TRANSCRIPT_ROOT = Path(os.getenv("AGENTLEE_EARS_TRANSCRIPTS", "/runtime/ears/transcripts"))

OPERATOR_INBOX.mkdir(parents=True, exist_ok=True)
AUDIO_ROOT.mkdir(parents=True, exist_ok=True)
TRANSCRIPT_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Agent Lee Docker Ears Kernel", version="3.0.0")

model = None
model_loaded_at = None


def utc_now():
    return datetime.utcnow().isoformat() + "Z"


def load_model():
    global model, model_loaded_at
    if model is None:
        model = WhisperModel(MODEL_NAME, device="cpu", compute_type="int8")
        model_loaded_at = utc_now()
    return model


def safe_text(value: str) -> str:
    value = value or ""
    value = value.strip()
    value = re.sub(r"\s+", " ", value)
    return value


def strip_wake_phrase(text: str) -> str:
    cleaned = safe_text(text)
    low = cleaned.lower()

    prefixes = [
        "agent lee ",
        "agent lee, ",
        "hey agent lee ",
        "hey agent lee, ",
        "lee ",
        "lee, ",
    ]

    for prefix in prefixes:
        if low.startswith(prefix):
            return cleaned[len(prefix):].strip()

    return cleaned


def write_operator_command(text: str, source: str):
    OPERATOR_INBOX.mkdir(parents=True, exist_ok=True)

    command = strip_wake_phrase(text)

    payload = {
        "command": command,
        "message": command,
        "prompt": command,
        "heardText": text,
        "requestedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source": source,
        "earsKernel": APP_NAME,
    }

    latest = OPERATOR_INBOX / "latest.agentlee-operator.json"
    latest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return str(latest)


def save_transcript_record(record: dict):
    TRANSCRIPT_ROOT.mkdir(parents=True, exist_ok=True)
    path = TRANSCRIPT_ROOT / f"ears-transcript-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}.json"
    path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    return str(path)


def transcribe_audio_file(audio_path: Path, route_to_operator: bool = True, language: Optional[str] = "en"):
    stt_model = load_model()

    kwargs = {
        "beam_size": 1,
        "vad_filter": True,
    }

    if language:
        kwargs["language"] = language

    segments, info = stt_model.transcribe(str(audio_path), **kwargs)

    parts = []
    segment_records = []

    for segment in segments:
        txt = safe_text(segment.text)
        if txt:
            parts.append(txt)
            segment_records.append({
                "start": segment.start,
                "end": segment.end,
                "text": txt,
            })

    transcript = safe_text(" ".join(parts))

    operator_path = None
    routed_command = strip_wake_phrase(transcript)

    if transcript and route_to_operator:
        operator_path = write_operator_command(transcript, source="AgentLeeDockerEarsKernel")

    record = {
        "status": "success",
        "service": APP_NAME,
        "mode": "docker-stt",
        "model": MODEL_NAME,
        "audioPath": str(audio_path),
        "filename": audio_path.name,
        "text": transcript,
        "routedCommand": routed_command,
        "segments": segment_records,
        "language": getattr(info, "language", None),
        "languageProbability": getattr(info, "language_probability", None),
        "duration": getattr(info, "duration", None),
        "routedToOperator": bool(operator_path),
        "operatorPath": operator_path,
        "timestamp": utc_now(),
        "architecture": {
            "hostNativeEarsBridge": "captures microphone audio only",
            "dockerEarsKernel": "owns transcription",
            "operatorOS": "owns routing",
            "dockerVoiceKernel": "owns voice response",
            "handsBridge": "owns mouse and keyboard",
        },
        "hardRules": [
            "No browser mic page",
            "No browser SpeechRecognition",
            "No browser TTS",
            "No browser command decisions",
        ],
    }

    transcript_path = save_transcript_record(record)
    record["transcriptPath"] = transcript_path

    return record


@app.get("/")
def root():
    return {
        "status": "online",
        "service": APP_NAME,
        "version": "3.0.0",
        "truth": "Docker owns STT. Host native bridge captures microphone audio only. Browser is not used.",
        "routes": [
            "/health",
            "/ears/status",
            "/ears/transcribe",
            "/ears/route-text",
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": APP_NAME,
        "timestamp": utc_now(),
    }


@app.get("/ears/status")
def ears_status():
    return {
        "status": "online",
        "service": APP_NAME,
        "model": MODEL_NAME,
        "modelLoaded": model is not None,
        "modelLoadedAt": model_loaded_at,
        "operatorInbox": str(OPERATOR_INBOX),
        "audioRoot": str(AUDIO_ROOT),
        "transcriptRoot": str(TRANSCRIPT_ROOT),
        "timestamp": utc_now(),
        "architecture": {
            "microphoneCapture": "native Windows ears bridge",
            "transport": "localhost API from host bridge to Docker STT",
            "stt": "Docker ears kernel",
            "routing": "Operator OS inbox",
            "voice": "Docker voice kernel",
            "hands": "Host hands bridge",
        },
        "hardRules": [
            "No browser mic page",
            "No browser SpeechRecognition",
            "No browser text-to-speech",
            "No browser command routing",
        ],
    }


@app.post("/ears/route-text")
async def route_text(text: str = Form(...)):
    cleaned = safe_text(text)

    if not cleaned:
        return JSONResponse(status_code=400, content={"status": "error", "error": "empty text"})

    operator_path = write_operator_command(cleaned, source="AgentLeeDockerEarsTextRoute")

    record = {
        "status": "success",
        "mode": "route-text-test-only",
        "text": cleaned,
        "routedCommand": strip_wake_phrase(cleaned),
        "operatorPath": operator_path,
        "timestamp": utc_now(),
    }

    transcript_path = save_transcript_record(record)
    record["transcriptPath"] = transcript_path

    return record


@app.post("/ears/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    route_to_operator: bool = Form(True),
    language: Optional[str] = Form("en")
):
    request_id = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
    suffix = Path(audio.filename or "agent-lee-mic.wav").suffix or ".wav"
    audio_path = AUDIO_ROOT / f"agent-lee-ears-{request_id}{suffix}"

    raw = await audio.read()
    audio_path.write_bytes(raw)

    record = transcribe_audio_file(audio_path, route_to_operator=route_to_operator, language=language)
    return record
