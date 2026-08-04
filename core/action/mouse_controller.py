"""
Mouse Controller
Provides mouse control capabilities for Agent Lee
"""

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
    """Controls mouse movement and clicks"""
    
    def __init__(self):
        """Initialize mouse controller"""
        self.user32 = ctypes.windll.user32
    
    def get_position(self) -> Tuple[int, int]:
        """Get current mouse position"""
        class POINT(ctypes.Structure):
            _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]
        
        point = POINT()
        self.user32.GetCursorPos(ctypes.byref(point))
        return (point.x, point.y)
    
    def move_to(self, x: int, y: int, duration: float = 0.0):
        """
        Move mouse to absolute position.
        
        Args:
            x: X coordinate
            y: Y coordinate
            duration: Time to take for movement (seconds)
        """
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
        """
        Click mouse button.
        
        Args:
            button: 'left' or 'right'
            clicks: Number of clicks
            interval: Time between clicks
        """
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
        """Double click mouse button"""
        self.click(button=button, clicks=2, interval=0.05)
    
    def drag(self, start_x: int, start_y: int, end_x: int, end_y: int, duration: float = 0.5):
        """
        Drag from start to end position.
        
        Args:
            start_x, start_y: Start position
            end_x, end_y: End position
            duration: Time to take for drag
        """
        self.move_to(start_x, start_y)
        time.sleep(0.1)
        self.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        time.sleep(0.05)
        self.move_to(end_x, end_y, duration=duration)
        time.sleep(0.05)
        self.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


# Made with Bob
