FROM node:24-bookworm-slim

WORKDIR /app

# Ensure Python is available for helper scripts that invoke 'py'
RUN apt-get update && \
	apt-get install -y --no-install-recommends python3 ca-certificates curl && \
	rm -rf /var/lib/apt/lists/* && \
	ln -sf /usr/bin/python3 /usr/local/bin/py

# Install production dependencies (context is the `agent-lee-coding-mode` directory)
COPY package.json package-lock.json* ./
RUN npm ci --production --silent || npm install --production --no-audit --no-fund

# Copy application source into the image. We intentionally do NOT embed the
# full "Leeway Runtime Fabric" tree into this image — runtime-fabric runs as
# a separate service in compose. Keeping the context narrow avoids Windows
# bind/mount issues and large context uploads.
COPY . .

# Ensure the Leeway capability registry is available inside the image.
# This includes the universe manifest, loader, and related registry files.
COPY ["Leeway Runtime Fabric/capability-registry/registry", "/app/capability-registry/registry"]

ENV NODE_ENV=production
ENV PORT=8080
# Point to mounted repo path inside the container at runtime
ENV LEEWAY_ECOSYSTEM_ROOT=/leeway
# Default Ollama host (overridden by compose env when appropriate)
ENV OLLAMA_BASE=http://host.docker.internal:11434

EXPOSE 8080

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
