"""
Loop Guard - Prevents duplicate SEA instances

This module ensures only ONE SEA instance can run at a time, which is
critical for preventing CPU spikes from competing execution loops.

The guard uses a lock file mechanism with stale lock detection.
"""

import os
import time
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class LoopGuard:
    """
    Prevents duplicate SEA instances from running simultaneously.
    
    Uses a lock file mechanism to ensure single-instance execution.
    Includes stale lock detection to handle crashes gracefully.
    
    Lock File Location: core/sea/.sea_lock
    Stale Threshold: 5 minutes (300 seconds)
    """
    
    LOCK_FILE = Path("core/sea/.sea_lock")
    STALE_THRESHOLD_SECONDS = 300  # 5 minutes
    
    def __init__(self):
        """Initialize loop guard"""
        self.lock_acquired = False
        self.pid = os.getpid()
        
        # Ensure lock directory exists
        self.LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    def assert_single_instance(self) -> None:
        """
        Assert that only one SEA instance is running.
        
        Raises:
            RuntimeError: If another SEA instance is already running
        """
        if self.LOCK_FILE.exists():
            # Check if lock is stale
            lock_age = time.time() - self.LOCK_FILE.stat().st_mtime
            
            if lock_age < self.STALE_THRESHOLD_SECONDS:
                # Lock is fresh - another instance is running
                try:
                    existing_pid = self.LOCK_FILE.read_text().strip()
                    raise RuntimeError(
                        f"SEA already running (PID: {existing_pid}, lock age: {lock_age:.1f}s). "
                        f"Only ONE SEA instance may run at a time. "
                        f"If this is a stale lock, wait {self.STALE_THRESHOLD_SECONDS}s or "
                        f"manually delete: {self.LOCK_FILE}"
                    )
                except (IOError, OSError) as e:
                    raise RuntimeError(
                        f"SEA lock file exists but cannot be read: {e}. "
                        f"Another instance may be running."
                    )
            else:
                # Lock is stale - previous instance crashed
                logger.warning(
                    f"Detected stale SEA lock (age: {lock_age:.1f}s). "
                    f"Previous instance may have crashed. Removing stale lock."
                )
                self._remove_lock()
        
        # Create lock
        self._create_lock()
    
    def _create_lock(self) -> None:
        """Create lock file with current PID"""
        try:
            self.LOCK_FILE.write_text(str(self.pid))
            self.lock_acquired = True
            logger.info(f"SEA lock acquired (PID: {self.pid})")
        except (IOError, OSError) as e:
            raise RuntimeError(f"Failed to create SEA lock file: {e}")
    
    def _remove_lock(self) -> None:
        """Remove lock file"""
        try:
            if self.LOCK_FILE.exists():
                self.LOCK_FILE.unlink()
                logger.info(f"SEA lock removed (PID: {self.pid})")
        except (IOError, OSError) as e:
            logger.error(f"Failed to remove SEA lock file: {e}")
    
    def release(self) -> None:
        """
        Release the lock.
        
        Should be called on clean shutdown.
        """
        if self.lock_acquired:
            self._remove_lock()
            self.lock_acquired = False
    
    def is_locked(self) -> bool:
        """Check if SEA is currently locked (another instance running)"""
        if not self.LOCK_FILE.exists():
            return False
        
        # Check if lock is stale
        lock_age = time.time() - self.LOCK_FILE.stat().st_mtime
        return lock_age < self.STALE_THRESHOLD_SECONDS
    
    def get_lock_info(self) -> Optional[dict]:
        """
        Get information about current lock.
        
        Returns:
            dict with lock info, or None if no lock exists
        """
        if not self.LOCK_FILE.exists():
            return None
        
        try:
            pid = self.LOCK_FILE.read_text().strip()
            lock_age = time.time() - self.LOCK_FILE.stat().st_mtime
            is_stale = lock_age >= self.STALE_THRESHOLD_SECONDS
            
            return {
                "pid": pid,
                "lock_age_seconds": lock_age,
                "is_stale": is_stale,
                "lock_file": str(self.LOCK_FILE)
            }
        except (IOError, OSError) as e:
            logger.error(f"Failed to read lock info: {e}")
            return None
    
    def __enter__(self):
        """Context manager entry"""
        self.assert_single_instance()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - always release lock"""
        self.release()
        return False
    
    def __del__(self):
        """Destructor - ensure lock is released"""
        self.release()


# Convenience function for checking if SEA is running
def is_sea_running() -> bool:
    """
    Check if SEA is currently running.
    
    Returns:
        True if SEA is running, False otherwise
    """
    guard = LoopGuard()
    return guard.is_locked()


# Convenience function for getting lock info
def get_sea_lock_info() -> Optional[dict]:
    """
    Get information about current SEA lock.
    
    Returns:
        dict with lock info, or None if SEA is not running
    """
    guard = LoopGuard()
    return guard.get_lock_info()

# Made with Bob
