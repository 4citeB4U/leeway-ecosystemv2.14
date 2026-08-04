FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_SKILL_STATE_DIR=/skill-state
ENV LEEWAY_RECEIPT_DIR=/app/receipts
ENV LEEWAY_DOCUMENT_RUNTIME_URL=http://leeway_document_runtime:5325
ENV LEEWAY_OPEN_NOTEBOOK_URL=http://leeway_open_notebook:5326
ENV LEEWAY_AGENT_SKILLS_URL=http://leeway_agent_skills:5327
ENV LEEWAY_ARTIFACT_VIEWER_URL=http://leeway_artifact_viewer:5328
ENV LEEWAY_ARTIFACT_VIEWER_PUBLIC_URL=http://localhost:5328
ENV LEEWAY_MEETING_RUNTIME_URL=http://leeway_meeting_runtime:5329

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /skill-state /skill-state/plans /skill-state/tasks /app/receipts

EXPOSE 5324

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5324"]
