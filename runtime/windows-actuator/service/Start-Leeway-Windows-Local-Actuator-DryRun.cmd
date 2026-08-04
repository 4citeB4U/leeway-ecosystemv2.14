@echo off
set LEEWAY_ROOT=D:\Leeway-Ecosystem v2.1.4
set LEEWAY_WINDOWS_DEVICE_ID=windows-agent-lee
set LEEWAY_ACTUATOR_DEVICE_ID=windows-agent-lee-local-actuator-dry-run
set LEEWAY_DEVICE_OPERATOR_URL=http://127.0.0.1:5323
set LEEWAY_ACTUATOR_RECEIPT_DIR=D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\receipts
cd /d "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\service"
"D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\runtime\.venv\Scripts\python.exe" -m uvicorn windows_local_actuator_dry_run_service:app --host 127.0.0.1 --port 7331 --log-level info >> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\logs\windows-local-actuator-dry-run-167B-20260705-175705.out.log" 2>> "D:\Leeway-Ecosystem v2.1.4\runtime\windows-actuator\logs\windows-local-actuator-dry-run-167B-20260705-175705.err.log"
