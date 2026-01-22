@echo off
echo ========================================
echo Advanced ML Recommendation Service
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade requirements
echo.
echo Installing/upgrading dependencies...
pip install -q --upgrade pip
pip install -q flask flask-cors pandas numpy scikit-learn pymongo scipy

REM Set environment variables
set ML_SERVICE_PORT=5001
set MONGO_URI=mongodb://localhost:27017/foodily-auth

echo.
echo ========================================
echo Starting Advanced ML Service on port %ML_SERVICE_PORT%
echo ========================================
echo Features:
echo  - Content-Based Filtering (TF-IDF)
echo  - Collaborative Filtering
echo  - Matrix Factorization (SVD)
echo  - Hybrid Recommendations
echo  - User Behavior Tracking
echo  - Personalization
echo  - Performance Caching
echo ========================================
echo.

REM Start the service
python advanced_ml_recommendation_service.py

pause





