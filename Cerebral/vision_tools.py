"""
vision_tools.py — Cerebral Live Camera Vision
==============================================
Captures a frame from the webcam and produces a plain-English
description of what's visible using OpenCV colour analysis.
No cloud calls, no external model — runs entirely locally.

Used by CerebralDaemon when a vision-related question is detected
so the LLM receives rich context and can answer naturally.
"""

import os
import time
import numpy as np

try:
    import cv2  # type: ignore
    _CV2_OK = True
except ImportError:
    cv2 = None  # type: ignore
    _CV2_OK = False

# ── Colour name map (BGR order after cv2 read) ────────────────────────────────
_COLOUR_TABLE = [
    # (B, G, R), name
    ((0,   0,   0),   "black"),
    ((255, 255, 255), "white"),
    ((128, 128, 128), "grey"),
    ((0,   0,   139), "dark blue"),
    ((0,   0,   255), "blue"),
    ((173, 216, 230), "light blue"),
    ((0,   128, 0),   "green"),
    ((144, 238, 144), "light green"),
    ((0,   100, 0),   "dark green"),
    ((0,   255, 255), "cyan"),
    ((0,   0,   128), "navy"),
    ((128, 0,   0),   "dark red"),
    ((255, 0,   0),   "red"),
    ((255, 182, 193), "pink"),
    ((255, 165, 0),   "orange"),
    ((255, 255, 0),   "yellow"),
    ((128, 0,   128), "purple"),
    ((75,  0,   130), "indigo"),
    ((139, 69,  19),  "brown"),
    ((210, 180, 140), "tan"),
    ((245, 245, 220), "beige"),
    ((192, 192, 192), "silver"),
    ((255, 215, 0),   "gold"),
    ((64,  64,  64),  "dark grey"),
    ((211, 211, 211), "light grey"),
    ((255, 253, 208), "cream"),
    ((0,   128, 128), "teal"),
    ((128, 128, 0),   "olive"),
    ((255, 127, 80),  "coral"),
    ((220, 20,  60),  "crimson"),
    ((139, 0,   139), "dark magenta"),
    ((72,  61,  139), "dark slate blue"),
    ((46,  139, 87),  "sea green"),
    ((210, 105, 30),  "chocolate"),
    ((188, 143, 143), "rosy brown"),
    ((30,  144, 255), "dodger blue"),
]


def _bgr_to_name(bgr) -> str:
    """Find the nearest colour name to a BGR triplet."""
    b, g, r = float(bgr[0]), float(bgr[1]), float(bgr[2])
    best_name = "unknown"
    best_dist = float("inf")
    for (tb, tg, tr), name in _COLOUR_TABLE:
        dist = (b - tb) ** 2 + (g - tg) ** 2 + (r - tr) ** 2
        if dist < best_dist:
            best_dist = dist
            best_name = name
    return best_name


def _dominant_colour(region: np.ndarray, k: int = 3) -> str:
    """
    Find the dominant colour in a BGR image region using k-means.
    Falls back to mean colour if k-means fails.
    """
    if region is None or region.size == 0:
        return "unknown"
    try:
        pixels = region.reshape(-1, 3).astype(np.float32)
        # Subsample for speed (max 2000 pixels)
        if len(pixels) > 2000:
            idx = np.random.choice(len(pixels), 2000, replace=False)
            pixels = pixels[idx]
        criteria = (
            cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
            10, 1.0
        )
        _, labels, centres = cv2.kmeans(
            pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS
        )
        # Pick the cluster with the most pixels
        counts = np.bincount(labels.flatten())
        dominant = centres[np.argmax(counts)]
        return _bgr_to_name(dominant)
    except Exception:
        mean = region.reshape(-1, 3).mean(axis=0)
        return _bgr_to_name(mean)


def _skin_fraction(region: np.ndarray) -> float:
    """Return fraction of pixels that look like skin tone."""
    if region is None or region.size == 0:
        return 0.0
    try:
        hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
        lower = np.array([0, 20, 70], dtype=np.uint8)
        upper = np.array([20, 150, 255], dtype=np.uint8)
        mask = cv2.inRange(hsv, lower, upper)
        return float(mask.sum()) / (mask.size * 255)
    except Exception:
        return 0.0


