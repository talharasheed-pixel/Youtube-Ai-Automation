@echo off
title Build Desktop Application (.exe)
color 0a
echo ================================================================
echo       BUILDING AI YOUTUBE AUTOMATION OS - WINDOWS .EXE
echo ================================================================
echo.
echo Step 1: Building Frontend Web Assets...
cd /d "%~dp0client"
call npm run build

echo.
echo Step 2: Packaging Windows Desktop Executable...
cd /d "%~dp0desktop"
call npm run pack

echo.
echo ================================================================
echo BUILD COMPLETED SUCCESSFULLY!
echo Your Windows Desktop App (.exe) is located at:
echo %~dp0desktop\dist-electron\win-unpacked\AI YouTube Automation OS.exe
echo ================================================================
pause
