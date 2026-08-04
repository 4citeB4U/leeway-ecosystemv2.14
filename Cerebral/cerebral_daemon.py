
"""Compatibility shim for legacy launch scripts.

Canonical runtime entrypoint is ``CerebralDaemon.py``.
This file is intentionally kept to avoid breaking older tasks and shortcuts.
"""

from __future__ import annotations

import runpy
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent
    canonical = root / "CerebralDaemon.py"
    runpy.run_path(str(canonical), run_name="__main__")


if __name__ == "__main__":
    main()
