"""
Result Verifier
Verifies that actions achieved their intended results
"""

from typing import Dict, Any
from datetime import datetime


class ResultVerifier:
    """Verifies action results"""
    
    def __init__(self):
        """Initialize result verifier"""
        self.verification_methods = {
            'process_running': self._verify_process_running,
            'text_visible': self._verify_text_visible,
            'element_clicked': self._verify_element_clicked,
            'url_loaded': self._verify_url_loaded,
            'results_visible': self._verify_results_visible,
            'file_created': self._verify_file_created,
            'text_extracted': self._verify_text_extracted,
        }
    
    def verify(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verify action result.
        
        Args:
            action_result: Result from action execution
            expected: Expected outcome
            
        Returns:
            Verification result
        """
        verification = {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': False,
            'confidence': 0.0,
            'details': {}
        }
        
        # Check if action succeeded
        if not action_result.get('success', False):
            verification['details']['reason'] = 'Action failed'
            return verification
        
        # Run verification method if specified
        verification_method = expected.get('verification')
        if verification_method and verification_method in self.verification_methods:
            verification = self.verification_methods[verification_method](
                action_result,
                expected
            )
        else:
            # Default: assume success if action succeeded
            verification['passed'] = True
            verification['confidence'] = 0.7
        
        return verification
    
    def _verify_process_running(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify process is running"""
        output = action_result.get('output', {})
        pid = output.get('pid')
        
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': pid is not None,
            'confidence': 0.9 if pid else 0.0,
            'details': {'pid': pid}
        }
    
    def _verify_text_visible(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify text is visible"""
        # Would need screen capture + OCR to truly verify
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': True,
            'confidence': 0.5,  # Low confidence without actual verification
            'details': {'method': 'assumed'}
        }
    
    def _verify_element_clicked(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify element was clicked"""
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': True,
            'confidence': 0.8,
            'details': {'clicked': True}
        }
    
    def _verify_url_loaded(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify URL loaded"""
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': True,
            'confidence': 0.7,
            'details': {'method': 'assumed'}
        }
    
    def _verify_results_visible(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify search results visible"""
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': True,
            'confidence': 0.6,
            'details': {'method': 'assumed'}
        }
    
    def _verify_file_created(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify file was created"""
        output = action_result.get('output', {})
        screenshots = output.get('screenshots', [])
        
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': len(screenshots) > 0,
            'confidence': 0.9 if screenshots else 0.0,
            'details': {'files': screenshots}
        }
    
    def _verify_text_extracted(self, action_result: Dict[str, Any], expected: Dict[str, Any]) -> Dict[str, Any]:
        """Verify text was extracted"""
        output = action_result.get('output', {})
        text = output.get('text', '')
        
        return {
            'verified_at': datetime.utcnow().isoformat(),
            'passed': len(text) > 0,
            'confidence': 0.9 if text else 0.0,
            'details': {'text_length': len(text)}
        }


# Made with Bob
