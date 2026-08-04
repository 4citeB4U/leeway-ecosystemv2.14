@echo off
set LEEWAY_ROOT=D:\Leeway-Ecosystem v2.1.4
set LEEWAY_WINDOWS_DEVICE_ID=windows-agent-lee
set LEEWAY_REAL_ALPHA_DEVICE_ID=windows-agent-lee-real-actuator-alpha
set LEEWAY_DEVICE_OPERATOR_URL=http://127.0.0.1:5323
set LEEWAY_DRY_RUN_ACTUATOR_URL=http://127.0.0.1:7331
set LEEWAY_APPROVAL_ROOT=D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\approval-gate
set LEEWAY_REAL_ALPHA_RECEIPT_DIR=D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\receipts
cd /d "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\service"
"D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\runtime\.venv\Scripts\python.exe" -m uvicorn leeway_real_windows_actuator_alpha:app --host 127.0.0.1 --port 7332 --log-level info >> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-183-20260705-185615.out.log" 2>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\real-alpha\logs\real-alpha-183-20260705-185615.err.log"
