FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BRAIN_DATA_DIR=/brain-data \
    LEEWAY_ROOT=/leeway-root \
    OBSIDIAN_VAULT=/obsidian-vault \
    OLLAMA_BASE_URL=http://ollama:11434 \
    BRAIN_LLM_MODEL= \
    BRAIN_EMBEDDING_MODEL=

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --system --create-home --shell /usr/sbin/nologin brain \
    && mkdir -p /brain-data \
    && mkdir -p /obsidian-vault \
    && chown -R brain:brain /app /brain-data /obsidian-vault

USER brain

EXPOSE 8770

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8770"]