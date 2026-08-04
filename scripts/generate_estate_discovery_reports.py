#!/usr/bin/env python3
"""
Generate estate-wide discovery reports from the canonical inventory logs.

This script is intentionally non-destructive. It reads:
  - leeway-created-files.log
  - leeway-file-inventory.log
  - live docker state when available

And writes a canonical estate snapshot plus the required report set under:
  - Archive/discovery/
  - Archive/reports/discovery/
"""

from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import argparse
import json
import os
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.discovery.estate_inventory import (
    EVIDENCE_SURFACES,
    ENTRY_SURFACES,
    EstateInventory,
    IGNORED_NOISE_SEGMENTS,
    SYSTEM_AUTHORITY_DIRS,
)


AUTHORITATIVE_DIRS = set(SYSTEM_AUTHORITY_DIRS)
REGISTRY_HINTS = ("registry", "routes", "route", "manifest", "inventory", "discovery")
GOVERNANCE_HINTS = ("governance", "policy", "authority", "lifecycle", "runtime", "routing", "discovery", "control")
QUARANTINE_HINTS = ("tmp", "temp", "test_", "copilot_", "fabric-cache")
WORK_LOG_SIGNAL_HINTS = (
    "adapter",
    "browser",
    "cache",
    "cleanup",
    "container",
    "copilot",
    "deepseek",
    "desktop runtime",
    "discovery",
    "docker",
    "duplicate",
    "generated",
    "hello",
    "health",
    "inventory",
    "ledger",
    "manifest",
    "model",
    "ollama",
    "pass",
    "policy",
    "receipt",
    "reload",
    "restart",
    "router",
    "runtime fabric",
    "service",
    "snapshot",
    "status",
    "test",
    "timeout",
    "tmp",
    "update",
    "vscode",
    "wire",
    "wrote",
    "qwen",
)


def normalize(path: str) -> str:
    return path.replace("\\", "/").strip()


def rel_path(root: Path, full_path: str) -> str:
    normalized = normalize(full_path)
    root_prefix = normalize(str(root)) + "/"
    if normalized.startswith(root_prefix):
        return normalized[len(root_prefix) :]
    return normalized


def top_level_name(root: Path, full_path: str) -> str:
    rel = rel_path(root, full_path)
    if not rel:
        return ""
    return rel.split("/", 1)[0]


def path_segments(root: Path, full_path: str) -> List[str]:
    rel = rel_path(root, full_path)
    return [segment.lower() for segment in rel.split("/") if segment]


def is_noise_path(root: Path, full_path: str) -> bool:
    return any(segment in IGNORED_NOISE_SEGMENTS for segment in path_segments(root, full_path))


def contains_cleanup_token(value: str, token: str) -> bool:
    return re.search(rf"(^|[^a-z0-9]){re.escape(token)}([^a-z0-9]|$)", value) is not None


def has_cleanup_prefix(value: str, prefix: str) -> bool:
    if prefix in {"tmp", "temp"}:
        return (
            value == prefix
            or value.startswith(f"{prefix}-")
            or value.startswith(f"{prefix}_")
            or value.startswith(f"{prefix}.")
        )
    return value.startswith(prefix)


def is_evidence_path(root: Path, full_path: str) -> bool:
    rel = rel_path(root, full_path)
    top = top_level_name(root, full_path)
    segments = path_segments(root, full_path)
    if any(segment in {surface.lower() for surface in EVIDENCE_SURFACES} for segment in segments):
        return True
    if top in {"Archive", "logs"}:
        return True
    base = Path(rel).name.lower()
    return any(hint in base for hint in ("receipt", "report", "ledger", "audit", "proof", "manifest", "inventory", "log"))


def is_quarantine_candidate(root: Path, full_path: str) -> bool:
    if is_noise_path(root, full_path) or is_evidence_path(root, full_path):
        return False
    rel = rel_path(root, full_path)
    base = Path(rel).name.lower()
    segments = path_segments(root, full_path)
    if any(segment in {"tmp", "temp"} for segment in segments):
        return True
    return any(has_cleanup_prefix(base, hint) for hint in QUARANTINE_HINTS) or base.endswith((".bak", ".tmp", ".old"))


def is_canonical_inventory_surface(root: Path, full_path: str) -> bool:
    top = top_level_name(root, full_path)
    return top in AUTHORITATIVE_DIRS or top in ENTRY_SURFACES or not is_noise_path(root, full_path)


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def dump_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def dump_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False))
            handle.write("\n")


def unique_sorted(items: List[str]) -> List[str]:
    return sorted(dict.fromkeys(items))


def load_text(path: Optional[Path]) -> str:
    if not path or not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def normalize_search_text(text: str) -> str:
    return normalize_whitespace(str(text or "")).replace("\\", "/").lower()


def looks_like_path_reference(text: str) -> bool:
    normalized = normalize_search_text(text)
    return bool(
        re.search(r"[a-z]:/", normalized)
        or "/" in normalized
        or "\\" in str(text or "")
    )


def looks_like_json_fragment(text: str) -> bool:
    normalized = normalize_whitespace(text)
    return bool(
        re.match(r'^\s*"?[A-Za-z0-9_.-]+"\s*:\s*".*"\s*,?\s*$', normalized)
        or re.match(r"^\s*[\{\}\[\]]\s*$", normalized)
        or normalized.startswith(("\"", "{", "}", "[", "]"))
    )


def looks_like_shell_prompt(text: str) -> bool:
    normalized = normalize_whitespace(text)
    return bool(
        normalized.startswith(("PS ", ">>", ">", "(.venv)", "(venv)", "(base)", "(env)"))
        or "PS E:" in normalized
        or normalized.startswith("curl ")
        or normalized.startswith("Invoke-WebRequest")
        or normalized.startswith("sc.exe ")
    )


