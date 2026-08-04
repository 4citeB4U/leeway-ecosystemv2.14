"""
SEA Control Plane API Server

FastAPI server that exposes SEA state, metrics, and control endpoints.
Provides REST API and WebSocket streaming for real-time monitoring.
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json

logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models
# ============================================================================

class SystemStateResponse(BaseModel):
    """System state snapshot"""
    timestamp: str
    status: str
    uptime_seconds: float
    queue_depth: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_execution_time_ms: float
    cpu_percent: float
    memory_mb: float


class AdapterInfo(BaseModel):
    """Adapter information"""
    name: str
    status: str
    capabilities: List[str]
    registered_at: str
    execution_count: int
    error_count: int
    health_status: str


class RegistryResponse(BaseModel):
    """Registry state"""
    adapters: List[AdapterInfo]
    total_adapters: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    components: Dict[str, str]


class EventMessage(BaseModel):
    """Event stream message"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]


# ============================================================================
# Control Plane API
# ============================================================================

class ControlPlaneAPI:
    """
    FastAPI-based control plane for SEA.
    
    Provides:
    - REST endpoints for state queries
    - WebSocket streaming for real-time events
    - Health checks
    - Metrics export
    """
    
    def __init__(self, sea_instance=None):
        """
        Initialize control plane API.
        
        Args:
            sea_instance: SEA instance to monitor/control
        """
        self.sea = sea_instance
        self.app = FastAPI(
            title="SEA Control Plane",
            description="Single Execution Authority Control Plane API",
            version="1.0.0"
        )
        
        # Enable CORS for web UI
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Configure appropriately for production
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # WebSocket connections
        self.active_connections: List[WebSocket] = []
        
        # Setup routes
        self._setup_routes()
        
        logger.info("Control Plane API initialized")
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/")
        async def root():
            """Root endpoint"""
            return {
                "service": "SEA Control Plane",
                "version": "1.0.0",
                "status": "operational",
                "endpoints": {
                    "state": "/api/v1/state",
                    "registry": "/api/v1/registry",
                    "health": "/api/v1/health",
                    "metrics": "/api/v1/metrics",
                    "events": "/api/v1/events/stream (WebSocket)"
                }
            }
        
        @self.app.get("/api/v1/state", response_model=SystemStateResponse)
        async def get_state():
            """Get current system state"""
            if not self.sea:
                raise HTTPException(status_code=503, detail="SEA not available")
            
            try:
                metrics = self.sea.get_performance_metrics()
                
                # Get process metrics
                import psutil
                process = psutil.Process()
                
                return SystemStateResponse(
                    timestamp=datetime.utcnow().isoformat(),
                    status="running" if self.sea.running else "stopped",
                    uptime_seconds=metrics.get("uptime_seconds", 0),
                    queue_depth=self.sea.get_queue_depth(),
                    total_requests=metrics.get("total_requests", 0),
                    successful_requests=metrics.get("successful_requests", 0),
                    failed_requests=metrics.get("failed_requests", 0),
                    avg_execution_time_ms=metrics.get("avg_execution_time_ms", 0),
                    cpu_percent=process.cpu_percent(),
                    memory_mb=process.memory_info().rss / 1024 / 1024
                )
            except Exception as e:
                logger.error(f"Error getting state: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/v1/registry", response_model=RegistryResponse)
        async def get_registry():
            """Get adapter registry state"""
            if not self.sea:
                raise HTTPException(status_code=503, detail="SEA not available")
            
            try:
                adapters = []
                for name, info in self.sea.registry.subsystems.items():
                    adapters.append(AdapterInfo(
                        name=name,
                        status=info["status"],
                        capabilities=info["capabilities"],
                        registered_at=info["registered_at"],
                        execution_count=info["execution_count"],
                        error_count=info["error_count"],
                        health_status=info["health_status"]
                    ))
                
                return RegistryResponse(
                    adapters=adapters,
                    total_adapters=len(adapters)
                )
            except Exception as e:
                logger.error(f"Error getting registry: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/v1/health", response_model=HealthResponse)
        async def health_check():
            """Health check endpoint"""
            if not self.sea:
                return HealthResponse(
                    status="unavailable",
                    timestamp=datetime.utcnow().isoformat(),
                    components={"sea": "not_initialized"}
                )
            
            components = {
                "sea_core": "healthy" if self.sea.running else "stopped",
                "scheduler": "healthy",
                "state_store": "healthy",
                "governance": "healthy" if self.sea.governance else "unavailable",
                "router": "healthy",
                "registry": "healthy"
            }
            
            # Check adapters
            for name, info in self.sea.registry.subsystems.items():
                components[f"adapter_{name}"] = info["health_status"]
            
            overall_status = "healthy" if all(
                v in ["healthy", "stopped"] for v in components.values()
            ) else "degraded"
            
            return HealthResponse(
                status=overall_status,
                timestamp=datetime.utcnow().isoformat(),
                components=components
            )
        
        @self.app.get("/api/v1/metrics")
        async def get_metrics():
            """Get performance metrics"""
            if not self.sea:
                raise HTTPException(status_code=503, detail="SEA not available")
            
            try:
                return self.sea.get_performance_metrics()
            except Exception as e:
                logger.error(f"Error getting metrics: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.websocket("/api/v1/events/stream")
        async def event_stream(websocket: WebSocket):
            """WebSocket endpoint for real-time event streaming"""
            await websocket.accept()
            self.active_connections.append(websocket)
            
            try:
                # Send initial state
                if self.sea:
                    metrics = self.sea.get_performance_metrics()
                    await websocket.send_json({
                        "event_type": "connected",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": metrics
                    })
                
                # Keep connection alive and stream events
                while True:
                    # Wait for events (implement event queue in SEA)
                    await asyncio.sleep(1)
                    
                    # Send periodic updates
                    if self.sea:
                        metrics = self.sea.get_performance_metrics()
                        await websocket.send_json({
                            "event_type": "metrics_update",
                            "timestamp": datetime.utcnow().isoformat(),
                            "data": metrics
                        })
            
            except WebSocketDisconnect:
                self.active_connections.remove(websocket)
                logger.info("WebSocket client disconnected")
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
    
    async def broadcast_event(self, event: EventMessage):
        """
        Broadcast event to all connected WebSocket clients.
        
        Args:
            event: Event to broadcast
        """
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(event.dict())
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.active_connections.remove(conn)
    
    def run(self, host: str = "127.0.0.1", port: int = 8000):
        """
        Run the API server.
        
        Args:
            host: Host to bind to
            port: Port to bind to
        """
        import uvicorn
        logger.info(f"Starting Control Plane API on {host}:{port}")
        uvicorn.run(self.app, host=host, port=port)


# ============================================================================
# Standalone Server
# ============================================================================

def create_app(sea_instance=None) -> FastAPI:
    """
    Create FastAPI app instance.
    
    Args:
        sea_instance: SEA instance to monitor
        
    Returns:
        FastAPI app
    """
    api = ControlPlaneAPI(sea_instance)
    return api.app


if __name__ == "__main__":
    # Standalone mode for testing
    app = create_app()
    
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

# Made with Bob