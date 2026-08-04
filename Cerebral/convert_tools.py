"""
convert_tools.py — Cerebral File Conversion Pipeline
=====================================================
Safe, deterministic file conversions.  All conversions write to a NEW path,
never silently overwrite the source.  Overwrites are HIGH RISK and require
the caller to pass `allow_overwrite=True` (set only after user confirmation).

Supported conversions:
  - markdown  → plain text (built-in)
  - json      ↔ yaml
  - csv       → json
  - any text  → txt copy
  - md/txt    → pdf  (requires: reportlab or weasyprint — graceful fallback)
  - audio     resample  (requires: ffmpeg on PATH)
  - image     resize/compress (requires: pillow)
"""

import os
import json
import shutil
import subprocess
import time
import re
from typing import Optional


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_output_path(src: str, new_ext: str, out_dir: Optional[str] = None) -> str:
    """
    Given `/some/file.md`, return `/some/file.txt` (or in `out_dir`).
    Never equals `src` unless extensions are identical — in which case we append
    `_converted` to the stem.
    """
    base = os.path.splitext(os.path.basename(src))[0]
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, base + new_ext)
    else:
        out = os.path.join(os.path.dirname(src), base + new_ext)

    # Prevent silent overwrite of source
    if os.path.abspath(out) == os.path.abspath(src):
        stem = os.path.splitext(out)[0]
        out = stem + "_converted" + new_ext
    return out


def _overwrite_guard(out_path: str, allow_overwrite: bool) -> Optional[dict]:
    """Return error dict if output exists and overwrite not confirmed."""
    if os.path.exists(out_path) and not allow_overwrite:
        return {
            "ok": False,
            "error": "Output file already exists. Confirm overwrite or choose a different path.",
            "output_path": out_path,
            "requires_confirmation": True,
        }
    return None


# ── JSON ↔ YAML ───────────────────────────────────────────────────────────────