def looks_like_listing_row(text: str) -> bool:
    normalized = normalize_whitespace(text)
    lowered = normalize_search_text(text)
    if not normalized:
        return False
    return bool(
        re.match(r"^(?:a----|d----)\s+\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+\d+\s+", normalized)
        or re.match(r"^\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+\d+\s+", normalized)
        or re.match(r"^(?:mode|length|name)\b", lowered)
        or re.match(r"^(?:####|###|##|#)\s+", normalized)
        or re.match(r"^(?:\u2705|\u2714|\u274c|\U0001f7e2|\U0001f7e9|\U0001f449|\u20e3|\U0001f9e0|\U0001f9f1)\s+", normalized)
    )


def looks_like_command_or_url(text: str) -> bool:
    normalized = normalize_whitespace(text)
    lowered = normalize_search_text(text)
    if not normalized:
        return False
    if re.search(r"https?://", lowered) or "file:///" in lowered:
        return True
    return bool(
        re.match(
            r"^(?:invoke-|invoke-webrequest|invoke-restmethod|powershell|docker|curl|git|rg|findstr|sc\.exe|python|node|npm|npx|pnpm|apt-get|test-path|test\b|post\b|run\b|update\b|restart\b|reload\b|validate\b|verify\b|wire\b|reconcile\b|search\b|find\b|check\b)",
            lowered,
        )
    )


def looks_like_work_narration(text: str) -> bool:
    normalized = normalize_whitespace(text)
    lowered = normalize_search_text(text)
    if not normalized:
        return False
    return bool(
        re.match(r"^(?:a----|d----)\b", lowered)
        or re.match(r"^\s*(?:\d{1,2}/\d{1,2}/\d{4}|\d{1,2}:\d{2}\s+[ap]m)\b", lowered)
        or any(marker in normalized for marker in ("Generating patch", "Ran terminal command:", "PS E:", "status:", "Status:", "PASS", "PASS |"))
    )


def looks_like_pending_request(text: str) -> bool:
    lowered = normalize_search_text(text)
    if not lowered:
        return False
    return any(
        token in lowered
        for token in (
            "can you",
            "could you",
            "do this",
            "fix ",
            "fix this",
            "i'll",
            "i will",
            "now i'll",
            "now i will",
            "go back",
            "go ahead",
            "need to",
            "need for you",
            "i need",
            "we need",
            "please",
            "let's",
            "lets",
            "continue",
            "make sure",
            "take a look",
            "look at this",
            "look over",
            "run runtime checks",
            "integration smoke",
            "open_browser",
            "restart",
            "reload",
            "rebuild",
            "wire",
            "verify",
            "check",
            "produce",
            "drilldown",
            "look at this",
            "resolve",
            "search for",
            "search the",
            "find the",
            "set a plan",
            "set a plan",
            "break down",
            "tighten the classifier",
            "one-by-one",
            "update ",
            "test ",
            "run ",
            "we'll",
            "we will",
        )
    )


def looks_like_transcript_noise(text: str) -> bool:
    normalized = normalize_whitespace(text)
    lowered = normalize_search_text(text)
    if not normalized:
        return True
    if looks_like_shell_prompt(normalized) or looks_like_json_fragment(normalized):
        return True
    if re.fullmatch(r"[/\\:]+", normalized):
        return True
    if re.search(r"\b(status|owner|source|tool|uri|canonicalstatus|health|ok|failed|degraded|online)\b", lowered):
        if re.search(r'^\s*"?[A-Za-z0-9_.-]+"\s*:\s*".*"', normalized) or normalized.startswith(("status", "owner", "source", "tool")):
            return True
    if normalized.count(":") >= 2 and normalized.count("\"") >= 2:
        return True
    if len(normalized) < 8 and not looks_like_path_reference(normalized):
        return True
    return False


def classify_missing_subtype(text: str, matched_paths: List[str]) -> str:
    normalized = normalize_whitespace(text)
    if looks_like_transcript_noise(normalized):
        return "transcript noise"
    if looks_like_pending_request(normalized):
        return "pending request"
    if matched_paths:
        if looks_like_path_reference(normalized):
            # We expected the path to resolve; if it still reaches this branch,
            # treat it as a path/string mismatch rather than a true unknown.
            return "false positive"
        return "false positive"
    if looks_like_path_reference(normalized):
        return "true missing"
    return "true missing"


def classify_tightened_missing_subtype(text: str, matched_paths: List[str]) -> Tuple[str, str]:
    normalized = normalize_whitespace(text)
    lowered = normalize_search_text(text)
    if looks_like_pending_request(normalized):
        return "pending request", "tightened_future_action_or_operator_instruction"
    if looks_like_listing_row(normalized) or looks_like_work_narration(normalized) or looks_like_command_or_url(normalized):
        return "transcript noise", "tightened_transcript_noise_or_log_fragment"
    if matched_paths and (
        re.search(r"\.\.\.|/\.\.|\\\.\.", lowered)
        or "import " in lowered
        or ' from "' in lowered
        or lowered.endswith("tests/")
        or "docker-compose" in lowered and "selfhosted" in lowered
        or "docker-compose" in lowered and "unified" in lowered
    ):
        return "false positive", "tightened_string_overlap_or_fragment_reference"
    if looks_like_path_reference(normalized):
        return "true missing", "tightened_path_or_component_still_unresolved"
    if any(token in lowered for token in ("capability", "contract", "embodiment", "governance", "runtime", "router", "adapter", "model", "desktop", "voice", "browser", "screenshot", "speak")):
        return "true missing", "tightened_work_item_still_unresolved"
    return "false positive", "tightened_low_signal_reference"


