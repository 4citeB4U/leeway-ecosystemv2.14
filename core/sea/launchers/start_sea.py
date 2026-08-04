#!/usr/bin/env python3
"""
SEA Production Launcher
Starts SEA Core with Control Plane API
"""

import sys
import os
from pathlib import Path

# Add workspace root to Python path
workspace_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(workspace_root))

import threading
import logging
from datetime import datetime

# Now import SEA components
from core.sea.sea_core import SEA
from core.sea.control_plane.api_server import ControlPlaneAPI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)


def main():
    """Main entry point"""
    logger.info("=" * 60)
    logger.info("SEA PRODUCTION LAUNCHER")
    logger.info("=" * 60)
    
    # Initialize SEA
    logger.info("Initializing SEA Core...")
    sea = SEA()
    
    # Start Control Plane API in background thread
    logger.info("Starting Control Plane API on http://127.0.0.1:8000")
    api = ControlPlaneAPI(sea)
    api_thread = threading.Thread(
        target=api.run,
        kwargs={"host": "127.0.0.1", "port": 8000},
        daemon=True
    )
    api_thread.start()
    
    # Give API time to start
    import time
    time.sleep(2)
    
    # Start SEA Core (blocking)
    logger.info("Starting SEA Core execution loop...")
    logger.info("=" * 60)
    
    try:
        sea.run()
    except KeyboardInterrupt:
        logger.info("\nShutdown requested...")
        logger.info("Stopping SEA Core...")
        logger.info("Shutdown complete")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()

# Made with Bob
