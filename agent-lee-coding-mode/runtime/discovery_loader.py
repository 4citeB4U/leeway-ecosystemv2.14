import json
import os
from typing import Optional, List, Dict, Any

def _strip_bom(raw: str) -> str:
    return str(raw or "").lstrip("\ufeff")

def _repo_root() -> str:
    here = os.path.dirname(__file__)
    return os.path.abspath(os.path.join(here, '..'))

def _workspace_root() -> str:
    return os.path.abspath(os.path.join(_repo_root(), '..'))

def _index_candidates() -> List[str]:
    root = _repo_root()
    candidates = [
        os.path.join(root, 'agent-lee-coding-mode', 'source-index', 'all-leeway-files.index.json.new'),
        os.path.join(root, 'agent-lee-coding-mode', 'source-index', 'all-leeway-files.index.json'),
    ]
    return candidates

def _standards_root_map_candidates() -> List[str]:
    workspace = _workspace_root()
    return [
        os.path.join(workspace, 'LeeWay-Standards', 'standards-root-map.json'),
        os.path.join(workspace, 'Archive', 'docs', 'deprecated-standards-roots', 'Leeway-Standards', 'standards-root-map.json'),
    ]

def _normalize_standards_root_map(map_obj: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not isinstance(map_obj, dict):
        return None
    archived_roots = map_obj.get('archivedRoots') if isinstance(map_obj.get('archivedRoots'), list) else []
    return {
        'canonicalRoot': map_obj.get('canonicalRoot') if map_obj.get('canonicalRoot') else 'LeeWay-Standards',
        'archivedRoots': [r for r in archived_roots if r],
        'mergeTimestamp': map_obj.get('mergeTimestamp'),
        'filesMerged': map_obj.get('filesMerged', 0) if isinstance(map_obj.get('filesMerged', 0), int) else 0,
        'conflictsResolved': map_obj.get('conflictsResolved', 0) if isinstance(map_obj.get('conflictsResolved', 0), int) else 0,
        'conflictsRemaining': map_obj.get('conflictsRemaining', 0) if isinstance(map_obj.get('conflictsRemaining', 0), int) else 0,
        'writePolicy': map_obj.get('writePolicy') if map_obj.get('writePolicy') else 'All new standards writes must go to LeeWay-Standards.',
        'discoveryPolicy': map_obj.get('discoveryPolicy') if map_obj.get('discoveryPolicy') else 'Only canonical root is active. Archived roots are excluded from runtime discovery.',
        'receiptRequired': map_obj.get('receiptRequired', True) is not False,
    }

def _inspect_standards_root_state(root_map: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    workspace = _workspace_root()
    canonical_root = os.path.join(workspace, 'LeeWay-Standards')
    deprecated_root = os.path.join(workspace, 'Leeway-Standards')
    archived_roots = []
    if root_map and isinstance(root_map.get('archivedRoots'), list) and root_map['archivedRoots']:
        archived_roots = list(root_map['archivedRoots'])
    else:
        archived_roots = [os.path.join('Archive', 'docs', 'deprecated-standards-roots', 'Leeway-Standards')]

    warnings: List[str] = []
    canonical_root_exists = os.path.exists(canonical_root)
    canonical_real = os.path.realpath(canonical_root) if canonical_root_exists else None
    deprecated_real = os.path.realpath(deprecated_root) if os.path.exists(deprecated_root) else None
    deprecated_root_exists = bool(deprecated_real and canonical_real and deprecated_real.lower() != canonical_real.lower())
    archived_root_exists = os.path.exists(os.path.join(workspace, archived_roots[0])) if archived_roots else False

    if not canonical_root_exists:
        warnings.append(f'canonical standards root missing: {canonical_root}')
    if deprecated_root_exists:
        warnings.append(f'deprecated standards root still active outside archive: {deprecated_root}')
    if archived_roots and not archived_root_exists:
        warnings.append(f'archived standards root missing: {archived_roots[0]}')
    if root_map and root_map.get('canonicalRoot') and root_map.get('canonicalRoot') != 'LeeWay-Standards':
        warnings.append(f'standards-root-map canonicalRoot mismatch: {root_map.get("canonicalRoot")}')

    return {
        'canonicalRoot': 'LeeWay-Standards',
        'archivedRoots': archived_roots,
        'canonicalRootExists': canonical_root_exists,
        'deprecatedRootExistsOutsideArchive': deprecated_root_exists,
        'archivedRootExists': archived_root_exists,
        'warnings': warnings,
    }


def load_discovery_index() -> Optional[Dict[str, Any]]:
    for p in _index_candidates():
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    raw = _strip_bom(f.read())
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        parsed_index = {'files': parsed}
                    else:
                        parsed_index = parsed
                    return _attach_standards_root_metadata(parsed_index)
                except json.JSONDecodeError:
                    # attempt to find last JSON object
                    last_open = raw.rfind('{')
                    last_close = raw.rfind('}')
                    if last_open != -1 and last_close > last_open:
                        candidate = raw[last_open:last_close+1]
                        try:
                            return _attach_standards_root_metadata(json.loads(candidate))
                        except Exception:
                            return None
            except Exception:
                continue
    return None

def load_standards_root_map() -> Optional[Dict[str, Any]]:
    for p in _standards_root_map_candidates():
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    parsed = json.loads(_strip_bom(f.read()))
                return _normalize_standards_root_map(parsed)
            except Exception:
                continue
    return None

def _attach_standards_root_metadata(index: Dict[str, Any]) -> Dict[str, Any]:
    root_map = load_standards_root_map()
    root_state = _inspect_standards_root_state(root_map)
    index['standardsRootMap'] = root_map
    index['standardsRootState'] = root_state
    index['activeStandardsRoot'] = root_state['canonicalRoot']
    index['archivedStandardsRoots'] = list(root_state['archivedRoots'])
    index['standardsRootWarnings'] = list(root_state['warnings'])
    return index


def find_files_by_name(name: str) -> List[str]:
    index = load_discovery_index()
    if not index:
        return []
    files = index.get('files') or []
    matches = []
    for f in files:
        fn = f.get('Name') if isinstance(f, dict) else None
        full = f.get('FullName') if isinstance(f, dict) else None
        if fn == name or (full and name in full):
            matches.append(full)
    return matches


def find_model_role(index: Dict[str, Any], role_name: str) -> Optional[str]:
    if not index:
        return None
    if index.get('modelRoles') and index['modelRoles'].get(role_name):
        return index['modelRoles'][role_name]
    # Check runtime fabric model-authority
    root = os.path.abspath(os.path.join(_repo_root(), '..'))
    mab = os.path.join(root, 'Leeway Runtime Fabric', 'capability-registry', 'registry', 'model-authority.json')
    if os.path.exists(mab):
        try:
            with open(mab, 'r', encoding='utf-8') as f:
                parsed = json.loads(_strip_bom(f.read()))
            if parsed.get('modelRoles') and parsed['modelRoles'].get(role_name):
                return parsed['modelRoles'][role_name]
        except Exception:
            pass
    # Look for updated-model-hive-registry.json in index files
    files = index.get('files') or []
    for f in files:
        full = f.get('FullName') if isinstance(f, dict) else None
        if full and full.endswith('updated-model-hive-registry.json') and os.path.exists(full):
            try:
                with open(full, 'r', encoding='utf-8') as fh:
                    parsed = json.loads(_strip_bom(fh.read()))
                if parsed.get('modelRoles') and parsed['modelRoles'].get(role_name):
                    return parsed['modelRoles'][role_name]
            except Exception:
                continue
    return None