def signal_lines_from_work_log(text: str) -> List[str]:
    lines = []
    for raw in re.split(r"[\r\n]+", text):
        cleaned = normalize_whitespace(re.sub(r"^[\-\*\u2022\d\.\)\s]+", "", raw))
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if lowered in {
            "claim offer",
            "claim free offer",
            "new chat",
            "document",
            "pasted text.txt",
            "prefer this response",
            "i prefer this response",
            "claim offer",
            "claim free offer",
        }:
            continue
        if not any(hint in lowered for hint in WORK_LOG_SIGNAL_HINTS):
            continue
        lines.append(cleaned)
    return unique_sorted(lines)


def find_matching_paths(estate: Dict[str, Any], text: str, limit: int = 8) -> List[str]:
    lowered = normalize_search_text(text)
    matches: List[str] = []
    for node in estate.get("nodes", []):
        rel = normalize(node.get("rel_path", ""))
        if not rel:
            continue
        path_text = normalize_search_text(node.get("path", ""))
        rel_text = normalize_search_text(rel)
        base = normalize_search_text(Path(rel).name)
        top = normalize_search_text(node.get("top_level", ""))
        if rel_text in lowered or path_text in lowered or (base and base in lowered) or (top and top in lowered):
            matches.append(node.get("path", ""))
            if len(matches) >= limit:
                break
    return unique_sorted([path for path in matches if path])


def classify_work_log_item(text: str, matched_paths: List[str], duplicate_paths: set[str], quarantine_paths: set[str]) -> Dict[str, Any]:
    lowered = normalize_search_text(text)
    has_completion_verb = any(token in lowered for token in ("completed", "generated", "loaded", "patched", "updated", "wired", "wrote", "reconciled", "fixed"))
    has_future_action = any(token in lowered for token in ("restart", "reload", "open", "test with hello", "continue", "need for you to actually do these things", "go ahead", "set a plan"))
    has_evidence_token = any(token in lowered for token in ("receipt", "report", "manifest", "ledger", "snapshot", "inventory", "log", "cache", "proof", "audit"))
    has_runtime_token = any(token in lowered for token in ("adapter", "router", "runtime fabric", "desktop runtime", "ollama", "model", "qwen", "deepseek", "container", "service", "vscode"))
    has_test_token = any(token in lowered for token in ("test", "warm-up", "hot-path", "pass", "healthy", "true"))
    has_path_reference = looks_like_path_reference(text)

    bucket = "still missing"
    reason = "unmatched_request_or_unresolved_statement"

    if matched_paths and any(normalize(path) in duplicate_paths for path in matched_paths):
        bucket = "duplicate"
        reason = "references_a_known_duplicate_registry_or_shadow_authority_asset"
    elif matched_paths and any(normalize(path) in quarantine_paths for path in matched_paths):
        bucket = "quarantine candidate"
        reason = "references_a_known_quarantine_candidate_asset"
    elif "duplicate" in lowered or "shadow" in lowered:
        bucket = "duplicate"
        reason = "explicit_duplicate_or_shadow_authority_reference"
    elif any(token in lowered for token in ("cleanup", "quarantine", "legacy", "tmp", "temp", "copilot_")):
        bucket = "quarantine candidate"
        reason = "cleanup_or_scratch_artifact_reference"
    elif has_evidence_token or has_test_token:
        bucket = "evidence"
        reason = "artifact_test_or_receipt_evidence"
    elif lowered.startswith("pass_") or "repair script appears to have completed successfully" in lowered:
        bucket = "already resolved"
        reason = "completed_work_log_claim_confirmed_by_current_state"
    elif has_completion_verb and ("policy" in lowered or "override" in lowered or "boot" in lowered or "cache" in lowered):
        bucket = "already resolved"
        reason = "completed_change_now_reflected_in_current_estate"
    elif has_runtime_token:
        bucket = "active"
        reason = "live_runtime_surface_or_model_lane"
    elif has_completion_verb and matched_paths:
        bucket = "already resolved"
        reason = "completed_work_item_with_matching_estate_artifact"
    elif has_future_action or lowered.endswith("?") or lowered.startswith("if you're still experiencing"):
        bucket = "pending request"
        reason = "future_action_or_pending_user_step"
    elif looks_like_transcript_noise(text):
        bucket = "transcript noise"
        reason = "transcript_fragment_or_shell_output"
    elif matched_paths and not has_path_reference:
        bucket = "false positive"
        reason = "string_overlap_without_actionable_missing_artifact"
    elif has_path_reference:
        bucket = "still missing"
        reason = "path_or_component_not_confirmed_in_current_estate"
    else:
        bucket = "false positive"
        reason = "low_signal_string_overlap"

    return {
        "bucket": bucket,
        "reason": reason,
        "matchedPaths": matched_paths,
        "text": text,
        "subtype": bucket,
    }


