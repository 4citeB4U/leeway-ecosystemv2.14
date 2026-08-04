from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pathlib import Path
import json
import os
from datetime import datetime

app = FastAPI(title="LeeWay Printer IPP Translator Locked Stub", version="0.0.1-locked")

BASE_DIR = Path(__file__).resolve().parents[1]
POLICY_PATH = BASE_DIR / "config" / "printer-ipp-translator-policy.json"

def load_policy():
    with open(POLICY_PATH, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def locked_payload(route: str, extra=None):
    policy = load_policy()
    payload = {
        "ok": True,
        "service": "leeway_printer_ipp_translator_locked",
        "route": route,
        "locked": True,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "executionAuthorized": False,
        "deviceControlAuthorized": False,
        "onboardingAuthorized": False,
        "printerActionAuthorized": False,
        "ippRequestAuthorized": False,
        "printJobAuthorized": False,
        "queueMutationAuthorized": False,
        "protocolTranslatorAuthorized": False,
        "physicalActionAuthorized": False,
        "policy": policy,
    }
    if extra:
        payload.update(extra)
    return payload

@app.get("/health")
def health():
    return locked_payload("/health", {"status": "locked_get_only_stub"})

@app.get("/policy")
def policy():
    return locked_payload("/policy")

@app.get("/capabilities")
def capabilities():
    return locked_payload("/capabilities", {
        "capabilities": [
            "GET /health",
            "GET /policy",
            "GET /capabilities",
            "GET /target-printer"
        ],
        "blocked": [
            "IPP requests",
            "print jobs",
            "queue mutation",
            "translator deployment authority",
            "physical action lane"
        ]
    })

@app.get("/target-printer")
def target_printer():
    policy = load_policy()
    return locked_payload("/target-printer", {
        "targetPrinter": {
            "name": policy.get("target_printer_name", ""),
            "driver": policy.get("target_driver", ""),
            "port": policy.get("target_port", "")
        }
    })

@app.api_route("/{path:path}", methods=["POST", "PUT", "PATCH", "DELETE"])
def blocked_methods(path: str):
    return JSONResponse(
        status_code=423,
        content={
            "ok": False,
            "locked": True,
            "error": "printer_ipp_translator_locked_no_mutation_allowed",
            "path": "/" + path,
            "executionAuthorized": False,
            "deviceControlAuthorized": False,
            "printerActionAuthorized": False,
            "ippRequestAuthorized": False,
            "printJobAuthorized": False,
            "queueMutationAuthorized": False,
            "physicalActionAuthorized": False
        }
    )