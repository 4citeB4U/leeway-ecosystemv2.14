FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_LANE_NAME=leeway_research_lane
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_BRIEF_DIR=/app/briefs

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /app/receipts /app/briefs

EXPOSE 5310

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5310"]
