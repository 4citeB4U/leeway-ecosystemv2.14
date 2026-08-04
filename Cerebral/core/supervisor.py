import time
import threading

# Agents
from core.voice_loop import VoiceLoop
from core.intent_router import IntentRouterAgent
from audio.barge_in_controller import SpeechAgent

class SupervisorOrchestrator:
    """
    Central traffic controller for Cerebral OS.
    Routes VAD transcripts -> Intent Router -> Policy Gates -> LLM Models -> Speech Agent.
    """
    def __init__(self):
        print("[Supervisor] Initializing agent framework...")
        self.speech_agent = SpeechAgent()
        self.intent_router = IntentRouterAgent()
        self.voice_loop = VoiceLoop()
        
        # Connect the audio pipeline signals
        self.voice_loop.on_barge_in = self.handle_barge_in
        self.voice_loop.on_speech_detected = self.handle_user_utterance
        
        # Other agents (Phi Core, File Intelligence, etc) would be instantiated here.
        self.is_processing = False
        
    def start(self):
        print("[Supervisor] Starting core OS loop...")
        self.voice_loop.start()
        
    def handle_barge_in(self):
        """
        Called instantly by the VoiceLoop the moment the user interrupts.
        """
        print("\n[Supervisor] *** BARGE-IN DETECTED ***")
        self.speech_agent.interrupt()
        # Here we would also signal the Task Manager to pause long-running processes
        
    def handle_user_utterance(self, transcript: str):
        """
        Called when a speech segment is finalized.
        """
        if not transcript.strip():
            return
            
        print(f"\n[Supervisor] Received transcript: {transcript}")
        self.is_processing = True
        
        # Layer B: Fast Intent & Emotion Classification
        classification = self.intent_router.classify(transcript)
        print(f"[Supervisor] Classified Intent: {classification['intent']}, Tone: {classification['emotion']}")
        
        intent = classification["intent"]
        
        # Immediate responses (no LLM required)
        if intent == "stop":
            self.speech_agent.interrupt()
            self.speech_agent.say("Stopping.")
            self.is_processing = False
            return
            
        if intent == "system_command":
            # Example: Hand off to Device Agent
            self.speech_agent.say("Executing system command.")
            self.is_processing = False
            return
            
        if intent == "vision_request":
            # Example: Hand off to Vision Agent
            self.speech_agent.say("Accessing camera feed. Stand by.")
            self.is_processing = False
            return
            
        if intent == "creative_draft":
            # Hand off to Qwen Draft Agent silently, then Phi
            self.speech_agent.say("Drafting that now. This might take a moment.")
            # ... mock work ...
            self.is_processing = False
            return
            
        # Default fallback to Phi Reasoning Agent
        if classification["requires_reasoning"]:
            print("[Supervisor] Routing to Phi-3.5 Core Reasoning Agent...")
            # For this mock step, we just echo.
            response = f"I heard you. My simulated response to '{transcript}' is based on my Phi core logic."
            
            # Apply tone mapping
            if classification["emotion"] == "frustrated":
                response = "I apologize for the issue. Let me explain this step-by-step: " + response
                
            self.speech_agent.say(response)
            
        self.is_processing = False

if __name__ == "__main__":
    supervisor = SupervisorOrchestrator()
    supervisor.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down supervisor...")
        supervisor.speech_agent.stop()
        supervisor.voice_loop.stop()
