import base64
import json
import os
import shutil
import time
import uuid
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel, Field

APP = "leeway_seafile_storage_gateway"
VERSION = "0.1.0-scaffold"

RECEIPT_DIR = Path(os.environ.get("LEEWAY_RECEIPT_DIR", "/app/receipts"))
STORAGE_DIR = Path(os.environ.get("LEEWAY_STORAGE_DIR", "/gateway-store"))
SEAFILE_SHARED = Path(os.environ.get("LEEWAY_SEAFILE_SHARED", "/seafile-shared"))

RECEIPT_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
SEAFILE_SHARED.mkdir(parents=True, exist_ok=True)

app = FastAPI(title=APP, version=VERSION)


class StoreRequest(BaseModel):
    name: str = Field(..., min_length=1)
    content: Optional[str] = ""
    content_base64: Optional[str] = None
    metadata: Dict[str, Any] = {}
    mirror_to_seafile_shared: bool = True


class BackupRequest(BaseModel):
    include_runtime_contracts: bool = True
    include_gateway_store: bool = True
    include_receipts: bool = True
    label: Optional[str] = "manual"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_name(name: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in ["-", "_", ".", " "] else "_" for ch in name).strip()
    return cleaned[:160] or f"artifact-{uuid.uuid4().hex[:8]}.txt"


def write_receipt(kind: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    receipt = {
        "verdict": payload.get("verdict", f"{APP}_{kind.upper()}_RECEIPT"),
        "lane": APP,
        "version": VERSION,
        "kind": kind,
        "created_at": now_iso(),
        **payload,
    }
    path = RECEIPT_DIR / f"{APP}_{kind}_{int(time.time())}_{uuid.uuid4().hex[:8]}.receipt.json"
    path.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    latest = RECEIPT_DIR / "latest.receipt.json"
    latest.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    receipt["receipt_path"] = str(path)
    return receipt


def store_bytes(kind: str, name: str, data: bytes, metadata: Dict[str, Any], mirror: bool = True) -> Dict[str, Any]:
    filename = safe_name(name)
    kind_dir = STORAGE_DIR / kind
    kind_dir.mkdir(parents=True, exist_ok=True)

    target = kind_dir / filename
    target.write_bytes(data)

    mirror_path = None
    if mirror:
        try:
            mirror_root = SEAFILE_SHARED / "leeway-agent-lee-ingest" / kind
            mirror_root.mkdir(parents=True, exist_ok=True)
            mirror_path_obj = mirror_root / filename
            mirror_path_obj.write_bytes(data)
            mirror_path = str(mirror_path_obj)
        except Exception as e:
            mirror_path = f"MIRROR_FAILED: {repr(e)}"

    receipt = write_receipt(f"store_{kind}", {
        "verdict": f"LEEWAY_SEAFILE_GATEWAY_STORED_{kind.upper()}",
        "kind": kind,
        "filename": filename,
        "storage_path": str(target),
        "mirror_path": mirror_path,
        "bytes": len(data),
        "metadata": metadata,
    })

    return {
        "ok": True,
        "lane": APP,
        "kind": kind,
        "filename": filename,
        "storage_path": str(target),
        "mirror_path": mirror_path,
        "receipt": receipt,
    }


def decode_request(req: StoreRequest) -> bytes:
    if req.content_base64:
        return base64.b64decode(req.content_base64)
    return (req.content or "").encode("utf-8")


@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP,
        "version": VERSION,
        "created_at": now_iso(),
    }


@app.get("/status")
def status():
    return {
        "app": APP,
        "version": VERSION,
        "purpose": "Governed storage and backup gateway for Agent Lee artifacts before Seafile/API hard wiring.",
        "endpoints": [
            "/health",
            "/status",
            "/openapi.json",
            "/store/receipt",
            "/store/research-brief",
            "/store/notebook-export",
            "/store/generated-image",
            "/store/3d-package",
            "/store/upload/{kind}",
            "/backup/run",
            "/backup/status",
            "/receipts/latest",
        ],
        "storage_dir": str(STORAGE_DIR),
        "seafile_shared": str(SEAFILE_SHARED),
        "created_at": now_iso(),
    }


@app.post("/store/receipt")
def store_receipt(req: StoreRequest):
    return store_bytes("receipt", req.name, decode_request(req), req.metadata, req.mirror_to_seafile_shared)


@app.post("/store/research-brief")
def store_research_brief(req: StoreRequest):
    return store_bytes("research-brief", req.name, decode_request(req), req.metadata, req.mirror_to_seafile_shared)


