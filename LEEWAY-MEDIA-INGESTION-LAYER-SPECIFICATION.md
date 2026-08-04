# Leeway Media Ingestion Layer Specification

**Version**: 1.0.0  
**Status**: PRODUCTION_READY  
**Owner**: Leeway Ecosystem Architecture  
**Port**: 5300  
**Authority**: Controlled by Runtime Fabric (4001)

## Purpose

The Media Ingestion Layer is the canonical entry point for all external media into the Leeway ecosystem. It normalizes diverse media formats (audio, video, images, documents, streams) into standardized Leeway events that can be processed by Agent Lee Code Mode and other Leeway services.

## Architecture Position

```
External Media Sources
  ↓
Media Ingestion Layer (5300) ← Normalization & Validation
  ↓
Leeway Event Bus / Runtime Fabric (4001)
  ↓
Agent Lee Code Mode (8080) ← Processing & Decision
  ↓
Desktop Runtime (8091) / Execution Broker (5200) ← Action
```

## Core Responsibilities

1. **Media Acceptance**: Accept media from multiple sources (file upload, URL, stream, clipboard, drag-drop)
2. **Format Detection**: Auto-detect media type and format
3. **Validation**: Verify media integrity, size limits, format support
4. **Normalization**: Convert to standard Leeway event format
5. **Metadata Extraction**: Extract relevant metadata (duration, dimensions, codec, etc.)
6. **Event Publishing**: Publish normalized events to Runtime Fabric
7. **Receipt Generation**: Generate receipts for all ingestion operations
8. **Error Handling**: Graceful degradation and clear error reporting

## Supported Media Types

### Audio
- **Formats**: WAV, MP3, FLAC, OGG, M4A, AAC
- **Use Cases**: Voice input, audio transcription, sound analysis
- **Max Size**: 100MB per file
- **Processing**: Extract duration, sample rate, channels, bitrate

### Video
- **Formats**: MP4, WEBM, AVI, MOV, MKV
- **Use Cases**: Screen recordings, camera feeds, video analysis
- **Max Size**: 500MB per file
- **Processing**: Extract duration, resolution, fps, codec, extract keyframes

### Images
- **Formats**: JPEG, PNG, GIF, BMP, WEBP, SVG
- **Use Cases**: Screenshots, camera snapshots, document scans, diagrams
- **Max Size**: 50MB per file
- **Processing**: Extract dimensions, color space, EXIF data

### Documents
- **Formats**: PDF, DOCX, TXT, MD, JSON, XML, CSV
- **Use Cases**: Document analysis, data import, configuration
- **Max Size**: 100MB per file
- **Processing**: Extract text, page count, metadata

### Streams
- **Formats**: WebRTC, HLS, RTSP, WebSocket
- **Use Cases**: Live camera, live microphone, real-time data
- **Max Duration**: Configurable (default 30 minutes)
- **Processing**: Chunk into segments, extract metadata per segment

## Event Schema

All ingested media is normalized to this event format:

```json
{
  "schema": "leeway.media-ingestion.event.v1",
  "eventId": "media-ingest-<timestamp>-<random>",
  "eventType": "media.ingested",
  "timestamp": "2026-06-19T09:15:00.000Z",
  "source": {
    "type": "file_upload|url|stream|clipboard|drag_drop",
    "origin": "user|system|external_api",
    "path": "/path/to/file or URL",
    "originalFilename": "example.mp4"
  },
  "media": {
    "type": "audio|video|image|document|stream",
    "format": "mp4",
    "mimeType": "video/mp4",
    "sizeBytes": 1048576,
    "checksum": "sha256:abc123...",
    "storagePath": "Archive/media-ingestion/<YYYY>/<MM>/<DD>/<eventId>/original.mp4"
  },
  "metadata": {
    "duration": 30.5,
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "codec": "h264",
    "bitrate": 2000000,
    "channels": 2,
    "sampleRate": 48000,
    "pageCount": 10,
    "extractedText": "...",
    "exif": {}
  },
  "processing": {
    "status": "ready|processing|completed|failed",
    "extractedFrames": [],
    "extractedAudio": null,
    "transcription": null,
    "analysis": null
  },
  "routing": {
    "targetService": "agent-lee-code-mode",
    "targetEndpoint": "http://127.0.0.1:8080/v1/chat/completions",
    "priority": "normal|high|urgent",
    "requiresHumanApproval": false
  },
  "receipt": {
    "receiptPath": "Archive/receipts/media-ingestion/<YYYY>/<MM>/<DD>/<eventId>.json",
    "status": "INGESTED|PROCESSING|COMPLETED|FAILED",
    "ok": true,
    "error": null
  }
}
```

## API Endpoints

### Health & Status

**GET /media-ingestion/health**
```json
{
  "ok": true,
  "service": "leeway-media-ingestion-layer",
  "port": 5300,
  "status": "healthy",
  "uptime": 3600,
  "stats": {
    "totalIngested": 150,
    "totalBytes": 1073741824,
    "activeStreams": 2,
    "queueDepth": 5
  }
}
```

