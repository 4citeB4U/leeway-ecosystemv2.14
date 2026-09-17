# REGION: LeeWay skills runtime recovery
# TAG: LEEWAY-SKILLS-DOCKER-V1
# WHO: Agent Lee; WHAT: preserve legacy registry plus canonical authority.
# WHY: connect skill instructions and live inventory without a second service.
# WHERE: Docker; WHEN: build; HOW: verified existing image; ROLE: operator; LICENSE: MIT.
ARG LEGACY_BASE=leeway_agent_skills:truth-sync
FROM ${LEGACY_BASE}
WORKDIR /app
COPY legacy_app.py entry.py authority_projection.py authority-manifest.json /app/
COPY authority/ /canonical-agent-skills/
HEALTHCHECK --interval=30s --timeout=8s --start-period=10s --retries=3 CMD ["python","-c","import urllib.request; urllib.request.urlopen('http://127.0.0.1:5327/authority',timeout=5).read()"]
CMD ["uvicorn","entry:app","--host","0.0.0.0","--port","5327"]

