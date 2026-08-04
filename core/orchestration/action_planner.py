"""
Action Planner
Creates detailed execution plans from parsed goals
"""

from typing import Dict, List, Any
from datetime import datetime


class ActionPlanner:
    """Plans detailed actions from parsed goals"""
    
    def __init__(self):
        """Initialize action planner"""
        self.action_templates = {
            'launch_application': self._plan_launch_app,
            'type_text': self._plan_type_text,
            'click_element': self._plan_click,
            'navigate_to': self._plan_navigate,
            'search_for': self._plan_search,
            'capture_screen': self._plan_capture,
            'read_content': self._plan_read,
        }
    
    def plan(self, parsed_goal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create execution plan from parsed goal.
        
        Args:
            parsed_goal: Parsed goal structure
            
        Returns:
            Execution plan
        """
        plan = {
            'goal': parsed_goal['original_goal'],
            'planned_at': datetime.utcnow().isoformat(),
            'actions': [],
            'estimated_duration': 0.0,
            'dependencies': [],
            'risks': []
        }
        
        # Plan each step
        for step in parsed_goal['steps']:
            action_type = step['action']
            if action_type in self.action_templates:
                action_plan = self.action_templates[action_type](step)
                plan['actions'].append(action_plan)
                plan['estimated_duration'] += action_plan.get('duration', 1.0)
        
        return plan
    
    def _plan_launch_app(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan application launch"""
        return {
            'type': 'launch_application',
            'target': step['target'],
            'method': 'app_launcher',
            'duration': 2.0,
            'verification': 'process_running',
            'recovery': 'retry_launch'
        }
    
    def _plan_type_text(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan text typing"""
        text_length = len(step['target'])
        return {
            'type': 'type_text',
            'target': step['target'],
            'method': 'keyboard_controller',
            'duration': text_length * 0.05,
            'verification': 'text_visible',
            'recovery': 'retry_typing'
        }
    
    def _plan_click(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan mouse click"""
        return {
            'type': 'click_element',
            'target': step['target'],
            'method': 'mouse_controller',
            'duration': 0.5,
            'verification': 'element_clicked',
            'recovery': 'retry_click'
        }
    
    def _plan_navigate(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan navigation"""
        return {
            'type': 'navigate_to',
            'target': step['target'],
            'method': 'browser_automation',
            'duration': 3.0,
            'verification': 'url_loaded',
            'recovery': 'retry_navigation'
        }
    
    def _plan_search(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan search action"""
        return {
            'type': 'search_for',
            'target': step['target'],
            'method': 'browser_automation',
            'duration': 2.0,
            'verification': 'results_visible',
            'recovery': 'retry_search'
        }
    
    def _plan_capture(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan screen capture"""
        return {
            'type': 'capture_screen',
            'target': step['target'],
            'method': 'aloe_screen',
            'duration': 1.0,
            'verification': 'file_created',
            'recovery': 'retry_capture'
        }
    
    def _plan_read(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Plan content reading"""
        return {
            'type': 'read_content',
            'target': step['target'],
            'method': 'aloe_ocr',
            'duration': 2.0,
            'verification': 'text_extracted',
            'recovery': 'retry_read'
        }


# Made with Bob
