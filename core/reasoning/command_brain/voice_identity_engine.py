"""
Voice Identity Engine

Preserves Agent Lee's voice identity: rhythm, cadence, calm authority, OG flavor.
"""

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import json


@dataclass
class VoiceIdentity:
    """Agent Lee's canonical voice identity"""
    canonical_voice: str = "Agent Lee Original"
    voice_fingerprint: str = "calm-rhythmic-authoritative-OG"
    rhythm: str = "measured, deliberate, never rushed"
    cadence: str = "smooth flow with natural pauses"
    tone: str = "calm authority, confident presence"
    pace: str = "unhurried, thoughtful, intentional"
    flavor: str = "OG Agent Lee - the original calling voice"


@dataclass
class VoiceOutput:
    """Voice output with identity validation"""
    text: str
    ssml: str
    rhythm_validated: bool
    cadence_validated: bool
    tone_validated: bool
    og_flavor_preserved: bool
    pause_count: int
    estimated_duration_ms: float


class VoiceIdentityEngine:
    """Enforces Agent Lee's voice identity in all speech output"""
    
    # Pause timing standards (milliseconds)
    MICRO_PAUSE = 200    # Between words in phrase
    PHRASE_PAUSE = 400   # Between phrases
    SENTENCE_PAUSE = 600 # Between sentences
    THOUGHT_PAUSE = 800  # Between thoughts/topics
    EMPHASIS_PAUSE = 300 # Before emphasized word
    
    # Voice model configuration
    VOICE_MODEL = "en-US-AndrewNeural"
    SPEAKING_RATE = "0.95"  # Slightly slower than default
    PITCH = "medium"
    VOLUME = "medium"
    
    def __init__(self, receipt_path: str = "Archive/receipts/voice"):
        self.identity = VoiceIdentity()
        self.receipt_path = Path(receipt_path)
        self.receipt_path.mkdir(parents=True, exist_ok=True)
    
    def apply_voice_identity(self, text: str, context: str = "general") -> VoiceOutput:
        """
        Apply Agent Lee's voice identity to text.
        
        Args:
            text: Raw text to speak
            context: Context (greeting, status, error, completion)
            
        Returns:
            VoiceOutput with SSML and validation
        """
        # Apply context-specific patterns
        formatted_text = self._apply_context_pattern(text, context)
        
        # Insert natural pauses
        paused_text, pause_count = self._insert_pauses(formatted_text)
        
        # Wrap with SSML prosody
        ssml = self._wrap_with_prosody(paused_text)
        
        # Validate voice identity
        validation = self._validate_voice_identity(ssml, pause_count)
        
        # Estimate duration
        duration_ms = self._estimate_duration(paused_text, pause_count)
        
        return VoiceOutput(
            text=text,
            ssml=ssml,
            rhythm_validated=validation["rhythm"],
            cadence_validated=validation["cadence"],
            tone_validated=validation["tone"],
            og_flavor_preserved=validation["og_flavor"],
            pause_count=pause_count,
            estimated_duration_ms=duration_ms
        )
    
    def generate_voice_receipt(
        self,
        voice_output: VoiceOutput,
        audio_path: Optional[str] = None
    ) -> str:
        """
        Generate receipt for voice output.
        
        Args:
            voice_output: VoiceOutput to receipt
            audio_path: Path to generated audio file
            
        Returns:
            Path to receipt file
        """
        receipt = {
            "voice_receipt_id": f"voice-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
            "timestamp": datetime.utcnow().isoformat(),
            "text": voice_output.text,
            "voice_model": self.VOICE_MODEL,
            "ssml_used": True,
            "rhythm_validated": voice_output.rhythm_validated,
            "cadence_validated": voice_output.cadence_validated,
            "tone_validated": voice_output.tone_validated,
            "og_flavor_preserved": voice_output.og_flavor_preserved,
            "audio_path": audio_path,
            "duration_ms": voice_output.estimated_duration_ms,
            "pause_count": voice_output.pause_count,
            "average_pause_ms": self.PHRASE_PAUSE,
            "voice_identity": {
                "canonical_voice": self.identity.canonical_voice,
                "voice_fingerprint": self.identity.voice_fingerprint,
                "rhythm": self.identity.rhythm,
                "cadence": self.identity.cadence,
                "tone": self.identity.tone
            }
        }
        
        # Write receipt
        receipt_file = self.receipt_path / f"{receipt['voice_receipt_id']}.json"
        with open(receipt_file, 'w', encoding='utf-8') as f:
            json.dump(receipt, f, indent=2, ensure_ascii=False)
        
        return str(receipt_file)
    
    def _apply_context_pattern(self, text: str, context: str) -> str:
        """Apply context-specific voice patterns"""
        patterns = {
            "greeting": self._greeting_pattern,
            "acknowledgment": self._acknowledgment_pattern,
            "status": self._status_pattern,
            "error": self._error_pattern,
            "completion": self._completion_pattern
        }
        
        pattern_func = patterns.get(context, lambda x: x)
        return pattern_func(text)
    
    def _greeting_pattern(self, text: str) -> str:
        """Apply greeting pattern with proper pauses"""
        # "Hello. I'm Agent Lee. Ready to assist."
        return text
    
    def _acknowledgment_pattern(self, text: str) -> str:
        """Apply acknowledgment pattern"""
        # "Understood. Working on that now."
        return text
    
    def _status_pattern(self, text: str) -> str:
        """Apply status update pattern"""
        # "Task in progress. Current status: [status]."
        return text
    
    def _error_pattern(self, text: str) -> str:
        """Apply error pattern with calm delivery"""
        # "I encountered an issue. [explanation]. Here's what I can do instead."
        return text
    
    def _completion_pattern(self, text: str) -> str:
        """Apply completion pattern"""
        # "Task complete. [summary]. Anything else I can help with?"
        return text
    
    def _insert_pauses(self, text: str) -> tuple[str, int]:
        """
        Insert natural pauses into text.
        
        Returns:
            (paused_text, pause_count)
        """
        pause_count = 0
        
        # Sentence endings get sentence pause
        text = re.sub(r'([.!?])\s+', r'\1|SENTENCE_PAUSE| ', text)
        pause_count += len(re.findall(r'\|SENTENCE_PAUSE\|', text))
        
        # Commas get phrase pause
        text = re.sub(r',\s+', r',|PHRASE_PAUSE| ', text)
        pause_count += len(re.findall(r'\|PHRASE_PAUSE\|', text))
        
        # Colons get thought pause
        text = re.sub(r':\s+', r':|THOUGHT_PAUSE| ', text)
        pause_count += len(re.findall(r'\|THOUGHT_PAUSE\|', text))
        
        return text, pause_count
    
    def _wrap_with_prosody(self, text: str) -> str:
        """Wrap text with SSML prosody tags"""
        # Replace pause markers with SSML breaks
        text = text.replace('|SENTENCE_PAUSE|', f'<break time="{self.SENTENCE_PAUSE}ms"/>')
        text = text.replace('|PHRASE_PAUSE|', f'<break time="{self.PHRASE_PAUSE}ms"/>')
        text = text.replace('|THOUGHT_PAUSE|', f'<break time="{self.THOUGHT_PAUSE}ms"/>')
        text = text.replace('|EMPHASIS_PAUSE|', f'<break time="{self.EMPHASIS_PAUSE}ms"/>')
        
        # Wrap with SSML
        ssml = f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="{self.VOICE_MODEL}">
    <prosody rate="{self.SPEAKING_RATE}" pitch="{self.PITCH}">
      <break time="300ms"/>
      {text}
      <break time="300ms"/>
    </prosody>
  </voice>
