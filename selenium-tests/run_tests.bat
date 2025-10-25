@echo off
REM Batch file to run Selenium tests on Windows

echo ========================================
echo Foodily App - Selenium Test Suite
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo [1/4] Checking Python installation...
python --version
echo.

REM Check if virtual environment exists, if not create it
if not exist "venv" (
    echo [2/4] Creating virtual environment...
    python -m venv venv
    echo Virtual environment created successfully
) else (
    echo [2/4] Virtual environment already exists
)
echo.

REM Activate virtual environment
echo [3/4] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo [4/4] Installing dependencies...
pip install -r requirements.txt
echo.

echo ========================================
echo Running Tests
echo ========================================
echo.

REM Run pytest with HTML report
pytest -v --html=reports/test_report.html --self-contained-html

echo.
echo ========================================
echo Test Execution Complete
echo ========================================
echo.
echo Test report generated at: reports\test_report.html
echo Screenshots saved in: screenshots\
echo.

REM Deactivate virtual environment
deactivate

echo Press any key to exit...
pause >nul


