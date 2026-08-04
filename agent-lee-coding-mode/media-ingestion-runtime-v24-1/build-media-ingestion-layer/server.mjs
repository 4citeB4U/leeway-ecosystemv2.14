import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.LEEWAY_MEDIA_INGESTION_PORT || 5300);
const ROOT = path.resolve(__dirname, "..");
const STORAGE_ROOT = path.join(ROOT, "Archive", "media-ingestion");
const RECEIPT_ROOT = path.join(ROOT, "Archive", "receipts", "media-ingestion");
const TEMP_ROOT = path.join(__dirname, "tmp");
const RUNTIME_FABRIC_URL = process.env.LEEWAY_RUNTIME_FABRIC_URL || "http://127.0.0.1:4001";

// Size limits (bytes)
const MAX_AUDIO_SIZE = Number(process.env.LEEWAY_MEDIA_INGESTION_MAX_AUDIO_SIZE || 104857600); // 100MB
const MAX_VIDEO_SIZE = Number(process.env.LEEWAY_MEDIA_INGESTION_MAX_VIDEO_SIZE || 524288000); // 500MB
const MAX_IMAGE_SIZE = Number(process.env.LEEWAY_MEDIA_INGESTION_MAX_IMAGE_SIZE || 52428800); // 50MB
const MAX_DOCUMENT_SIZE = Number(process.env.LEEWAY_MEDIA_INGESTION_MAX_DOCUMENT_SIZE || 104857600); // 100MB

// Supported formats
const SUPPORTED_FORMATS = {
  audio: ["wav", "mp3", "flac", "ogg", "m4a", "aac"],
  video: ["mp4", "webm", "avi", "mov", "mkv"],
  image: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"],
  document: ["pdf", "docx", "txt", "md", "json", "xml", "csv"]
};

const MIME_TYPES = {
  // Audio
  wav: "audio/wav",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  // Image
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  // Document
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv"
};

// Ensure directories exist
fs.mkdirSync(STORAGE_ROOT, { recursive: true });
fs.mkdirSync(RECEIPT_ROOT, { recursive: true });
fs.mkdirSync(TEMP_ROOT, { recursive: true });

const app = express();
app.use(express.json({ limit: "10mb" }));

// Statistics
let stats = {
  totalIngested: 0,
  totalBytes: 0,
  activeStreams: 0,
  queueDepth: 0,
  startedAt: new Date().toISOString()
};

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/\.\d+Z$/, "Z");
}

function generateEventId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  return `media-ingest-${timestamp}-${random}`;
}

function calculateChecksum(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return `sha256:${hash.digest("hex")}`;
}

function detectMediaType(filename) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  for (const [type, formats] of Object.entries(SUPPORTED_FORMATS)) {
    if (formats.includes(ext)) {
      return { type, format: ext, mimeType: MIME_TYPES[ext] || "application/octet-stream" };
    }
  }
  return null;
}

function getMaxSize(mediaType) {
  switch (mediaType) {
    case "audio": return MAX_AUDIO_SIZE;
    case "video": return MAX_VIDEO_SIZE;
    case "image": return MAX_IMAGE_SIZE;
    case "document": return MAX_DOCUMENT_SIZE;
    default: return MAX_DOCUMENT_SIZE;
  }
}