def build_work_log_reconciliation(
    estate: Dict[str, Any],
    duplicate_registries: List[Dict[str, Any]],
    orphan_assets: List[Dict[str, Any]],
    work_log_path: Optional[Path],
    report_dir: Path,
) -> Tuple[Dict[str, Any], Dict[str, Any], List[Dict[str, Any]]]:
    work_log_text = load_text(work_log_path)
    signals = signal_lines_from_work_log(work_log_text)
    duplicate_paths = {normalize(path) for group in duplicate_registries for path in group.get("paths", [])}
    quarantine_paths = {normalize(item.get("path", "")) for item in orphan_assets if item.get("reason") == "quarantine_candidate"}

    items: List[Dict[str, Any]] = []
    bucketed: Dict[str, List[Dict[str, Any]]] = {
        "evidence": [],
        "active": [],
        "duplicate": [],
        "quarantine candidate": [],
        "already resolved": [],
        "transcript noise": [],
        "pending request": [],
        "false positive": [],
        "still missing": [],
    }

    for index, signal in enumerate(signals, start=1):
        matched_paths = find_matching_paths(estate, signal)
        classification = classify_work_log_item(signal, matched_paths, duplicate_paths, quarantine_paths)
        item = {
            "id": f"work-log-item-{index:03d}",
            "bucket": classification["bucket"],
            "reason": classification["reason"],
            "text": signal,
            "matchedPaths": classification["matchedPaths"],
            "subtype": classification.get("subtype", classification["bucket"]),
        }
        items.append(item)
        bucketed[classification["bucket"]].append(item)

    missing_drilldown_items = [item for item in items if item["bucket"] in {"transcript noise", "pending request", "false positive", "still missing"}]
    drilldown_groups = {
        "transcript noise": [item for item in missing_drilldown_items if item["bucket"] == "transcript noise"],
        "pending request": [item for item in missing_drilldown_items if item["bucket"] == "pending request"],
        "false positive": [item for item in missing_drilldown_items if item["bucket"] == "false positive"],
        "true missing": [item for item in missing_drilldown_items if item["bucket"] == "still missing"],
    }

    tightened_missing_items: List[Dict[str, Any]] = []
    tightened_missing_groups: Dict[str, List[Dict[str, Any]]] = {
        "transcript noise": [],
        "pending request": [],
        "false positive": [],
        "true missing": [],
    }
    for item in drilldown_groups["true missing"]:
        refined_bucket, refined_reason = classify_tightened_missing_subtype(item["text"], item["matchedPaths"])
        refined_item = dict(item)
        refined_item["firstPassBucket"] = item["bucket"]
        refined_item["refinedBucket"] = refined_bucket
        refined_item["refinedReason"] = refined_reason
        refined_item["bucket"] = refined_bucket
        refined_item["subtype"] = refined_bucket
        refined_item["reason"] = refined_reason
        tightened_missing_items.append(refined_item)
        tightened_missing_groups[refined_bucket].append(refined_item)

    final_items = [item for item in items if item["bucket"] != "still missing"] + tightened_missing_items
    final_bucketed: Dict[str, List[Dict[str, Any]]] = {
        "evidence": [],
        "active": [],
        "duplicate": [],
        "quarantine candidate": [],
        "already resolved": [],
        "transcript noise": [],
        "pending request": [],
        "false positive": [],
        "still missing": [],
    }
    for item in final_items:
        final_bucketed[item["bucket"]].append(item)

    bucket_summaries = {
        bucket: {
            "count": len(values),
            "sampleItems": values[:20],
        }
        for bucket, values in final_bucketed.items()
    }

    drilldown_report = {
        "schema": "leeway.report.discovery.work-log-drilldown.v1",
        "generatedAt": estate["generatedAt"],
        "source": {
            "workLogPath": str(work_log_path) if work_log_path else None,
            "estateTopologyPath": "Archive/discovery/estate-topology.json",
        },
        "summary": {
            "initialStillMissingCount": len(missing_drilldown_items),
            "firstPassTranscriptNoiseCount": len(drilldown_groups["transcript noise"]),
            "firstPassPendingRequestCount": len(drilldown_groups["pending request"]),
            "firstPassFalsePositiveCount": len(drilldown_groups["false positive"]),
            "firstPassTrueMissingCount": len(drilldown_groups["true missing"]),
            "tightenedTranscriptNoiseCount": len(tightened_missing_groups["transcript noise"]),
            "tightenedPendingRequestCount": len(tightened_missing_groups["pending request"]),
            "tightenedFalsePositiveCount": len(tightened_missing_groups["false positive"]),
            "tightenedTrueMissingCount": len(tightened_missing_groups["true missing"]),
        },
        "subtypes": {
            subtype: {
                "count": len(values),
                "items": values,
            }
            for subtype, values in drilldown_groups.items()
        },
        "tightening": {
            "sourceBucket": "true missing",
            "summary": {
                "inputCount": len(drilldown_groups["true missing"]),
                "transcriptNoiseCount": len(tightened_missing_groups["transcript noise"]),
                "pendingRequestCount": len(tightened_missing_groups["pending request"]),
                "falsePositiveCount": len(tightened_missing_groups["false positive"]),
                "trueMissingCount": len(tightened_missing_groups["true missing"]),
            },
            "subtypes": {
                subtype: {
                    "count": len(values),
                    "items": values,
                }
                for subtype, values in tightened_missing_groups.items()
            },
        },
        "notes": [
            "Transcript noise includes shell prompts, JSON fragments, status tokens, and log fragments.",
            "Pending request includes explicit asks, follow-up actions, and active instructions that still require operator execution.",
            "False positive includes string-overlap matches that do not indicate a real missing estate asset.",
            "True missing is the only subtype that should remain eligible for cleanup review.",
        ],
    }

    reconciliation_report = {
        "schema": "leeway.report.discovery.work-log-reconciliation.v1",
        "generatedAt": estate["generatedAt"],
        "source": {
            "workLogPath": str(work_log_path) if work_log_path else None,
            "estateTopologyPath": "Archive/discovery/estate-topology.json",
            "phase1SummaryPath": str(report_dir / "phase-1-summary-report.json"),
            "duplicateRegistryPath": str(report_dir / "duplicate-registry-report.json"),
            "orphanAssetPath": str(report_dir / "orphan-asset-report.json"),
            "cleanupRecommendationPath": str(report_dir / "cleanup-recommendation-report.json"),
        },
        "matrix": bucket_summaries,
        "counts": {bucket: summary["count"] for bucket, summary in bucket_summaries.items()},
        "drilldown": {
            "reportPath": str(report_dir / "work-log-drilldown-report.json"),
            "summary": drilldown_report["summary"],
            "tightening": drilldown_report["tightening"]["summary"],
        },
        "notes": [
            "Items are classified into a single bucket only.",
            "Evidence means the item is backed by an artifact, receipt, report, or successful test record.",
            "Already resolved means the work-log claim is now confirmed by the current estate snapshot.",
            "Still missing means the work-log item is requested or pending, but not yet proven in the current estate.",
        ],
    }

    cleanup_ledger_rows: List[Dict[str, Any]] = []
    for item in final_items:
        recommended_action = {
            "duplicate": "REVIEW_AND_REHOME",
            "quarantine candidate": "QUARANTINE",
            "evidence": "NO_ACTION",
            "active": "NO_ACTION",
            "already resolved": "NO_ACTION",
            "transcript noise": "NO_ACTION",
            "pending request": "PENDING_OPERATOR_ACTION",
            "false positive": "NO_ACTION",
            "still missing": "REVIEW",
        }[item["bucket"]]
        cleanup_ledger_rows.append(
            {
                "loggedAt": estate["generatedAt"],
                "source": "work-log-reconciliation",
                "itemId": item["id"],
                "bucket": item["bucket"],
                "subtype": item["subtype"],
                "recommendedAction": recommended_action,
                "reason": item["reason"],
                "text": item["text"],
                "matchedPaths": item["matchedPaths"],
                **({"firstPassBucket": item["firstPassBucket"], "refinedBucket": item["refinedBucket"], "refinedReason": item["refinedReason"]} if "refinedBucket" in item else {}),
            }
        )

    cleanup_ledger = {
        "schema": "leeway.ledger.discovery.cleanup.v1",
        "generatedAt": estate["generatedAt"],
        "source": {
            "workLogPath": str(work_log_path) if work_log_path else None,
            "reportDir": str(report_dir),
        },
        "summary": {
            "entryCount": len(cleanup_ledger_rows),
            "quarantineCount": bucket_summaries["quarantine candidate"]["count"],
            "duplicateCount": bucket_summaries["duplicate"]["count"],
            "stillMissingCount": bucket_summaries["still missing"]["count"],
            "trueMissingCount": drilldown_report["summary"]["tightenedTrueMissingCount"],
        },
    }

    return reconciliation_report, drilldown_report, [cleanup_ledger, *cleanup_ledger_rows]


