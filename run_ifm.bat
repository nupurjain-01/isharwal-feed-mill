@echo off
title ISHARWAL FEED MILL - Gate Entry Management System
color 0b

echo =====================================================================
echo         ISHARWAL FEED MILL - GATE ENTRY DESKTOP APP
echo =====================================================================
echo.
echo [1/2] Initializing Backend Server and Database Connection...
cd /d "%~dp0server"
start /min "IFM Gate Entry Server" cmd /c "node server.js"

timeout /t 2 >nul

echo [2/2] Launching Native Windows Desktop Window...
cd /d "%~dp0"
call npx electron .

exit
