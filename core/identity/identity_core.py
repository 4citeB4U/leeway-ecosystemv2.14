"""
Identity Core Layer
Loads and enforces Agent Lee's immutable laws and core identity.

This layer defines WHO Agent Lee is at the deepest level.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class IdentityCore:
    """
    Agent Lee's Identity Core.
    
    Loads immutable laws, values, mission, authority model, and behavioral constraints.
    Enforces identity preservation during evolution.
    """
    
    def __init__(self, manifest_path: str = "Archive/manifests/identity/agent-lee-identity-core.manifest.json"):
        """Initialize Identity Core"""
        self.manifest_path = Path(manifest_path)
        self.identity = self._load_identity()
        
        logger.info("Identity Core initialized")
        logger.info(f"Agent ID: {self.identity['agent_id']}")
        logger.info(f"Canonical Fingerprint: {self.identity['canonical_fingerprint']}")
        logger.info(f"Authority Owner: {self.identity['authority_owner']}")
        logger.info(f"Immutable Laws: {len(self.identity['immutable_laws']['laws'])}")
    
    def _load_identity(self) -> Dict[str, Any]:
        """Load identity manifest"""
        if not self.manifest_path.exists():
            raise IdentityCoreError(
                f"Identity manifest not found: {self.manifest_path}. "
                f"Agent Lee cannot operate without core identity."
            )
        
        with open(self.manifest_path, 'r', encoding='utf-8') as f:
            identity = json.load(f)
        
        # Validate required fields
        required_fields = [
            'agent_id', 'canonical_fingerprint', 'authority_owner',
            'immutable_laws', 'value_system', 'mission_model', 'authority_model'
        ]
        
        for field in required_fields:
            if field not in identity:
                raise IdentityCoreError(
                    f"Identity manifest missing required field: {field}"
                )
        
        return identity
    
    def get_agent_id(self) -> str:
        """Get agent ID"""
        return self.identity['agent_id']
    
    def get_canonical_fingerprint(self) -> str:
        """Get canonical fingerprint"""
        return self.identity['canonical_fingerprint']
    
    def get_authority_owner(self) -> str:
        """Get authority owner"""
        return self.identity['authority_owner']
    
    def get_immutable_laws(self) -> List[Dict[str, Any]]:
        """Get all immutable laws"""
        return self.identity['immutable_laws']['laws']
    
    def get_law(self, law_id: str) -> Optional[Dict[str, Any]]:
        """Get specific immutable law"""
        for law in self.identity['immutable_laws']['laws']:
            if law['law_id'] == law_id:
                return law
        return None
    
    def validate_law_compliance(self, action: str, context: Dict[str, Any]) -> bool:
        """
        Validate that an action complies with immutable laws.
        
        Args:
            action: Action being validated
            context: Action context (component_id, capability, etc.)
            
        Returns:
            True if compliant, False otherwise
        """
        # L3: Governance Compliance
        if 'governance_validated' not in context or not context['governance_validated']:
            logger.error(f"Law L3 violation: Action not validated against governance: {action}")
            return False
        
        # L4: Receipt Mandate
        if 'receipt_path' not in context:
            logger.warning(f"Law L4 warning: No receipt path provided for action: {action}")
        
        # L5: Discovery Authority
        if 'component_id' in context:
            if 'discovery_registered' not in context or not context['discovery_registered']:
                logger.error(f"Law L5 violation: Component not registered with Discovery: {context['component_id']}")
                return False
        
        # L6: Consent Requirement
        consent_required_actions = ['camera_capture', 'microphone_capture', 'destructive_action', 'body_control']
        if action in consent_required_actions:
            if 'consent_token' not in context or not context['consent_token']:
                logger.error(f"Law L6 violation: No consent token for action: {action}")
                return False
        
        logger.debug(f"Law compliance validated for action: {action}")
        return True
    
    def get_values(self) -> List[Dict[str, Any]]:
        """Get all core values"""
        return self.identity['value_system']['values']
    
    def get_value(self, value_id: str) -> Optional[Dict[str, Any]]:
        """Get specific value"""
        for value in self.identity['value_system']['values']:
            if value['value_id'] == value_id:
                return value
        return None
    
    def get_mission(self) -> Dict[str, Any]:
        """Get mission model"""
        return self.identity['mission_model']
    
    def get_authority_hierarchy(self) -> List[Dict[str, Any]]:
        """Get authority hierarchy"""
        return self.identity['authority_model']['authority_hierarchy']
    
    def validate_authority(self, actor: str, action: str) -> bool:
        """
        Validate that an actor has authority for an action.
        
        Args:
            actor: Actor requesting action (Creator, Agent Lee, User)
            action: Action being requested
            
        Returns:
            True if authorized, False otherwise
        """
        for level in self.identity['authority_model']['authority_hierarchy']:
            if level['holder'] == actor or level['role'] == actor:
                # Creator has all permissions
                if 'all' in level['permissions']:
                    return True
                
                # Check specific permission
                if action in level['permissions']:
                    return True
        
        logger.error(f"Authority validation failed: {actor} -> {action}")
        return False
    
    def get_behavioral_laws(self) -> List[Dict[str, Any]]:
        """Get behavioral laws"""
        return self.identity['behavioral_laws']['laws']
    
    def validate_behavioral_law(self, behavior_id: str, context: Dict[str, Any]) -> bool:
        """
        Validate compliance with a behavioral law.
        
        Args:
            behavior_id: Behavioral law ID (B1, B2, etc.)
            context: Behavior context
            
        Returns:
            True if compliant, False otherwise
        """
        for law in self.identity['behavioral_laws']['laws']:
            if law['behavior_id'] == behavior_id:
                # B1: No Silent Capture
                if behavior_id == 'B1':
                    if 'user_aware' not in context or not context['user_aware']:
                        logger.error(f"Behavioral law {behavior_id} violation: User not aware of capture")
                        return False
                
                # B2: No Credential Exposure
                if behavior_id == 'B2':
                    if 'contains_credentials' in context and context['contains_credentials']:
                        logger.error(f"Behavioral law {behavior_id} violation: Credentials in output")
                        return False
                
                # B3: Bounded Actions
                if behavior_id == 'B3':
                    if 'scope_defined' not in context or not context['scope_defined']:
                        logger.error(f"Behavioral law {behavior_id} violation: Action scope not defined")
                        return False
                
                return True
        
        logger.warning(f"Behavioral law not found: {behavior_id}")
        return True
    
    def can_evolve_aspect(self, aspect: str) -> bool:
        """
        Check if an aspect can evolve through learning.
        
        Args:
            aspect: Aspect to check (e.g., 'communication_style', 'immutable_laws')
            
        Returns:
            True if mutable, False if immutable
        """
        mutable = self.identity['evolution_boundaries']['mutable_aspects']
        immutable = self.identity['evolution_boundaries']['immutable_aspects']
        
        if aspect in immutable:
            logger.warning(f"Evolution blocked: {aspect} is immutable")
            return False
        
        if aspect in mutable:
            logger.debug(f"Evolution allowed: {aspect} is mutable")
            return True
        
        # Default to immutable for safety
        logger.warning(f"Evolution blocked: {aspect} not in mutable list (default immutable)")
        return False
    
    def validate_identity_mutation(self, mutation: Dict[str, Any]) -> bool:
        """
        Validate that an identity mutation preserves immutable laws.
        
        Args:
            mutation: Proposed identity mutation
            
        Returns:
            True if mutation is valid, False otherwise
        """
        # Check if mutation affects immutable aspects
        for aspect in self.identity['evolution_boundaries']['immutable_aspects']:
            if aspect in mutation:
                logger.error(f"Identity mutation rejected: Cannot mutate immutable aspect: {aspect}")
                return False
        
        # Validate that core identity fields are preserved
        if 'agent_id' in mutation and mutation['agent_id'] != self.identity['agent_id']:
            logger.error("Identity mutation rejected: Cannot change agent_id")
            return False
        
        if 'canonical_fingerprint' in mutation and mutation['canonical_fingerprint'] != self.identity['canonical_fingerprint']:
            logger.error("Identity mutation rejected: Cannot change canonical_fingerprint")
            return False
        
        if 'authority_owner' in mutation and mutation['authority_owner'] != self.identity['authority_owner']:
            logger.error("Identity mutation rejected: Cannot change authority_owner")
            return False
        
        logger.info("Identity mutation validated: Preserves immutable laws")
        return True
    
    def get_persistence_rules(self) -> Dict[str, Any]:
        """Get persistence rules"""
        return self.identity['persistence_rules']
    
    def get_identity_summary(self) -> Dict[str, Any]:
        """Get identity summary for logging/reporting"""
        return {
            "agent_id": self.identity['agent_id'],
            "canonical_fingerprint": self.identity['canonical_fingerprint'],
            "authority_owner": self.identity['authority_owner'],
            "version": self.identity['version'],
            "immutable_laws_count": len(self.identity['immutable_laws']['laws']),
            "values_count": len(self.identity['value_system']['values']),
            "behavioral_laws_count": len(self.identity['behavioral_laws']['laws']),
            "manifest_path": str(self.manifest_path)
        }


class IdentityCoreError(Exception):
    """Raised when Identity Core encounters an error"""
    pass


# Made with Bob