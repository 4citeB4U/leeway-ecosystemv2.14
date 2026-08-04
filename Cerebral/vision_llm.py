"""
vision_llm.py — Cerebral VL Screen Locator
===========================================
Wraps Qwen2.5-VL-3B-Instruct (local GGUF) via llama-cpp-python.

PRIMARY API
  find_on_screen(screenshot_path, description) → {ok, x, y, confidence, text}
  is_ready()                                   → bool
  load()                                       → {ok, message}
  unload()                                     → None
  health()                                     → {loaded, model_path, projector_path, n_ctx}

DESIGN
  • Lazy-load singleton — model NOT loaded on import.
    First call to find_on_screen() or load() triggers the 2-3s load.
  • Thread-safe lock — parallel requests queue cleanly.
  • Screenshot injected as base64 URI per Qwen2.5-VL spec.
  • Returns normalised pixel coords (x, y) of target element centre.
  • Falls back gracefully to {ok: False} when model files absent.
"""

import os
import re
import json
import base64
import threading
import logging
from typing import Optional

log = logging.getLogger("vision_llm")

# ── Model file paths ──────────────────────────────────────────────────────────
_MODEL_DIR   = r"C:\models"
_BRAIN_FILE  = "Qwen2.5-VL-3B-Instruct-q4_k_m.gguf"
_MMPROJ_FILE = "Qwen2.5-VL-3B-Instruct-mmproj-f16.gguf"
BRAIN_PATH   = os.path.join(_MODEL_DIR, _BRAIN_FILE)
MMPROJ_PATH  = os.path.join(_MODEL_DIR, _MMPROJ_FILE)

# ── Runtime state (singleton) ────────────────────────────────────────────────
_lock     : threading.Lock          = threading.Lock()
_model                              = None     # llama_cpp.Llama instance  (None = not loaded)
_llama_ok : bool                    = False    # llama_cpp importable?

try:
    from llama_cpp import Llama
    from llama_cpp.llama_chat_format import Qwen25VLChatHandler
    _llama_ok = True
except ImportError:
    log.warning("llama_cpp not importable — VL vision disabled")


# ─────────────────────────────────────────────────────────────────────────────
#  Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _files_present() -> bool:
    return os.path.exists(BRAIN_PATH) and os.path.exists(MMPROJ_PATH)


def _encode_image(path: str) -> str:
    """Return base64-encoded PNG as data-URI string."""
    with open(path, "rb") as fh:
        raw = fh.read()
    b64 = base64.b64encode(raw).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def _parse_coords(text: str, screen_w: int, screen_h: int) -> Optional[dict]:
    """
    Parse model output for pixel coordinates.
    Model is prompted to return JSON: {"x": NNN, "y": NNN}
    Accepts integers or floats (normalised 0-1 → multiply by screen dims).
    """
    # Try strict JSON block first
    json_match = re.search(r'\{[^{}]*"x"\s*:\s*[\d.]+[^{}]*"y"\s*:\s*[\d.]+[^{}]*\}', text)
    if json_match:
        try:
            obj = json.loads(json_match.group())
            x = float(obj.get("x", -1))
            y = float(obj.get("y", -1))
            # normalised 0-1 range?
            if 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0:
                x = int(x * screen_w)
                y = int(y * screen_h)
            else:
                x, y = int(x), int(y)
            if x > 0 and y > 0:
                return {"x": x, "y": y}
        except Exception:
            pass

    # Fallback: bare integers  e.g. "x=640 y=380"
    xm = re.search(r'x\s*[=:]\s*(\d+)', text)
    ym = re.search(r'y\s*[=:]\s*(\d+)', text)
    if xm and ym:
        return {"x": int(xm.group(1)), "y": int(ym.group(1))}

    return None


# ─────────────────────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────────────────────

def is_ready() -> bool:
    """True if the VL model is loaded and ready to infer."""
    return _model is not None


def health() -> dict:
    return {
        "loaded"        : _model is not None,
        "llama_ok"      : _llama_ok,
        "files_present" : _files_present(),
        "model_path"    : BRAIN_PATH,
        "projector_path": MMPROJ_PATH,
        "n_ctx"         : 4096,
    }


