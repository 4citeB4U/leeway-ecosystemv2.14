import os
import re
from pathlib import Path

from . import store

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
TAG_LINE_RE = re.compile(r"^tags:\s*\[([^\]]*)\]", re.MULTILINE)
TAG_ENTRY_RE = re.compile(r"^tags:\s*$", re.MULTILINE)
TAG_ITEM_RE = re.compile(r"^\s*-\s*(.+)$", re.MULTILINE)
HEADING_RE = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)


def _frontmatter(text):
    fm = {}
    match = FRONTMATTER_RE.match(text)
    if not match:
        return fm, text
    body = match.group(1)
    fm_text = text[match.end():]
    for line in body.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            fm[key.strip().lower()] = value.strip().strip('"').strip("'")
    return fm, fm_text


def _tags_from_fm(fm, body):
    tags = []
    if fm.get("tags"):
        tags = [t.strip() for t in re.split(r"[,\[\]\"]+", fm["tags"]) if t.strip()]
    else:
        tags = [t.strip().lstrip("#") for t in TAG_ITEM_RE.findall(body) if t.strip()]
    if not tags and "tags" in body:
        block = body.partition("tags:")[2].splitlines()
        for line in block[:20]:
            line = line.strip().lstrip("- ").strip()
            if not line:
                break
            tags.append(line.lstrip("#"))
    return sorted(set(tags))[:24]


def ingest(conn, vault_env=None, force=False):
    vault_text = os.environ.get("OBSIDIAN_VAULT", vault_env or "").strip()
    if not vault_text:
        return {"status": "skipped", "reason": "no vault configured", "path": None}
    vault = Path(vault_text)
    if not vault.is_dir():
        return {"status": "skipped", "reason": "no vault mounted", "path": str(vault)}

    last_scan = store.get_meta(conn, "obsidian_last_scan")
    newest = max((p.stat().st_mtime_ns for p in vault.rglob("*.md")), default=0)
    if not force and last_scan and int(last_scan) >= newest:
        return {"status": "fresh", "domain": "user", "nodes": 0, "edges": 0}

    store.clear_domain(conn, "user")
    t = store.time_stamp()
    counts = {"nodes": 0, "edges": 0}
    node_ids = {}

    for md in sorted(vault.rglob("*.md")):
        if ".obsidian" in md.parts:
            continue
        rel = md.relative_to(vault)
        try:
            text = md.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        fm, body = _frontmatter(text)
        title = fm.get("title") or md.stem
        note_id = f"user::note::{store.path_key(rel)}"
        node_ids[title.lower()] = note_id
        store.upsert_node(conn, {
            "id": note_id,
            "canonical_id": f"obsidian::note::{rel.as_posix()}",
            "domain": "user",
            "type": "note",
            "subtype": "markdown",
            "title": title,
            "description": fm.get("description") or (re.sub(r"[#*`>\-\s]+", " ", body).strip()[:300]),
            "source": "Obsidian vault",
            "source_path": str(rel),
            "source_anchor": "frontmatter+wikilinks",
            "tags_json": _json(_tags_from_fm(fm, body)),
            "status": "active",
            "confidence": 0.9,
            "spatial_json": None,
            "metadata_json": _json({"headings": HEADING_RE.findall(body), "has_frontmatter": bool(fm)}),
        })
        store.add_provenance(conn, note_id, "vault", "obsidian", str(rel))
        counts["nodes"] += 1
        for target in store.WIKILINK_RE.findall(body):
            key = target.strip().replace("\\", "").lower()
            if not key:
                continue
            edge_target = node_ids.get(key)
            if edge_target:
                store.upsert_edge(conn, {
                    "source_id": note_id,
                    "predicate": "LINKS_TO",
                    "target_id": edge_target,
                    "provenance_kind": "vault",
                    "confidence": 0.9,
                    "source_ref": str(rel),
                })
                counts["edges"] += 1

    conn.commit()
    store.set_meta(conn, "obsidian_last_scan", str(newest))
    conn.commit()
    return {"status": "ingested", "domain": "user", "nodes": counts["nodes"], "edges": counts["edges"]}


def _json(obj):
    import json

    return json.dumps(obj, ensure_ascii=False)