def analyse_frame(frame: np.ndarray) -> str:
    """
    Produce a plain-English scene description from a BGR frame.
    Returns a string like:
      "Camera frame: upper body — dark blue top; lower body — light grey pants;
       background — beige wall. Face visible: yes. Lighting: moderate."
    """
    h, w = frame.shape[:2]

    # Divide frame into thirds vertically
    top    = frame[:h//3,    :]   # head / background
    middle = frame[h//3:2*h//3, :]  # torso / upper clothing
    bottom = frame[2*h//3:,  :]   # lower body / legs

    top_col    = _dominant_colour(top)
    middle_col = _dominant_colour(middle)
    bottom_col = _dominant_colour(bottom)

    # Face in top third?
    face_detected = False
    try:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        if os.path.exists(cascade_path):
            classifier = cv2.CascadeClassifier(cascade_path)
            gray = cv2.cvtColor(top, cv2.COLOR_BGR2GRAY)
            faces = classifier.detectMultiScale(gray, 1.1, 4, minSize=(40, 40))
            face_detected = len(faces) > 0
    except Exception:
        pass

    # Lighting level from mean brightness
    gray_full = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(gray_full.mean())
    if brightness < 50:
        lighting = "very dark"
    elif brightness < 100:
        lighting = "dim"
    elif brightness < 160:
        lighting = "moderate"
    elif brightness < 210:
        lighting = "bright"
    else:
        lighting = "very bright"

    parts = [
        f"Camera sees — upper area: {top_col}",
        f"torso/mid: {middle_col}",
        f"lower body: {bottom_col}",
        f"face visible: {'yes' if face_detected else 'not detected'}",
        f"lighting: {lighting}.",
    ]
    return " | ".join(parts)


def capture_and_analyse(camera_index: int = -1, save_path: str = None) -> dict:
    """
    Open webcam, capture one frame, analyse it, optionally save it.
    camera_index = -1 means auto-detect (tries index 1 first for external
    cameras, then index 0 for built-in webcam).
    Returns { ok, description, path (if saved), width, height, brightness }
    """
    if not _CV2_OK:
        return {"ok": False, "error": "OpenCV not installed (pip install opencv-python)"}

    # Auto-detect: prefer higher-resolution external camera
    if camera_index < 0:
        best_index = 0
        best_res   = 0
        for idx in [1, 0, 2]:
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if cap.isOpened():
                w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                res = w * h
                cap.release()
                if res > best_res:
                    best_res   = res
                    best_index = idx
        camera_index = best_index

    try:
        cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        if not cap.isOpened():
            # Try the other index before giving up
            alt = 0 if camera_index != 0 else 1
            cap = cv2.VideoCapture(alt, cv2.CAP_DSHOW)
            if not cap.isOpened():
                return {"ok": False, "error": f"No camera found at index {camera_index} or {alt}"}
            camera_index = alt

        # Read two frames — first frame after open is often dark on Windows
        for _ in range(2):
            ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            return {"ok": False, "error": "Camera opened but no frame captured"}

        h, w = frame.shape[:2]
        brightness = float(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).mean())
        description = analyse_frame(frame)

        saved_path = None
        if save_path:
            os.makedirs(os.path.dirname(save_path) or ".", exist_ok=True)
            cv2.imwrite(save_path, frame)
            saved_path = save_path
        else:
            # Always save so daemon can reference the path
            ts = int(time.time() * 1000)
            saved_path = os.path.join(os.path.dirname(__file__), "tmp",
                                      f"vision_{ts}.jpg")
            os.makedirs(os.path.dirname(saved_path), exist_ok=True)
            cv2.imwrite(saved_path, frame)

        return {
            "ok":          True,
            "description": description,
            "path":        saved_path,
            "width":       w,
            "height":      h,
            "brightness":  round(brightness, 1),
            "camera_index": camera_index,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
