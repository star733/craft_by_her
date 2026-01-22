#!/bin/bash

echo "========================================"
echo "Advanced ML Recommendation Service"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade requirements
echo ""
echo "Installing/upgrading dependencies..."
pip install -q --upgrade pip
pip install -q flask flask-cors pandas numpy scikit-learn pymongo scipy

# Set environment variables
export ML_SERVICE_PORT=5001
export MONGO_URI="mongodb://localhost:27017/foodily-auth"

echo ""
echo "========================================"
echo "Starting Advanced ML Service on port $ML_SERVICE_PORT"
echo "========================================"
echo "Features:"
echo "  - Content-Based Filtering (TF-IDF)"
echo "  - Collaborative Filtering"
echo "  - Matrix Factorization (SVD)"
echo "  - Hybrid Recommendations"
echo "  - User Behavior Tracking"
echo "  - Personalization"
echo "  - Performance Caching"
echo "========================================"
echo ""

# Start the service
python3 advanced_ml_recommendation_service.py





