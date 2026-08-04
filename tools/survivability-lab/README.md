# LeeWay Agentic Survivability Lab

This lab provides local execution infrastructure to build, break, observe, repair, and certify LeeWay applications before enterprise readiness is claimed.

## Stack
- Docker Compose services: Prometheus, Grafana, OpenTelemetry Collector, Toxiproxy
- Optional local cluster simulation: k3d + kubectl
- Load scripts: k6 scenarios for API, admin, RTC
- Chaos manifests: pod kill, network latency, service restart

## Quick Start (PowerShell)
1. `./scripts/start-lab.ps1`
2. `./scripts/run-load.ps1`
3. `./scripts/run-network-chaos.ps1`
4. `./scripts/run-recovery-test.ps1`
5. `./scripts/run-gauntlet.ps1`
6. `./scripts/collect-evidence.ps1`
7. `./scripts/stop-lab.ps1`

## Outputs
All lab runs write evidence into `Archive/reports/` and include receipt IDs and truth-state fields.

## Rules
- Standards first: LeeWay Standards governs.
- Runtime routing: Bridge Runtime routes.
- Supervision: Admin Command Unit supervises.
- No fake PASS: survivability must be measured.
