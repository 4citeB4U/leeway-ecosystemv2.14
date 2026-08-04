FROM python:3.11-slim

WORKDIR /srv

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

COPY app /srv/app

ENV AGENT_LEE_APP_NAME=agent-lee-character-cutout-lane
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts
ENV U2NET_HOME=/models/rembg

EXPOSE 8102

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8102"]
