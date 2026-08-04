"""
Create Missing Modules for Agent Lee
Implements Phases 4-6: Observation, Action, Autonomous Loop
"""

import sys
from pathlib import Path

print("=" * 60)
print("CREATING MISSING AGENT LEE MODULES")
print("=" * 60)

# Phase 4: Observation Layer - Screen Vision Modules
print("\n[Phase 4] Creating Observation Layer modules...")

# ALOE-Screen.psm1
aloe_screen = """# ALOE-Screen.psm1
# Agent Lee Observation Engine - Screen Capture Module
# Purpose: Capture screen content for vision analysis

function Capture-ALOE-Screen {
    [CmdletBinding()]
    param(
        [string]$OutputPath = ".",
        [int]$MonitorIndex = 0,
        [switch]$AllMonitors
    )
    
    $result = @{
        success = $false
        screenshots = @()
        timestamp = (Get-Date -Format "o")
        error = $null
    }
    
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $screens = [System.Windows.Forms.Screen]::AllScreens
        
        if ($AllMonitors) {
            $monitorsToCapture = $screens
        } else {
            $monitorsToCapture = @($screens[$MonitorIndex])
        }
        
        foreach ($screen in $monitorsToCapture) {
            $bounds = $screen.Bounds
            $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            
            $graphics.CopyFromScreen(
                $bounds.Location,
                [System.Drawing.Point]::Empty,
                $bounds.Size
            )
            
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
            $filename = "screen-capture-$timestamp.png"
            $filepath = Join-Path $OutputPath $filename
            
            $bitmap.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
            
            $result.screenshots += @{
                path = $filepath
                width = $bounds.Width
                height = $bounds.Height
                x = $bounds.X
                y = $bounds.Y
            }
            
            $graphics.Dispose()
            $bitmap.Dispose()
        }
        
        $result.success = $true
        Write-Verbose "Captured $($result.screenshots.Count) screenshots"
        
    } catch {
        $result.error = $_.Exception.Message
        Write-Error "Screen capture failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Capture-ALOE-Screen
"""

aloe_screen_path = Path("agent-lee-coding-mode/observation-engine/modules/ALOE-Screen.psm1")
aloe_screen_path.write_text(aloe_screen, encoding='utf-8')
print(f"  [OK] Created {aloe_screen_path}")

# ALOE-OCR.psm1
aloe_ocr = """# ALOE-OCR.psm1
# Agent Lee Observation Engine - OCR Module
# Purpose: Extract text from images using Windows OCR

function Extract-ALOE-Text {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$ImagePath
    )
    
    $result = @{
        success = $false
        text = ""
        lines = @()
        timestamp = (Get-Date -Format "o")
        error = $null
    }
    
    try {
        # Load Windows.Media.Ocr
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
        $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
        
        # Get OCR engine for English
        $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage(
            [Windows.Globalization.Language]::new("en-US")
        )
        
        if (-not $ocrEngine) {
            throw "OCR engine not available"
        }
        
        # Load image
        $imagePath = Resolve-Path $ImagePath
        $storageFile = [System.Threading.Tasks.Task]::Run({
            [Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)
        }).GetAwaiter().GetResult()
        
        # Perform OCR
        $ocrResult = [System.Threading.Tasks.Task]::Run({
            $ocrEngine.RecognizeAsync($storageFile)
        }).GetAwaiter().GetResult()
        
        # Extract text
        $result.text = $ocrResult.Text
        $result.lines = $ocrResult.Lines | ForEach-Object { $_.Text }
        $result.success = $true
        
        Write-Verbose "Extracted $($result.lines.Count) lines of text"
        
    } catch {
        $result.error = $_.Exception.Message
        Write-Error "OCR failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Extract-ALOE-Text
"""

aloe_ocr_path = Path("agent-lee-coding-mode/observation-engine/modules/ALOE-OCR.psm1")
aloe_ocr_path.write_text(aloe_ocr, encoding='utf-8')
print(f"  [OK] Created {aloe_ocr_path}")

