FROM python:3.11-slim

WORKDIR /srv

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

COPY app /srv/app

ENV AGENT_LEE_APP_NAME=agent-lee-telegram-vision-lane
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts
ENV OLLAMA_BASE_URL=http://leeway_ollama:11434
ENV AGENT_LEE_VISION_MODEL=qwen2.5vl:7b

EXPOSE 8104

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8104"]
