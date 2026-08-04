FROM node:24-alpine

WORKDIR /app

COPY worker.mjs /app/worker.mjs

ENV NODE_ENV=production
ENV HYBRID_INTERVAL_MS=30000
ENV ADVISOR_EVERY_CYCLES=4
ENV PREFERRED_QWEN_MODEL=qwen2.5-coder:7b

EXPOSE 8777

CMD ["node", "/app/worker.mjs"]