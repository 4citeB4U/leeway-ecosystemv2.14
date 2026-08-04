import os
import requests


def analyze_image(model, image_base64, prompt):
    host = os.environ.get("OLLAMA_HOST", "http://host.docker.internal:11434").rstrip("/")
    response = requests.post(
        f"{host}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "images": [image_base64],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 160}
        },
        timeout=60
    )
    response.raise_for_status()
    data = response.json()
    return {
        "model": model,
        "responseText": (data.get("response") or "").strip(),
        "rawResponse": data
    }
