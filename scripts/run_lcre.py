#!/usr/bin/env python3
"""
Run LCRE resolver: scan Archive and Runtime receipts, compute hashes (optional),
produce:
 - canonical_mismatch_report.json
 - duplicate_lineage_map.json
 - cross_domain_drift_index.json
 - canonical_state_graph.json
All outputs are written to the specified out directory under the workspace.
"""

import os
import json
import argparse
import hashlib
import datetime
from collections import defaultdict
import sys
import pathlib

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
            # file may be removed during a long scan; handle gracefully
            try:
                size = os.path.getsize(full)
                mtime = datetime.datetime.utcfromtimestamp(os.path.getmtime(full)).isoformat() + "Z"
            except OSError:
                # skip files that cannot be stat'ed (moved/locked)
                continue

            entry = {
                "path": rel,
                "family": family,
                "filename": name,
                "id": name.replace('.receipt.json', '').replace('.json', ''),
                "size": size,
                "mtime": mtime,
            }
            if compute_hash:
                try:
                    entry["sha256"] = compute_sha256(full)
                except Exception:
                    entry["sha256"] = None
            out.append(entry)
    return out


def group_by_sha(entries):
    groups = defaultdict(list)
    for e in entries:
        key = e.get("sha256") or f"{e.get('filename')}::{e.get('size')}"
        groups[key].append(e)
    return groups


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default='.', help="workspace root")
    parser.add_argument("--hash", action='store_true', help='compute sha256 for files')
    parser.add_argument("--out-dir", default='Archive/receipts', help='output directory for reports')
    args = parser.parse_args()

    root = os.path.abspath(args.root)
    out_dir = os.path.join(root, args.out_dir)
    os.makedirs(out_dir, exist_ok=True)

    print("Scanning Archive receipts...")
    archive_entries = scan_receipts(root, 'Archive/receipts', compute_hash=args.hash)
    print(f"Found {len(archive_entries)} archive receipts")

    print("Scanning Runtime Fabric receipts...")
    runtime_entries = scan_receipts(root, 'Leeway Runtime Fabric/receipts', compute_hash=args.hash)
    print(f"Found {len(runtime_entries)} runtime receipts")

    # simple identity conversion: ensure domain field
    for a in archive_entries:
        a['domain'] = 'archive'
    for r in runtime_entries:
        r['domain'] = 'runtime'

    # duplicates by sha
    combined = archive_entries + runtime_entries
    groups = group_by_sha(combined)
    duplicate_groups = [g for g in groups.values() if len(g) > 1]

    duplicate_map = []
    for g in duplicate_groups:
        duplicate_map.append({
            'sha_key': g[0].get('sha256') or f"{g[0].get('filename')}::{g[0].get('size')}",
            'count': len(g),
            'members': g,
        })

    # run LCRE resolver
    # ensure repository root is on sys.path so local package is importable
    scripts_dir = os.path.dirname(__file__)
    repo_root = os.path.abspath(os.path.join(scripts_dir, '..'))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    try:
        from leeway_lcre import LCRE, OutputWriter
    except Exception as e:
        print('Failed to import LCRE package:', e)
        print('sys.path:', sys.path[:5])
        raise

    resolver = LCRE()
    result = resolver.resolve(archive_entries, runtime_entries)

    # build cross-domain drift index
    drift_index = {
        'generatedAt': datetime.datetime.utcnow().isoformat() + 'Z',
        'archive_count': len(archive_entries),
        'runtime_count': len(runtime_entries),
        'matches': result.get('summary', {}).get('matches', 0),
        'conflicts': result.get('summary', {}).get('conflicts', 0),
        'archive_only': result.get('summary', {}).get('archive_only', 0),
        'runtime_only': result.get('summary', {}).get('runtime_only', 0),
        'duplicate_groups': len(duplicate_groups),
        'duplicate_entries_total': sum(len(g) for g in duplicate_groups),
    }

    writer = OutputWriter()

    mismatch_path = os.path.join(out_dir, 'canonical_mismatch_report.json')
    duplicate_path = os.path.join(out_dir, 'duplicate_lineage_map.json')
    drift_path = os.path.join(out_dir, 'cross_domain_drift_index.json')
    graph_path = os.path.join(out_dir, 'canonical_state_graph.json')

    writer.write({'conflicts': result.get('conflicts', []), 'summary': result.get('summary', {})}, mismatch_path)
    writer.write({'duplicate_groups': duplicate_map}, duplicate_path)
    writer.write(drift_index, drift_path)
    writer.write(result.get('graph', {}), graph_path)

    print('Wrote reports:')
    print(' -', mismatch_path)
    print(' -', duplicate_path)
    print(' -', drift_path)
    print(' -', graph_path)

if __name__ == '__main__':
    main()