def json_to_yaml(src: str, out_path: Optional[str] = None, allow_overwrite: bool = False) -> dict:
    """Convert a JSON file to YAML."""
    try:
        import yaml  # type: ignore
    except ImportError:
        return {"ok": False, "error": "PyYAML not installed. Run: pip install pyyaml"}

    if not out_path:
        out_path = _safe_output_path(src, ".yaml")
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    try:
        with open(src, "r", encoding="utf-8") as f:
            data = json.load(f)
        with open(out_path, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        return {"ok": True, "output": out_path}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def yaml_to_json(src: str, out_path: Optional[str] = None, allow_overwrite: bool = False) -> dict:
    """Convert a YAML file to JSON."""
    try:
        import yaml  # type: ignore
    except ImportError:
        return {"ok": False, "error": "PyYAML not installed. Run: pip install pyyaml"}

    if not out_path:
        out_path = _safe_output_path(src, ".json")
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    try:
        with open(src, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return {"ok": True, "output": out_path}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── CSV → JSON ────────────────────────────────────────────────────────────────

def csv_to_json(src: str, out_path: Optional[str] = None, allow_overwrite: bool = False) -> dict:
    """Convert a CSV file to a JSON array."""
    import csv

    if not out_path:
        out_path = _safe_output_path(src, ".json")
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    try:
        rows = []
        with open(src, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(dict(row))
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2, ensure_ascii=False)
        return {"ok": True, "output": out_path, "rows": len(rows)}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Markdown → plain text ─────────────────────────────────────────────────────

def md_to_text(src: str, out_path: Optional[str] = None, allow_overwrite: bool = False) -> dict:
    """Strip markdown syntax and write plain text."""
    if not out_path:
        out_path = _safe_output_path(src, ".txt")
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    try:
        with open(src, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        # Very basic strip: headers, bold, italic, code blocks, links
        text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
        text = re.sub(r"`(.+?)`", r"\1", text)
        text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
        text = re.sub(r"\[(.+?)\]\(.*?\)", r"\1", text)
        text = re.sub(r"#{1,6}\s*", "", text)
        text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)
        text = re.sub(r"(\*|_)(.*?)\1", r"\2", text)
        text = re.sub(r"^\s*[-*+]\s+", "• ", text, flags=re.MULTILINE)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        return {"ok": True, "output": out_path}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Markdown / Text → PDF ─────────────────────────────────────────────────────

def md_to_pdf(src: str, out_path: Optional[str] = None, allow_overwrite: bool = False) -> dict:
    """Convert Markdown or text to PDF. Tries: weasyprint → reportlab → pandoc."""
    if not out_path:
        out_path = _safe_output_path(src, ".pdf")
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    # 1. Try weasyprint (needs weasyprint + Pillow)
    try:
        import markdown as md_lib   # type: ignore
        from weasyprint import HTML  # type: ignore
        with open(src, "r", encoding="utf-8") as f:
            md_text = f.read()
        html_body = md_lib.markdown(md_text)
        html = f"<html><body style='font-family:sans-serif;font-size:13px;padding:40px'>{html_body}</body></html>"
        HTML(string=html).write_pdf(out_path)
        return {"ok": True, "output": out_path, "method": "weasyprint"}
    except ImportError:
        pass
    except Exception as e:
        return {"ok": False, "error": str(e)}

    # 2. Try pandoc (must be installed)
    try:
        result = subprocess.run(
            ["pandoc", src, "-o", out_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return {"ok": True, "output": out_path, "method": "pandoc"}
        return {"ok": False, "error": result.stderr.strip()}
    except FileNotFoundError:
        pass
    except Exception as e:
        return {"ok": False, "error": str(e)}

    return {
        "ok": False,
        "error": "PDF conversion unavailable. Install: pip install weasyprint markdown  OR  install pandoc.",
    }


# ── Audio resampling ──────────────────────────────────────────────────────────

def audio_resample(
    src: str,
    out_path: Optional[str] = None,
    sample_rate: int = 16000,
    allow_overwrite: bool = False,
) -> dict:
    """Resample audio to a target sample rate using ffmpeg."""
    ext = os.path.splitext(src)[1].lower() or ".wav"
    if not out_path:
        stem = os.path.splitext(os.path.basename(src))[0]
        out_path = os.path.join(
            os.path.dirname(src), f"{stem}_{sample_rate}hz{ext}"
        )
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-ar", str(sample_rate), out_path],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode == 0:
            return {"ok": True, "output": out_path, "sample_rate": sample_rate}
        return {"ok": False, "error": result.stderr[-500:]}
    except FileNotFoundError:
        return {"ok": False, "error": "ffmpeg not found. Install ffmpeg and ensure it is on PATH."}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Image resize / compress ───────────────────────────────────────────────────

def image_resize(
    src: str,
    out_path: Optional[str] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
    quality: int = 85,
    allow_overwrite: bool = False,
) -> dict:
    """Resize and/or compress an image using Pillow."""
    try:
        from PIL import Image  # type: ignore
    except ImportError:
        return {"ok": False, "error": "Pillow not installed. Run: pip install pillow"}

    ext = os.path.splitext(src)[1].lower() or ".jpg"
    if not out_path:
        stem = os.path.splitext(os.path.basename(src))[0]
        suffix = f"_{width or 'auto'}x{height or 'auto'}"
        out_path = os.path.join(os.path.dirname(src), stem + suffix + ext)
    guard = _overwrite_guard(out_path, allow_overwrite)
    if guard:
        return guard

    try:
        img = Image.open(src)
        orig_size = img.size
        if width or height:
            new_w = width or int(img.width * (height / img.height))
            new_h = height or int(img.height * (width / img.width))
            img = img.resize((new_w, new_h), Image.LANCZOS)
        save_kwargs = {}
        if ext in {".jpg", ".jpeg"}:
            save_kwargs["quality"] = quality
            save_kwargs["optimize"] = True
        img.save(out_path, **save_kwargs)
        return {
            "ok": True,
            "output": out_path,
            "original_size": orig_size,
            "new_size": img.size,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Dispatch table ────────────────────────────────────────────────────────────

CONVERSION_REGISTRY = {
    "json_to_yaml":    json_to_yaml,
    "yaml_to_json":    yaml_to_json,
    "csv_to_json":     csv_to_json,
    "md_to_text":      md_to_text,
    "md_to_pdf":       md_to_pdf,
    "audio_resample":  audio_resample,
    "image_resize":    image_resize,
}


def convert(
    conversion: str,
    src: str,
    out_path: Optional[str] = None,
    allow_overwrite: bool = False,
    **kwargs,
) -> dict:
    """
    Unified conversion entry point.
    `conversion` is a key from CONVERSION_REGISTRY, e.g. "json_to_yaml".
    """
    fn = CONVERSION_REGISTRY.get(conversion)
    if fn is None:
        return {
            "ok": False,
            "error": f"Unknown conversion '{conversion}'. Available: {list(CONVERSION_REGISTRY)}",
        }
    return fn(src, out_path=out_path, allow_overwrite=allow_overwrite, **kwargs)
