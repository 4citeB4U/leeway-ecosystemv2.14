import sys
print("A")
import CerebralDaemon
print("B")
CerebralDaemon.load_settings()
print("C")
import pythoncom
pythoncom.CoInitialize()
print("D")
import threading
threading.Thread(target=CerebralDaemon.monitor_telemetry, daemon=True).start()
print("E")
threading.Thread(target=CerebralDaemon._health_logger_loop, daemon=True).start()
print("F")
CerebralDaemon.app.run(host='127.0.0.1', port=8765)
print("G")