def load() -> dict:
    """
    Explicitly load the VL model into memory.
    Safe to call multiple times — skips if already loaded.
    Returns {ok, message}.
    """
    global _model
    if not _llama_ok:
        return {"ok": False, "message": "llama_cpp not installed"}
    if not _files_present():
        missing = []
        if not os.path.exists(BRAIN_PATH):
            missing.append(BRAIN_PATH)
        if not os.path.exists(MMPROJ_PATH):
            missing.append(MMPROJ_PATH)
        return {"ok": False, "message": f"Model files missing: {missing}"}
    if _model is not None:
        return {"ok": True, "message": "Already loaded"}

    with _lock:
        if _model is not None:          # double-checked locking
            return {"ok": True, "message": "Already loaded"}
        try:
            log.info("Loading Qwen2.5-VL-3B GGUF …")
            handler = Qwen25VLChatHandler(clip_model_path=MMPROJ_PATH, verbose=False)
            _model  = Llama(
                model_path       = BRAIN_PATH,
                chat_handler     = handler,
                n_ctx            = 4096,
                n_gpu_layers     = 0,      # CPU-only; set >0 if CUDA available
                verbose          = False,
            )
            log.info("Qwen2.5-VL-3B loaded OK")
            return {"ok": True, "message": "Model loaded"}
        except Exception as e:
            log.error("VL model load failed: %s", e)
            return {"ok": False, "message": str(e)}


def unload() -> None:
    """Release the model from memory."""
    global _model
    with _lock:
        _model = None
    log.info("VL model unloaded")


def find_on_screen(screenshot_path: str, description: str,
                   screen_w: int = 1920, screen_h: int = 1080,
                   auto_load: bool = True) -> dict:
    """
    Use the VL model to locate a UI element described by `description`
    on the screenshot at `screenshot_path`.

    Returns:
        {"ok": True,  "x": int, "y": int, "raw": str}
        {"ok": False, "error": str}

    Parameters:
        screenshot_path  Absolute path to PNG screenshot.
        description      Human description: "the Submit button", "search box", etc.
        screen_w/h       Used when model returns normalised 0-1 coords.
        auto_load        If True, load model on first call (may take 2-3 s).
    """
    global _model

    if not _llama_ok:
        return {"ok": False, "error": "llama_cpp not installed"}

    if not os.path.exists(screenshot_path):
        return {"ok": False, "error": f"Screenshot not found: {screenshot_path}"}

    # Lazy-load
    if _model is None:
        if not auto_load:
            return {"ok": False, "error": "VL model not loaded"}
        r = load()
        if not r["ok"]:
            return {"ok": False, "error": r["message"]}

    data_uri = _encode_image(screenshot_path)

    prompt = (
        f"You are a precise UI element locator. "
        f"Look at the screenshot and find: {description}.\n"
        f"Respond ONLY with valid JSON on one line: "
        f'{{\"x\": <pixel_x>, \"y\": <pixel_y>}}\n'
        f"Use absolute pixel coordinates. If not found, respond: "
        f'{{\"x\": -1, \"y\": -1}}'
    )

    with _lock:
        try:
            response = _model.create_chat_completion(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_uri}},
                            {"type": "text",      "text": prompt},
                        ],
                    }
                ],
                max_tokens = 64,
                temperature= 0.0,
                stop       = ["\n\n"],
            )
            raw = response["choices"][0]["message"]["content"].strip()
            log.debug("VL raw response: %s", raw)
        except Exception as e:
            return {"ok": False, "error": f"Inference failed: {e}"}

    coords = _parse_coords(raw, screen_w, screen_h)
    if coords is None or coords["x"] < 0 or coords["y"] < 0:
        return {"ok": False, "error": "Element not found on screen", "raw": raw}

    return {"ok": True, "x": coords["x"], "y": coords["y"], "raw": raw}


def describe_screen(screenshot_path: str, question: str = "What is shown on this screen?",
                    max_tokens: int = 256, auto_load: bool = True) -> dict:
    """
    General-purpose vision QA — ask any question about a screenshot.
    Returns {ok, answer} or {ok: False, error}.
    """
    global _model

    if not _llama_ok:
        return {"ok": False, "error": "llama_cpp not installed"}
    if not os.path.exists(screenshot_path):
        return {"ok": False, "error": f"Screenshot not found: {screenshot_path}"}

    if _model is None:
        if not auto_load:
            return {"ok": False, "error": "VL model not loaded"}
        r = load()
        if not r["ok"]:
            return {"ok": False, "error": r["message"]}

    data_uri = _encode_image(screenshot_path)

    with _lock:
        try:
            response = _model.create_chat_completion(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_uri}},
                            {"type": "text",      "text": question},
                        ],
                    }
                ],
                max_tokens = max_tokens,
                temperature= 0.2,
            )
            answer = response["choices"][0]["message"]["content"].strip()
            return {"ok": True, "answer": answer}
        except Exception as e:
            return {"ok": False, "error": f"Inference failed: {e}"}
