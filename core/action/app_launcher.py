"""
Application Launcher
Provides application launching capabilities for Agent Lee
"""

import subprocess
import time
from typing import Optional, Dict, Any
from pathlib import Path


class AppLauncher:
    """Launches and manages applications"""
    
    # Common application paths
    COMMON_APPS = {
        'notepad': 'notepad.exe',
        'calculator': 'calc.exe',
        'chrome': r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        'edge': r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        'vscode': r'C:\Program Files\Microsoft VS Code\Code.exe',
        'explorer': 'explorer.exe',
        'cmd': 'cmd.exe',
        'powershell': 'powershell.exe',
    }
    
    def __init__(self):
        """Initialize app launcher"""
        self.processes = {}
    
    def launch(self, app_name: str, args: Optional[list] = None, wait: bool = False) -> Dict[str, Any]:
        """
        Launch an application.
        
        Args:
            app_name: Application name or path
            args: Command line arguments
            wait: Wait for application to exit
            
        Returns:
            Launch result with process info
        """
        result = {
            'success': False,
            'app_name': app_name,
            'process': None,
            'pid': None,
            'error': None
        }
        
        try:
            # Get application path
            if app_name.lower() in self.COMMON_APPS:
                app_path = self.COMMON_APPS[app_name.lower()]
            else:
                app_path = app_name
            
            # Build command
            cmd = [app_path]
            if args:
                cmd.extend(args)
            
            # Launch process
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE if not wait else 0
            )
            
            result['success'] = True
            result['process'] = process
            result['pid'] = process.pid
            
            # Store process reference
            self.processes[process.pid] = {
                'process': process,
                'app_name': app_name,
                'started_at': time.time()
            }
            
            if wait:
                process.wait()
            else:
                time.sleep(0.5)  # Give app time to start
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def is_running(self, pid: int) -> bool:
        """Check if process is still running"""
        if pid in self.processes:
            process = self.processes[pid]['process']
            return process.poll() is None
        return False
    
    def terminate(self, pid: int) -> bool:
        """Terminate a process"""
        if pid in self.processes:
            try:
                process = self.processes[pid]['process']
                process.terminate()
                process.wait(timeout=5)
                del self.processes[pid]
                return True
            except Exception:
                return False
        return False
    
    def get_active_processes(self) -> Dict[int, Dict[str, Any]]:
        """Get all active launched processes"""
        active = {}
        for pid, info in list(self.processes.items()):
            if self.is_running(pid):
                active[pid] = info
            else:
                del self.processes[pid]
        return active


# Made with Bob
