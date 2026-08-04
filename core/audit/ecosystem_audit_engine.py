"""
============================
LEEWAY ECOSYSTEM AUDIT SUBSYSTEM (LEA)
============================

A deterministic verification layer that continuously checks whether 
Agent Lee + runtime + core systems comply with:

* LeeWay Standards (authority layer)
* 79 Laws (behavior layer)
* Runtime Fabric (execution layer)
* Core system contracts (infrastructure layer)

This is NOT a loop engine.
This is a snapshot + validator + receipt generator.
"""

import json
import time
from pathlib import Path
from datetime import datetime


class EcosystemAuditEngine:
    """
    Governance verification engine for the entire Agent Lee ecosystem.
    
    Runs on demand, via daemon tick, or via scheduled audit cycle.
    NOT infinite execution.
    """
    
    def __init__(self, root_path):
        self.root = Path(root_path)
        self.timestamp = datetime.now()
        
        self.report = {
            "audit_id": f"audit-{int(time.time())}",
            "timestamp": self.timestamp.isoformat(),
            "root_path": str(self.root),
            "core_status": {},
            "standards_status": {},
            "runtime_status": {},
            "law_compliance": {},
            "archive_status": {},
            "drift_flags": [],
            "recommendations": [],
            "audit_result": "UNKNOWN"
        }

    # --------------------------
    # CORE INSPECTION
    # --------------------------
    def inspect_core(self):
        """Verify core execution substrate exists and is intact."""
        core_path = self.root / "core"
        fabric_path = core_path / "fabric"
        audit_path = core_path / "audit"
        
        self.report["core_status"] = {
            "exists": core_path.exists(),
            "fabric_present": fabric_path.exists(),
            "audit_present": audit_path.exists(),
            "components": []
        }
        
        if core_path.exists():
            # List core components
            for item in core_path.iterdir():
                if item.is_dir():
                    self.report["core_status"]["components"].append(item.name)
        
        if not core_path.exists():
            self.report["drift_flags"].append("CORE_MISSING")
            self.report["recommendations"].append("Create core/ directory structure")

    # --------------------------
    # STANDARDS INSPECTION
    # --------------------------
    def inspect_standards(self):
        """Verify LeeWay Standards governance layer is present."""
        standards_path = self.root / "LeeWay-Standards"
        
        self.report["standards_status"] = {
            "exists": standards_path.exists(),
            "governance_present": False,
            "files": []
        }
        
        if standards_path.exists():
            # Check for key governance files
            readme = standards_path / "README.md"
            self.report["standards_status"]["governance_present"] = readme.exists()
            
            # List standard files
            for item in standards_path.rglob("*.md"):
                self.report["standards_status"]["files"].append(str(item.relative_to(standards_path)))
        else:
            self.report["drift_flags"].append("STANDARDS_MISSING")
            self.report["recommendations"].append("Create LeeWay-Standards/ directory")

    # --------------------------
    # RUNTIME INSPECTION
    # --------------------------
    def inspect_runtime(self):
        """Verify Agent Lee runtime components and detect fragmentation."""
        runtime_components = {
            "agent-lee-os2": "directory",
            "agent-lee-coding-mode": "directory",
            "Cerebral": "directory",
            "live_loop_simple.py": "file",
            "live_loop_engine.py": "file",
            "genesis_service_kernel.py": "file"
        }
        
        found = []
        missing = []
        
        for comp, comp_type in runtime_components.items():
            comp_path = self.root / comp
            
            if comp_type == "directory":
                exists = comp_path.is_dir()
            else:
                exists = comp_path.is_file()
            
            if exists:
                found.append(comp)
            else:
                missing.append(comp)
        
        self.report["runtime_status"] = {
            "found": found,
            "missing": missing,
            "fragmentation_score": len(missing),
            "total_components": len(runtime_components)
        }
        
        if len(missing) > 0:
            self.report["drift_flags"].append("RUNTIME_FRAGMENTATION")
            self.report["recommendations"].append(f"Missing runtime components: {', '.join(missing)}")

    # --------------------------
    # LAW VALIDATION (79 LAWS HOOK)
    # --------------------------
    def inspect_laws(self):
        """Verify law system is present and check enforcement connection."""
        laws_paths = {
            "000-URGENT-LEEWAY-ASSISTANT-LAW": "directory",
            "AGENTS.md": "file",
            "AGENTS-DATA-CUSTODY-ADDENDUM.md": "file"
        }
        
        found = []
        missing = []
        
        for law_path, path_type in laws_paths.items():
            full_path = self.root / law_path
            
            if path_type == "directory":
                exists = full_path.is_dir()
            else:
                exists = full_path.is_file()
            
            if exists:
                found.append(law_path)
            else:
                missing.append(law_path)
        
        self.report["law_compliance"] = {
            "laws_present": len(found) > 0,
            "law_paths_found": found,
            "law_paths_missing": missing,
            "expected_law_count": 79,
            "enforcement_connected": False  # IMPORTANT: we detect but don't assume enforcement
        }
        
        if len(missing) > 0:
            self.report["drift_flags"].append("LAW_FILES_MISSING")
        
        # Check if laws are actually enforced at runtime
        # This would require checking if runtime daemon loads law system
        enforcement_loader = self.root / "core" / "enforcement" / "law_loader.py"
        if enforcement_loader.exists():
            self.report["law_compliance"]["enforcement_connected"] = True
        else:
            self.report["drift_flags"].append("LAW_ENFORCEMENT_DISCONNECTED")
            self.report["recommendations"].append("Create enforcement pipeline to connect laws to runtime")

    # --------------------------
    # ARCHIVE INSPECTION
    # --------------------------
    def inspect_archive(self):
        """Verify Archive system for memory + training + receipts."""
        archive_path = self.root / "Archive"
        
        required_subdirs = [
            "receipts",
            "skills", 
            "patterns",
            "genesis",
            "runtime-state",
            "transactions",
            "ledgers",
            "manifests",
            "database-snapshots"
        ]
        
        found = []
        missing = []
        file_counts = {}
        
        for subdir in required_subdirs:
            subdir_path = archive_path / subdir
            
            if subdir_path.exists():
                found.append(subdir)
                # Count files in subdirectory
                file_count = len(list(subdir_path.rglob("*")))
                file_counts[subdir] = file_count
            else:
                missing.append(subdir)
                file_counts[subdir] = 0
        
        self.report["archive_status"] = {
            "exists": archive_path.exists(),
            "subdirs_found": found,
            "subdirs_missing": missing,
            "file_counts": file_counts,
            "total_files": sum(file_counts.values())
        }
        
        if len(missing) > 0:
            self.report["drift_flags"].append("ARCHIVE_INCOMPLETE")
            self.report["recommendations"].append(f"Create missing Archive subdirectories: {', '.join(missing)}")

    # --------------------------
    # DRIFT DETECTION
    # --------------------------
    def detect_drift(self):
        """Detect system drift and compliance violations."""
        # Drift flags are added during inspection phases
        # This method can add additional cross-component drift checks
        
        # Check for runtime fragmentation
        if self.report["runtime_status"]["fragmentation_score"] > 3:
            self.report["drift_flags"].append("HIGH_RUNTIME_FRAGMENTATION")
            self.report["recommendations"].append("Consolidate runtime components into unified daemon")
        
        # Check for standards without enforcement
        if self.report["standards_status"]["exists"] and not self.report["law_compliance"]["enforcement_connected"]:
            self.report["drift_flags"].append("STANDARDS_NOT_ENFORCED")
            self.report["recommendations"].append("Build enforcement pipeline to connect standards to runtime")
        
        # Check for archive without active writing
        if self.report["archive_status"]["exists"] and self.report["archive_status"]["total_files"] == 0:
            self.report["drift_flags"].append("ARCHIVE_INACTIVE")
            self.report["recommendations"].append("Verify runtime is writing receipts to Archive")

    # --------------------------
    # FINAL AUDIT DECISION
    # --------------------------
    def finalize(self):
        """Generate final audit result and severity assessment."""
        drift_count = len(self.report["drift_flags"])
        
        if drift_count == 0:
            self.report["audit_result"] = "PASS"
            self.report["severity"] = "NONE"
        elif drift_count <= 2:
            self.report["audit_result"] = "PASS_WITH_WARNINGS"
            self.report["severity"] = "LOW"
        elif drift_count <= 5:
            self.report["audit_result"] = "FAIL"
            self.report["severity"] = "MEDIUM"
        else:
            self.report["audit_result"] = "FAIL"
            self.report["severity"] = "HIGH"
        
        self.report["drift_count"] = drift_count
        self.report["recommendation_count"] = len(self.report["recommendations"])

    # --------------------------
    # RUN FULL AUDIT
    # --------------------------
    def run_audit(self):
        """Execute complete ecosystem audit."""
        print(f"[AUDIT] Starting ecosystem audit: {self.report['audit_id']}")
        
        self.inspect_core()
        print("[AUDIT] Core inspection complete")
        
        self.inspect_standards()
        print("[AUDIT] Standards inspection complete")
        
        self.inspect_runtime()
        print("[AUDIT] Runtime inspection complete")
        
        self.inspect_laws()
        print("[AUDIT] Law compliance check complete")
        
        self.inspect_archive()
        print("[AUDIT] Archive inspection complete")
        
        self.detect_drift()
        print("[AUDIT] Drift detection complete")
        
        self.finalize()
        print(f"[AUDIT] Audit complete: {self.report['audit_result']} (Severity: {self.report['severity']})")
        
        return self.report

    # --------------------------
    # SAVE AUDIT REPORT
    # --------------------------
    def save_report(self, output_path=None):
        """Save audit report to Archive with receipt."""
        if output_path is None:
            timestamp_str = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_path = self.root / "Archive" / "reports" / "system-audit" / f"ecosystem-audit-{timestamp_str}.json"
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        output_path.write_text(json.dumps(self.report, indent=2))
        print(f"[AUDIT] Report saved to: {output_path}")
        
        # Generate receipt
        receipt_path = self.root / "Archive" / "receipts" / "system-audit" / datetime.now().strftime("%Y/%m/%d") / f"audit-{int(time.time())}.json"
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        
        receipt = {
            "receipt_id": f"receipt-audit-{int(time.time())}",
            "timestamp": datetime.now().isoformat(),
            "action": "ecosystem_audit",
            "audit_id": self.report["audit_id"],
            "result": self.report["audit_result"],
            "severity": self.report["severity"],
            "drift_count": self.report["drift_count"],
            "report_path": str(output_path),
            "status": "completed"
        }
        
        receipt_path.write_text(json.dumps(receipt, indent=2))
        print(f"[AUDIT] Receipt saved to: {receipt_path}")
        
        return output_path


# --------------------------
# EXECUTION ENTRY
# --------------------------
if __name__ == "__main__":
    # Determine root path
    root_path = Path(__file__).parent.parent.parent
    
    print("=" * 60)
    print("LEEWAY ECOSYSTEM AUDIT SUBSYSTEM (LEA)")
    print("=" * 60)
    print()
    
    engine = EcosystemAuditEngine(root_path=root_path)
    report = engine.run_audit()
    output_path = engine.save_report()
    
    print()
    print("=" * 60)
    print("AUDIT SUMMARY")
    print("=" * 60)
    print(f"Result: {report['audit_result']}")
    print(f"Severity: {report['severity']}")
    print(f"Drift Flags: {report['drift_count']}")
    print(f"Recommendations: {report['recommendation_count']}")
    print()
    
    if report['drift_flags']:
        print("Drift Flags:")
        for flag in report['drift_flags']:
            print(f"  - {flag}")
        print()
    
    if report['recommendations']:
        print("Recommendations:")
        for rec in report['recommendations']:
            print(f"  - {rec}")
        print()
    
    print(f"Full report: {output_path}")
    print()

# Made with Bob
