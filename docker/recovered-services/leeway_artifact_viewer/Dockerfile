FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV LEEWAY_VIEWER_STATE=/viewer-state
ENV LEEWAY_DOCUMENTS_DIR=/documents
ENV LEEWAY_NOTEBOOKS_DIR=/notebooks
ENV LEEWAY_PUBLIC_BASE_URL=http://localhost:5328

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

RUN mkdir -p /viewer-state /documents /notebooks

EXPOSE 5328

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5328"]
