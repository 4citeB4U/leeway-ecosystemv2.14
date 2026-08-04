"""
file_indexer.py — Cerebral Fast File Indexer
=============================================
Builds and maintains a cached index of one or more workspace roots.
Provides:
  - Fast filename search
  - Repo map generation (repo_map.json + repo_map.md)
  - File summarisation (single file, LLM-assisted)
  - File comparison / diff

Index entry schema:
    {
        "path":     str,
        "name":     str,
        "ext":      str,
        "size":     int,   # bytes
        "mtime":    float, # epoch
        "lang":     str,   # detected language / type
        "is_dir":   bool,
    }

Index is written to  <root>/.cerebral_index.json  so it persists across
restarts and is only rebuilt selectively when files change.
"""

import os
import json
import time
import difflib
import mimetypes
import threading
from datetime import datetime
from typing import List, Optional

# ── Skip lists ────────────────────────────────────────────────────────────────
SKIP_DIRS = {
    "__pycache__", "node_modules", ".git", ".venv", "venv",
    "$Recycle.Bin", "System Volume Information", ".idea",
    "dist", ".cache", "build", "coverage",
}
SKIP_EXTS = {".pyc", ".pyo", ".exe", ".dll", ".so", ".pdb"}
MAX_FILE_SIZE = 10 * 1024 * 1024   # skip files > 10 MB for indexing

# ── Language detection (rough) ────────────────────────────────────────────────
_EXT_LANG = {
    ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
    ".tsx": "TypeScript/React", ".jsx": "JavaScript/React",
    ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
    ".md": "Markdown", ".html": "HTML", ".css": "CSS",
    ".sh": "Shell", ".ps1": "PowerShell", ".bat": "Batch",
    ".sql": "SQL", ".rs": "Rust", ".go": "Go", ".c": "C",
    ".cpp": "C++", ".h": "C/C++ Header", ".java": "Java",
    ".txt": "Text", ".csv": "CSV", ".xml": "XML",
    ".toml": "TOML", ".ini": "INI", ".cfg": "Config",
    ".pdf": "PDF", ".docx": "Word", ".xlsx": "Excel",
    ".png": "Image", ".jpg": "Image", ".gif": "Image",
    ".mp3": "Audio", ".wav": "Audio", ".mp4": "Video",
}