# ALOE-Window.psm1
aloe_window = """# ALOE-Window.psm1
# Agent Lee Observation Engine - Window Detection Module
# Purpose: Detect and track active windows

Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;
    
    public class WindowHelper {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
        
        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }
    }
"@

function Get-ALOE-ActiveWindow {
    [CmdletBinding()]
    param()
    
    $result = @{
        success = $false
        window = $null
        timestamp = (Get-Date -Format "o")
        error = $null
    }
    
    try {
        $hwnd = [WindowHelper]::GetForegroundWindow()
        
        if ($hwnd -eq [IntPtr]::Zero) {
            throw "No active window found"
        }
        
        # Get window title
        $title = New-Object System.Text.StringBuilder 256
        $null = [WindowHelper]::GetWindowText($hwnd, $title, $title.Capacity)
        
        # Get process ID
        $processId = 0
        $null = [WindowHelper]::GetWindowThreadProcessId($hwnd, [ref]$processId)
        
        # Get process info
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        # Get window bounds
        $rect = New-Object WindowHelper+RECT
        $null = [WindowHelper]::GetWindowRect($hwnd, [ref]$rect)
        
        $result.window = @{
            handle = $hwnd.ToInt64()
            title = $title.ToString()
            processId = $processId
            processName = $process.ProcessName
            bounds = @{
                left = $rect.Left
                top = $rect.Top
                right = $rect.Right
                bottom = $rect.Bottom
                width = $rect.Right - $rect.Left
                height = $rect.Bottom - $rect.Top
            }
        }
        
        $result.success = $true
        Write-Verbose "Active window: $($result.window.title)"
        
    } catch {
        $result.error = $_.Exception.Message
        Write-Error "Window detection failed: $($_.Exception.Message)"
    }
    
    return $result
}

Export-ModuleMember -Function Get-ALOE-ActiveWindow
"""

aloe_window_path = Path("agent-lee-coding-mode/observation-engine/modules/ALOE-Window.psm1")
aloe_window_path.write_text(aloe_window, encoding='utf-8')
print(f"  [OK] Created {aloe_window_path}")

print("\n[Phase 4] Observation Layer modules created successfully!")

# Phase 5: Action Layer - Desktop Control Modules
print("\n[Phase 5] Creating Action Layer modules...")

# Create core/action directory
action_dir = Path("core/action")
action_dir.mkdir(parents=True, exist_ok=True)

# __init__.py
action_init = """\"\"\"Action Layer - Desktop Control\"\"\"
from .mouse_controller import MouseController
from .keyboard_controller import KeyboardController
from .app_launcher import AppLauncher

__all__ = ['MouseController', 'KeyboardController', 'AppLauncher']
"""

(action_dir / "__init__.py").write_text(action_init, encoding='utf-8')
print(f"  [OK] Created {action_dir / '__init__.py'}")

