"""
Agent Lee Voice Kernel - XTTS-v2 FastAPI Server
Single-engine voice system for Agent Lee OS
"""

import os
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

# Import TTS after FastAPI to ensure proper initialization
from TTS.api import TTS

from voice_loader import VoiceLoader, initialize_voice_loader
from voice_enhancement_engine import build_request_context, finalize_synthesis
from voice_update_loader import load_update_package

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load configuration
with open('/app/config.json', 'r') as f:
    config = json.load(f)

# Initialize FastAPI app
app = FastAPI(
    title="Agent Lee Voice Kernel",
    description="XTTS-v2 Single-Engine Voice System",
    version="1.0.0"
)

# Global state
tts_model: Optional[TTS] = None
voice_loader: Optional[VoiceLoader] = None
model_loaded = False
boot_time = None


class TTSRequest(BaseModel):
    """TTS request model"""
    text: str
    voice: str = "agent-lee"
    language: str = "en"
    speed: float = 1.0


class TTSResponse(BaseModel):
    """TTS response model"""
    status: str
    audio_path: str
    duration: float
    text: str
    voice: str
    timestamp: str
    update_package_loaded: bool = False


@app.on_event("startup")
async def startup_event():
    """Initialize XTTS model and voice loader on startup"""
    global tts_model, voice_loader, model_loaded, boot_time
    
    boot_time = datetime.utcnow().isoformat() + "Z"
    logger.info("=" * 60)
    logger.info("Agent Lee Voice Kernel Starting...")
    logger.info("=" * 60)
    
    try:
        # Initialize voice loader
        logger.info("Initializing voice loader...")
        voice_loader = initialize_voice_loader()
        logger.info("✓ Voice loader initialized")
        
        # Load XTTS-v2 model
        logger.info("Loading XTTS-v2 model...")
        logger.info(f"Model: {config['voice_kernel']['model']}")
        
        tts_model = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            progress_bar=True,
            gpu=False  # Set to True if CUDA is available
        )
        
        logger.info("✓ XTTS-v2 model loaded successfully")
        
        # Extract speaker embedding
        logger.info("Extracting speaker embedding...")
        if voice_loader.extract_speaker_embedding(tts_model):
            logger.info("✓ Speaker embedding cached")
        else:
            raise RuntimeError("Failed to extract speaker embedding")
        
        model_loaded = True
        
        logger.info("=" * 60)
        logger.info("Agent Lee Voice Kernel Ready")
        logger.info(f"API Endpoint: http://0.0.0.0:{config['server']['port']}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Failed to initialize Voice Kernel: {e}")
        raise


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Agent Lee Voice Kernel",
        "version": config['voice_kernel']['version'],
        "engine": config['voice_kernel']['engine'],
        "status": "online" if model_loaded else "initializing",
        "boot_time": boot_time
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if not model_loaded or tts_model is None or voice_loader is None:
        raise HTTPException(status_code=503, detail="Service not ready")
    
        return {
        "status": "healthy",
        "model_loaded": model_loaded,
        "voice_identity": voice_loader.verify_voice_identity(),
        "update_package": load_update_package(),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Generate speech from text using Agent Lee voice
    
    This is the ONLY voice generation endpoint.
    No fallback systems. XTTS-v2 only.
    """
    if not model_loaded or tts_model is None or voice_loader is None:
        raise HTTPException(status_code=503, detail="Voice Kernel not ready")
    
    # Validate voice identity
    if request.voice != "agent-lee":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid voice: {request.voice}. Only 'agent-lee' is supported."
        )
    
    try:
        start_time = time.time()
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        
        # Generate output filename
        output_filename = f"agent-lee-{timestamp}.wav"
        output_path = os.path.join(config['output']['output_dir'], output_filename)
        request_context = build_request_context(
            text=request.text,
            voice=request.voice,
            language=request.language,
            speed=request.speed,
            output_path=output_path
        )

        if not request_context["validation"]["ok"]:
            raise HTTPException(status_code=400, detail={
                "message": "Voice request blocked by enhancement validator",
                "blockers": request_context["validation"]["blockers"],
                "truth_labels": request_context["validation"]["truth_labels"]
            })
        
        logger.info(f"Generating speech for: {request.text[:50]}...")
        logger.info(f"Voice: {request.voice}")
        logger.info(f"Language: {request.language}")
        
        # Get speaker WAV path
        speaker_wav = voice_loader.get_speaker_wav()
        
        # Generate speech using XTTS-v2
        tts_model.tts_to_file(
            text=request.text,
            file_path=output_path,
            speaker_wav=speaker_wav,
            language=request.language,
            speed=request.speed
        )

        duration = time.time() - start_time
        enhancement_receipt = finalize_synthesis(output_path, request_context)
        
        logger.info(f"✓ Speech generated in {duration:.2f}s")
        logger.info(f"Output: {output_path}")
        
        return TTSResponse(
            status="success",
            audio_path=output_path,
            duration=duration,
            text=request.text,
            voice=request.voice,
            timestamp=datetime.utcnow().isoformat() + "Z",
            update_package_loaded=load_update_package().get("loaded", False)
        )
        
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """Retrieve generated audio file"""
    audio_path = os.path.join(config['output']['output_dir'], filename)
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        audio_path,
        media_type="audio/wav",
        filename=filename
    )


@app.get("/voice-identity")
async def get_voice_identity():
    """Get Agent Lee voice identity information"""
    if voice_loader is None:
        raise HTTPException(status_code=503, detail="Voice loader not initialized")
    
    return voice_loader.verify_voice_identity()


@app.post("/register-runtime-fabric")
async def register_with_runtime_fabric():
    """Register Voice Kernel with Runtime Fabric"""
    if not config['runtime_fabric']['enabled']:
        raise HTTPException(status_code=400, detail="Runtime Fabric integration disabled")
    
    try:
        import requests
        
        fabric_endpoint = config['runtime_fabric']['endpoint']
        registration_data = {
            "service": "agent-lee-voice-kernel",
            "version": config['voice_kernel']['version'],
            "engine": config['voice_kernel']['engine'],
            "endpoint": f"http://localhost:{config['server']['port']}",
            "capabilities": ["tts", "voice-cloning", "multilingual"],
            "voice_identity": "agent-lee",
            "status": "online"
        }
        
        response = requests.post(
            f"{fabric_endpoint}/register-service",
            json=registration_data,
            timeout=5
        )
        
        if response.status_code == 200:
            logger.info("✓ Registered with Runtime Fabric")
            return {"status": "registered", "fabric_endpoint": fabric_endpoint}
        else:
            logger.warning(f"Runtime Fabric registration failed: {response.status_code}")
            return {"status": "failed", "error": response.text}
            
    except Exception as e:
        logger.error(f"Failed to register with Runtime Fabric: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        app,
        host=config['server']['host'],
        port=config['server']['port'],
        log_level=config['server']['log_level']
    )

# Made with Bob
