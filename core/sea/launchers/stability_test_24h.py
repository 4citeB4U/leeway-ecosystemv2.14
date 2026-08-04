"""
SEA 24-Hour Stability Test

Runs SEA for 24 hours and monitors:
- CPU usage
- Memory usage  
- Request throughput
- Error rate
- Receipt generation
- Long-term stability
- No memory leaks
"""

import sys
import os

# Add parent directories to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Import and run with 24-hour duration
from stability_test_1h import run_stability_test

# Monkey-patch duration
import stability_test_1h
stability_test_1h.duration_seconds = 86400  # 24 hours
stability_test_1h.sample_interval = 300  # Sample every 5 minutes

if __name__ == "__main__":
    print("="*60)
    print("SEA 24-HOUR STABILITY TEST")
    print("="*60)
    print("\nThis will run for 24 hours.")
    print("Press Ctrl+C to stop early and generate report.")
    print("\nStarting in 5 seconds...")
    
    import time
    time.sleep(5)
    
    run_stability_test()

# Made with Bob
