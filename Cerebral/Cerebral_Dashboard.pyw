import tkinter as tk
from tkinter import messagebox
import requests
import os
import subprocess

def get_status():
    try:
        r = requests.get("http://127.0.0.1:8765/health", timeout=1)
        if r.status_code == 200:
            status_label.config(text="SYSTEM ONLINE", fg="#00ff00")
        else:
            status_label.config(text="SYSTEM ERROR", fg="orange")
    except:
        status_label.config(text="SYSTEM OFFLINE", fg="red")
    root.after(5000, get_status) # Refresh every 5 seconds

def restart_services():
    os.system("taskkill /f /im python.exe") # Caution: Kills all python
    subprocess.Popen(["C:\Cerebral\start_cerebral.bat"], shell=True)
    messagebox.showinfo("Cerebral", "Services Restarted Successfully.")

# UI Setup
root = tk.Tk()
root.title("Cerebral")
root.geometry("250x150")
root.configure(bg="#1e1e1e")
root.attributes("-topmost", True) # Keep it on top for your CRD session

tk.Label(root, text="CEREBRAL COMMANDER", bg="#1e1e1e", fg="white", font=("Segoe UI", 10, "bold")).pack(pady=10)

status_label = tk.Label(root, text="CHECKING...", bg="#1e1e1e", fg="yellow", font=("Segoe UI", 9))
status_label.pack()


# THE BUTTON WITH ICON
from PIL import Image, ImageTk
icon_path = r"C:\Cerebral\cerebral_icon.ico"
try:
    icon_img = Image.open(icon_path)
    icon_img = icon_img.resize((48, 48), Image.LANCZOS)
    icon_tk = ImageTk.PhotoImage(icon_img)
    btn = tk.Button(root, image=icon_tk, command=restart_services, bg="#1e1e1e", borderwidth=0, highlightthickness=0, activebackground="#222222")
    btn.image = icon_tk  # Keep reference
    btn.pack(pady=10)
    tk.Label(root, text="RESTART CEREBRAL", bg="#1e1e1e", fg="white", font=("Segoe UI", 9)).pack()
except Exception as e:
    btn = tk.Button(root, text="RESTART CEREBRAL", command=restart_services, bg="#333333", fg="white", font=("Segoe UI", 9))
    btn.pack(pady=20)

get_status()
root.mainloop()