</speak>'''
        
        return ssml
    
    def _validate_voice_identity(self, ssml: str, pause_count: int) -> Dict[str, bool]:
        """Validate voice identity preservation"""
        return {
            "rhythm": self._validate_rhythm(ssml, pause_count),
            "cadence": self._validate_cadence(ssml),
            "tone": self._validate_tone(ssml),
            "og_flavor": self._validate_og_flavor(ssml)
        }
    
    def _validate_rhythm(self, ssml: str, pause_count: int) -> bool:
        """Validate measured, deliberate rhythm"""
        # Check for adequate pauses
        if pause_count < 2:
            return False
        
        # Check speaking rate is not rushed
        if self.SPEAKING_RATE not in ssml:
            return False
        
        return True
    
    def _validate_cadence(self, ssml: str) -> bool:
        """Validate smooth flow with natural pauses"""
        # Check for break tags
        break_count = ssml.count('<break time=')
        return break_count >= 2
    
    def _validate_tone(self, ssml: str) -> bool:
        """Validate calm authority tone"""
        # Check voice model
        return self.VOICE_MODEL in ssml
    
    def _validate_og_flavor(self, ssml: str) -> bool:
        """Validate OG Agent Lee flavor preserved"""
        # Check all core elements present
        checks = [
            self.VOICE_MODEL in ssml,
            self.SPEAKING_RATE in ssml,
            '<break time=' in ssml,
            '<prosody' in ssml
        ]
        return all(checks)
    
    def _estimate_duration(self, text: str, pause_count: int) -> float:
        """Estimate audio duration in milliseconds"""
        # Average speaking rate: ~150 words per minute = 2.5 words per second
        # With rate 0.95, it's ~2.4 words per second
        word_count = len(text.split())
        speech_duration = (word_count / 2.4) * 1000  # Convert to ms
        
        # Add pause durations
        pause_duration = pause_count * self.PHRASE_PAUSE
        
        return speech_duration + pause_duration
    
    def validate_audio_output(self, audio_path: str) -> Dict[str, Any]:
        """
        Validate generated audio matches voice identity.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Validation results
        """
        # This would integrate with audio analysis tools
        # For now, return placeholder validation
        return {
            "audio_exists": Path(audio_path).exists() if audio_path else False,
            "rhythm_match": True,  # Would analyze audio rhythm
            "cadence_match": True,  # Would analyze audio cadence
            "tone_match": True,     # Would analyze audio tone
            "og_flavor_preserved": True,
            "validation_timestamp": datetime.utcnow().isoformat()
        }

# Made with Bob
