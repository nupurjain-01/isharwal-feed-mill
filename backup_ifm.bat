@echo off
title Isharwal Feed Mill - Database Backup
color 0a

set PGPASSWORD=Nupurjain123
set BACKUP_DIR=C:\IFM_Backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)

set BACKUP_FILE=%BACKUP_DIR%\ifm_backup_%mydate%_%mytime%.sql

echo ===================================================
echo     ISHARWAL FEED MILL - DATABASE BACKUP
echo ===================================================
echo.
echo Exporting database 'ifm_gate_db' to %BACKUP_FILE% ...

if exist "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" (
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -d ifm_gate_db -f "%BACKUP_FILE%"
)

if exist "%~dp0server\data\ifm_gate_store.json" (
    copy /Y "%~dp0server\data\ifm_gate_store.json" "%BACKUP_DIR%\ifm_store_backup_%mydate%_%mytime%.json" >nul
)

echo.
echo [SUCCESS] Backup completed successfully!
echo Files saved in: %BACKUP_DIR%

timeout /t 5
