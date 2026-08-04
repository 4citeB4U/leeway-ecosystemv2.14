FROM agent-lee-creation-kernel:local

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

COPY app /app/app

ENV AGENT_LEE_APP_NAME=agent-lee-sdxl-lightning-image-lane
ENV AGENT_LEE_IMAGE_MODEL=ByteDance/SDXL-Lightning-LoRA-UltraLowMemory
ENV AGENT_LEE_SDXL_BASE_MODEL=stabilityai/stable-diffusion-xl-base-1.0
ENV AGENT_LEE_LIGHTNING_REPO=ByteDance/SDXL-Lightning
ENV AGENT_LEE_LIGHTNING_LORA=sdxl_lightning_4step_lora.safetensors
ENV AGENT_LEE_LIGHTNING_STEPS=4
ENV AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest
ENV AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts

EXPOSE 8095

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8095"]
