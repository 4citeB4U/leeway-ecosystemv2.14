import queue
import threading
import subprocess

task_queue = queue.Queue()

def worker():
    while True:
        task = task_queue.get()
        try:
            if task.get("type") == "command":
                subprocess.Popen(task.get("command"), shell=True)
        except Exception:
            pass
        finally:
            task_queue.task_done()

threading.Thread(target=worker, daemon=True).start()

def add_task(task):
    task_queue.put(task)
