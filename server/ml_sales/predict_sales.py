#!/usr/bin/env python3
"""
Sales Prediction - Prediction Script
=====================================
This script loads a trained Linear Regression model and predicts future sales.

SAFETY: This script ONLY READS the saved model - it never touches MongoDB.

What it does:
1. Loads the trained model (sales_model.pkl)
2. Takes a month number as input
3. Predicts sales for that month
4. Returns the prediction as JSON

Usage:
  python predict_sales.py <month_number>
  
Example:
  python predict_sales.py 13
  Output: {"month": 13, "predicted_sales": 45000.50, "success": true}
"""

import joblib
import sys
import os
import json
from datetime import datetime

def load_model(filename='sales_model.pkl'):
    """
    Load the trained model from disk
    """
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, filename)
        
        # Check if model file exists
        if not os.path.exists(model_path):
            return None, f"Model file not found: {model_path}"
        
        # Load the model
        model = joblib.load(model_path)
        
        return model, None
        
    except Exception as e:
        return None, f"Error loading model: {str(e)}"

def predict_sales(model, month_number):
    """
    Predict sales for a given month number
    
    Args:
        model: Trained Linear Regression model
        month_number: Sequential month number (e.g., 13 for Jan 2025 if base is 2024)
    
    Returns:
        Predicted sales amount
    """
    try:
        # Model expects input as 2D array [[month_number]]
        prediction = model.predict([[month_number]])[0]
        
        # Ensure prediction is not negative
        prediction = max(0, prediction)
        
        return prediction
        
    except Exception as e:
        return None

def get_month_name_from_number(month_number, base_year=2024):
    """
    Convert month number back to readable format
    
    Args:
        month_number: Sequential month number
        base_year: Base year for calculation (default 2024)
    
    Returns:
        String like "January 2025"
    """
    try:
        # Calculate year and month
        years_offset = (month_number - 1) // 12
        month_in_year = ((month_number - 1) % 12) + 1
        year = base_year + years_offset
        
        # Month names
        month_names = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        
        month_name = month_names[month_in_year - 1]
        
        return f"{month_name} {year}", year, month_in_year
        
    except:
        return "Unknown", None, None

def main():
    """
    Main function - handles prediction
    """
    # Check if month number is provided
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "Month number not provided",
            "usage": "python predict_sales.py <month_number>",
            "example": "python predict_sales.py 13"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    try:
        # Get month number from command line argument
        month_number = int(sys.argv[1])
        
        if month_number <= 0:
            result = {
                "success": False,
                "error": "Month number must be positive"
            }
            print(json.dumps(result))
            sys.exit(1)
        
    except ValueError:
        result = {
            "success": False,
            "error": "Invalid month number - must be an integer"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Load the trained model
    model, error = load_model()
    
    if error:
        result = {
            "success": False,
            "error": error,
            "message": "Please train the model first using train_sales_model.py"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Make prediction
    predicted_sales = predict_sales(model, month_number)
    
    if predicted_sales is None:
        result = {
            "success": False,
            "error": "Prediction failed"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Get month name
    month_name, year, month = get_month_name_from_number(month_number)
    
    # Return prediction as JSON
    result = {
        "success": True,
        "month_number": month_number,
        "month_name": month_name,
        "year": year,
        "month": month,
        "predicted_sales": round(predicted_sales, 2),
        "predicted_sales_formatted": f"₹{predicted_sales:,.2f}"
    }
    
    print(json.dumps(result))
    sys.exit(0)

if __name__ == "__main__":
    main()





