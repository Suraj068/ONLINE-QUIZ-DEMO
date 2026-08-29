@echo off
title BCA BSc CS Online Quiz
echo ==========================================
echo   BCA / BSc CS ONLINE QUIZ
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
echo Installing/checking dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Please check your internet connection.
  pause
  exit /b 1
)
echo.
echo Starting quiz server...
echo Open http://localhost:3000 in your browser.
echo Do NOT open public\index.html directly.
echo.
start "" http://localhost:3000
node server.js
pause
