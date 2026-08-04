# Agent Lee Docker Hybrid Fabric Seafile Network Bridge Standard V18.4

Updated: 2026-06-28T01:18:25.8146109Z

## Correct Seafile Facts

- Seafile app container: leeway-seafile
- Seafile DB container: leeway-seafile-db
- Seafile cache container: leeway-seafile-cache
- Seafile network: leeway-seafile-net
- Host port: 8082:80
- App DNS inside seafile network: http://leeway-seafile

## Repair

Hybrid Fabric must join both networks:

- leeway-ecosystemv214_leeway-net
- leeway-seafile-net

## Probe Rule

Seafile endpoint readiness should prefer direct Docker DNS:

- http://leeway-seafile
- http://leeway-seafile/
- http://leeway-seafile/accounts/login/
- http://leeway-seafile/api2/server-info/

Then fallback to:

- http://host.docker.internal:8082

## Guardrail

Only leeway_hybrid_fabric is rebuilt. No Seafile, DB, cache, Agent Lee, Runtime Fabric, Ollama, Voice, Vision, or Creation restart is performed.