FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_EXECUTIVE_STATE=/state
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_WORKBOARD_URL=http://leeway_workboard_runtime:5339
ENV LEEWAY_DISCOVERY_URL=http://leeway_agent_skills:5327
ENV LEEWAY_SKILL_ROUTER_URL=http://leeway_skill_router:5324
ENV LEEWAY_POWER_LEVEL=10

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /state /state/tasks /state/phrases /state/decisions /state/receipts /app/receipts

EXPOSE 5340

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5340"]