def build_registry_groups(root: Path, paths: List[str]) -> List[Dict[str, Any]]:
    groups: Dict[str, List[str]] = defaultdict(list)
    for path in paths:
        if is_noise_path(root, path):
            continue
        name = Path(path).name.lower()
        if any(hint in name for hint in REGISTRY_HINTS):
            groups[name].append(path)
    out = []
    for name, members in sorted(groups.items()):
        if len(members) < 2:
            continue
        out.append(
            {
                "name": name,
                "count": len(members),
                "paths": members,
            }
        )
    return out


def find_governance_conflicts(root: Path, inventory_paths: List[str]) -> List[Dict[str, Any]]:
    findings = []
    for path in inventory_paths:
        if is_noise_path(root, path):
            continue
        tl = top_level_name(root, path)
        rel = rel_path(root, path)
        lower = rel.lower()
        if any(hint in lower for hint in GOVERNANCE_HINTS) and tl not in AUTHORITATIVE_DIRS:
            findings.append(
                {
                    "path": path,
                    "topLevel": tl,
                    "reason": "governance_or_authority_asset_outside_authoritative_surfaces",
                }
            )
    return findings


def find_orphans(root: Path, inventory_paths: List[str], created_paths: List[str]) -> List[Dict[str, Any]]:
    created_set = {normalize(p) for p in created_paths}
    out = []
    for path in inventory_paths:
        if is_noise_path(root, path):
            continue
        rel = rel_path(root, path)
        base = Path(rel).name.lower()
        top = top_level_name(root, path)
        if top == "Archive":
            continue
        if is_quarantine_candidate(root, path):
            out.append({"path": path, "reason": "quarantine_candidate", "topLevel": top})
            continue
        if normalize(path) not in created_set and top not in AUTHORITATIVE_DIRS and top not in ENTRY_SURFACES:
            if (
                any(has_cleanup_prefix(base, prefix) for prefix in ("tmp", "temp", "test_", "copilot_", "fabric-cache"))
                or base.endswith((".bak", ".tmp", ".old"))
                or any(segment in {"tmp", "temp"} for segment in rel.lower().split("/"))
                or contains_cleanup_token(base, "build")
                or contains_cleanup_token(base, "probe")
                or contains_cleanup_token(base, "cache")
            ):
                out.append({"path": path, "reason": "generated_orphan_candidate", "topLevel": top})
    return out


def build_discovery_compliance(root: Path, inventory_paths: List[str], estate: Dict[str, Any]) -> Dict[str, Any]:
    bypasses = estate.get("compliance", {}).get("directFilesystemBypassFindings", [])
    independent_surfaces = []
    for path in inventory_paths:
        if is_noise_path(root, path):
            continue
        rel = rel_path(root, path)
        name = Path(rel).name.lower()
        top = top_level_name(root, path)
        if top in AUTHORITATIVE_DIRS or top in ENTRY_SURFACES:
            continue
        if any(hint in name for hint in ("registry", "inventory", "discovery")):
            independent_surfaces.append(path)
    return {
        "lookupOrder": estate.get("compliance", {}).get("lookupOrder", []),
        "primaryInputs": [
            str(root / "leeway-created-files.log"),
            str(root / "leeway-file-inventory.log"),
        ],
        "directFilesystemBypassFindings": bypasses,
        "independentInventorySurfaces": unique_sorted(independent_surfaces),
        "policy": "Discovery graph first; inventory logs are evidence inputs, not competing truth sources.",
    }


