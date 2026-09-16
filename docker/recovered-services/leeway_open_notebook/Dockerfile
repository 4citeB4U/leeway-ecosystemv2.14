FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_NOTEBOOK_DIR=/notebooks
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_DOCUMENT_RUNTIME_URL=http://leeway_document_runtime:5325

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /notebooks /app/receipts

EXPOSE 5326

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5326"]
