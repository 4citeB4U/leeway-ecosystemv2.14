@echo off
cd /d "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\service"
python -m uvicorn leeway_real_windows_actuator_alpha:app --host 127.0.0.1 --port 7332 1>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-locked-after-202-20260705-200943.out.log" 2>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-locked-after-202-20260705-200943.err.log"
