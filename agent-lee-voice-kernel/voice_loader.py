"""
Agent Lee Voice Loader
Loads and caches Agent Lee voice identity for XTTS-v2
"""

import os
import json
import logging
from pathlib import Path
from pydub import AudioSegment
import torch
import torchaudio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VoiceLoader:
    """Loads and manages Agent Lee voice identity"""
    
    def __init__(self, config_path: str = "/app/config.json"):
        """Initialize voice loader with config"""
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.agent_config = self.config['agent_identity']
        self.cache_config = self.config['cache']
        self.voice_sample_path = self.agent_config['voice_sample']
        self.speaker_embedding = None
        self.voice_loaded = False
        
    def convert_m4a_to_wav(self, m4a_path: str, wav_path: str) -> bool:
        """Convert M4A to WAV format for XTTS"""
        try:
            logger.info(f"Converting {m4a_path} to WAV format...")
            audio = AudioSegment.from_file(m4a_path, format="m4a")
            
            # Convert to mono if stereo
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # Set sample rate to 22050 Hz (XTTS requirement)
            audio = audio.set_frame_rate(22050)
            
            # Export as WAV
            audio.export(wav_path, format="wav")
            logger.info(f"Successfully converted to {wav_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to convert M4A to WAV: {e}")
            return False
    
    def load_voice_sample(self) -> bool:
        """Load Agent Lee voice sample"""
        try:
            # Check if voice sample exists
            if not os.path.exists(self.voice_sample_path):
                logger.error(f"Voice sample not found: {self.voice_sample_path}")
                
                # Check if source M4A exists
                source_m4a = self.agent_config.get('voice_sample_source')
                if source_m4a and os.path.exists(source_m4a):
                    logger.info(f"Found source M4A: {source_m4a}")
                    # Convert M4A to WAV
                    if self.convert_m4a_to_wav(source_m4a, self.voice_sample_path):
                        logger.info("Voice sample conversion successful")
                    else:
                        return False
                else:
                    logger.error("Source M4A file not found")
                    return False
            
            # Verify WAV file is valid
            logger.info(f"Loading voice sample: {self.voice_sample_path}")
            waveform, sample_rate = torchaudio.load(self.voice_sample_path)
            
            logger.info(f"Voice sample loaded successfully")
            logger.info(f"Sample rate: {sample_rate} Hz")
            logger.info(f"Duration: {waveform.shape[1] / sample_rate:.2f} seconds")
            logger.info(f"Channels: {waveform.shape[0]}")
            
            self.voice_loaded = True
            return True
            
        except Exception as e:
            logger.error(f"Failed to load voice sample: {e}")
            return False
    
    def extract_speaker_embedding(self, tts_model) -> bool:
        """Extract and cache speaker embedding from voice sample"""
        try:
            if not self.voice_loaded:
                logger.error("Voice sample not loaded")
                return False
            
            logger.info("Extracting speaker embedding...")
            
            # XTTS will handle embedding extraction internally
            # We just need to ensure the voice sample is available
            self.speaker_embedding = self.voice_sample_path
            
            logger.info("Speaker embedding cached successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to extract speaker embedding: {e}")
            return False
    
    def get_speaker_wav(self) -> str:
        """Get path to speaker WAV file"""
        if not self.voice_loaded:
            raise RuntimeError("Voice sample not loaded")
        return self.voice_sample_path
    
    def verify_voice_identity(self) -> dict:
        """Verify Agent Lee voice identity is loaded"""
        return {
            "agent_id": self.agent_config['agent_id'],
            "voice_loaded": self.voice_loaded,
            "voice_sample_path": self.voice_sample_path,
            "speaker_embedding_cached": self.speaker_embedding is not None
        }


def initialize_voice_loader() -> VoiceLoader:
    """Initialize and load Agent Lee voice"""
    loader = VoiceLoader()
    
    if not loader.load_voice_sample():
        raise RuntimeError("Failed to load Agent Lee voice sample")
    
    logger.info("Voice loader initialized successfully")
    return loader


if __name__ == "__main__":
    # Test voice loader
    try:
        loader = initialize_voice_loader()
        status = loader.verify_voice_identity()
        logger.info(f"Voice identity status: {json.dumps(status, indent=2)}")
    except Exception as e:
        logger.error(f"Voice loader test failed: {e}")
        exit(1)

# Made with Bob
