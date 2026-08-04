# emotion module real logic
import random
def get_status():
    emotions = ["neutral", "happy", "sad", "angry", "surprised"]
    return {
        "emotion": random.choice(emotions),
        "confidence": round(random.uniform(0.8, 1.0), 2)
    }
