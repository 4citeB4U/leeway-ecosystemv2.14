# Agent Lee Creation Kernel

This is the real image creation lane for Agent Lee.

Port: 8094

Endpoints:
- GET /health
- GET /status
- POST /warmup
- POST /image/generate
- POST /generate

Truth:
- Qwen3-VL is the vision/director lane.
- SDXL-Turbo / diffusion is the real pixel creation lane.
- No placeholder success is returned when model generation fails.

Integration:
Agent Lee / Desktop Runtime / Runtime Fabric should call:

http://127.0.0.1:8094/image/generate

