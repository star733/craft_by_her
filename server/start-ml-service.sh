#!/bin/bash
# Unix/Linux Shell Script to Start Python ML Recommendation Service

echo "============================================"
echo "  ML Recommendation Service Startup"
echo "============================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python3 is not installed or not in PATH"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

echo "[OK] Python is installed"
echo ""

# Check if virtual environment exists
if [ ! -d "ml_venv" ]; then
    echo "[INFO] Creating Python virtual environment..."
    python3 -m venv ml_venv
    
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment"
        exit 1
    fi
    
    echo "[OK] Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "[INFO] Activating virtual environment..."
source ml_venv/bin/activate

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment"
    exit 1
fi

echo "[OK] Virtual environment activated"
echo ""

# Install/update dependencies
echo "[INFO] Installing Python dependencies..."
pip install -r ml_requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi

echo "[OK] Dependencies installed"
echo ""

# Set environment variables
export ML_SERVICE_PORT=5001
export MONGO_URI="mongodb://localhost:27017/foodily-auth"

# Start the ML service
echo "============================================"
echo "  Starting ML Recommendation Service"
echo "  Port: $ML_SERVICE_PORT"
echo "  MongoDB: $MONGO_URI"
echo "============================================"
echo ""

python3 ml_recommendation_service.py

# Deactivate virtual environment on exit
deactivate



