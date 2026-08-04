FROM node:24-alpine
WORKDIR /app
COPY package.json /app/package.json
COPY server.mjs /app/server.mjs
COPY registry.json /app/registry.json
EXPOSE 8860
CMD ["node", "server.mjs"]