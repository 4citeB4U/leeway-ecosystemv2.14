@echo off
REM Launch main services
SET "CEREBRAL_ROOT=%~dp0"
start /b "" "%CEREBRAL_ROOT%.venv\Scripts\python.exe" "%CEREBRAL_ROOT%CerebralDaemon.py"
start /b "" "%CEREBRAL_ROOT%.venv\Scripts\python.exe" "%CEREBRAL_ROOT%cerebral_mcp_server.py"

REM Start cloudflared if it exists
if exist "C:\Tools\cloudflared.exe" (
    start /b "" "C:\Tools\cloudflared.exe" tunnel --no-autoupdate run --token eyJhIjoiOWM1YzgzZTJlOWI2YTg1Y2Q1NWY0MWIxMzM5Mjk2NTMiLCJ0IjoiZWJkMjEwM2MtNjk4Mi00N2MyLWI4MTQtMzU2MDI3ZjRlMjQ1IiwicyI6IllXSTVZbUppTjJRdFpqUXhPQzAwTW1Wa0xUaGhaVGN0WmpGallURmhaVGN3TUdVdyJ9
)

REM Wait for services to initialize
timeout /t 10 /nobreak >nul

REM Validate heartbeat file
if not exist "%CEREBRAL_ROOT%tools\reports\LATEST_AUDIT_LOG.txt" (
	echo [FAIL] Log file missing
	exit /b 1
)
if not exist "C:\AgentLee\CoreBus\heartbeat\hardware_nervous_system.json" (
	echo [FAIL] Heartbeat file missing
	exit /b 1
)

REM Enqueue validation task
echo {"task_id":"post_start_validation_001","command":"system_info"} > "C:\AgentLee\CoreBus\tasks\post_start_validation_001.json"
timeout /t 5 /nobreak >nul

REM Check if task was consumed
if exist "C:\AgentLee\CoreBus\tasks\post_start_validation_001.json" (
	echo [FAIL] Validation task not consumed
	exit /b 1
)

REM Check if outbox result exists
if not exist "C:\AgentLee\CoreBus\outbox\post_start_validation_001.json" (
	echo [FAIL] Outbox result missing
	exit /b 1
)

echo [PASS] Cerebral fully ready
exit /b 0