import json
import os
from pathlib import Path

from . import store

DOMAIN_FOR = {
    "skill": "architecture",
    "capability": "architecture",
    "standard": "standards",
    "law": "standards",
    "contract": "governance",
    "receipt": "evidence",
    "note": "knowledge",
}


def ingest(conn, leeway_root_env=None, force=False):
    leeway_root = Path(os.environ.get("LEEWAY_ROOT", leeway_root_env or "."))
    registries = leeway_root / "LeeWay-Standards" / "registries"
    anchor_path = leeway_root / "leeway-root.anchor.json"
    if not registries.is_dir():
        return {"status": "skipped", "reason": "no registries dir", "path": str(registries)}

    last_scan = store.get_meta(conn, "ecosystem_last_scan")
    newest = max(
        (p.stat().st_mtime_ns for p in registries.iterdir() if p.is_file()),
        default=0,
    )
    anchor_mtime = anchor_path.stat().st_mtime_ns if anchor_path.is_file() else 0
    if not force and last_scan and int(last_scan) >= max(newest, anchor_mtime):
        return {"status": "fresh", "domain": "ecosystem", "nodes": 0, "edges": 0}

    store.clear_domain(conn, "ecosystem")
    t = store.time_stamp()
    counts = {"nodes": 0, "edges": 0}

    def node(node_id, title, node_type, source_path, extra=None):
        node_id = f"ecosystem::{node_id}"
        domain = DOMAIN_FOR.get(node_type, "ecosystem")
        store.upsert_node(conn, {
            "id": node_id,
            "canonical_id": node_id,
            "domain": domain,
            "type": node_type,
            "subtype": (extra or {}).get("subtype"),
            "title": title,
            "description": (extra or {}).get("description"),
            "source": "LeeWay Standards registries",
            "source_path": str(source_path),
            "source_anchor": (extra or {}).get("anchor"),
            "tags_json": json.dumps((extra or {}).get("tags", []), ensure_ascii=False),
            "status": (extra or {}).get("status"),
            "confidence": 1.0 if (extra or {}).get("verified") else 0.9,
            "spatial_json": None,
            "metadata_json": json.dumps((extra or {}).get("metadata", {}), ensure_ascii=False),
        })
        store.add_provenance(conn, node_id, "registry", "leeway-skill-registry.json", json.dumps({"registry": str(source_path)}, ensure_ascii=False))
        counts["nodes"] += 1
        return node_id

    def edge(source_id, predicate, target_id, source_ref, confidence=1.0):
        store.upsert_edge(conn, {
            "source_id": source_id,
            "predicate": predicate,
            "target_id": target_id,
            "provenance_kind": "registry",
            "confidence": confidence,
            "source_ref": source_ref,
        })
        counts["edges"] += 1

    skill_reg = registries / "leeway-skill-registry.json"
    if skill_reg.is_file():
        try:
            skills = json.loads(skill_reg.read_text(encoding="utf-8"))
            items = skills.get("skills", skills if isinstance(skills, list) else [])
            for skill in items:
                if not isinstance(skill, dict) or not skill.get("skillId"):
                    continue
                sid = node(
                    skill["skillId"],
                    skill.get("displayName") or skill["skillId"],
                    "skill",
                    skill_reg,
                    extra={
                        "description": skill.get("description"),
                        "anchor": skill.get("location"),
                        "status": skill.get("status"),
                        "verified": skill.get("verificationStatus") == "VERIFIED" or skill.get("proofLevel") is not None,
                        "metadata": {"version": skill.get("version"), "inheritMode": skill.get("inheritMode"), "exitProofLevel": skill.get("exitProofLevel")},
                    },
                )
                for cap_ref in skill.get("capabilityIds", []) or skill.get("capabilities", []) or []:
                    if isinstance(cap_ref, dict):
                        cap_id = cap_ref.get("capabilityId") or cap_ref.get("id")
                    else:
                        cap_id = cap_ref
                    if cap_id:
                        edge(sid, "HAS_CAPABILITY", f"ecosystem::capability::{cap_id}", str(skill_reg), 0.9)
        except Exception as exc:  # noqa: BLE001
            store.add_provenance(conn, "ecosystem", "error", str(skill_reg), str(exc))

    cap_reg = registries / "leeway-capability-registry.json"
    if cap_reg.is_file():
        try:
            caps = json.loads(cap_reg.read_text(encoding="utf-8"))
            items = caps.get("capabilities", caps if isinstance(caps, list) else [])
            for cap in items:
                if not isinstance(cap, dict) or not cap.get("capabilityId"):
                    continue
                node(
                    f"capability::{cap['capabilityId']}",
                    cap.get("displayName") or cap["capabilityId"],
                    "capability",
                    cap_reg,
                    extra={
                        "description": cap.get("description"),
                        "subtype": cap.get("capabilityType"),
                        "status": cap.get("verificationStatus") or cap.get("status"),
                        "verified": cap.get("proofLevel") is not None,
                        "metadata": {"lane": cap.get("lane"), "proofLevel": cap.get("proofLevel")},
                    },
                )
        except Exception as exc:  # noqa: BLE001
            store.add_provenance(conn, "ecosystem", "error", str(cap_reg), str(exc))

    anchor_node = None
    if anchor_path.is_file():
        try:
            anchor = json.loads(anchor_path.read_text(encoding="utf-8"))
            anchor_id = "leeway-root-anchor"
            anchor_node = node(
                anchor_id,
                "Leeway Root Anchor",
                "standard",
                anchor_path,
                extra={
                    "description": "Path-neutral ecosystem root authority (all paths resolve through tokens, never hardcoded drive paths)",
                    "anchor": "leeway-root.anchor.json",
                    "verified": True,
                    "metadata": {"tokens": list(anchor.keys())},
                },
            )
        except Exception as exc:  # noqa: BLE001
            store.add_provenance(conn, "ecosystem", "error", str(anchor_path), str(exc))

    if anchor_node:
        standards_dir = leeway_root / "LeeWay-Standards" / "standards"
        if standards_dir.is_dir():
            for law in sorted(p for p in standards_dir.glob("*.md"))[:120]:
                edge(anchor_node, "GOVERNS", f"ecosystem::standards::{law.stem}", str(law), 1.0)

    conn.commit()
    store.set_meta(conn, "ecosystem_last_scan", str(max(newest, anchor_mtime)))
    conn.commit()
    return {"status": "ingested", "domain": "ecosystem", "nodes": counts["nodes"], "edges": counts["edges"]}