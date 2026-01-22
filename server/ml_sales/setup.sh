#!/bin/bash

echo "========================================"
echo "Sales Prediction ML - Setup"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

echo "Installing Python dependencies..."
echo ""

pip3 install pandas numpy scikit-learn pymongo joblib

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running"
echo "2. Make sure you have some delivered orders in database"
echo "3. Run: python3 train_sales_model.py"
echo ""





