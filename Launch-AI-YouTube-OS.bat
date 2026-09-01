@echo off
title AI YouTube Automation OS
color 0b
echo ================================================================
echo          AI YOUTUBE AUTOMATION OS - 10-AGENT PLATFORM
echo ================================================================
echo.
echo Starting Backend Orchestration Server and Web Application...
echo.

cd /d "%~dp0"

start cmd /k "title AI YouTube OS - Backend && cd server && node server.js"
timeout /t 3 /nobreak >nul

start cmd /k "title AI YouTube OS - Frontend && cd client && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo Opening Web Control Panel in default browser...
start http://localhost:5173

echo.
echo ================================================================
echo System is ONLINE at http://localhost:5173
echo API & 10 AI Agents running at http://localhost:3001
echo ================================================================
echo Keep this window open or minimize it.
pause
