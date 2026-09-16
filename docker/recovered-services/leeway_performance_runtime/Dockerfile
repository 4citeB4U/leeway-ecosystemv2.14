FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_PERFORMANCE_STATE=/state
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_POWER_LEVEL=10
ENV AGENT_LEE_VOICE_URL=http://agent-lee-qwen-voice:8097

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /state /state/work-orders /state/audio /app/receipts

EXPOSE 5338

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5338"]
