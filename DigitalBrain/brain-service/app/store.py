import json
import os
import re
import sqlite3
from pathlib import Path

BRAIN_DATA_DIR = Path(os.environ.get("BRAIN_DATA_DIR", "data"))
DB_PATH = BRAIN_DATA_DIR / "digital-brain.sqlite"
BRAIN_DATA_DIR.mkdir(parents=True, exist_ok=True)


SCHEMA = """\
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    canonical_id TEXT,
    domain TEXT,
    type TEXT,
    subtype TEXT,
    title TEXT,
    description TEXT,
    source TEXT,
    source_path TEXT,
    source_anchor TEXT,
    tags_json TEXT,
    status TEXT,
    confidence REAL,
    spatial_json TEXT,
    metadata_json TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    source_id TEXT,
    predicate TEXT,
    target_id TEXT,
    provenance_kind TEXT,
    confidence REAL,
    source_ref TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS provenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT,
    kind TEXT,
    source TEXT,
    detail TEXT,
    captured_at TEXT
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_nodes_domain ON nodes(domain);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE TABLE IF NOT EXISTS view_positions (
    node_id TEXT PRIMARY KEY,
    x REAL, y REAL, z REAL,
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS formula_passports (
    node_id TEXT PRIMARY KEY,
    formula_id TEXT,
    adapter_id TEXT,
    policy TEXT,
    status TEXT,
    top6_json TEXT,
    base64_top6_json TEXT,
    selected_index INTEGER,
    selected_b64 TEXT,
    selected_bits TEXT,
    window_hash TEXT,
    input_hash TEXT,
    result_hash TEXT,
    receipt_path TEXT,
    evaluated_at TEXT,
    kernel_status TEXT,
    confidence REAL,
    free_slots INTEGER,
    detail_json TEXT,
    updated_at TEXT
);
"""

NODE_COLUMNS = [
    "id", "canonical_id", "domain", "type", "subtype", "title", "description",
    "source", "source_path", "source_anchor", "tags_json", "status",
    "confidence", "spatial_json", "metadata_json", "created_at",
    "parent_id", "scope_id", "depth", "expandable", "child_count",
    "child_provider", "source_kind",
    "b64_path", "spatial_index", "binary_path",
]


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    _migrate(conn)
    return conn


def _migrate(conn):
    """Add recursive-cortex and Base64-cortex columns (idempotent)."""
    cols = [r[1] for r in conn.execute("PRAGMA table_info(nodes)").fetchall()]
    for col, decl in [
        ("parent_id", "TEXT"),
        ("scope_id", "TEXT"),
        ("depth", "INTEGER DEFAULT 0"),
        ("expandable", "INTEGER DEFAULT 0"),
        ("child_count", "INTEGER DEFAULT 0"),
        ("child_provider", "TEXT"),
        ("source_kind", "TEXT"),
        ("b64_path", "TEXT"),
        ("spatial_index", "INTEGER"),
        ("binary_path", "TEXT"),
    ]:
        if col not in cols:
            conn.execute(f"ALTER TABLE nodes ADD COLUMN {col} {decl}")


def get_meta(conn, key):
    row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def set_meta(conn, key, value):
    conn.execute(
        "INSERT INTO meta (key, value, updated_at) VALUES (?, ?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        (key, value, time_stamp()),
    )


def time_stamp():
    import datetime

    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def upsert_node(conn, node):
    node = dict(node)
    node.setdefault("created_at", time_stamp())
    cols = [c for c in NODE_COLUMNS if c in node]
    conn.execute(
        f"INSERT OR REPLACE INTO nodes ({','.join(cols)}) VALUES ({','.join(['?'] * len(cols))})",
        [node[c] for c in cols],
    )


def get_node(conn, node_id):
    return conn.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()


def set_view_position(conn, node_id, x, y, z):
    conn.execute(
        "INSERT OR REPLACE INTO view_positions (node_id, x, y, z, updated_at) VALUES (?, ?, ?, ?, ?)",
        (node_id, float(x), float(y), float(z), time_stamp()),
    )


def get_view_positions(conn):
    return conn.execute("SELECT node_id, x, y, z FROM view_positions").fetchall()


PASSPORT_COLUMNS = [
    "node_id", "formula_id", "adapter_id", "policy", "status", "top6_json",
    "base64_top6_json", "selected_index", "selected_b64", "selected_bits",
    "window_hash", "input_hash", "result_hash", "receipt_path", "evaluated_at",
    "kernel_status", "confidence", "free_slots", "detail_json", "updated_at",
]


def upsert_passport(conn, passport):
    p = dict(passport)
    p.setdefault("updated_at", time_stamp())
    cols = [c for c in PASSPORT_COLUMNS if c in p]
    conn.execute(
        f"INSERT OR REPLACE INTO formula_passports ({','.join(cols)}) "
        f"VALUES ({','.join(['?'] * len(cols))})",
        [p[c] for c in cols],
    )


def get_passport(conn, node_id):
    return conn.execute(
        "SELECT * FROM formula_passports WHERE node_id = ?", (node_id,)
    ).fetchone()


def get_passports(conn):
    return conn.execute("SELECT * FROM formula_passports").fetchall()


def passport_count(conn):
    row = conn.execute("SELECT COUNT(*) AS n FROM formula_passports").fetchone()
    return row["n"]


def get_b64_stats(conn):
    row = conn.execute(
        "SELECT COUNT(*) AS n, COUNT(b64_path) AS addressed FROM nodes"
    ).fetchone()
    return {"nodes": row["n"], "addressed": row["addressed"]}


def upsert_edge(conn, edge):
    edge = dict(edge)
    edge.setdefault("created_at", time_stamp())
    if not edge.get("id"):
        edge["id"] = f"{edge['source_id']}__{edge['predicate']}__{edge['target_id']}"
    cols = list(edge.keys())
    conn.execute(
        f"INSERT OR REPLACE INTO edges ({','.join(cols)}) VALUES ({','.join(['?'] * len(cols))})",
        [edge[c] for c in cols],
    )


def add_provenance(conn, node_id, kind, source, detail):
    conn.execute(
        "INSERT INTO provenance (node_id, kind, source, detail, captured_at) VALUES (?, ?, ?, ?, ?)",
        (node_id, kind, source, detail, time_stamp()),
    )


def clear_domain(conn, domain):
    conn.execute("DELETE FROM edges WHERE source_id IN (SELECT id FROM nodes WHERE domain = ?)", (domain,))
    conn.execute("DELETE FROM edges WHERE target_id IN (SELECT id FROM nodes WHERE domain = ?)", (domain,))
    conn.execute("DELETE FROM nodes WHERE domain = ?", (domain,))
    conn.execute("DELETE FROM provenance WHERE node_id IN (SELECT id FROM nodes WHERE domain = ?)", (domain,))


WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]")


def slug(text):
    slug_text = re.sub(r"[^A-Za-z0-9]+", "-", text.strip().lower()).strip("-")
    return slug_text[:120] or "untitled"


def path_key(path_text):
    return "path::" + str(path_text).replace("\\", "/")