#!/usr/bin/env python3
"""
Simple find-and-replace utility to update hard-coded ports in built assets.
Run from repository root: python tools\port_fixup.py
It will replace 127.0.0.1:8787 -> 127.0.0.1:8765 and 127.0.0.1:8007 -> 127.0.0.1:9007
and localhost:8787 -> localhost:8765. It edits files in-place and prints a summary.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ("127.0.0.1:8787", "127.0.0.1:8765"),
    ("localhost:8787", "localhost:8765"),
    ("127.0.0.1:8007", "127.0.0.1:9007"),
]

EXTS = {".js", ".html", ".json", ".css", ".map"}

def process_file(p: Path):
    try:
        text = p.read_text(encoding="utf-8")
    except Exception:
        return 0
    orig = text
    for a, b in TARGETS:
        text = text.replace(a, b)
    if text != orig:
        p.write_text(text, encoding="utf-8")
        return 1
    return 0

def main():
    changed = 0
    files = 0
    for p in ROOT.rglob("*"):
        if p.is_file() and p.suffix in EXTS:
            files += 1
            changed += process_file(p)

    print(f"Scanned {files} files; updated {changed} files.")

if __name__ == '__main__':
    main()
