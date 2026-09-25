@echo off
echo ==========================================================
echo Launching LabelGuard AI (Backend + Frontend)
echo ==========================================================
start "LabelGuard Backend (FastAPI)" cmd /k "%~dp0start_backend.bat"
timeout /t 2 /nobreak >nul
start "LabelGuard Frontend (React)" cmd /k "%~dp0start_frontend.bat"
echo.
echo Both servers launched!
echo - Web Portal: http://localhost:5173
echo - API Docs:   http://localhost:8000/docs
echo ==========================================================
