#!/usr/bin/env python3
"""
generate_receipt_catalog.py

Scan receipt roots and produce:
 - Archive/receipts/RECEIPT-CATALOG.json (draft/full)
 - Archive/receipts/DRYRUN-MIGRATION-MAP.json (dry-run moves + conflicts)

Usage (from repo root):
  python scripts/generate_receipt_catalog.py --root .

Options:
  --hash      compute sha256 for each file (can be slow for media)
  --catalog-out / --map-out override output paths
  --target-root override canonical target root (default: "Leeway Runtime Fabric/receipts")

This script is non-destructive and only writes the two JSON files.
"""

import os
import json
import argparse
import hashlib
import datetime

CHUNK = 8192


def compute_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def scan_receipts(root, rel_subpath, compute_hash=False):
    base = os.path.join(root, *rel_subpath.split("/"))
    out = []
    if not os.path.exists(base):
        return out
    for dirpath, dirs, files in os.walk(base):
        for name in files:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace("\\", "/")
            segments = rel.split("/")
            family = ""
            if "receipts" in segments:
                idx = segments.index("receipts")
                if len(segments) > idx + 1:
                    family = segments[idx + 1]
            entry = {
                "path": rel,
                "family": family,
                "filename": name,
                "id": name.replace('.receipt.json', '').replace('.json', ''),
                "size": os.path.getsize(full),
                "mtime": datetime.datetime.utcfromtimestamp(os.path.getmtime(full)).isoformat() + "Z",
            }
            if compute_hash:
                try:
                    entry["sha256"] = compute_sha256(full)
                except Exception:
                    entry["sha256"] = None
            out.append(entry)
    return out


def build_catalog(root, archive_entries, runtime_entries, target_root):
    catalog = {
        "version": "1.0-draft",
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "scanned": {
            "archive_count": len(archive_entries),
            "runtime_count": len(runtime_entries),
        },
        "recommended_canonical_root": target_root,
        "fields": ["path", "family", "filename", "id", "size", "mtime", "sha256"],
        "entries": archive_entries,
    }
    return catalog


def build_dryrun_map(root, archive_entries, runtime_entries, target_root):
    runtime_paths = set([e["path"] for e in runtime_entries])
    moves = []
    conflicts = []
    for e in archive_entries:
        from_path = e["path"]
        if from_path.startswith("Archive/receipts/"):
            to_path = from_path.replace("Archive/receipts", target_root, 1)
        else:
            to_path = (target_root.rstrip("/") + "/" + os.path.basename(from_path)).replace("\\", "/")
        conflict = to_path in runtime_paths
        if conflict:
            conflicts.append({"file": from_path, "to": to_path, "reason": "exists_in_runtime"})
        moves.append({"from": from_path, "to": to_path, "action": "MOVE", "conflict": conflict})
    map_json = {
        "version": "1.0-draft",
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "summary": {
            "archive_scanned": len(archive_entries),
            "runtime_scanned": len(runtime_entries),
            "proposed_moves": len(moves),
            "conflicts": len(conflicts),
        },
        "recommended_target_root": target_root,
        "rules": [
            "Preserve folder structure under canonical root",
            "If conflict -> mark for manual review and do not auto-move",
            "Large media may be linked instead of moved — review by size threshold",
        ],
        "moves": moves,
        "conflicts": conflicts,
    }
    return map_json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default='.', help="workspace root (where Archive/receipts lives)")
    parser.add_argument("--catalog-out", default='Archive/receipts/RECEIPT-CATALOG.json')
    parser.add_argument("--map-out", default='Archive/receipts/DRYRUN-MIGRATION-MAP.json')
    parser.add_argument("--target-root", default='Leeway Runtime Fabric/receipts', help="canonical target root")
    parser.add_argument("--hash", action='store_true', help='compute sha256 for each file (slow)')
    args = parser.parse_args()

    root = os.path.abspath(args.root)

    print(f"Scanning Archive receipts under {os.path.join(root, 'Archive/receipts')}")
    archive_entries = scan_receipts(root, 'Archive/receipts', compute_hash=args.hash)

    print(f"Scanning Runtime Fabric receipts under {os.path.join(root, 'Leeway Runtime Fabric/receipts')}")
    runtime_entries = scan_receipts(root, 'Leeway Runtime Fabric/receipts', compute_hash=False)

    catalog = build_catalog(root, archive_entries, runtime_entries, args.target_root)
    map_json = build_dryrun_map(root, archive_entries, runtime_entries, args.target_root)

    catalog_out = os.path.join(root, args.catalog_out)
    map_out = os.path.join(root, args.map_out)

    os.makedirs(os.path.dirname(catalog_out), exist_ok=True)
    os.makedirs(os.path.dirname(map_out), exist_ok=True)

    with open(catalog_out, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2)

    with open(map_out, 'w', encoding='utf-8') as f:
        json.dump(map_json, f, indent=2)

    print('Wrote catalog to', catalog_out)
    print('Wrote dry-run map to', map_out)

if __name__ == '__main__':
    main()
