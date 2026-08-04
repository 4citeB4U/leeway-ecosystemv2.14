"""
Agent Lee Voice Kernel - Boot Speech System
Generates and plays boot speech on container startup
"""

import os
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from voice_enhancement_engine import build_request_context, finalize_synthesis

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def generate_boot_speech():
    """Generate boot speech using XTTS-v2"""
    try:
        # Load configuration
        with open('/app/config.json', 'r') as f:
            config = json.load(f)
        
        boot_config = config['boot_speech']
        
        if not boot_config['enabled']:
            logger.info("Boot speech disabled in config")
            return True
        
        logger.info("=" * 60)
        logger.info("Agent Lee Voice Kernel - Boot Speech System")
        logger.info("=" * 60)
        
        # Check for Agent Lee voice sample
        speaker_wav = "/app/voice-samples/agent-lee.wav"
        source_m4a = "/app/voice-samples/agent-lee-source.m4a"
        
        # Convert M4A to WAV if needed
        if not os.path.exists(speaker_wav):
            if os.path.exists(source_m4a):
                logger.info(f"Converting {source_m4a} to WAV format...")
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_file(source_m4a, format="m4a")
                    
                    # Convert to mono if stereo
                    if audio.channels > 1:
                        audio = audio.set_channels(1)
                    
                    # Set sample rate to 22050 Hz (XTTS requirement)
                    audio = audio.set_frame_rate(22050)
                    
                    # Export as WAV
                    audio.export(speaker_wav, format="wav")
                    logger.info(f"Successfully converted to {speaker_wav}")
                except Exception as e:
                    logger.error(f"Failed to convert M4A to WAV: {e}")
                    return False
            else:
                logger.error(f"Agent Lee voice sample not found: {speaker_wav} or {source_m4a}")
                return False
        
        logger.info(f"Using Agent Lee voice sample: {speaker_wav}")
        
        # Import TTS
        from TTS.api import TTS
        
        # Load XTTS model
        logger.info("Loading XTTS-v2 model for boot speech...")
        tts_model = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            progress_bar=False,
            gpu=False
        )
        
        # Generate boot speech
        boot_text = boot_config['text']
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        output_path = f"/app/output/boot-speech-{timestamp}.wav"
        
        logger.info(f"Generating boot speech: '{boot_text}'")
        
        tts_model.tts_to_file(
            text=boot_text,
            file_path=output_path,
            speaker_wav=speaker_wav,
            language="en"
        )
        receipt_context = build_request_context(boot_text, "agent-lee", "en", 1.0, output_path)
        finalize_synthesis(output_path, receipt_context)
        
        logger.info(f"✓ Boot speech generated: {output_path}")
        
        # Attempt to play through Desktop Runtime if enabled
        if boot_config.get('auto_play', False) and config['desktop_runtime']['enabled']:
            try:
                import requests
                
                desktop_endpoint = config['desktop_runtime']['endpoint']
                logger.info(f"Sending boot speech to Desktop Runtime: {desktop_endpoint}")
                
                with open(output_path, 'rb') as audio_file:
                    response = requests.post(
                        f"{desktop_endpoint}/play-audio",
                        files={'audio': audio_file},
                        timeout=5
                    )
                
                if response.status_code == 200:
                    logger.info("✓ Boot speech played through Desktop Runtime")
                else:
                    logger.warning(f"Desktop Runtime playback failed: {response.status_code}")
                    
            except Exception as e:
                logger.warning(f"Could not play boot speech (Desktop Runtime may not be ready): {e}")
        
        logger.info("=" * 60)
        logger.info("Boot Speech System Complete")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Boot speech generation failed: {e}")
        logger.warning("Continuing with server startup despite boot speech failure")
        return False


if __name__ == "__main__":
    try:
        success = generate_boot_speech()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Boot speech system error: {e}")
        sys.exit(1)

# Made with Bob
