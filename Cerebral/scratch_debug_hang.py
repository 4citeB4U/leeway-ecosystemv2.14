# scratch_debug_hang.py
import sys

def trace_calls(frame, event, arg):
    if event != 'line':
        return trace_calls
    co = frame.f_code
    func_name = co.co_name
    line_no = frame.f_lineno
    filename = co.co_filename
    # Trace lines from files in our workspace Cerebral directory
    if 'Cerebral' in filename and not 'scratch_debug' in filename:
        print(f"{filename}:{line_no} - {func_name}")
        sys.stdout.flush()
    return trace_calls

print("Starting trace...")
sys.stdout.flush()
sys.settrace(trace_calls)

try:
    import CerebralDaemon
    print("Import completed!")
    sys.stdout.flush()
except Exception as e:
    print("Error during import:", e)
    sys.stdout.flush()
finally:
    sys.settrace(None)
