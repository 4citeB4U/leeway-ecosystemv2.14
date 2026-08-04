FROM agent-lee-creation-kernel:local

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir -U -r /tmp/requirements.txt

COPY app /app/app

ENV AGENT_LEE_IMAGE_MODEL=segmind/tiny-sd
ENV AGENT_LEE_ARTIFACT_ROOT=/artifacts
ENV HF_HOME=/models/huggingface
ENV TRANSFORMERS_CACHE=/models/huggingface
ENV DIFFUSERS_CACHE=/models/huggingface
ENV OLLAMA_BASE_URL=http://leeway_ollama:11434
ENV AGENT_LEE_QWEN_BRAIN_MODEL=qwen3:latest
ENV AGENT_LEE_QWEN_VISION_MODEL=qwen2.5vl:7b
ENV AGENT_LEE_QWEN_VL_MODEL=qwen2.5vl:7b
ENV AGENT_LEE_ENABLE_QWEN_REFINE=1
ENV AGENT_LEE_ENABLE_QWEN_REVIEW=1

EXPOSE 8094

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8094"]



