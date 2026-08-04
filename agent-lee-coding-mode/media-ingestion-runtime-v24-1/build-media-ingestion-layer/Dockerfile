FROM node:24-alpine
WORKDIR /app
COPY package.json /app/package.json
RUN npm install --omit=dev
COPY server.mjs /app/server.mjs
RUN mkdir -p /app/Archive/media-ingestion /app/Archive/receipts/media-ingestion
ENV LEEWAY_MEDIA_INGESTION_PORT=5300
ENV LEEWAY_RUNTIME_FABRIC_URL=http://runtime-fabric:4001
ENV LEEWAY_AGENT_LEE_URL=http://agent-lee:8080
ENV LEEWAY_ROOT=/app
EXPOSE 5300
CMD ["node", "server.mjs"]