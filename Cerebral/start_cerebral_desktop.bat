@echo off
SET "CEREBRAL_ROOT=%~dp0"
cd /d "%CEREBRAL_ROOT%agent-lee-os2"
echo Starting Vite dev server...
start /b "" npm run dev
timeout /t 3 /nobreak >nul
echo Launching native Electron desktop wrapper...
npm run desktop