**GET /media-ingestion/status**
- Returns detailed service status including supported formats, limits, and current load

### File Upload

**POST /media-ingestion/upload**
```json
{
  "file": "<multipart file>",
  "metadata": {
    "source": "user",
    "description": "Screen recording of bug",
    "tags": ["bug", "ui", "critical"]
  },
  "routing": {
    "targetService": "agent-lee-code-mode",
    "priority": "high"
  }
}
```

Response:
```json
{
  "ok": true,
  "eventId": "media-ingest-20260619-091500-abc123",
  "status": "ingested",
  "storagePath": "Archive/media-ingestion/2026/06/19/media-ingest-20260619-091500-abc123/original.mp4",
  "receiptPath": "Archive/receipts/media-ingestion/2026/06/19/media-ingest-20260619-091500-abc123.json",
  "media": {
    "type": "video",
    "format": "mp4",
    "sizeBytes": 1048576,
    "duration": 30.5
  }
}
```

### URL Ingestion

**POST /media-ingestion/from-url**
```json
{
  "url": "https://example.com/video.mp4",
  "metadata": {
    "source": "external_api",
    "description": "Tutorial video"
  }
}
```

### Stream Ingestion

**POST /media-ingestion/stream/start**
```json
{
  "streamType": "webrtc|websocket|rtsp",
  "streamUrl": "ws://localhost:8765/camera",
  "maxDuration": 1800,
  "chunkSize": 30,
  "metadata": {
    "source": "camera",
    "description": "Live camera feed"
  }
}
```

Response:
```json
{
  "ok": true,
  "streamId": "stream-20260619-091500-abc123",
  "status": "streaming",
  "endpoint": "ws://127.0.0.1:5300/media-ingestion/stream/stream-20260619-091500-abc123"
}
```

**POST /media-ingestion/stream/stop**
```json
{
  "streamId": "stream-20260619-091500-abc123"
}
```

### Clipboard Ingestion

**POST /media-ingestion/from-clipboard**
```json
{
  "confirm": "I_AUTHORIZE_LEEWAY_CLIPBOARD_ACCESS",
  "metadata": {
    "source": "clipboard",
    "description": "Pasted screenshot"
  }
}
```

### Query & Retrieval

**GET /media-ingestion/events?since=<timestamp>&type=<type>&limit=<n>**
- Query ingested media events

**GET /media-ingestion/event/<eventId>**
- Get specific event details

**GET /media-ingestion/event/<eventId>/download**
- Download original media file

## Processing Pipeline

### Stage 1: Acceptance
1. Receive media from source
2. Validate size and format
3. Generate eventId
4. Create temporary storage

### Stage 2: Analysis
1. Detect media type and format
2. Extract metadata
3. Calculate checksum
4. Validate integrity

### Stage 3: Storage
1. Move to permanent storage under `Archive/media-ingestion/<YYYY>/<MM>/<DD>/<eventId>/`
2. Store original file
3. Generate thumbnails/previews if applicable
4. Extract audio track if video

### Stage 4: Normalization
1. Create Leeway event object
2. Populate all required fields
3. Generate receipt

### Stage 5: Publishing
1. Publish event to Runtime Fabric
2. Route to target service (usually Agent Lee Code Mode)
3. Update receipt with routing status

### Stage 6: Cleanup
1. Remove temporary files
2. Archive old events (configurable retention)
3. Update statistics

## Receipt Format

```json
{
  "schema": "leeway.media-ingestion.receipt.v1",
  "receiptId": "media-ingest-20260619-091500-abc123",
  "status": "COMPLETED",
  "ok": true,
  "startedAt": "2026-06-19T09:15:00.000Z",
  "endedAt": "2026-06-19T09:15:05.000Z",
  "durationMs": 5000,
  "source": {
    "type": "file_upload",
    "origin": "user",
    "originalFilename": "screen-recording.mp4"
  },
  "media": {
    "type": "video",
    "format": "mp4",
    "sizeBytes": 1048576,
    "checksum": "sha256:abc123...",
    "storagePath": "Archive/media-ingestion/2026/06/19/media-ingest-20260619-091500-abc123/original.mp4"
  },
  "metadata": {
    "duration": 30.5,
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "codec": "h264"
  },
  "processing": {
    "thumbnailGenerated": true,
    "audioExtracted": true,
    "metadataExtracted": true
  },
  "routing": {
    "published": true,
    "targetService": "agent-lee-code-mode",
    "publishedAt": "2026-06-19T09:15:05.000Z"
  },
  "error": null
}
```

## Security & Safety

### Validation Rules
- **Size Limits**: Enforce per-type size limits
- **Format Whitelist**: Only accept explicitly supported formats
- **Malware Scanning**: Optional integration with antivirus
- **Content Policy**: Optional content filtering (NSFW, violence, etc.)

