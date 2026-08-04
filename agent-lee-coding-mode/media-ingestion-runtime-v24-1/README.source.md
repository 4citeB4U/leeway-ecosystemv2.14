# Leeway Media Ingestion Layer

**Version**: 1.0.0  
**Port**: 5300  
**Status**: PRODUCTION_READY

## Purpose

The Media Ingestion Layer is the canonical entry point for all external media into the Leeway ecosystem. It normalizes diverse media formats (audio, video, images, documents, streams) into standardized Leeway events.

## Quick Start

```powershell
# Install dependencies
cd media-ingestion-layer
npm install

# Start service
.\start-media-ingestion-layer.ps1

# Or start in development mode with watch
.\start-media-ingestion-layer.ps1 -Dev
```

## Architecture

```
External Media Sources
  ↓
Media Ingestion Layer (5300) ← Normalization & Validation
  ↓
Runtime Fabric (4001) ← Event Bus
  ↓
Agent Lee Code Mode (8080) ← Processing & Decision
```

## Supported Media Types

- **Audio**: WAV, MP3, FLAC, OGG, M4A, AAC (max 100MB)
- **Video**: MP4, WEBM, AVI, MOV, MKV (max 500MB)
- **Images**: JPEG, PNG, GIF, BMP, WEBP, SVG (max 50MB)
- **Documents**: PDF, DOCX, TXT, MD, JSON, XML, CSV (max 100MB)

## API Endpoints

### Health & Status

```bash
# Health check
curl http://127.0.0.1:5300/media-ingestion/health

# Detailed status
curl http://127.0.0.1:5300/media-ingestion/status
```

### File Upload

```bash
# Upload a file
curl -X POST http://127.0.0.1:5300/media-ingestion/upload \
  -F "file=@/path/to/video.mp4" \
  -F 'metadata={"source":"user","description":"Screen recording"}'
```

### PowerShell Example

```powershell
$file = "C:\path\to\video.mp4"
$uri = "http://127.0.0.1:5300/media-ingestion/upload"

$form = @{
    file = Get-Item -Path $file
    metadata = '{"source":"user","description":"Test video"}'
}

Invoke-RestMethod -Uri $uri -Method Post -Form $form
```

## Storage Structure

```
Archive/
├── media-ingestion/
│   └── YYYY/
│       └── MM/
│           └── DD/
│               └── <eventId>/
│                   └── original.<ext>
└── receipts/
    └── media-ingestion/
        └── YYYY/
            └── MM/
                └── DD/
                    └── <eventId>.json
```

## Event Schema

All ingested media is normalized to:

```json
{
  "schema": "leeway.media-ingestion.event.v1",
  "eventId": "media-ingest-<timestamp>-<random>",
  "eventType": "media.ingested",
  "timestamp": "2026-06-19T09:15:00.000Z",
  "source": {
    "type": "file_upload",
    "origin": "user",
    "path": "/path/to/file",
    "originalFilename": "video.mp4"
  },
  "media": {
    "type": "video",
    "format": "mp4",
    "mimeType": "video/mp4",
    "sizeBytes": 1048576,
    "checksum": "sha256:abc123...",
    "storagePath": "Archive/media-ingestion/2026/06/19/<eventId>/original.mp4"
  },
  "routing": {
    "targetService": "agent-lee-code-mode",
    "targetEndpoint": "http://127.0.0.1:8080/v1/chat/completions",
    "priority": "normal"
  },
  "receipt": {
    "receiptPath": "Archive/receipts/media-ingestion/2026/06/19/<eventId>.json",
    "status": "INGESTED",
    "ok": true
  }
}
```

## Receipt Format

```json
{
  "schema": "leeway.media-ingestion.receipt.v1",
  "receiptId": "media-ingest-<timestamp>-<random>",
  "status": "COMPLETED",
  "ok": true,
  "startedAt": "2026-06-19T09:15:00.000Z",
  "endedAt": "2026-06-19T09:15:05.000Z",
  "durationMs": 5000,
  "source": {
    "type": "file_upload",
    "origin": "user",
    "originalFilename": "video.mp4"
  },
  "media": {
    "type": "video",
    "format": "mp4",
    "sizeBytes": 1048576,
    "checksum": "sha256:abc123...",
    "storagePath": "Archive/media-ingestion/2026/06/19/<eventId>/original.mp4"
  },
  "routing": {
    "published": true,
    "targetService": "agent-lee-code-mode",
    "publishedAt": "2026-06-19T09:15:05.000Z"
  }
}
```

## Configuration

Environment variables:

```bash
LEEWAY_MEDIA_INGESTION_PORT=5300
LEEWAY_RUNTIME_FABRIC_URL=http://127.0.0.1:4001
LEEWAY_MEDIA_INGESTION_MAX_AUDIO_SIZE=104857600  # 100MB
LEEWAY_MEDIA_INGESTION_MAX_VIDEO_SIZE=524288000  # 500MB
LEEWAY_MEDIA_INGESTION_MAX_IMAGE_SIZE=52428800   # 50MB
LEEWAY_MEDIA_INGESTION_MAX_DOCUMENT_SIZE=104857600  # 100MB
```

## Integration

### With Agent Lee Code Mode

Media events are automatically published to Runtime Fabric and routed to Agent Lee Code Mode for processing.

### With Desktop Runtime

Desktop Runtime (8091) provides camera and microphone streams that can be ingested through this layer.

### With Execution Broker

Execution Broker (5200) can trigger media ingestion as part of workflows.

## Error Handling

Common errors:

- `UNSUPPORTED_FORMAT`: Media format not in whitelist
- `SIZE_LIMIT_EXCEEDED`: File too large
- `INVALID_MEDIA`: Corrupted or invalid media file
- `PROCESSING_FAILED`: Error during metadata extraction
- `ROUTING_FAILED`: Could not publish to Runtime Fabric

## Security

- **Local Only**: Binds to 127.0.0.1 by default
- **Size Limits**: Enforced per media type
- **Format Whitelist**: Only explicitly supported formats accepted
- **Checksum Verification**: SHA-256 checksum for all files
- **Receipt Trail**: All operations generate receipts

## Monitoring

Health check endpoint provides:
- Service status
- Uptime
- Total files ingested
- Total bytes processed
- Active streams
- Queue depth

## Future Enhancements

- URL ingestion (download from URL)
- Stream ingestion (WebRTC, WebSocket, RTSP)
- Clipboard ingestion
- Real-time transcription
- Video analysis (object detection, OCR)
- Audio analysis (speaker diarization)
- Document OCR
- Format conversion
- Automatic compression

## Compliance

✅ Receipt-backed operations  
✅ Local-first architecture  
✅ Controlled by Runtime Fabric  
✅ Integrates with Agent Lee Code Mode  
✅ Data custody under Archive/  
✅ Clear error handling  
✅ Health monitoring integration

## See Also

- [LEEWAY-MEDIA-INGESTION-LAYER-SPECIFICATION.md](../LEEWAY-MEDIA-INGESTION-LAYER-SPECIFICATION.md) - Full specification
- [AGENTS.md](../AGENTS.md) - Leeway agent operating standard
- [LEEWAY-EXECUTION-BROKER-SPECIFICATION.md](../LEEWAY-EXECUTION-BROKER-SPECIFICATION.md) - Execution broker spec
- [RUNTIME-FABRIC-HEALTH-ORCHESTRATOR-SPECIFICATION.md](../RUNTIME-FABRIC-HEALTH-ORCHESTRATOR-SPECIFICATION.md) - Health orchestrator spec