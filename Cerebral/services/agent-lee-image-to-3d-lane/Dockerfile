FROM agent-lee-creation-kernel:local

WORKDIR /srv

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

# TripoSR source. Kept inside this lane only.
RUN git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git /opt/TripoSR

WORKDIR /opt/TripoSR

# Install TripoSR requirements without overwriting the base CUDA/PyTorch stack.
RUN if [ -f requirements.txt ]; then python -m pip install --no-cache-dir -r requirements.txt; fi

WORKDIR /srv
COPY app /srv/app

ENV AGENT_LEE_APP_NAME=agent-lee-image-to-3d-lane
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts
ENV AGENT_LEE_TRIPOSR_ROOT=/opt/TripoSR
ENV HF_HOME=/models/huggingface
ENV TRANSFORMERS_CACHE=/models/huggingface
ENV DIFFUSERS_CACHE=/models/huggingface

EXPOSE 8101

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8101"]
