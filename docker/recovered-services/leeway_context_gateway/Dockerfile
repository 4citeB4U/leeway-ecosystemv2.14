FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_CONTEXT_DIR=/context-store
ENV LEEWAY_RECEIPT_DIR=/app/receipts

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /context-store/originals /context-store/compressed /context-store/failures /app/receipts

EXPOSE 5321

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5321"]
