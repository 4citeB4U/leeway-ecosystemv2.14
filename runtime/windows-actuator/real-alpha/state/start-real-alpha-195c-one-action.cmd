@echo off
cd /d "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\service"
python -m uvicorn leeway_real_windows_actuator_alpha_195c_20260705_193525:app --host 127.0.0.1 --port 7332 1>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-195c-one-action-20260705-193525.out.log" 2>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-195c-one-action-20260705-193525.err.log"
