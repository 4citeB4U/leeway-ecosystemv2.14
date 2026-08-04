"""
CodeScoutAgent — Code Intelligence & Repository Analysis
=========================================================
Reads, searches, analyzes, and maps the codebase.
Uses the existing file_indexer under the hood.

Tools
------
  scan_repo         — Build repo map (language breakdown, file tree)
  find_symbol       — Grep for a function/class/variable across codebase
  read_file         — Read a source file with optional line-range
  diff_files        — Show unified diff between two files
  analyze_errors    — Parse recent daemon.err or a log file for tracebacks
  count_loc         — Lines-of-code summary per language
  find_todos        — Find TODO / FIXME / HACK / NOTE comments
  check_imports     — List all imports in a file (detect missing packages)
  summarize_file    — AI-assisted summary of a single file via Foundry
  find_dead_code    — Find functions defined but never called (simple heuristic)
"""

import ast
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

ROOT     = r"C:\Cerebral"
IGNORE   = {".venv", "__pycache__", ".git", "node_modules", ".playwright-mcp",
            "dist", "build", "get-pip.py", "get-pip-2.py"}

TOOLS = [
    "scan_repo", "find_symbol", "read_file", "diff_files",
    "analyze_errors", "count_loc", "find_todos", "check_imports",
    "summarize_file", "find_dead_code",
]

LANG_MAP = {
    ".py": "Python", ".ts": "TypeScript", ".tsx": "TSX",
    ".js": "JavaScript", ".jsx": "JSX", ".json": "JSON",
    ".md": "Markdown", ".ps1": "PowerShell", ".sh": "Shell",
    ".bat": "Batch", ".html": "HTML", ".css": "CSS",
    ".yaml": ".yaml", ".yml": "YAML", ".sql": "SQL",
}


