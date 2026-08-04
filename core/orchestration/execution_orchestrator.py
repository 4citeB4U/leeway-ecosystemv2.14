"""
Execution Orchestrator
Orchestrates the execution of action plans
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import sys
from pathlib import Path

# Import action controllers
sys.path.insert(0, str(Path(__file__).parent.parent))
from action.mouse_controller import MouseController
from action.keyboard_controller import KeyboardController
from action.app_launcher import AppLauncher


class ExecutionOrchestrator:
    """Orchestrates action execution"""
    
    def __init__(self):
        """Initialize execution orchestrator"""
        self.mouse = MouseController()
        self.keyboard = KeyboardController()
        self.app_launcher = AppLauncher()
        self.execution_history = []
    
    def execute(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an action plan.
        
        Args:
            plan: Execution plan
            
        Returns:
            Execution result
        """
        result = {
            'plan': plan['goal'],
            'started_at': datetime.utcnow().isoformat(),
            'completed_at': None,
            'success': False,
            'actions_executed': [],
            'actions_failed': [],
            'error': None
        }
        
        try:
            # Execute each action in sequence
            for action in plan['actions']:
                action_result = self._execute_action(action)
                
                if action_result['success']:
                    result['actions_executed'].append(action_result)
                else:
                    result['actions_failed'].append(action_result)
                    # Stop on first failure
                    break
            
            # Check if all actions succeeded
            result['success'] = len(result['actions_failed']) == 0
            result['completed_at'] = datetime.utcnow().isoformat()
            
        except Exception as e:
            result['error'] = str(e)
            result['completed_at'] = datetime.utcnow().isoformat()
        
        # Store in history
        self.execution_history.append(result)
        
        return result
    
    def _execute_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single action"""
        action_result = {
            'action': action['type'],
            'target': action['target'],
            'started_at': datetime.utcnow().isoformat(),
            'completed_at': None,
            'success': False,
            'output': None,
            'error': None
        }
        
        try:
            action_type = action['type']
            
            if action_type == 'launch_application':
                output = self.app_launcher.launch(action['target'])
                action_result['success'] = output['success']
                action_result['output'] = output
            
            elif action_type == 'type_text':
                self.keyboard.type_text(action['target'])
                action_result['success'] = True
                action_result['output'] = {'text_typed': action['target']}
            
            elif action_type == 'click_element':
                self.mouse.click()
                action_result['success'] = True
                action_result['output'] = {'clicked': True}
            
            else:
                action_result['error'] = f"Unknown action type: {action_type}"
            
            action_result['completed_at'] = datetime.utcnow().isoformat()
            
        except Exception as e:
            action_result['error'] = str(e)
            action_result['completed_at'] = datetime.utcnow().isoformat()
        
        return action_result
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history"""
        return self.execution_history


# Made with Bob
