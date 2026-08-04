import re

class IntentRouterAgent:
    """
    Deterministic Intent & Emotion Classifier (Layer B).
    Evaluates transcript extremely quickly before hitting the heavy LLM.
    """
    
    INTENT_PATTERNS = {
        "stop": r"\b(stop|halt|cancel|quiet|shut up|nevermind|pause)\b",
        "search_files": r"\b(find|search|look for|where is|locate)\b.*\b(file|folder|code|script)\b",
        "compare_files": r"\b(compare|diff|difference between)\b",
        "summarize": r"\b(summarize|tldr|too long|outline|break down)\b",
        "system_command": r"\b(open|close|launch|turn on|turn off|connect|disconnect|connect to)\b",
        "vision_request": r"\b(do you see me|look at this|what am i holding|camera)\b",
        "creative_draft": r"\b(draft|write a story|screenplay|outline a|brainstorm)\b"
    }
    
    EMOTION_PATTERNS = {
        "frustrated": r"\b(why|this is not working|it's broken|stupid|annoying|come on|hurry|fuck|shit)\b",
        "urgent": r"\b(quick|fast|hurry|asap|now|emergency)\b",
        "curious": r"\b(i wonder|explain|how does|what is the meaning|tell me more)\b"
    }

    def classify(self, text: str):
        """
        Returns a dictionary containing intent and emotion.
        Ex: {"intent": "question", "emotion": "neutral", "requires_reasoning": True}
        """
        text_lower = text.lower()
        
        assigned_intent = "question" # Default to general conversation
        assigned_emotion = "neutral"
        requires_reasoning = True
        
        # Check standard intents
        for intent, pattern in self.INTENT_PATTERNS.items():
            if re.search(pattern, text_lower):
                assigned_intent = intent
                break
                
        # Check emotions
        for emotion, pattern in self.EMOTION_PATTERNS.items():
            if re.search(pattern, text_lower):
                assigned_emotion = emotion
                break
                
        # Fast exit conditions
        if assigned_intent == "stop":
            requires_reasoning = False
            
        return {
            "intent": assigned_intent,
            "emotion": assigned_emotion,
            "requires_reasoning": requires_reasoning
        }

if __name__ == "__main__":
    router = IntentRouterAgent()
    samples = [
        "Cerebral, stop what you are doing.",
        "Compare these two python files.",
        "This is so annoying, why won't it connect?",
        "Do you see me sitting here?",
        "What is the capital of France?"
    ]
    for s in samples:
        print(f"'{s}' -> {router.classify(s)}")