function createStoragePath(eventId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dir = path.join(STORAGE_ROOT, String(year), month, day, eventId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createReceiptPath(eventId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dir = path.join(RECEIPT_ROOT, String(year), month, day);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${eventId}.json`);
}

function writeReceipt(receiptPath, data) {
  fs.writeFileSync(receiptPath, JSON.stringify(data, null, 2), "utf8");
}

function createEvent(eventId, sourceType, sourceOrigin, sourcePath, originalFilename, mediaInfo, storagePath, receiptPath, metadata = {}) {
  return {
    schema: "leeway.media-ingestion.event.v1",
    eventId,
    eventType: "media.ingested",
    timestamp: new Date().toISOString(),
    source: {
      type: sourceType,
      origin: sourceOrigin,
      path: sourcePath,
      originalFilename
    },
    media: {
      type: mediaInfo.type,
      format: mediaInfo.format,
      mimeType: mediaInfo.mimeType,
      sizeBytes: mediaInfo.sizeBytes,
      checksum: mediaInfo.checksum,
      storagePath
    },
    metadata,
    processing: {
      status: "ready",
      extractedFrames: [],
      extractedAudio: null,
      transcription: null,
      analysis: null
    },
    routing: {
      targetService: "agent-lee-code-mode",
      targetEndpoint: "http://127.0.0.1:8080/v1/chat/completions",
      priority: "normal",
      requiresHumanApproval: false
    },
    receipt: {
      receiptPath,
      status: "INGESTED",
      ok: true,
      error: null
    }
  };
}

function createReceipt(eventId, sourceType, sourceOrigin, originalFilename, mediaInfo, storagePath, status = "COMPLETED", error = null) {
  return {
    schema: "leeway.media-ingestion.receipt.v1",
    receiptId: eventId,
    status,
    ok: error === null,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 0,
    source: {
      type: sourceType,
      origin: sourceOrigin,
      originalFilename
    },
    media: {
      type: mediaInfo.type,
      format: mediaInfo.format,
      sizeBytes: mediaInfo.sizeBytes,
      checksum: mediaInfo.checksum,
      storagePath
    },
    metadata: {},
    processing: {
      thumbnailGenerated: false,
      audioExtracted: false,
      metadataExtracted: true
    },
    routing: {
      published: false,
      targetService: "agent-lee-code-mode",
      publishedAt: null
    },
    error
  };
}

async function publishToRuntimeFabric(event) {
  try {
    const response = await fetch(`${RUNTIME_FABRIC_URL}/events/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to publish to Runtime Fabric:", error);
    return false;
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: TEMP_ROOT,
  limits: {
    fileSize: MAX_VIDEO_SIZE // Use largest limit, we'll validate per-type
  }
});

// Health endpoint
app.get(["/media-ingestion/health", "/health"], (_req, res) => {
  res.json({
    ok: true,
    service: "leeway-media-ingestion-layer",
    port: PORT,
    status: "healthy",
    uptime: Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000),
    stats: {
      totalIngested: stats.totalIngested,
      totalBytes: stats.totalBytes,
      activeStreams: stats.activeStreams,
      queueDepth: stats.queueDepth
    }
  });
});

// Status endpoint
app.get("/media-ingestion/status", (_req, res) => {
  res.json({
    ok: true,
    service: "leeway-media-ingestion-layer",
    port: PORT,
    status: "healthy",
    supportedFormats: SUPPORTED_FORMATS,
    limits: {
      maxAudioSize: MAX_AUDIO_SIZE,
      maxVideoSize: MAX_VIDEO_SIZE,
      maxImageSize: MAX_IMAGE_SIZE,
      maxDocumentSize: MAX_DOCUMENT_SIZE
    },
    stats: {
      totalIngested: stats.totalIngested,
      totalBytes: stats.totalBytes,
      activeStreams: stats.activeStreams,
      queueDepth: stats.queueDepth,
      startedAt: stats.startedAt,
      uptime: Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000)
    },
    storage: {
      root: STORAGE_ROOT,
      receiptRoot: RECEIPT_ROOT
    }
  });
});