@app.post("/store/notebook-export")
def store_notebook_export(req: StoreRequest):
    return store_bytes("notebook-export", req.name, decode_request(req), req.metadata, req.mirror_to_seafile_shared)


@app.post("/store/generated-image")
def store_generated_image(req: StoreRequest):
    return store_bytes("generated-image", req.name, decode_request(req), req.metadata, req.mirror_to_seafile_shared)


@app.post("/store/3d-package")
def store_3d_package(req: StoreRequest):
    return store_bytes("3d-package", req.name, decode_request(req), req.metadata, req.mirror_to_seafile_shared)


@app.post("/store/upload/{kind}")
async def upload(kind: str, file: UploadFile = File(...)):
    data = await file.read()
    return store_bytes(safe_name(kind), file.filename or "upload.bin", data, {"upload_content_type": file.content_type}, True)


@app.post("/backup/run")
def backup_run(req: BackupRequest):
    backup_root = STORAGE_DIR / "backups"
    backup_root.mkdir(parents=True, exist_ok=True)

    label = safe_name(req.label or "manual")
    zip_path = backup_root / f"leeway-storage-gateway-backup-{label}-{int(time.time())}.zip"

    included = []
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        if req.include_gateway_store:
            for p in STORAGE_DIR.rglob("*"):
                if p.is_file() and "backups" not in p.parts:
                    arc = "gateway-store/" + str(p.relative_to(STORAGE_DIR)).replace("\\", "/")
                    z.write(p, arc)
                    included.append(arc)

        if req.include_receipts:
            for p in RECEIPT_DIR.rglob("*"):
                if p.is_file():
                    arc = "receipts/" + str(p.relative_to(RECEIPT_DIR)).replace("\\", "/")
                    z.write(p, arc)
                    included.append(arc)

        if req.include_runtime_contracts:
            runtime_mount = Path("/runtime")
            if runtime_mount.exists():
                for p in runtime_mount.glob("*.json"):
                    if p.is_file():
                        arc = "runtime/" + p.name
                        z.write(p, arc)
                        included.append(arc)

    receipt = write_receipt("backup_run", {
        "verdict": "LEEWAY_SEAFILE_GATEWAY_BACKUP_CREATED",
        "backup_path": str(zip_path),
        "included_count": len(included),
        "included_sample": included[:80],
        "label": label,
    })

    return {
        "ok": True,
        "lane": APP,
        "backup_path": str(zip_path),
        "included_count": len(included),
        "receipt": receipt,
    }


@app.get("/backup/status")
def backup_status():
    backup_root = STORAGE_DIR / "backups"
    backups = []
    if backup_root.exists():
        for p in sorted(backup_root.glob("*.zip"), key=lambda x: x.stat().st_mtime, reverse=True)[:20]:
            backups.append({
                "name": p.name,
                "path": str(p),
                "bytes": p.stat().st_size,
                "modified_at": datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat(),
            })
    return {
        "ok": True,
        "lane": APP,
        "backup_count": len(backups),
        "backups": backups,
    }


@app.get("/receipts/latest")
def latest_receipt():
    path = RECEIPT_DIR / "latest.receipt.json"
    if not path.exists():
        return {
            "ok": False,
            "lane": APP,
            "message": "No receipt exists yet.",
        }
    return json.loads(path.read_text(encoding="utf-8"))


# LEEWAY_LASER_FASTAPI_ROUTES_BEGIN
try:
    from datetime import datetime
    from typing import Any, Dict
    from fastapi.responses import HTMLResponse

    _leeway_laser_service = "leeway_seafile_storage_gateway"

    @app.get("/")
    def leeway_laser_root():
        return {
            "ok": True,
            "service": _leeway_laser_service,
            "version": "2.1.4",
            "health": "/health",
            "status": "/status",
            "routes": "/routes",
            "openapi": "/openapi.json",
            "docs": "/docs"
        }

    @app.get("/status")
    def leeway_laser_status():
        return {
            "ok": True,
            "status": "running",
            "service": _leeway_laser_service,
            "time": datetime.utcnow().isoformat()
        }

    @app.get("/routes")
    def leeway_laser_routes():
        return {
            "ok": True,
            "service": _leeway_laser_service,
            "routes": ["/", "/health", "/status", "/routes", "/openapi.json", "/docs", "/system-health/report"]
        }

    @app.post("/system-health/report")
    def leeway_laser_system_health_report(payload: Dict[str, Any]):
        return {
            "ok": True,
            "accepted": True,
            "service": _leeway_laser_service,
            "receivedAt": datetime.utcnow().isoformat(),
            "message": "System health report received."
        }
except Exception:
    pass
# LEEWAY_LASER_FASTAPI_ROUTES_END
