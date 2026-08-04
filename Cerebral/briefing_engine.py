import psutil
import os
from datetime import datetime
from file_engine import list_large_files
import requests

FOUNDRY_URL = "http://127.0.0.1:4000/v1/chat/completions"

def collect_system_snapshot():
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent

    disks = []
    for d in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(d.mountpoint)
            disks.append({
                "drive": d.mountpoint,
                "used_percent": usage.percent,
                "free_gb": round(usage.free / (1024**3), 2)
            })
        except Exception:
            continue

    large_files = list_large_files("C:\\", min_mb=1000)

    return {
        "timestamp": str(datetime.now()),
        "cpu_percent": cpu,
        "ram_percent": ram,
        "disks": disks,
        "large_files_detected": large_files[:10]
    }

def generate_briefing(snapshot):
    prompt = f"""
You are CEREBRAL.
Create a structured executive system briefing.

Snapshot Data:
{snapshot}

Provide:
1. Stability assessment
2. Risk warnings
3. Optimization suggestions
4. Storage recommendations
5. Overall system health rating (A–F)

Be concise and structured.
"""

    response = requests.post(
        FOUNDRY_URL,
        json={
            "model": "qwen3-coder",
            "messages": [
                {"role": "system", "content": "You are CEREBRAL."},
                {"role": "user", "content": prompt}
            ]
        },
        timeout=20
    )

    try:
        return response.json().get("choices", [])[0].get("message", {}).get("content")
    except Exception:
        return "Briefing generation failed"
