"""
Agent Lee Windows Service
Provides persistent runtime for Agent Lee autonomous operations
"""

import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import sys
import os
import time
import subprocess
import json
from pathlib import Path

class AgentLeeService(win32serviceutil.ServiceFramework):
    _svc_name_ = "AgentLee"
    _svc_display_name_ = "Agent Lee Autonomous Runtime"
    _svc_description_ = "Provides persistent autonomous runtime for Agent Lee coding and operational capabilities"
    
    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True
        
        # Determine workspace root
        self.workspace_root = Path(__file__).parent.parent.parent
        self.log_path = self.workspace_root / "Archive" / "receipts" / "service-logs"
        self.log_path.mkdir(parents=True, exist_ok=True)
        
    def SvcStop(self):
        """Stop the service"""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        self.running = False
        self.log_message("Service stop requested")
        
    def SvcDoRun(self):
        """Main service loop"""
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.log_message("Service started")
        self.main()
        
    def log_message(self, message):
        """Write log message"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_file = self.log_path / f"agent-lee-service-{time.strftime('%Y%m%d')}.log"
        
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(f"[{timestamp}] {message}\n")
        except Exception as e:
            # Fallback to event log if file write fails
            servicemanager.LogErrorMsg(f"Log write failed: {e}")
    
    def write_receipt(self, event_type, details):
        """Write service event receipt"""
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%S")
        receipt_file = self.log_path / f"service-event-{time.strftime('%Y%m%d-%H%M%S')}.json"
        
        receipt = {
            "timestamp": timestamp,
            "service": self._svc_name_,
            "event_type": event_type,
            "details": details
        }
        
        try:
            with open(receipt_file, 'w', encoding='utf-8') as f:
                json.dump(receipt, f, indent=2)
        except Exception as e:
            self.log_message(f"Receipt write failed: {e}")
    
    def main(self):
        """Main service logic"""
        self.log_message("Entering main service loop")
        self.write_receipt("service_start", {"status": "operational"})
        
        # Service heartbeat interval (60 seconds)
        heartbeat_interval = 60
        last_heartbeat = time.time()
        
        while self.running:
            # Check for stop signal (non-blocking, 5 second timeout)
            rc = win32event.WaitForSingleObject(self.stop_event, 5000)
            
            if rc == win32event.WAIT_OBJECT_0:
                # Stop event signaled
                break
            
            # Heartbeat
            current_time = time.time()
            if current_time - last_heartbeat >= heartbeat_interval:
                self.log_message("Service heartbeat")
                self.write_receipt("heartbeat", {
                    "uptime_seconds": int(current_time - last_heartbeat),
                    "status": "running"
                })
                last_heartbeat = current_time
        
        self.log_message("Service loop exited")
        self.write_receipt("service_stop", {"status": "stopped"})

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(AgentLeeService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(AgentLeeService)

# Made with Bob
