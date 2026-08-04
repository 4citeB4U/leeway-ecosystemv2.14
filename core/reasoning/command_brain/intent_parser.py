"""
Intent Parser

Parses voice/text input into structured intents for SEA execution.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import re


@dataclass
class Intent:
    """Parsed intent from user input"""
    intent_type: str  # command, question, request, conversation
    action: str       # specific action to take
    entities: Dict[str, Any]  # extracted entities
    confidence: float  # confidence in parse
    raw_input: str    # original input
    context: Dict[str, Any]  # conversation context


class IntentParser:
    """Parses user input into structured intents"""
    
    # Intent patterns
    COMMAND_PATTERNS = [
        (r'(?:please\s+)?(?:can you\s+)?create\s+(?:a\s+)?(.+)', 'create'),
        (r'(?:please\s+)?(?:can you\s+)?modify\s+(.+)', 'modify'),
        (r'(?:please\s+)?(?:can you\s+)?delete\s+(.+)', 'delete'),
        (r'(?:please\s+)?(?:can you\s+)?read\s+(.+)', 'read'),
        (r'(?:please\s+)?(?:can you\s+)?list\s+(.+)', 'list'),
        (r'(?:please\s+)?(?:can you\s+)?search\s+(?:for\s+)?(.+)', 'search'),
        (r'(?:please\s+)?(?:can you\s+)?run\s+(.+)', 'execute'),
        (r'(?:please\s+)?(?:can you\s+)?start\s+(.+)', 'start'),
        (r'(?:please\s+)?(?:can you\s+)?stop\s+(.+)', 'stop'),
        (r'(?:please\s+)?(?:can you\s+)?check\s+(.+)', 'check'),
        (r'(?:please\s+)?(?:can you\s+)?verify\s+(.+)', 'verify'),
        (r'(?:please\s+)?(?:can you\s+)?test\s+(.+)', 'test'),
    ]
    
    QUESTION_PATTERNS = [
        (r'what\s+is\s+(.+)', 'what_is'),
        (r'what\s+are\s+(.+)', 'what_are'),
        (r'where\s+is\s+(.+)', 'where_is'),
        (r'where\s+are\s+(.+)', 'where_are'),
        (r'how\s+(?:do\s+i\s+)?(.+)', 'how_to'),
        (r'why\s+(.+)', 'why'),
        (r'when\s+(.+)', 'when'),
        (r'who\s+(.+)', 'who'),
        (r'can\s+you\s+(.+)', 'capability_check'),
        (r'do\s+you\s+(.+)', 'capability_check'),
    ]
    
    GREETING_PATTERNS = [
        r'hello',
        r'hi',
        r'hey',
        r'good\s+morning',
        r'good\s+afternoon',
        r'good\s+evening',
    ]
    
    def __init__(self):
        self.conversation_history: List[Intent] = []
    
    def parse(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Intent:
        """
        Parse user input into structured intent.
        
        Args:
            user_input: Raw user input (voice transcript or text)
            context: Optional conversation context
            
        Returns:
            Parsed Intent
        """
        if context is None:
            context = {}
        
        # Normalize input
        normalized = self._normalize_input(user_input)
        
        # Detect intent type
        intent_type = self._detect_intent_type(normalized)
        
        # Extract action and entities
        if intent_type == "command":
            action, entities = self._parse_command(normalized)
        elif intent_type == "question":
            action, entities = self._parse_question(normalized)
        elif intent_type == "greeting":
            action, entities = "greet", {}
        else:
            action, entities = "conversation", {}
        
        # Calculate confidence
        confidence = self._calculate_confidence(intent_type, action, entities)
        
        # Create intent
        intent = Intent(
            intent_type=intent_type,
            action=action,
            entities=entities,
            confidence=confidence,
            raw_input=user_input,
            context=context
        )
        
        # Add to history
        self.conversation_history.append(intent)
        
        return intent
    
    def _normalize_input(self, text: str) -> str:
        """Normalize input text"""
        # Convert to lowercase
        text = text.lower().strip()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove trailing punctuation for matching
        text = re.sub(r'[.!?]+$', '', text)
        
        return text
    
    def _detect_intent_type(self, text: str) -> str:
        """Detect high-level intent type"""
        # Check for greetings
        for pattern in self.GREETING_PATTERNS:
            if re.match(pattern, text):
                return "greeting"
        
        # Check for questions
        for pattern, _ in self.QUESTION_PATTERNS:
            if re.match(pattern, text):
                return "question"
        
        # Check for commands
        for pattern, _ in self.COMMAND_PATTERNS:
            if re.match(pattern, text):
                return "command"
        
        # Default to conversation
        return "conversation"
    
    def _parse_command(self, text: str) -> tuple[str, Dict[str, Any]]:
        """Parse command intent"""
        for pattern, action in self.COMMAND_PATTERNS:
            match = re.match(pattern, text)
            if match:
                target = match.group(1)
                entities = self._extract_entities(target)
                return action, entities
        
        return "unknown", {}
    
    def _parse_question(self, text: str) -> tuple[str, Dict[str, Any]]:
        """Parse question intent"""
        for pattern, action in self.QUESTION_PATTERNS:
            match = re.match(pattern, text)
            if match:
                subject = match.group(1)
                entities = self._extract_entities(subject)
                return action, entities
        
        return "unknown", {}
    
    def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract entities from text"""
        entities = {}
        
        # Extract file paths
        file_pattern = r'(?:file|path)?\s*["\']?([a-zA-Z]:[\\\/][\w\s\-\.\\\/]+|[\w\-\.\/]+\.\w+)["\']?'
        file_matches = re.findall(file_pattern, text)
        if file_matches:
            entities["files"] = file_matches
        
        # Extract numbers
        number_pattern = r'\b(\d+)\b'
        number_matches = re.findall(number_pattern, text)
        if number_matches:
            entities["numbers"] = [int(n) for n in number_matches]
        
        # Extract quoted strings
        quote_pattern = r'["\']([^"\']+)["\']'
        quote_matches = re.findall(quote_pattern, text)
        if quote_matches:
            entities["quoted_text"] = quote_matches
        
        # Store remaining text as target
        entities["target"] = text
        
        return entities
    
    def _calculate_confidence(
        self,
        intent_type: str,
        action: str,
        entities: Dict[str, Any]
    ) -> float:
        """Calculate confidence in intent parse"""
        confidence = 0.5  # Base confidence
        
        # Boost for recognized intent type
        if intent_type in ["command", "question", "greeting"]:
            confidence += 0.2
        
        # Boost for recognized action
        if action != "unknown":
            confidence += 0.2
        
        # Boost for extracted entities
        if entities:
            confidence += 0.1
        
        return min(1.0, confidence)
    
    def get_conversation_context(self, lookback: int = 3) -> List[Intent]:
        """Get recent conversation history"""
        return self.conversation_history[-lookback:]
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history.clear()

# Made with Bob
