#!/usr/bin/env python3
"""
Sales Prediction Model - Training Script
========================================
This script trains a Linear Regression model to predict future sales.

SAFETY: This script ONLY READS from MongoDB - it never modifies or deletes data.

What it does:
1. Connects to MongoDB (READ-ONLY)
2. Fetches historical order data
3. Aggregates sales by month
4. Trains a Linear Regression model
5. Saves the trained model to sales_model.pkl
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import joblib
from pymongo import MongoClient
from datetime import datetime
import os
import sys

# MongoDB Configuration (READ-ONLY)
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/foodily-auth')

def connect_to_mongodb():
    """Connect to MongoDB - READ ONLY"""
    try:
        client = MongoClient(MONGO_URI)
        db = client.get_database()
        print("✅ Connected to MongoDB (READ-ONLY mode)")
        return db
    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
        sys.exit(1)

def fetch_sales_data(db):
    """
    Fetch historical sales data from MongoDB
    SAFETY: Only performs READ operations (find, aggregate)
    """
    try:
        # Get orders collection
        orders_collection = db['orders']
        
        # Aggregate sales by month
        # This query ONLY READS data - no modifications
        pipeline = [
            {
                '$match': {
                    'orderStatus': 'delivered',  # Only completed orders
                    'createdAt': {'$exists': True}
                }
            },
            {
                '$group': {
                    '_id': {
                        'year': {'$year': '$createdAt'},
                        'month': {'$month': '$createdAt'}
                    },
                    'totalSales': {'$sum': '$totalAmount'},
                    'orderCount': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id.year': 1, '_id.month': 1}
            }
        ]
        
        # Execute READ-ONLY aggregation
        results = list(orders_collection.aggregate(pipeline))
        
        print(f"✅ Fetched {len(results)} months of sales data")
        return results
        
    except Exception as e:
        print(f"❌ Error fetching sales data: {e}")
        return []

def prepare_training_data(sales_data):
    """
    Convert MongoDB data to pandas DataFrame for ML training
    """
    if not sales_data:
        print("⚠️ No sales data available for training")
        return None, None
    
    # Convert to DataFrame
    df_data = []
    for record in sales_data:
        year = record['_id']['year']
        month = record['_id']['month']
        
        # Create a sequential month number for ML model
        # Example: Jan 2024 = 1, Feb 2024 = 2, etc.
        month_number = (year - 2024) * 12 + month
        
        df_data.append({
            'year': year,
            'month': month,
            'month_number': month_number,
            'total_sales': record['totalSales'],
            'order_count': record['orderCount']
        })
    
    df = pd.DataFrame(df_data)
    
    # Features: month_number (X)
    # Target: total_sales (y)
    X = df[['month_number']].values
    y = df['total_sales'].values
    
    print(f"✅ Prepared training data: {len(df)} samples")
    print(f"   Date range: {df['year'].min()}/{df['month'].min()} to {df['year'].max()}/{df['month'].max()}")
    print(f"   Sales range: ₹{df['total_sales'].min():.2f} to ₹{df['total_sales'].max():.2f}")
    
    return X, y, df

def train_model(X, y):
    """
    Train Linear Regression model
    """
    if X is None or y is None:
        print("❌ Cannot train model - no data available")
        return None
    
    # Split data into training and testing sets (80-20 split)
    if len(X) < 4:
        print("⚠️ Limited data - using all data for training (no test split)")
        X_train, y_train = X, y
        X_test, y_test = X, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
    
    # Create and train Linear Regression model
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Make predictions on test set
    y_pred = model.predict(X_test)
    
    # Calculate accuracy metrics
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("\n" + "="*50)
    print("📊 MODEL TRAINING COMPLETE")
    print("="*50)
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Mean Squared Error: ₹{mse:.2f}")
    print(f"R² Score (Accuracy): {r2:.4f} ({r2*100:.2f}%)")
    print("="*50 + "\n")
    
    return model

def save_model(model, filename='sales_model.pkl'):
    """
    Save trained model to disk
    """
    if model is None:
        print("❌ No model to save")
        return False
    
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, filename)
        
        # Save model using joblib
        joblib.dump(model, model_path)
        
        print(f"✅ Model saved successfully: {model_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error saving model: {e}")
        return False

def main():
    """
    Main function - orchestrates the training process
    """
    print("\n" + "="*50)
    print("🤖 SALES PREDICTION MODEL - TRAINING")
    print("="*50 + "\n")
    
    # Step 1: Connect to MongoDB (READ-ONLY)
    print("Step 1: Connecting to MongoDB...")
    db = connect_to_mongodb()
    
    # Step 2: Fetch sales data (READ-ONLY operation)
    print("\nStep 2: Fetching historical sales data...")
    sales_data = fetch_sales_data(db)
    
    if not sales_data:
        print("\n⚠️ WARNING: No sales data found in database!")
        print("   Please ensure you have delivered orders in your database.")
        print("   The model cannot be trained without historical data.")
        sys.exit(1)
    
    # Step 3: Prepare data for training
    print("\nStep 3: Preparing training data...")
    X, y, df = prepare_training_data(sales_data)
    
    if X is None:
        sys.exit(1)
    
    # Step 4: Train the model
    print("\nStep 4: Training Linear Regression model...")
    model = train_model(X, y)
    
    if model is None:
        sys.exit(1)
    
    # Step 5: Save the model
    print("Step 5: Saving trained model...")
    success = save_model(model)
    
    if success:
        print("\n" + "="*50)
        print("✅ SUCCESS! Model training complete!")
        print("="*50)
        print("\nYou can now use predict_sales.py to make predictions.")
        print("\nExample usage:")
        print("  python predict_sales.py 13")
        print("  (predicts sales for month 13)")
        print("\n" + "="*50 + "\n")
    else:
        print("\n❌ Failed to save model")
        sys.exit(1)

if __name__ == "__main__":
    main()





