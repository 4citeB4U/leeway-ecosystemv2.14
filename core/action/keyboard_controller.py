"""
Keyboard Controller
Provides keyboard control capabilities for Agent Lee
"""

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
    'f1': 0x70,
    'f2': 0x71,
    'f3': 0x72,
    'f4': 0x73,
    'f5': 0x74,
    'f6': 0x75,
    'f7': 0x76,
    'f8': 0x77,
    'f9': 0x78,
    'f10': 0x79,
    'f11': 0x7A,
    'f12': 0x7B,
}


class KeyboardController:
    """Controls keyboard input"""
    
    def __init__(self):
        """Initialize keyboard controller"""
        self.user32 = ctypes.windll.user32
    
    def press_key(self, key: str):
        """Press and release a key"""
        vk_code = self._get_vk_code(key)
        self.user32.keybd_event(vk_code, 0, 0, 0)  # Press
        time.sleep(0.05)
        self.user32.keybd_event(vk_code, 0, 2, 0)  # Release
    
    def hold_key(self, key: str):
        """Hold a key down"""
        vk_code = self._get_vk_code(key)
        self.user32.keybd_event(vk_code, 0, 0, 0)
    
    def release_key(self, key: str):
        """Release a held key"""
        vk_code = self._get_vk_code(key)
        self.user32.keybd_event(vk_code, 0, 2, 0)
    
    def type_text(self, text: str, interval: float = 0.05):
        """
        Type text character by character.
        
        Args:
            text: Text to type
            interval: Time between keystrokes
        """
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
        """
        Press a hotkey combination.
        
        Args:
            *keys: Keys to press together (e.g., 'ctrl', 'c')
        """
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
        """Get virtual key code for a key"""
        key_lower = key.lower()
        
        if key_lower in VK_CODES:
            return VK_CODES[key_lower]
        elif len(key) == 1:
            return ord(key.upper())
        else:
            raise ValueError(f"Unknown key: {key}")


# Made with Bob
