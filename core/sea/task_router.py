"""
Task Router - Selects appropriate adapter based on task type

This module routes execution contexts to the correct subsystem adapter
based on task type and other criteria.
"""

import logging
from typing import Dict, Any, Optional

from .models.execution_context import ExecutionContext

logger = logging.getLogger(__name__)


class TaskRouter:
    """
    Routes execution contexts to appropriate adapters.
    
    Maintains a routing table that maps task types to adapters.
    Supports default adapter for unknown task types.
    """
    
    def __init__(self):
        """Initialize task router"""
        self.routes: Dict[str, Any] = {}
        self.default_adapter = None
        self.routing_count = 0
        self.routing_stats: Dict[str, int] = {}
        
        logger.info("Task router initialized")
    
    def register(self, task_type: str, adapter: Any) -> None:
        """
        Register an adapter for a task type.
        
        Args:
            task_type: Type of task this adapter handles
            adapter: Adapter instance
        """
        if task_type in self.routes:
            logger.warning(f"Overwriting existing route for task_type: {task_type}")
        
        self.routes[task_type] = adapter
        self.routing_stats[task_type] = 0
        
        logger.info(f"Route registered: {task_type} -> {adapter.__class__.__name__}")
    
    def register_default(self, adapter: Any) -> None:
        """
        Register default adapter for unknown task types.
        
        Args:
            adapter: Default adapter instance
        """
        self.default_adapter = adapter
        logger.info(f"Default adapter registered: {adapter.__class__.__name__}")
    
    def select(self, ctx: ExecutionContext) -> Optional[Any]:
        """
        Select appropriate adapter for execution context.
        
        Args:
            ctx: Execution context to route
            
        Returns:
            Adapter instance, or None if no adapter available
        """
        self.routing_count += 1
        
        # Try to find specific adapter for task type
        adapter = self.routes.get(ctx.task_type)
        
        if adapter is not None:
            # Found specific adapter
            self.routing_stats[ctx.task_type] = self.routing_stats.get(ctx.task_type, 0) + 1
            
            logger.debug(
                f"Routed {ctx.request_id} to {adapter.__class__.__name__} "
                f"(task_type={ctx.task_type})"
            )
            
            return adapter
        
        # No specific adapter - try default
        if self.default_adapter is not None:
            logger.debug(
                f"Routed {ctx.request_id} to default adapter "
                f"(task_type={ctx.task_type} not registered)"
            )
            
            return self.default_adapter
        
        # No adapter available
        logger.error(
            f"No adapter available for {ctx.request_id} "
            f"(task_type={ctx.task_type})"
        )
        
        return None
    
    def get_adapter(self, task_type: str) -> Optional[Any]:
        """
        Get adapter for specific task type.
        
        Args:
            task_type: Task type to look up
            
        Returns:
            Adapter instance, or None if not registered
        """
        return self.routes.get(task_type)
    
    def has_adapter(self, task_type: str) -> bool:
        """Check if adapter is registered for task type"""
        return task_type in self.routes
    
    def get_registered_types(self) -> list:
        """Get list of registered task types"""
        return list(self.routes.keys())
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get routing statistics.
        
        Returns:
            dict with routing stats
        """
        return {
            "routing_count": self.routing_count,
            "registered_types": self.get_registered_types(),
            "routing_stats": self.routing_stats.copy(),
            "has_default": self.default_adapter is not None
        }
    
    def unregister(self, task_type: str) -> bool:
        """
        Unregister adapter for task type.
        
        Args:
            task_type: Task type to unregister
            
        Returns:
            True if unregistered, False if not found
        """
        if task_type in self.routes:
            del self.routes[task_type]
            logger.info(f"Route unregistered: {task_type}")
            return True
        
        return False
    
    def clear(self) -> None:
        """Clear all routes"""
        self.routes.clear()
        self.default_adapter = None
        self.routing_stats.clear()
        logger.info("All routes cleared")
    
    def __repr__(self) -> str:
        """String representation for debugging"""
        return (
            f"TaskRouter("
            f"routes={len(self.routes)}, "
            f"routed={self.routing_count}, "
            f"has_default={self.default_adapter is not None})"
        )


class PriorityRouter(TaskRouter):
    """
    Extended router that considers priority when selecting adapters.
    
    Allows registering multiple adapters per task type with different
    priority levels.
    """
    
    def __init__(self):
        """Initialize priority router"""
        super().__init__()
        self.priority_routes: Dict[str, Dict[int, Any]] = {}
        
        logger.info("Priority router initialized")
    
    def register_with_priority(
        self,
        task_type: str,
        adapter: Any,
        priority: int = 5
    ) -> None:
        """
        Register adapter with priority level.
        
        Args:
            task_type: Type of task
            adapter: Adapter instance
            priority: Priority level (0-10, 10 = highest)
        """
        if task_type not in self.priority_routes:
            self.priority_routes[task_type] = {}
        
        self.priority_routes[task_type][priority] = adapter
        
        # Also register in base router (highest priority)
        if task_type not in self.routes or priority > max(self.priority_routes[task_type].keys()):
            self.routes[task_type] = adapter
        
        logger.info(
            f"Priority route registered: {task_type} -> "
            f"{adapter.__class__.__name__} (priority={priority})"
        )
    
    def select_by_priority(
        self,
        ctx: ExecutionContext,
        min_priority: int = 0
    ) -> Optional[Any]:
        """
        Select adapter considering priority.
        
        Args:
            ctx: Execution context
            min_priority: Minimum priority level required
            
        Returns:
            Adapter instance, or None if no suitable adapter
        """
        task_type = ctx.task_type
        
        if task_type not in self.priority_routes:
            return self.select(ctx)
        
        # Find highest priority adapter above minimum
        available_priorities = [
            p for p in self.priority_routes[task_type].keys()
            if p >= min_priority
        ]
        
        if not available_priorities:
            return self.default_adapter
        
        highest_priority = max(available_priorities)
        adapter = self.priority_routes[task_type][highest_priority]
        
        logger.debug(
            f"Routed {ctx.request_id} to {adapter.__class__.__name__} "
            f"(priority={highest_priority})"
        )
        
        return adapter

# Made with Bob
