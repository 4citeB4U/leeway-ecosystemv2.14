FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_API_GATEWAY_PORT=5320
ENV LEEWAY_RESEARCH_URL=http://leeway_research_lane:5310
ENV LEEWAY_STORAGE_URL=http://leeway_seafile_storage_gateway:5314
ENV LEEWAY_RUNTIME_FABRIC_URL=http://leeway_runtime_fabric:4001
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_CRM_DIR=/app/crm
ENV LEEWAY_APPROVAL_DIR=/app/approvals

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /app/receipts /app/crm /app/approvals

EXPOSE 5320

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5320"]
