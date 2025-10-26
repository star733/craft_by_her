@echo off
REM Windows Batch Script to Start Python ML Recommendation Service

echo ============================================
echo   ML Recommendation Service Startup
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python is installed
echo.

REM Check if virtual environment exists
if not exist "ml_venv\" (
    echo [INFO] Creating Python virtual environment...
    python -m venv ml_venv
    
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    
    echo [OK] Virtual environment created
    echo.
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call ml_venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

echo [OK] Virtual environment activated
echo.

REM Install/update dependencies
echo [INFO] Installing Python dependencies...
pip install -r ml_requirements.txt

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.

REM Set environment variables
set ML_SERVICE_PORT=5001
set MONGO_URI=mongodb://localhost:27017/foodily-auth

REM Start the ML service
echo ============================================
echo   Starting ML Recommendation Service
echo   Port: %ML_SERVICE_PORT%
echo   MongoDB: %MONGO_URI%
echo ============================================
echo.

python ml_recommendation_service.py

REM Deactivate virtual environment on exit
deactivate


