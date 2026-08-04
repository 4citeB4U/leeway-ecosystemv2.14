"""
SEA Core - Single Execution Authority

This is the main execution spine for the entire Agent Lee ecosystem.
ALL execution flows through this single deterministic loop.

CRITICAL RULES:
1. Only ONE instance may run (enforced by LoopGuard)
2. ALL execution MUST pass through governance
3. Deterministic timing (no busy-waiting)
4. ALL actions MUST be receipted
5. Clean shutdown on KeyboardInterrupt
6. ALL components MUST register with Discovery
"""

import logging
import signal
import sys
import time
from datetime import datetime
from typing import Optional
from pathlib import Path

from .loop_guard import LoopGuard
from .scheduler import Scheduler
from .state_store import StateStore
from .governance_bridge import GovernanceBridge
from .task_router import TaskRouter
from .subsystem_registry import SubsystemRegistry
from .receipts_writer import ReceiptsWriter
from .models.execution_context import ExecutionContext, ExecutionResult

# Import Discovery and Identity
sys.path.insert(0, str(Path(__file__).parent.parent))
from discovery.discovery_enforcement import DiscoveryEnforcement
from identity.identity_core import IdentityCore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SEA:
    """
    Single Execution Authority - The unified execution spine.
    
    This is the ONLY execution loop in the Agent Lee ecosystem.
    All subsystems are wrapped as adapters and executed through SEA.
    
    Architecture:
        Request → Queue → Governance → Router → Adapter → Result → Receipt
    
    Features:
    - Single instance enforcement (LoopGuard)
    - Deterministic scheduling (Scheduler)
    - Inline governance (GovernanceBridge)
    - Request routing (TaskRouter)
    - Subsystem registry (SubsystemRegistry)
    - Complete audit trail (ReceiptsWriter)
    - Runtime state management (StateStore)
    """
    
    def __init__(self, tick_rate: float = 0.01):
        """
        Initialize SEA.
        
        Args:
            tick_rate: Execution loop tick rate in seconds (default: 0.01 = 10ms)
        """
        logger.info("=" * 60)
        logger.info("SEA (Single Execution Authority) Initializing")
        logger.info("=" * 60)
        
        # Initialize Identity Core first
        try:
            self.identity = IdentityCore()
            logger.info(f"Identity loaded: {self.identity.get_agent_id()}")
        except Exception as e:
            logger.error(f"Failed to load Identity Core: {e}")
            self.identity = None
        
        # Initialize Discovery Enforcement
        try:
            self.discovery = DiscoveryEnforcement()
            logger.info("Discovery Enforcement initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Discovery: {e}")
            self.discovery = None
        
        # Core components
        self.loop_guard = LoopGuard()
        self.scheduler = Scheduler(tick_rate)
        self.state = StateStore()
        self.governance = GovernanceBridge()
        self.router = TaskRouter()
        self.registry = SubsystemRegistry()
        self.receipts = ReceiptsWriter()
        
        # Runtime state
        self.running = False
        self.shutdown_requested = False
        
        # Setup signal handlers for clean shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Register SEA with Discovery
        if self.discovery:
            try:
                self.discovery.register_component(
                    component_id="sea-core",
                    component_type="execution_engine",
                    capabilities=[
                        "single_execution_authority",
                        "governance_validation",
                        "receipt_generation",
                        "deterministic_timing",
                        "subsystem_orchestration"
                    ],
                    location="core/sea/sea_core.py",
                    metadata={
                        "tick_rate": tick_rate,
                        "frequency_hz": 1/tick_rate,
                        "governance_available": self.governance.is_available()
                    }
                )
                logger.info("SEA registered with Discovery")
            except Exception as e:
                logger.error(f"Failed to register SEA with Discovery: {e}")
        
        logger.info(f"SEA initialized (tick_rate={tick_rate}s, freq={1/tick_rate:.1f}Hz)")
        logger.info(f"Governance available: {self.governance.is_available()}")
        logger.info(f"Identity available: {self.identity is not None}")
        logger.info(f"Discovery available: {self.discovery is not None}")
    
    def run(self) -> None:
        """
        Run the main SEA execution loop.
        
        This is the single execution spine. It:
        1. Asserts single instance (via LoopGuard)
        2. Pulls requests from queue
        3. Validates through governance
        4. Routes to appropriate adapter
        5. Executes and collects result
        6. Writes receipt
        7. Updates state
        8. Waits for next tick (deterministic)
        
        Runs until shutdown is requested (Ctrl+C or SIGTERM).
        """
        try:
            # Assert single instance
            self.loop_guard.assert_single_instance()
            
            # Update state
            self.state.set_sea_status("starting")
            
            # Write startup receipt
            self.receipts.write_system_event("sea_startup", {
                "started_at": datetime.utcnow().isoformat(),
                "tick_rate": self.scheduler.tick_rate,
                "governance_available": self.governance.is_available()
            })
            
            logger.info("=" * 60)
            logger.info("SEA EXECUTION LOOP STARTED")
            logger.info("=" * 60)
            logger.info("Press Ctrl+C to shutdown gracefully")
            
            self.running = True
            self.state.set_sea_status("running")
            
            # Main execution loop
            while self.running and not self.shutdown_requested:
                try:
                    self._execute_tick()
                except Exception as e:
                    logger.error(f"Error in execution tick: {e}", exc_info=True)
                    self.state.record_error(str(e), {"location": "main_loop"})
                
                # Wait for next tick (deterministic timing)
                self.scheduler.wait_next_tick()
            
            # Clean shutdown
            self._shutdown()
            
        except RuntimeError as e:
            # LoopGuard prevented startup
            logger.error(f"SEA startup failed: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"SEA fatal error: {e}", exc_info=True)
            self._emergency_shutdown()
            sys.exit(1)
    
    def _execute_tick(self) -> None:
        """Execute one tick of the main loop"""
        # Get next request from queue
        ctx = self.state.get_next_request(timeout=0.01)
        
        if ctx is None:
            # No work to do this tick
            return
        
        logger.info(f"Processing request: {ctx.request_id} (type={ctx.task_type}, action={ctx.action})")
        
        # Mark execution started
        ctx.mark_started()
        start_time = time.time()
        
        try:
            # STEP 1: Governance validation (MANDATORY)
            allowed, reason, gov_details = self.governance.validate(ctx)
            self.state.mark_governance_decision(allowed)
            
            if not allowed:
                # Governance rejected - write rejection receipt
                logger.warning(f"Request {ctx.request_id} rejected by governance: {reason}")
                self.receipts.write_rejection(ctx, reason, gov_details)
                return
            
            # Governance approved - write approval receipt
            self.receipts.write_approval(ctx, gov_details)
            
            # STEP 2: Route to adapter
            adapter = self.router.select(ctx)
            
            if adapter is None:
                # No adapter available
                error = f"No adapter available for task_type: {ctx.task_type}"
                logger.error(f"Request {ctx.request_id} failed: {error}")
                ctx.mark_failed(error)
                self.receipts.write_failure(ctx, error)
                self.state.record_error(error, {"request_id": ctx.request_id})
                return
            
            # STEP 3: Execute through adapter
            logger.debug(f"Executing {ctx.request_id} via {adapter.__class__.__name__}")
            
            result = adapter.execute(ctx)
            
            # STEP 4: Process result
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            
            if result.is_success():
                logger.info(
                    f"Request {ctx.request_id} completed successfully "
                    f"(time={execution_time:.1f}ms)"
                )
                ctx.mark_completed(result.output)
            else:
                logger.warning(
                    f"Request {ctx.request_id} failed: {result.error} "
                    f"(time={execution_time:.1f}ms)"
                )
                ctx.mark_failed(result.error or "unknown_error")
            
            # STEP 5: Write execution receipt
            adapter_name = adapter.__class__.__name__
            self.receipts.write_success(ctx, result, adapter_name)
            
            # STEP 6: Update state
            self.state.mark_request_processed(
                ctx.request_id,
                execution_time,
                result.is_success()
            )
            
            # Update registry
            subsystem_name = getattr(adapter, 'subsystem_name', adapter_name)
            self.registry.mark_execution(subsystem_name, result.is_success())
            
        except Exception as e:
            # Execution error
            execution_time = (time.time() - start_time) * 1000
            error_msg = f"Execution error: {str(e)}"
            
            logger.error(f"Request {ctx.request_id} error: {error_msg}", exc_info=True)
            
            ctx.mark_failed(error_msg)
            self.receipts.write_failure(ctx, error_msg, {"exception": type(e).__name__})
            self.state.record_error(error_msg, {"request_id": ctx.request_id})
            self.state.mark_request_processed(ctx.request_id, execution_time, False)
    
    def queue_request(self, ctx: ExecutionContext) -> bool:
        """
        Queue a request for execution.
        
        Args:
            ctx: Execution context to queue
            
        Returns:
            True if queued successfully, False if queue is full
        """
        return self.state.queue_request(ctx)
    
    def get_status(self) -> dict:
        """
        Get current SEA status.
        
        Returns:
            dict with complete status information
        """
        return {
            "running": self.running,
            "state": self.state.get_state_snapshot(),
            "scheduler": self.scheduler.get_metrics(),
            "governance": self.governance.get_stats(),
            "router": self.router.get_stats(),
            "registry": self.registry.get_stats(),
            "receipts": self.receipts.get_stats()
        }
    
    def request_shutdown(self) -> None:
        """Request graceful shutdown"""
        logger.info("Shutdown requested")
        self.shutdown_requested = True
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        signal_name = signal.Signals(signum).name
        logger.info(f"Received signal: {signal_name}")
        self.request_shutdown()
    
    def _shutdown(self) -> None:
        """Perform graceful shutdown"""
        logger.info("=" * 60)
        logger.info("SEA SHUTTING DOWN")
        logger.info("=" * 60)
        
        self.running = False
        self.state.set_sea_status("shutting_down")
        
        # Write final state snapshot
        try:
            snapshot_path = self.state.write_snapshot()
            logger.info(f"Final state snapshot written: {snapshot_path}")
        except Exception as e:
            logger.error(f"Failed to write final snapshot: {e}")
        
        # Write shutdown receipt
        try:
            final_stats = self.get_status()
            self.receipts.write_system_event("sea_shutdown", {
                "shutdown_at": datetime.utcnow().isoformat(),
                "final_stats": final_stats
            })
        except Exception as e:
            logger.error(f"Failed to write shutdown receipt: {e}")
        
        # Release loop guard
        self.loop_guard.release()
        
        logger.info("=" * 60)
        logger.info("SEA SHUTDOWN COMPLETE")
        logger.info("=" * 60)
    
    def _emergency_shutdown(self) -> None:
        """Emergency shutdown on fatal error"""
        logger.error("=" * 60)
        logger.error("SEA EMERGENCY SHUTDOWN")
        logger.error("=" * 60)
        
        self.running = False
        
        try:
            self.loop_guard.release()
        except Exception as e:
            logger.error(f"Failed to release loop guard: {e}")
        
        logger.error("Emergency shutdown complete")
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        return (
            f"SEA("
            f"running={self.running}, "
            f"status={self.state.sea_status}, "
            f"queue_depth={self.state.get_queue_depth()})"
        )


# Convenience function for running SEA
def run_sea(tick_rate: float = 0.01) -> None:
    """
    Run SEA with default configuration.
    
    Args:
        tick_rate: Execution loop tick rate in seconds
    """
    sea = SEA(tick_rate)
    sea.run()


if __name__ == "__main__":
    # Allow running SEA directly
    run_sea()

# Made with Bob
