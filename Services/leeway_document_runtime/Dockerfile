FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_DOC_DIR=/documents
ENV LEEWAY_RECEIPT_DIR=/app/receipts

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /documents /app/receipts

EXPOSE 5325

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5325"]