# mouse_controller.py
mouse_controller = """\"\"\"
Mouse Controller
Provides mouse control capabilities for Agent Lee
\"\"\"

import ctypes
import time
from typing import Tuple

# Windows mouse event constants
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_ABSOLUTE = 0x8000


class MouseController:
    \"\"\"Controls mouse movement and clicks\"\"\"
    
    def __init__(self):
        \"\"\"Initialize mouse controller\"\"\"
        self.user32 = ctypes.windll.user32
    
    def get_position(self) -> Tuple[int, int]:
        \"\"\"Get current mouse position\"\"\"
        class POINT(ctypes.Structure):
            _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]
        
        point = POINT()
        self.user32.GetCursorPos(ctypes.byref(point))
        return (point.x, point.y)
    
    def move_to(self, x: int, y: int, duration: float = 0.0):
        \"\"\"
        Move mouse to absolute position.
        
        Args:
            x: X coordinate
            y: Y coordinate
            duration: Time to take for movement (seconds)
        \"\"\"
        if duration > 0:
            # Smooth movement
            start_x, start_y = self.get_position()
            steps = int(duration * 60)  # 60 steps per second
            
            for i in range(steps + 1):
                progress = i / steps
                current_x = int(start_x + (x - start_x) * progress)
                current_y = int(start_y + (y - start_y) * progress)
                self.user32.SetCursorPos(current_x, current_y)
                time.sleep(duration / steps)
        else:
            # Instant movement
            self.user32.SetCursorPos(x, y)
    
    def click(self, button: str = "left", clicks: int = 1, interval: float = 0.1):
        \"\"\"
        Click mouse button.
        
        Args:
            button: 'left' or 'right'
            clicks: Number of clicks
            interval: Time between clicks
        \"\"\"
        if button == "left":
            down_flag = MOUSEEVENTF_LEFTDOWN
            up_flag = MOUSEEVENTF_LEFTUP
        elif button == "right":
            down_flag = MOUSEEVENTF_RIGHTDOWN
            up_flag = MOUSEEVENTF_RIGHTUP
        else:
            raise ValueError(f"Invalid button: {button}")
        
        for _ in range(clicks):
            self.user32.mouse_event(down_flag, 0, 0, 0, 0)
            time.sleep(0.01)
            self.user32.mouse_event(up_flag, 0, 0, 0, 0)
            if clicks > 1:
                time.sleep(interval)
    
    def double_click(self, button: str = "left"):
        \"\"\"Double click mouse button\"\"\"
        self.click(button=button, clicks=2, interval=0.05)
    
    def drag(self, start_x: int, start_y: int, end_x: int, end_y: int, duration: float = 0.5):
        \"\"\"
        Drag from start to end position.
        
        Args:
            start_x, start_y: Start position
            end_x, end_y: End position
            duration: Time to take for drag
        \"\"\"
        self.move_to(start_x, start_y)
        time.sleep(0.1)
        self.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        time.sleep(0.05)
        self.move_to(end_x, end_y, duration=duration)
        time.sleep(0.05)
        self.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


# Made with Bob
"""

(action_dir / "mouse_controller.py").write_text(mouse_controller, encoding='utf-8')
print(f"  [OK] Created {action_dir / 'mouse_controller.py'}")

# keyboard_controller.py
keyboard_controller = """\"\"\"
Keyboard Controller
Provides keyboard control capabilities for Agent Lee
\"\"\"

import ctypes
import time
from typing import List

# Windows virtual key codes
VK_CODES = {
    'enter': 0x0D,
    'tab': 0x09,
    'shift': 0x10,
    'ctrl': 0x11,
    'alt': 0x12,
    'escape': 0x1B,
    'space': 0x20,
    'backspace': 0x08,
    'delete': 0x2E,
    'left': 0x25,
    'up': 0x26,
    'right': 0x27,
    'down': 0x28,
}


class KeyboardController:
    \"\"\"Controls keyboard input\"\"\"
    
    def __init__(self):
        \"\"\"Initialize keyboard controller\"\"\"
        self.user32 = ctypes.windll.user32
    
    def press_key(self, key: str):
        \"\"\"Press and release a key\"\"\"
        vk_code = self._get_vk_code(key)
        self.user32.keybd_event(vk_code, 0, 0, 0)  # Press
        time.sleep(0.05)
        self.user32.keybd_event(vk_code, 0, 2, 0)  # Release
    
    def hold_key(self, key: str):
        \"\"\"Hold a key down\"\"\"
        vk_code = self._get_vk_code(key)
        self.user32.keybd_event(vk_code, 0, 0, 0)
    
    def release_key(self, key: str):
        \"\"\"Release a held key\"\"\"
        vk_code = self._get_vk_code(key)
        self.user32.keybd_event(vk_code, 0, 2, 0)
    
    def type_text(self, text: str, interval: float = 0.05):
        \"\"\"
        Type text character by character.
        
        Args:
            text: Text to type
            interval: Time between keystrokes
        \"\"\"
        for char in text:
            if char.isupper():
                self.hold_key('shift')
                time.sleep(0.01)
            
            vk_code = ord(char.upper())
            self.user32.keybd_event(vk_code, 0, 0, 0)
            time.sleep(0.01)
            self.user32.keybd_event(vk_code, 0, 2, 0)
            
            if char.isupper():
                time.sleep(0.01)
                self.release_key('shift')
            
            time.sleep(interval)
    
    def hotkey(self, *keys: str):
        \"\"\"
        Press a hotkey combination.
        
        Args:
            *keys: Keys to press together (e.g., 'ctrl', 'c')
        \"\"\"
        # Press all keys
        for key in keys:
            self.hold_key(key)
            time.sleep(0.01)
        
        time.sleep(0.05)
        
        # Release all keys in reverse order
        for key in reversed(keys):
            self.release_key(key)
            time.sleep(0.01)
    
    def _get_vk_code(self, key: str) -> int:
        \"\"\"Get virtual key code for a key\"\"\"
        key_lower = key.lower()
        
        if key_lower in VK_CODES:
            return VK_CODES[key_lower]
        elif len(key) == 1:
            return ord(key.upper())
        else:
            raise ValueError(f"Unknown key: {key}")


# Made with Bob
"""

