import requests
import uuid
import json
import sys

BASE_URL = "http://127.0.0.1:8765"

def test_health():
    print("Testing /health ...", end=" ")
    r = requests.get(f"{BASE_URL}/health")
    if r.status_code == 200:
        print("PASS")
        return True
    else:
        print(f"FAIL ({r.status_code})")
        return False

def test_status():
    print("Testing /status ...", end=" ")
    r = requests.get(f"{BASE_URL}/status")
    if r.status_code == 200:
        print("PASS")
        print(json.dumps(r.json(), indent=2))
        return True
    else:
        print(f"FAIL ({r.status_code})")
        return False

def test_handshake():
    print("Testing /bridge/handshake ...", end=" ")
    payload = {
        "device_id": "SmokeTester-01",
        "correlation_id": str(uuid.uuid4())
    }
    r = requests.post(f"{BASE_URL}/bridge/handshake", json=payload)
    if r.status_code == 200:
        print("PASS")
        return True
    else:
        print(f"FAIL ({r.status_code})")
        return False

def test_ops_request():
    print("Testing /ops/request (summarize_file) ...", end=" ")
    payload = {
        "intent": "Get a summary of a test file",
        "action_type": "summarize_file",
        "parameters": {"path": "C:\\Cerebral\\README.md"},
        "correlation_id": str(uuid.uuid4()),
        "device_id": "SmokeTester-01"
    }
    r = requests.post(f"{BASE_URL}/ops/request", json=payload)
    if r.status_code == 200:
        print("PASS")
        print(json.dumps(r.json(), indent=2))
        return True
    else:
        print(f"FAIL ({r.status_code}) - {r.text}")
        return False

def test_policy_enforcement():
    print("Testing /ops/request (restricted action) ...", end=" ")
    payload = {
        "intent": "Try an unauthorized action",
        "action_type": "admin_command",
        "parameters": {"cmd": "format C:"},
        "correlation_id": str(uuid.uuid4()),
        "device_id": "SmokeTester-01"
    }
    r = requests.post(f"{BASE_URL}/ops/request", json=payload)
    if r.status_code == 403:
        print("PASS (Denied as expected)")
        return True
    else:
        print(f"FAIL (Got {r.status_code}, expected 403)")
        return False

if __name__ == "__main__":
    print("Starting Cerebral Bridge Smoke Tests...")
    results = [
        test_health(),
        test_status(),
        test_handshake(),
        test_ops_request(),
        test_policy_enforcement()
    ]
    
    if all(results):
        print("\nALL TESTS PASSED")
        sys.exit(0)
    else:
        print("\nSOME TESTS FAILED")
        sys.exit(1)
