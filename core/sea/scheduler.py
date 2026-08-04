"""
Scheduler - Deterministic timing control for SEA

This module provides precise timing control for the SEA execution loop,
preventing busy-waiting and ensuring predictable CPU usage.

Key Features:
- Fixed tick rate (default 100 Hz = 0.01s)
- Drift compensation
- Performance metrics
- No busy waiting
"""

import time
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class Scheduler:
    """
    Deterministic scheduler for SEA execution loop.
    
    Provides precise timing control with drift compensation to ensure
    consistent execution cadence without busy-waiting.
    
    Default tick rate: 100 Hz (0.01 seconds = 10ms)
    """
    
    # Default tick rate: 100 Hz (10ms per tick)
    DEFAULT_TICK_RATE = 0.01
    
    def __init__(self, tick_rate: float = DEFAULT_TICK_RATE):
        """
        Initialize scheduler.
        
        Args:
            tick_rate: Time between ticks in seconds (default: 0.01 = 10ms)
        """
        if tick_rate <= 0:
            raise ValueError("tick_rate must be positive")
        
        self.tick_rate = tick_rate
        self.last_tick = time.time()
        self.tick_count = 0
        self.drift_total = 0.0
        self.max_drift = 0.0
        self.started_at = time.time()
        
        logger.info(f"Scheduler initialized (tick_rate={tick_rate}s, freq={1/tick_rate:.1f}Hz)")
    
    def wait_next_tick(self) -> None:
        """
        Wait until next tick time.
        
        Uses sleep() to avoid busy-waiting. Tracks drift for monitoring.
        """
        now = time.time()
        elapsed = now - self.last_tick
        
        if elapsed < self.tick_rate:
            # We're ahead of schedule - sleep until next tick
            sleep_time = self.tick_rate - elapsed
            time.sleep(sleep_time)
        else:
            # We're behind schedule - track drift
            drift = elapsed - self.tick_rate
            self.drift_total += drift
            self.max_drift = max(self.max_drift, drift)
            
            if drift > self.tick_rate * 2:
                # Significant drift - log warning
                logger.warning(
                    f"Scheduler drift detected: {drift*1000:.1f}ms "
                    f"(expected {self.tick_rate*1000:.1f}ms)"
                )
        
        self.last_tick = time.time()
        self.tick_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get scheduler performance metrics.
        
        Returns:
            dict containing:
                - tick_count: Total number of ticks
                - uptime_seconds: Total runtime
                - avg_drift_ms: Average drift in milliseconds
                - max_drift_ms: Maximum drift in milliseconds
                - tick_rate_hz: Configured tick rate in Hz
                - actual_rate_hz: Actual measured tick rate
        """
        uptime = time.time() - self.started_at
        avg_drift = (self.drift_total / self.tick_count) if self.tick_count > 0 else 0
        actual_rate = self.tick_count / uptime if uptime > 0 else 0
        
        return {
            "tick_count": self.tick_count,
            "uptime_seconds": uptime,
            "avg_drift_ms": avg_drift * 1000,
            "max_drift_ms": self.max_drift * 1000,
            "tick_rate_hz": 1 / self.tick_rate,
            "actual_rate_hz": actual_rate,
            "drift_percentage": (avg_drift / self.tick_rate * 100) if self.tick_rate > 0 else 0
        }
    
    def reset_metrics(self) -> None:
        """Reset performance metrics"""
        self.tick_count = 0
        self.drift_total = 0.0
        self.max_drift = 0.0
        self.started_at = time.time()
        self.last_tick = time.time()
        logger.info("Scheduler metrics reset")
    
    def get_tick_rate_ms(self) -> float:
        """Get tick rate in milliseconds"""
        return self.tick_rate * 1000
    
    def get_tick_rate_hz(self) -> float:
        """Get tick rate in Hz (ticks per second)"""
        return 1 / self.tick_rate
    
    def is_healthy(self) -> bool:
        """
        Check if scheduler is operating within healthy parameters.
        
        Returns:
            True if average drift is less than 50% of tick rate
        """
        metrics = self.get_metrics()
        drift_threshold = self.tick_rate * 0.5  # 50% of tick rate
        return metrics["avg_drift_ms"] / 1000 < drift_threshold
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        metrics = self.get_metrics()
        return (
            f"Scheduler("
            f"rate={self.get_tick_rate_hz():.1f}Hz, "
            f"ticks={metrics['tick_count']}, "
            f"drift={metrics['avg_drift_ms']:.2f}ms)"
        )


class AdaptiveScheduler(Scheduler):
    """
    Adaptive scheduler that adjusts tick rate based on load.
    
    Extends base Scheduler with dynamic tick rate adjustment to
    optimize CPU usage under varying load conditions.
    """
    
    def __init__(
        self,
        min_tick_rate: float = 0.001,  # 1ms minimum (1000 Hz max)
        max_tick_rate: float = 0.1,    # 100ms maximum (10 Hz min)
        initial_tick_rate: float = Scheduler.DEFAULT_TICK_RATE
    ):
        """
        Initialize adaptive scheduler.
        
        Args:
            min_tick_rate: Minimum tick rate (fastest)
            max_tick_rate: Maximum tick rate (slowest)
            initial_tick_rate: Starting tick rate
        """
        super().__init__(initial_tick_rate)
        self.min_tick_rate = min_tick_rate
        self.max_tick_rate = max_tick_rate
        self.idle_ticks = 0
        self.busy_ticks = 0
        
        logger.info(
            f"Adaptive scheduler initialized "
            f"(range: {1/max_tick_rate:.1f}-{1/min_tick_rate:.1f}Hz)"
        )
    
    def mark_idle(self) -> None:
        """Mark current tick as idle (no work done)"""
        self.idle_ticks += 1
        self._adjust_tick_rate()
    
    def mark_busy(self) -> None:
        """Mark current tick as busy (work done)"""
        self.busy_ticks += 1
        self._adjust_tick_rate()
    
    def _adjust_tick_rate(self) -> None:
        """Adjust tick rate based on idle/busy ratio"""
        total_ticks = self.idle_ticks + self.busy_ticks
        
        if total_ticks < 100:
            # Not enough data yet
            return
        
        idle_ratio = self.idle_ticks / total_ticks
        
        if idle_ratio > 0.9:
            # Mostly idle - slow down
            new_rate = min(self.tick_rate * 1.1, self.max_tick_rate)
            if new_rate != self.tick_rate:
                logger.debug(f"Slowing down: {self.tick_rate:.4f}s -> {new_rate:.4f}s")
                self.tick_rate = new_rate
        elif idle_ratio < 0.5:
            # Mostly busy - speed up
            new_rate = max(self.tick_rate * 0.9, self.min_tick_rate)
            if new_rate != self.tick_rate:
                logger.debug(f"Speeding up: {self.tick_rate:.4f}s -> {new_rate:.4f}s")
                self.tick_rate = new_rate
        
        # Reset counters periodically
        if total_ticks >= 1000:
            self.idle_ticks = 0
            self.busy_ticks = 0
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get metrics including adaptive scheduler stats"""
        metrics = super().get_metrics()
        total_ticks = self.idle_ticks + self.busy_ticks
        
        metrics.update({
            "idle_ticks": self.idle_ticks,
            "busy_ticks": self.busy_ticks,
            "idle_ratio": self.idle_ticks / total_ticks if total_ticks > 0 else 0,
            "current_tick_rate_ms": self.tick_rate * 1000,
            "min_tick_rate_hz": 1 / self.max_tick_rate,
            "max_tick_rate_hz": 1 / self.min_tick_rate
        })
        
        return metrics

# Made with Bob
