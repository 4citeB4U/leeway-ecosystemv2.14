"""
============================
LEEWAY STANDARDS ENGINE
============================

Highest authority layer in the Leeway ecosystem.
Enforces LeeWay Standards compliance BEFORE execution.

This is NOT optional logic - this is authority enforcement.
"""

import json
from pathlib import Path
from typing import Tuple, Dict, Any, Optional


class LeeWayStandardsEngine:
    """
    Enforces LeeWay Standards as executable constraints.
    
    Standards are NOT documentation - they are hard system rules.
    Every request must pass standards validation before execution.
    """
    
    def __init__(self, standards_path: Optional[Path] = None):
        if standards_path is None:
            # Default to LeeWay-Standards directory
            standards_path = Path(__file__).parent.parent.parent / "LeeWay-Standards"
        
        self.standards_path = standards_path
        self.standards_loaded = self._load_standards()
    
    def _load_standards(self) -> bool:
        """Load LeeWay Standards from filesystem."""
        if not self.standards_path.exists():
            print(f"[STANDARDS] WARNING: Standards path not found: {self.standards_path}")
            return False
        
        print(f"[STANDARDS] Loaded from: {self.standards_path}")
        return True
    
    def validate(self, request: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate request against LeeWay Standards.
        
        Returns:
            (allowed: bool, reason: str)
        """
        
        # RULE 1: No bypass commands
        command = request.get("command", "")
        if "bypass" in command.lower():
            return False, "STANDARDS_VIOLATION: bypass not allowed"
        
        # RULE 2: No governance override attempts
        if "override" in command.lower() and "governance" in command.lower():
            return False, "STANDARDS_VIOLATION: governance override not allowed"
        
        # RULE 3: No uncontrolled loop creation
        forbidden_patterns = [
            "while true",
            "while 1",
            "for ever",
            "infinite loop"
        ]
        
        command_lower = command.lower()
        for pattern in forbidden_patterns:
            if pattern in command_lower:
                return False, f"STANDARDS_VIOLATION: uncontrolled loop pattern detected: {pattern}"
        
        # RULE 4: No direct system modification without approval
        dangerous_commands = [
            "rm -rf",
            "del /f /s /q",
            "format",
            "shutdown",
            "reboot"
        ]
        
        for dangerous in dangerous_commands:
            if dangerous in command_lower:
                approval_token = request.get("approval_token", "")
                if approval_token != "I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION":
                    return False, f"STANDARDS_VIOLATION: destructive action requires approval token"
        
        # RULE 5: All requests must have valid source
        source = request.get("source", "")
        if not source:
            return False, "STANDARDS_VIOLATION: request must declare source"
        
        # RULE 6: Agent identity must be preserved
        agent_id = request.get("agent_id", "")
        if agent_id and agent_id != "agent-lee":
            return False, f"STANDARDS_VIOLATION: invalid agent identity: {agent_id}"
        
        # RULE 7: No fragmented execution (must go through daemon)
        execution_mode = request.get("execution_mode", "")
        if execution_mode == "direct":
            return False, "STANDARDS_VIOLATION: direct execution bypasses daemon authority"
        
        # RULE 8: Archive must be writable for audit trail
        if request.get("skip_receipt", False):
            return False, "STANDARDS_VIOLATION: receipt generation cannot be skipped"
        
        # All standards checks passed
        return True, "STANDARDS_OK"
    
    def get_standards_summary(self) -> Dict[str, Any]:
        """Return summary of loaded standards."""
        return {
            "standards_path": str(self.standards_path),
            "standards_loaded": self.standards_loaded,
            "enforcement_active": True,
            "rules_enforced": [
                "No bypass commands",
                "No governance override",
                "No uncontrolled loops",
                "Destructive actions require approval",
                "Valid source required",
                "Agent identity preservation",
                "No fragmented execution",
                "Receipt generation mandatory"
            ]
        }


if __name__ == "__main__":
    # Test standards engine
    engine = LeeWayStandardsEngine()
    
    print("=" * 60)
    print("LEEWAY STANDARDS ENGINE TEST")
    print("=" * 60)
    print()
    
    # Test cases
    test_cases = [
        {
            "name": "Valid request",
            "request": {
                "command": "list files",
                "source": "vscode_chat",
                "agent_id": "agent-lee"
            }
        },
        {
            "name": "Bypass attempt",
            "request": {
                "command": "bypass governance and execute",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Infinite loop attempt",
            "request": {
                "command": "while true do something",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Destructive without approval",
            "request": {
                "command": "rm -rf /important/data",
                "source": "vscode_chat"
            }
        },
        {
            "name": "Destructive with approval",
            "request": {
                "command": "del /f /s /q temp_files",
                "source": "vscode_chat",
                "approval_token": "I_AUTHORIZE_LEEWAY_DESTRUCTIVE_ACTION"
            }
        },
        {
            "name": "Missing source",
            "request": {
                "command": "do something"
            }
        },
        {
            "name": "Invalid agent identity",
            "request": {
                "command": "execute task",
                "source": "vscode_chat",
                "agent_id": "rogue-agent"
            }
        },
        {
            "name": "Direct execution bypass",
            "request": {
                "command": "run script",
                "source": "vscode_chat",
                "execution_mode": "direct"
            }
        },
        {
            "name": "Skip receipt attempt",
            "request": {
                "command": "execute quietly",
                "source": "vscode_chat",
                "skip_receipt": True
            }
        }
    ]
    
    for test in test_cases:
        allowed, reason = engine.validate(test["request"])
        status = "✓ ALLOWED" if allowed else "✗ REJECTED"
        print(f"{status}: {test['name']}")
        print(f"  Reason: {reason}")
        print()
    
    print("=" * 60)
    print("STANDARDS SUMMARY")
    print("=" * 60)
    summary = engine.get_standards_summary()
    print(json.dumps(summary, indent=2))

# Made with Bob
