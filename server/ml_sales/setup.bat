@echo off
echo ========================================
echo Sales Prediction ML - Setup
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

echo Installing Python dependencies...
echo.

pip install pandas numpy scikit-learn pymongo joblib

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running
echo 2. Make sure you have some delivered orders in database
echo 3. Run: python train_sales_model.py
echo.
pause





