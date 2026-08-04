"""
ArchivistAgent — Memory, Knowledge & Briefing Engine
======================================================
Manages the persistent memory.json, produces briefings,
exports session summaries, and queries the LLM with
stored knowledge as context.

Tools
------
  memory_stats      — Count and summarize memory.json entries
  memory_search     — Keyword search across all memory entries
  memory_write      — Append a fact/event to memory.json
  memory_purge      — Remove entries older than N days
  generate_briefing — Produce a structured daily briefing using LLM
  session_export    — Dump recent memory entries to a timestamped log file
  knowledge_query   — Ask LLM a question with memory context injected
  audit_log_read    — Read logs/bridge_audit.jsonl events
  tag_memory        — Add a tag to existing memory entries matching a pattern
  memory_stats_chart — Return data ready for a DonutChart (entry-type distribution)
"""

import json
import os
import re
from datetime import datetime, timezone, timedelta
from typing import Any

import requests

ROOT        = r"C:\Cerebral"
MEMORY_PATH = os.path.join(ROOT, "memory.json")
EXPORT_DIR  = os.path.join(ROOT, "logs", "exports")
AUDIT_LOG   = os.path.join(ROOT, "logs", "bridge_audit.jsonl")
FOUNDRY_URL = "http://127.0.0.1:56995/v1/chat/completions"
FOUNDRY_MODEL = "Phi-3.5-mini-instruct-generic-cpu:1"

TOOLS = [
    "memory_stats", "memory_search", "memory_write", "memory_purge",
    "generate_briefing", "session_export", "knowledge_query",
    "audit_log_read", "tag_memory", "memory_stats_chart",
]


