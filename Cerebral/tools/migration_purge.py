import os
import shutil

# Paths
AGENT_LEE_DIR = r"C:\Tools\Portable-VSCode-MCP-Kit\.Agent_Lee_OS"
ARCHIVE_DIR = r"C:\Cerebral\Archive_Old_Agent"
LEGACY_KEYWORDS = ["pyautogui", "robotjs", "playwright.chromium.launch", "pynput"]

if not os.path.exists(ARCHIVE_DIR):
    os.makedirs(ARCHIVE_DIR)

print(f"--- Scanning {AGENT_LEE_DIR} for legacy automation scripts ---")

for root, dirs, files in os.walk(AGENT_LEE_DIR):
    for file in files:
        if file.endswith((".py", ".js", ".ts")):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if any(key in content for key in LEGACY_KEYWORDS):
                        print(f"[!] Found Legacy Libs in: {file}")
                        # Move to archive
                        rel_path = os.path.relpath(file_path, AGENT_LEE_DIR)
                        dest_path = os.path.join(ARCHIVE_DIR, rel_path)
                        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                        
                        shutil.move(file_path, dest_path)
                        print(f"    Moved to: {dest_path}")
            except Exception as e:
                print(f"    Error reading {file}: {e}")

print("--- Migration Complete ---")
