"""
Goal Parser
Parses user goals into structured execution plans
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import re


class GoalParser:
    """Parses natural language goals into structured format"""
    
    def __init__(self):
        """Initialize goal parser"""
        self.action_patterns = {
            'open': r'open\s+(.+)',
            'launch': r'launch\s+(.+)',
            'start': r'start\s+(.+)',
            'type': r'type\s+["\'](.+)["\']',
            'write': r'write\s+["\'](.+)["\']',
            'click': r'click\s+(.+)',
            'navigate': r'navigate\s+to\s+(.+)',
            'go_to': r'go\s+to\s+(.+)',
            'search': r'search\s+for\s+(.+)',
            'find': r'find\s+(.+)',
            'capture': r'capture\s+(.+)',
            'screenshot': r'(take\s+)?screenshot',
            'read': r'read\s+(.+)',
        }
    
    def parse(self, goal: str) -> Dict[str, Any]:
        """
        Parse a goal into structured format.
        
        Args:
            goal: Natural language goal
            
        Returns:
            Parsed goal structure
        """
        result = {
            'original_goal': goal,
            'parsed_at': datetime.utcnow().isoformat(),
            'intent': None,
            'target': None,
            'parameters': {},
            'steps': [],
            'confidence': 0.0
        }
        
        goal_lower = goal.lower().strip()
        
        # Try to match action patterns
        for action, pattern in self.action_patterns.items():
            match = re.search(pattern, goal_lower)
            if match:
                result['intent'] = action
                if match.groups():
                    result['target'] = match.group(1).strip()
                result['confidence'] = 0.8
                break
        
        # If no pattern matched, try to infer intent
        if not result['intent']:
            result['intent'] = 'unknown'
            result['target'] = goal
            result['confidence'] = 0.3
        
        # Break down into steps
        result['steps'] = self._decompose_goal(result)
        
        return result
    
    def _decompose_goal(self, parsed_goal: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Decompose goal into execution steps"""
        intent = parsed_goal['intent']
        target = parsed_goal['target']
        steps = []
        
        if intent in ['open', 'launch', 'start']:
            steps.append({
                'action': 'launch_application',
                'target': target,
                'parameters': {}
            })
        
        elif intent in ['type', 'write']:
            steps.append({
                'action': 'type_text',
                'target': target,
                'parameters': {}
            })
        
        elif intent == 'click':
            steps.append({
                'action': 'click_element',
                'target': target,
                'parameters': {}
            })
        
        elif intent in ['navigate', 'go_to']:
            steps.append({
                'action': 'navigate_to',
                'target': target,
                'parameters': {}
            })
        
        elif intent in ['search', 'find']:
            steps.append({
                'action': 'search_for',
                'target': target,
                'parameters': {}
            })
        
        elif intent in ['capture', 'screenshot']:
            steps.append({
                'action': 'capture_screen',
                'target': target or 'screen',
                'parameters': {}
            })
        
        elif intent == 'read':
            steps.append({
                'action': 'read_content',
                'target': target,
                'parameters': {}
            })
        
        else:
            steps.append({
                'action': 'unknown',
                'target': target,
                'parameters': {}
            })
        
        return steps
    
    def validate_goal(self, parsed_goal: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that a parsed goal is executable"""
        validation = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        if not parsed_goal['intent']:
            validation['valid'] = False
            validation['errors'].append('No intent identified')
        
        if parsed_goal['confidence'] < 0.5:
            validation['warnings'].append('Low confidence in goal parsing')
        
        if not parsed_goal['steps']:
            validation['valid'] = False
            validation['errors'].append('No execution steps generated')
        
        return validation


# Made with Bob
