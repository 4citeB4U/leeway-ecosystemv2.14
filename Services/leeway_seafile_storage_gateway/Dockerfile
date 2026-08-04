FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_LANE_NAME=leeway_seafile_storage_gateway
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_STORAGE_DIR=/gateway-store
ENV LEEWAY_SEAFILE_SHARED=/seafile-shared

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /app/receipts /gateway-store /seafile-shared

EXPOSE 5314

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5314"]
