"""lw_b1.py — LW-B1B Semantic Cortical Placement & Balance Controller.

LW-B1 is a CONSUMER of the canonical LeeWay Formula v1.0 kernel served by the
Runtime Fabric (POST /runtime/formula/v1/evaluate). It never reimplements,
imports, duplicates, or approximates the kernel.

LW-B1B placement pipeline per node:

    parent scope
      -> free candidate slots (0..63)
      -> LW-B1B feature window (REAL graph features + identity tie-break)
      -> canonical kernel (fabric) -> Top-6 ranked states (0..69)
      -> Q69->B64 spatial projection (0..63 eligible, 64..69 operational-only)
      -> occupancy constraints -> best valid Base64 pin -> passport

IDENTITY guarantees stable individuality.
ARCHITECTURAL TELEMETRY explains where it belongs.
LW-F1 ranks candidates. LW-B1 selects valid Base64 location.

The 16x6 window is built from REAL properties of the node and its sibling
set in the brain database (documented frozen contract, policy
lw-b1-semantic-v1):

    dim 0  parent affinity     stable hash of parent_id          0..63 (REAL graph relation)
    dim 1  dependency affinity stable hash of domain             0..63 (REAL taxonomy)
    dim 2  semantic affinity   stable hash of type               0..63 (REAL taxonomy)
    dim 3  structural depth    min(63, depth)                    0..63 (REAL hierarchy position)
    dim 4  spatial balance     min(63, sibling count)            0..63 (REAL occupancy pressure)
    dim 5  identity tie-break  stable(canonical_id + #attempt)   0..63 (deterministic fallback)

Hashing provides deterministic identity; actual relationships provide
intelligence. Identity is the LAST dim and only decides among nodes whose
real architectural features are identical (e.g. homogeneous clusters).

Q69 -> B64 projection (see docs/Q69-B64-SPATIAL-PROJECTION-CONTRACT.md):
kernel Top-6 states 0..69; states 0..63 are spatially eligible; states
64..69 are OPERATIONAL_ONLY and never assigned spatially. Both are recorded
in the passport.

Occupancy-aware feedback loop (bounded, contract MAX_ATTEMPTS = 4):
if the kernel Top-6 for attempt N yields no free eligible slot, the window
identity dim is re-salted deterministically and V1 is evaluated again with
updated occupancy reality. Each attempt's Top-6 and verdict are recorded in
the Formula Passport. Exhaustion = truthful BLOCKED.

FAIL-CLOSED: if the fabric formula block is not LEEWAY_FORMULA_V1_PASS or is
unreachable, LW-B1 refuses to assign addresses and records status BLOCKED.
No telemetry = no fabricated placement.

Determinism: same DB state + same fabric kernel -> same addresses. Placement
policy version increments when rules change.
"""
import hashlib
import json
import logging
import os
import urllib.request

from . import b64_cortex

log = logging.getLogger("lw_b1")

FABRIC_DEFAULT = os.environ.get("LEEWAY_FABRIC_URL", "http://172.18.0.1:4001")
PLACEMENT_POLICY = "lw-b1-semantic-v1"
MAX_ATTEMPTS = 4


def _stable(x, limit=64):
    """Deterministic 0..limit-1 from any string (reproducible across runs)."""
    if x is None:
        return 0
    return int(hashlib.sha256(str(x).encode("utf-8")).hexdigest(), 16) % limit


class KernelUnavailable(Exception):
    pass


def _fabric_formula_health(fabric_url, timeout=8):
    req = urllib.request.Request(f"{fabric_url}/runtime/health")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        health = json.loads(r.read().decode("utf-8"))
    block = health.get("formula", {})
    if block.get("status") != "LEEWAY_FORMULA_V1_PASS":
        raise KernelUnavailable(f"FORMULA_BLOCK_NOT_PASS:{block.get('status')}")
    if block.get("goldenVectorPass") is not True:
        raise KernelUnavailable("FORMULA_GOLDEN_VECTOR_NOT_VERIFIED")
    return block


