FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_MEETING_STATE=/meetings
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_PUBLIC_BASE_URL=http://localhost:5329
ENV LEEWAY_JITSI_BASE_URL=https://meet.jit.si

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /meetings /app/receipts

EXPOSE 5329

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5329"]