// File upload endpoint
app.post("/media-ingestion/upload", upload.single("file"), async (req, res) => {
  const startTime = Date.now();
  let eventId = null;
  let receiptPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "NO_FILE_PROVIDED",
        message: "No file was uploaded"
      });
    }

    const originalFilename = req.file.originalname;
    const tempPath = req.file.path;
    const fileSize = req.file.size;

    // Detect media type
    const mediaInfo = detectMediaType(originalFilename);
    if (!mediaInfo) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({
        ok: false,
        error: "UNSUPPORTED_FORMAT",
        message: `File format not supported: ${path.extname(originalFilename)}`,
        supportedFormats: SUPPORTED_FORMATS
      });
    }

    // Validate size
    const maxSize = getMaxSize(mediaInfo.type);
    if (fileSize > maxSize) {
      fs.unlinkSync(tempPath);
      return res.status(400).json({
        ok: false,
        error: "SIZE_LIMIT_EXCEEDED",
        message: `${mediaInfo.type} file exceeds maximum size of ${Math.floor(maxSize / 1048576)}MB`,
        details: {
          fileSize,
          maxSize,
          mediaType: mediaInfo.type
        }
      });
    }

    // Generate event ID and paths
    eventId = generateEventId();
    const storageDir = createStoragePath(eventId);
    const storagePath = path.join(storageDir, `original.${mediaInfo.format}`);
    receiptPath = createReceiptPath(eventId);

    // Move file to permanent storage
    fs.renameSync(tempPath, storagePath);

    // Calculate checksum
    const checksum = calculateChecksum(storagePath);

    // Create media info
    mediaInfo.sizeBytes = fileSize;
    mediaInfo.checksum = checksum;

    // Parse metadata from request
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    const routing = req.body.routing ? JSON.parse(req.body.routing) : {};

    // Create event
    const event = createEvent(
      eventId,
      "file_upload",
      metadata.source || "user",
      storagePath,
      originalFilename,
      mediaInfo,
      storagePath,
      receiptPath,
      metadata
    );

    // Override routing if provided
    if (routing.targetService) event.routing.targetService = routing.targetService;
    if (routing.priority) event.routing.priority = routing.priority;

    // Create receipt
    const receipt = createReceipt(
      eventId,
      "file_upload",
      metadata.source || "user",
      originalFilename,
      mediaInfo,
      storagePath,
      "COMPLETED",
      null
    );
    receipt.durationMs = Date.now() - startTime;
    receipt.endedAt = new Date().toISOString();

    // Publish to Runtime Fabric
    const published = await publishToRuntimeFabric(event);
    receipt.routing.published = published;
    if (published) {
      receipt.routing.publishedAt = new Date().toISOString();
    }

    // Write receipt
    writeReceipt(receiptPath, receipt);

    // Update stats
    stats.totalIngested++;
    stats.totalBytes += fileSize;

    res.json({
      ok: true,
      eventId,
      status: "ingested",
      storagePath,
      receiptPath,
      media: {
        type: mediaInfo.type,
        format: mediaInfo.format,
        sizeBytes: fileSize,
        checksum
      },
      published
    });

  } catch (error) {
    console.error("Upload failed:", error);

    // Write error receipt if we have paths
    if (eventId && receiptPath) {
      try {
        const errorReceipt = {
          schema: "leeway.media-ingestion.receipt.v1",
          receiptId: eventId,
          status: "FAILED",
          ok: false,
          startedAt: new Date(startTime).toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          error: error.message
        };
        writeReceipt(receiptPath, errorReceipt);
      } catch {}
    }

    res.status(500).json({
      ok: false,
      error: "PROCESSING_FAILED",
      message: error.message,
      receiptPath
    });
  }
});

// URL ingestion endpoint
app.post("/media-ingestion/from-url", async (req, res) => {
  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "URL ingestion not yet implemented"
  });
});

// Stream start endpoint
app.post("/media-ingestion/stream/start", async (req, res) => {
  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Stream ingestion not yet implemented"
  });
});

// Stream stop endpoint
app.post("/media-ingestion/stream/stop", async (req, res) => {
  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Stream stop not yet implemented"
  });
});

// Clipboard ingestion endpoint
app.post("/media-ingestion/from-clipboard", async (req, res) => {
  const confirm = String(req.body?.confirm || "");
  if (confirm !== "I_AUTHORIZE_LEEWAY_CLIPBOARD_ACCESS") {
    return res.status(403).json({
      ok: false,
      error: "Clipboard access confirmation required",
      requiredConfirm: "I_AUTHORIZE_LEEWAY_CLIPBOARD_ACCESS"
    });
  }

  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Clipboard ingestion not yet implemented"
  });
});

// Query events endpoint
app.get("/media-ingestion/events", (req, res) => {
  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Event query not yet implemented"
  });
});

// Get specific event endpoint
app.get("/media-ingestion/event/:eventId", (req, res) => {
  const { eventId } = req.params;
  
  // Try to find receipt
  const receiptPattern = path.join(RECEIPT_ROOT, "**", `${eventId}.json`);
  // Simple implementation - would need glob in production
  
  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Event retrieval not yet implemented"
  });
});

// Download media endpoint
app.get("/media-ingestion/event/:eventId/download", (req, res) => {
  res.status(501).json({
    ok: false,
    error: "NOT_IMPLEMENTED",
    message: "Media download not yet implemented"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Leeway Media Ingestion Layer running on http://127.0.0.1:${PORT}`);
  console.log(`Storage root: ${STORAGE_ROOT}`);
  console.log(`Receipt root: ${RECEIPT_ROOT}`);
});

// Made with Bob