class CodeScoutAgent:
    """Code intelligence agent — maps, searches, analyzes the Cerebral codebase."""

    name        = "code_scout"
    description = "Codebase exploration: repo mapping, symbol search, diff, LOC, dead-code, and error analysis."
    tools       = TOOLS

    def run(self, tool: str, args: dict = None) -> dict:
        args = args or {}
        if tool not in TOOLS:
            return {"ok": False, "error": f"Unknown tool '{tool}'. Available: {TOOLS}"}
        method = getattr(self, f"_tool_{tool}", None)
        if method is None:
            return {"ok": False, "error": f"Tool '{tool}' not implemented."}
        try:
            return method(args)
        except Exception as e:
            return {"ok": False, "error": str(e), "tool": tool}

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _walk(self, root=ROOT, exts=None):
        """Yield (path, ext) for all files in root, skipping IGNORE dirs."""
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in IGNORE]
            for fname in filenames:
                ext = os.path.splitext(fname)[1].lower()
                if exts is None or ext in exts:
                    yield os.path.join(dirpath, fname), ext

    # ── Tools ─────────────────────────────────────────────────────────────────

    def _tool_scan_repo(self, args: dict) -> dict:
        root  = args.get("root", ROOT)
        stats: dict[str, int] = {}
        files = []
        total = 0
        for path, ext in self._walk(root):
            lang = LANG_MAP.get(ext, ext or "other")
            stats[lang] = stats.get(lang, 0) + 1
            size = os.path.getsize(path)
            total += size
            files.append({"path": path.replace(ROOT + os.sep, ""), "lang": lang, "size": size})
        return {
            "ok": True, "root": root,
            "file_count": len(files),
            "total_size_kb": round(total / 1024),
            "languages": dict(sorted(stats.items(), key=lambda x: -x[1])),
            "files": sorted(files, key=lambda x: -x["size"])[:50],
        }

    def _tool_find_symbol(self, args: dict) -> dict:
        symbol  = args.get("symbol", "")
        exts    = set(args.get("exts", [".py", ".ts", ".tsx", ".js"]))
        case    = args.get("case_sensitive", False)
        root    = args.get("root", ROOT)
        if not symbol:
            return {"ok": False, "error": "symbol required"}
        pattern = re.compile(re.escape(symbol), 0 if case else re.IGNORECASE)
        matches = []
        for path, ext in self._walk(root, exts):
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    for lineno, line in enumerate(f, 1):
                        if pattern.search(line):
                            matches.append({
                                "file": path.replace(ROOT + os.sep, ""),
                                "line": lineno,
                                "text": line.rstrip()[:120],
                            })
            except Exception:
                pass
        return {"ok": True, "symbol": symbol, "hits": len(matches), "matches": matches[:100]}

    def _tool_read_file(self, args: dict) -> dict:
        path       = args.get("path", "")
        start_line = int(args.get("start_line", 1))
        end_line   = int(args.get("end_line", 0))   # 0 = all
        max_chars  = int(args.get("max_chars", 8000))
        if not os.path.isabs(path):
            path = os.path.join(ROOT, path)
        if not os.path.exists(path):
            return {"ok": False, "error": f"File not found: {path}"}
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        total = len(lines)
        chosen = lines[start_line - 1: end_line if end_line else None]
        text   = "".join(chosen)
        return {
            "ok":       True,
            "path":     path,
            "total_lines": total,
            "start":    start_line,
            "end":      end_line or total,
            "content":  text[:max_chars],
            "truncated": len(text) > max_chars,
        }

    def _tool_diff_files(self, args: dict) -> dict:
        path_a   = args.get("path_a", "")
        path_b   = args.get("path_b", "")
        context  = int(args.get("context", 4))
        for p in [path_a, path_b]:
            if not os.path.isabs(p):
                p = os.path.join(ROOT, p)
        try:
            result = subprocess.run(
                ["git", "diff", "--no-index", f"-U{context}", path_a, path_b],
                capture_output=True, text=True
            )
            diff = result.stdout or "(no diff)" 
            return {"ok": True, "path_a": path_a, "path_b": path_b, "diff": diff[:8000]}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _tool_analyze_errors(self, args: dict) -> dict:
        log_path = args.get("log_path", os.path.join(ROOT, "daemon.err"))
        n        = int(args.get("n", 30))
        if not os.path.exists(log_path):
            return {"ok": False, "error": f"Log not found: {log_path}"}
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        tail         = lines[-n:]
        tracebacks   = [l.strip() for l in tail if "Traceback" in l or "Error" in l or "Exception" in l]
        warnings     = [l.strip() for l in tail if "Warning" in l or "WARN" in l]
        return {
            "ok": True, "log": log_path,
            "total_lines": len(lines),
            "last_lines": [l.rstrip() for l in tail],
            "tracebacks": tracebacks,
            "warnings":   warnings,
            "clean":      len(tracebacks) == 0,
        }

    def _tool_count_loc(self, args: dict) -> dict:
        root   = args.get("root", ROOT)
        exts   = set(args.get("exts", [".py", ".ts", ".tsx", ".js", ".ps1"]))
        counts: dict[str, dict] = {}
        for path, ext in self._walk(root, exts):
            lang = LANG_MAP.get(ext, ext)
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    lines = f.readlines()
                code    = sum(1 for l in lines if l.strip() and not l.strip().startswith("#"))
                blank   = sum(1 for l in lines if not l.strip())
                comment = sum(1 for l in lines if l.strip().startswith("#"))
                if lang not in counts:
                    counts[lang] = {"files": 0, "total": 0, "code": 0, "blank": 0, "comment": 0}
                counts[lang]["files"]   += 1
                counts[lang]["total"]   += len(lines)
                counts[lang]["code"]    += code
                counts[lang]["blank"]   += blank
                counts[lang]["comment"] += comment
            except Exception:
                pass
        grand = sum(v["total"] for v in counts.values())
        return {"ok": True, "grand_total_lines": grand, "by_language": counts}

    def _tool_find_todos(self, args: dict) -> dict:
        tags   = set(t.upper() for t in args.get("tags", ["TODO", "FIXME", "HACK", "NOTE", "XXX"]))
        root   = args.get("root", ROOT)
        exts   = set(args.get("exts", [".py", ".ts", ".tsx", ".js", ".ps1"]))
        found  = []
        for path, ext in self._walk(root, exts):
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    for lineno, line in enumerate(f, 1):
                        for tag in tags:
                            if tag in line.upper():
                                found.append({
                                    "file": path.replace(ROOT + os.sep, ""),
                                    "line": lineno,
                                    "tag":  tag,
                                    "text": line.strip()[:120],
                                })
                                break
            except Exception:
                pass
        return {"ok": True, "count": len(found), "items": found}

    def _tool_check_imports(self, args: dict) -> dict:
        path = args.get("path", "")
        if not os.path.isabs(path):
            path = os.path.join(ROOT, path)
        if not os.path.exists(path):
            return {"ok": False, "error": f"File not found: {path}"}
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            src = f.read()
        try:
            tree    = ast.parse(src)
        except SyntaxError as e:
            return {"ok": False, "error": f"SyntaxError: {e}"}
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module.split(".")[0])
        missing = []
        for mod in set(imports):
            try:
                __import__(mod)
            except ImportError:
                missing.append(mod)
        return {"ok": True, "path": path, "imports": sorted(set(imports)), "missing": missing}

    def _tool_summarize_file(self, args: dict) -> dict:
        """Use Foundry LLM to summarize a file."""
        path      = args.get("path", "")
        max_chars = int(args.get("max_chars", 3000))
        if not os.path.isabs(path):
            path = os.path.join(ROOT, path)
        if not os.path.exists(path):
            return {"ok": False, "error": f"Not found: {path}"}
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()[:max_chars]
        import requests as _req
        try:
            r = _req.post(
                "http://127.0.0.1:56995/v1/chat/completions",
                json={"model": "Phi-3.5-mini-instruct-generic-cpu:1",
                      "messages": [
                          {"role": "system", "content": "You are a code analyst. Summarize the file in 3-5 sentences."},
                          {"role": "user", "content": f"File: {path}\n\n{content}"}
                      ], "max_tokens": 200},
                timeout=60,
            )
            summary = r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            summary = f"[LLM unavailable: {e}]"
        return {"ok": True, "path": path, "summary": summary, "chars_read": len(content)}

    def _tool_find_dead_code(self, args: dict) -> dict:
        """Heuristic: find def'd functions that are never called."""
        root = args.get("root", ROOT)
        exts = {".py"}
        defined, called = {}, []
        for path, ext in self._walk(root, exts):
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    src = f.read()
                for m in re.finditer(r"^def (\w+)\(", src, re.M):
                    fn = m.group(1)
                    if not fn.startswith("_"):  # skip private
                        defined[fn] = defined.get(fn, []) + [path.replace(ROOT + os.sep, "")]
                # Collect all identifiers
                called.extend(re.findall(r"\b(\w+)\s*\(", src))
            except Exception:
                pass
        called_set  = set(called)
        uncalled    = {fn: files for fn, files in defined.items() if fn not in called_set}
        return {
            "ok":      True,
            "defined": len(defined),
            "possibly_uncalled": len(uncalled),
            "candidates": [{"fn": fn, "defined_in": files} for fn, files in list(uncalled.items())[:30]],
        }