def build_phase1_summary(estate: Dict[str, Any], duplicate_registries: List[Dict[str, Any]], orphan_assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    nodes = estate.get("nodes", [])
    evidence_nodes = [node for node in nodes if node.get("review_state") == "evidence"]
    active_nodes = [node for node in nodes if node.get("review_state") == "active"]
    quarantine_nodes = [node for node in nodes if node.get("review_state") == "quarantine_candidate"]
    duplicate_paths = unique_sorted([path for group in duplicate_registries for path in group.get("paths", [])])
    quarantine_candidates = [item for item in orphan_assets if item.get("reason") == "quarantine_candidate"]
    generated_orphans = [item for item in orphan_assets if item.get("reason") == "generated_orphan_candidate"]

    return {
        "schema": "leeway.report.discovery.phase1-summary.v1",
        "generatedAt": estate["generatedAt"],
        "summary": {
            "inventoryPathCount": estate["summary"]["inventoryPathCount"],
            "createdPathCount": estate["summary"]["createdPathCount"],
            "overlapCount": estate["summary"]["overlapCount"],
            "evidenceCount": len(evidence_nodes),
            "activeCount": len(active_nodes),
            "duplicatePathCount": len(duplicate_paths),
            "duplicateGroupCount": len(duplicate_registries),
            "quarantineCandidateCount": len(quarantine_nodes),
            "orphanCandidateCount": len(orphan_assets),
            "generatedOrphanCandidateCount": len(generated_orphans),
        },
        "sections": {
            "evidence": {
                "count": len(evidence_nodes),
                "samplePaths": unique_sorted([node["path"] for node in evidence_nodes])[:25],
                "criteria": "Evidence surfaces, receipts, reports, manifests, ledgers, diagnostics, and log artifacts that support the estate snapshot.",
            },
            "active": {
                "count": len(active_nodes),
                "samplePaths": unique_sorted([node["path"] for node in active_nodes])[:25],
                "criteria": "Authority surfaces, entry surfaces, and owned active nodes that remain part of the live estate.",
            },
            "duplicate": {
                "groupCount": len(duplicate_registries),
                "pathCount": len(duplicate_paths),
                "sampleGroups": duplicate_registries[:15],
                "criteria": "Registry-like names that appear in more than one owned surface and may require consolidation or shadow-review.",
            },
            "quarantineCandidate": {
                "count": len(quarantine_candidates),
                "samplePaths": unique_sorted([item["path"] for item in quarantine_candidates])[:25],
                "generatedOrphanCount": len(generated_orphans),
                "criteria": "Temp, test, copilot, cache, and obvious scratch artifacts outside evidence and authority surfaces.",
            },
        },
        "notes": [
            "Inventory logs are treated as evidence inputs, not competing truth sources.",
            "Noise paths under virtual environments, package internals, and other third-party surfaces are excluded from cleanup signaling.",
            "Duplicate review is a separate category from active and evidence classification.",
        ],
    }


def build_registry_cache(estate: Dict[str, Any], duplicate_registries: List[Dict[str, Any]]) -> Dict[str, Any]:
    nodes = estate.get("nodes", [])
    by_path: Dict[str, Dict[str, Any]] = {}
    by_top_level: Dict[str, List[str]] = defaultdict(list)
    by_classification: Dict[str, List[str]] = defaultdict(list)
    by_review_state: Dict[str, List[str]] = defaultdict(list)
    by_owner_surface: Dict[str, List[str]] = defaultdict(list)

    for node in nodes:
        rel = node.get("rel_path")
        if not rel:
            continue
        slim = {
            "classification": node.get("classification"),
            "lifecycle": node.get("lifecycle"),
            "reviewState": node.get("review_state"),
            "role": node.get("role"),
            "ownerSurface": node.get("owner_surface"),
            "inCreatedLog": node.get("in_created_log"),
            "nodeKind": node.get("node_kind"),
        }
        by_path[rel] = slim
        by_top_level[node.get("top_level", "")].append(rel)
        by_classification[node.get("classification", "unknown")].append(rel)
        by_review_state[node.get("review_state", "unknown")].append(rel)
        by_owner_surface[node.get("owner_surface", "unknown")].append(rel)

    return {
        "schema": "leeway.discovery.registry-cache.v1",
        "generatedAt": estate["generatedAt"],
        "source": {
            "estateTopology": "Archive/discovery/estate-topology.json",
            "lookupOrder": estate.get("compliance", {}).get("lookupOrder", []),
        },
        "summary": {
            "nodeCount": len(nodes),
            "topLevelCount": len(by_top_level),
            "evidenceCount": len(by_review_state.get("evidence", [])),
            "activeCount": len(by_review_state.get("active", [])),
            "quarantineCandidateCount": len(by_review_state.get("quarantine_candidate", [])),
            "duplicateGroupCount": len(duplicate_registries),
        },
        "fastLookup": {
            "entrySurfaces": unique_sorted([name for name in ENTRY_SURFACES if name in by_top_level or name in by_owner_surface]),
            "authoritativeDirs": unique_sorted([name for name in AUTHORITATIVE_DIRS if name in by_top_level or name in by_owner_surface]),
        },
        "indexes": {
            "byPath": by_path,
            "byTopLevel": {name: unique_sorted(paths) for name, paths in sorted(by_top_level.items())},
            "byClassification": {name: unique_sorted(paths) for name, paths in sorted(by_classification.items())},
            "byReviewState": {name: unique_sorted(paths) for name, paths in sorted(by_review_state.items())},
            "byOwnerSurface": {name: unique_sorted(paths) for name, paths in sorted(by_owner_surface.items())},
            "duplicateRegistryNames": [group["name"] for group in duplicate_registries],
        },
    }


def build_container_reports(estate: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    containers = estate.get("runtime", {}).get("containers", [])
    stats = estate.get("runtime", {}).get("containerStats", [])
    running = [c for c in containers if c.get("status")]
    healthy = [c for c in running if "healthy" in str(c.get("status", "")).lower()]
    top_cpu = []

    def parse_mem(value: Any) -> float:
        token = str(value or "").split(" ", 1)[0]
        if not token:
            return 0.0
        amount = "".join(ch for ch in token if (ch.isdigit() or ch == ".")) or "0"
        unit = "".join(ch for ch in token if ch.isalpha()).upper()
        try:
            amount_f = float(amount)
        except ValueError:
            return 0.0
        if unit.startswith("G"):
            return amount_f * 1024
        if unit.startswith("M"):
            return amount_f
        if unit.startswith("K"):
            return amount_f / 1024
        return amount_f

    for entry in stats:
        cpu_raw = str(entry.get("CPUPerc", "0")).replace("%", "")
        try:
            cpu = float(cpu_raw)
        except ValueError:
            cpu = 0.0
        top_cpu.append({**entry, "cpuPercent": cpu, "memoryUsage": parse_mem(entry.get("MemUsage"))})
    top_cpu.sort(key=lambda item: (item["cpuPercent"], item["memoryUsage"]), reverse=True)
    health = {
        "containerCount": len(containers),
        "runningCount": len(running),
        "healthyCount": len(healthy),
        "dockerAvailable": not (len(containers) == 1 and containers[0].get("available") is False),
        "topResourceConsumers": top_cpu[:15],
    }
    utilization = {
        "summary": {
            "runningCount": len(running),
            "healthyCount": len(healthy),
            "topConsumerCount": len(top_cpu[:15]),
        },
        "containers": top_cpu[:15],
    }
    return health, utilization


def build_cleanup_recommendations(orphan_assets: List[Dict[str, Any]], governance_conflicts: List[Dict[str, Any]], bypasses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    recommendations = []
    for item in orphan_assets:
        if item.get("reason") == "quarantine_candidate":
            action = "QUARANTINE"
            priority = "HIGH"
        else:
            action = "REVIEW_AND_CLASSIFY"
            priority = "MEDIUM"
        recommendations.append(
            {
                "path": item["path"],
                "action": action,
                "reason": item["reason"],
                "priority": priority,
            }
        )
    for item in governance_conflicts:
        recommendations.append(
            {
                "path": item["path"],
                "action": "REVIEW_AND_REHOME",
                "reason": item["reason"],
                "priority": "HIGH",
            }
        )
    for item in bypasses:
        recommendations.append(
            {
                "path": item["path"],
                "action": "DISCOVERY_INTEGRATION",
                "reason": "direct_filesystem_access_bypasses_discovery",
                "priority": "MEDIUM",
            }
        )
    return recommendations


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate estate-wide discovery reports from inventory logs.")
    parser.add_argument("--root", default=".", help="LeeWay estate root")
    parser.add_argument("--created-log", default=None, help="Path to leeway-created-files.log")
    parser.add_argument("--inventory-log", default=None, help="Path to leeway-file-inventory.log")
    parser.add_argument("--work-log", default=None, help="Optional work-log or conversation log for reconciliation")
    parser.add_argument("--output-root", default=None, help="Output root for reports")
    parser.add_argument("--no-docker", action="store_true", help="Skip Docker runtime snapshot collection")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    created_log = Path(args.created_log).resolve() if args.created_log else root / "leeway-created-files.log"
    inventory_log = Path(args.inventory_log).resolve() if args.inventory_log else root / "leeway-file-inventory.log"
    if args.work_log:
        work_log = Path(args.work_log).resolve()
    else:
        default_work_log = Path(r"D:\last week build comnversations.txt")
        work_log = default_work_log if default_work_log.exists() else None
    output_root = Path(args.output_root).resolve() if args.output_root else root

    inventory = EstateInventory(root=root, created_files_log=created_log, file_inventory_log=inventory_log)
    estate = inventory.build()

    if args.no_docker:
        estate["runtime"]["containers"] = [{"available": False, "error": "docker_disabled"}]
        estate["runtime"]["containerStats"] = []

    inventory_paths = inventory.load_inventory_paths()
    created_paths = inventory.load_created_paths()

    topology_report = {
        "schema": "leeway.report.estate.topology.v1",
        "generatedAt": estate["generatedAt"],
        "root": estate["root"],
        "sources": estate["sources"],
        "summary": estate["summary"],
        "topLevelFiles": estate["topLevelFiles"],
        "topLevelDirectories": estate["topLevelDirectories"],
        "runtime": estate["runtime"],
    }

    discovery_coverage = {
        "schema": "leeway.report.discovery.coverage.v1",
        "generatedAt": estate["generatedAt"],
        "lookupOrder": estate["compliance"]["lookupOrder"],
        "primaryInputs": estate["compliance"]["inventorySources"],
        "coverage": {
            "inventoryCount": estate["summary"]["inventoryPathCount"],
            "createdCount": estate["summary"]["createdPathCount"],
            "overlapCount": estate["summary"]["overlapCount"],
            "topLevelFileCount": estate["summary"]["topLevelFileCount"],
            "topLevelDirectoryCount": estate["summary"]["topLevelDirectoryCount"],
        },
        "directFilesystemBypasses": estate["compliance"]["directFilesystemBypassFindings"],
    }

    governance_conflicts = find_governance_conflicts(root, inventory_paths)
    governance_report = {
        "schema": "leeway.report.governance.conflicts.v1",
        "generatedAt": estate["generatedAt"],
        "authoritativeDirs": sorted(AUTHORITATIVE_DIRS),
        "conflicts": governance_conflicts,
        "count": len(governance_conflicts),
    }

    duplicate_registries = build_registry_groups(root, inventory_paths)
    duplicate_registry_report = {
        "schema": "leeway.report.registry.duplicates.v1",
        "generatedAt": estate["generatedAt"],
        "duplicates": duplicate_registries,
        "count": len(duplicate_registries),
    }

    orphan_assets = find_orphans(root, inventory_paths, created_paths)
    orphan_report = {
        "schema": "leeway.report.assets.orphans.v1",
        "generatedAt": estate["generatedAt"],
        "orphans": orphan_assets,
        "count": len(orphan_assets),
    }

    phase1_summary = build_phase1_summary(estate, duplicate_registries, orphan_assets)
    registry_cache = build_registry_cache(estate, duplicate_registries)

    runtime_health, container_utilization = build_container_reports(estate)
    runtime_report = {
        "schema": "leeway.report.runtime.health.v1",
        "generatedAt": estate["generatedAt"],
        "health": runtime_health,
    }

    discovery_compliance = build_discovery_compliance(root, inventory_paths, estate)
    agent_lee_report = {
        "schema": "leeway.report.agent-lee.discovery-compliance.v1",
        "generatedAt": estate["generatedAt"],
        "compliance": discovery_compliance,
        "independentInventorySurfaces": discovery_compliance["independentInventorySurfaces"],
    }

    container_report = {
        "schema": "leeway.report.runtime.container-utilization.v1",
        "generatedAt": estate["generatedAt"],
        "utilization": container_utilization,
    }

    cleanup_recommendations = build_cleanup_recommendations(orphan_assets, governance_conflicts, discovery_compliance["directFilesystemBypassFindings"])
    cleanup_report = {
        "schema": "leeway.report.cleanup.recommendations.v1",
        "generatedAt": estate["generatedAt"],
        "recommendations": cleanup_recommendations,
        "count": len(cleanup_recommendations),
    }

    reconciliation_report, drilldown_report, cleanup_ledger_rows = build_work_log_reconciliation(
        estate,
        duplicate_registries,
        orphan_assets,
        work_log,
        output_root / "Archive" / "reports" / "discovery",
    )

    reconstruction_plan = {
        "schema": "leeway.report.estate.reconstruction-plan.v1",
        "generatedAt": estate["generatedAt"],
        "summary": [
            "Keep Discovery first and treat the inventory logs as evidence inputs.",
            "Quarantine temp/test/copilot artifacts before any move or delete step.",
            "Rehome or mirror duplicate registry/shadow-authority files into the authoritative surfaces.",
            "Keep qwen3:latest as the top reasoning route and route helper models through the model-family container.",
            "Use runtime health and container utilization to target the highest-cost services first.",
        ],
        "nextActions": [
            "Review the quarantine list and approve the first move batch.",
            "Fold the generated estate topology into the Discovery registry cache.",
            "Use the runtime report to decide whether to split or restart the model-family container.",
        ],
    }

    discovery_dir = output_root / "Archive" / "discovery"
    report_dir = output_root / "Archive" / "reports" / "discovery"
    dump_json(discovery_dir / "estate-topology.json", estate)
    dump_json(discovery_dir / "discovery-registry-cache.json", registry_cache)
    dump_json(report_dir / "estate-topology-report.json", topology_report)
    dump_json(report_dir / "discovery-coverage-report.json", discovery_coverage)
    dump_json(report_dir / "governance-conflict-report.json", governance_report)
    dump_json(report_dir / "duplicate-registry-report.json", duplicate_registry_report)
    dump_json(report_dir / "orphan-asset-report.json", orphan_report)
    dump_json(report_dir / "phase-1-summary-report.json", phase1_summary)
    dump_json(report_dir / "runtime-fabric-health-report.json", runtime_report)
    dump_json(report_dir / "agent-lee-discovery-compliance-report.json", agent_lee_report)
    dump_json(report_dir / "container-utilization-report.json", container_report)
    dump_json(report_dir / "cleanup-recommendation-report.json", cleanup_report)
    dump_json(report_dir / "work-log-reconciliation-report.json", reconciliation_report)
    dump_json(report_dir / "work-log-drilldown-report.json", drilldown_report)
    dump_json(report_dir / "estate-reconstruction-plan.json", reconstruction_plan)

    ledger_dir = output_root / "Archive" / "ledgers" / "discovery-cleanup"
    dump_jsonl(ledger_dir / "cleanup-ledger.jsonl", cleanup_ledger_rows)

    print(json.dumps(
        {
            "generatedAt": estate["generatedAt"],
            "topLevelFiles": estate["summary"]["topLevelFileCount"],
            "topLevelDirectories": estate["summary"]["topLevelDirectoryCount"],
            "orphanAssets": orphan_report["count"],
            "governanceConflicts": governance_report["count"],
            "duplicateRegistryGroups": duplicate_registry_report["count"],
            "cleanupRecommendations": cleanup_report["count"],
            "phase1EvidenceCount": phase1_summary["summary"]["evidenceCount"],
            "phase1ActiveCount": phase1_summary["summary"]["activeCount"],
            "phase1QuarantineCandidates": phase1_summary["summary"]["quarantineCandidateCount"],
            "workLogReconciliationBuckets": reconciliation_report["counts"],
            "workLogDrilldownSummary": drilldown_report["summary"],
            "registryCachePath": str(discovery_dir / "discovery-registry-cache.json"),
            "workLogReconciliationPath": str(report_dir / "work-log-reconciliation-report.json"),
            "workLogDrilldownPath": str(report_dir / "work-log-drilldown-report.json"),
            "outputRoot": str(report_dir),
        },
        indent=2,
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
