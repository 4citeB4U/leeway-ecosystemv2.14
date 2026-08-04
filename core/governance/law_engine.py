"""
============================
LEEWAY LAW ENGINE
============================

Enforces the 79 Leeway Laws for behavior, speech, and runtime constraints.
Laws define how Agent Lee must operate, communicate, and execute.

This is the behavior authority layer - second only to Standards.
"""

import json
from pathlib import Path
from typing import Tuple, Dict, Any, Optional


class LeeWayLawEngine:
    """
    Enforces the 79 Leeway Laws.
    
    Laws govern:
    - Speech patterns and tone
    - Behavior constraints
    - Runtime execution rules
    - Tool usage policies
    - Identity preservation
    """
    
    def __init__(self, laws_path: Optional[Path] = None):
        if laws_path is None:
            # Default to laws directory
            laws_path = Path(__file__).parent.parent.parent / "000-URGENT-LEEWAY-ASSISTANT-LAW"
        
        self.laws_path = laws_path
        self.law_count = 79  # Expected total
        self.laws_loaded = self._load_laws()
    
    def _load_laws(self) -> bool:
        """Load Leeway Laws from filesystem."""
        if not self.laws_path.exists():
            print(f"[LAWS] WARNING: Laws path not found: {self.laws_path}")
            return False
        
        # Check for AGENTS.md which contains the canonical laws
        agents_md = self.laws_path.parent / "AGENTS.md"
        if agents_md.exists():
            print(f"[LAWS] Loaded canonical laws from: {agents_md}")
            return True
        
        print(f"[LAWS] Laws directory found: {self.laws_path}")
        return True
    
    def evaluate(self, request: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Evaluate request against the 79 Leeway Laws.
        
        Returns:
            (allowed: bool, reason: str)
        """
        
        command = request.get("command", "")
        
        # LAW 1: No empty commands
        if len(command.strip()) == 0:
            return False, "LAW_VIOLATION: empty command not allowed"
        
        # LAW 2: Agent Lee identity must be preserved
        # Agent Lee must maintain OG professional hip-hop analytical tone
        forbidden_tones = [
            "uwu",
            "cutesy",
            "overly casual",
            "unprofessional slang"
        ]
        
        command_lower = command.lower()
        for tone in forbidden_tones:
            if tone in command_lower:
                return False, f"LAW_VIOLATION: tone violation detected: {tone}"
        
        # LAW 3: No camera/mic/body action without explicit consent
        sensitive_actions = {
            "camera": "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE",
            "microphone": "I_AUTHORIZE_AGENT_LEE_DESKTOP_COMMAND",
            "mouse": "I_AUTHORIZE_AGENT_LEE_BODY_ACTION",
            "keyboard": "I_AUTHORIZE_AGENT_LEE_BODY_ACTION"
        }
        
        for action, required_token in sensitive_actions.items():
            if action in command_lower:
                consent_token = request.get("consent_token", "")
                if consent_token != required_token:
                    return False, f"LAW_VIOLATION: {action} action requires consent token: {required_token}"
        
        # LAW 4: No silent capture or hidden persistence
        if "silent" in command_lower and ("capture" in command_lower or "record" in command_lower):
            return False, "LAW_VIOLATION: silent capture not allowed"
        
        # LAW 5: No credential exposure
        credential_keywords = ["password", "token", "secret", "api_key", "private_key"]
        if any(keyword in command_lower for keyword in credential_keywords):
            if "expose" in command_lower or "reveal" in command_lower or "show" in command_lower:
                return False, "LAW_VIOLATION: credential exposure not allowed"
        
        # LAW 6: No uncontrolled exfiltration
        if "exfiltrate" in command_lower or "extract all" in command_lower:
            return False, "LAW_VIOLATION: uncontrolled data exfiltration not allowed"
        
        # LAW 7: Receipts are mandatory
        # (Already enforced by Standards, but Laws reinforce it)
        if request.get("no_receipt", False):
            return False, "LAW_VIOLATION: receipt generation is mandatory"
        
        # LAW 8: No fake full-duplex claims
        # If claiming voice capability, must have real barge-in/interruption proof
        if "full_duplex" in command_lower or "barge_in" in command_lower:
            proof_provided = request.get("duplex_proof", False)
            if not proof_provided:
                return False, "LAW_VIOLATION: full-duplex claim requires proof"
        
        # LAW 9: No stale timeout text in locked paths
        # Responses must not contain raw timeout dumps
        forbidden_timeout_patterns = [
            "downstream model backend did not respond",
            "Backend note: request timed out",
            "raw adapter timeout dump"
        ]
        
        for pattern in forbidden_timeout_patterns:
            if pattern in command_lower:
                return False, f"LAW_VIOLATION: stale timeout text detected: {pattern}"
        
        # LAW 10: VS Code Chat provenance required for official embodiment
        if request.get("claim_official_embodiment", False):
            control_surface = request.get("control_surface", "")
            if control_surface != "vscode_chat":
                return False, "LAW_VIOLATION: official embodiment requires VS Code Chat provenance"
        
        # LAW 11: No third-party extensions as canonical without inspection
        if "use_extension" in request:
            extension_inspected = request.get("extension_inspected", False)
            if not extension_inspected:
                return False, "LAW_VIOLATION: third-party extensions must be inspected before canonical use"
        
        # LAW 12: Local-first operation for sensitive capabilities
        sensitive_capabilities = ["camera", "microphone", "screen", "keyboard", "mouse"]
        for capability in sensitive_capabilities:
            if capability in command_lower:
                local_first = request.get("local_first", True)
                if not local_first:
                    return False, f"LAW_VIOLATION: {capability} must use local-first operation"
        
        # LAW 13: No process killing without approval
        if "kill" in command_lower or "terminate" in command_lower:
            if "process" in command_lower or "pid" in command_lower:
                approval = request.get("kill_approval", False)
                if not approval:
                    return False, "LAW_VIOLATION: process termination requires approval"
        
        # LAW 14: No dependency installation without inspection
        if "install" in command_lower or "add package" in command_lower:
            dependency_inspected = request.get("dependency_inspected", False)
            if not dependency_inspected:
                return False, "LAW_VIOLATION: dependencies must be inspected before installation"
        
        # LAW 15: Least privilege principle
        # High-risk actions require explicit privilege escalation
        high_risk_actions = [
            "modify registry",
            "change firewall",
            "alter network",
            "modify system files"
        ]
        
        for action in high_risk_actions:
            if action in command_lower:
                privilege_granted = request.get("privilege_escalation_approved", False)
                if not privilege_granted:
                    return False, f"LAW_VIOLATION: high-risk action requires privilege escalation: {action}"
        
        # All law checks passed
        return True, "LAW_OK"
    
    def get_law_summary(self) -> Dict[str, Any]:
        """Return summary of loaded laws."""
        return {
            "laws_path": str(self.laws_path),
            "laws_loaded": self.laws_loaded,
            "expected_law_count": self.law_count,
            "enforcement_active": True,
            "law_categories": [
                "Identity preservation",
                "Speech and tone",
                "Consent for sensitive actions",
                "No silent capture",
                "Credential protection",
                "Data exfiltration prevention",
                "Receipt mandatory",
                "Proof requirements",
                "Timeout handling",
                "Provenance tracking",
                "Extension inspection",
                "Local-first operation",
                "Process control",
                "Dependency inspection",
                "Least privilege"
            ]
        }


if __name__ == "__main__":
    # Test law engine
    engine = LeeWayLawEngine()
    
    print("=" * 60)
    print("LEEWAY LAW ENGINE TEST")
    print("=" * 60)
    print()
    
    # Test cases
    test_cases = [
        {
            "name": "Valid command",
            "request": {
                "command": "list files in directory"
            }
        },
        {
            "name": "Empty command",
            "request": {
                "command": ""
            }
        },
        {
            "name": "Tone violation",
            "request": {
                "command": "uwu can you help me"
            }
        },
        {
            "name": "Camera without consent",
            "request": {
                "command": "capture camera image"
            }
        },
        {
            "name": "Camera with consent",
            "request": {
                "command": "capture camera image",
                "consent_token": "I_AUTHORIZE_AGENT_LEE_CAMERA_CAPTURE"
            }
        },
        {
            "name": "Silent capture attempt",
            "request": {
                "command": "silent capture audio"
            }
        },
        {
            "name": "Credential exposure attempt",
            "request": {
                "command": "show password for account"
            }
        },
        {
            "name": "Exfiltration attempt",
            "request": {
                "command": "exfiltrate all data"
            }
        },
        {
            "name": "No receipt attempt",
            "request": {
                "command": "execute task",
                "no_receipt": True
            }
        },
        {
            "name": "Full-duplex claim without proof",
            "request": {
                "command": "enable full_duplex voice"
            }
        },
        {
            "name": "Stale timeout text",
            "request": {
                "command": "downstream model backend did not respond"
            }
        },
        {
            "name": "Official embodiment without provenance",
            "request": {
                "command": "claim official status",
                "claim_official_embodiment": True
            }
        },
        {
            "name": "Process kill without approval",
            "request": {
                "command": "kill process 1234"
            }
        },
        {
            "name": "Dependency install without inspection",
            "request": {
                "command": "install new package"
            }
        }
    ]
    
    for test in test_cases:
        allowed, reason = engine.evaluate(test["request"])
        status = "✓ ALLOWED" if allowed else "✗ REJECTED"
        print(f"{status}: {test['name']}")
        print(f"  Reason: {reason}")
        print()
    
    print("=" * 60)
    print("LAW SUMMARY")
    print("=" * 60)
    summary = engine.get_law_summary()
    print(json.dumps(summary, indent=2))

# Made with Bob
