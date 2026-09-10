@echo off
setlocal
cd /d "%~dp0"
title UMBRA - The Last Gate
where node >nul 2>nul
if %errorlevel% equ 0 (
    node tools\serve.mjs --open
    goto finished
)
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 tools\serve.py --open
    goto finished
)
where python >nul 2>nul
if %errorlevel% equ 0 (
    python tools\serve.py --open
    goto finished
)
echo Install Node.js 18 or newer, or Python 3.8 or newer, then run this file again.
echo Both launchers are included. You do not need npm install.
:finished
pause
