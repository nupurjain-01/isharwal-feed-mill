@echo off
setlocal
title Isharwal Feed Mill - Desktop Shortcut Installer
color 0b

echo ================================================================
echo   CREATING DESKTOP SHORTCUT WITH OFFICIAL ISHARWAL LOGO ICON
echo ================================================================

set "TARGET_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%TARGET_DIR%create_shortcut.ps1"

echo ================================================================
timeout /t 3
