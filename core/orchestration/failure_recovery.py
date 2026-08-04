"""
Failure Recovery
Handles failures and attempts recovery
"""

from typing import Dict, Any, Optional
from datetime import datetime
import time


class FailureRecovery:
    """Handles failure recovery"""
    
    def __init__(self, max_retries: int = 3):
        """
        Initialize failure recovery.
        
        Args:
            max_retries: Maximum number of retry attempts
        """
        self.max_retries = max_retries
        self.recovery_strategies = {
            'retry_launch': self._retry_simple,
            'retry_typing': self._retry_simple,
            'retry_click': self._retry_simple,
            'retry_navigation': self._retry_with_delay,
            'retry_search': self._retry_with_delay,
            'retry_capture': self._retry_simple,
            'retry_read': self._retry_simple,
        }
    
    def recover(self, failed_action: Dict[str, Any], attempt: int = 1) -> Dict[str, Any]:
        """
        Attempt to recover from failure.
        
        Args:
            failed_action: Failed action details
            attempt: Current attempt number
            
        Returns:
            Recovery result
        """
        recovery_result = {
            'recovered': False,
            'attempt': attempt,
            'strategy': None,
            'recovered_at': None,
            'error': None
        }
        
        if attempt > self.max_retries:
            recovery_result['error'] = 'Max retries exceeded'
            return recovery_result
        
        # Get recovery strategy
        recovery_method = failed_action.get('recovery')
        if recovery_method and recovery_method in self.recovery_strategies:
            recovery_result['strategy'] = recovery_method
            
            try:
                success = self.recovery_strategies[recovery_method](
                    failed_action,
                    attempt
                )
                recovery_result['recovered'] = success
                recovery_result['recovered_at'] = datetime.utcnow().isoformat()
            except Exception as e:
                recovery_result['error'] = str(e)
        else:
            recovery_result['error'] = f'No recovery strategy for: {recovery_method}'
        
        return recovery_result
    
    def _retry_simple(self, action: Dict[str, Any], attempt: int) -> bool:
        """Simple retry with brief delay"""
        time.sleep(0.5 * attempt)  # Increasing delay
        return True  # Indicate ready to retry
    
    def _retry_with_delay(self, action: Dict[str, Any], attempt: int) -> bool:
        """Retry with longer delay"""
        time.sleep(2.0 * attempt)  # Longer increasing delay
        return True  # Indicate ready to retry
    
    def should_retry(self, failed_action: Dict[str, Any], attempt: int) -> bool:
        """Determine if action should be retried"""
        if attempt >= self.max_retries:
            return False
        
        # Check if action has a recovery strategy
        recovery_method = failed_action.get('recovery')
        return recovery_method in self.recovery_strategies
    
    def get_retry_delay(self, attempt: int) -> float:
        """Get delay before retry"""
        return min(2.0 ** attempt, 10.0)  # Exponential backoff, max 10s


# Made with Bob
