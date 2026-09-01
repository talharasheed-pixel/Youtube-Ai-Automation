@echo off
title Push Project to GitHub
color 0b
echo ================================================================
echo         ONE-CLICK GITHUB UPLOADER (ALL FOLDERS & FILES)
echo ================================================================
echo.
set "PATH=C:\Program Files\Git\bin;C:\Program Files\Git\cmd;%PATH%"

cd /d "%~dp0"

echo Step 1: Initializing Git repository...
git init
git branch -M main

echo.
echo Step 2: Staging all source folders (client, server, desktop, docs)...
git add .

echo.
echo Step 3: Creating commit...
git commit -m "Deploy AI YouTube Automation OS to Cloud"

echo.
echo ================================================================
echo Please paste your GitHub Repository URL below
echo (Example: https://github.com/your-username/ai-youtube-automation-os.git)
echo ================================================================
set /p REPO_URL="Enter GitHub Repo URL: "

if "%REPO_URL%"=="" (
    echo No URL entered. Exiting.
    pause
    exit /b
)

git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo Pushing all files and folders to GitHub...
git push -u origin main --force

echo.
echo ================================================================
echo UPLOAD COMPLETED! All folders are now on GitHub!
echo Now you can deploy on Render.com with 1 click!
echo ================================================================
pause
