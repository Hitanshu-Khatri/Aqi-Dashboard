@echo off
cd /d "%~dp0"
echo ===============================================
echo  Starting Air-Sense Dashboard (frontend + backend)
echo ===============================================

echo.
echo [1/2] Launching backend (node backend/server.js) in a new window...
start "Air-Sense Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo [2/2] Launching frontend (vite dev) in this window...
echo.
call npm run dev

pause
