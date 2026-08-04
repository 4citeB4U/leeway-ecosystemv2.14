from flask import Flask, jsonify
import psutil
import win32com.client
import subprocess
import pygetwindow as gw  # pip install PyGetWindow
from screeninfo import get_monitors  # pip install screeninfo

app = Flask(__name__)
narrator = win32com.client.Dispatch("SAPI.SpVoice")

# Detect your monitor layout
screens = get_monitors()
SCREEN_1 = screens[0]  # Agent Lee's home screen
SCREEN_2 = screens[1] if len(screens) > 1 else None

@app.route('/health')
def health():
    return jsonify({
        'cpu': psutil.cpu_percent(),
        'ram': psutil.virtual_memory().percent,
        'disk': psutil.disk_usage('C:\\').percent,
        'screens': len(screens),
        'screen1_res': f"{SCREEN_1.width}x{SCREEN_1.height}",
        'screen2_res': f"{SCREEN_2.width}x{SCREEN_2.height}" if SCREEN_2 else "N/A"
    })

@app.route('/command/<action>')
def smart_command(action):
    if 'screen2' in action or 'other' in action:
        target_screen = SCREEN_2
    else:
        target_screen = SCREEN_1

    if action == 'chrome_screen2':
        subprocess.Popen(['chrome.exe', '--new-window'])
        narrator.Speak("Chrome opening on screen 2", 0)
        move_window_to_screen('chrome', target_screen)

    elif action == 'vscode_screen2':
        subprocess.Popen(['code'])
        move_window_to_screen('Visual Studio Code', target_screen)

    elif action == 'move_active_screen2':
        active_win = gw.getActiveWindow()
        if active_win:
            move_window_to_screen(active_win.title, target_screen)
            narrator.Speak("Moved window to screen 2", 0)

    return {'status': f'opened on screen {target_screen.index if target_screen else 1}'}

def move_window_to_screen(window_title, target_screen):
    """Moves window to specific monitor"""
    windows = gw.getWindowsWithTitle(window_title)
    if windows:
        win = windows[0]
        # Calculate target screen position
        target_x = target_screen.x
        target_y = target_screen.y
        win.moveTo(target_x + 50, target_y + 50)
        win.resizeTo(1200, 800)
        win.activate()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)