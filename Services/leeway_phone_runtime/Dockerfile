FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_RUNTIME_STATE=/state
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_RUNTIME_NAME=leeway_runtime
ENV LEEWAY_RUNTIME_TITLE="Leeway Runtime"
ENV LEEWAY_RUNTIME_LANE=runtime
ENV LEEWAY_RUNTIME_PORT=5330
ENV LEEWAY_RUNTIME_TRUTH_JSON="{}"
ENV LEEWAY_RUNTIME_CAPABILITIES_JSON="[]"

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /state /state/work-orders /app/receipts

EXPOSE 5330

CMD ["sh", "-lc", "uvicorn app:app --host 0.0.0.0 --port ${LEEWAY_RUNTIME_PORT}"]
