FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --silent || npm install --production --no-audit --no-fund

COPY server ./server
COPY sentinel ./sentinel
COPY cage ./cage

ENV NODE_ENV=production
ENV LEEWAY_MANAGEMENT_API_HOST=0.0.0.0
ENV LEEWAY_MANAGEMENT_API_PORT=4001

EXPOSE 4001 8111

CMD ["npm","run","start:server"]
