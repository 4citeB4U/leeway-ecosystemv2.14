# Agent Lee Vision Kernel

Local Agent Lee vision service for `qwen2.5vl:7b`.

Routes:

- `GET /health`
- `GET /vision/status`
- `GET /vision/manifest`
- `GET /vision/model`
- `POST /vision/analyze/image`
- `POST /vision/analyze/screen`
- `POST /vision/analyze/camera-frame`
- `POST /vision/room/analyze`
- `GET /vision/receipts/recent`
- `GET /vision/reports/latest`

Camera capture remains owned by the host camera bridge. This service analyzes
explicitly supplied frames only and must not silently capture camera input.
