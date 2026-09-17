"""LeeWay capability suite: one ASGI server, isolated applications selected by local port."""
import json
import socket
from pathlib import Path
import uvicorn
from lane import create_app

def load_lanes():
    lanes = json.loads(Path("/config/lanes.json").read_text(encoding="utf-8-sig"))
    ports = [int(lane["port"]) for lane in lanes]
    names = [lane["name"] for lane in lanes]
    if len(set(ports)) != len(ports) or len(set(names)) != len(names):
        raise ValueError("Duplicate lane identity or port")
    return lanes

class PortRouter:
    def __init__(self, lanes):
        self.apps = {int(lane["port"]): create_app(lane["environment"]) for lane in lanes}

    async def __call__(self, scope, receive, send):
        port = scope.get("server", (None, None))[1]
        app = self.apps.get(port)
        if app is None:
            await send({"type": "http.response.start", "status": 404, "headers": []})
            await send({"type": "http.response.body", "body": b"Unknown capability port"})
            return
        await app(scope, receive, send)

if __name__ == "__main__":
    lanes = load_lanes()
    sockets = []
    try:
        app = PortRouter(lanes)
        for lane in lanes:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("0.0.0.0", int(lane["port"])))
            sock.listen(2048)
            sockets.append(sock)
        uvicorn.Server(uvicorn.Config(app, lifespan="off", access_log=False, log_level="info")).run(sockets=sockets)
    finally:
        for sock in sockets:
            sock.close()

