FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_DEVICE_STATE_DIR=/device-state
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_API_GATEWAY_URL=http://leeway_api_gateway:5320

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /device-state /app/receipts

EXPOSE 5323

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5323"]