### Privacy Rules
- **No Silent Capture**: All ingestion requires explicit user action or API call
- **Consent Tokens**: Clipboard and stream access require confirmation tokens
- **Data Retention**: Configurable retention policy (default 90 days)
- **Deletion**: Support for immediate deletion on user request

### Access Control
- **Local Only**: Bind to 127.0.0.1 by default
- **API Keys**: Optional API key authentication for external access
- **Rate Limiting**: Prevent abuse (default 100 requests/minute)

## Integration with Existing Services

### Agent Lee Code Mode (8080)
- Receives normalized media events
- Can request additional processing (transcription, analysis)
- Can trigger actions based on media content

### Desktop Runtime (8091)
- Provides camera and microphone streams
- Handles local file access
- Manages clipboard access

### Runtime Fabric (4001)
- Monitors Media Ingestion Layer health
- Routes events to appropriate services
- Manages event bus

### Execution Broker (5200)
- Can trigger media ingestion as part of workflows
- Receives media processing results
- Manages media-related system actions

## Configuration

**Environment Variables**:
```bash
LEEWAY_MEDIA_INGESTION_PORT=5300
LEEWAY_MEDIA_INGESTION_STORAGE_ROOT=Archive/media-ingestion
LEEWAY_MEDIA_INGESTION_RECEIPT_ROOT=Archive/receipts/media-ingestion
LEEWAY_MEDIA_INGESTION_MAX_AUDIO_SIZE=104857600  # 100MB
LEEWAY_MEDIA_INGESTION_MAX_VIDEO_SIZE=524288000  # 500MB
LEEWAY_MEDIA_INGESTION_MAX_IMAGE_SIZE=52428800   # 50MB
LEEWAY_MEDIA_INGESTION_MAX_DOCUMENT_SIZE=104857600  # 100MB
LEEWAY_MEDIA_INGESTION_RETENTION_DAYS=90
LEEWAY_MEDIA_INGESTION_ENABLE_THUMBNAILS=true
LEEWAY_MEDIA_INGESTION_ENABLE_AUDIO_EXTRACTION=true
```

## Error Handling

### Common Errors
- `UNSUPPORTED_FORMAT`: Media format not in whitelist
- `SIZE_LIMIT_EXCEEDED`: File too large
- `INVALID_MEDIA`: Corrupted or invalid media file
- `STORAGE_FULL`: Insufficient disk space
- `PROCESSING_FAILED`: Error during metadata extraction
- `ROUTING_FAILED`: Could not publish to Runtime Fabric

### Error Response Format
```json
{
  "ok": false,
  "error": "SIZE_LIMIT_EXCEEDED",
  "message": "Video file exceeds maximum size of 500MB",
  "details": {
    "fileSize": 600000000,
    "maxSize": 524288000,
    "mediaType": "video"
  },
  "receiptPath": "Archive/receipts/media-ingestion/2026/06/19/media-ingest-20260619-091500-abc123.json"
}
```

## Monitoring & Metrics

### Key Metrics
- **Ingestion Rate**: Media files per minute
- **Processing Time**: Average time from ingestion to publishing
- **Storage Usage**: Total bytes stored
- **Error Rate**: Failed ingestions per hour
- **Queue Depth**: Pending media items
- **Active Streams**: Current streaming connections

### Health Checks
- **Storage Health**: Disk space available
- **Processing Health**: Worker threads responsive
- **Routing Health**: Can reach Runtime Fabric
- **Format Support**: All required codecs available

## Future Enhancements

1. **Real-time Transcription**: Live audio transcription during streaming
2. **Video Analysis**: Object detection, scene detection, OCR
3. **Audio Analysis**: Speaker diarization, emotion detection
4. **Document OCR**: Extract text from images and PDFs
5. **Format Conversion**: Automatic conversion to preferred formats
6. **Compression**: Automatic compression for large files
7. **Cloud Storage**: Optional cloud backup integration
8. **Collaborative Ingestion**: Multi-user media sharing

## Non-Negotiables

1. All ingestion operations MUST generate receipts
2. All media MUST be stored under `Archive/media-ingestion/`
3. All receipts MUST be stored under `Archive/receipts/media-ingestion/`
4. Size limits MUST be enforced
5. Format whitelist MUST be enforced
6. No silent capture or access
7. Explicit consent required for clipboard and streams
8. Local-first operation (127.0.0.1 binding)
9. Graceful degradation on errors
10. Clear error messages for users

## Compliance with AGENTS.md

- ✅ Receipt-backed operations
- ✅ Local-first architecture
- ✅ Explicit consent for sensitive operations
- ✅ Controlled by Runtime Fabric
- ✅ Integrates with Agent Lee Code Mode as brain
- ✅ No silent capture
- ✅ Audit trail via receipts
- ✅ Data custody under Archive/
- ✅ Clear error handling
- ✅ Health monitoring integration