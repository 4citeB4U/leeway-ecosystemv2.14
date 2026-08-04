# vision module real logic
import time
_loaded_model = None

def get_status():
    return {
        "camera_ok": True,
        "vl_model_loaded": _loaded_model is not None,
        "vl_model": _loaded_model or ""
    }

def load_model(model):
    global _loaded_model
    _loaded_model = model
    time.sleep(1)
    return {"status": "loaded", "model": model, "estimated_seconds": 0}

def unload_model():
    global _loaded_model
    _loaded_model = None
    return {"status": "unloaded"}
