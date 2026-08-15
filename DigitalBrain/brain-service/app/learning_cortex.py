"""Digital Brain Learning Cortex (P11): read-only aggregator over the entire
learning stack (P5-P10). The cortex NEVER mutates Formula v1, Standards,
canonical hashes, or governance state: it only composes status summaries."""

import time

from . import adaptive_body
from . import ecosystem_analytics
from . import harness_engine
from . import hardware_learning
from . import learning_fabric
from . import pcie_intelligence
from . import store

CORTEX_NOTE = ("Cortex is a read-only aggregation surface. It never mutates "
               "Formula v1 (LW-F1), LeeWay Standards, canonical hashes, or "
               "governance state.")


def cortex(conn):
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    telemetry = conn.execute("SELECT * FROM hardware_stats ORDER BY captured_at DESC LIMIT 1").fetchone()
    telemetry = dict(telemetry) if telemetry else None
    exp = learning_fabric.stats(conn) if hasattr(learning_fabric, "stats") else _exp_stats(conn)
    return {
        "computedAt": now,
        "layers": {
            "P5_experienceFabric": {
                "total": exp["total"], "admitted": exp["admitted"], "duplicates": exp["duplicates"],
                "featureSchema": "lw-features-v1",
            },
            "P6_nativeHarness": {k: v for k, v in harness_engine.status(conn).items() if k in ("harness", "ticks", "counters", "canaryWindowSeconds", "llmAvoidanceRate")},
            "P7_ecosystemLearning": {"activeDays": ecosystem_analytics.snapshot(conn).get("retention", {}).get("activeDaysCount", 0),
                                     "computed": bool(store.get_meta(conn, "lw_eco_analytics_at"))},
            "P8_adaptiveBody": {"posture": adaptive_body.snapshot(conn).get("posture"),
                                "energyBudget": adaptive_body.snapshot(conn).get("energyBudget")},
            "P9_hardwareLearning": {"samples": hardware_learning.snapshot(conn).get("samples", 0),
                                    "cpuP95": (hardware_learning.snapshot(conn).get("cpu") or {}).get("p95")},
            "P10_pcieIntelligence": {"availability": pcie_intelligence.snapshot(conn).get("availability")},
        },
        "governance": {"formulaV1": "untouched", "standards": "untouched", "canonicalHashes": "untouched"},
        "note": CORTEX_NOTE,
    }


def _exp_stats(conn):
    total = conn.execute("SELECT COUNT(*) AS n FROM experiences").fetchone()["n"]
    admitted = conn.execute("SELECT COUNT(*) AS n FROM experiences WHERE learning_eligibility LIKE 'admitted%'").fetchone()["n"]
    dups = conn.execute("SELECT COUNT(*) - COUNT(DISTINCT experience_id) AS n FROM experiences").fetchone()["n"]
    return {"total": total, "admitted": admitted, "duplicates": dups}