def _detect_lang(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return _EXT_LANG.get(ext, "Unknown")


# ── Index builder ─────────────────────────────────────────────────────────────

def build_index(root: str, progress_cb=None) -> list:
    """
    Walk `root` and build a flat list of index entries.
    `progress_cb(n)` called every 200 files with the running count.
    """
    entries = []
    count = 0
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [
            d for d in dirs
            if d not in SKIP_DIRS and not d.startswith(".")
        ]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext in SKIP_EXTS:
                continue
            fpath = os.path.join(dirpath, fname)
            try:
                stat = os.stat(fpath)
                if stat.st_size > MAX_FILE_SIZE:
                    continue
                entries.append({
                    "path":  fpath,
                    "name":  fname,
                    "ext":   ext,
                    "size":  stat.st_size,
                    "mtime": stat.st_mtime,
                    "lang":  _detect_lang(fpath),
                    "is_dir": False,
                })
                count += 1
                if progress_cb and count % 200 == 0:
                    progress_cb(count)
            except (PermissionError, OSError):
                continue
    return entries


def save_index(root: str, entries: list) -> str:
    """Save index entries as JSON next to the root folder."""
    idx_path = os.path.join(root, ".cerebral_index.json")
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump({"built_at": time.time(), "entries": entries}, f, indent=2)
    return idx_path


def load_index(root: str) -> list:
    """Load a previously saved index, or return [] if none exists."""
    idx_path = os.path.join(root, ".cerebral_index.json")
    try:
        with open(idx_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("entries", [])
    except Exception:
        return []


# ── Repo map ──────────────────────────────────────────────────────────────────

def build_repo_map(roots: list[str], out_dir: str | None = None) -> dict:
    """
    Build a unified repo map across multiple roots.
    Returns dict with:
      - json_path  : path written for repo_map.json
      - md_path    : path written for repo_map.md
      - stats      : summary counts
      - entries    : all index entries
    """
    if out_dir is None:
        out_dir = roots[0] if roots else os.getcwd()

    all_entries: list = []
    for root in roots:
        if not os.path.isdir(root):
            continue
        entries = build_index(root)
        all_entries.extend(entries)
        save_index(root, entries)

    # stats
    by_lang: dict = {}
    for e in all_entries:
        lang = e.get("lang", "Unknown")
        by_lang[lang] = by_lang.get(lang, 0) + 1
    total_size = sum(e["size"] for e in all_entries)

    repo_data = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "roots": roots,
        "total_files": len(all_entries),
        "total_size_bytes": total_size,
        "languages": dict(sorted(by_lang.items(), key=lambda x: -x[1])),
        "files": [
            {
                "path":  e["path"],
                "lang":  e["lang"],
                "size":  e["size"],
                "mtime": datetime.fromtimestamp(e["mtime"]).strftime("%Y-%m-%d %H:%M"),
            }
            for e in all_entries
        ],
    }

    # Write JSON
    json_path = os.path.join(out_dir, "repo_map.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(repo_data, f, indent=2)

    # Write Markdown
    md_lines = [
        "# Cerebral Repo Map",
        f"Generated: {repo_data['generated_at']}",
        f"Roots: {', '.join(roots)}",
        f"Total files: {len(all_entries)} | Total size: {round(total_size / 1e6, 2)} MB",
        "",
        "## Language Breakdown",
        "| Language | Files |",
        "|----------|-------|",
    ]
    for lang, cnt in repo_data["languages"].items():
        md_lines.append(f"| {lang} | {cnt} |")

    md_lines += [
        "",
        "## File Listing",
        "| Path | Language | Size | Modified |",
        "|------|----------|------|----------|",
    ]
    for fe in repo_data["files"][:500]:  # cap at 500 rows in the markdown
        short_path = fe["path"].replace("\\", "/")
        md_lines.append(
            f"| {short_path} | {fe['lang']} | {round(fe['size']/1024,1)} KB | {fe['mtime']} |"
        )
    if len(all_entries) > 500:
        md_lines.append(f"| … {len(all_entries)-500} more files … | | | |")

    md_path = os.path.join(out_dir, "repo_map.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    return {
        "json_path": json_path,
        "md_path": md_path,
        "stats": repo_data["languages"],
        "total_files": len(all_entries),
        "entries": all_entries,
    }


# ── File search ───────────────────────────────────────────────────────────────

def search_index(roots: list[str], query: str, limit: int = 50) -> list:
    """
    Search the cached index(es) for files whose name or path matches `query`.
    Falls back to live os.walk if no index exists.
    """
    query_lc = query.lower()
    results = []
    for root in roots:
        entries = load_index(root)
        if not entries:
            # Live fallback — only shallow
            entries = build_index(root)
        for e in entries:
            if query_lc in e["name"].lower() or query_lc in e["path"].lower():
                results.append(e)
            if len(results) >= limit:
                break
        if len(results) >= limit:
            break
    return results


# ── File summariser ───────────────────────────────────────────────────────────

def summarise_file(path: str, max_chars: int = 8000) -> dict:
    """
    Read a file and return a structured summary suitable for the LLM context.
    Returns dict with: path, lang, size, lines, preview
    """
    result = {"path": path, "lang": _detect_lang(path), "error": None}
    try:
        stat = os.stat(path)
        result["size"] = stat.st_size
        result["mtime"] = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
    except Exception as e:
        result["error"] = str(e)
        return result

    # For binary/media files, just return metadata
    binary_exts = {".pdf",".docx",".xlsx",".png",".jpg",".gif",
                   ".mp3",".wav",".mp4",".exe",".dll",".pyc"}
    ext = os.path.splitext(path)[1].lower()
    if ext in binary_exts:
        result["preview"] = f"[Binary file — {round(stat.st_size/1024,1)} KB. Open with default application.]"
        return result

    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read(max_chars)
        lines = text.splitlines()
        result["lines"] = len(lines)
        result["preview"] = text
        result["truncated"] = stat.st_size > max_chars
    except Exception as e:
        result["error"] = str(e)

    return result


# ── File comparison / diff ────────────────────────────────────────────────────

def compare_files(path_a: str, path_b: str, context_lines: int = 4) -> dict:
    """
    Produce a unified diff between two text files.
    Returns dict with: diff (string), added, removed, unchanged.
    """
    result = {
        "path_a": path_a,
        "path_b": path_b,
        "diff":   "",
        "added":   0,
        "removed": 0,
        "unchanged": 0,
        "error": None,
    }
    try:
        with open(path_a, "r", encoding="utf-8", errors="replace") as f:
            lines_a = f.readlines()
        with open(path_b, "r", encoding="utf-8", errors="replace") as f:
            lines_b = f.readlines()
    except Exception as e:
        result["error"] = str(e)
        return result

    diff = list(difflib.unified_diff(
        lines_a, lines_b,
        fromfile=os.path.basename(path_a),
        tofile=os.path.basename(path_b),
        n=context_lines,
    ))
    result["diff"] = "".join(diff)[:20000]  # cap to 20 KB
    for line in diff:
        if line.startswith("+") and not line.startswith("+++"):
            result["added"] += 1
        elif line.startswith("-") and not line.startswith("---"):
            result["removed"] += 1
        elif line.startswith(" "):
            result["unchanged"] += 1

    return result