def _evaluate(fabric_url, matrix, timeout=30):
    payload = {"adapterId": "raw-base64-v1", "input": {"matrix": matrix}}
    req = urllib.request.Request(
        f"{fabric_url}/runtime/formula/v1/evaluate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


class LW_B1:
    def __init__(self, store, fabric_url=None):
        self.store = store
        self.fabric_url = fabric_url or FABRIC_DEFAULT

    # ------------------------------------------------------------- features
    def _feature_rows(self, node, siblings, region_label, domain, attempt=0, ordinal=0, free_slots=None):
        """LW-B1B semantic window: REAL graph features + identity tie-break,
        repeated across the 16 rows the canonical kernel consumes.

        Documented frozen contract (policy lw-b1-semantic-v1) — see module
        docstring for dim meanings. Attempt re-salts only the identity dim
        (dim 5), which is the deterministic tie-breaker; real architectural
        dims 0..4 are attempt-independent.

        dim 4 = sibling ordinal (deterministic position among siblings),
        which is REAL structural telemetry and spreads dense clusters across
        the lattice instead of collapsing on shared affinity states.

        dim 5 = identity tie-break. On attempt 0 it is the raw identity
        hash. On retry attempts (occupancy feedback), it is anchored into
        the CURRENT FREE space (real occupancy state fed back into the
        window), so the kernel re-ranks against updated reality.
        """
        parent_id = node.get("parent_id") or node.get("scope_id") or ""
        identity = node.get("canonical_id") or node.get("id")
        depth = node.get("depth") or 0
        if free_slots and attempt > 0:
            d5 = free_slots[_stable(f"{identity}#{attempt}", len(free_slots)) % len(free_slots)]
        else:
            d5 = _stable(f"{identity}#{attempt}", 64)
        sig = [
            _stable(parent_id, 64),
            _stable(domain or node.get("domain"), 64),
            _stable(node.get("type") or node.get("subtype"), 64),
            min(63, max(0, int(depth))),
            min(63, max(0, int(ordinal))),
            d5,
        ]
        return [list(sig) for _ in range(16)]

    # ------------------------------------------------------------- placement
    def place(self, node, siblings, region_label, domain, hemi="L"):
        """Assign a Base64 pin for node; returns (passport_dict, b64_dict).

        Runs the bounded occupancy-aware feedback loop:
            attempt N: build window -> V1 Top-6 -> Q69->B64 projection
                       -> occupancy filter -> select best valid pin
        Returns status "PASS" with address, or "BLOCKED" (fail-closed) with
        reason. Never fabricates.
        """
        try:
            _fabric_formula_health(self.fabric_url)
        except KernelUnavailable as e:
            return {"status": "BLOCKED", "reason": str(e), "kernel": None}, None

        occupied = {s.get("b64_index") for s in siblings if s.get("b64_index") is not None}
        occupied.discard(None)
        free = [i for i in range(64) if i not in occupied]

        ordinal = 0
        if siblings:
            ordered = sorted((s.get("id") or "") for s in siblings)
            try:
                ordinal = ordered.index(node.get("id") or "")
            except ValueError:
                ordinal = len(ordered) - 1

        attempts = []
        for attempt in range(MAX_ATTEMPTS):
            rows = self._feature_rows(node, siblings, region_label, domain, attempt, ordinal, free)
            matrix = rows
            try:
                res = _evaluate(self.fabric_url, matrix)
            except Exception as e:
                return {"status": "BLOCKED",
                        "reason": f"KERNEL_EVALUATE_FAILED:{e}",
                        "kernel": None, "attempts": attempts}, None

            top6 = res.get("decimalState") or []
            spatial_top6 = [s for s in top6 if 0 <= s <= 63]
            operational_only = [s for s in top6 if 64 <= s <= 69]
            ranked_free = [s for s in spatial_top6 if s in free]
            attempts.append({
                "attempt": attempt + 1,
                "top6": top6,
                "spatialTop6": spatial_top6,
                "operationalOnly": operational_only,
                "verdict": "SELECTED" if ranked_free else "ALL_OCCUPIED",
                "inputHash": res.get("inputHash"),
            })
            if ranked_free:
                selected = ranked_free[0]
                symbol = b64_cortex.encode(selected)
                bits = b64_cortex.to_bits(selected)
                passport = {
                    "formulaVersion": res.get("formulaId"),
                    "adapterId": res.get("adapterId"),
                    "policy": PLACEMENT_POLICY,
                    "status": "PASS",
                    "top6": top6,
                    "spatialTop6": spatial_top6,
                    "operationalOnly": operational_only,
                    "base64Top6": [b64_cortex.encode(s) for s in top6],
                    "selected": selected,
                    "selectedB64": symbol,
                    "selectedBits": bits,
                    "attempts": attempts,
                    "attemptUsed": attempt + 1,
                    "windowHash": res.get("inputHash"),
                    "inputHash": res.get("inputHash"),
                    "resultHash": res.get("resultHash"),
                    "receiptPath": res.get("receiptPath"),
                    "evaluatedAt": res.get("evaluatedAt"),
                    "kernelStatus": "LEEWAY_FORMULA_V1_PASS",
                    "confidence": (1.0 if len(rows) >= 16 else len(rows) / 16.0),
                    "freeSlots": len(free),
                }
                b64_addr = {"hemi": hemi, "words": [symbol], "indices": [selected],
                            "bits": [bits], "binaryPath": bits}
                return passport, b64_addr

        return {"status": "BLOCKED",
                "reason": "NO_FREE_SLOT_IN_KERNEL_TOP6_AFTER_MAX_ATTEMPTS",
                "kernel": res, "attempts": attempts}, None
