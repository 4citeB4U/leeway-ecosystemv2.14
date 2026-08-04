"""
Command Orchestrator

Orchestrates the complete flow: voice input → intent → execution → voice response.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio

from .intent_parser import IntentParser, Intent
from .voice_identity_engine import VoiceIdentityEngine, VoiceOutput
from .execution_bridge import ExecutionBridge, ExecutionResponse


@dataclass
class CommandSession:
    """Complete command session from input to response"""
    session_id: str
    user_input: str
    intent: Intent
    execution_response: ExecutionResponse
    voice_output: VoiceOutput
    total_time_ms: float
    created_at: str


class CommandOrchestrator:
    """
    Orchestrates complete Agent Lee command flow.
    
    Flow: Voice Input → Intent Parse → SEA Execution → Voice Response
    """
    
    def __init__(self):
        self.intent_parser = IntentParser()
        self.voice_engine = VoiceIdentityEngine()
        self.execution_bridge = ExecutionBridge()
        self.session_history: list[CommandSession] = []
    
    async def process_command(
        self,
        user_input: str,
        context: Optional[Dict[str, Any]] = None,
        sea_executor: Optional[Any] = None
    ) -> CommandSession:
        """
        Process complete command from input to voice response.
        
        Args:
            user_input: User's voice transcript or text input
            context: Optional conversation context
            sea_executor: Optional SEA executor (for testing)
            
        Returns:
            CommandSession with complete flow
        """
        start_time = datetime.utcnow()
        session_id = f"session-{start_time.strftime('%Y%m%d%H%M%S%f')}"
        
        # Step 1: Parse intent
        intent = self.intent_parser.parse(user_input, context)
        
        # Step 2: Execute through SEA
        execution_response = await self.execution_bridge.execute_intent(
            intent,
            sea_executor
        )
        
        # Step 3: Voice output already generated in execution_response
        voice_output = execution_response.voice_response
        
        # Calculate total time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Create session
        session = CommandSession(
            session_id=session_id,
            user_input=user_input,
            intent=intent,
            execution_response=execution_response,
            voice_output=voice_output,
            total_time_ms=total_time,
            created_at=start_time.isoformat()
        )
        
        # Add to history
        self.session_history.append(session)
        
        return session
    
    async def process_voice_command(
        self,
        audio_path: str,
        stt_service: Optional[Any] = None,
        sea_executor: Optional[Any] = None
    ) -> CommandSession:
        """
        Process voice command from audio file.
        
        Args:
            audio_path: Path to audio file
            stt_service: Speech-to-text service
            sea_executor: Optional SEA executor
            
        Returns:
            CommandSession with complete flow
        """
        # Step 1: Transcribe audio
        if stt_service:
            transcript = await stt_service.transcribe(audio_path)
        else:
            transcript = await self._simulate_transcription(audio_path)
        
        # Step 2: Process as text command
        return await self.process_command(
            transcript,
            context={"input_type": "voice", "audio_path": audio_path},
            sea_executor=sea_executor
        )
    
    async def generate_greeting(self) -> VoiceOutput:
        """Generate Agent Lee greeting with proper voice identity"""
        greeting_text = "Hello. I'm Agent Lee. Ready to assist."
        return self.voice_engine.apply_voice_identity(greeting_text, "greeting")
    
    async def generate_acknowledgment(self, message: str = "Understood") -> VoiceOutput:
        """Generate acknowledgment with proper voice identity"""
        return self.voice_engine.apply_voice_identity(message, "acknowledgment")
    
    async def generate_status_update(self, status: str) -> VoiceOutput:
        """Generate status update with proper voice identity"""
        status_text = f"Task in progress. Current status: {status}."
        return self.voice_engine.apply_voice_identity(status_text, "status")
    
    async def generate_error_response(self, error: str) -> VoiceOutput:
        """Generate error response with proper voice identity"""
        error_text = f"I encountered an issue. {error}. Let me know how you'd like to proceed."
        return self.voice_engine.apply_voice_identity(error_text, "error")
    
    async def generate_completion_response(self, summary: str) -> VoiceOutput:
        """Generate completion response with proper voice identity"""
        completion_text = f"Task complete. {summary}. Anything else I can help with?"
        return self.voice_engine.apply_voice_identity(completion_text, "completion")
    
    def get_conversation_context(self, lookback: int = 3) -> list[Intent]:
        """Get recent conversation context"""
        return self.intent_parser.get_conversation_context(lookback)
    
    def get_session_history(self, limit: int = 10) -> list[CommandSession]:
        """Get recent session history"""
        return self.session_history[-limit:]
    
    def clear_history(self):
        """Clear conversation and session history"""
        self.intent_parser.clear_history()
        self.session_history.clear()
    
    async def _simulate_transcription(self, audio_path: str) -> str:
        """Simulate STT for testing"""
        await asyncio.sleep(0.1)
        return "Hello Agent Lee, please check system status"
    
    def get_orchestrator_stats(self) -> Dict[str, Any]:
        """Get orchestrator statistics"""
        if not self.session_history:
            return {
                "total_sessions": 0,
                "average_time_ms": 0,
                "success_rate": 0,
                "intent_distribution": {}
            }
        
        total_sessions = len(self.session_history)
        total_time = sum(s.total_time_ms for s in self.session_history)
        successful = sum(1 for s in self.session_history if s.execution_response.success)
        
        # Intent distribution
        intent_counts: Dict[str, int] = {}
        for session in self.session_history:
            intent_type = session.intent.intent_type
            intent_counts[intent_type] = intent_counts.get(intent_type, 0) + 1
        
        return {
            "total_sessions": total_sessions,
            "average_time_ms": total_time / total_sessions,
            "success_rate": successful / total_sessions,
            "intent_distribution": intent_counts,
            "pending_requests": len(self.execution_bridge.get_pending_requests())
        }


# Convenience function for quick testing
async def quick_command(user_input: str) -> str:
    """
    Quick command execution for testing.
    
    Args:
        user_input: User command
        
    Returns:
        Voice response text
    """
    orchestrator = CommandOrchestrator()
    session = await orchestrator.process_command(user_input)
    return session.voice_output.text

# Made with Bob
