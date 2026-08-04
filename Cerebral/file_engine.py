import os
import shutil
from pathlib import Path
import psutil

def analyze_file(path):
    p = Path(path)
    if not p.exists():
        return {"error": "File not found"}

    try:
        size_mb = round(p.stat().st_size / (1024 * 1024), 2)
    except Exception:
        size_mb = None

    return {
        "name": p.name,
        "size_mb": size_mb,
        "type": p.suffix,
        "location": str(p.parent)
    }

def list_large_files(directory, min_mb=500):
    large_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            full = os.path.join(root, file)
            try:
                size_mb = os.path.getsize(full) / (1024 * 1024)
            except Exception:
                continue
            if size_mb > min_mb:
                large_files.append({
                    "path": full,
                    "size_mb": round(size_mb, 2)
                })
    return large_files

def move_file(source, destination):
    shutil.move(source, destination)
    return {"status": "moved", "from": source, "to": destination}

def suggest_drive_redistribution(root_path):
    drives = psutil.disk_partitions()
    drive_info = []

    for d in drives:
        try:
            usage = psutil.disk_usage(d.mountpoint)
            drive_info.append({
                "mount": d.mountpoint,
                "free_gb": round(usage.free / (1024**3), 2),
                "total_gb": round(usage.total / (1024**3), 2)
            })
        except Exception:
            continue

    large_files = list_large_files(root_path, min_mb=1000)

    return {
        "drives": drive_info,
        "large_files": large_files
    }
