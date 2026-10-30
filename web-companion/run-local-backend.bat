@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 20+ is required. Install Node.js LTS first.& pause & exit /b 1)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  echo Installing dependencies. This may take a few minutes the first time...
  call npm install
  if errorlevel 1 (echo Dependency installation failed. Check internet/proxy settings.& pause & exit /b 1)
)
echo Starting CineMorph backend on port 3000. Add your Gemini key to web-companion\.env for Gemini-powered search.
call npm run dev
pause
