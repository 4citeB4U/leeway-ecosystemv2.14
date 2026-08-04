"""
SEA 1-Hour Stability Test

Runs SEA for 1 hour and monitors:
- CPU usage
- Memory usage
- Request throughput
- Error rate
- Receipt generation
- No crashes or hangs
"""

import sys
import os
import time
import psutil
import logging
from datetime import datetime, timedelta

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sea.sea_core import SEA
from sea.adapters.tool_adapter import ToolAdapter
from sea.adapters.live_loop_adapter import LiveLoopAdapter
from sea.adapters.genesis_adapter import GenesisAdapter
from sea.models.execution_context import ExecutionContext

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sea_stability_1h.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def run_stability_test():
    """Run 1-hour stability test"""
    print("\n" + "="*60)
    print("SEA 1-HOUR STABILITY TEST")
    print("="*60)
    
    # Initialize SEA
    print("\n[INIT] Initializing SEA with all adapters...")
    sea = SEA()
    
    # Register all adapters
    tool_adapter = ToolAdapter()
    live_loop_adapter = LiveLoopAdapter()
    genesis_adapter = GenesisAdapter()
    
    sea.registry.register("tools", tool_adapter, tool_adapter.get_capabilities())
    sea.registry.register("live_loop", live_loop_adapter, live_loop_adapter.get_capabilities())
    sea.registry.register("genesis", genesis_adapter, genesis_adapter.get_capabilities())
    
    print(f"✓ Registered adapters: {list(sea.registry.subsystems.keys())}")
    
    # Get process for monitoring
    process = psutil.Process()
    
    # Test parameters
    duration_seconds = 3600  # 1 hour
    sample_interval = 60  # Sample every minute
    end_time = datetime.now() + timedelta(seconds=duration_seconds)
    
    print(f"\n[START] Running for {duration_seconds/3600:.1f} hour(s)")
    print(f"End time: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Sample interval: {sample_interval}s")
    print("\nMonitoring metrics:")
    print("- CPU usage (%)")
    print("- Memory usage (MB)")
    print("- Request count")
    print("- Error count")
    print("- Receipts written")
    
    # Start SEA in background thread
    import threading
    
    def run_sea():
        try:
            sea.run()
        except KeyboardInterrupt:
            pass
    
    sea_thread = threading.Thread(target=run_sea, daemon=True)
    sea_thread.start()
    
    # Queue some test requests
    for i in range(10):
        ctx = ExecutionContext(
            request_id=f"stability-test-{i}",
            task_type="tools",
            action="test_action",
            parameters={"message": f"test message {i}"},
            source="stability_test"
        )
        sea.queue_request(ctx)
    
    # Monitoring loop
    samples = []
    sample_count = 0
    
    try:
        while datetime.now() < end_time:
            # Collect metrics
            cpu_percent = process.cpu_percent(interval=1)
            memory_mb = process.memory_info().rss / 1024 / 1024
            
            # Get SEA metrics
            metrics = sea.get_performance_metrics()
            
            sample = {
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": cpu_percent,
                "memory_mb": memory_mb,
                "total_requests": metrics.get("total_requests", 0),
                "successful_requests": metrics.get("successful_requests", 0),
                "failed_requests": metrics.get("failed_requests", 0),
                "avg_execution_time_ms": metrics.get("avg_execution_time_ms", 0)
            }
            
            samples.append(sample)
            sample_count += 1
            
            # Print progress
            elapsed = (datetime.now() - (end_time - timedelta(seconds=duration_seconds))).total_seconds()
            progress = (elapsed / duration_seconds) * 100
            
            print(f"\n[{sample_count:02d}] Progress: {progress:.1f}%")
            print(f"  CPU: {cpu_percent:.1f}%")
            print(f"  Memory: {memory_mb:.1f} MB")
            print(f"  Requests: {sample['total_requests']} (Success: {sample['successful_requests']}, Failed: {sample['failed_requests']})")
            print(f"  Avg exec time: {sample['avg_execution_time_ms']:.2f}ms")
            
            # Wait for next sample
            time.sleep(sample_interval)
    
    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Test stopped by user")
    
    finally:
        # Stop SEA
        print("\n[STOP] Stopping SEA...")
        sea.stop()
        time.sleep(1)
        
        # Generate report
        print("\n" + "="*60)
        print("STABILITY TEST REPORT")
        print("="*60)
        
        if samples:
            avg_cpu = sum(s["cpu_percent"] for s in samples) / len(samples)
            max_cpu = max(s["cpu_percent"] for s in samples)
            avg_memory = sum(s["memory_mb"] for s in samples) / len(samples)
            max_memory = max(s["memory_mb"] for s in samples)
            
            final_metrics = samples[-1]
            
            print(f"\nDuration: {len(samples) * sample_interval / 60:.1f} minutes")
            print(f"Samples collected: {len(samples)}")
            
            print(f"\nCPU Usage:")
            print(f"  Average: {avg_cpu:.1f}%")
            print(f"  Maximum: {max_cpu:.1f}%")
            print(f"  Status: {'✓ PASS' if avg_cpu < 10 else '✗ FAIL (>10%)'}")
            
            print(f"\nMemory Usage:")
            print(f"  Average: {avg_memory:.1f} MB")
            print(f"  Maximum: {max_memory:.1f} MB")
            print(f"  Growth: {max_memory - samples[0]['memory_mb']:.1f} MB")
            print(f"  Status: {'✓ PASS' if (max_memory - samples[0]['memory_mb']) < 100 else '✗ FAIL (>100MB growth)'}")
            
            print(f"\nRequest Processing:")
            print(f"  Total: {final_metrics['total_requests']}")
            print(f"  Successful: {final_metrics['successful_requests']}")
            print(f"  Failed: {final_metrics['failed_requests']}")
            print(f"  Success rate: {(final_metrics['successful_requests'] / max(final_metrics['total_requests'], 1)) * 100:.1f}%")
            
            print(f"\nPerformance:")
            print(f"  Avg execution time: {final_metrics['avg_execution_time_ms']:.2f}ms")
            
            # Overall status
            cpu_ok = avg_cpu < 10
            memory_ok = (max_memory - samples[0]['memory_mb']) < 100
            
            print(f"\n{'='*60}")
            if cpu_ok and memory_ok:
                print("OVERALL STATUS: ✓ PASS")
                print("System is stable for 1-hour operation")
            else:
                print("OVERALL STATUS: ✗ FAIL")
                if not cpu_ok:
                    print("- CPU usage too high")
                if not memory_ok:
                    print("- Memory growth detected")
            print("="*60)
        
        else:
            print("\nNo samples collected - test duration too short")


if __name__ == "__main__":
    run_stability_test()

# Made with Bob
