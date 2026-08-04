FROM node:24-alpine
WORKDIR /app
COPY package.json /app/package.json
COPY server.mjs /app/server.mjs
EXPOSE 5301
CMD ["node", "server.mjs"]