(action_dir / "keyboard_controller.py").write_text(keyboard_controller, encoding='utf-8')
print(f"  [OK] Created {action_dir / 'keyboard_controller.py'}")

# app_launcher.py
app_launcher = """\"\"\"
Application Launcher
Provides application launching capabilities for Agent Lee
\"\"\"

import subprocess
import time
from typing import Optional, Dict, Any
from pathlib import Path


class AppLauncher:
    \"\"\"Launches and manages applications\"\"\"
    
    # Common application paths
    COMMON_APPS = {
        'notepad': 'notepad.exe',
        'calculator': 'calc.exe',
        'chrome': r'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'edge': r'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'vscode': r'C:\\Program Files\\Microsoft VS Code\\Code.exe',
        'explorer': 'explorer.exe',
        'cmd': 'cmd.exe',
        'powershell': 'powershell.exe',
    }
    
    def __init__(self):
        \"\"\"Initialize app launcher\"\"\"
        self.processes = {}
    
    def launch(self, app_name: str, args: Optional[list] = None, wait: bool = False) -> Dict[str, Any]:
        \"\"\"
        Launch an application.
        
        Args:
            app_name: Application name or path
            args: Command line arguments
            wait: Wait for application to exit
            
        Returns:
            Launch result with process info
        \"\"\"
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
        \"\"\"Check if process is still running\"\"\"
        if pid in self.processes:
            process = self.processes[pid]['process']
            return process.poll() is None
        return False
    
    def terminate(self, pid: int) -> bool:
        \"\"\"Terminate a process\"\"\"
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
        \"\"\"Get all active launched processes\"\"\"
        active = {}
        for pid, info in list(self.processes.items()):
            if self.is_running(pid):
                active[pid] = info
            else:
                del self.processes[pid]
        return active


# Made with Bob
"""

(action_dir / "app_launcher.py").write_text(app_launcher, encoding='utf-8')
print(f"  [OK] Created {action_dir / 'app_launcher.py'}")

print("\n[Phase 5] Action Layer modules created successfully!")

print("\n" + "=" * 60)
print("MODULE CREATION COMPLETE")
print("=" * 60)
print("\nCreated modules:")
print("  [Observation] ALOE-Screen.psm1")
print("  [Observation] ALOE-OCR.psm1")
print("  [Observation] ALOE-Window.psm1")
print("  [Action] mouse_controller.py")
print("  [Action] keyboard_controller.py")
print("  [Action] app_launcher.py")
print("\nNext: Register these modules with Discovery")
print("Next: Create autonomous loop modules (Phase 6)")

sys.exit(0)