class ArchivistAgent:
    """Memory, knowledge management, and briefing generation."""

    name        = "archivist"
    description = "Manages Cerebral's persistent memory: search, write, purge, briefings, and knowledge Q&A."
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

    def _load_memory(self) -> list:
        if not os.path.exists(MEMORY_PATH):
            return []
        with open(MEMORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_memory(self, entries: list):
        with open(MEMORY_PATH, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)

    def _llm(self, system: str, user: str, max_tokens=300) -> str:
        try:
            r = requests.post(FOUNDRY_URL, json={
                "model": FOUNDRY_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user},
                ],
                "max_tokens": max_tokens,
            }, timeout=90)
            return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"[LLM unavailable: {e}]"

    # ── Tools ─────────────────────────────────────────────────────────────────

    def _tool_memory_stats(self, args: dict) -> dict:
        entries   = self._load_memory()
        user_msgs = [e for e in entries if "user" in e]
        asst_msgs = [e for e in entries if "assistant" in e]
        facts     = [e for e in entries if "fact" in e or "event" in e]
        tagged    = [e for e in entries if "tags" in e]
        return {
            "ok":           True,
            "total":        len(entries),
            "user_turns":   len(user_msgs),
            "assistant_turns": len(asst_msgs),
            "facts":        len(facts),
            "tagged":       len(tagged),
            "oldest":       (entries[0].get("ts","") or entries[0]) if entries else None,
            "newest":       (entries[-1].get("ts","") or entries[-1]) if entries else None,
        }

    def _tool_memory_search(self, args: dict) -> dict:
        query   = args.get("query", "").lower()
        n       = int(args.get("n", 20))
        entries = self._load_memory()
        hits    = []
        for i, e in enumerate(entries):
            text = json.dumps(e).lower()
            if query in text:
                hits.append({"index": i, "entry": e})
        return {"ok": True, "query": query, "hits": len(hits), "results": hits[:n]}

    def _tool_memory_write(self, args: dict) -> dict:
        fact    = args.get("fact", "")
        tags    = args.get("tags", [])
        entry   = {
            "ts":   datetime.now(timezone.utc).isoformat(),
            "fact": fact,
        }
        if tags:
            entry["tags"] = tags
        entries = self._load_memory()
        entries.append(entry)
        self._save_memory(entries)
        return {"ok": True, "written": entry, "total": len(entries)}

    def _tool_memory_purge(self, args: dict) -> dict:
        days      = int(args.get("days", 30))
        dry_run   = args.get("dry_run", True)
        cutoff    = datetime.now(timezone.utc) - timedelta(days=days)
        entries   = self._load_memory()
        kept, removed = [], []
        for e in entries:
            ts_str = e.get("ts", "")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z","")).replace(tzinfo=timezone.utc)
                    if ts < cutoff:
                        removed.append(e)
                        continue
                except Exception:
                    pass
            kept.append(e)
        if not dry_run:
            self._save_memory(kept)
        return {
            "ok":       True,
            "dry_run":  dry_run,
            "removed":  len(removed),
            "kept":     len(kept),
            "cutoff_days": days,
        }

    def _tool_generate_briefing(self, args: dict) -> dict:
        n       = int(args.get("last_n", 40))
        entries = self._load_memory()[-n:]
        context = json.dumps(entries, ensure_ascii=False)[:4000]
        text    = self._llm(
            system="You are Cerebral's briefing officer. Produce a concise executive briefing (5-8 bullet points) from the recent conversation and event log. Include: key topics discussed, any system events, open action items, and one recommendation.",
            user=f"Recent memory entries (last {n}):\n\n{context}",
            max_tokens=400,
        )
        ts      = datetime.now(timezone.utc).isoformat()
        # Save to log
        os.makedirs(EXPORT_DIR, exist_ok=True)
        path = os.path.join(EXPORT_DIR, f"briefing_{ts[:10]}.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# Cerebral Briefing — {ts[:10]}\n\n{text}\n")
        return {"ok": True, "briefing": text, "saved_to": path}

    def _tool_session_export(self, args: dict) -> dict:
        n       = int(args.get("last_n", 100))
        entries = self._load_memory()[-n:]
        ts      = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        os.makedirs(EXPORT_DIR, exist_ok=True)
        path    = os.path.join(EXPORT_DIR, f"session_{ts}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)
        return {"ok": True, "entries": len(entries), "path": path}

    def _tool_knowledge_query(self, args: dict) -> dict:
        question = args.get("question", "")
        n        = int(args.get("context_n", 20))
        if not question:
            return {"ok": False, "error": "question required"}
        entries  = self._load_memory()[-n:]
        context  = json.dumps(entries, ensure_ascii=False)[:3000]
        answer   = self._llm(
            system="You are Cerebral, a sovereign AI assistant. Use the provided memory context to answer the question accurately. Be direct and concise.",
            user=f"Memory context:\n{context}\n\nQuestion: {question}",
            max_tokens=300,
        )
        return {"ok": True, "question": question, "answer": answer}

    def _tool_audit_log_read(self, args: dict) -> dict:
        n = int(args.get("n", 20))
        if not os.path.exists(AUDIT_LOG):
            return {"ok": True, "count": 0, "entries": [], "note": "No audit log yet."}
        with open(AUDIT_LOG, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        entries = []
        for line in lines[-n:]:
            try:
                entries.append(json.loads(line.strip()))
            except Exception:
                pass
        return {"ok": True, "total_lines": len(lines), "count": len(entries), "entries": entries}

    def _tool_tag_memory(self, args: dict) -> dict:
        pattern = args.get("pattern", "").lower()
        tags    = args.get("tags", [])
        dry_run = args.get("dry_run", True)
        if not pattern or not tags:
            return {"ok": False, "error": "pattern and tags required"}
        entries  = self._load_memory()
        modified = 0
        for e in entries:
            if pattern in json.dumps(e).lower():
                existing = e.get("tags", [])
                new_tags = list(set(existing + tags))
                if new_tags != existing:
                    e["tags"] = new_tags
                    modified += 1
        if not dry_run:
            self._save_memory(entries)
        return {"ok": True, "dry_run": dry_run, "modified": modified}

    def _tool_memory_stats_chart(self, args: dict) -> dict:
        """Return DonutChart-ready segments for memory entry type distribution."""
        entries   = self._load_memory()
        counts    = {"user": 0, "assistant": 0, "fact": 0, "event": 0, "other": 0}
        for e in entries:
            if "user" in e:        counts["user"] += 1
            elif "assistant" in e: counts["assistant"] += 1
            elif "fact" in e:      counts["fact"] += 1
            elif "event" in e:     counts["event"] += 1
            else:                  counts["other"] += 1
        COLORS = {"user": "#60a5fa", "assistant": "#34d399", "fact": "#f59e0b",
                  "event": "#fb7185", "other": "#94a3b8"}
        segments = [{"label": k, "value": v, "color": COLORS[k]} for k, v in counts.items() if v > 0]
        return {"ok": True, "total": len(entries), "segments": segments}
