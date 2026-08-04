import json
import datetime

LOG_FILE = "audit_log.json"

def log_event(event):
    entry = {
        "timestamp": str(datetime.datetime.now()),
        "event": event
    }

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
