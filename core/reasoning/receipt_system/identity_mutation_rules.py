"""
Identity Mutation Rules

Defines how learning changes Agent Lee's identity and behavior.
CRITICAL: All mutations must preserve immutable laws from Identity Core.
"""

from typing import Dict, List, Any
from datetime import datetime
import json
import sys
from pathlib import Path

# Import Identity Core for law enforcement
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from identity.identity_core import IdentityCore, IdentityCoreError


class IdentityMutationRules:
    """
    Manages identity mutations based on learning.
    
    CRITICAL: All mutations are validated against Identity Core immutable laws.
    """
    
    def __init__(self, identity_manifest_path: str = "Archive/manifests/identity"):
        self.identity_path = Path(identity_manifest_path)
        self.identity_path.mkdir(parents=True, exist_ok=True)
        self.manifest_file = self.identity_path / "agent-lee-identity.manifest.json"
        
        # Load Identity Core for law enforcement
        try:
            self.identity_core = IdentityCore()
            print(f"[9E] Identity Core loaded for mutation validation")
            print(f"[9E] Enforcing {len(self.identity_core.get_immutable_laws())} immutable laws")
        except Exception as e:
            print(f"[9E] WARNING: Identity Core not available: {e}")
            self.identity_core = None
    
    def apply_learning(
        self,
        learning_rule: Dict[str, Any],
        current_identity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply learning rule to identity.
        
        Args:
            learning_rule: Compiled learning rule
            current_identity: Current identity manifest
            
        Returns:
            Updated identity manifest
        """
        mutation_type = self._determine_mutation_type(learning_rule)
        
        if mutation_type == "capability_enhancement":
            return self._enhance_capability(learning_rule, current_identity)
        elif mutation_type == "behavior_adjustment":
            return self._adjust_behavior(learning_rule, current_identity)
        elif mutation_type == "constraint_modification":
            return self._modify_constraint(learning_rule, current_identity)
        else:
            return current_identity
    
    def validate_mutation(
        self,
        proposed_identity: Dict[str, Any],
        current_identity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate proposed identity mutation against immutable laws.
        
        CRITICAL: Uses Identity Core to enforce immutable laws.
        
        Args:
            proposed_identity: Proposed new identity
            current_identity: Current identity
            
        Returns:
            Validation result with approval status
        """
        violations = []
        
        # CRITICAL: Validate against Identity Core immutable laws
        if self.identity_core:
            try:
                # Check if mutation preserves immutable laws
                if not self.identity_core.validate_identity_mutation(proposed_identity):
                    violations.append("immutable_law_violation")
                    print("[9E] REJECTED: Mutation violates immutable laws")
                
                # Check if mutation can evolve this aspect
                for aspect in proposed_identity.keys():
                    if not self.identity_core.can_evolve_aspect(aspect):
                        violations.append(f"immutable_aspect_violation: {aspect}")
                        print(f"[9E] REJECTED: Cannot mutate immutable aspect: {aspect}")
                        
            except Exception as e:
                violations.append(f"identity_core_validation_error: {e}")
                print(f"[9E] ERROR: Identity Core validation failed: {e}")
        else:
            print("[9E] WARNING: Identity Core not available, skipping immutable law validation")
        
        # Check core identity preservation (legacy validation)
        if not self._preserves_core_identity(proposed_identity, current_identity):
            violations.append("core_identity_violation")
        
        # Check authority preservation (legacy validation)
        if not self._preserves_authority(proposed_identity, current_identity):
            violations.append("authority_violation")
        
        # Check capability bounds (legacy validation)
        if not self._within_capability_bounds(proposed_identity):
            violations.append("capability_bounds_violation")
        
        approved = len(violations) == 0
        
        if approved:
            print("[9E] APPROVED: Identity mutation preserves all immutable laws")
        else:
            print(f"[9E] REJECTED: Identity mutation has {len(violations)} violations")
        
        return {
            "valid": approved,
            "violations": violations,
            "approved": approved,
            "validated_at": datetime.utcnow().isoformat(),
            "immutable_laws_enforced": self.identity_core is not None,
            "identity_core_available": self.identity_core is not None
        }
    
    def persist_mutation(
        self,
        new_identity: Dict[str, Any],
        learning_rule: Dict[str, Any]
    ) -> str:
        """
        Persist identity mutation to manifest.
        
        Args:
            new_identity: New identity manifest
            learning_rule: Learning rule that caused mutation
            
        Returns:
            Path to persisted manifest
        """
        # Add mutation metadata
        new_identity["last_mutation"] = {
            "mutated_at": datetime.utcnow().isoformat(),
            "learning_id": learning_rule.get("learning_id"),
            "mutation_type": self._determine_mutation_type(learning_rule),
            "version": new_identity.get("version", "1.0.0")
        }
        
        # Increment version
        new_identity["version"] = self._increment_version(
            new_identity.get("version", "1.0.0")
        )
        
        # Write manifest
        with open(self.manifest_file, 'w', encoding='utf-8') as f:
            json.dump(new_identity, f, indent=2, ensure_ascii=False)
        
        return str(self.manifest_file)
    
    def _determine_mutation_type(self, learning_rule: Dict[str, Any]) -> str:
        """Determine type of identity mutation"""
        rule_type = learning_rule.get("type", "")
        
        if "optimization" in rule_type:
            return "capability_enhancement"
        elif "improvement" in rule_type:
            return "behavior_adjustment"
        elif "prevention" in rule_type:
            return "constraint_modification"
        else:
            return "unknown"
    
    def _enhance_capability(
        self,
        learning_rule: Dict[str, Any],
        identity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhance capability based on learning"""
        capabilities = identity.get("capabilities", [])
        
        # Add new capability or enhance existing
        rule_action = learning_rule.get("rule", {}).get("action", "")
        
        if rule_action not in capabilities:
            capabilities.append(rule_action)
        
        identity["capabilities"] = capabilities
        return identity
    
    def _adjust_behavior(
        self,
        learning_rule: Dict[str, Any],
        identity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Adjust behavior based on learning"""
        behaviors = identity.get("behaviors", {})
        
        rule_action = learning_rule.get("rule", {}).get("action", "")
        rule_priority = learning_rule.get("priority", "medium")
        
        behaviors[rule_action] = {
            "priority": rule_priority,
            "learned_at": datetime.utcnow().isoformat()
        }
        
        identity["behaviors"] = behaviors
        return identity
    
    def _modify_constraint(
        self,
        learning_rule: Dict[str, Any],
        identity: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Modify constraints based on learning"""
        constraints = identity.get("constraints", [])
        
        rule_target = learning_rule.get("rule", {}).get("target", "")
        
        # Add constraint to prevent learned failure
        constraint = f"prevent_{rule_target}"
        if constraint not in constraints:
            constraints.append(constraint)
        
        identity["constraints"] = constraints
        return identity
    
    def _preserves_core_identity(
        self,
        proposed: Dict[str, Any],
        current: Dict[str, Any]
    ) -> bool:
        """Check if core identity is preserved"""
        core_fields = ["agentId", "agentMode", "role", "canonicalFingerprint"]
        
        for field in core_fields:
            if proposed.get(field) != current.get(field):
                return False
        
        return True
    
    def _preserves_authority(
        self,
        proposed: Dict[str, Any],
        current: Dict[str, Any]
    ) -> bool:
        """Check if authority is preserved"""
        return proposed.get("authorityOwner") == current.get("authorityOwner")
    
    def _within_capability_bounds(self, proposed: Dict[str, Any]) -> bool:
        """Check if capabilities are within bounds"""
        capabilities = proposed.get("capabilities", [])
        
        # Maximum capability count
        if len(capabilities) > 100:
            return False
        
        # Check for forbidden capabilities
        forbidden = ["unrestricted_access", "bypass_governance"]
        for cap in capabilities:
            if cap in forbidden:
                return False
        
        return True
    
    def _increment_version(self, version: str) -> str:
        """Increment semantic version"""
        try:
            parts = version.split(".")
            major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
            patch += 1
            return f"{major}.{minor}.{patch}"
        except Exception:
            return "1.0.1"

# Made with Bob
