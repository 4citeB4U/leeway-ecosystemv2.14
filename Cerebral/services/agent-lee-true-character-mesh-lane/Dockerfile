FROM nvidia/cuda:12.4.1-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=/usr/local/cuda/bin:${PATH}
ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64:${LD_LIBRARY_PATH}
ENV HF_HOME=/models/huggingface
ENV TRANSFORMERS_CACHE=/models/huggingface
ENV TORCH_HOME=/models/torch

WORKDIR /srv

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    git \
    build-essential \
    cmake \
    ninja-build \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libegl1 \
    libxrender1 \
    libxext6 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python

RUN python -m pip install --no-cache-dir -U pip setuptools wheel

# CUDA 12.4 PyTorch stack.
RUN python -m pip install --no-cache-dir \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu124

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

# TripoSR source.
RUN git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git /opt/TripoSR

WORKDIR /opt/TripoSR

# Install TripoSR dependencies after CUDA/PyTorch are present.
RUN if [ -f requirements.txt ]; then python -m pip install --no-cache-dir -r requirements.txt; fi

WORKDIR /srv
COPY app /srv/app

ENV AGENT_LEE_APP_NAME=agent-lee-true-character-mesh-lane
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts
ENV AGENT_LEE_TRIPOSR_ROOT=/opt/TripoSR

EXPOSE 8103

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8103"]
