@echo off
REM ============================================
REM   Foodily App - Start All Services
REM ============================================

echo.
echo ============================================
echo   Starting Foodily E-Commerce Platform
echo ============================================
echo.

REM Check if all required software is installed
echo [1/3] Checking prerequisites...
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo   [OK] Node.js installed

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   [WARNING] Python not found - ML recommendations will use basic mode
    echo   To enable AI recommendations, install Python from https://www.python.org/
    set SKIP_ML=1
) else (
    echo   [OK] Python installed
    set SKIP_ML=0
)

REM Check MongoDB
echo   [INFO] Make sure MongoDB is running on localhost:27017
echo.

echo [2/3] Starting services...
echo.

REM Start ML Service (if Python available)
if %SKIP_ML% EQU 0 (
    echo   Starting ML Recommendation Service (Port 5001)...
    start "ML Service" cmd /k "cd server && start-ml-service.bat"
    timeout /t 3 /nobreak >nul
) else (
    echo   [SKIP] ML Service (Python not available - using basic recommendations)
)

REM Start Node.js Backend
echo   Starting Node.js Backend (Port 5000)...
start "Backend Server" cmd /k "cd server && npm start"
timeout /t 3 /nobreak >nul

REM Start React Frontend
echo   Starting React Frontend (Port 3000)...
start "Frontend Client" cmd /k "cd client && npm start"

echo.
echo [3/3] All services starting...
echo.
echo ============================================
echo   Services Started Successfully!
echo ============================================
echo.
echo   - Frontend:  http://localhost:3000
echo   - Backend:   http://localhost:5000
if %SKIP_ML% EQU 0 (
    echo   - ML Service: http://localhost:5001
    echo   - Health:     http://localhost:5001/health
)
echo.
echo   Check the opened terminal windows for logs
echo   Press Ctrl+C in each window to stop services
echo.
echo ============================================
echo.

pause



