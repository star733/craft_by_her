#!/bin/bash
# Shell script to run Selenium tests on Linux/Mac

echo "========================================"
echo "Foodily App - Selenium Test Suite"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "[1/4] Checking Python installation..."
python3 --version
echo ""

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "[2/4] Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created successfully"
else
    echo "[2/4] Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "[3/4] Activating virtual environment..."
source venv/bin/activate
echo ""

# Install dependencies
echo "[4/4] Installing dependencies..."
pip install -r requirements.txt
echo ""

echo "========================================"
echo "Running Tests"
echo "========================================"
echo ""

# Run pytest with HTML report
pytest -v --html=reports/test_report.html --self-contained-html

echo ""
echo "========================================"
echo "Test Execution Complete"
echo "========================================"
echo ""
echo "Test report generated at: reports/test_report.html"
echo "Screenshots saved in: screenshots/"
echo ""

# Deactivate virtual environment
deactivate


