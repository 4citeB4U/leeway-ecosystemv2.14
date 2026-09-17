# REGION: LeeWay container definition
# TAG: LEEWAY-CAPABILITY-CENTERS-V1
# WHO: Agent Lee / Leonard Lee; WHAT: consolidated registry runtime; WHY: four to one.
# WHERE: Docker; WHEN: build; HOW: reuse verified source; ROLE: operator; LICENSE: MIT.
ARG NODE_BASE=node:24.18.0-alpine
FROM ${NODE_BASE}
WORKDIR /app
COPY server.mjs launch.mjs health.mjs verify.mjs /app/
COPY registries/ /app/registries/
EXPOSE 8860 8861 8862 8863
HEALTHCHECK --interval=15s --timeout=8s --start-period=10s --retries=3 CMD ["node","/app/health.mjs"]
CMD ["node","/app/launch.mjs"]
