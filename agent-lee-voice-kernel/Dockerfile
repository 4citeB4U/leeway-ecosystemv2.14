# Agent Lee Voice Kernel - XTTS-v2 Container
# Single-engine voice system for Agent Lee OS

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# PyTorch 2.4+ required for transformers compatibility
# transformers 4.38.2 required for TTS 0.22.0 compatibility (BeamSearchScorer)
RUN pip install --no-cache-dir \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    torch==2.4.0 \
    torchaudio==2.4.0 \
    transformers==4.38.2 \
    tokenizers==0.15.2 \
    TTS==0.22.0 \
    pydub==0.25.1 \
    requests==2.31.0 \
    numpy==1.22.0

# Create necessary directories
RUN mkdir -p /app/voice-samples /app/output /app/cache /app/logs

# Copy application files
COPY xtts-server.py /app/
COPY config.json /app/
COPY voice_loader.py /app/
COPY voice_enhancement_policy.json /app/
COPY voice_audio_quality.py /app/
COPY voice_event_timeline.py /app/
COPY voice_response_validator.py /app/
COPY voice_receipts.py /app/
COPY voice_enhancement_engine.py /app/
COPY voice_update_package.json /app/
COPY voice_update_loader.py /app/
COPY boot-speech.py /app/

COPY voice-samples/Agent_Voice_One.m4a /app/voice-samples/agent-lee-source.m4a

# Expose API port
EXPOSE 8092

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV COQUI_TOS_AGREED=1
ENV XTTS_CACHE_DIR=/app/cache
ENV XTTS_OUTPUT_DIR=/app/output

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8092/health')"

# Run boot speech and start server
CMD python boot-speech.py && uvicorn xtts-server:app --host 0.0.0.0 --port 8092

# Made with Bob
