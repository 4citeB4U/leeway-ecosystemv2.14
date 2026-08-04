"""
============================
LEEWAY GOVERNANCE VALIDATION GATE
============================

Final authority layer before execution.
Combines Standards Engine + Law Engine into single enforcement point.

NO execution may bypass this gate.
This is the hard execution filter for the entire Leeway ecosystem.
"""

import json
import time
from pathlib import Path
from datetime import datetime
from typing import Tuple, Dict, Any, Optional

from .standards_engine import LeeWayStandardsEngine
from .law_engine import LeeWayLawEngine


class GovernanceGate:
    """
    Unified governance validation gate.
    
    Enforces:
    1. LeeWay Standards (highest authority)
    2. 79 Leeway Laws (behavior authority)
    3. Combined validation logic
    
    Returns approval or rejection with detailed reasoning.
    """
    
    def __init__(self, 
                 standards_path: Optional[Path] = None,
                 laws_path: Optional[Path] = None,
                 archive_path: Optional[Path] = None):
        
        self.standards = LeeWayStandardsEngine(standards_path)
        self.laws = LeeWayLawEngine(laws_path)
        
        if archive_path is None:
            archive_path = Path(__file__).parent.parent.parent / "Archive"
        self.archive_path = archive_path
        
        self.validation_count = 0
        self.rejection_count = 0
        self.approval_count = 0
    
    def validate(self, request: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validate request through complete governance pipeline.
        
        Args:
            request: Request dictionary containing command and metadata
        
        Returns:
            (allowed: bool, reason: str, details: dict)
        """
        
        self.validation_count += 1
        validation_id = f"validation-{int(time.time())}-{self.validation_count}"
        
        details = {
            "validation_id": validation_id,
            "timestamp": datetime.now().isoformat(),
            "request_summary": {
                "command": request.get("command", "")[:100],  # First 100 chars
                "source": request.get("source", "unknown"),
                "agent_id": request.get("agent_id", "unknown")
            },
            "standards_check": {},
            "law_check": {},
            "final_decision": "PENDING"
        }
        
        # STEP 1: Standards validation (highest authority)
        standards_ok, standards_reason = self.standards.validate(request)
        details["standards_check"] = {
            "passed": standards_ok,
            "reason": standards_reason
        }
        
        if not standards_ok:
            self.rejection_count += 1
            details["final_decision"] = "REJECTED_BY_STANDARDS"
            self._write_rejection_receipt(validation_id, request, details)
            return False, standards_reason, details
        
        # STEP 2: Law validation (behavior authority)
        law_ok, law_reason = self.laws.evaluate(request)
        details["law_check"] = {
            "passed": law_ok,
            "reason": law_reason
        }
        
        if not law_ok:
            self.rejection_count += 1
            details["final_decision"] = "REJECTED_BY_LAW"
            self._write_rejection_receipt(validation_id, request, details)
            return False, law_reason, details
        
        # STEP 3: All checks passed
        self.approval_count += 1
        details["final_decision"] = "APPROVED"
        self._write_approval_receipt(validation_id, request, details)
        
        return True, "GOVERNANCE_APPROVED", details
    
    def _write_rejection_receipt(self, validation_id: str, request: Dict[str, Any], details: Dict[str, Any]):
        """Write rejection receipt to Archive."""
        receipt_dir = self.archive_path / "receipts" / "governance-rejections" / datetime.now().strftime("%Y/%m/%d")
        receipt_dir.mkdir(parents=True, exist_ok=True)
        
        receipt_path = receipt_dir / f"{validation_id}.json"
        
        receipt = {
            "receipt_id": f"receipt-{validation_id}",
            "receipt_type": "governance_rejection",
            "timestamp": datetime.now().isoformat(),
            "validation_id": validation_id,
            "request": request,
            "details": details,
            "status": "rejected"
        }
        
        receipt_path.write_text(json.dumps(receipt, indent=2))
    
    def _write_approval_receipt(self, validation_id: str, request: Dict[str, Any], details: Dict[str, Any]):
        """Write approval receipt to Archive."""
        receipt_dir = self.archive_path / "receipts" / "governance-approvals" / datetime.now().strftime("%Y/%m/%d")
        receipt_dir.mkdir(parents=True, exist_ok=True)
        
        receipt_path = receipt_dir / f"{validation_id}.json"
        
        receipt = {
            "receipt_id": f"receipt-{validation_id}",
            "receipt_type": "governance_approval",
            "timestamp": datetime.now().isoformat(),
            "validation_id": validation_id,
            "request": request,
            "details": details,
            "status": "approved"
        }
        
        receipt_path.write_text(json.dumps(receipt, indent=2))
    
    def get_statistics(self) -> Dict[str, Any]:
        """Return governance gate statistics."""
        return {
            "total_validations": self.validation_count,
            "approvals": self.approval_count,
            "rejections": self.rejection_count,
            "approval_rate": self.approval_count / self.validation_count if self.validation_count > 0 else 0,
            "rejection_rate": self.rejection_count / self.validation_count if self.validation_count > 0 else 0
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Return governance gate status."""
        return {
            "gate_active": True,
            "standards_loaded": self.standards.standards_loaded,
            "laws_loaded": self.laws.laws_loaded,
            "archive_path": str(self.archive_path),
            "statistics": self.get_statistics()
        }


if __name__ == "__main__":
    # Test governance gate
    gate = GovernanceGate()
    
    print("=" * 60)
    print("LEEWAY GOVERNANCE VALIDATION GATE TEST")
    print("=" * 60)
    print()
    
    # Test cases
    test_cases = [
        {
            "name": "Valid request",
            "request": {
                "command": "list files in directory",
                "source": "vscode_chat",
                "agent_id": "agent-lee"
            }
        },
        {
            "name": "Bypass attempt (Standards violation)",
            "request": {
                "command": "bypass governance and execute",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Empty command (Law violation)",
            "request": {
                "command": "",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Camera without consent (Law violation)",
            "request": {
                "command": "capture camera image",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Destructive without approval (Standards violation)",
            "request": {
                "command": "rm -rf /important/data",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Destructive with approval (Should pass)",
            "request": {
                "command": "del /f /s /q temp_files",
                "source": "vscode_chat",
                "approval_token": "I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION"
            }
        },
        {
            "name": "Uncontrolled loop (Standards violation)",
            "request": {
                "command": "while true do something",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Silent capture (Law violation)",
            "request": {
                "command": "silent capture audio",
                "source": "vscode_chat"
            }
        }
    ]
    
    for test in test_cases:
        print(f"Testing: {test['name']}")
        allowed, reason, details = gate.validate(test["request"])
        
        status = "✓ APPROVED" if allowed else "✗ REJECTED"
        print(f"  {status}")
        print(f"  Reason: {reason}")
        print(f"  Decision: {details['final_decision']}")
        print()
    
    print("=" * 60)
    print("GOVERNANCE GATE STATISTICS")
    print("=" * 60)
    stats = gate.get_statistics()
    print(json.dumps(stats, indent=2))
    print()
    
    print("=" * 60)
    print("GOVERNANCE GATE STATUS")
    print("=" * 60)
    status = gate.get_status()
    print(json.dumps(status, indent=2))

# Made with Bob
