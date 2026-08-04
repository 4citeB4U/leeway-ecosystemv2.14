@echo off
cd /d "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\service"
python -m uvicorn leeway_real_windows_actuator_alpha_209_20260705_203116:app --host 127.0.0.1 --port 7332 1>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-209-one-action-type-text-20260705-203116.out.log" 2>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-209-one-action-type-text-20260705-203116.err.log"
